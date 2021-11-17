import { rotationQuaternion, createBufferObject } from "./utils/three.js";
import { createSlider, createControlPanel, createOption, createButton } from "./utils/elements.js";
import { getProcessedData } from "./utils/convenience.js";
import { createMoveDropdown, createSimulationResultObject, createMarkerIndicators } from "./utils/scene_init.js";
import Arena from "./Arena.js";



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