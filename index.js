import { rotationQuaternion, createBufferObject } from "./utils/three.js";
import { createSlider, createControlPanel, createOption, createButton, createBarcodeMarkerElement } from "./utils/elements.js";
import { getProcessedData } from "./utils/convenience.js";
// import { createMarkers, createMarkerIndicators } from "./utils/scene_init.js";

class Arena {
	constructor(scene) {
		this.scene = scene

		this.markers = []
		this.markerPositions = []
		this.markerQuaternions = []
		this.usedMarkerIndex = 0

		this.markerIndicators = []

		this.objectPositions = []
		this.objectQuaternions = []

		this._addMarkers()

		setInterval(this._mainLoop.bind(this), 100)
	}

	get objects() {
		return this.markers[this.usedMarkerIndex].children
	}

	/**
	 * @param {*} object
	 * @param {*} position relative to the dominant marker
	 * @param {*} quaternion relative to the dominant marker
	 */
	addObject(object) {
		// 0: dominant marker, 1: used marker, 2: object
		const p010 = this.markerPositions[this.usedMarkerIndex].clone()
		const q010 = this.markerQuaternions[this.usedMarkerIndex].clone()
		const p020 = object.position.clone()
		const q020 = object.quaternion.clone()
		const p121 = p020.clone().sub(p010).applyQuaternion(q010.clone().invert())
		const q121 = q010.clone().invert().multiply(q020)
		object.indexInProject = this.objectPositions.length
		this.objectPositions.push(object.position.clone())
		this.objectQuaternions.push(object.quaternion.clone())
		this.markers[this.usedMarkerIndex].add(object)
		object.position.set(p121.x, p121.y, p121.z)
		object.quaternion.set(q121.x, q121.y, q121.z, q121.w)
	}

	addObjects(...objects) {
		objects.forEach(object => this.addObject(object))
	}

	_addMarkers() {
		for (let i = 0; i < 6; i++) {
			const markerElement = createBarcodeMarkerElement(i)
			this.scene.appendChild(markerElement)
			const marker = markerElement.object3D
			this.markers.push(marker)
			this.markerPositions.push(new THREE.Vector3(
				(76 / 30) * (i % 2),
				0,
				(66 / 30) * (i - i % 2) / 2
			))
			const theta = Math.PI / 2 * (i % 4)
			this.markerQuaternions.push(new THREE.Quaternion(0, Math.sin(theta / 2), 0, Math.cos(theta / 2)))
		}
	}

	_mainLoop() {
		// determine the distances to the markers / work out the weight
		let nearestMarkerIndex
		for (let markerIndex = 0; markerIndex < this.markers.length; markerIndex++) {
			if (!this.markers[markerIndex].visible) continue
			if (nearestMarkerIndex === undefined) nearestMarkerIndex = markerIndex
			else if (this.markers[markerIndex].position.length() < this.markers[nearestMarkerIndex].position.length()) nearestMarkerIndex = markerIndex
		}
		if (nearestMarkerIndex === undefined) return

		const children = [...this.objects]
		// on the cloeset marker, show the children based on averaging
		for (let childIndex = 0; childIndex < children.length; childIndex++) {
			const child = children[childIndex]

			const arr_p030 = [], arr_q030 = []
			const weights = []
			let weightSum = 0;
			for (let markerIndex = 0; markerIndex < this.markers.length; markerIndex++) {
				if (!this.markers[markerIndex].visible) continue

				// 0: camera, 1: dominant marker, 2: this marker, 3: object
				const p020 = this.markers[markerIndex].position
				const q020 = this.markers[markerIndex].quaternion
				if (p020.length() > 1000) continue
				const p121 = this.markerPositions[markerIndex].clone()
				const q121 = this.markerQuaternions[markerIndex].clone()
				const p131 = this.objectPositions[childIndex].clone()
				const q131 = this.objectQuaternions[childIndex].clone()

				const p232 = p131.clone().sub(p121).applyQuaternion(q121.clone().invert())
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
			for (let w = 0; w < weights.length; w++) {
				if (weights[w] === 0) continue

				const p030 = arr_p030[w]
				const q030 = arr_q030[w]

				x += weights[w] * p030.x
				y += weights[w] * p030.y
				z += weights[w] * p030.z
				qx += weights[w] * q030.x * Math.sign(q030.w)
				qy += weights[w] * q030.y * Math.sign(q030.w)
				qz += weights[w] * q030.z * Math.sign(q030.w)
				qw += weights[w] * q030.w * Math.sign(q030.w)
			}

			// 4: nearest marker
			const p030 = new THREE.Vector3(x, y, z)
			const q030 = new THREE.Quaternion(qx, qy, qz, qw).normalize()
			const p040 = this.markers[nearestMarkerIndex].position
			const q040 = this.markers[nearestMarkerIndex].quaternion

			const p434 = p030.clone().sub(p040).applyQuaternion(q040.clone().invert())
			const q434 = q040.clone().invert().multiply(q030)

			this.markers[nearestMarkerIndex].add(child)
			child.position.set(p434.x, p434.y, p434.z)
			child.quaternion.set(q434.x, q434.y, q434.z, q434.w)
		}
		this.usedMarkerIndex = nearestMarkerIndex
	}
}

const createMarkerIndicators = (markerPositions) => {
	const markerIndicators = []
	for (let i = 0; i < markerPositions.length; i++) {
		const markerIndicatorGeometry = new THREE.PlaneGeometry(1, 1)
		const markerIndicatorMaterial = new THREE.MeshBasicMaterial({ opacity: 0.5, side: THREE.DoubleSide })
		const markerIndicator = new THREE.Mesh(markerIndicatorGeometry, markerIndicatorMaterial)
		markerIndicator.position.set(markerPositions[i].x, markerPositions[i].y, markerPositions[i].z)
		markerIndicator.quaternion.set(Math.sin(Math.PI / 4), 0, 0, Math.cos(Math.PI / 4))
		markerIndicators.push(markerIndicator)
	}
	return markerIndicators
}

const createMoveDropdown = (objectToMove) => {
	// Add rotation / scale control
	const optionDropdown = document.createElement('select')
	optionDropdown.appendChild(createOption('rotx', 'Rotate about X'))
	optionDropdown.appendChild(createOption('roty', 'Rotate about Y'))
	optionDropdown.appendChild(createOption('rotz', 'Rotate about Z'))
	optionDropdown.appendChild(createOption('transx', 'Translate along X'))
	optionDropdown.appendChild(createOption('transy', 'Translate along Y'))
	optionDropdown.appendChild(createOption('transz', 'Translate along Z'))
	optionDropdown.appendChild(createOption('scale', 'Scale'))
	let selectedOption = 'rotx'
	optionDropdown.onchange = (e) => { selectedOption = e.target.value }

	let changeIntervalObject
	const changeInterval = 10, angleChange = changeInterval / 1000, scaleChange = 0.005, positionChange = changeInterval / 1000
	const plusButton = createButton('+', () => { changeIntervalObject = createChangeInterval(1, selectedOption, changeIntervalObject, changeInterval, scaleChange, angleChange, positionChange, objectToMove) })
	const minusButton = createButton('-', () => { changeIntervalObject = createChangeInterval(-1, selectedOption, changeIntervalObject, changeInterval, scaleChange, angleChange, positionChange, objectToMove) })

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
				objectQuaternions[object.indexInProject].premultiply(rotationQuaternion(axis, direction * angleChange))
			} else if (option.includes('trans')) {
				const axis = option.slice(5)
				const axisVector = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0)
				objectPositions[object.indexInProject].addScaledVector(axisVector, direction * positionChange)
			} else throw new Exception('invalid change type')
		}, interval)
	}

	const moveSection = document.createElement('div')
	moveSection.appendChild(optionDropdown)
	moveSection.appendChild(plusButton)
	moveSection.appendChild(minusButton)
	return moveSection
}

const createSimulationResultObject = (vertices, indices, colors) => {
	const colorBufferSizePerTime = vertices.length
	const nTimes = colors.length / colorBufferSizePerTime
	if (!Number.isInteger(nTimes)) throw Error('totalTime is not an integer')
	simulationResult = createBufferObject(vertices, indices, colors.slice(0, colorBufferSizePerTime))
	const simResultPosition = new THREE.Vector3(0.47, 0.5, -0.43)
	const simResultScale = 1.475
	simulationResult.position.set(simResultPosition.x, simResultPosition.y, simResultPosition.z)
	simulationResult.quaternion.set(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4))
	simulationResult.scale.set(simResultScale, simResultScale, simResultScale)

	let time = 0;
	setInterval(() => {
		time = time < nTimes - 1 ? time + 1 : 0
		simulationResult.geometry.attributes.color.array = colors.slice(time * colorBufferSizePerTime, (time + 1) * colorBufferSizePerTime)
		simulationResult.geometry.attributes.color.needsUpdate = true
	}, 50)

	return simulationResult
}

const scene = document.getElementById('scene')
const arena = new Arena(scene)

const markerIndicators = createMarkerIndicators(arena.markerPositions)
arena.addObjects(...markerIndicators)

let simulationResult;

// Add a 'control panel' div to put controls on
const { controlPanelWrapper, controlPanel } = createControlPanel()
document.body.appendChild(controlPanelWrapper)
const moveDropdown = createMoveDropdown(simulationResult)
controlPanel.appendChild(moveDropdown)

const usedMarkerColor = 0x00ff00, visibleUnusedMarkerColor = 0xffff00, hiddenMarkerColor = 0xff0000

getProcessedData().then(({ vertices, indices, colors }) => {
	simulationResult = createSimulationResultObject(vertices, indices, colors)
	arena.addObject(simulationResult)
})

setInterval(() => {
	for (let i = 0; i < arena.markers.length; i++) {
		markerIndicators[i].material.color.set(arena.usedMarkerIndex === i ? usedMarkerColor : arena.markers[i].visible ? visibleUnusedMarkerColor : hiddenMarkerColor)
	}
}, 100);