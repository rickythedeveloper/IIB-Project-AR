
import { createControlPanel, createBarcodeMarkerElement } from "./utils/elements.js";
import { getProcessedData } from "./utils/convenience.js";
import { createMoveDropdown, createSimulationResultObject, createMarkerIndicators } from "./utils/scene_init.js";
import Arena from "./Arena.js";
import { getMeanVector, getAverageQuaternion } from "./utils/index.js";
import { arrayIsFilled } from "./utils/arrays.js";

const MODES = {
	SCAN: 'scan',
	SHOW: 'show'
};

let mode = MODES.SCAN

const show = () => {
	const scene = document.getElementById('scene')
	const arena = new Arena(scene)
	const markerIndicators = createMarkerIndicators(arena.markerPositions)
	arena.addObjects(...markerIndicators)


	// Add a 'control panel' div to put controls on
	const { controlPanelWrapper, controlPanel } = createControlPanel()
	document.body.appendChild(controlPanelWrapper)

	const simulationResultWrapper = { object: null }
	const moveDropdown = createMoveDropdown(simulationResultWrapper, arena)
	controlPanel.appendChild(moveDropdown)

	const usedMarkerColor = 0x00ff00, visibleUnusedMarkerColor = 0xffff00, hiddenMarkerColor = 0xff0000

	let simulationResult;
	getProcessedData().then(({ vertices, indices, colors }) => {
		simulationResult = createSimulationResultObject(vertices, indices, colors)
		simulationResultWrapper.object = simulationResult
		arena.addObject(simulationResult)
	})

	setInterval(() => {
		for (let i = 0; i < arena.markers.length; i++) {
			markerIndicators[i].material.color.set(arena.usedMarkerIndex === i ? usedMarkerColor : arena.markers[i].visible ? visibleUnusedMarkerColor : hiddenMarkerColor)
		}
	}, 100);
}

const scan = () => {
	const scene = document.getElementById('scene')
	// register which markers to use
	const markers = []
	const dominantMarkerIndex = 0
	for (let i = 0; i < 6; i++) {
		const markerElement = createBarcodeMarkerElement(i)
		scene.appendChild(markerElement)
		const marker = markerElement.object3D
		markers.push(marker)
	}

	// container for the final positions and quaternions
	const markerPositions = Array(markers.length).fill(null), markerQuaternions = Array(markers.length).fill(null)
	markerPositions[dominantMarkerIndex] = new THREE.Vector3(0, 0, 0)
	markerQuaternions[dominantMarkerIndex] = new THREE.Quaternion(0, 0, 0, 1)

	// container for recorded values
	const recordedMarkerPositions = [], recordedMarkerQuaternions = []
	for (let i = 0; i < markers.length; i++) {
		// if (i === dominantMarkerIndex) continue
		recordedMarkerPositions.push([])
		recordedMarkerQuaternions.push([])
	}

	// record relative positions and quaternions
	const recordValueInterval = setInterval(() => {
		for (let i = 0; i < markers.length; i++) {
			if (i === dominantMarkerIndex) continue
			if (!markers[i].visible || !markers[dominantMarkerIndex].visible) continue

			// 0: camera, 1: dominant marker, 2: this marker
			const p010 = markers[dominantMarkerIndex].position
			const q010 = markers[dominantMarkerIndex].quaternion
			const p020 = markers[i].position
			const q020 = markers[i].quaternion

			if (p010.equals(new THREE.Vector3(0, 0, 0)) || p020.equals(new THREE.Vector3(0, 0, 0))) continue
			if (p010.length() > 100 || p020.length() > 100) continue

			const q121 = q010.clone().invert().multiply(q020)
			const p120 = p020.clone().sub(p010)
			const p121 = p120.clone().applyQuaternion(q010.clone().invert())

			recordedMarkerPositions[i].push(p121)
			recordedMarkerQuaternions[i].push(q121)
		}
	}, 20)

	const n_min = 100
	const maxVariance = 0.1
	// decide whether to put the mean into the final value container
	const setValueInterval = setInterval(() => {
		for (let i = 0; i < markers.length; i++) {
			if (i === dominantMarkerIndex) continue
			const positions = recordedMarkerPositions[i]
			if (positions.length > n_min) {
				const { vector: meanPosition, variances: positionVariances } = getMeanVector(positions)
				if (positionVariances.every(v => v < maxVariance)) {
					markerPositions[i] = meanPosition
				}
			}

			const quaternions = recordedMarkerQuaternions[i]
			if (quaternions.length > n_min) {
				const averageQuaternion = getAverageQuaternion(quaternions)
				markerQuaternions[i] = averageQuaternion
			}
		}

		if (arrayIsFilled(markerPositions) && arrayIsFilled(markerQuaternions)) {
			clearInterval(recordValueInterval)
			clearInterval(setValueInterval)
			console.log('complete!');
			console.log(markerPositions);
			console.log(markerQuaternions);
		}
	}, 500)

	// show some indicators based on how accurate they seem
}


switch (mode) {
	case MODES.SHOW:
		show()
		break
	case MODES.SCAN:
		scan()
		break
	default:
		throw Error('Mode not selected')
}
