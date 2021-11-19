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
let markers, markerPositions, markerQuaternions
let recordValueInterval, setValueInterval

const onScanUpdate = (pos, quats) => {
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
		marker.parent.remove(marker)
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
