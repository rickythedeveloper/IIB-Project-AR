import Arena from "../Arena.js";
import { getProcessedData } from "./convenience.js";
import { createMarkerIndicators, createSimulationResultObject } from "./scene_init.js";
import { Axis, createObjectControl } from "./three.js";
import { InteractionManager } from "./interactive.js";
import { atanAngle } from "./angle.js";
import { HIDDEN_MARKER_COLOR, MARKER_INDICATOR_UPDATE_INTERVAL, USED_MARKER_COLOR, VISIBLE_UNUSED_MARKER_COLOR } from "./constants.js";
const createObjectControlForObject = (object, interactionManager, getPositionToUpdate, getQuaternionToUpdate, worldToRelevant) => {
    const objectControl = createObjectControl();
    objectControl.container.position.add(object.position);
    const rings = objectControl.rings;
    const arrows = objectControl.arrows;
    let controlIsBusy = false;
    const registerRing = (r, axis) => {
        let lastIntersecPosition = null;
        const rotationListener = (e) => {
            const intersection = e.intersection;
            if (!intersection)
                return;
            const intersectPosition = worldToRelevant(intersection.point);
            const objectPosition = getPositionToUpdate(object).clone(), objectQuaternion = getQuaternionToUpdate(object);
            if (intersectPosition && lastIntersecPosition) {
                const intersectFromObject = intersectPosition.clone().sub(objectPosition);
                const lastIntersectFromObject = lastIntersecPosition.clone().sub(objectPosition);
                const theta = axis === Axis.x ? atanAngle(intersectFromObject.y, intersectFromObject.z) - atanAngle(lastIntersectFromObject.y, lastIntersectFromObject.z) :
                    axis === Axis.y ? atanAngle(intersectFromObject.z, intersectFromObject.x) - atanAngle(lastIntersectFromObject.z, lastIntersectFromObject.x) :
                        atanAngle(intersectFromObject.x, intersectFromObject.y) - atanAngle(lastIntersectFromObject.x, lastIntersectFromObject.y);
                const sin = Math.sin(theta / 2), cos = Math.cos(theta / 2);
                objectQuaternion.premultiply(new THREE.Quaternion(axis === Axis.x ? sin : 0, axis === Axis.y ? sin : 0, axis === Axis.z ? sin : 0, cos));
            }
            lastIntersecPosition = intersectPosition;
        };
        interactionManager.add(r.ring);
        r.ring.addEventListener('mousedown', (event) => {
            if (controlIsBusy)
                return;
            interactionManager.add(r.invisiblePlane);
            r.invisiblePlane.addEventListener('mousemove', rotationListener);
            r.visiblePlane.visible = true;
            controlIsBusy = true;
        });
        r.ring.addEventListener('mouseup', event => {
            interactionManager.remove(r.invisiblePlane);
            r.invisiblePlane.removeEventListener('mousemove', rotationListener);
            r.visiblePlane.visible = false;
            lastIntersecPosition = null;
            controlIsBusy = false;
        });
    };
    const registerArrow = (a, axis) => {
        let lastValue = null;
        const translationListener = (e) => {
            const intersection = e.intersection;
            if (!intersection)
                return;
            const intersectPosition = worldToRelevant(intersection.point);
            if (intersectPosition === null)
                return;
            const newValue = axis === Axis.x ? intersectPosition.x : axis === Axis.y ? intersectPosition.y : intersectPosition.z;
            if (lastValue) {
                const delta = newValue - lastValue;
                const deltaVector = new THREE.Vector3(axis === Axis.x ? delta : 0, axis === Axis.y ? delta : 0, axis === Axis.z ? delta : 0);
                getPositionToUpdate(object).add(deltaVector);
                getPositionToUpdate(objectControl.container).add(deltaVector);
            }
            lastValue = newValue;
        };
        interactionManager.add(a.arrow);
        a.arrow.addEventListener('mousedown', () => {
            if (controlIsBusy)
                return;
            const cameraPosition = worldToRelevant(new THREE.Vector3(0, 0, 0));
            if (cameraPosition === null)
                return;
            const objectPosition = getPositionToUpdate(object).clone();
            const relativeCameraPosition = cameraPosition.clone().sub(objectPosition);
            const angle = Math.PI / 2 + (axis === Axis.x ? atanAngle(relativeCameraPosition.y, relativeCameraPosition.z) :
                axis === Axis.y ? atanAngle(-relativeCameraPosition.x, relativeCameraPosition.z) :
                    atanAngle(relativeCameraPosition.y, -relativeCameraPosition.x));
            a.visiblePlane.quaternion.set(Math.sin(angle / 2), 0, 0, Math.cos(angle / 2));
            a.invisiblePlane.quaternion.set(Math.sin(angle / 2), 0, 0, Math.cos(angle / 2));
            a.visiblePlane.visible = true;
            interactionManager.add(a.invisiblePlane);
            a.invisiblePlane.addEventListener('mousemove', translationListener);
            controlIsBusy = true;
        });
        a.arrow.addEventListener('mouseup', () => {
            a.visiblePlane.visible = false;
            interactionManager.remove(a.invisiblePlane);
            a.invisiblePlane.removeEventListener('mousemove', translationListener);
            lastValue = null;
            controlIsBusy = false;
        });
    };
    rings.forEach((r, index) => {
        const axis = index === 0 ? Axis.x : index === 1 ? Axis.y : Axis.z;
        registerRing(r, axis);
    });
    arrows.forEach((a, index) => {
        const axis = index === 0 ? Axis.x : index === 1 ? Axis.y : Axis.z;
        registerArrow(a, axis);
    });
    return objectControl;
};
const calibrate = (setup, markers, onComplete) => {
    // add light at the camera
    setup.scene.add(new THREE.PointLight());
    const arena = new Arena(setup, markers);
    const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions);
    arena.addObjects(...markerIndicators);
    const calibratableObjects = [];
    const interactionManager = new InteractionManager(setup.renderer, setup.camera, setup.renderer.domElement);
    setTimeout(() => {
        calibratableObjects.forEach(o => {
            const objectIndex = arena.objectIndices[o.uuid];
            const position = arena.objectPositions[objectIndex], quaternion = arena.objectQuaternions[objectIndex];
            o.position.set(position.x, position.y, position.z);
            o.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        });
        arena.clean();
        onComplete(calibratableObjects);
    }, 50000);
    getProcessedData().then(({ vertices, indices, colors }) => {
        const simulationResult = createSimulationResultObject(vertices, indices, colors);
        const objectControl = createObjectControlForObject(simulationResult, interactionManager, (object) => {
            const objectIndex = arena.objectIndices[object.uuid];
            return arena.objectPositions[objectIndex];
        }, (object) => {
            const objectIndex = arena.objectIndices[object.uuid];
            return arena.objectQuaternions[objectIndex];
        }, (worldCoords) => {
            const position = arena.positionFromCameraToDominant(worldCoords);
            if (position === null)
                throw new Error(`Could not convert position ${worldCoords} from camera frame to dominant marker frame`);
            return position;
        });
        arena.addObjects(simulationResult, objectControl.container);
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