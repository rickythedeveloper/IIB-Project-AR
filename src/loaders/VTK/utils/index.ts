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