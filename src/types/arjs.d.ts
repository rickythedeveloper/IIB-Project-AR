
declare module '@ar-js-org/ar.js/three.js/build/ar-threex.js' {
	class ArToolkitSource {
		ready: boolean
		domElement: HTMLVideoElement | null
		constructor(parameters: Partial<ArToolkitSourceParameters>)
		init(onReady: () => void, onError?: (error: {name: string, message: string}) => void): ArToolkitSource
		onResizeElement()
		copyElementSizeTo(otherElement: HTMLElement)
	}

	class ArToolkitContext {
		parameters: ARToolkitContextParameters
		baseURL: string
		REVISION: string
		arController: ARController
		constructor(parameters: Partial<ARToolkitContextParameters>)
		createDefaultCamera(trackingBackend: string): THREE.Camera
		init(onCompleted: () => void)
		update(srcElement: HTMLElement)
		addMarker(ArMarkerControls: ArMarkerControls)
		removeMarker(ArMarkerControls: ArMarkerControls)
		getProjectionMatrix(srcElement?: HTMLElement): THREE.Matrix4
	}

	class ARController {
		canvas: HTMLCanvasElement
	}

	class ArMarkerControls {
		constructor(context: ArToolkitContext, object3d: THREE.Object3D, parameters: Partial<ARMarkerControlsParameters>)
	}
}

interface ARToolkitSourceParameters {
	// type of source - ['webcam', 'image', 'video']
	sourceType: 'webcam' | 'image' | 'video',
	// url of the source - valid if sourceType = image|video
	sourceUrl: null | string,

	// Device id of the camera to use (optional)
	deviceId: null | number,

	// resolution of at which we initialize in the source image
	sourceWidth: number,
	sourceHeight: number,
	// resolution displayed for the source
	displayWidth: number,
	displayHeight: number,
}

interface ARToolkitContextParameters {
	// AR backend - ['artoolkit']
	trackingBackend: 'artoolkit',
	// debug - true if one should display artoolkit debug canvas, false otherwise
	debug: boolean,
	// the mode of detection - ['color', 'color_and_matrix', 'mono', 'mono_and_matrix']
	detectionMode: 'color' | 'color_and_matrix' | 'mono' | 'mono_and_matrix',
	// type of matrix code - valid iif detectionMode end with 'matrix' - [3x3, 3x3_HAMMING63, 3x3_PARITY65, 4x4, 4x4_BCH_13_9_3, 4x4_BCH_13_5_5]
	matrixCodeType: '3x3' | '3x3_HAMMING63' | '3x3_PARITY65' | '4x4' | '4x4_BCH_13_9_3' | '4x4_BCH_13_5_5',
	// url of the camera parameters
	cameraParametersUrl: string,
	// tune the maximum rate of pose detection in the source image
	maxDetectionRate: number,
	// resolution of at which we detect pose in the source image
	canvasWidth: number,
	canvasHeight: number,
	// the patternRatio inside the artoolkit marker - artoolkit only
	patternRatio: number,
	// enable image smoothing or not for canvas copy - default to true
	// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled
	imageSmoothingEnabled: boolean,
}

interface ARMarkerControlsParameters {
	// size of the marker in meter
	size : number,
	// type of marker - ['pattern', 'barcode', 'unknown' ]
	type : 'unknown' | 'pattern' | 'barcode',
	// url of the pattern - IIF type='pattern'
	patternUrl : null | string,
	// value of the barcode - IIF type='barcode'
	barcodeValue : null | number,
	// change matrix mode - [modelViewMatrix, cameraTransformMatrix]
	changeMatrixMode : 'modelViewMatrix' | 'cameraTransformMatrix',
	// minimal confidence in the marke recognition - between [0, 1] - default to 1
	minConfidence: number,
	// turn on/off camera smoothing
	smooth: boolean,
	// number of matrices to smooth tracking over, more = smoother but slower follow
	smoothCount: number,
	// distance tolerance for smoothing, if smoothThreshold # of matrices are under tolerance, tracking will stay still
	smoothTolerance: number,
	// threshold for smoothing, will keep still unless enough matrices are over tolerance
	smoothThreshold: number,
}