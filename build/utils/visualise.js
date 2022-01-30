import Arena from "../Arena.js";
import { createMarkerIndicators } from "./scene_init.js";
import { HIDDEN_MARKER_COLOR, MARKER_INDICATOR_UPDATE_INTERVAL, VISIBLE_MARKER_COLOR } from "./constants.js";
const visualise = (setup, markerInfos, objects) => {
    setup.scene.add(new THREE.PointLight());
    const arena = new Arena(setup, markerInfos);
    const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions);
    arena.addObjects(...markerIndicators, ...objects);
    setInterval(() => {
        for (let i = 0; i < arena.markers.length; i++) {
            markerIndicators[i].material.color.set(arena.markers[i].visible ? VISIBLE_MARKER_COLOR :
                HIDDEN_MARKER_COLOR);
        }
    }, MARKER_INDICATOR_UPDATE_INTERVAL);
};
export default visualise;
//# sourceMappingURL=visualise.js.map