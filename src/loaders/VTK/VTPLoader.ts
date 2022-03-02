import { BufferAttribute, BufferGeometry, LoadingManager } from 'three'
import { getPropertyVariableNameInShader } from '../../three_utils/shaders'
import BaseLoader from './BaseLoader'
import { fileToJson } from './utils'
import { getIndexBufferFromConnectivity, parsePointData, parsePoints, parsePolyData } from './utils/parse'
import { NumberArray, Property, VTKFile, VTKFileInfo } from './types'

interface VTP {
	type: 'VTP'
	geometry: BufferGeometry
	properties: Property[]
}

const parseXMLVTP = (fileBuffer: ArrayBuffer): VTP => {
	const decoder = new TextDecoder()
	const fileString = decoder.decode(fileBuffer)
	const file = fileToJson(fileString) as VTKFile
	const fileInfo: VTKFileInfo = { buffer: fileBuffer, structure: file }

	if (file.attributes.type !== 'PolyData' || file.PolyData === undefined) throw new Error('file is not PolyData')

	const polyData = file.PolyData
	const piece = polyData.Piece
	if (piece instanceof Array) throw new Error('multiple pieces exist in a .vtp file')
	// const compressed = file.attributes.compressor !== undefined // TODO implement for compressed file
	const geometry = new BufferGeometry()

	// PointData
	const properties = parsePointData(piece.PointData, fileInfo)
	properties.forEach(p => {
		let bufferData: NumberArray
		if (p.numComponents === 1) {
			bufferData = p.data instanceof Float64Array ? new Float32Array(p.data) : p.data
		} else {
			bufferData = new Float32Array(p.data.length / p.numComponents)
			for (let i = 0; i < p.data.length; i += p.numComponents) {
				let squareSum = 0
				for (let j = 0; j < p.numComponents; j++) squareSum += p.data[i + j] ** 2
				bufferData[i / p.numComponents] = Math.sqrt(squareSum)
			}
		}
		geometry.setAttribute(getPropertyVariableNameInShader(p.name), new BufferAttribute(bufferData, 1))
	})

	// CellData

	// Points
	const positions = parsePoints(piece.Points, fileInfo)
	geometry.setAttribute('position', new BufferAttribute(positions instanceof Float64Array ? new Float32Array(positions) : positions, 3))

	// Verts

	// Lines

	// Strips

	// Polys
	const { connectivity: polyConnectivity, offsets: polyOffsets } = parsePolyData(piece.Polys, fileInfo)
	if (polyConnectivity.length > 0 && polyOffsets.length > 0) {
		const indexBuffer = getIndexBufferFromConnectivity(polyConnectivity, polyOffsets)
		geometry.index = new BufferAttribute(indexBuffer, 1)
	}

	return { type: 'VTP', geometry, properties }
}

class VTPLoader extends BaseLoader<VTP> {
	constructor( manager?: LoadingManager ) { super(manager) }

	parse = parseXMLVTP
}

export default VTPLoader
