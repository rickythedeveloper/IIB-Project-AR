import Arena from "../Arena.js"
import { createMarkerIndicators } from "./scene_init.js"
import { Setup } from "../setupAR.js"
import { HIDDEN_MARKER_COLOR, MARKER_INDICATOR_UPDATE_INTERVAL, USED_MARKER_COLOR, VISIBLE_UNUSED_MARKER_COLOR } from "./constants.js"
import { MarkerInfo } from "./index.js"

const visualise = (setup: Setup, markerInfos: MarkerInfo[], objects: THREE.Object3D[]) => {
	setup.scene.add(new THREE.PointLight())
	const arena = new Arena(setup, markerInfos)
	const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions)
	arena.addObjects(...markerIndicators, ...objects)

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
