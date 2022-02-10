// https://vtk.org/Wiki/VTK_XML_Formats
// https://kitware.github.io/vtk-examples/site/VTKFileFormats/#vtk-file-formats

import { BufferAttribute, BufferGeometry, LoaderUtils, LoadingManager } from 'three'
import BaseLoader from './BaseLoader'
import { fileToJson } from './utils'
import { getIndexBufferFromExtent, parsePointData, parsePoints } from './utils/parse'
import { Property, VTKFile } from './types'

interface VTS {
	geometry: BufferGeometry
	properties: Property[]
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
	properties.forEach(p => geometry.setAttribute(p.name, new BufferAttribute(p.data, 1)))


	// CellData

	// Points
	const positions = parsePoints(piece.Points, file)
	geometry.setAttribute('position', new BufferAttribute(positions, 3))

	// Index buffer
	const indexBuffer = getIndexBufferFromExtent(grid.attributes.WholeExtent)
	geometry.index = new BufferAttribute(indexBuffer, 1)

	return { geometry, properties }
}

class VTSLoader extends BaseLoader<VTS> {
	constructor( manager?: LoadingManager ) { super(manager) }

	parse = (data: ArrayBuffer): VTS => {
		const text = LoaderUtils.decodeText(data)
		return parseXMLVTS(text)
	}
}

export default VTSLoader
