import Arena from "../Arena.js"
import { getProcessedData } from "./convenience.js"
import { createMarkerIndicators, createMoveDropdown, createSimulationResultObject } from "./scene_init.js"
import { ThreeObjectWrapper } from "./index.js"
import { Setup } from "../setupAR.js"

const USED_MARKER_COLOR = 0x00ff00, VISIBLE_UNUSED_MARKER_COLOR = 0xffff00, HIDDEN_MARKER_COLOR = 0xff0000
const MARKER_INDICATOR_UPDATE_INTERVAL = 100

const visualise = (setup: Setup, controlPanel: HTMLElement, markerNumbers: number[], markerPositions: THREE.Vector3[], markerQuaternions: THREE.Quaternion[]) => {
	const arena = new Arena(setup, markerNumbers, markerPositions, markerQuaternions)
	const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions)
	arena.addObjects(...markerIndicators)

	const simulationResultWrapper: ThreeObjectWrapper = { object: null }
	const moveDropdown = createMoveDropdown(simulationResultWrapper, arena)
	controlPanel.appendChild(moveDropdown)

	let simulationResult;
	getProcessedData().then(({ vertices, indices, colors }) => {
		simulationResult = createSimulationResultObject(vertices, indices, colors)
		simulationResultWrapper.object = simulationResult
		arena.addObject(simulationResult)
	})

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
