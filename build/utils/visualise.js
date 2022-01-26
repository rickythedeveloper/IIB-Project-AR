import Arena from "../Arena.js";
import { getProcessedData } from "./convenience.js";
import { createMarkerIndicators, createMoveDropdown, createSimulationResultObject } from "./scene_init.js";
import { createRing } from "./three.js";
const USED_MARKER_COLOR = 0x00ff00, VISIBLE_UNUSED_MARKER_COLOR = 0xffff00, HIDDEN_MARKER_COLOR = 0xff0000;
const MARKER_INDICATOR_UPDATE_INTERVAL = 100;
const ROTATION_RING_RADIUS = 0.3;
const ROTATION_RING_TUBE_RADIUS = 0.05;
const ROTATION_RING_N_SEGMENTS = 16;
const createRotationRing = (axis) => {
    const color = axis === 'x' ? 0xff0000 : axis === 'y' ? 0x00ff00 : 0x0000ff;
    const ring = createRing(ROTATION_RING_RADIUS, ROTATION_RING_TUBE_RADIUS, ROTATION_RING_N_SEGMENTS, color);
    const offset = 0.7;
    const positionOffset = new THREE.Vector3(axis === 'x' ? offset : 0, axis === 'y' ? offset : 0, axis === 'z' ? offset : 0);
    ring.position.set(positionOffset.x, positionOffset.y, positionOffset.z);
    ring.quaternion.premultiply(axis === 'x' ? new THREE.Quaternion(0, 0, 0, 1) :
        axis === 'y' ? new THREE.Quaternion(0, 0, Math.sin(Math.PI / 4), Math.cos(Math.PI / 4)) :
            new THREE.Quaternion(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)));
    return ring;
};
const visualise = (setup, controlPanel, markerNumbers, markerPositions, markerQuaternions) => {
    setup.scene.add(new THREE.PointLight());
    const arena = new Arena(setup, markerNumbers, markerPositions, markerQuaternions);
    const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions);
    arena.addObjects(...markerIndicators, createRotationRing('x'), createRotationRing('y'), createRotationRing('z'));
    const simulationResultWrapper = { object: null };
    const moveDropdown = createMoveDropdown(simulationResultWrapper, arena);
    controlPanel.appendChild(moveDropdown);
    let simulationResult;
    getProcessedData().then(({ vertices, indices, colors }) => {
        simulationResult = createSimulationResultObject(vertices, indices, colors);
        simulationResultWrapper.object = simulationResult;
        arena.addObject(simulationResult);
    });
    setInterval(() => {
        for (let i = 0; i < arena.markers.length; i++) {
            markerIndicators[i].material.color.set(arena.usedMarkerIndex === i ? USED_MARKER_COLOR :
                arena.markers[i].visible ? VISIBLE_UNUSED_MARKER_COLOR :
                    HIDDEN_MARKER_COLOR);
        }
    }, MARKER_INDICATOR_UPDATE_INTERVAL);
};
export default visualise;
//# sourceMappingURL=visualise.js.map