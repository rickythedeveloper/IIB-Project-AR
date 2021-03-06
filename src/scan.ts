import { createLine, createMarkerIndicator } from './three_utils/convenience'
import { createMatrix, createVector, getAverageQuaternion, getMeanVector } from './maths/arrays'
import { Positioning } from './utils'
import { Matrix, Vector } from './maths/vectors'
import { Setup, createMarker } from './utils/setupAR'
import { BufferGeometry, Color, Line, LineBasicMaterial, Object3D, Quaternion, Vector3 } from 'three'

const zeroVector = new Vector3(0, 0, 0)
const zeroQuaternion = new Quaternion(0, 0, 0, 1)
const RECORD_INTERVAL = 20
const UPDATE_INTERVAL = 500
const MAX_MARKER_DISTANCE = 100
const MIN_MEASUREMENTS = 500
const MAX_MEASUREMENTS = 5000
const MAX_VARIANCE = 0.05

interface MarkerPairInfo {
	averageRelativePosition: Vector3
	averageRelativeQuaternion: Quaternion
	relativePositionConfidence: number
	recordedRelativePositions: Vector3[]
	recordedRelativeQuaternions: Quaternion[]
}


const calculateConfidence = (numMeasurements: number, variance: {x: number, y: number, z: number}) =>
	Math.min(1, numMeasurements / MIN_MEASUREMENTS) *
	Math.min(1, MAX_VARIANCE / variance.x) *
	Math.min(1, MAX_VARIANCE / variance.y) *
	Math.min(1, MAX_VARIANCE / variance.z)

const calculateRelative = (marker1: Object3D, marker2: Object3D): Positioning | null => {
	if (!marker1.visible || !marker2.visible) return null

	// 0: camera, 1: marker i, 2: marker j
	const p010 = marker1.position
	const q010 = marker1.quaternion
	const p020 = marker2.position
	const q020 = marker2.quaternion

	if (p010.equals(zeroVector) || p020.equals(zeroVector)) return null
	if (p010.length() > MAX_MARKER_DISTANCE || p020.length() > MAX_MARKER_DISTANCE) return null

	const q121 = q010.clone().invert().multiply(q020)
	const p120 = p020.clone().sub(p010)
	const p121 = p120.clone().applyQuaternion(q010.clone().invert())
	return { position: p121, quaternion: q121 }
}

const recordValues = (markers: Object3D[], markerPairMatrix: Matrix<MarkerPairInfo>) => {
	for (let i = 0; i < markers.length; i++) {
		for (let j = 0; j < markers.length; j++) {
			if (i === j) continue
			const rel = calculateRelative(markers[i], markers[j])
			if (rel === null) continue
			while (markerPairMatrix[i][j].recordedRelativePositions.length >= MAX_MEASUREMENTS) markerPairMatrix[i][j].recordedRelativePositions.shift()
			while (markerPairMatrix[i][j].recordedRelativeQuaternions.length >= MAX_MEASUREMENTS) markerPairMatrix[i][j].recordedRelativeQuaternions.shift()
			markerPairMatrix[i][j].recordedRelativePositions.push(rel.position)
			markerPairMatrix[i][j].recordedRelativeQuaternions.push(rel.quaternion)
		}
	}
}

const updateAverages = (numMarkers: number, markerPairMatrix: Matrix<MarkerPairInfo>) => {
	for (let i = 0; i < numMarkers; i++) {
		for (let j = 0; j < numMarkers; j++) {
			if (i === j) continue
			const positions = markerPairMatrix[i][j].recordedRelativePositions
			const quaternions = markerPairMatrix[i][j].recordedRelativeQuaternions
			if (positions.length === 0) continue

			const { vector: meanPosition, variances: positionVariances } = getMeanVector(positions)
			markerPairMatrix[i][j].averageRelativePosition = meanPosition
			markerPairMatrix[i][j].averageRelativeQuaternion = getAverageQuaternion(quaternions)
			markerPairMatrix[i][j].relativePositionConfidence = calculateConfidence(positions.length, positionVariances)
		}
	}
}

type Route = [number, number]
const connectMarkers = (
	dominantMarkerIndex: number,
	numMarkers: number,
	markerPairMatrix: Matrix<MarkerPairInfo>
): {
	connectedMarkers: number[],
	routes: [number, number][]
} => {
	const connectedMarkers = [dominantMarkerIndex]
	const routes: Route[] = []
	for (let i = 0; i < numMarkers; i++) {
		if (i === connectedMarkers.length) break
		const startMarker = connectedMarkers[i]
		for (let j = 0; j < numMarkers; j++) {
			if (connectedMarkers.includes(j)) continue
			const endMarker = j
			if (markerPairMatrix[startMarker][endMarker].relativePositionConfidence !== 1) continue
			connectedMarkers.push(endMarker)
			routes.push([startMarker, endMarker])
		}
	}
	return { connectedMarkers, routes }
}

const registerRoutes = (
	routes: Route[],
	markerPairMatrix: Matrix<MarkerPairInfo>,
	markerPositions: Vector<Vector3 | null>,
	markerQuaternions: Vector<Quaternion | null>
) => {
	for (const route of routes) {
		const startIndex = route[0], endIndex = route[1]
		// 0: dominant marker
		// 1: marker at the beginning of the route,
		// 2: marker at the end of the route
		const p121 = markerPairMatrix[startIndex][endIndex].averageRelativePosition, q121 = markerPairMatrix[startIndex][endIndex].averageRelativeQuaternion
		const p010 = markerPositions[startIndex], q010 = markerQuaternions[startIndex]
		if (p010 === null || q010 === null) throw new Error('some position or quaternion is null even though the route is established')
		const p020 = p010.clone().add(p121.clone().applyQuaternion(q010))
		const q020 = q010.clone().multiply(q121)
		markerPositions[endIndex] = p020
		markerQuaternions[endIndex] = q020
	}
}

const updateConfidenceIndicators = (
	numMarkers: number,
	markerPairMatrix: Matrix<MarkerPairInfo>,
	indicatorLines: Matrix<Line<BufferGeometry, LineBasicMaterial>>,
) => {
	for (let i = 0; i < numMarkers; i++) {
		for (let j = 0; j < numMarkers; j++) {
			if (i === j) continue
			const relativePosition = markerPairMatrix[i][j].averageRelativePosition
			const confidence = markerPairMatrix[i][j].relativePositionConfidence
			const lineGeometry = indicatorLines[i][j].geometry, lineMaterial = indicatorLines[i][j].material
			const vertices = new Float32Array([0, 0, 0, relativePosition.x, relativePosition.y, relativePosition.z])
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			lineGeometry.attributes.position.array = vertices
			lineGeometry.attributes.position.needsUpdate = true
			lineMaterial.color = new Color(1 - confidence, confidence, 0)
		}
	}
}

const scan = (
	arSetup: Setup,
	markerNumbers: number[],
	update?: (markerPositions: Vector3[], markerQuaternions: Quaternion[]) => void,
	onComplete?: (markerPositions: Vector3[], markerQuaternions: Quaternion[]) => void
) => {
	const markers = markerNumbers.map(n => createMarker(n, arSetup))
	markers.forEach(m => arSetup.camera.add(m))
	const dominantMarkerIndex = 0 // TODO relax assumption on the dominant marker

	// add marker indicators
	markers.forEach(marker => marker.add(createMarkerIndicator(0x0000ff, 0.5)))

	const indicatorLines = createMatrix([markers.length, markers.length], (i) => {
		const line = createLine(0xff0000)
		markers[i].add(line)
		return line
	})

	// container for the final positions and quaternions
	const markerPositions = createVector(markers.length, i => i === dominantMarkerIndex ? zeroVector.clone() : null)
	const markerQuaternions = createVector(markers.length, i => i === dominantMarkerIndex ? zeroQuaternion.clone() : null)
	const markerPairMatrix: Matrix<MarkerPairInfo> = createMatrix([markers.length, markers.length], () => {
		return {
			averageRelativePosition: zeroVector.clone(),
			averageRelativeQuaternion: zeroQuaternion.clone(),
			relativePositionConfidence: 0,
			recordedRelativePositions: [],
			recordedRelativeQuaternions: [],
		}
	})

	// record relative positions and quaternions
	const recordValueInterval = setInterval(() => { recordValues(markers, markerPairMatrix) }, RECORD_INTERVAL)

	// update average relative positions and quaternions & check if the scan is complete
	let completed = false
	const setValueInterval = setInterval(() => {
		// update average relative postions and quaternions as well as confidence
		updateAverages(markers.length, markerPairMatrix)

		// check if all markers are accessible from the dominant marker
		const { connectedMarkers, routes } = connectMarkers(dominantMarkerIndex, markers.length, markerPairMatrix)

		// if all markers accessible, calculate the marker positions and quaternions relative to the dominant marker
		if (connectedMarkers.length === markers.length && !completed) {
			completed = true
			registerRoutes(routes, markerPairMatrix, markerPositions, markerQuaternions)
			if (onComplete) onComplete(markerPositions as Vector3[], markerQuaternions as Quaternion[])
		}

		// update confidence indicator lines between markers
		updateConfidenceIndicators(markers.length, markerPairMatrix, indicatorLines)

		if (update) update(markerPositions as Vector3[], markerQuaternions as Quaternion[])
	}, UPDATE_INTERVAL)

	return { recordValueInterval, setValueInterval, markers }
}

export default scan