import { BufferAttribute, BufferGeometry, FileLoader, Loader, LoaderUtils, LoadingManager } from "three";
import BaseLoader from "./BaseLoader";
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

class VTPLoader extends BaseLoader<VTP> {
	constructor( manager?: LoadingManager ) { super(manager) }

	parse = (data: ArrayBuffer): VTP => {
		const text = LoaderUtils.decodeText(data)
		return parse(text)
	}
}

export default VTPLoader
