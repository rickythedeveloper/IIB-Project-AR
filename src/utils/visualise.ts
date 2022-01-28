import Arena from "../Arena.js"
import { getProcessedData } from "./convenience.js"
import { createMarkerIndicators, createMoveDropdown, createSimulationResultObject } from "./scene_init.js"
import { ThreeObjectWrapper } from "./index.js"
import { Setup } from "../setupAR.js"
import { createRotationRings, createTranslationArrows } from "./three.js"
import { InteractionManager, InteractiveEvent } from "./interactive.js"
import { atanAngle } from "./angle.js"

const USED_MARKER_COLOR = 0x00ff00, VISIBLE_UNUSED_MARKER_COLOR = 0xffff00, HIDDEN_MARKER_COLOR = 0xff0000
const MARKER_INDICATOR_UPDATE_INTERVAL = 100

const createTestBox = () => {
	const geometry = new THREE.BoxGeometry(1, 1, 1)
	const material = new THREE.MeshPhysicalMaterial({color: 0xffff00})
	const box = new THREE.Mesh(geometry, material)
	box.position.set(0, 0.5, 0)
	return box
}

const visualise = (setup: Setup, controlPanel: HTMLElement, markerNumbers: number[], markerPositions: THREE.Vector3[], markerQuaternions: THREE.Quaternion[]) => {
	setup.scene.add(new THREE.PointLight())

	const arena = new Arena(setup, markerNumbers, markerPositions, markerQuaternions)
	const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions)
	const box = createTestBox()
	const rings = createRotationRings()
	rings.forEach(r => r.ringPlaneContainer.position.add(box.position))
	const arrows = createTranslationArrows()
	arrows.forEach(a => a.container.position.add(box.position))
	arena.addObjects(...markerIndicators, box, ...rings.map(r => r.ringPlaneContainer), ...arrows.map(a => a.container))

	const boxControls = [...rings.map(r => r.ringPlaneContainer), ...arrows.map(a => a.container)]

	const interactionManager = new InteractionManager(setup.renderer, setup.camera, setup.renderer.domElement)
	rings.forEach((r, index) => {
		interactionManager.add(r.ring)
		let lastIntersecPosition: THREE.Vector3 | null = null
		const ringplanelistern: THREE.EventListener<THREE.Event, "mousemove", THREE.Object3D> = (e) => {
			const intersection = e.intersection as THREE.Intersection
			if (!intersection) return
			const intersectPosition = arena.positionFromCameraToDominant(intersection.point)
			// @ts-ignore
			const boxQuaternion = arena.objectQuaternions[box.indexInProject], boxPosition = arena.objectPositions[box.indexInProject]
			if (intersectPosition && lastIntersecPosition) {
				const intersectFromBox = intersectPosition.clone().sub(boxPosition)
				const lastIntersectFromBox = lastIntersecPosition.clone().sub(boxPosition)
				const theta =
					index === 0 ? atanAngle(intersectFromBox.y, intersectFromBox.z) - atanAngle(lastIntersectFromBox.y, lastIntersectFromBox.z) :
					index === 1 ? atanAngle(intersectFromBox.z, intersectFromBox.x) - atanAngle(lastIntersectFromBox.z, lastIntersectFromBox.x) :
					atanAngle(intersectFromBox.x, intersectFromBox.y) - atanAngle(lastIntersectFromBox.x, lastIntersectFromBox.y)
				const sin = Math.sin(theta/2), cos = Math.cos(theta/2)
				boxQuaternion.premultiply(new THREE.Quaternion(index === 0 ? sin : 0, index === 1 ? sin : 0, index === 2 ? sin : 0, cos))
			}
			lastIntersecPosition = intersectPosition
		}
		r.ring.addEventListener('mousedown', (event) => {
			console.log(`started moving axis ${index}`);
			interactionManager.add(r.ringPlaneContainer)
			r.ringPlaneContainer.addEventListener('mousemove', ringplanelistern)
			r.visiblePlane.visible = true
		})
		r.ring.addEventListener('mouseup', event => {
			console.log(`ended moving axis ${index}`);
			interactionManager.remove(r.ringPlaneContainer)
			r.ringPlaneContainer.removeEventListener('mousemove', ringplanelistern)
			r.visiblePlane.visible = false
			lastIntersecPosition = null
		})
	})

	arrows.forEach((a, index) => {
		interactionManager.add(a.arrow)
		let lastValue: number | null = null
		const invisiblePlaneListener: THREE.EventListener<THREE.Event, "mousemove", THREE.Object3D<THREE.Event>> = (e) => {
			const intersection = e.intersection as THREE.Intersection
			console.log(intersection);
			if (!intersection) return
			const intersectPosition = arena.positionFromCameraToDominant(intersection.point)
			if (intersectPosition === null) return
			const newValue = index === 0 ? intersectPosition.x : index === 1 ? intersectPosition.y : intersectPosition.z
			if (lastValue) {
				const delta = newValue - lastValue
				const deltaVector = new THREE.Vector3(index === 0 ? delta : 0, index === 1 ? delta : 0, index === 2 ? delta : 0)
				// @ts-ignore
				arena.objectPositions[box.indexInProject].add(deltaVector)

				boxControls.forEach(bc => {
					// @ts-ignore
					arena.objectPositions[bc.indexInProject].add(deltaVector)
				})
			}
			lastValue = newValue
		}
		a.arrow.addEventListener('mousedown', () => {
			const cameraPosition = arena.positionFromCameraToDominant(new THREE.Vector3(0, 0, 0))
			if (cameraPosition === null) return
			// @ts-ignore
			const arrowContainerPosition = arena.objectPositions[arrows[index].container.indexInProject]
			const relativeCameraPosition = cameraPosition.clone().sub(arrowContainerPosition)
			const angle = Math.PI/2 + (
				index === 0 ? atanAngle(relativeCameraPosition.y, relativeCameraPosition.z) : 
				index === 1 ? atanAngle(-relativeCameraPosition.x, relativeCameraPosition.z): 
				atanAngle(relativeCameraPosition.y, -relativeCameraPosition.x)
			)
			arrows[index].visiblePlane.visible = true
			arrows[index].visiblePlane.quaternion.set(Math.sin(angle/2), 0, 0, Math.cos(angle/2))
			arrows[index].invisiblePlane.quaternion.set(Math.sin(angle/2), 0, 0, Math.cos(angle/2))

			interactionManager.add(a.invisiblePlane)
			a.invisiblePlane.addEventListener('mousemove', invisiblePlaneListener)
		})
		a.arrow.addEventListener('mouseup', () => {
			arrows[index].visiblePlane.visible = false
			lastValue = null
			interactionManager.remove(a.invisiblePlane)
			a.invisiblePlane.removeEventListener('mousemove', invisiblePlaneListener)
		})
	})

	const simulationResultWrapper: ThreeObjectWrapper = { object: null }
	const moveDropdown = createMoveDropdown(simulationResultWrapper, arena)
	controlPanel.appendChild(moveDropdown)

	// let simulationResult;
	// getProcessedData().then(({ vertices, indices, colors }) => {
	// 	simulationResult = createSimulationResultObject(vertices, indices, colors)
	// 	simulationResultWrapper.object = simulationResult
	// 	arena.addObject(simulationResult)
	// })

	setInterval(() => {
		for (let i = 0; i < arena.markers.length; i++) {
			markerIndicators[i].material.color.set(
				arena.usedMarkerIndex === i ? USED_MARKER_COLOR : 
				arena.markers[i].visible ? VISIBLE_UNUSED_MARKER_COLOR : 
				HIDDEN_MARKER_COLOR
			)
		}
	}, MARKER_INDICATOR_UPDATE_INTERVAL);
}

export default visualise
