import { toByteArray } from 'base64-js'
import { Axis } from '../../../three_utils'
import { DataArray, NumberArray, PointData, Points, Polys, Property, VTKFile, typedArrayConstructorMap } from '../types'
import { Extent } from './index'

const getDataFromDataArray = (file: VTKFile, dataArray: DataArray) => {
	if (dataArray.attributes.format === 'appended') {
		if (dataArray.attributes.offset && file.AppendedData && file.AppendedData['#text']) {
			const numBytesHeader = file.attributes.header_type === 'UInt32' ? 4 : 8
			const headerArrayConstructor = typedArrayConstructorMap[file.attributes.header_type]
			const offset = parseInt(dataArray.attributes.offset)
			const text = file.AppendedData['#text'].slice(offset+1) // account for the underscore at the beginning
			const byteArray = toByteArray(text)
			const header = new headerArrayConstructor(byteArray.slice(0, numBytesHeader).buffer)
			const numBytesContent = header[0]
			if (numBytesContent > Number.MAX_SAFE_INTEGER) throw new Error('number of bytes for content is larger than the max safe integer')
			const content = byteArray.slice(numBytesHeader, numBytesHeader + Number(numBytesContent)) // first 4 or 8 bytes simply signify the number of content bytes
			const arrayConstructor = typedArrayConstructorMap[dataArray.attributes.type]
			return new arrayConstructor(content.buffer)
		} else throw new Error('cannot find appended data')
	} else if (dataArray.attributes.format === 'binary') {
		const contentString = dataArray['#text']
		const byteArray = toByteArray(contentString)
		const arrayConstructor = typedArrayConstructorMap[dataArray.attributes.type]
		return new arrayConstructor(byteArray.buffer)
	} else if (dataArray.attributes.format === 'ascii') {
		const contentString = dataArray['#text']
		const numsStr = contentString.split(' ')

		if (dataArray.attributes.type === 'UInt64' || dataArray.attributes.type === 'Int64') {
			const nums = numsStr.map(str => BigInt(str))
			const arrayConstructor = typedArrayConstructorMap[dataArray.attributes.type]
			return new arrayConstructor(nums)
		}
		const nums = numsStr.map(str => Number(str))
		const arrayConstructor = typedArrayConstructorMap[dataArray.attributes.type]
		return new arrayConstructor(nums)
	} else throw new Error('unrecognised dataarray format')
}

export const parsePoints = (points: Points, file: VTKFile) => {
	const dataArray = points.DataArray
	const positions = getDataFromDataArray(file, dataArray)
	if (positions instanceof BigInt64Array || positions instanceof BigUint64Array) throw new Error('data array type is BigInt64Array or BigUInt64Array which cannot be used for three.js')
	return positions
}

export const parsePointData = (pointData: PointData, file: VTKFile) => {
	const pointDataDataArrays = pointData.DataArray instanceof Array ? pointData.DataArray : [pointData.DataArray]
	const properties: Property[] = []
	for (const dataArray of pointDataDataArrays) {
		const propertyData = getDataFromDataArray(file, dataArray)
		if (propertyData instanceof BigInt64Array || propertyData instanceof BigUint64Array) {
			console.warn('data array type is BigInt64Array or BigUInt64Array which cannot be used for three.js')
			continue
		}
		properties.push({
			name: dataArray.attributes.Name,
			min: Number(dataArray.attributes.RangeMin),
			max: Number(dataArray.attributes.RangeMax),
			data: propertyData
		})
	}
	return properties
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
			return typedArray instanceof BigInt64Array ? Int32Array.from(typedArray, (bigint) => Number(bigint)) : Uint32Array.from(typedArray, (bigint) => Number(bigint))
		}
		return typedArray
	})
	return { connectivity, offsets }
}

/**
 * Calculate the vertex index given its index i, j and k in the structured grid
 */
const getFlatIndex = (i: number, j: number, k: number, numX: number, numY: number): number => k * numX * numY + j * numX + i

const getFlatIndicesAround = (fixedAxis: Axis, fixedValue: number, variableValue1: number, variableValue2: number, numX: number, numY: number) => {
	const a1 = variableValue1, a2 = variableValue1 + 1
	const b1 = variableValue2, b2 = variableValue2 + 1
	return fixedAxis === Axis.x ? {
		i1: getFlatIndex(fixedValue, a1, b1, numX, numY),
		i2: getFlatIndex(fixedValue, a2, b1, numX, numY),
		i3: getFlatIndex(fixedValue, a1, b2, numX, numY),
		i4: getFlatIndex(fixedValue, a2, b2, numX, numY),
	} : fixedAxis === Axis.y ? {
		i1: getFlatIndex(a1, fixedValue, b1, numX, numY),
		i2: getFlatIndex(a2, fixedValue, b1, numX, numY),
		i3: getFlatIndex(a1, fixedValue, b2, numX, numY),
		i4: getFlatIndex(a2, fixedValue, b2, numX, numY),
	} : {
		i1: getFlatIndex(a1, b1, fixedValue, numX, numY),
		i2: getFlatIndex(a2, b1, fixedValue, numX, numY),
		i3: getFlatIndex(a1, b2, fixedValue, numX, numY),
		i4: getFlatIndex(a2, b2, fixedValue, numX, numY),
	}
}

const getIndexBufferWithFixedAxis = (extent: Extent, fixedAxis: Axis, fixedValue: number): Uint32Array => {
	const { x1, x2, y1, y2, z1, z2 } = extent
	const numX = x2 - x1 + 1, numY = y2 - y1 + 1
	console.assert(
		fixedAxis === Axis.x ? x1 <= fixedValue && fixedValue <= x2 :
			fixedAxis === Axis.y ? y1 <= fixedValue && fixedValue <= y2 :
				z1 <= fixedValue && fixedValue <= z2)

	const a1 = fixedAxis === Axis.x ? y1 : x1
	const a2 = fixedAxis === Axis.x ? y2 : x2
	const b1 = fixedAxis === Axis.z ? y1 : z1
	const b2 = fixedAxis === Axis.z ? y2 : z2
	const c =
		fixedAxis === Axis.x ? fixedValue - x1 :
			fixedAxis === Axis.y ? fixedValue - y1 :
				fixedValue - z1
	const numTriangles = (a2 - a1) * (b2 - b1) * 2
	const indexBuffer = new Uint32Array(numTriangles * 3)

	let index = 0
	for (let b = 0; b < b2 - b1; b++) {
		for (let a = 0; a < a2 - a1; a++) {
			const { i1, i2, i3, i4 } = getFlatIndicesAround(fixedAxis, c, a, b, numX, numY)
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
export const getIndexBufferFromExtent = (extent: Extent, axis?: Axis, value?: number): Uint32Array => {
	const { x1, x2, y1, y2, z1, z2 } = extent
	if (x1 == x2) return getIndexBufferWithFixedAxis(extent, Axis.x, x1)
	if (y1 == y2) return getIndexBufferWithFixedAxis(extent, Axis.y, y1)
	if (z1 == z2) return getIndexBufferWithFixedAxis(extent, Axis.z, z1)

	if (axis === undefined || value === undefined) return getIndexBufferWithFixedAxis(extent, Axis.x, x1)
	return getIndexBufferWithFixedAxis(extent, axis, value)
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