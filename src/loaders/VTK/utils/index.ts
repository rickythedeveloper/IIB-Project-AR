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

export const fileToJson = (fileString: string) => {
	let dom: any
	if ( window.DOMParser ) {
		try { dom = ( new DOMParser() ).parseFromString(fileString, 'text/xml') }
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

export interface Extent {
	x1: number
	x2: number
	y1: number
	y2: number
	z1: number
	z2: number
}

const numBytesOfString = (str: string): number => new Blob([str]).size

const RAW_APPENDED_DATA_BEGINNING = '<AppendedData encoding="raw">'
const APPENDED_DATA_END = '</AppendedData>'

export const getRawAppendedData = (fileBuffer: ArrayBuffer): ArrayBuffer => {
	const decoder = new TextDecoder()
	const fileString = decoder.decode(fileBuffer)

	const searchStart = fileString.indexOf(RAW_APPENDED_DATA_BEGINNING), searchEnd = fileString.indexOf(APPENDED_DATA_END)
	if (searchStart === -1 || searchEnd === -1) throw new Error(`raw appended data not found ${searchStart}, ${searchEnd}`)

	const underscore_index = fileString.indexOf('_', searchStart)
	if (underscore_index === -1) throw new Error('invalid appended data')

	const stringStart = underscore_index + 1
	let stringEnd = searchEnd
	while (fileString[stringEnd - 1] === ' ' || fileString[stringEnd - 1] === '\n') stringEnd -= 1 // remove any space and new line characters

	const byteStart = numBytesOfString(fileString.slice(0, stringStart))
	const byteEnd = numBytesOfString(fileString.slice(0, stringEnd))

	return fileBuffer.slice(byteStart, byteEnd)
}