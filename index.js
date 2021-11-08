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

/**
 * @param {*} object
 * @param {*} position relative to the dominant marker
 * @param {*} quaternion relative to the dominant marker
 */
const addObject = (object, position, quaternion) => {
	// 0: dominant marker, 1: used marker, 2: object
	const p010 = markerPositions[usedMarkerIndex].clone()
	const q010 = markerQuaternions[usedMarkerIndex].clone()
	const p020 = position.clone()
	const q020 = quaternion.clone()
	const p121 = p020.clone().sub(p010).applyQuaternion(q010.clone().invert())
	const q121 = q010.clone().invert().multiply(q020)
	markers[usedMarkerIndex].add(object)
	object.position.set(p121.x, p121.y, p121.z)
	object.quaternion.set(q121.x, q121.y, q121.z, q121.w)
	objectPositions.push(position.clone())
	objectQuaternions.push(quaternion.clone())
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
	addObject(markerIndicator, markerIndicator.position.clone(), markerIndicator.quaternion.clone())
	markerIndicators.push(markerIndicator)
}

// Add arrows to indicate axes
const arrowLength = 1.3
const xArrow = createArrow('x', arrowLength, 0xff0000)
const yArrow = createArrow('y', arrowLength, 0x00ff00)
const zArrow = createArrow('z', arrowLength, 0x0000ff)
for (let arrow of [xArrow, yArrow, zArrow]) {
	addObject(arrow, arrow.position.clone(), arrow.quaternion.clone())
}

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
	addObject(bufferObject, bufferObject.position.clone(), bufferObject.quaternion.clone())
})

const usedMarkerColor = 0x00ff00, unusedMarkerColor = 0xff0000

setInterval(() => {
	// determine the distances to the markers / work out the weight
	let nearestMarkerIndex
	for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
		if (!markers[markerIndex].visible) continue
		if (nearestMarkerIndex === undefined || markers[markerIndex].position.length() < markers[nearestMarkerIndex].position.length()) nearestMarkerIndex = markerIndex
	}
	if (nearestMarkerIndex === undefined) return

	const children = [...markers[usedMarkerIndex].children]
	// on the cloeset marker, show the children based on averaging
	for (let childIndex = 0; childIndex < children.length; childIndex++) {
		const child = children[childIndex]

		const arr_p030 = [], arr_q030 = []
		const weights = []
		let weightSum = 0;
		for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
			if (!markers[markerIndex].visible) {
				arr_p030.push(null)
				arr_q030.push(null)
				weights.push(0)
				continue
			}

			// 0: camera, 1: dominant marker, 2: this marker, 3: object
			const p020 = markers[markerIndex].position
			const q020 = markers[markerIndex].quaternion
			const p121 = markerPositions[markerIndex].clone()
			const q121 = markerQuaternions[markerIndex].clone()
			const p131 = objectPositions[childIndex].clone()
			const q131 = objectQuaternions[childIndex].clone()

			const p232 = p131.clone().sub(p121).applyQuaternion(q121)
			const q232 = q121.clone().invert().multiply(q131)

			const p030 = p020.clone().add(p232.clone().applyQuaternion(q020))
			const q030 = q020.clone().multiply(q232)
			arr_p030.push(p030)
			arr_q030.push(q030)

			const d02 = p020.length()
			const d23 = p232.length()
			const weight = (1 / d02) * (d23 < 0.1 ? 10 : 1 / d23)
			weights.push(weight)
			weightSum += weight
		}

		// normalise the weights
		for (let w = 0; w < weights.length; w++) {
			weights[w] /= weightSum
		}

		let x = 0, y = 0, z = 0; // in world coordinates (camera frame)
		let qx = 0, qy = 0, qz = 0, qw = 0; // camera frame
		for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
			if (weights[markerIndex] === 0) continue

			const p030 = arr_p030[markerIndex]
			const q030 = arr_q030[markerIndex]

			x += weights[markerIndex] * p030.x
			y += weights[markerIndex] * p030.y
			z += weights[markerIndex] * p030.z
			qx += weights[markerIndex] * q030.x
			qy += weights[markerIndex] * q030.y
			qz += weights[markerIndex] * q030.z
			qw += weights[markerIndex] * q030.w
		}

		// 4: nearest marker
		const p030 = new THREE.Vector3(x, y, z)
		const q030 = new THREE.Quaternion(qx, qy, qz, qw).normalize()
		const p040 = markers[nearestMarkerIndex].position
		const q040 = markers[nearestMarkerIndex].quaternion

		const p434 = p030.clone().sub(p040).applyQuaternion(q040.clone().invert())
		const q434 = q040.clone().invert().multiply(q030)

		markers[nearestMarkerIndex].add(child)
		child.position.set(p434.x, p434.y, p434.z)
		child.quaternion.set(q434.x, q434.y, q434.z, q434.w)
	}
	usedMarkerIndex = nearestMarkerIndex

	for (let i = 0; i < markers.length; i++) {
		markerIndicators[i].material.color.set(usedMarkerIndex === i ? usedMarkerColor : unusedMarkerColor)
	}
}, 100);