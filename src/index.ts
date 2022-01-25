// import visualise from "./utils/visualise.js";
// import { createControlPanel } from "./utils/elements.js";
// import scan from "./utils/scan.js";

// const MODES = {
// 	SCAN: 'scan',
// 	SHOW: 'show'
// };

// let mode = MODES.SCAN

// // Add a 'control panel' div to put controls on
// const { controlPanelWrapper, controlPanel } = createControlPanel()
// document.body.appendChild(controlPanelWrapper)

// const markerNumbers = [0, 1, 2, 3, 4, 5]
// let markers: THREE.Object3D[] = [], markerPositions: THREE.Vector3[] = [], markerQuaternions: THREE.Quaternion[] = []
// let recordValueInterval: number, setValueInterval: number

// const onScanComplete = (pos: THREE.Vector3[], quats: THREE.Quaternion[]) => {
// 	console.log('completed');
// 	markerPositions = pos
// 	markerQuaternions = quats
// 	clearInterval(recordValueInterval)
// 	clearInterval(setValueInterval)
// 	markers.forEach(marker => {
// 		marker.clear()
// 		if (marker.parent !== null) marker.parent.remove(marker)
// 	})
// 	visualise(controlPanel, markerNumbers, markerPositions, markerQuaternions)
// }

// switch (mode) {
// 	case MODES.SHOW:
// 		visualise(controlPanel, markerNumbers, markerPositions, markerQuaternions)
// 		break
// 	case MODES.SCAN:
// 		const { recordValueInterval: rvInterval, setValueInterval: svInterval, markers: mks } = scan(markerNumbers, undefined, onScanComplete)
// 		recordValueInterval = rvInterval
// 		setValueInterval = svInterval
// 		markers = mks
// 		break
// 	default:
// 		throw Error('Mode not selected')
// }

declare const THREEx: any

const renderer	= new THREE.WebGLRenderer({
	antialias: true,
	alpha: true
});
renderer.setClearColor(new THREE.Color('lightgrey'), 0)
renderer.setSize( 640, 480 );
renderer.domElement.style.position = 'absolute'
renderer.domElement.style.top = '0px'
renderer.domElement.style.left = '0px'
document.body.appendChild( renderer.domElement );

const onRenderFunctions: ((deltaSec: number, nowSec: number) => void)[] = [];

const scene	= new THREE.Scene();
const camera = new THREE.Camera();
scene.add(camera);

const arToolkitSource = new THREEx.ArToolkitSource({
	// to read from the webcam
	sourceType : 'webcam',

	// // to read from an image
	// sourceType : 'image',
	// sourceUrl : THREEx.ArToolkitContext.baseURL + '../data/images/img.jpg',

	// to read from a video
	// sourceType : 'video',
	// sourceUrl : THREEx.ArToolkitContext.baseURL + '../data/videos/headtracking.mp4',
})

arToolkitSource.init(function onReady(){
			setTimeout(() => {
					onResize()
			}, 2000);
})

// handle resize
window.addEventListener('resize', function(){
	onResize()
})

function onResize(){
	arToolkitSource.onResizeElement()
	console.log(arToolkitSource.domElement.style.width, arToolkitSource.domElement.style.height);
	arToolkitSource.copyElementSizeTo(renderer.domElement)
	if( arToolkitContext.arController !== null ){
		arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas)
	}
}

const arToolkitContext = new THREEx.ArToolkitContext({
	detectionMode: 'mono_and_matrix',
	matrixCodeType: '3x3_HAMMING63',
	// cameraParametersUrl: './src/data/camera_para.dat',
})
arToolkitContext.init(function onCompleted(){
	// copy projection matrix to camera
	camera.projectionMatrix.copy( arToolkitContext.getProjectionMatrix() );
})

onRenderFunctions.push(function(){
	if( arToolkitSource.ready === false )	return
	arToolkitContext.update( arToolkitSource.domElement )
})

const createMarker = (num: number) => {
	const marker = new THREE.Group()
	new THREEx.ArMarkerControls(arToolkitContext, marker, {
		type : 'barcode',
		barcodeValue: num,
		minConfidence: 1,
		// as we controls the camera, set changeMatrixMode: 'cameraTransformMatrix'
		//changeMatrixMode: 'cameraTransformMatrix'
	})
	return marker
}

const marker1 = createMarker(0), marker2 = createMarker(1)
camera.add(marker1)
camera.add(marker2)

// add a torus knot
const geometry1	= new THREE.BoxGeometry(1,1,1);
const material1	= new THREE.MeshNormalMaterial({
	transparent : true,
	opacity: 0.5,
	side: THREE.DoubleSide
});
const mesh1	= new THREE.Mesh( geometry1, material1 );
mesh1.position.y	= geometry1.parameters.height/2
marker1.add(mesh1)

const geometry2	= new THREE.TorusKnotGeometry(0.3,0.1,64,16);
const material2	= new THREE.MeshNormalMaterial();
var mesh2	= new THREE.Mesh( geometry2, material2 );
mesh2.position.y	= 0.5
marker2.add(mesh2)

marker1.add(new THREE.AxesHelper(1.5))
marker2.add(new THREE.AxesHelper(1.5))

onRenderFunctions.push(function(delta){
	mesh1.rotation.x += Math.PI*delta
})

// render the scene
onRenderFunctions.push(() => {
	renderer.render( scene, camera );
})

// run the rendering loop
let lastTimeMsec: number | null = null
requestAnimationFrame(function animate(nowMsec){
	requestAnimationFrame( animate );
	lastTimeMsec	= lastTimeMsec || nowMsec-1000/60
	const deltaMsec	= Math.min(200, nowMsec - lastTimeMsec)
	lastTimeMsec	= nowMsec
	onRenderFunctions.forEach(onRenderFct => {
		onRenderFct(deltaMsec/1000, nowMsec/1000)
	})
})