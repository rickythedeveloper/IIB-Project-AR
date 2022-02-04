// https://vtk.org/Wiki/VTK_XML_Formats
// https://kitware.github.io/vtk-examples/site/VTKFileFormats/#vtk-file-formats

import {
	BufferAttribute,
	BufferGeometry,
	FileLoader,
	Float32BufferAttribute,
	Loader,
	LoaderUtils,
	LoadingManager,
} from 'three';
import * as fflate from 'fflate';

import { toByteArray } from 'base64-js'

type DataType = 'Int8' | 'UInt8' | 'Int16' | 'UInt16' | 'Int32' | 'UInt32' | 'Int64' | 'UInt64' | 'Float32' | 'Float64'
type DataFormat = 'appended' | 'binary' | 'ascii'
type VTKFileType = 
	'ImageData' | 'PolyData' | 'RectilinearGrid' | 'StructuredGrid' | 'UnstructuredGrid' | 
	'PImageData' | 'PPolyData' | 'PRectilinearGrid' | 'PStructuredGrid' | 'PUnstructuredGrid'
type ByteOrder = 'LittleEndian' | 'BigEndian'
type HeaderType = 'UInt64' | 'UInt32'

const getTypeArrayConstructor = (type: DataType) => {
	switch (type) {
		case 'Int8': return Int8Array
		case 'UInt8': return Uint8Array
		case 'Int16': return Int16Array
		case 'UInt16': return Uint16Array
		case 'Int32': return Int32Array
		case 'UInt32': return Uint32Array
		case 'Int64': return BigInt64Array
		case 'UInt64': return BigUint64Array
		case 'Float32': return Float32Array
		case 'Float64': return Float64Array
	}
}

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

const getDataFromDataArray = (file: VTKFile, dataArray: DataArray) => {
	if (dataArray.attributes.format === 'appended') {
		if (dataArray.attributes.offset && file.AppendedData && file.AppendedData['#text']) {
			const numBytesHeader = file.attributes.header_type === 'UInt32' ? 4 : 8
			const headerArrayConstructor = getTypeArrayConstructor(file.attributes.header_type)
			const offset = parseInt(dataArray.attributes.offset)
			const text = file.AppendedData['#text'].slice(offset+1) // account for the underscore at the beginning
			const byteArray = toByteArray(text)
			const header = new headerArrayConstructor(byteArray.slice(0, numBytesHeader).buffer)
			const numBytesContent = header[0]
			if (numBytesContent > Number.MAX_SAFE_INTEGER) throw new Error('number of bytes for content is larger than the max safe integer')
			const content = byteArray.slice(numBytesHeader, numBytesHeader + Number(numBytesContent)) // first 4 or 8 bytes simply signify the number of content bytes
			const arrayConstructor = getTypeArrayConstructor(dataArray.attributes.type)
			const typedArray = new arrayConstructor(content.buffer)
			return typedArray
		} else {
			throw new Error('cannot find appended data')
		}
	} else {
		throw new Error('not implemented')
	}
}

class VTKLoader extends Loader {

	constructor( manager?: LoadingManager ) { super(manager) }
	load(url: string, onLoad: (geometry: BufferGeometry) => void, onProgress?: (request: ProgressEvent<EventTarget>) => void, onError?: (message: string) => void) {
		const scope = this;
		const loader = new FileLoader(scope.manager);
		loader.setPath(scope.path);
		loader.setResponseType( 'arraybuffer' );
		loader.setRequestHeader( scope.requestHeader );
		loader.setWithCredentials( scope.withCredentials );
		loader.load( url, 
			( text ) => {
				try {
					if (text instanceof ArrayBuffer) onLoad(scope.parse(text));
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

	parse(data: ArrayBuffer): BufferGeometry {
		function parseASCII( data: string ) {
			var indices = []; // connectivity of the triangles
			var positions = []; // triangles vertices
			var colors = []; // red, green, blue colors in the range 0 to 1
			var normals = []; // normal vector, one per vertex
			var result;
			var patWord = /^[^\d.\s-]+/; // pattern for detecting the end of a number sequence
			var pat3Floats = /(\-?\d+\.?[\d\-\+e]*)\s+(\-?\d+\.?[\d\-\+e]*)\s+(\-?\d+\.?[\d\-\+e]*)/g; // pattern for reading vertices, 3 floats or integers
			var patConnectivity = /^(\d+)\s+([\s\d]*)/; // pattern for connectivity, an integer followed by any number of ints. the first integer is the number of polygon nodes
			var patPOINTS = /^POINTS /; // indicates start of vertex data section
			var patPOLYGONS = /^POLYGONS /; // indicates start of polygon connectivity section
			var patTRIANGLE_STRIPS = /^TRIANGLE_STRIPS /; // indicates start of triangle strips section
			var patPOINT_DATA = /^POINT_DATA[ ]+(\d+)/; // POINT_DATA number_of_values
			var patCELL_DATA = /^CELL_DATA[ ]+(\d+)/; // CELL_DATA number_of_polys
			var patCOLOR_SCALARS = /^COLOR_SCALARS[ ]+(\w+)[ ]+3/; // Start of color section
			var patNORMALS = /^NORMALS[ ]+(\w+)[ ]+(\w+)/; // NORMALS Normals float

			var inPointsSection = false;
			var inPolygonsSection = false;
			var inTriangleStripSection = false;
			var inPointDataSection = false;
			var inCellDataSection = false;
			var inColorSection = false;
			var inNormalsSection = false;

			var lines = data.split( '\n' );

			for ( var i in lines ) {
				var line = lines[ i ].trim();
				if ( line.indexOf( 'DATASET' ) === 0 ) {
					var dataset = line.split( ' ' )[ 1 ];
					if ( dataset !== 'POLYDATA' ) throw new Error( 'Unsupported DATASET type: ' + dataset );
				} else if ( inPointsSection ) {
					// get the vertices
					while ( ( result = pat3Floats.exec( line ) ) !== null ) {
						if ( patWord.exec( line ) !== null ) break;
						var x = parseFloat( result[ 1 ] );
						var y = parseFloat( result[ 2 ] );
						var z = parseFloat( result[ 3 ] );
						positions.push( x, y, z );
					}
				} else if ( inPolygonsSection ) {
					if ( ( result = patConnectivity.exec( line ) ) !== null ) {
						// numVertices i0 i1 i2 ...
						var numVertices = parseInt( result[ 1 ] );
						var inds = result[ 2 ].split( /\s+/ );
						if ( numVertices >= 3 ) {
							var i0 = parseInt( inds[ 0 ] );
							var i1, i2;
							var k = 1;
							// split the polygon in numVertices - 2 triangles
							for ( var j = 0; j < numVertices - 2; ++ j ) {
								i1 = parseInt( inds[ k ] );
								i2 = parseInt( inds[ k + 1 ] );
								indices.push( i0, i1, i2 );
								k ++;
							}
						}
					}
				} else if ( inTriangleStripSection ) {
					if ( ( result = patConnectivity.exec( line ) ) !== null ) {
						// numVertices i0 i1 i2 ...
						var numVertices = parseInt( result[ 1 ] );
						var inds = result[ 2 ].split( /\s+/ );
						if ( numVertices >= 3 ) {
							let i0: number, i1: number, i2: number
							// split the polygon in numVertices - 2 triangles
							for ( var j = 0; j < numVertices - 2; j ++ ) {
								if ( j % 2 === 1 ) {
									i0 = parseInt( inds[ j ] );
									i1 = parseInt( inds[ j + 2 ] );
									i2 = parseInt( inds[ j + 1 ] );
									indices.push( i0, i1, i2 );
								} else {
									i0 = parseInt( inds[ j ] );
									i1 = parseInt( inds[ j + 1 ] );
									i2 = parseInt( inds[ j + 2 ] );
									indices.push( i0, i1, i2 );
								}

							}

						}
					}
				} else if ( inPointDataSection || inCellDataSection ) {
					if ( inColorSection ) {
						// Get the colors
						while ( ( result = pat3Floats.exec( line ) ) !== null ) {
							if ( patWord.exec( line ) !== null ) break;
							var r = parseFloat( result[ 1 ] );
							var g = parseFloat( result[ 2 ] );
							var b = parseFloat( result[ 3 ] );
							colors.push( r, g, b );
						}
					} else if ( inNormalsSection ) {
						// Get the normal vectors
						while ( ( result = pat3Floats.exec( line ) ) !== null ) {
							if ( patWord.exec( line ) !== null ) break;
							var nx = parseFloat( result[ 1 ] );
							var ny = parseFloat( result[ 2 ] );
							var nz = parseFloat( result[ 3 ] );
							normals.push( nx, ny, nz );
						}
					}
				}

				if ( patPOLYGONS.exec( line ) !== null ) {
					inPolygonsSection = true;
					inPointsSection = false;
					inTriangleStripSection = false;
				} else if ( patPOINTS.exec( line ) !== null ) {
					inPolygonsSection = false;
					inPointsSection = true;
					inTriangleStripSection = false;
				} else if ( patTRIANGLE_STRIPS.exec( line ) !== null ) {
					inPolygonsSection = false;
					inPointsSection = false;
					inTriangleStripSection = true;
				} else if ( patPOINT_DATA.exec( line ) !== null ) {
					inPointDataSection = true;
					inPointsSection = false;
					inPolygonsSection = false;
					inTriangleStripSection = false;
				} else if ( patCELL_DATA.exec( line ) !== null ) {
					inCellDataSection = true;
					inPointsSection = false;
					inPolygonsSection = false;
					inTriangleStripSection = false;
				} else if ( patCOLOR_SCALARS.exec( line ) !== null ) {
					inColorSection = true;
					inNormalsSection = false;
					inPointsSection = false;
					inPolygonsSection = false;
					inTriangleStripSection = false;
				} else if ( patNORMALS.exec( line ) !== null ) {
					inNormalsSection = true;
					inColorSection = false;
					inPointsSection = false;
					inPolygonsSection = false;
					inTriangleStripSection = false;
				}
			}

			var geometry = new BufferGeometry();
			geometry.setIndex( indices );
			geometry.setAttribute( 'position', new Float32BufferAttribute( positions, 3 ) );

			if ( normals.length === positions.length ) geometry.setAttribute( 'normal', new Float32BufferAttribute( normals, 3 ) );
			if ( colors.length !== indices.length ) {
				// stagger
				if ( colors.length === positions.length ) geometry.setAttribute( 'color', new Float32BufferAttribute( colors, 3 ) );
			} else {
				// cell
				geometry = geometry.toNonIndexed();
				var numTriangles = geometry.attributes.position.count / 3;
				if ( colors.length === ( numTriangles * 3 ) ) {
					var newColors = [];
					for (let i = 0; i < numTriangles; i ++ ) {
						var r = colors[ 3 * i + 0 ];
						var g = colors[ 3 * i + 1 ];
						var b = colors[ 3 * i + 2 ];
						newColors.push( r, g, b );
						newColors.push( r, g, b );
						newColors.push( r, g, b );
					}
					geometry.setAttribute( 'color', new Float32BufferAttribute( newColors, 3 ) );
				}
			}
			return geometry;
		}

		function parseBinary( data: ArrayBuffer ) {

			var count, pointIndex, i, numberOfPoints, s;
			var buffer = new Uint8Array( data );
			var dataView = new DataView( data );

			// Points and normals, by default, are empty
			let points: Float32Array = new Float32Array();
			var normals: Float32Array = new Float32Array();
			var indices: Uint32Array = new Uint32Array();

			// Going to make a big array of strings
			var vtk = [];
			var index = 0;

			function findString( buffer: Uint8Array, start: number ) {

				var index = start;
				var c = buffer[ index ];
				var s = [];
				while ( c !== 10 ) {

					s.push( String.fromCharCode( c ) );
					index ++;
					c = buffer[ index ];

				}

				return { start: start,
					end: index,
					next: index + 1,
					parsedString: s.join( '' ) };

			}

			var state, line;

			while ( true ) {

				// Get a string
				state = findString( buffer, index );
				line = state.parsedString;

				if ( line.indexOf( 'DATASET' ) === 0 ) {
					var dataset = line.split( ' ' )[ 1 ];
					if ( dataset !== 'POLYDATA' ) throw new Error( 'Unsupported DATASET type: ' + dataset );
				} else if ( line.indexOf( 'POINTS' ) === 0 ) {

					vtk.push( line );
					// Add the points
					numberOfPoints = parseInt( line.split( ' ' )[ 1 ], 10 );

					// Each point is 3 4-byte floats
					count = numberOfPoints * 4 * 3;

					points = new Float32Array( numberOfPoints * 3 );

					pointIndex = state.next;
					for ( i = 0; i < numberOfPoints; i ++ ) {
						points[ 3 * i ] = dataView.getFloat32( pointIndex, false );
						points[ 3 * i + 1 ] = dataView.getFloat32( pointIndex + 4, false );
						points[ 3 * i + 2 ] = dataView.getFloat32( pointIndex + 8, false );
						pointIndex = pointIndex + 12;
					}

					// increment our next pointer
					state.next = state.next + count + 1;

				} else if ( line.indexOf( 'TRIANGLE_STRIPS' ) === 0 ) {

					var numberOfStrips = parseInt( line.split( ' ' )[ 1 ], 10 );
					var size = parseInt( line.split( ' ' )[ 2 ], 10 );
					// 4 byte integers
					count = size * 4;

					indices = new Uint32Array( 3 * size - 9 * numberOfStrips );
					var indicesIndex = 0;

					pointIndex = state.next;
					for ( i = 0; i < numberOfStrips; i ++ ) {

						// For each strip, read the first value, then record that many more points
						var indexCount = dataView.getInt32( pointIndex, false );
						var strip = [];
						pointIndex += 4;
						for ( s = 0; s < indexCount; s ++ ) {

							strip.push( dataView.getInt32( pointIndex, false ) );
							pointIndex += 4;

						}

						// retrieves the n-2 triangles from the triangle strip
						for ( var j = 0; j < indexCount - 2; j ++ ) {

							if ( j % 2 ) {

								indices[ indicesIndex ++ ] = strip[ j ];
								indices[ indicesIndex ++ ] = strip[ j + 2 ];
								indices[ indicesIndex ++ ] = strip[ j + 1 ];

							} else {


								indices[ indicesIndex ++ ] = strip[ j ];
								indices[ indicesIndex ++ ] = strip[ j + 1 ];
								indices[ indicesIndex ++ ] = strip[ j + 2 ];

							}

						}

					}

					// increment our next pointer
					state.next = state.next + count + 1;

				} else if ( line.indexOf( 'POLYGONS' ) === 0 ) {

					var numberOfStrips = parseInt( line.split( ' ' )[ 1 ], 10 );
					var size = parseInt( line.split( ' ' )[ 2 ], 10 );
					// 4 byte integers
					count = size * 4;

					indices = new Uint32Array( 3 * size - 9 * numberOfStrips );
					var indicesIndex = 0;

					pointIndex = state.next;
					for ( i = 0; i < numberOfStrips; i ++ ) {

						// For each strip, read the first value, then record that many more points
						var indexCount = dataView.getInt32( pointIndex, false );
						var strip = [];
						pointIndex += 4;
						for ( s = 0; s < indexCount; s ++ ) {

							strip.push( dataView.getInt32( pointIndex, false ) );
							pointIndex += 4;

						}

						// divide the polygon in n-2 triangle
						for ( var j = 1; j < indexCount - 1; j ++ ) {

							indices[ indicesIndex ++ ] = strip[ 0 ];
							indices[ indicesIndex ++ ] = strip[ j ];
							indices[ indicesIndex ++ ] = strip[ j + 1 ];

						}

					}

					// increment our next pointer
					state.next = state.next + count + 1;

				} else if ( line.indexOf( 'POINT_DATA' ) === 0 ) {

					numberOfPoints = parseInt( line.split( ' ' )[ 1 ], 10 );

					// Grab the next line
					state = findString( buffer, state.next );

					// Now grab the binary data
					count = numberOfPoints * 4 * 3;

					normals = new Float32Array( numberOfPoints * 3 );
					pointIndex = state.next;
					for ( i = 0; i < numberOfPoints; i ++ ) {

						normals[ 3 * i ] = dataView.getFloat32( pointIndex, false );
						normals[ 3 * i + 1 ] = dataView.getFloat32( pointIndex + 4, false );
						normals[ 3 * i + 2 ] = dataView.getFloat32( pointIndex + 8, false );
						pointIndex += 12;

					}

					// Increment past our data
					state.next = state.next + count;

				}

				// Increment index
				index = state.next;

				if ( index >= buffer.byteLength ) break;
			}

			var geometry = new BufferGeometry();
			geometry.setIndex( new BufferAttribute( indices, 1 ) );
			geometry.setAttribute( 'position', new BufferAttribute( points, 3 ) );

			if ( normals.length === points.length ) geometry.setAttribute( 'normal', new BufferAttribute( normals, 3 ) )

			return geometry;

		}

		function Float32Concat( first: Float32Array, second: Float32Array ): Float32Array {

			const firstLength = first.length, result = new Float32Array( firstLength + second.length );

			result.set( first );
			result.set( second, firstLength );

			return result;

		}

		function Int32Concat( first: Int32Array, second: Int32Array ): Int32Array {

			var firstLength = first.length, result = new Int32Array( firstLength + second.length );

			result.set( first );
			result.set( second, firstLength );

			return result;

		}

		function parseXML( stringFile: string ): BufferGeometry {

			// Changes XML to JSON, based on https://davidwalsh.name/convert-xml-json

			function xmlToJson(xml: any) {
				// Create the return object
				let obj: any = {};
				if ( xml.nodeType === 1 ) { // element
					// do attributes
					if ( xml.attributes ) {
						if ( xml.attributes.length > 0 ) {
							obj[ 'attributes' ] = {};
							for ( var j = 0; j < xml.attributes.length; j ++ ) {
								var attribute = xml.attributes.item( j );
								obj[ 'attributes' ][ attribute.nodeName ] = attribute.nodeValue.trim();
							}
						}
					}
				} else if ( xml.nodeType === 3 ) { // text
					obj = xml.nodeValue.trim();
				}

				// do children
				if ( xml.hasChildNodes() ) {
					for ( var i = 0; i < xml.childNodes.length; i ++ ) {
						var item = xml.childNodes.item( i );
						var nodeName = item.nodeName;
						if ( typeof obj[ nodeName ] === 'undefined' ) {
							var tmp = xmlToJson( item );
							if ( tmp !== '' ) obj[ nodeName ] = tmp;
						} else {
							if ( typeof obj[ nodeName ].push === 'undefined' ) {
								var old = obj[ nodeName ];
								obj[ nodeName ] = [ old ];
							}
							var tmp = xmlToJson( item );
							if ( tmp !== '' ) obj[ nodeName ].push( tmp );
						}
					}
				}

				return obj;
			}

			// Taken from Base64-js
			function Base64toByteArray(b64: any) {
				var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
				var i;
				var lookup = [];
				var revLookup = [];
				var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
				var len = code.length;

				for ( i = 0; i < len; i ++ ) lookup[ i ] = code[ i ];
				for ( i = 0; i < len; ++ i ) revLookup[ code.charCodeAt( i ) ] = i;

				revLookup[ '-'.charCodeAt( 0 ) ] = 62;
				revLookup[ '_'.charCodeAt( 0 ) ] = 63;

				var j, l, tmp, placeHolders, arr;
				len = b64.length;

				if ( len % 4 > 0 ) throw new Error( 'Invalid string. Length must be a multiple of 4' );

				placeHolders = b64[ len - 2 ] === '=' ? 2 : b64[ len - 1 ] === '=' ? 1 : 0;
				arr = new Arr( len * 3 / 4 - placeHolders );
				l = placeHolders > 0 ? len - 4 : len;

				var L = 0;

				for ( i = 0, j = 0; i < l; i += 4, j += 3 ) {
					tmp = ( revLookup[ b64.charCodeAt( i ) ] << 18 ) | ( revLookup[ b64.charCodeAt( i + 1 ) ] << 12 ) | ( revLookup[ b64.charCodeAt( i + 2 ) ] << 6 ) | revLookup[ b64.charCodeAt( i + 3 ) ];
					arr[ L ++ ] = ( tmp & 0xFF0000 ) >> 16;
					arr[ L ++ ] = ( tmp & 0xFF00 ) >> 8;
					arr[ L ++ ] = tmp & 0xFF;
				}

				if ( placeHolders === 2 ) {
					tmp = ( revLookup[ b64.charCodeAt( i ) ] << 2 ) | ( revLookup[ b64.charCodeAt( i + 1 ) ] >> 4 );
					arr[ L ++ ] = tmp & 0xFF;
				} else if ( placeHolders === 1 ) {
					tmp = ( revLookup[ b64.charCodeAt( i ) ] << 10 ) | ( revLookup[ b64.charCodeAt( i + 1 ) ] << 4 ) | ( revLookup[ b64.charCodeAt( i + 2 ) ] >> 2 );
					arr[ L ++ ] = ( tmp >> 8 ) & 0xFF;
					arr[ L ++ ] = tmp & 0xFF;
				}

				return arr;
			}

			function parseDataArray( ele: any, compressed: boolean) {
				const numBytes = json.attributes.header_type === 'UInt64' ? 8 : (json.attributes.header_type === 'UInt32' ? 4 : 0)

				let content: ArrayBufferLike
				let txt: Float32Array | Int32Array | undefined
				// Check the format
				if ( ele.attributes.format === 'binary' && compressed ) {

					var rawData, byteData, blocks, cSizeStart, headerSize, padding, dataOffsets, currentOffset;
					txt = ele.attributes.type === 'Float32' ? new Float32Array( ) : (ele.attributes.type === 'Int64' ? new Int32Array( ) : undefined)
					if (txt === undefined) throw new Error('data array type is not either of Float32 and Int32')

					// VTP data with the header has the following structure:
					// [#blocks][#u-size][#p-size][#c-size-1][#c-size-2]...[#c-size-#blocks][DATA]
					//
					// Each token is an integer value whose type is specified by "header_type" at the top of the file (UInt32 if no type specified). The token meanings are:
					// [#blocks] = Number of blocks
					// [#u-size] = Block size before compression
					// [#p-size] = Size of last partial block (zero if it not needed)
					// [#c-size-i] = Size in bytes of block i after compression
					//
					// The [DATA] portion stores contiguously every block appended together. The offset from the beginning of the data section to the beginning of a block is
					// computed by summing the compressed block sizes from preceding blocks according to the header.

					rawData = ele[ '#text' ];
					byteData = Base64toByteArray( rawData );
					if (!(byteData instanceof Uint8Array)) throw new Error('Byte data is not Uint8Array')
					blocks = byteData[ 0 ];
					for ( var i = 1; i < numBytes - 1; i ++ ) blocks = blocks | ( byteData[ i ] << ( i * numBytes ) );

					headerSize = ( blocks + 3 ) * numBytes;
					padding = ( ( headerSize % 3 ) > 0 ) ? 3 - ( headerSize % 3 ) : 0;
					headerSize = headerSize + padding;

					dataOffsets = [];
					currentOffset = headerSize;
					dataOffsets.push( currentOffset );

					// Get the blocks sizes after the compression.
					// There are three blocks before c-size-i, so we skip 3*numBytes
					cSizeStart = 3 * numBytes;

					for ( var i = 0; i < blocks; i ++ ) {
						var currentBlockSize = byteData[ i * numBytes + cSizeStart ];
						for ( var j = 1; j < numBytes - 1; j ++ ) {
							// Each data point consists of 8 bytes regardless of the header type
							currentBlockSize = currentBlockSize | ( byteData[ i * numBytes + cSizeStart + j ] << ( j * 8 ) );
						}
						currentOffset = currentOffset + currentBlockSize;
						dataOffsets.push( currentOffset );
					}

					for ( var i = 0; i < dataOffsets.length - 1; i ++ ) {
						var data = fflate.unzlibSync( byteData.slice( dataOffsets[ i ], dataOffsets[ i + 1 ] ) ); // eslint-disable-line no-undef
						content = data.buffer;

						if ( ele.attributes.type === 'Float32' ) {
							content = new Float32Array( content );
							txt = Float32Concat( txt as Float32Array, content as Float32Array);
						} else if ( ele.attributes.type === 'Int64' ) {
							content = new Int32Array( content );
							txt = Int32Concat( txt as Int32Array, content as Int32Array);
						}
					}

					delete ele[ '#text' ];

					if ( ele.attributes.type === 'Int64' ) {
						if ( ele.attributes.format === 'binary' ) {
							txt = txt.filter(( el, idx ) => { if ( idx % 2 !== 1 ) return true });
						}
					}
				} else {
					if ( ele.attributes.format === 'binary' && ! compressed ) {
						const byteArray = Base64toByteArray( ele[ '#text' ] );
						if (!(byteArray instanceof Uint8Array)) throw new Error('byteArray is not Uint8Array')

						//  VTP data for the uncompressed case has the following structure:
						// [#bytes][DATA]
						// where "[#bytes]" is an integer value specifying the number of bytes in the block of data following it.
						content = byteArray.slice( numBytes ).buffer;
					} else {
						if ( ele[ '#text' ] ) {
							content = ele[ '#text' ].split( /\s+/ ).filter((el: any) => { if ( el !== '' ) return el; });
						} else content = new Int32Array( 0 ).buffer;
					}
					delete ele[ '#text' ];

					// Get the content and optimize it
					if ( ele.attributes.type === 'Float32' ) txt = new Float32Array( content );
					else if ( ele.attributes.type === 'Int32' ) txt = new Int32Array( content );
					else if ( ele.attributes.type === 'Int64' ) {
						txt = new Int32Array( content );
						if ( ele.attributes.format === 'binary' ) {
							txt = txt.filter( function ( el, idx ) {
								if ( idx % 2 !== 1 ) return true;
							} );
						}
					}
				} // endif ( ele.attributes.format === 'binary' && compressed )

				return txt;
			}

			// Main part
			// Get Dom
			// var dom = null;

			document.getElementById('a')

			let dom: any
			if ( window.DOMParser ) {
				try { dom = ( new DOMParser() ).parseFromString( stringFile, 'text/xml' ); } 
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
			var json = xmlToJson( doc );
			let points: Float32Array = new Float32Array();
			let normals: Float32Array = new Float32Array();
			let indices: Uint32Array = new Uint32Array()

			if ( json.PolyData ) {
				var piece = json.PolyData.Piece;
				var compressed = json.attributes.hasOwnProperty( 'compressor' );

				// Can be optimized
				// Loop through the sections
				var sections = [ 'PointData', 'Points', 'Strips', 'Polys' ];// +['CellData', 'Verts', 'Lines'];
				var sectionIndex = 0, numberOfSections = sections.length;

				while ( sectionIndex < numberOfSections ) {
					var section = piece[ sections[ sectionIndex ] ];
					// If it has a DataArray in it
					if ( section && section.DataArray ) {
						// Depending on the number of DataArrays
						let arr: any
						if ( Object.prototype.toString.call( section.DataArray ) === '[object Array]' ) arr = section.DataArray;
						else arr = [ section.DataArray ]

						var dataArrayIndex = 0, numberOfDataArrays = arr.length;
						while ( dataArrayIndex < numberOfDataArrays ) {
							// Parse the DataArray
							if ( ( '#text' in arr[ dataArrayIndex ] ) && ( arr[ dataArrayIndex ][ '#text' ].length > 0 ) ) {
								arr[ dataArrayIndex ].text = parseDataArray( arr[ dataArrayIndex ], compressed );
							}
							dataArrayIndex ++;
						}

						switch ( sections[ sectionIndex ] ) {

							// if it is point data
							case 'PointData':
								var numberOfPoints = parseInt( piece.attributes.NumberOfPoints );
								var normalsName = section.attributes.Normals;

								if ( numberOfPoints > 0 ) {
									for ( var i = 0, len = arr.length; i < len; i ++ ) {
										if ( normalsName === arr[ i ].attributes.Name ) {
											var components = arr[ i ].attributes.NumberOfComponents;
											normals = new Float32Array( numberOfPoints * components );
											normals.set( arr[ i ].text, 0 );
										}
									}
								}
								break;

							// if it is points
							case 'Points':
								var numberOfPoints = parseInt( piece.attributes.NumberOfPoints );
								if ( numberOfPoints > 0 ) {
									var components = section.DataArray.attributes.NumberOfComponents;
									points = new Float32Array( numberOfPoints * components );
									points.set( section.DataArray.text, 0 );
								}
								break;

							// if it is strips
							case 'Strips':
								var numberOfStrips = parseInt( piece.attributes.NumberOfStrips );

								if ( numberOfStrips > 0 ) {
									var connectivity = new Int32Array( section.DataArray[ 0 ].text.length );
									var offset = new Int32Array( section.DataArray[ 1 ].text.length );
									connectivity.set( section.DataArray[ 0 ].text, 0 );
									offset.set( section.DataArray[ 1 ].text, 0 );

									var size = numberOfStrips + connectivity.length;
									indices = new Uint32Array( 3 * size - 9 * numberOfStrips );

									var indicesIndex = 0;

									for (let i = 0, len = numberOfStrips; i < len; i ++ ) {
										var strip = [];
										for ( var s = 0, len1 = offset[ i ], len0 = 0; s < len1 - len0; s ++ ) {
											strip.push( connectivity[ s ] );
											if ( i > 0 ) len0 = offset[ i - 1 ];
										}

										for ( var j = 0, len1 = offset[ i ], len0 = 0; j < len1 - len0 - 2; j ++ ) {
											if ( j % 2 ) {
												indices[ indicesIndex ++ ] = strip[ j ];
												indices[ indicesIndex ++ ] = strip[ j + 2 ];
												indices[ indicesIndex ++ ] = strip[ j + 1 ];
											} else {
												indices[ indicesIndex ++ ] = strip[ j ];
												indices[ indicesIndex ++ ] = strip[ j + 1 ];
												indices[ indicesIndex ++ ] = strip[ j + 2 ];
											}

											if ( i > 0 ) len0 = offset[ i - 1 ];
										}
									}
								}
								break;

							// if it is polys
							case 'Polys':
								var numberOfPolys = parseInt( piece.attributes.NumberOfPolys );
								if ( numberOfPolys > 0 ) {
									var connectivity = new Int32Array( section.DataArray[ 0 ].text.length );
									var offset = new Int32Array( section.DataArray[ 1 ].text.length );
									connectivity.set( section.DataArray[ 0 ].text, 0 );
									offset.set( section.DataArray[ 1 ].text, 0 );

									var size = numberOfPolys + connectivity.length;
									indices = new Uint32Array( 3 * size - 9 * numberOfPolys );
									var indicesIndex = 0, connectivityIndex = 0;
									let i = 0, len = numberOfPolys, len0 = 0;

									while ( i < len ) {
										var poly = [];
										var s = 0, len1 = offset[ i ];
										while ( s < len1 - len0 ) {
											poly.push( connectivity[ connectivityIndex ++ ] );
											s ++;
										}
										var j = 1;
										while ( j < len1 - len0 - 1 ) {
											indices[ indicesIndex ++ ] = poly[ 0 ];
											indices[ indicesIndex ++ ] = poly[ j ];
											indices[ indicesIndex ++ ] = poly[ j + 1 ];
											j ++;
										}
										i ++;
										len0 = offset[ i - 1 ];
									}
								}
								break;
							default:
								break;
						}
					}
					sectionIndex ++;
				}

				var geometry = new BufferGeometry();
				geometry.setIndex( new BufferAttribute( indices, 1 ) );
				geometry.setAttribute( 'position', new BufferAttribute( points, 3 ) );

				if ( normals.length === points.length ) geometry.setAttribute( 'normal', new BufferAttribute( normals, 3 ) )

				return geometry;

			} else if (json.StructuredGrid) {
				console.log('structured!');
				const file = json as VTKFile
				const grid = file.StructuredGrid!
				const piece = grid.Piece
				console.log('piece', piece);
				if (piece instanceof Array) throw new Error('hanya')
				const compressed = (json as VTKFile).attributes.compressor !== undefined
				console.log('compressed?', compressed);

				const geometry = new BufferGeometry()

				// PointData
				const pointDataSection = piece.PointData
				const pointDataDataArrays = pointDataSection.DataArray instanceof Array ? pointDataSection.DataArray : [pointDataSection.DataArray]
				for (const dataArray of pointDataDataArrays) {
					const typedArray = getDataFromDataArray(file, dataArray)
					console.log(dataArray.attributes.Name, typedArray);

					if (typedArray instanceof BigInt64Array || typedArray instanceof BigUint64Array) {
						console.warn('data array type is BigInt64Array or BigUInt64Array which cannot be used for three.js')
						continue
					}

					geometry.setAttribute(dataArray.attributes.Name, new BufferAttribute(typedArray, 1))
				}

				// CellData

				// Points
				const pointsDataArrays = piece.Points.DataArray instanceof Array ? piece.Points.DataArray : [piece.Points.DataArray]
				for (const dataArray of pointsDataArrays) {
					const typedArray = getDataFromDataArray(file, dataArray)

					if (typedArray instanceof BigInt64Array || typedArray instanceof BigUint64Array) {
						console.warn('data array type is BigInt64Array or BigUInt64Array which cannot be used for three.js')
						continue
					}

					geometry.setAttribute('position', new BufferAttribute(typedArray, 3))
					console.log(dataArray.attributes.Name, typedArray);
				}



				return geometry
			} else throw new Error( 'Unsupported DATASET type' );
		}

		// get the 5 first lines of the files to check if there is the key word binary
		var meta = LoaderUtils.decodeText( new Uint8Array( data, 0, 250 ) ).split( '\n' );

		if ( meta[ 0 ].indexOf( 'xml' ) !== - 1 ) return parseXML( LoaderUtils.decodeText( data ) );
		else if ( meta[ 2 ].includes( 'ASCII' ) ) return parseASCII( LoaderUtils.decodeText( data ) );
		else return parseBinary( data );
	}

}

export default VTKLoader
