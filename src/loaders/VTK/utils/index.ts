import { toByteArray } from 'base64-js'
import { DataArray, DataType, VTKFile } from '../types'

// Changes XML to JSON, based on https://davidwalsh.name/convert-xml-json
export const xmlToJson = (xml: any) => {
	// Create the return object
	let obj: any = {}
	if ( xml.nodeType === 1 ) { // element
		// do attributes
		if ( xml.attributes ) {
			if ( xml.attributes.length > 0 ) {
				obj[ 'attributes' ] = {}
				for ( let j = 0; j < xml.attributes.length; j ++ ) {
					const attribute = xml.attributes.item( j )
					obj[ 'attributes' ][ attribute.nodeName ] = attribute.nodeValue.trim()
				}
			}
		}
	} else if ( xml.nodeType === 3 ) { // text
		obj = xml.nodeValue.trim()
	}

	// do children
	if ( xml.hasChildNodes() ) {
		for ( let i = 0; i < xml.childNodes.length; i ++ ) {
			const item = xml.childNodes.item( i )
			const nodeName = item.nodeName
			if ( typeof obj[ nodeName ] === 'undefined' ) {
				const tmp = xmlToJson( item )
				if ( tmp !== '' ) obj[ nodeName ] = tmp
			} else {
				if ( typeof obj[ nodeName ].push === 'undefined' ) {
					const old = obj[ nodeName ]
					obj[ nodeName ] = [ old ]
				}
				const tmp = xmlToJson( item )
				if ( tmp !== '' ) obj[ nodeName ].push( tmp )
			}
		}
	}

	return obj
}

export const fileToJson = (stringFile: string) => {
	let dom: any
	if ( window.DOMParser ) {
		try { dom = ( new DOMParser() ).parseFromString(stringFile, 'text/xml') }
		catch ( e ) { dom = null }
	} else if ( window.ActiveXObject ) {
		try {
			dom = new ActiveXObject( 'Microsoft.XMLDOM' ) // eslint-disable-line no-undef
			dom.async = false
			if ( ! dom.loadXML( /* xml */ ) ) throw new Error( dom.parseError.reason + dom.parseError.srcText )
		} catch ( e ) {
			dom = null
		}
	} else throw new Error( 'Cannot parse xml string!' )

	// Get the doc
	const doc = dom.documentElement
	// Convert to json
	const file: any = xmlToJson(doc)
	return file
}

export const getTypeArrayConstructor = (type: DataType) => {
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

export const getDataFromDataArray = (file: VTKFile, dataArray: DataArray) => {
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
		} else throw new Error('cannot find appended data')
	} else {
		// TODO implement for in-line data
		throw new Error('not implemented')
	}
}

