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

import setupAR, { createMarker } from "./setupAR.js";

const arSetup = setupAR() 
const camera = arSetup.camera
const marker1 = createMarker(0, arSetup), marker2 = createMarker(1, arSetup)
camera.add(marker1)
camera.add(marker2)

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

arSetup.onRenderFunctions.push((deltaSec) => {
	mesh1.rotation.x += Math.PI*deltaSec
})