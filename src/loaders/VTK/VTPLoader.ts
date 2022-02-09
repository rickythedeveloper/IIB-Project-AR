import { BufferAttribute, BufferGeometry, FileLoader, Loader, LoaderUtils, LoadingManager } from "three";
import { fileToJson } from "./utils";
import { getIndexBufferFromConnectivity, parsePolyData, registerPointData, registerPoints } from "./utils/parse";

interface VTP {
	geometry: BufferGeometry
	properties: Property[]
}

const parse = (stringFile: string): VTP => {
	const file = fileToJson(stringFile) as VTKFile
	if (file.attributes.type !== 'PolyData' || file.PolyData === undefined) throw new Error('file is not PolyData')

	const polyData = file.PolyData
	const piece = polyData.Piece
	if (piece instanceof Array) throw new Error('multiple pieces exist in a .vts file')
	const compressed = file.attributes.compressor !== undefined // TODO implement for compressed file
	const geometry = new BufferGeometry()

	// PointData
	const { properties } = registerPointData(piece.PointData, file, geometry)

	// CellData

	// Points
	registerPoints(piece.Points, file, geometry)

	// Verts

	// Lines

	// Strips

	// Polys
	const { connectivity, offsets } = parsePolyData(piece.Polys, file)
	const indexBuffer = getIndexBufferFromConnectivity(connectivity, offsets)
	geometry.index = new BufferAttribute(indexBuffer, 1)
	
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
