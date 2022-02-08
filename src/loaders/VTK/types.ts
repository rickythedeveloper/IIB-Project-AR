type DataType = 'Int8' | 'UInt8' | 'Int16' | 'UInt16' | 'Int32' | 'UInt32' | 'Int64' | 'UInt64' | 'Float32' | 'Float64'
type DataFormat = 'appended' | 'binary' | 'ascii'
type VTKFileType = 
	'ImageData' | 'PolyData' | 'RectilinearGrid' | 'StructuredGrid' | 'UnstructuredGrid' | 
	'PImageData' | 'PPolyData' | 'PRectilinearGrid' | 'PStructuredGrid' | 'PUnstructuredGrid'
type ByteOrder = 'LittleEndian' | 'BigEndian'
type HeaderType = 'UInt64' | 'UInt32'

interface DataArray {
	attributes: {
		type: DataType
		Name: string
		NumberOfComponents: string 
		format: DataFormat
		RangeMin: string
		RangeMax: string
		offset?: string
	}
	'#text': string
}

interface PointData {
	attributes: {
		Scalars?: string,
		Vectors?: string
		Normals?: string
		Tensors?: string
		TCoords?: string
	}
	DataArray: DataArray[] | DataArray
}

interface Points {
	DataArray: DataArray[] | DataArray
}

interface Piece {
	attributes: { Extent: string }
	PointData: PointData
	Points: Points
	Coordinates: [DataArray, DataArray, DataArray]
	Verts: [DataArray, DataArray]
	Lines: [DataArray, DataArray]
	Strips: [DataArray, DataArray]
	Polys: [DataArray, DataArray]
	Cells: [DataArray, DataArray, DataArray]
}

interface StructuredGrid {
	attributes: { WholeExtent: string }
	Piece: Piece[] | Piece
}

interface PolyData {
	attributes: { WholeExtent: string }
	Piece: Piece
}

interface AppendedData {
	attributes: {encoding: 'base64'},
	'#text'?: string
}

interface VTKFile {
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