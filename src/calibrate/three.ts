import { ColorRepresentation, TubeGeometry, MeshStandardMaterial, DoubleSide, Mesh, Group, Object3D, CylinderGeometry, MeshBasicMaterial, PlaneGeometry, Quaternion, ConeGeometry, BoxGeometry, SphereGeometry, Curve, Vector3 } from "three"
import { Axis, rotationQuaternion } from "../utils/three"

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

const ROTATION_RING_RADIUS = 0.4
const ROTATION_RING_TUBE_RADIUS = 0.05
const ROTATION_RING_N_SEGMENTS = 16

const axisColor = (axis: Axis) => axis === Axis.x ? 0xff0000 : axis === Axis.y ? 0x00ff00 : 0x0000ff

const createRotationRing = (axis: Axis): RotationRing => {
	const color = axisColor(axis)

	const ring = createRing(ROTATION_RING_RADIUS, ROTATION_RING_TUBE_RADIUS, ROTATION_RING_N_SEGMENTS, color)

	const cylinderRadius = ROTATION_RING_RADIUS * 1.2
	const cylinderHeight = ROTATION_RING_TUBE_RADIUS * 1.2
	const detectionGeometry = new CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight)
	const detectionMaterial = new MeshBasicMaterial({transparent: true})
	const detectionCylinder = new Mesh(detectionGeometry, detectionMaterial)
	detectionCylinder.visible = false
	detectionCylinder.quaternion.premultiply(rotationQuaternion(Axis.z, Math.PI/2))
	
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
	container.quaternion.premultiply(
		axis === Axis.x ? new Quaternion(0, 0, 0, 1) :
		axis === Axis.y ? new Quaternion(0, 0, Math.sin(Math.PI / 4), Math.cos(Math.PI / 4)) :
		new Quaternion(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4))
	)
	container.add(ring, detectionCylinder, invisiblePlane, visiblePlane)
	return {container, ring, ringDetectionCylinder: detectionCylinder, visiblePlane, invisiblePlane}
}

const createRotationRings = (): [RotationRing, RotationRing, RotationRing] => [createRotationRing(Axis.x), createRotationRing(Axis.y), createRotationRing(Axis.z)]

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

const createTranslationArrow = (axis: Axis): TranslationArrow => {
	const arrowRadius = 0.1, arrowLength = 1
	const color = axisColor(axis)
	const arrow = createThickArrow(arrowRadius, arrowLength, color)
	arrow.quaternion.premultiply(rotationQuaternion(Axis.z, -Math.PI/2))

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
	container.quaternion.premultiply(axis === Axis.x ? rotationQuaternion(Axis.z, 0) : axis === Axis.y ? rotationQuaternion(Axis.z, Math.PI/2) : rotationQuaternion(Axis.y, -Math.PI/2))

	return {container, arrow, arrowDetectionBox: detectionBox, invisiblePlane, visiblePlane}
}

const createTranslationArrows = (): [TranslationArrow, TranslationArrow, TranslationArrow] => [createTranslationArrow(Axis.x), createTranslationArrow(Axis.y), createTranslationArrow(Axis.z)]

const createOriginIndicator = (radius: number) => {
	const geometry = new SphereGeometry(radius, 16, 16)
	const material = new MeshStandardMaterial({color: 0xffffff})
	const sphere = new Mesh(geometry, material)
	return sphere
}

export interface ObjectControl {
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
