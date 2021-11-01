import { createArrow, rotationQuaternion, createPlane } from "./utils/three.js";
import { createSlider, createControlPanel, createOption, createButton, createBarcodeMarkerElement } from "./utils/elements.js";
import { getVertices, getColors } from "./utils/convenience.js";

const updatePlaneVertices = (plane, newVertices) => {
	plane.geometry.attributes.position.array = newVertices
	plane.geometry.attributes.position.needsUpdate = true;
}

const updatePlaneColors = (plane, newColors) => {
	plane.geometry.attributes.color.array = newColors
	plane.geometry.attributes.color.needsUpdate = true;
}

// Add a 'control panel' div to put controls on
const { controlPanelWrapper, controlPanel } = createControlPanel()
document.body.appendChild(controlPanelWrapper)

// Slider to control y value of the plane
const initialY = 0.0
const planeYSlider = createSlider(0, 5, initialY, 0.1)
controlPanel.appendChild(planeYSlider)
planeYSlider.oninput = (e) => {
	const newY = e.target.value
	const positionArray = plane.geometry.attributes.position.array
	for (let i = 1; i < positionArray.length; i += 3) {
		positionArray[i] = newY
	}
	plane.geometry.attributes.position.needsUpdate = true;
}

const scneeElement = document.getElementById('scene')

// Create markers
const marker0Element = createBarcodeMarkerElement(0)
scneeElement.appendChild(marker0Element)
const marker0 = marker0Element.object3D

const marker3Element = createBarcodeMarkerElement(5)
scneeElement.appendChild(marker3Element)
const marker3 = marker3Element.object3D

const markers = [marker0, marker3]
const dominantMarker = marker0

// Add a cube
const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
const boxMaterial = new THREE.MeshPhysicalMaterial({ color: 0xff0000, opacity: 0.3 })
const box = new THREE.Mesh(boxGeometry, boxMaterial)
box.position.set(0, 0.5, 0)
marker0.add(box)

const boxGeometry2 = new THREE.BoxGeometry(1, 1, 1)
const boxMaterial2 = new THREE.MeshPhysicalMaterial({ color: 0x00ff00, opacity: 0.3 })
const box2 = new THREE.Mesh(boxGeometry2, boxMaterial2)
marker0.add(box2)

// Add a plane
const initialVertices = getVertices(initialY)
const plane = createPlane(initialVertices.length / 3)
marker0.add(plane)
plane.translateX(1)
updatePlaneVertices(plane, initialVertices)
updatePlaneColors(plane, getColors(0))

// Add arrows to indicate axes
const arrowLength = 1.3
const xArrow = createArrow('x', arrowLength, 0xff0000)
const yArrow = createArrow('y', arrowLength, 0x00ff00)
const zArrow = createArrow('z', arrowLength, 0x0000ff)
marker0.add(xArrow, yArrow, zArrow)

// Main update loop
let time = 0
const updateInterval = 10
setInterval(() => {
	time += updateInterval
	updatePlaneColors(plane, getColors(time / 300))

	xArrow.position.set(box.position.x, box.position.y, box.position.z)
	yArrow.position.set(box.position.x, box.position.y, box.position.z)
	zArrow.position.set(box.position.x, box.position.y, box.position.z)

	for (let i = 0; i < markers.length; i++) {
		const marker = markers[i]
		if (marker.id === dominantMarker.id) continue
		if (!marker.visible) continue
		const relativePosition = marker.position.clone()
		relativePosition.sub(dominantMarker.position) // relative position in the camera frame
		relativePosition.applyQuaternion(dominantMarker.quaternion.clone().invert())

		const relativeQuaternionCameraFrame = marker.quaternion.clone().multiply(dominantMarker.quaternion.clone().invert())
		const relativeQuaternion = dominantMarker.quaternion.clone().invert().multiply(relativeQuaternionCameraFrame).multiply(dominantMarker.quaternion.clone())

		box2.position.set(relativePosition.x, relativePosition.y, relativePosition.z)
		box2.quaternion.set(relativeQuaternion.x, relativeQuaternion.y, relativeQuaternion.z, relativeQuaternion.w)
		box2.translateY(0.5)
	}

}, updateInterval);

// Add rotation / scale control
const optionDropdown = document.createElement('select')
controlPanel.appendChild(optionDropdown)

optionDropdown.appendChild(createOption('rotx', 'Rotate about X'))
optionDropdown.appendChild(createOption('roty', 'Rotate about Y'))
optionDropdown.appendChild(createOption('rotz', 'Rotate about Z'))
optionDropdown.appendChild(createOption('transx', 'Translate along X'))
optionDropdown.appendChild(createOption('transy', 'Translate along Y'))
optionDropdown.appendChild(createOption('transz', 'Translate along Z'))
optionDropdown.appendChild(createOption('scale', 'Scale'))
let selectedOption = 'rotx'
optionDropdown.onchange = (e) => { selectedOption = e.target.value }

const changeInterval = 10
const angleChange = changeInterval / 1000
const scaleChange = 0.005
const positionChange = changeInterval / 1000
let changeIntervalObject

const plusButton = createButton('+', () => { changeIntervalObject = createChangeInterval(1, selectedOption, changeIntervalObject, changeInterval, scaleChange, angleChange, positionChange, box) })
controlPanel.appendChild(plusButton)
const minusButton = createButton('-', () => { changeIntervalObject = createChangeInterval(-1, selectedOption, changeIntervalObject, changeInterval, scaleChange, angleChange, positionChange, box) })
controlPanel.appendChild(minusButton)

const createChangeInterval = (direction, option, intervalObject, interval, scaleChange, angleChange, positionChange, object) => {
	if (intervalObject !== undefined) {
		clearInterval(intervalObject)
		return undefined
	}

	return setInterval(() => {
		if (option === 'scale') {
			object.scale.addScalar(direction * scaleChange)
		} else if (option.includes('rot')) {
			const axis = option.slice(3)
			object.applyQuaternion(rotationQuaternion(axis, direction * angleChange))
		} else if (option.includes('trans')) {
			const axis = option.slice(5)
			const axisVector = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0)
			object.position.addScaledVector(axisVector, direction * positionChange)
		} else throw new Exception('invalid change type')
	}, interval)
}

const requestDeviceMotion = () => {
	DeviceMotionEvent.requestPermission().then(response => {
		if (response == 'granted') {
			window.addEventListener('devicemotion', (event) => {
				console.log(event.acceleration.x, event.acceleration.y, event.acceleration.z);
			});
			window.addEventListener('deviceorientation', (event) => {
				console.log(event.alpha, event.beta, event.gamma);
			});
		}
	});
}

const deviceMotionButton = document.createElement("button")
deviceMotionButton.innerText = 'request motion'
deviceMotionButton.onclick = requestDeviceMotion
controlPanel.appendChild(deviceMotionButton)
