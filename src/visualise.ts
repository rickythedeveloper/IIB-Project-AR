import Arena from './utils/Arena'
import { createMarkerIndicators } from './three_utils/convenience'
import setupAR from './utils/setupAR'
import { HIDDEN_MARKER_COLOR, MARKER_INDICATOR_UPDATE_INTERVAL, VISIBLE_MARKER_COLOR } from './constants'
import { MarkerInfo } from './utils'
import { Object3D, PointLight } from 'three'

const visualise = (markerInfos: MarkerInfo[], objects: Object3D[]) => {
	const setup = setupAR()
	setup.scene.add(new PointLight())
	const arena = new Arena(setup, markerInfos)
	const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions)
	arena.addObjects(...markerIndicators, ...objects)

	setInterval(() => {
		for (let i = 0; i < arena.markers.length; i++) {
			markerIndicators[i].material.color.set(arena.markers[i].visible ? VISIBLE_MARKER_COLOR : HIDDEN_MARKER_COLOR)
		}
	}, MARKER_INDICATOR_UPDATE_INTERVAL)
}

export default visualise
