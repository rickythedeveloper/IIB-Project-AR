// https://vtk.org/Wiki/VTK_XML_Formats
// https://kitware.github.io/vtk-examples/site/VTKFileFormats/#vtk-file-formats

import { BufferAttribute, BufferGeometry, FileLoader, Loader, LoaderUtils, LoadingManager } from 'three';
import { Axis } from '../../utils/three';
import { getDataFromDataArray, getTypeArrayConstructor, xmlToJson } from './utils';

interface VTS {
	geometry: BufferGeometry
	properties: Property[]
}

const getFlatIndex = (i: number, j: number, k: number, numX: number, numY: number): number => k * numX * numY + j * numX + i

const getIndexArray = (axis1: Axis, axis2: Axis, axis1Range: number, axis2Range: number, numX: number, numY: number) => {
	const numTriangles = axis1Range * axis2Range * 2
	const indexArray = new Uint32Array(numTriangles * 3)
	
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
			indexArray[index] = i1
			indexArray[index+1] = i2
			indexArray[index+2] = i3
			indexArray[index+3] = i2
			indexArray[index+4] = i3
			indexArray[index+5] = i4
			index += 6
		}
	}

	return indexArray
}

const parseXMLVTS = (stringFile: string): VTS => {
	let dom: any
	if ( window.DOMParser ) {
		try { dom = ( new DOMParser() ).parseFromString(stringFile, 'text/xml'); } 
		catch ( e ) { dom = null; }
	} else if ( window.ActiveXObject ) {
		try {
			dom = new ActiveXObject( 'Microsoft.XMLDOM' ); // eslint-disable-line no-undef
			dom.async = false;
			if ( ! dom.loadXML( /* xml */ ) ) throw new Error( dom.parseError.reason + dom.parseError.srcText );
		} catch ( e ) {
			dom = null;
		}
	} else throw new Error( 'Cannot parse xml string!' );

	// Get the doc
	var doc = dom.documentElement;
	// Convert to json
	const file = xmlToJson(doc) as VTKFile;

	if (file.StructuredGrid === undefined) throw new Error('the file does not contain StructuredGrid')

	const grid = file.StructuredGrid!
	const piece = grid.Piece
	if (piece instanceof Array) throw new Error('hanya')
	const compressed = file.attributes.compressor !== undefined // TODO implement for compressed file
	const geometry = new BufferGeometry()


	const properties: Property[] = []

	// PointData
	const pointDataSection = piece.PointData
	const pointDataDataArrays = pointDataSection.DataArray instanceof Array ? pointDataSection.DataArray : [pointDataSection.DataArray]
	for (const dataArray of pointDataDataArrays) {
		const typedArray = getDataFromDataArray(file, dataArray)
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
		if (typedArray instanceof BigInt64Array || typedArray instanceof BigUint64Array) throw new Error('data array type is BigInt64Array or BigUInt64Array which cannot be used for three.js')
		geometry.setAttribute('position', new BufferAttribute(typedArray, 3))

		const [x1, x2, y1, y2, z1, z2] = grid.attributes.WholeExtent.split(' ').map(e => parseInt(e))
		const numX = x2 - x1 + 1, numY = y2 - y1 + 1
		let indexArray: Uint32Array
		if (x1 == x2) indexArray = getIndexArray(Axis.y, Axis.z, y2 - y1, z2 - z1, numX, numY)
		else if (y1 == y2) indexArray = getIndexArray(Axis.x, Axis.z, x2 - x1, z2 - z1, numX, numY)
		else if (z1 == z2) indexArray = getIndexArray(Axis.x, Axis.y, x2 - x1, y2 - y1, numX, numY)
		else throw new Error('vts file extent is multiple in all 3 dimentions')
		geometry.index = new BufferAttribute(indexArray, 1)
	}

	return { geometry, properties }
}

class VTSLoader extends Loader {
	constructor( manager?: LoadingManager ) { super(manager) }

	load(url: string, onLoad: (vts: VTS) => void, onProgress?: (request: ProgressEvent<EventTarget>) => void, onError?: (message: string) => void) {
		const scope = this;
		const loader = new FileLoader(scope.manager);
		loader.setPath(scope.path);
		loader.setResponseType( 'arraybuffer' );
		loader.setRequestHeader( scope.requestHeader );
		loader.setWithCredentials( scope.withCredentials );
		loader.load( url, 
			( buffer ) => {
				try {
					if (buffer instanceof ArrayBuffer) onLoad(scope.parse(buffer));
				} catch (e) {
					if (e instanceof Error && onError) onError(e.message)
					else console.error(e)
					scope.manager.itemError( url );
				}
			}, 
			onProgress, 
			(e) => {if (onError) onError(e.message) } 
		);
	}

	parse(data: ArrayBuffer): VTS {
		const text = LoaderUtils.decodeText(data)
		return parseXMLVTS(text)
	}
}

export default VTSLoader
