import { scan, show } from "./utils/index.js";
import { createControlPanel } from "./utils/elements.js";

const MODES = {
	SCAN: 'scan',
	SHOW: 'show'
};

let mode = MODES.SCAN

// Add a 'control panel' div to put controls on
const { controlPanelWrapper, controlPanel } = createControlPanel()
document.body.appendChild(controlPanelWrapper)

const markerNumbers = [0, 1, 2, 3, 4, 5]
let markers: THREE.Object3D[] = [], markerPositions: THREE.Vector3[] = [], markerQuaternions: THREE.Quaternion[] = []
let recordValueInterval: number, setValueInterval: number

const onScanUpdate = (pos: THREE.Vector3[], quats: THREE.Quaternion[]) => {
	console.log('updated');
	markerPositions = pos
	markerQuaternions = quats
}

const onScanComplete = () => {
	console.log('completed');
	clearInterval(recordValueInterval)
	clearInterval(setValueInterval)
	markers.forEach(marker => {
		marker.clear()
		if (marker.parent !== null) marker.parent.remove(marker)
	})
	show(controlPanel, markerNumbers, markerPositions, markerQuaternions)
}


switch (mode) {
	case MODES.SHOW:
		show(controlPanel, markerNumbers, markerPositions, markerQuaternions)
		break
	case MODES.SCAN:
		const { recordValueInterval: rvInterval, setValueInterval: svInterval, markers: mks } = scan(markerNumbers, onScanUpdate, onScanComplete)
		recordValueInterval = rvInterval
		setValueInterval = svInterval
		markers = mks
		break
	default:
		throw Error('Mode not selected')
}