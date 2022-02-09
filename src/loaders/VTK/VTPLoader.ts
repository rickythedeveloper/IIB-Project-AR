import { BufferAttribute, BufferGeometry, FileLoader, Loader, LoaderUtils, LoadingManager } from "three";
import { fileToJson, getDataFromDataArray } from "./utils";

interface VTP {
	geometry: BufferGeometry
	properties: Property[]
}

const parse = (stringFile: string): VTP => {
	const file = fileToJson(stringFile) as VTKFile
	if (file.attributes.type !== 'PolyData' || file.PolyData === undefined) throw new Error('file is not PolyData')

	const polyData = file.PolyData
	const piece = polyData.Piece
	if (piece instanceof Array) throw new Error('hanya')
	const compressed = file.attributes.compressor !== undefined // TODO implement for compressed file
	const geometry = new BufferGeometry()

	const properties: Property[] = []

	// PointData
	const pointDataDataArrays = piece.PointData.DataArray instanceof Array ? piece.PointData.DataArray : [piece.PointData.DataArray]
	for (const dataArray of pointDataDataArrays) {
		const typedArray = getDataFromDataArray(file, dataArray)
		console.log(dataArray.attributes.Name, typedArray);
		if (typedArray instanceof BigInt64Array || typedArray instanceof BigUint64Array) {
			console.warn('data array type is BigInt64Array or BigUInt64Array which cannot be used for three.js')
			continue
		}
		geometry.setAttribute(dataArray.attributes.Name, new BufferAttribute(typedArray, 1))

		properties.push({
			name: dataArray.attributes.Name, 
			min: Number(dataArray.attributes.RangeMin), 
			max: Number(dataArray.attributes.RangeMax)
		})
	}

	// CellData

	// Points
	const pointsDataArrays = piece.Points.DataArray instanceof Array ? piece.Points.DataArray : [piece.Points.DataArray]
	for (const dataArray of pointsDataArrays) {
		const typedArray = getDataFromDataArray(file, dataArray)
		console.log(dataArray.attributes.Name, typedArray);
		if (typedArray instanceof BigInt64Array || typedArray instanceof BigUint64Array) throw new Error('data array type is BigInt64Array or BigUInt64Array which cannot be used for three.js')
		geometry.setAttribute('position', new BufferAttribute(typedArray, 3))

		let xmin: number = typedArray[0], xmax: number = typedArray[0], ymin: number = typedArray[1], ymax: number = typedArray[1], zmin: number = typedArray[2], zmax: number = typedArray[2]
		for (let i = 0; i < typedArray.length; i += 3) {
			const x = typedArray[i], y = typedArray[i+1], z = typedArray[i+2]
			if (x < xmin) xmin = x
			if (x > xmax) xmax = x
			if (y < ymin) ymin = y
			if (y > ymax) ymax = y
			if (z < zmin) zmin = z
			if (z > zmax) zmax = z
		}
		console.log(xmin, xmax, ymin, ymax, zmin, zmax);
	}

	// Verts

	// Lines

	// Strips

	// Polys
	const polysDataArrays = piece.Polys.DataArray
	const [connectivity, offsets] = polysDataArrays.map(d => {
		const typedArray = getDataFromDataArray(file, d)
		if (typedArray instanceof BigInt64Array || typedArray instanceof BigUint64Array) {
			let requiresBigInt = false
			typedArray.forEach(val => {
				if (val > Number.MAX_SAFE_INTEGER) requiresBigInt = true
			})
			if (requiresBigInt) throw new Error(`${d.attributes.Name} array requires bigint`)
			console.log(typedArray);
			return typedArray instanceof BigInt64Array ? Int32Array.from(typedArray, (bigint, num) => Number(bigint)) : Uint32Array.from(typedArray, (bigint, num) => Number(bigint))
		}
		return typedArray
	})
	
	const indices: number[] = []
	let lastOffset = 0
	for (const offset of offsets) {
		const jump = offset - lastOffset
		if (jump === 3) {
			indices.push(...connectivity.slice(lastOffset, offset))
		}
		lastOffset = offset
	}
	console.log(connectivity, indices);

	geometry.index = new BufferAttribute(new Uint32Array(indices), 1)
	
	return {geometry, properties}
}

class VTPLoader extends Loader {
	constructor( manager?: LoadingManager ) { super(manager) }

	load(url: string, onLoad: (vtp: VTP) => void, onProgress?: (request: ProgressEvent<EventTarget>) => void, onError?: (message: string) => void) {
		const scope = this;
		const loader = new FileLoader(scope.manager);
		loader.setPath(scope.path);
		loader.setResponseType( 'arraybuffer' );
		loader.setRequestHeader( scope.requestHeader );
		loader.setWithCredentials( scope.withCredentials );
		loader.load(url, 
			(buffer) => {
				try {
					if (buffer instanceof ArrayBuffer) onLoad(scope.parse(buffer));
				} catch (e) {
					if (e instanceof Error && onError) onError(e.message)
					else console.error(e)
					scope.manager.itemError(url);
				}
			}, 
			onProgress, 
			(e) => {if (onError) onError(e.message) } 
		);
	}

	parse(data: ArrayBuffer): VTP {
		const text = LoaderUtils.decodeText(data)
		return parse(text)
	}
}

export default VTPLoader
