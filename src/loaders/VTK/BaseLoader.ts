import { FileLoader, Loader, LoadingManager } from 'three'

abstract class BaseLoader<ResultType> extends Loader {
	protected constructor( manager?: LoadingManager ) { super(manager) }

	load = (
		url: string,
		onLoad: (result: ResultType) => void,
		onProgress?: (request: ProgressEvent) => void,
		onError?: (message: string) => void
	) => {
		const loader = new FileLoader(this.manager)
		loader.setPath(this.path)
		loader.setResponseType( 'arraybuffer' )
		loader.setRequestHeader( this.requestHeader )
		loader.setWithCredentials( this.withCredentials )
		loader.load( url,
			( buffer ) => {
				try {
					if (buffer instanceof ArrayBuffer) onLoad(this.parse(buffer))
				} catch (e) {
					if (e instanceof Error && onError) onError(e.message)
					else console.error(e)
					this.manager.itemError( url )
				}
			},
			onProgress,
			(e) => {if (onError) onError(e.message) }
		)
	}

	abstract parse: (data: ArrayBuffer) => ResultType
}

export default BaseLoader
