import { getMean, getMidValues, getVariance, initMatrix } from "./arrays.js"
import { matrixMultiplyScalar, getColumn, outerProduct, matrixAdd } from "./vectors.js"
import { createLine, createMarkerIndicator } from "./three.js";
import { createBarcodeMarkerElement, createControlPanel } from "./elements.js";
import { getProcessedData } from "./convenience.js";
import { createMoveDropdown, createSimulationResultObject, createMarkerIndicators } from "./scene_init.js";
import Arena from "../Arena.js";

export const getMeanVector = (vectors) => {
	const xs = vectors.map(v => v.x), ys = vectors.map(v => v.y), zs = vectors.map(v => v.z)
	const meanAndVariance = [xs, ys, zs].map(values => {
		const midValues = getMidValues(values, 0.8)
		const mean = getMean(midValues)
		const variance = getVariance(midValues, mean)
		return { mean, variance }
	})
	return {
		vector: new THREE.Vector3(meanAndVariance[0].mean, meanAndVariance[1].mean, meanAndVariance[2].mean),
		variances: meanAndVariance.map(x => x.variance)
	}
}

export const getAverageQuaternion = (quaternions, weights) => {
	if (weights === undefined) weights = Array(quaternions.length).fill(1)
	if (quaternions.length !== weights.length) throw new Error('quaternions and weights do not have the same lengths')

	let M = []
	for (let i = 0; i < 4; i++) {
		M.push(Array(4).fill(0))
	}

	for (let i = 0; i < quaternions.length; i++) {
		const q = quaternions[i]
		const qVector = [q.x, q.y, q.z, q.w]
		const contribution = matrixMultiplyScalar(outerProduct(qVector, qVector), weights[i])
		M = matrixAdd(M, contribution)
	}

	const { values: eigValues, vectors: eigVectors } = math.eigs(M)
	const maxEigVectors = getColumn(eigVectors, eigValues.length - 1)
	return new THREE.Quaternion(maxEigVectors[0], maxEigVectors[1], maxEigVectors[2], maxEigVectors[3])
}

export const scan = () => {
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

	// add marker indicators
	markers.forEach(marker => marker.add(createMarkerIndicator(0x0000ff, 0.5)))

	const indicatorLines = initMatrix([markers.length, markers.length], () => null)
	for (let i = 0; i < markers.length; i++) {
		for (let j = 0; j < markers.length; j++) {
			if (i === j) continue
			const line = createLine(0xff0000)
			markers[i].add(line)
			indicatorLines[i][j] = line
		}
	}

	console.log(scene.children);

	// container for the final positions and quaternions
	const markerPositions = Array(markers.length).fill(null)
	const markerQuaternions = Array(markers.length).fill(null)
	markerPositions[dominantMarkerIndex] = new THREE.Vector3(0, 0, 0)
	markerQuaternions[dominantMarkerIndex] = new THREE.Quaternion(0, 0, 0, 1)

	// container matrix for the relative positions and quaternions
	const markerPositionsMatrix = initMatrix([markers.length, markers.length], () => null)
	const markerQuaternionsMatrix = initMatrix([markers.length, markers.length], () => null)
	for (let i = 0; i < markers.length; i++) {
		markerPositionsMatrix[i][i] = new THREE.Vector3(0, 0, 0)
		markerQuaternionsMatrix[i][i] = new THREE.Quaternion(0, 0, 0, 1)
	}

	// container for the current average positions and their confidence
	const averageMarkerPositionsMatrix = initMatrix([markers.length, markers.length], () => null)
	const markerPositionsConfidenceMatrix = initMatrix([markers.length, markers.length], () => 0)

	// container for all recorded values
	const recordedMarkerPositions = initMatrix([markers.length, markers.length], () => [])
	const recordedMarkerQuaternions = initMatrix([markers.length, markers.length], () => [])

	// record relative positions and quaternions
	const zeroVector = new THREE.Vector3(0, 0, 0)
	const maxMarkerDistance = 100
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

	const minMeasurements = 1000
	const maxVariance = 0.05
	const setValueInterval = setInterval(() => {
		// decide whether to put the average into the relative position and quaternion matrices
		for (let i = 0; i < markers.length; i++) {
			for (let j = 0; j < markers.length; j++) {
				if (i === j) continue
				const positions = recordedMarkerPositions[i][j]
				const quaternions = recordedMarkerQuaternions[i][j]
				if (positions.length === 0) continue

				const { vector: meanPosition, variances: positionVariances } = getMeanVector(positions)
				const confidence =
					Math.min(1, positions.length / minMeasurements) *
					Math.min(1, maxVariance / positionVariances[0]) *
					Math.min(1, maxVariance / positionVariances[1]) *
					Math.min(1, maxVariance / positionVariances[2])
				averageMarkerPositionsMatrix[i][j] = meanPosition
				markerPositionsConfidenceMatrix[i][j] = confidence
				if (confidence === 1) markerPositionsMatrix[i][j] = meanPosition

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

		// show confidence indicator lines between markers
		for (let i = 0; i < markers.length; i++) {
			for (let j = 0; j < markers.length; j++) {
				if (i === j) continue
				const relativePosition = averageMarkerPositionsMatrix[i][j]
				if (relativePosition === null) continue
				const confidence = markerPositionsConfidenceMatrix[i][j]
				const lineGeometry = indicatorLines[i][j].geometry, lineMaterial = indicatorLines[i][j].material
				const vertices = new Float32Array([0, 0, 0, relativePosition.x, relativePosition.y, relativePosition.z])
				lineGeometry.attributes.position.array = vertices
				lineGeometry.attributes.position.needsUpdate = true
				lineMaterial.color = new THREE.Color(1 - confidence, confidence, 0)
			}
		}
	}, 500)
}

export const show = () => {
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