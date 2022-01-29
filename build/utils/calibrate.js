import Arena from "../Arena.js";
import { getProcessedData } from "./convenience.js";
import { createMarkerIndicators, createSimulationResultObject } from "./scene_init.js";
import { createRotationRings, createTranslationArrows } from "./three.js";
import { InteractionManager } from "./interactive.js";
import { atanAngle } from "./angle.js";
import { HIDDEN_MARKER_COLOR, MARKER_INDICATOR_UPDATE_INTERVAL, USED_MARKER_COLOR, VISIBLE_UNUSED_MARKER_COLOR } from "./constants.js";
const addCalibratableObjectToArena = (setup, arena, object) => {
    const rings = createRotationRings();
    rings.forEach(r => r.container.position.add(object.position));
    const arrows = createTranslationArrows();
    arrows.forEach(a => a.container.position.add(object.position));
    arena.addObjects(object, ...rings.map(r => r.container), ...arrows.map(a => a.container));
    const calibrationControls = [...rings.map(r => r.container), ...arrows.map(a => a.container)];
    const interactionManager = new InteractionManager(setup.renderer, setup.camera, setup.renderer.domElement);
    rings.forEach((r, index) => {
        let lastIntersecPosition = null;
        const ringplanelistern = (e) => {
            const intersection = e.intersection;
            if (!intersection)
                return;
            const intersectPosition = arena.positionFromCameraToDominant(intersection.point);
            // @ts-ignore
            const objectPosition = arena.objectPositions[object.indexInProject], objectQuaternion = arena.objectQuaternions[object.indexInProject];
            if (intersectPosition && lastIntersecPosition) {
                const intersectFromObject = intersectPosition.clone().sub(objectPosition);
                const lastIntersectFromObject = lastIntersecPosition.clone().sub(objectPosition);
                const theta = index === 0 ? atanAngle(intersectFromObject.y, intersectFromObject.z) - atanAngle(lastIntersectFromObject.y, lastIntersectFromObject.z) :
                    index === 1 ? atanAngle(intersectFromObject.z, intersectFromObject.x) - atanAngle(lastIntersectFromObject.z, lastIntersectFromObject.x) :
                        atanAngle(intersectFromObject.x, intersectFromObject.y) - atanAngle(lastIntersectFromObject.x, lastIntersectFromObject.y);
                const sin = Math.sin(theta / 2), cos = Math.cos(theta / 2);
                objectQuaternion.premultiply(new THREE.Quaternion(index === 0 ? sin : 0, index === 1 ? sin : 0, index === 2 ? sin : 0, cos));
            }
            lastIntersecPosition = intersectPosition;
        };
        interactionManager.add(r.ring);
        r.ring.addEventListener('mousedown', (event) => {
            interactionManager.add(r.container);
            r.container.addEventListener('mousemove', ringplanelistern);
            r.visiblePlane.visible = true;
        });
        r.ring.addEventListener('mouseup', event => {
            interactionManager.remove(r.container);
            r.container.removeEventListener('mousemove', ringplanelistern);
            r.visiblePlane.visible = false;
            lastIntersecPosition = null;
        });
    });
    arrows.forEach((a, index) => {
        let lastValue = null;
        const invisiblePlaneListener = (e) => {
            const intersection = e.intersection;
            if (!intersection)
                return;
            const intersectPosition = arena.positionFromCameraToDominant(intersection.point);
            if (intersectPosition === null)
                return;
            const newValue = index === 0 ? intersectPosition.x : index === 1 ? intersectPosition.y : intersectPosition.z;
            if (lastValue) {
                const delta = newValue - lastValue;
                const deltaVector = new THREE.Vector3(index === 0 ? delta : 0, index === 1 ? delta : 0, index === 2 ? delta : 0);
                // @ts-ignore
                arena.objectPositions[object.indexInProject].add(deltaVector);
                // @ts-ignore
                calibrationControls.forEach(bc => arena.objectPositions[bc.indexInProject].add(deltaVector));
            }
            lastValue = newValue;
        };
        interactionManager.add(a.arrow);
        a.arrow.addEventListener('mousedown', () => {
            const cameraPosition = arena.positionFromCameraToDominant(new THREE.Vector3(0, 0, 0));
            if (cameraPosition === null)
                return;
            // @ts-ignore
            const arrowContainerPosition = arena.objectPositions[arrows[index].container.indexInProject];
            const relativeCameraPosition = cameraPosition.clone().sub(arrowContainerPosition);
            const angle = Math.PI / 2 + (index === 0 ? atanAngle(relativeCameraPosition.y, relativeCameraPosition.z) :
                index === 1 ? atanAngle(-relativeCameraPosition.x, relativeCameraPosition.z) :
                    atanAngle(relativeCameraPosition.y, -relativeCameraPosition.x));
            arrows[index].visiblePlane.quaternion.set(Math.sin(angle / 2), 0, 0, Math.cos(angle / 2));
            arrows[index].invisiblePlane.quaternion.set(Math.sin(angle / 2), 0, 0, Math.cos(angle / 2));
            arrows[index].visiblePlane.visible = true;
            interactionManager.add(a.invisiblePlane);
            a.invisiblePlane.addEventListener('mousemove', invisiblePlaneListener);
        });
        a.arrow.addEventListener('mouseup', () => {
            arrows[index].visiblePlane.visible = false;
            interactionManager.remove(a.invisiblePlane);
            a.invisiblePlane.removeEventListener('mousemove', invisiblePlaneListener);
            lastValue = null;
        });
    });
};
const calibrate = (setup, markers, onComplete) => {
    // add light at the camera
    setup.scene.add(new THREE.PointLight());
    const arena = new Arena(setup, markers);
    const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions);
    arena.addObjects(...markerIndicators);
    const calibratableObjects = [];
    setTimeout(() => {
        calibratableObjects.forEach(o => {
            // @ts-ignore
            const position = arena.objectPositions[o.indexInProject], quaternion = arena.objectQuaternions[o.indexInProject];
            o.position.set(position.x, position.y, position.z);
            o.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        });
        arena.clean();
        onComplete(calibratableObjects);
    }, 20000);
    getProcessedData().then(({ vertices, indices, colors }) => {
        const simulationResult = createSimulationResultObject(vertices, indices, colors);
        addCalibratableObjectToArena(setup, arena, simulationResult);
        calibratableObjects.push(simulationResult);
    });
    setInterval(() => {
        for (let i = 0; i < arena.markers.length; i++) {
            markerIndicators[i].material.color.set(arena.usedMarkerIndex === i ? USED_MARKER_COLOR :
                arena.markers[i].visible ? VISIBLE_UNUSED_MARKER_COLOR :
                    HIDDEN_MARKER_COLOR);
        }
    }, MARKER_INDICATOR_UPDATE_INTERVAL);
};
export default calibrate;
//# sourceMappingURL=calibrate.js.map