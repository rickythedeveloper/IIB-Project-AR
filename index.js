import { createArrow, rotationQuaternion, createPlane, createBufferObject } from "./utils/three.js";
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
const markerPositions = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 0)]
const markerOrientations = [new THREE.Quaternion(0, 0, 0, 1), new THREE.Quaternion(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4))]
const dominantMarker = marker0
let usedMarkerIndex = 0
const objectPositions = []
const objectQuaternions = []

// Add a cube
const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
const boxMaterial = new THREE.MeshPhysicalMaterial({ color: 0xff0000, opacity: 0.3 })
const box = new THREE.Mesh(boxGeometry, boxMaterial)
box.position.set(0, 0.5, 0)
// marker0.add(box)

const boxGeometry2 = new THREE.BoxGeometry(1, 1, 1)
const boxMaterial2 = new THREE.MeshPhysicalMaterial({ color: 0x00ff00, opacity: 0.3 })
const box2 = new THREE.Mesh(boxGeometry2, boxMaterial2)
// marker0.add(box2)

// Add a plane
const initialVertices = getVertices(initialY)
const plane = createPlane(initialVertices.length / 3)
// marker0.add(plane)
plane.translateX(1)
updatePlaneVertices(plane, initialVertices)
updatePlaneColors(plane, getColors(0))

// Add arrows to indicate axes
const arrowLength = 1.3
const xArrow = createArrow('x', arrowLength, 0xff0000)
const yArrow = createArrow('y', arrowLength, 0x00ff00)
const zArrow = createArrow('z', arrowLength, 0x0000ff)
marker0.add(xArrow, yArrow, zArrow)
objectPositions.push(xArrow.position.clone(), yArrow.position.clone(), zArrow.position.clone())
objectQuaternions.push(xArrow.quaternion.clone(), yArrow.quaternion.clone(), zArrow.quaternion.clone())

// Main update loop
let time = 0
const updateInterval = 10
setInterval(() => {
	time += updateInterval
	updatePlaneColors(plane, getColors(time / 300))

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

const getData = new Promise(async (resolve, reject) => {
	let indices, vertices, data;
	const indicesResponse = await fetch('data/indices.bin')
	const indicesBlob = await indicesResponse.blob()
	const indicesReader = new FileReader()
	indicesReader.onload = () => {
		indices = new Uint32Array(indicesReader.result)
		if (indices && vertices && data) resolve({ indices, vertices, data })
	}
	indicesReader.onerror = reject
	indicesReader.readAsArrayBuffer(indicesBlob)

	const verticesResponse = await fetch('data/vertices.bin')
	const verticesBlob = await verticesResponse.blob()
	const verticesReader = new FileReader()
	verticesReader.onload = () => {
		vertices = new Float32Array(verticesReader.result)
		if (indices && vertices && data) resolve({ indices, vertices, data })
	}
	verticesReader.onerror = reject
	verticesReader.readAsArrayBuffer(verticesBlob);

	const dataResponse = await fetch('https://dl.dropboxusercontent.com/s/0mmd7dczala0ljd/values_sch_all.bin')
	const dataBlob = await dataResponse.blob()
	const dataReader = new FileReader()
	dataReader.onload = () => {
		data = new Float32Array(dataReader.result)
		if (indices && vertices && data) resolve({ indices, vertices, data })
	}
	dataReader.onerror = reject
	dataReader.readAsArrayBuffer(dataBlob)
})

getData.then(({ indices, vertices, data }) => {
	let minX, maxX, minY, maxY
	vertices.forEach((value, index) => {
		if (index % 2 === 0) {
			if (minX === undefined || minX > value) minX = value
			if (maxX === undefined || maxX < value) maxX = value
		} else {
			if (minY === undefined || minY > value) minY = value
			if (maxY === undefined || maxY < value) maxY = value
		}
	})
	const normalisationConstant = Math.max(maxX - minX, maxY - minY)

	const scale = 3
	const vertices3D = new Float32Array(vertices.length / 2 * 3)
	vertices.forEach((value, index) => {
		if (index % 2 === 0) {
			vertices3D[index * 3 / 2] = ((value - minX) / normalisationConstant - 0.5) * scale // x
			vertices3D[index * 3 / 2 + 1] = 0 // y
			vertices3D[index * 3 / 2 + 2] = (vertices[index + 1] - minY) / normalisationConstant * scale // z
		}
	})

	const minValue = 0, maxValue = 10
	const colors = new Float32Array(data.length * 3)
	data.forEach((datum, index) => {
		colors[index * 3] = (datum - minValue) / (maxValue - minValue) // red
		colors[index * 3 + 1] = 0.0 // green
		colors[index * 3 + 2] = 0.0 // blue
	})

	const colorsT0 = colors.slice(0, vertices.length / 2 * 3)
	const bufferObject = createBufferObject(vertices3D, indices, colorsT0)
	bufferObject.quaternion.set(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4))
	marker0.add(bufferObject)
	objectPositions.push(bufferObject.position.clone())
	objectQuaternions.push(bufferObject.quaternion.clone())
})

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
			const p232 = p230.clone().applyQuaternion(markerOrientations[markerIndex].clone().invert())
			const newChildPosition = p232

			const q232 = markerOrientations[markerIndex].clone().invert().multiply(objectQuaternions[childIndex])

			thisMarker.attach(child)
			child.position.set(newChildPosition.x, newChildPosition.y, newChildPosition.z)
			child.quaternion.set(q232.x, q232.y, q232.z, q232.w)
		}

		usedMarkerIndex = markerIndex
		break
	}
}, 100);