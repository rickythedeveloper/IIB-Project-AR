import { BufferAttribute, BufferGeometry } from "three"
import { Axis } from "../../../utils/three"
import { getDataFromDataArray } from "."

export const registerPoints = (points: Points, file: VTKFile, geometry: BufferGeometry) => {
	const dataArray = points.DataArray
	const positions = getDataFromDataArray(file, dataArray)
	if (positions instanceof BigInt64Array || positions instanceof BigUint64Array) throw new Error('data array type is BigInt64Array or BigUInt64Array which cannot be used for three.js')
	geometry.setAttribute('position', new BufferAttribute(positions, 3))
	return {positions}
}

export const registerPointData = (pointData: PointData, file: VTKFile, geometry: BufferGeometry) => {
	const pointDataDataArrays = pointData.DataArray instanceof Array ? pointData.DataArray : [pointData.DataArray]
	const properties: Property[] = []
	for (const dataArray of pointDataDataArrays) {
		const propertyData = getDataFromDataArray(file, dataArray)
		if (propertyData instanceof BigInt64Array || propertyData instanceof BigUint64Array) {
			console.warn('data array type is BigInt64Array or BigUInt64Array which cannot be used for three.js')
			continue
		}
		geometry.setAttribute(dataArray.attributes.Name, new BufferAttribute(propertyData, 1))
		properties.push({
			name: dataArray.attributes.Name, 
			min: Number(dataArray.attributes.RangeMin), 
			max: Number(dataArray.attributes.RangeMax)
		})
	}
	return {properties}
}

export const parsePolyData = (polys: Polys, file: VTKFile) => {
	const polysDataArrays = polys.DataArray
	const [connectivity, offsets] = polysDataArrays.map(d => {
		const typedArray = getDataFromDataArray(file, d)
		if (typedArray instanceof BigInt64Array || typedArray instanceof BigUint64Array) {
			let requiresBigInt = false
			typedArray.forEach(val => {
				if (val > Number.MAX_SAFE_INTEGER) requiresBigInt = true
			})
			if (requiresBigInt) throw new Error(`${d.attributes.Name} array requires bigint`)
			return typedArray instanceof BigInt64Array ? Int32Array.from(typedArray, (bigint, num) => Number(bigint)) : Uint32Array.from(typedArray, (bigint, num) => Number(bigint))
		}
		return typedArray
	})
	return { connectivity, offsets }
}

/**
 * Calculate the vertex index given its index i, j and k in the structured grid
 */
const getFlatIndex = (i: number, j: number, k: number, numX: number, numY: number): number => k * numX * numY + j * numX + i

/**
 * Return the index buffer given the two axes of the manifold
 */
const getIndexBufferFrom2D = (axis1: Axis, axis2: Axis, axis1Range: number, axis2Range: number, numX: number, numY: number): Uint32Array => {
	const numTriangles = axis1Range * axis2Range * 2
	const indexBuffer = new Uint32Array(numTriangles * 3)
	
	const val1 = (axis: Axis, i: number, j: number): number => axis1 === axis ? i : (axis2 === axis ? j : 0)
	const val2 = (axis: Axis, i: number, j: number): number => axis1 === axis ? i + 1 : (axis2 === axis ? j : 0)
	const val3 = (axis: Axis, i: number, j: number): number => axis1 === axis ? i : (axis2 === axis ? j + 1 : 0)
	const val4 = (axis: Axis, i: number, j: number): number => axis1 === axis ? i + 1 : (axis2 === axis ? j + 1 : 0)
	const index1 = (i: number, j: number) => getFlatIndex(val1(Axis.x, i, j), val1(Axis.y, i, j), val1(Axis.z, i, j), numX, numY)
	const index2 = (i: number, j: number) => getFlatIndex(val2(Axis.x, i, j), val2(Axis.y, i, j), val2(Axis.z, i, j), numX, numY)
	const index3 = (i: number, j: number) => getFlatIndex(val3(Axis.x, i, j), val3(Axis.y, i, j), val3(Axis.z, i, j), numX, numY)
	const index4 = (i: number, j: number) => getFlatIndex(val4(Axis.x, i, j), val4(Axis.y, i, j), val4(Axis.z, i, j), numX, numY)
	
	let index = 0
	for (let j = 0; j < axis2Range; j++) {
		for (let i = 0; i < axis1Range; i++) {
			const i1 = index1(i, j), i2 = index2(i, j), i3 = index3(i, j), i4 = index4(i, j)
			indexBuffer[index] = i1
			indexBuffer[index+1] = i2
			indexBuffer[index+2] = i3
			indexBuffer[index+3] = i2
			indexBuffer[index+4] = i3
			indexBuffer[index+5] = i4
			index += 6
		}
	}

	return indexBuffer
}

/**
 * Return the index buffer given the extent. The extent needs to have a zero range in one dimension
 */
export const getIndexBufferFromExtent = (wholeExtent: string): Uint32Array => {
	const [x1, x2, y1, y2, z1, z2] = wholeExtent.split(' ').map(e => parseInt(e))
	const numX = x2 - x1 + 1, numY = y2 - y1 + 1
	if (x1 == x2) return getIndexBufferFrom2D(Axis.y, Axis.z, y2 - y1, z2 - z1, numX, numY)
	if (y1 == y2) return getIndexBufferFrom2D(Axis.x, Axis.z, x2 - x1, z2 - z1, numX, numY)
	if (z1 == z2) return getIndexBufferFrom2D(Axis.x, Axis.y, x2 - x1, y2 - y1, numX, numY)
	throw new Error('vts file extent is multiple in all 3 dimentions')
}

export const getIndexBufferFromConnectivity = (connectivity: NumberArray, offsets: NumberArray): Uint32Array => {
	const indices: number[] = []
	let lastOffset = 0
	for (const offset of offsets) {
		const jump = offset - lastOffset
		if (jump === 3) {
			indices.push(...connectivity.slice(lastOffset, offset))
		} 
		// TODO implement for jump larger than 3
		lastOffset = offset
	}
	return new Uint32Array(indices)
}