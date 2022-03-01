// https://vtk.org/Wiki/VTK_XML_Formats
// https://kitware.github.io/vtk-examples/site/VTKFileFormats/#vtk-file-formats

import { BufferAttribute, BufferGeometry, LoadingManager } from 'three'
import { getPropertyVariableNameInShader } from '../../three_utils/shaders'
import BaseLoader from './BaseLoader'
import { Extent, fileToJson } from './utils'
import { getIndexBufferFromExtent, parsePointData, parsePoints } from './utils/parse'
import { Property, VTKFile, VTKFileInfo } from './types'

interface VTS {
	type: 'VTS',
	geometry: BufferGeometry
	properties: Property[]
	extent: Extent
}

const parseXMLVTS = (fileBuffer: ArrayBuffer): VTS => {
	const decoder = new TextDecoder()
	const fileString = decoder.decode(fileBuffer)
	const file = fileToJson(fileString) as VTKFile
	const fileInfo: VTKFileInfo = { buffer: fileBuffer, structure: file }

	if (file.StructuredGrid === undefined) throw new Error('the file does not contain StructuredGrid')
	const grid = file.StructuredGrid
	const piece = grid.Piece
	if (piece instanceof Array) throw new Error('multiple pieces exist in a .vts file')
	// const compressed = file.attributes.compressor !== undefined // TODO implement for compressed file
	const geometry = new BufferGeometry()

	// PointData
	const properties = parsePointData(piece.PointData, fileInfo)
	properties.forEach(p => {
		const data = p.data instanceof Float64Array ? new Float32Array(p.data) : p.data
		geometry.setAttribute(getPropertyVariableNameInShader(p.name), new BufferAttribute(data, 1))
	})

	// CellData

	// Points
	const positions = parsePoints(piece.Points, fileInfo)
	geometry.setAttribute('position', new BufferAttribute(positions instanceof Float64Array ? new Float32Array(positions) : positions, 3))

	// Index buffer
	const [x1, x2, y1, y2, z1, z2] = grid.attributes.WholeExtent.split(' ').map(e => parseInt(e))
	const extent: Extent = { x1, x2, y1, y2, z1, z2 }
	const indexBuffer = getIndexBufferFromExtent(extent)
	geometry.index = new BufferAttribute(indexBuffer, 1)

	return { type: 'VTS', geometry, properties, extent }
}

class VTSLoader extends BaseLoader<VTS> {
	constructor( manager?: LoadingManager ) { super(manager) }

	parse = parseXMLVTS
}

export default VTSLoader
