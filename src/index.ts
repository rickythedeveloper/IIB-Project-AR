import { Object3D, Quaternion, Vector3 } from 'three'
import setupAR from './utils/setupAR'
import visualise from './visualise'
import createControlPanel from './components/ControlPanel'
import scan from './scan'
import calibrate from './calibrate'
import { MarkerInfo } from './utils'

const MODES = {
	SCAN: 'scan',
	SHOW: 'show',
	CALIBRATE: 'calibrate',
}

const markerPositions = [
	new Vector3(0, 0, 0),
	new Vector3(-0.0834095928138235, -6.004084559437905, -0.7826489454792789),
	new Vector3(0.0034489150043589913, -4.177484883583552, -3.280888436724168),
	new Vector3(-0.8655037848486917, -5.367702667140108, -0.8304452676330821),
	new Vector3(-0.029143233915884692, -0.863720009919855, -0.825747702814499),
	new Vector3(-0.011059523020318738, -4.335151257113853, 0.4236383057054192),
	new Vector3(0.8733392014377317, -2.7168394350452214, -0.7917744956573641),
	new Vector3(-0.1379325026744791, -0.8469574910831108, 1.2310193438911967),
]

const markerQuaternions = [
	new Quaternion(0, 0, 0, 1),
	new Quaternion(0.07968420796721976, 0.06893488640608265, 0.9926785412029068, -0.0590569409306531),
	new Quaternion(-0.027781003108349817, 0.7500890555020822, 0.1181549480744208, -0.650103094076485),
	new Quaternion(-0.5032091551364012,  0.5577647330367782, 0.43540187664934216, 0.4960889583306124),
	new Quaternion(0.9991412534791273, 0.019098567457730753, -0.036370869750123436, 0.005400013966686157),
	new Quaternion(-0.07000957358602286, 0.06652487740901364, 0.06508529719396279, 0.99319535056362),
	new Quaternion(0.009870547246155825, -0.024370920348313355, -0.6963111578280838, -0.717258253366632),
	new Quaternion(0.7330255270690529, 0.02215607321494445, 0.6797209439794856, -0.012732768766793634),
]

const mode = MODES.CALIBRATE

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
case MODES.CALIBRATE:
	onScanComplete(markerPositions, markerQuaternions)
	break
default:
	throw Error('Mode not selected')
}