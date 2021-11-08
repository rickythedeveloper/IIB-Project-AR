import { createArrow, rotationQuaternion, createBufferObject } from "./utils/three.js";
import { createSlider, createControlPanel, createOption, createButton, createBarcodeMarkerElement } from "./utils/elements.js";
import { getProcessedData } from "./utils/convenience.js";

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
const markers = [], markerPositions = [], markerQuaternions = []
for (let i = 0; i < 8; i++) {
	const markerElement = createBarcodeMarkerElement(i)
	scneeElement.appendChild(markerElement)
	const marker = markerElement.object3D
	markers.push(marker)
	markerPositions.push(new THREE.Vector3(
		(110 / 2 / 40) * (i % 3),
		0,
		(110.5 / 2 / 40) * (i - i % 3) / 3
	))
	markerQuaternions.push(new THREE.Quaternion(0, 0, 0, 1))
}
const dominantMarker = markers[0]
let usedMarkerIndex = 0
const objectPositions = [], objectQuaternions = []

// Add indicators on markers
const markerIndicators = []
for (let i = 0; i < markers.length; i++) {
	const markerIndicatorGeometry = new THREE.PlaneGeometry(1, 1)
	const markerIndicatorMaterial = new THREE.MeshBasicMaterial({ opacity: 0.5, side: THREE.DoubleSide })
	const markerIndicator = new THREE.Mesh(markerIndicatorGeometry, markerIndicatorMaterial)
	markerIndicator.position.set(markerPositions[i].x, markerPositions[i].y, markerPositions[i].z)
	markerIndicator.quaternion.set(Math.sin(Math.PI / 4), 0, 0, Math.cos(Math.PI / 4))
	dominantMarker.add(markerIndicator)
	markerIndicators.push(markerIndicator)
	objectPositions.push(markerIndicator.position.clone())
	objectQuaternions.push(markerIndicator.quaternion.clone())
}

// Add arrows to indicate axes
const arrowLength = 1.3
const xArrow = createArrow('x', arrowLength, 0xff0000)
const yArrow = createArrow('y', arrowLength, 0x00ff00)
const zArrow = createArrow('z', arrowLength, 0x0000ff)
dominantMarker.add(xArrow, yArrow, zArrow)
objectPositions.push(xArrow.position.clone(), yArrow.position.clone(), zArrow.position.clone())
objectQuaternions.push(xArrow.quaternion.clone(), yArrow.quaternion.clone(), zArrow.quaternion.clone())

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

getProcessedData().then(({ vertices, indices, colors }) => {
	const bufferObject = createBufferObject(vertices, indices, colors)
	bufferObject.position.set(0, 1, 0)
	bufferObject.quaternion.set(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4))
	dominantMarker.add(bufferObject)
	objectPositions.push(bufferObject.position.clone())
	objectQuaternions.push(bufferObject.quaternion.clone())
})

const usedMarkerColor = 0x00ff00, unusedMarkerColor = 0xff0000

setInterval(() => {
	const children = [...markers[usedMarkerIndex].children]

	for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
		const thisMarker = markers[markerIndex]
		if (!thisMarker.visible) continue
		if (markerIndex === usedMarkerIndex) break

		for (let childIndex = 0; childIndex < children.length; childIndex++) {
			const child = children[childIndex]

			const p030 = objectPositions[childIndex].clone()
			const p230 = p030.clone().sub(markerPositions[markerIndex])
			const p232 = p230.clone().applyQuaternion(markerQuaternions[markerIndex].clone().invert())
			const newChildPosition = p232

			const q232 = markerQuaternions[markerIndex].clone().invert().multiply(objectQuaternions[childIndex])

			thisMarker.add(child) // the child will be removed from the current parent automatically
			child.position.set(newChildPosition.x, newChildPosition.y, newChildPosition.z)
			child.quaternion.set(q232.x, q232.y, q232.z, q232.w)
		}

		usedMarkerIndex = markerIndex
		break
	}


	for (let i = 0; i < markers.length; i++) {
		markerIndicators[i].material.color.set(usedMarkerIndex === i ? usedMarkerColor : unusedMarkerColor)
	}
}, 100);