import setupAR from "./setupAR.js";
import visualise from "./utils/visualise.js";
import { createControlPanel } from "./utils/elements.js";
import scan from "./utils/scan.js";
import calibrate from "./utils/calibrate.js";
import { MarkerInfo } from "./utils/index.js";

const MODES = {
	SCAN: 'scan',
	SHOW: 'show'
};

let mode = MODES.SCAN

// Add a 'control panel' div to put controls on
const { controlPanelWrapper, controlPanel } = createControlPanel()
document.body.appendChild(controlPanelWrapper)

const arSetup = setupAR() 
const markerNumbers = [0, 1]
let markers: THREE.Object3D[] = []
let recordValueInterval: number, setValueInterval: number

let markerInfos: MarkerInfo[] = []

const onScanComplete = (pos: THREE.Vector3[], quats: THREE.Quaternion[]) => {
	console.log('scan completed');
	clearInterval(recordValueInterval)
	clearInterval(setValueInterval)
	markers.forEach(marker => {
		marker.clear()
		if (marker.parent !== null) marker.parent.remove(marker)
	})

	markerInfos = []
	for (let i = 0; i < markerNumbers.length; i++) {
		markerInfos.push({
			number: markerNumbers[i],
			position: pos[i],
			quaternion: quats[i]
		})
	}
	calibrate(arSetup, markerInfos, onCalibrateComplete)
}

const onCalibrateComplete = (objects: THREE.Object3D[]) => {
	console.log('calibration complete!');
	console.log(arSetup.scene)
	visualise(arSetup, markerInfos, objects)
}

switch (mode) {
	case MODES.SHOW:
		// visualise(arSetup, markerNumbers, markerPositions, markerQuaternions)
		break
	case MODES.SCAN:
		const { recordValueInterval: rvInterval, setValueInterval: svInterval, markers: mks } = scan(arSetup, markerNumbers, undefined, onScanComplete)
		recordValueInterval = rvInterval
		setValueInterval = svInterval
		markers = mks
		break
	default:
		throw Error('Mode not selected')
}