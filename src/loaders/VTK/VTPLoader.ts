import { BufferAttribute, BufferGeometry, LoaderUtils, LoadingManager } from 'three'
import { SHADER_PROPERTY_PREFIX } from '../../constants'
import BaseLoader from './BaseLoader'
import { fileToJson } from './utils'
import { getIndexBufferFromConnectivity, parsePointData, parsePoints, parsePolyData } from './utils/parse'
import { Property, VTKFile } from './types'

interface VTP {
	type: 'VTP'
	geometry: BufferGeometry
	properties: Property[]
}

const parse = (stringFile: string): VTP => {
	const file = fileToJson(stringFile) as VTKFile
	if (file.attributes.type !== 'PolyData' || file.PolyData === undefined) throw new Error('file is not PolyData')

	const polyData = file.PolyData
	const piece = polyData.Piece
	if (piece instanceof Array) throw new Error('multiple pieces exist in a .vtp file')
	// const compressed = file.attributes.compressor !== undefined // TODO implement for compressed file
	const geometry = new BufferGeometry()

	// PointData
	const properties = parsePointData(piece.PointData, file)
	properties.forEach(p => geometry.setAttribute(SHADER_PROPERTY_PREFIX + p.name, new BufferAttribute(p.data, 1)))

	// CellData

	// Points
	const positions = parsePoints(piece.Points, file)
	geometry.setAttribute('position', new BufferAttribute(positions, 3))

	// Verts

	// Lines

	// Strips

	// Polys
	const { connectivity, offsets } = parsePolyData(piece.Polys, file)
	const indexBuffer = getIndexBufferFromConnectivity(connectivity, offsets)
	geometry.index = new BufferAttribute(indexBuffer, 1)

	return { type: 'VTP', geometry, properties }
}

class VTPLoader extends BaseLoader<VTP> {
	constructor( manager?: LoadingManager ) { super(manager) }

	parse = (data: ArrayBuffer): VTP => {
		const text = LoaderUtils.decodeText(data)
		return parse(text)
	}
}

export default VTPLoader
