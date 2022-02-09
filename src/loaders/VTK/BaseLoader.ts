import { FileLoader, Loader, LoadingManager } from 'three';

abstract class BaseLoader<ResultType> extends Loader {
	constructor( manager?: LoadingManager ) { super(manager) }

	load = (
		url: string, 
		onLoad: (result: ResultType) => void, 
		onProgress?: (request: ProgressEvent<EventTarget>) => void, 
		onError?: (message: string) => void
	) => {
		const scope = this;
		const loader = new FileLoader(scope.manager);
		loader.setPath(scope.path);
		loader.setResponseType( 'arraybuffer' );
		loader.setRequestHeader( scope.requestHeader );
		loader.setWithCredentials( scope.withCredentials );
		loader.load( url, 
			( buffer ) => {
				try {
					if (buffer instanceof ArrayBuffer) onLoad(scope.parse(buffer));
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

	abstract parse: (data: ArrayBuffer) => ResultType
}

export default BaseLoader
