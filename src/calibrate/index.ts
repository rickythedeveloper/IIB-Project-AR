import { Object3D, PointLight, Mesh } from 'three'
import Arena from "../utils/Arena"
import { createMarkerIndicators } from "../utils/scene_init"
import { Setup } from "../utils/setupAR"
import { InteractionManager } from "../utils/interactive"
import { HIDDEN_MARKER_COLOR, MARKER_INDICATOR_UPDATE_INTERVAL, VISIBLE_MARKER_COLOR } from "../utils/constants"
import { MarkerInfo } from "../utils/index"
import { createFileUpload, createObjectControlForObject } from './utils'

const calibrate = (setup: Setup, markers: MarkerInfo[], onComplete: (objects: Object3D[]) => void, controlPanel: HTMLDivElement) => {
	setup.scene.add(new PointLight())

	const arena = new Arena(setup, markers)
	const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions)
	arena.addObjects(...markerIndicators)

	const calibratableObjects: Object3D[] = []
	const interactionManager = new InteractionManager(setup.renderer, setup.camera, setup.renderer.domElement)
	
	controlPanel.appendChild(createFileUpload((object) => addCalibratableObject(object)))

	setTimeout(() => {
		calibratableObjects.forEach(o => {
			const objectIndex = arena.objectIndices[o.uuid]
			const position = arena.arenaObjects[objectIndex].positionInArena, quaternion = arena.arenaObjects[objectIndex].quaternionInArena
			o.position.set(position.x, position.y, position.z)
			o.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
		})
		arena.clean()
		onComplete(calibratableObjects)
	}, 30000)

	const addCalibratableObject = (object: Mesh) => {
		const objectControl = createObjectControlForObject(
			object, 
			interactionManager, 
			(o) => {
				const objectIndex = arena.objectIndices[o.uuid]
				return arena.arenaObjects[objectIndex].positionInArena
			}, 
			(o) => {
				const objectIndex = arena.objectIndices[o.uuid]
				return arena.arenaObjects[objectIndex].quaternionInArena
			},
			(worldCoords) => {
				const position = arena.positionFromCameraToDominant(worldCoords)
				if (position === null) throw new Error(`Could not convert position ${worldCoords} from camera frame to dominant marker frame`)
				return position
			}
		)
		arena.addObjects(object, objectControl.container)
		calibratableObjects.push(object)
	}

	// getProcessedData().then(({ vertices, indices, colors }) => {
	// 	const simulationResult = createSimulationResultObject(vertices, indices, colors)
	// 	addCalibratableObject(simulationResult)
	// })

	setInterval(() => {
		for (let i = 0; i < arena.markers.length; i++) {
			markerIndicators[i].material.color.set(
				arena.markers[i].visible ? VISIBLE_MARKER_COLOR : 
				HIDDEN_MARKER_COLOR
			)
		}
	}, MARKER_INDICATOR_UPDATE_INTERVAL);
}

export default calibrate