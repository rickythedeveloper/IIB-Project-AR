import { ArrowHelper, Vector3, Quaternion, BufferGeometry, BufferAttribute, ShaderMaterial, DoubleSide, Mesh, PlaneGeometry, MeshBasicMaterial, LineBasicMaterial, Line, Curve, ColorRepresentation, TubeGeometry, MeshStandardMaterial, Group, Object3D, CylinderGeometry, ConeGeometry, BoxGeometry, SphereGeometry } from 'three';

/**
 * Given some data in rows, return the triangulated vertices.
 * @param {number[][][]} rows Each point is a 3D array. Each row is an array of points.
 * @returns 
 */
export const convertRowsToVertices = (rows: number[][][]) => {
	const verticesArray: number[] = [];
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

export enum Axis { x, y, z }
type AxisString = keyof typeof Axis

export const createArrow = (direction: AxisString, length: number, colorHex: string) => new ArrowHelper(
	new Vector3(direction === 'x' ? 1 : 0, direction === 'y' ? 1 : 0, direction === 'z' ? 1 : 0),
	new Vector3(0, 0, 0),
	length,
	colorHex
)

export const rotationQuaternion = (direction: AxisString, angle: number) => new Quaternion(
	direction == 'x' ? Math.sin(angle / 2) : 0,
	direction == 'y' ? Math.sin(angle / 2) : 0,
	direction == 'z' ? Math.sin(angle / 2) : 0,
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

	const mesh = new Mesh(geometry, material)
	return mesh
}

export const createMarkerIndicator = (color: number, opacity: number) => {
	const geometry = new PlaneGeometry(1, 1)
	const material = new MeshBasicMaterial({ color, opacity, transparent: true, side: DoubleSide })
	const mesh = new Mesh(geometry, material)
	mesh.quaternion.set(Math.sin(Math.PI / 4), 0, 0, Math.cos(Math.PI / 4))
	return mesh
}

export const createLine = (color: number) => {
	const geometry = new BufferGeometry()
	geometry.setAttribute('position', new BufferAttribute(new Float32Array(Array(6).fill(0)), 3))
	const material = new LineBasicMaterial({ color })
	const mesh = new Line(geometry, material)
	return mesh
}

class Circle3D extends Curve<Vector3> {
	constructor(public radius: number) {
		super()
	}

	getPoint(t: number, optionalTarget = new Vector3()) {
		const tx = 0
		const ty = this.radius * Math.sin(2 * Math.PI * t)
		const tz = this.radius * Math.cos(2 * Math.PI * t)
		return optionalTarget.set(tx, ty, tz)
	}
}

export const createRing = (ringRadius: number, tubeRadius: number, nSegments: number, color: ColorRepresentation) => {
	const circle = new Circle3D(ringRadius)
	const geometry = new TubeGeometry(circle, nSegments, tubeRadius, 8, true)
	const material = new MeshStandardMaterial({ transparent: true, opacity: 0.7, color, side: DoubleSide })
	const mesh = new Mesh(geometry, material)
	return mesh
}


export interface RotationRing {
	container: Group
	ring: Object3D
	ringDetectionCylinder: Object3D
	visiblePlane: Object3D
	invisiblePlane: Object3D
}

const ROTATION_RING_RADIUS = 0.7
const ROTATION_RING_TUBE_RADIUS = 0.1
const ROTATION_RING_N_SEGMENTS = 16

const axisColor = (axis: AxisString) => axis === 'x' ? 0xff0000 : axis === 'y' ? 0x00ff00 : 0x0000ff

const createRotationRing = (axis: AxisString): RotationRing => {
	const color = axisColor(axis)

	const ring = createRing(ROTATION_RING_RADIUS, ROTATION_RING_TUBE_RADIUS, ROTATION_RING_N_SEGMENTS, color)

	const cylinderRadius = ROTATION_RING_RADIUS * 1.3
	const cylinderHeight = ROTATION_RING_TUBE_RADIUS * 1.3
	const detectionGeometry = new CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight)
	const detectionMaterial = new MeshBasicMaterial({transparent: true})
	const detectionCylinder = new Mesh(detectionGeometry, detectionMaterial)
	detectionCylinder.visible = false
	detectionCylinder.quaternion.premultiply(rotationQuaternion('z', Math.PI/2))
	
	const invisiblePlaneGeometry = new PlaneGeometry(20, 20)
	const invisiblePlaneMaterial = new MeshBasicMaterial({transparent: true, side: DoubleSide})
	const invisiblePlane = new Mesh(invisiblePlaneGeometry, invisiblePlaneMaterial)
	invisiblePlane.visible = false
	invisiblePlane.quaternion.premultiply(new Quaternion(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)))

	const visiblePlaneGeometry = new PlaneGeometry(3, 3)
	const visiblePlaneMaterial = new MeshBasicMaterial({color: color, transparent: true, opacity: 0.3, side: DoubleSide})
	const visiblePlane = new Mesh(visiblePlaneGeometry, visiblePlaneMaterial)
	visiblePlane.visible = false
	visiblePlane.quaternion.premultiply(new Quaternion(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)))
		
	const container = new Group()
	const offset = 1
	const positionOffset = new Vector3(axis === 'x' ? offset : 0, axis === 'y' ? offset : 0, axis === 'z' ? offset : 0)
	container.position.set(positionOffset.x, positionOffset.y, positionOffset.z)
	container.quaternion.premultiply(
		axis === 'x' ? new Quaternion(0, 0, 0, 1) :
		axis === 'y' ? new Quaternion(0, 0, Math.sin(Math.PI / 4), Math.cos(Math.PI / 4)) :
		new Quaternion(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4))
	)
	container.add(ring, detectionCylinder, invisiblePlane, visiblePlane)
	return {container, ring, ringDetectionCylinder: detectionCylinder, visiblePlane, invisiblePlane}
}

const createRotationRings = (): [RotationRing, RotationRing, RotationRing] => [createRotationRing('x'), createRotationRing('y'), createRotationRing('z')]

export interface TranslationArrow {
	container: Group
	arrow: Object3D
	arrowDetectionBox: Object3D
	invisiblePlane: Object3D
	visiblePlane: Object3D
}

const createThickArrow = (radius: number, height: number, color: ColorRepresentation) => {
	const opacity = 0.7
	const cylinderHeight = height * 0.7
	const cylinderRadius = radius / 1.5
	const cylinderGeometry = new CylinderGeometry( cylinderRadius, cylinderRadius, cylinderHeight, 32 );
	const cylinderMaterial = new MeshStandardMaterial({ transparent: true, opacity, color });
	const cylinder = new Mesh(cylinderGeometry, cylinderMaterial);
	cylinder.position.set(0, cylinderHeight/2, 0)

	const coneHeight = height - cylinderHeight
	const coneRadius = radius
	const coneGeometry = new ConeGeometry(coneRadius, coneHeight, 32)
	const coneMaterial = new MeshStandardMaterial({ transparent: true, opacity, color })
	const cone = new Mesh(coneGeometry, coneMaterial)
	cone.position.set(0, cylinderHeight + coneHeight/2, 0)

	const arrow = new Group()
	arrow.add(cylinder, cone)
	return arrow
}

const createTranslationArrow = (axis: AxisString): TranslationArrow => {
	const arrowRadius = 0.2, arrowLength = 1.5
	const color = axisColor(axis)
	const arrow = createThickArrow(arrowRadius, arrowLength, color)
	arrow.quaternion.premultiply(rotationQuaternion('z', -Math.PI/2))

	const detectionBoxSize = arrowRadius * 2 * 1.3
	const detectionBoxLength = arrowLength * 1.1
	const detectionBoxGeometry = new BoxGeometry(detectionBoxLength, detectionBoxSize, detectionBoxSize)
	const detectionBoxMaterial = new MeshBasicMaterial({ transparent: true })
	const detectionBox = new Mesh(detectionBoxGeometry, detectionBoxMaterial)
	detectionBox.visible = false
	detectionBox.position.set(arrowLength/2, 0, 0)

	const invisiblePlaneGeometry = new PlaneGeometry(10, 10)
	const invisiblePlaneMaterial = new MeshBasicMaterial({ transparent: true, side: DoubleSide })
	const invisiblePlane = new Mesh(invisiblePlaneGeometry, invisiblePlaneMaterial)
	invisiblePlane.visible = false

	const visiblePlaneGeometry = new PlaneGeometry(arrowLength * 1.5, arrowRadius * 2 * 1.5)
	const visiblePlaneMaterial = new MeshBasicMaterial({ transparent: true, opacity: 0.1, color, side: DoubleSide })
	const visiblePlane = new Mesh(visiblePlaneGeometry, visiblePlaneMaterial)
	visiblePlane.visible = false
	visiblePlane.position.set(arrowLength/2, 0, 0)

	const container = new Group()
	container.add(arrow, detectionBox, invisiblePlane, visiblePlane)
	container.quaternion.premultiply(axis === 'x' ? rotationQuaternion('x', 0) : axis === 'y' ? rotationQuaternion('z', Math.PI/2) : rotationQuaternion('y', -Math.PI/2))
	const offset = 1.5
	container.position.set(axis === 'x' ? offset : 0, axis === 'y' ? offset : 0, axis === 'z' ? offset : 0)

	return {container, arrow, arrowDetectionBox: detectionBox, invisiblePlane, visiblePlane}
}

const createTranslationArrows = (): [TranslationArrow, TranslationArrow, TranslationArrow] => [createTranslationArrow('x'), createTranslationArrow('y'), createTranslationArrow('z')]

const createOriginIndicator = (radius: number) => {
	const geometry = new SphereGeometry(radius, 16, 16)
	const material = new MeshStandardMaterial({color: 0xffffff})
	const sphere = new Mesh(geometry, material)
	return sphere
}

interface ObjectControl {
	container: Group
	rings: [RotationRing, RotationRing, RotationRing]
	arrows: [TranslationArrow, TranslationArrow, TranslationArrow]
}

export const createObjectControl = (): ObjectControl => {
	const rings = createRotationRings()
	const arrows = createTranslationArrows()
	const container = new Group()
	container.add(...rings.map(r => r.container), ...arrows.map(a => a.container), createOriginIndicator(0.1))
	return {container, rings, arrows}
}
