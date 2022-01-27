import Arena from "../Arena.js"
import { getProcessedData } from "./convenience.js"
import { createMarkerIndicators, createMoveDropdown, createSimulationResultObject } from "./scene_init.js"
import { ThreeObjectWrapper } from "./index.js"
import { Setup } from "../setupAR.js"
import { createRotationRings } from "./three.js"
import { InteractionManager, InteractiveEvent } from "./interactive.js"

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
	arena.addObjects(...markerIndicators, box, ...rings.map(r => r.ringPlaneContainer))

	const interactionManager = new InteractionManager(setup.renderer, setup.camera, setup.renderer.domElement)
	rings.forEach((r, index) => {
		interactionManager.add(r.ring)

		const ringplanelistern: THREE.EventListener<THREE.Event, "mousemove", THREE.Group> = (e) => {
			console.log(e.target, e.intersection);
		}
		r.ring.addEventListener('mousedown', (event) => {
			console.log(`started moving axis ${index}`);
			interactionManager.add(r.ringPlaneContainer)
			r.ringPlaneContainer.addEventListener('mousemove', ringplanelistern)
		})
		r.ring.addEventListener('mouseup', event => {
			console.log(`ended moving axis ${index}`);
			r.ringPlaneContainer.removeEventListener('mousemove', ringplanelistern)
			interactionManager.remove(r.ringPlaneContainer)
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
