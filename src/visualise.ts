import Arena from "./utils/Arena"
import { createMarkerIndicators } from "./utils/scene_init"
import { Setup } from "./utils/setupAR"
import { HIDDEN_MARKER_COLOR, MARKER_INDICATOR_UPDATE_INTERVAL, VISIBLE_MARKER_COLOR } from "./utils/constants"
import { MarkerInfo } from "./utils/index"
import { Object3D, PointLight } from 'three'


const visualise = (setup: Setup, markerInfos: MarkerInfo[], objects: Object3D[]) => {
	setup.scene.add(new PointLight())
	const arena = new Arena(setup, markerInfos)
	const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions)
	arena.addObjects(...markerIndicators, ...objects)

	setInterval(() => {
		for (let i = 0; i < arena.markers.length; i++) {
			markerIndicators[i].material.color.set(
				arena.markers[i].visible ? VISIBLE_MARKER_COLOR : 
				HIDDEN_MARKER_COLOR
			)
		}
	}, MARKER_INDICATOR_UPDATE_INTERVAL);
}

export default visualise
