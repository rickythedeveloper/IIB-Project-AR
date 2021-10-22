import { convertRowsToVertices, createSlider, createArrow, rotationQuaternion } from "./utils.js";

const getVertices = (y) => {
	return convertRowsToVertices([
		[
			[-0.5, y, -0.5],
			[0.0, y, -0.5],
			[0.5, y, -0.5]
		],
		[
			[-0.5, y, 0.0],
			[0.0, y, 0.0],
			[0.5, y, 0.0]
		],
		[
			[-0.5, y, 0.5],
			[0.0, y, 0.5],
			[0.5, y, 0.5]
		]
	])
}

const getColors = (time) => {
	const halfAmplitudeValue = 1 / 2 + Math.sin(time * 2) / 4
	const fullAmplitudeValue = 1 / 2 + Math.sin(time * 2) / 2
	return convertRowsToVertices([
		[
			[0.0, 0.0, 0.0],
			[0.0, 0.0, halfAmplitudeValue],
			[0.0, 0.0, fullAmplitudeValue]
		],
		[
			[0.0, fullAmplitudeValue, 0.0],
			[halfAmplitudeValue, halfAmplitudeValue, 0.0],
			[fullAmplitudeValue, 0.0, 0.0]
		],
		[
			[0.0, 0.0, 0.0],
			[0.0, 0.0, halfAmplitudeValue],
			[0.0, 0.0, fullAmplitudeValue]
		],
	])
}

const createPlane = (nVertices) => {
	const vertexShader = `
	attribute vec3 color;	
	varying vec3 v_color;
	void main() {
		v_color = color;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
	`
	const fragmentShader = `
	varying vec3 v_color;
	void main() {
		gl_FragColor = vec4(v_color, 0.5);
	}
	`

	const planeGeometry = new THREE.BufferGeometry()
	const planeVertices = new Float32Array(nVertices * 3)
	const colors = new Float32Array(nVertices * 3)
	planeGeometry.setAttribute('position', new THREE.BufferAttribute(planeVertices, 3))
	planeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

	const planeMaterial = new THREE.ShaderMaterial({
		vertexShader,
		fragmentShader,
		side: THREE.DoubleSide
	})
	const plane = new THREE.Mesh(planeGeometry, planeMaterial)

	return plane
}

const updatePlaneVertices = (plane, newVertices) => {
	plane.geometry.attributes.position.array = newVertices
	plane.geometry.attributes.position.needsUpdate = true;
}

const updatePlaneColors = (plane, newColors) => {
	plane.geometry.attributes.color.array = newColors
	plane.geometry.attributes.color.needsUpdate = true;
}


const controlPanelWrapper = document.createElement('div')
controlPanelWrapper.style.position = 'absolute'
controlPanelWrapper.style.top = 0
controlPanelWrapper.style.left = 0
controlPanelWrapper.style.width = '100%'
controlPanelWrapper.style.height = '100%'
controlPanelWrapper.style.zIndex = 1000
controlPanelWrapper.style.display = 'flex'
controlPanelWrapper.style.flexDirection = 'column'
document.body.appendChild(controlPanelWrapper)

const controlPanel = document.createElement('div')
controlPanel.style.margin = '20px'
controlPanel.style.flexGrow = 1;
controlPanelWrapper.appendChild(controlPanel)

const minY = 0, maxY = 5, initialY = 0.0, stepY = 0.1
const testSlider = createSlider(minY, maxY, initialY, stepY)
controlPanel.appendChild(testSlider)
testSlider.oninput = (e) => {
	const y = e.target.value
	const positionArray = plane.geometry.attributes.position.array
	for (let i = 1; i < positionArray.length; i += 3) {
		positionArray[i] = y
	}
	plane.geometry.attributes.position.needsUpdate = true;
}


const marker = document.getElementById('marker').object3D

const initialVertices = getVertices(initialY)
const plane = createPlane(initialVertices.length / 3)
marker.add(plane)

const arrowLength = 1.3
const xArrow = createArrow('x', arrowLength, 0xff0000)
const yArrow = createArrow('y', arrowLength, 0x00ff00)
const zArrow = createArrow('z', arrowLength, 0x0000ff)
marker.add(xArrow, yArrow, zArrow)

let time = 0
const updateInterval = 10
setInterval(() => {
	time += updateInterval
	updatePlaneColors(plane, getColors(time / 300))
}, updateInterval);

updatePlaneVertices(plane, initialVertices)
updatePlaneColors(plane, getColors(time))

const optionDropdown = document.createElement('select')
controlPanel.appendChild(optionDropdown)

const xOption = document.createElement('option'), yOption = document.createElement('option'), zOption = document.createElement('option'), scaleOption = document.createElement('option')
xOption.value = 'x'; xOption.innerText = 'x';
yOption.value = 'y'; yOption.innerText = 'y';
zOption.value = 'z'; zOption.innerText = 'z';
scaleOption.value = 'scale'; scaleOption.innerText = 'scale'
optionDropdown.appendChild(xOption)
optionDropdown.appendChild(yOption)
optionDropdown.appendChild(zOption)
optionDropdown.appendChild(scaleOption)
let selectedOption = 'x'
optionDropdown.onchange = (e) => {
	selectedOption = e.target.value
}

const rotationInterval = 10
const angleChange = rotationInterval / 1000
const scaleChange = 0.005
let rotationIntervalObject

const plusButton = document.createElement('button')
plusButton.innerText = '+'
controlPanel.appendChild(plusButton)
plusButton.onclick = () => {
	rotationIntervalObject = createChangeInterval(1, selectedOption, rotationIntervalObject, rotationInterval, scaleChange, angleChange, plane)
}

const minusButton = document.createElement('button')
minusButton.innerText = '-'
controlPanel.appendChild(minusButton)
minusButton.onclick = () => {
	rotationIntervalObject = createChangeInterval(-1, selectedOption, rotationIntervalObject, rotationInterval, scaleChange, angleChange, plane)
}

const createChangeInterval = (direction, option, intervalObject, interval, scaleChange, angleChange, plane) => {
	if (intervalObject !== undefined) {
		clearInterval(intervalObject)
		return undefined
	}

	return setInterval(() => {
		if (option === 'scale') {
			plane.scale.addScalar(direction * scaleChange)
		} else {
			plane.applyQuaternion(rotationQuaternion(selectedOption, direction * angleChange))
		}
	}, interval)
}