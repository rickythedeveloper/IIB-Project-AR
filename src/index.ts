import { Object3D, Quaternion, Vector3 } from 'three'
import setupAR from './utils/setupAR'
import visualise from './visualise'
import createControlPanel from './components/ControlPanel'
import scan from './scan'
import calibrate from './calibrate'
import { MarkerInfo } from './utils'

const MODES = {
	SCAN: 'scan',
	SHOW: 'show'
}

const mode = MODES.SCAN

// Add a 'control panel' div to put controls on
const { controlPanelWrapper, controlPanel } = createControlPanel()
document.body.appendChild(controlPanelWrapper)

const arSetup = setupAR()
const markerNumbers = [0, 1, 2, 3, 4, 5, 6, 7]
let markers: Object3D[] = []
let recordValueInterval: NodeJS.Timer, setValueInterval: NodeJS.Timer

let markerInfos: MarkerInfo[] = []

const onScanComplete = (pos: Vector3[], quats: Quaternion[]) => {
	console.log('scan completed')
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
	calibrate(arSetup, markerInfos, onCalibrateComplete, controlPanel)
}

const onCalibrateComplete = (objects: Object3D[]) => {
	console.log('calibration complete!')
	arSetup.cleanup()
	visualise(markerInfos, objects.map(o => o.clone()))
}

switch (mode) {
case MODES.SHOW:
	// visualise(arSetup, markerNumbers, markerPositions, markerQuaternions)
	break
case MODES.SCAN: {
	const { recordValueInterval: rvInterval, setValueInterval: svInterval, markers: mks } = scan(arSetup, markerNumbers, undefined, onScanComplete)
	recordValueInterval = rvInterval
	setValueInterval = svInterval
	markers = mks
	break
}
default:
	throw Error('Mode not selected')
}