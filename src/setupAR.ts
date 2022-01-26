declare const THREEx: any
declare const ARjs: any

type OnRenderFunction = (deltaSec: number, nowSec: number) => void
export interface Setup {
	scene: THREE.Scene
	camera: THREE.Camera
	arToolkitContext: any
	arToolkitSource: any
	onRenderFunctions: OnRenderFunction[]
}

export const createMarker = (num: number, setup: Setup) => {
	const marker = new THREE.Group()
	new THREEx.ArMarkerControls(setup.arToolkitContext, marker, {
		type : 'barcode',
		barcodeValue: num,
		minConfidence: 1,
		// as we controls the camera, set changeMatrixMode: 'cameraTransformMatrix'
		//changeMatrixMode: 'cameraTransformMatrix'
	})
	return marker
}

const createRenderer = () => {
	const renderer	= new THREE.WebGLRenderer({
		antialias: true,
		alpha: true
	});
	renderer.setClearColor(new THREE.Color('lightgrey'), 0)
	renderer.setSize( 2000, 1700 );
	renderer.domElement.style.position = 'absolute'
	renderer.domElement.style.top = '0px'
	renderer.domElement.style.left = '0px'
	return renderer
}

const setupAR = (): Setup => {
	const renderer = createRenderer()
	document.body.appendChild( renderer.domElement );
	const scene	= new THREE.Scene();
	const camera = new THREE.Camera();
	scene.add(camera);
	
	
	// Following two lines of code needed to fix bug in AR.js.
	// Search for "Object.assign(THREEx.ArBaseControls.prototype, THREE.EventDispatcher.prototype);" 
	// and  "Object.assign(ARjs.Context.prototype, THREE.EventDispatcher.prototype);" in ar.js
	// You will see that they are not working correctly.
	THREEx.ArBaseControls.prototype.dispatchEvent = THREE.EventDispatcher.prototype.dispatchEvent
	ARjs.Context.prototype.dispatchEvent = THREE.EventDispatcher.prototype.dispatchEvent
	const arToolkitSource = new THREEx.ArToolkitSource({
		sourceType : 'webcam',
	})
	const arToolkitContext = new THREEx.ArToolkitContext({
		detectionMode: 'mono_and_matrix',
		matrixCodeType: '3x3_HAMMING63',
	})
	const onResize = () => {
		arToolkitSource.onResizeElement()
		arToolkitSource.copyElementSizeTo(renderer.domElement)
		if( arToolkitContext.arController !== null ){
			arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas)
		}
	}
	
	arToolkitSource.init(function onReady() {
		setTimeout(onResize, 2000);
	})
	arToolkitContext.init(function onCompleted() {
		// copy projection matrix to camera
		camera.projectionMatrix.copy( arToolkitContext.getProjectionMatrix() );
	})
	
	window.addEventListener('resize', onResize)

	const internalOnRenderFunctions: OnRenderFunction[] = [
		() => {
			if( arToolkitSource.ready === false )	return
			arToolkitContext.update( arToolkitSource.domElement )
		},
		() => {
			renderer.render( scene, camera );
		}
	]
	const externalOnRenderFunctions: OnRenderFunction[] = []

	let lastTimeMsec: number | null = null
	const animate = (nowMsec: number) => {
		requestAnimationFrame(animate);
		lastTimeMsec	= lastTimeMsec || nowMsec-1000/60
		const deltaMsec	= Math.min(200, nowMsec - lastTimeMsec)
		lastTimeMsec	= nowMsec

		const deltaSec = deltaMsec / 1000
		const nowSec = nowMsec / 1000
		internalOnRenderFunctions.forEach(f => f(deltaSec, nowSec))
		externalOnRenderFunctions.forEach(f => f(deltaSec, nowSec))
	}
	requestAnimationFrame(animate)

	return { scene, camera, arToolkitContext, arToolkitSource, onRenderFunctions: externalOnRenderFunctions }
}

export default setupAR