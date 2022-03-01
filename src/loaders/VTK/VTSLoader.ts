// https://vtk.org/Wiki/VTK_XML_Formats
// https://kitware.github.io/vtk-examples/site/VTKFileFormats/#vtk-file-formats

import { BufferAttribute, BufferGeometry, LoaderUtils, LoadingManager } from 'three'
import { SHADER_PROPERTY_PREFIX } from '../../constants'
import BaseLoader from './BaseLoader'
import { Extent, fileToJson } from './utils'
import { getIndexBufferFromExtent, parsePointData, parsePoints } from './utils/parse'
import { Property, VTKFile } from './types'

interface VTS {
	type: 'VTS',
	geometry: BufferGeometry
	properties: Property[]
	extent: Extent
}

const parseXMLVTS = (stringFile: string): VTS => {
	const file = fileToJson(stringFile) as VTKFile
	if (file.StructuredGrid === undefined) throw new Error('the file does not contain StructuredGrid')
	const grid = file.StructuredGrid
	const piece = grid.Piece
	if (piece instanceof Array) throw new Error('multiple pieces exist in a .vts file')
	// const compressed = file.attributes.compressor !== undefined // TODO implement for compressed file
	const geometry = new BufferGeometry()

	// PointData
	const properties = parsePointData(piece.PointData, file)
	properties.forEach(p => geometry.setAttribute(SHADER_PROPERTY_PREFIX + p.name, new BufferAttribute(p.data, 1)))

	// CellData

	// Points
	const positions = parsePoints(piece.Points, file)
	geometry.setAttribute('position', new BufferAttribute(positions, 3))

	// Index buffer
	const [x1, x2, y1, y2, z1, z2] = grid.attributes.WholeExtent.split(' ').map(e => parseInt(e))
	const extent: Extent = { x1, x2, y1, y2, z1, z2 }
	const indexBuffer = getIndexBufferFromExtent(extent)
	geometry.index = new BufferAttribute(indexBuffer, 1)

	return { type: 'VTS', geometry, properties, extent }
}

class VTSLoader extends BaseLoader<VTS> {
	constructor( manager?: LoadingManager ) { super(manager) }

	parse = (data: ArrayBuffer): VTS => {
		const text = LoaderUtils.decodeText(data)
		return parseXMLVTS(text)
	}
}

export default VTSLoader
