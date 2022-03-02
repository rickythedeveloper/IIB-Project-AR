export type DataType = 'Int8' | 'UInt8' | 'Int16' | 'UInt16' | 'Int32' | 'UInt32' | 'Int64' | 'UInt64' | 'Float32' | 'Float64'
export type DataFormat = 'appended' | 'binary' | 'ascii'
export type VTKFileType =
	'ImageData' | 'PolyData' | 'RectilinearGrid' | 'StructuredGrid' | 'UnstructuredGrid' |
	'PImageData' | 'PPolyData' | 'PRectilinearGrid' | 'PStructuredGrid' | 'PUnstructuredGrid'
export type ByteOrder = 'LittleEndian' | 'BigEndian' // TODO not used. Only tested with LittleEndian
export type HeaderType = 'UInt64' | 'UInt32'

export type IntArray = Int8Array | Int16Array | Int32Array
export type UintArray = Uint8Array | Uint16Array | Uint32Array
export type FloatArray = Float32Array | Float64Array
export type NumberArray = IntArray | UintArray | FloatArray
export type BigIntArray = BigInt64Array | BigUint64Array
export type TypedArray = NumberArray | BigIntArray

export interface DataArray {
	attributes: {
		type: DataType
		Name: string
		NumberOfComponents?: string
		format: DataFormat
		RangeMin: string
		RangeMax: string
		offset?: string
	}
	'#text': string
}

export interface PointData {
	attributes: {
		Scalars?: string,
		Vectors?: string
		Normals?: string
		Tensors?: string
		TCoords?: string
	}
	DataArray: DataArray[] | DataArray
}

export interface Points {
	DataArray: DataArray
}

export interface PieceAttributes {
	NumberOfPoints?: string
	NumberOfVerts?: string
	NumberOfLines?: string
	NumberOfStrips?: string
	NumberOfPolys?: string
	Extent?: string
}

export interface ConnectivityAndOffset { DataArray: [DataArray, DataArray] }

export interface Piece {
	attributes: PieceAttributes
	PointData: PointData
	Points: Points
	Coordinates: [DataArray, DataArray, DataArray]
	Verts: ConnectivityAndOffset
	Lines: ConnectivityAndOffset
	Strips: ConnectivityAndOffset
	Polys: ConnectivityAndOffset
	Cells: [DataArray, DataArray, DataArray]
}

export interface StructuredGrid {
	attributes: { WholeExtent: string }
	Piece: Piece[] | Piece
}

export interface PolyData {
	attributes: { WholeExtent: string }
	Piece: Piece[] | Piece
}

export interface AppendedData {
	attributes: {encoding: 'base64' | 'raw'},
	'#text'?: string
}

export interface VTKFile {
	attributes: {
		type: VTKFileType,
		version: string,
		byte_order: ByteOrder,
		header_type: HeaderType,
		compressor?: string
	}
	AppendedData?: AppendedData,
	StructuredGrid?: StructuredGrid
	PolyData?: PolyData
}

export interface VTKFileInfo {
	structure: VTKFile
	buffer: ArrayBuffer
}

export interface Property {
	name: string
	min: number
	max: number
	data: NumberArray
	numComponents: number
}

export const typedArrayConstructorMap = {
	Int8: Int8Array,
	UInt8: Uint8Array,
	Int16: Int16Array,
	UInt16: Uint16Array,
	Int32: Int32Array,
	UInt32: Uint32Array,
	Int64: BigInt64Array,
	UInt64: BigUint64Array,
	Float32: Float32Array,
	Float64: Float64Array
}