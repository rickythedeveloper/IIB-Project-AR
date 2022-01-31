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

export const createArrow = (direction: AxisString, length: number, colorHex: string) => new THREE.ArrowHelper(
	new THREE.Vector3(direction === 'x' ? 1 : 0, direction === 'y' ? 1 : 0, direction === 'z' ? 1 : 0),
	new THREE.Vector3(0, 0, 0),
	length,
	colorHex
)

export const rotationQuaternion = (direction: AxisString, angle: number) => new THREE.Quaternion(
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
	const geometry = new THREE.BufferGeometry()
	geometry.index = new THREE.BufferAttribute(indices, 1)
	geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
	geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

	const material = new THREE.ShaderMaterial({
		vertexShader,
		fragmentShader: fragmentShader(0.8),
		transparent: true,
		side: THREE.DoubleSide
	})

	const mesh = new THREE.Mesh(geometry, material)
	return mesh
}

export const createMarkerIndicator = (color: number, opacity: number) => {
	const geometry = new THREE.PlaneGeometry(1, 1)
	const material = new THREE.MeshBasicMaterial({ color, opacity, side: THREE.DoubleSide })
	const mesh = new THREE.Mesh(geometry, material)
	mesh.quaternion.set(Math.sin(Math.PI / 4), 0, 0, Math.cos(Math.PI / 4))
	return mesh
}

export const createLine = (color: number) => {
	const geometry = new THREE.BufferGeometry()
	geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Array(6).fill(0)), 3))
	const material = new THREE.LineBasicMaterial({ color })
	const mesh = new THREE.Line(geometry, material)
	return mesh
}

class Circle3D extends THREE.Curve<THREE.Vector3> {
	constructor(public radius: number) {
		super()
	}

	getPoint(t: number, optionalTarget = new THREE.Vector3()) {
		const tx = 0
		const ty = this.radius * Math.sin(2 * Math.PI * t)
		const tz = this.radius * Math.cos(2 * Math.PI * t)
		return optionalTarget.set(tx, ty, tz)
	}
}

export const createRing = (ringRadius: number, tubeRadius: number, nSegments: number, color: THREE.ColorRepresentation) => {
	const circle = new Circle3D(ringRadius)
	const geometry = new THREE.TubeGeometry(circle, nSegments, tubeRadius, 8, true)
	const material = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.7, color, side: THREE.DoubleSide })
	const mesh = new THREE.Mesh(geometry, material)
	return mesh
}


export interface RotationRing {
	container: THREE.Group
	ring: THREE.Object3D
	ringDetectionCylinder: THREE.Object3D
	visiblePlane: THREE.Object3D
	invisiblePlane: THREE.Object3D
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
	const detectionGeometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight)
	const detectionMaterial = new THREE.MeshBasicMaterial({transparent: true})
	const detectionCylinder = new THREE.Mesh(detectionGeometry, detectionMaterial)
	detectionCylinder.visible = false
	detectionCylinder.quaternion.premultiply(rotationQuaternion('z', Math.PI/2))
	
	const invisiblePlaneGeometry = new THREE.PlaneGeometry(20, 20)
	const invisiblePlaneMaterial = new THREE.MeshBasicMaterial({transparent: true, side: THREE.DoubleSide})
	const invisiblePlane = new THREE.Mesh(invisiblePlaneGeometry, invisiblePlaneMaterial)
	invisiblePlane.visible = false
	invisiblePlane.quaternion.premultiply(new THREE.Quaternion(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)))

	const visiblePlaneGeometry = new THREE.PlaneGeometry(3, 3)
	const visiblePlaneMaterial = new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: 0.3, side: THREE.DoubleSide})
	const visiblePlane = new THREE.Mesh(visiblePlaneGeometry, visiblePlaneMaterial)
	visiblePlane.visible = false
	visiblePlane.quaternion.premultiply(new THREE.Quaternion(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)))
		
	const container = new THREE.Group()
	const offset = 1
	const positionOffset = new THREE.Vector3(axis === 'x' ? offset : 0, axis === 'y' ? offset : 0, axis === 'z' ? offset : 0)
	container.position.set(positionOffset.x, positionOffset.y, positionOffset.z)
	container.quaternion.premultiply(
		axis === 'x' ? new THREE.Quaternion(0, 0, 0, 1) :
		axis === 'y' ? new THREE.Quaternion(0, 0, Math.sin(Math.PI / 4), Math.cos(Math.PI / 4)) :
		new THREE.Quaternion(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4))
	)
	container.add(ring, detectionCylinder, invisiblePlane, visiblePlane)
	return {container, ring, ringDetectionCylinder: detectionCylinder, visiblePlane, invisiblePlane}
}

const createRotationRings = (): [RotationRing, RotationRing, RotationRing] => [createRotationRing('x'), createRotationRing('y'), createRotationRing('z')]

export interface TranslationArrow {
	container: THREE.Group
	arrow: THREE.Object3D
	arrowDetectionBox: THREE.Object3D
	invisiblePlane: THREE.Object3D
	visiblePlane: THREE.Object3D
}

const createThickArrow = (radius: number, height: number, color: THREE.ColorRepresentation) => {
	const opacity = 0.7
	const cylinderHeight = height * 0.7
	const cylinderRadius = radius / 1.5
	const cylinderGeometry = new THREE.CylinderGeometry( cylinderRadius, cylinderRadius, cylinderHeight, 32 );
	const cylinderMaterial = new THREE.MeshStandardMaterial({ transparent: true, opacity, color });
	const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
	cylinder.position.set(0, cylinderHeight/2, 0)

	const coneHeight = height - cylinderHeight
	const coneRadius = radius
	const coneGeometry = new THREE.ConeGeometry(coneRadius, coneHeight, 32)
	const coneMaterial = new THREE.MeshStandardMaterial({ transparent: true, opacity, color })
	const cone = new THREE.Mesh(coneGeometry, coneMaterial)
	cone.position.set(0, cylinderHeight + coneHeight/2, 0)

	const arrow = new THREE.Group()
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
	const detectionBoxGeometry = new THREE.BoxGeometry(detectionBoxLength, detectionBoxSize, detectionBoxSize)
	const detectionBoxMaterial = new THREE.MeshBasicMaterial({ transparent: true })
	const detectionBox = new THREE.Mesh(detectionBoxGeometry, detectionBoxMaterial)
	detectionBox.visible = false
	detectionBox.position.set(arrowLength/2, 0, 0)

	const invisiblePlaneGeometry = new THREE.PlaneGeometry(10, 10)
	const invisiblePlaneMaterial = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide })
	const invisiblePlane = new THREE.Mesh(invisiblePlaneGeometry, invisiblePlaneMaterial)
	invisiblePlane.visible = false

	const visiblePlaneGeometry = new THREE.PlaneGeometry(arrowLength * 1.5, arrowRadius * 2 * 1.5)
	const visiblePlaneMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.1, color, side: THREE.DoubleSide })
	const visiblePlane = new THREE.Mesh(visiblePlaneGeometry, visiblePlaneMaterial)
	visiblePlane.visible = false
	visiblePlane.position.set(arrowLength/2, 0, 0)

	const container = new THREE.Group()
	container.add(arrow, detectionBox, invisiblePlane, visiblePlane)
	container.quaternion.premultiply(axis === 'x' ? rotationQuaternion('x', 0) : axis === 'y' ? rotationQuaternion('z', Math.PI/2) : rotationQuaternion('y', -Math.PI/2))
	const offset = 1.5
	container.position.set(axis === 'x' ? offset : 0, axis === 'y' ? offset : 0, axis === 'z' ? offset : 0)

	return {container, arrow, arrowDetectionBox: detectionBox, invisiblePlane, visiblePlane}
}

const createTranslationArrows = (): [TranslationArrow, TranslationArrow, TranslationArrow] => [createTranslationArrow('x'), createTranslationArrow('y'), createTranslationArrow('z')]

const createOriginIndicator = (radius: number) => {
	const geometry = new THREE.SphereGeometry(radius, 16, 16)
	const material = new THREE.MeshStandardMaterial({color: 0xffffff})
	const sphere = new THREE.Mesh(geometry, material)
	return sphere
}

interface ObjectControl {
	container: THREE.Group
	rings: [RotationRing, RotationRing, RotationRing]
	arrows: [TranslationArrow, TranslationArrow, TranslationArrow]
}

export const createObjectControl = (): ObjectControl => {
	const rings = createRotationRings()
	const arrows = createTranslationArrows()
	const container = new THREE.Group()
	container.add(...rings.map(r => r.container), ...arrows.map(a => a.container), createOriginIndicator(0.1))
	return {container, rings, arrows}
}
