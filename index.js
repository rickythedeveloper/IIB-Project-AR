import { rotationQuaternion, createBufferObject } from "./utils/three.js";
import { createSlider, createControlPanel, createOption, createButton, createBarcodeMarkerElement } from "./utils/elements.js";
import { getProcessedData } from "./utils/convenience.js";
import { createMoveDropdown, createSimulationResultObject, createMarkerIndicators } from "./utils/scene_init.js";
import Arena from "./Arena.js";

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

const getMedian = (values) => {
	if (values.length === 0) throw new Error('The values array has to have a length greater than 0')
	const sortedValues = values.slice().sort((a, b) => a - b)
	const middle = Math.floor(sortedValues.length / 2)
	return sortedValues.length % 2 === 0 ? (sortedValues[middle] + sortedValues[middle - 1]) / 2 : sortedValues[middle]
}

const getMean = (values) => {
	if (values.length === 0) throw new Error('The values array has to have a length greater than 0')
	let sum = 0
	values.forEach(value => sum += value)
	return sum / values.length
}

const getMidValues = (values, proportion) => {
	if (proportion < 0) proportion = 0
	else if (proportion > 1) proportion = 1
	const sortedValues = values.slice().sort((a, b) => a - b)
	const sideProportion = (1 - proportion) / 2
	const startIndex = Math.floor(sortedValues.length * sideProportion)
	const endIndex = Math.floor(sortedValues.length * (1 - sideProportion))
	return values.slice(startIndex, endIndex)
}

const areClose = (arr1, arr2, tolerance) => {
	if (arr1.length !== arr2.length) throw new Error('arr1 and arr2 have different lengths')
	for (let i = 0; i < arr1.length; i++) {
		const error = Math.abs((arr1[i] - arr2[i]) / arr2[i])
		if (error > tolerance) {
			return false
		}
	}
	return true
}

const arrayIsFilled = (arr) => {
	for (const val of arr) {
		if (val === undefined || val === null) return false
	}
	return true
}

const getVariance = (values, mean) => {
	if (mean === undefined) return getVariance(values, getMean(values))
	if (values.length === 0) throw new Error('The values array has to have a length greater than 0')
	let squaredErrorSum = 0
	values.forEach(value => squaredErrorSum += (value - mean) ** 2)
	return squaredErrorSum / values.length
}

const getMeanAndVariance = (values) => {
	const mean = getMean(values)
}

const getSensibleValue = (values, midProportion, maxVariance) => {
	const midValues = getMidValues(values, midProportion)
	const mean = getMean(midValues)
	const variance = getVariance(midValues, mean)
	return variance < maxVariance ? mean : null
}

const getMeanVector = (vectors) => {
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

const getMeanQuaternion = (quaternions) => {
	const xs = quaternions.map(q => q.x), ys = quaternions.map(q => q.y), zs = quaternions.map(q => q.z), ws = quaternions.map(q => q.w)
	const meanAndVariance = [xs, ys, zs, ws].map(values => {
		const midValues = getMidValues(values, 0.8)
		const mean = getMean(midValues)
		const variance = getVariance(midValues, mean)
		return { mean, variance }
	})
	return {
		quaternion: new THREE.Quaternion(meanAndVariance[0].mean, meanAndVariance[1].mean, meanAndVariance[2].mean, meanAndVariance[3].mean),
		variances: meanAndVariance.map(x => x.variance)
	}
}

const cleanedQuaternion = (quaternion) => {
	if (quaternion.w > 0) return quaternion.clone()
	return new THREE.Quaternion(-quaternion.x, -quaternion.y, -quaternion.z, -quaternion.w)
}

const getAverageQuaternion = (quaternions, weights) => {
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

const getColumn = (matrix, columnIndex) => {
	return matrix.map(row => row[columnIndex])
}

const findMax = (arr) => {
	if (arr.length === 0) throw new Error('')
	let maxValue, maxIndex
	for (let i = 0; i < arr.length; i++) {
		const value = arr[i]
		if (maxIndex === undefined || value > maxValue) {
			maxIndex = i
			maxValue = value
		}
	}
	if (maxValue === undefined) throw new Error('')
	return { index: maxIndex, value: maxValue }
}

const matrixMultiplyScalar = (matrix, scalar) => {
	const result = []
	for (let i = 0; i < matrix.length; i++) {
		result.push([])
		for (let j = 0; j < matrix[0].length; j++) {
			result[i].push(matrix[i][j] * scalar)
		}
	}
	return result
}

const matrixAdd = (m1, m2) => {
	const result = []
	for (let i = 0; i < m1.length; i++) {
		result.push([])
		for (let j = 0; j < m1[0].length; j++) {
			result[i].push(m1[i][j] + m2[i][j])
		}
	}
	return result
}

const outerProduct = (v1, v2) => {
	const nRows = v1.length, nCols = v2.length
	const result = []
	for (let i = 0; i < nRows; i++) {
		result.push([])
		for (let j = 0; j < nCols; j++) {
			result[i].push(v1[i] * v2[j])
		}
	}
	return result
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
			recordedMarkerQuaternions[i].push(cleanedQuaternion(q121))
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
				// console.log(i, positionVariances);
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

		console.log(markerPositions);
		console.log(markerQuaternions);
		if (arrayIsFilled(markerPositions) && arrayIsFilled(markerQuaternions)) {
			clearInterval(recordValueInterval)
			clearInterval(setValueInterval)
			console.log('complete!');
		}
	}, 1000)

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
