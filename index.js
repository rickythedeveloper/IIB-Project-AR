
import { createControlPanel, createBarcodeMarkerElement } from "./utils/elements.js";
import { getProcessedData } from "./utils/convenience.js";
import { createMoveDropdown, createSimulationResultObject, createMarkerIndicators } from "./utils/scene_init.js";
import Arena from "./Arena.js";
import { getMeanVector, getAverageQuaternion } from "./utils/index.js";
import { initMatrix } from "./utils/arrays.js";

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

const zeroVector = new THREE.Vector3(0, 0, 0)
const maxMarkerDistance = 100

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

	// container matrix for the relative positions and quaternions
	const markerPositionsMatrix = initMatrix([markers.length, markers.length], () => null), markerQuaternionsMatrix = initMatrix([markers.length, markers.length], () => null)
	for (let i = 0; i < markers.length; i++) {
		markerPositionsMatrix[i][i] = new THREE.Vector3(0, 0, 0)
		markerQuaternionsMatrix[i][i] = new THREE.Quaternion(0, 0, 0, 1)
	}

	// container for recorded values
	const recordedMarkerPositions = initMatrix([markers.length, markers.length], () => [])
	const recordedMarkerQuaternions = initMatrix([markers.length, markers.length], () => [])

	// record relative positions and quaternions
	const recordValueInterval = setInterval(() => {
		for (let i = 0; i < markers.length; i++) {
			for (let j = 0; j < markers.length; j++) {
				if (i === j) continue
				if (!markers[i].visible || !markers[j].visible) continue

				// 0: camera, 1: marker i, 2: marker j
				const p010 = markers[i].position
				const q010 = markers[i].quaternion
				const p020 = markers[j].position
				const q020 = markers[j].quaternion


				if (p010.equals(zeroVector) || p020.equals(zeroVector)) continue
				if (p010.length() > maxMarkerDistance || p020.length() > maxMarkerDistance) continue

				const q121 = q010.clone().invert().multiply(q020)
				const p120 = p020.clone().sub(p010)
				const p121 = p120.clone().applyQuaternion(q010.clone().invert())

				recordedMarkerPositions[i][j].push(p121)
				recordedMarkerQuaternions[i][j].push(q121)
			}
		}
	}, 20)

	const minMeasurements = 150
	const maxVariance = 0.7
	const setValueInterval = setInterval(() => {
		// decide whether to put the average into the relative position and quaternion matrices
		for (let i = 0; i < markers.length; i++) {
			for (let j = 0; j < markers.length; j++) {
				if (i === j) continue
				const positions = recordedMarkerPositions[i][j]
				const quaternions = recordedMarkerQuaternions[i][j]
				if (positions.length < minMeasurements) continue

				const { vector: meanPosition, variances: positionVariances } = getMeanVector(positions)
				if (positionVariances.every(v => v < maxVariance)) markerPositionsMatrix[i][j] = meanPosition

				const averageQuaternion = getAverageQuaternion(quaternions)
				markerQuaternionsMatrix[i][j] = averageQuaternion
			}
		}

		// check if all markers are accessible from the dominant marker
		const connectedMarkers = [dominantMarkerIndex]
		const routes = []
		for (let i = 0; i < markers.length; i++) {
			if (i === connectedMarkers.length) break

			for (let j = 0; j < markers.length; j++) {
				if (connectedMarkers.includes(j)) continue
				const startMarker = connectedMarkers[i]
				const endMarker = j
				const relativePosition = markerPositionsMatrix[startMarker][endMarker]
				if (relativePosition === null) continue
				connectedMarkers.push(endMarker)
				routes.push([startMarker, endMarker])
			}
		}

		// if all markers accessible, calculate the marker positions and quaternions relative to the dominant marker
		if (connectedMarkers.length === markers.length) {
			console.log('All connected!');

			for (const route of routes) {
				console.log(route);
				// 0: dominant marker
				// 1: marker at the beginning of the route, 
				// 2: marker at the end of the route
				const p121 = markerPositionsMatrix[route[0]][route[1]]
				const q121 = markerQuaternionsMatrix[route[0]][route[1]]
				const p010 = markerPositions[route[0]]
				const q010 = markerQuaternions[route[0]]

				const p020 = p010.clone().add(p121.clone().applyQuaternion(q010))
				const q020 = q010.clone().multiply(q121)
				markerPositions[route[1]] = p020
				markerQuaternions[route[1]] = q020
			}

			console.log(markerPositions);
			console.log(markerQuaternions);
			clearInterval(recordValueInterval)
			clearInterval(setValueInterval)
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
