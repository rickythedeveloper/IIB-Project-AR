import { createArrow, rotationQuaternion, createPlane } from "./utils/three.js";
import { createSlider, createControlPanel, createOption, createButton } from "./utils/elements.js";
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

// Get the marker
const marker = document.getElementById('marker').object3D

// Add a plane
const initialVertices = getVertices(initialY)
const plane = createPlane(initialVertices.length / 3)
marker.add(plane)
updatePlaneVertices(plane, initialVertices)
updatePlaneColors(plane, getColors(0))

// Update the plane color
let time = 0
const updateInterval = 10
setInterval(() => {
	time += updateInterval
	updatePlaneColors(plane, getColors(time / 300))
}, updateInterval);

// Add arrows to indicate axes
const arrowLength = 1.3
const xArrow = createArrow('x', arrowLength, 0xff0000)
const yArrow = createArrow('y', arrowLength, 0x00ff00)
const zArrow = createArrow('z', arrowLength, 0x0000ff)
marker.add(xArrow, yArrow, zArrow)

// Add rotation / scale control
const optionDropdown = document.createElement('select')
controlPanel.appendChild(optionDropdown)

optionDropdown.appendChild(createOption('x', 'X'))
optionDropdown.appendChild(createOption('y', 'Y'))
optionDropdown.appendChild(createOption('z', 'Z'))
optionDropdown.appendChild(createOption('scale', 'Scale'))
let selectedOption = 'x'
optionDropdown.onchange = (e) => { selectedOption = e.target.value }

const changeInterval = 10
const angleChange = changeInterval / 1000
const scaleChange = 0.005
let changeIntervalObject

const plusButton = createButton('+', () => { changeIntervalObject = createChangeInterval(1, selectedOption, changeIntervalObject, changeInterval, scaleChange, angleChange, plane) })
controlPanel.appendChild(plusButton)
const minusButton = createButton('-', () => { changeIntervalObject = createChangeInterval(-1, selectedOption, changeIntervalObject, changeInterval, scaleChange, angleChange, plane) })
controlPanel.appendChild(minusButton)

const createChangeInterval = (direction, option, intervalObject, interval, scaleChange, angleChange, plane) => {
	if (intervalObject !== undefined) {
		clearInterval(intervalObject)
		return undefined
	}

	return setInterval(() => {
		if (option === 'scale') {
			plane.scale.addScalar(direction * scaleChange)
		} else {
			plane.applyQuaternion(rotationQuaternion(option, direction * angleChange))
		}
	}, interval)
}