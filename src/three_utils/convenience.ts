import {
	ArrowHelper,
	BufferAttribute,
	BufferGeometry,
	DoubleSide,
	Line,
	LineBasicMaterial,
	Mesh,
	MeshBasicMaterial,
	PlaneGeometry,
	Quaternion,
	ShaderMaterial,
	Vector3
} from 'three'
import { Axis } from './index'

/**
 * Given some data in rows, return the triangulated vertices.
 * @param {number[][][]} rows Each point is a 3D array. Each row is an array of points.
 * @returns
 */
export const convertRowsToVertices = (rows: number[][][]) => {
	const verticesArray: number[] = []
	for (let i = 0; i < rows.length - 1; i++) {
		const row = rows[i]
		const nextRow = rows[i + 1]

		const verticesRow: number[] = []
		for (let j = 0; j < row.length - 1; j++) {
			verticesRow.push(...row[j], ...row[j + 1], ...nextRow[j])
			verticesRow.push(...row[j + 1], ...nextRow[j], ...nextRow[j + 1])
		}

		verticesArray.push(...verticesRow)
	}

	return new Float32Array(verticesArray)
}

export const createArrow = (direction: Axis, length: number, colorHex: string) => new ArrowHelper(
	new Vector3(direction === Axis.x ? 1 : 0, direction === Axis.y ? 1 : 0, direction === Axis.z ? 1 : 0),
	new Vector3(0, 0, 0),
	length,
	colorHex
)

export const rotationQuaternion = (direction: Axis, angle: number) => new Quaternion(
	direction == Axis.x ? Math.sin(angle / 2) : 0,
	direction == Axis.y ? Math.sin(angle / 2) : 0,
	direction == Axis.z ? Math.sin(angle / 2) : 0,
	Math.cos(angle / 2)
)

const vertexShader = `
	attribute vec3 color;	
	varying vec3 v_color;
	void main() {
		v_color = color;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`

const fragmentShader = (opacity: number): string => `
	varying vec3 v_color;
	void main() {
		gl_FragColor = vec4(v_color, ${opacity});
	}
`

export const createBufferObject = (vertices: Float32Array, indices: Uint32Array, colors: Float32Array) => {
	const geometry = new BufferGeometry()
	geometry.index = new BufferAttribute(indices, 1)
	geometry.setAttribute('position', new BufferAttribute(vertices, 3))
	geometry.setAttribute('color', new BufferAttribute(colors, 3))

	const material = new ShaderMaterial({
		vertexShader,
		fragmentShader: fragmentShader(0.8),
		transparent: true,
		side: DoubleSide
	})

	return new Mesh(geometry, material)
}

export const createMarkerIndicator = (color: number, opacity: number) => {
	const geometry = new PlaneGeometry(1, 1)
	const material = new MeshBasicMaterial({ color, opacity, transparent: true, side: DoubleSide })
	const mesh = new Mesh(geometry, material)
	mesh.quaternion.set(Math.sin(Math.PI / 4), 0, 0, Math.cos(Math.PI / 4))
	return mesh
}

export const createMarkerIndicators = (markerPositions: Vector3[], markerQuaternions: Quaternion[]) => {
	const markerIndicators = []
	for (let i = 0; i < markerPositions.length; i++) {
		const markerIndicator = createMarkerIndicator(0xffffff, 0.5)
		markerIndicator.position.set(markerPositions[i].x, markerPositions[i].y, markerPositions[i].z)
		const indicatorQuat = markerIndicator.quaternion.premultiply(markerQuaternions[i])
		markerIndicator.quaternion.set(indicatorQuat.x, indicatorQuat.y, indicatorQuat.z, indicatorQuat.w)
		markerIndicators.push(markerIndicator)
	}
	return markerIndicators
}

export const createLine = (color: number) => {
	const geometry = new BufferGeometry()
	geometry.setAttribute('position', new BufferAttribute(new Float32Array(Array(6).fill(0)), 3))
	const material = new LineBasicMaterial({ color })
	return new Line(geometry, material)
}

export const createSimulationResultObject = (vertices: Float32Array, indices: Uint32Array, colors: Float32Array) => {
	const colorBufferSizePerTime = vertices.length
	const nTimes = colors.length / colorBufferSizePerTime
	if (!Number.isInteger(nTimes)) throw Error('totalTime is not an integer')
	const simulationResult = createBufferObject(vertices, indices, colors.slice(0, colorBufferSizePerTime))
	const simResultScale = 1.475
	simulationResult.scale.set(simResultScale, simResultScale, simResultScale)

	let time = 0
	setInterval(() => {
		time = time < nTimes - 1 ? time + 1 : 0
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		simulationResult.geometry.attributes.color.array = colors.slice(time * colorBufferSizePerTime, (time + 1) * colorBufferSizePerTime)
		simulationResult.geometry.attributes.color.needsUpdate = true
	}, 50)

	return simulationResult
}