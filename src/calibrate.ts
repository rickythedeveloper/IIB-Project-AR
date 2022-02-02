import { Object3D, Vector3, Quaternion, PointLight, Mesh, MeshLambertMaterial } from 'three'
import { VTKLoader } from 'three/examples/jsm/loaders/VTKLoader.js'
import Arena from "./utils/Arena"
import { getProcessedData } from "./utils/convenience"
import { createMarkerIndicators, createSimulationResultObject } from "./utils/scene_init"
import { Setup } from "./utils/setupAR"
import { Axis, createObjectControl, ObjectControl, RotationRing, TranslationArrow } from "./utils/three"
import { InteractionManager, InteractiveEvent2, PinchEvent } from "./utils/interactive"
import { atanAngle } from "./utils/angle"
import { HIDDEN_MARKER_COLOR, MARKER_INDICATOR_UPDATE_INTERVAL, VISIBLE_MARKER_COLOR } from "./utils/constants"
import { MarkerInfo, ThreeObjectWrapper } from "./utils/index"

const updateControlPosition = (object: Mesh, objectControl: ObjectControl) => {
	const rings = objectControl.rings
	const arrows = objectControl.arrows
	object.geometry.computeBoundingSphere()
	const boundingSphere = object.geometry.boundingSphere
	if (boundingSphere) {
		const radiusMultiplierRing = 1.2, radiusMultiplierArrow = 1.5
		const center = boundingSphere.center, radius =  boundingSphere.radius * object.scale.x // assumes same scale in each dimension
		rings[0].container.position.set(center.x + radius * radiusMultiplierRing, center.y, center.z)
		rings[1].container.position.set(center.x, center.y + radius * radiusMultiplierRing, center.z)
		rings[2].container.position.set(center.x, center.y, center.z + radius * radiusMultiplierRing)
		arrows[0].container.position.set(center.x + radius * radiusMultiplierArrow, center.y, center.z)
		arrows[1].container.position.set(center.x, center.y + radius * radiusMultiplierArrow, center.z)
		arrows[2].container.position.set(center.x, center.y, center.z + radius * radiusMultiplierArrow)

		rings.forEach(r => r.container.scale.setScalar(radius * 2)) // control can be made to fit an object of radius of 0.5
		arrows.forEach(a => a.container.scale.setScalar(radius * 2))
	} else {
		const ringOffset = 1, arrowOffset = 1.5
		rings[0].container.position.set(ringOffset, 0, 0)
		rings[1].container.position.set(0, ringOffset, 0)
		rings[2].container.position.set(0, 0, ringOffset)
		arrows[0].container.position.set(arrowOffset, 0, 0)
		arrows[1].container.position.set(0, arrowOffset, 0)
		arrows[2].container.position.set(0, 0, arrowOffset)
	}

}

const createObjectControlForObject = (
	object: Mesh, 
	interactionManager: InteractionManager, 
	getPositionToUpdate: (object: Object3D) => Vector3, 
	getQuaternionToUpdate: (object: Object3D) => Quaternion, 
	worldToRelevant: (worldCoords: Vector3) => Vector3
) => {
	const objectControl = createObjectControl()
	objectControl.container.position.add(object.position)
	const rings = objectControl.rings
	const arrows = objectControl.arrows
	updateControlPosition(object, objectControl)

	let controlIsBusy = false

	const registerRing = (
		r: RotationRing, 
		axis: Axis, 
	) => {
		let lastIntersecPosition: Vector3 | null = null
		const rotationListener = (e: InteractiveEvent2<'mousemove'>) => {
			const intersection = e.intersection
			if (!intersection) return
			const intersectPosition = worldToRelevant(intersection.point)
			const objectPosition = getPositionToUpdate(object).clone(), objectQuaternion = getQuaternionToUpdate(object)
			if (intersectPosition && lastIntersecPosition) {
				const intersectFromObject = intersectPosition.clone().sub(objectPosition)
				const lastIntersectFromObject = lastIntersecPosition.clone().sub(objectPosition)
				const theta =
					axis === Axis.x ? atanAngle(intersectFromObject.y, intersectFromObject.z) - atanAngle(lastIntersectFromObject.y, lastIntersectFromObject.z) :
					axis === Axis.y ? atanAngle(intersectFromObject.z, intersectFromObject.x) - atanAngle(lastIntersectFromObject.z, lastIntersectFromObject.x) :
					atanAngle(intersectFromObject.x, intersectFromObject.y) - atanAngle(lastIntersectFromObject.x, lastIntersectFromObject.y)
				const sin = Math.sin(theta/2), cos = Math.cos(theta/2)
				objectQuaternion.premultiply(new Quaternion(axis === Axis.x ? sin : 0, axis === Axis.y ? sin : 0, axis === Axis.z ? sin : 0, cos))
			}
			lastIntersecPosition = intersectPosition
		}
		interactionManager.add(r.ringDetectionCylinder, 'mousedown')
		interactionManager.add(r.ringDetectionCylinder, 'mouseup', false);
		(r.ringDetectionCylinder as Object3D<InteractiveEvent2<'mousedown'>>).addEventListener('mousedown', (event) => {
			if (controlIsBusy) return
			interactionManager.add(r.invisiblePlane, 'mousemove');
			(r.invisiblePlane as Object3D<InteractiveEvent2<'mousemove'>>).addEventListener('mousemove', rotationListener)
			r.visiblePlane.visible = true
			controlIsBusy = true
		});
		(r.ringDetectionCylinder as Object3D<InteractiveEvent2<'mouseup'>>).addEventListener('mouseup', event => {
			interactionManager.remove(r.invisiblePlane, 'mousemove');
			(r.invisiblePlane as Object3D<InteractiveEvent2<'mousemove'>>).removeEventListener('mousemove', rotationListener)
			r.visiblePlane.visible = false
			lastIntersecPosition = null
			controlIsBusy = false
		})
	}

	const registerArrow = (a: TranslationArrow, axis: Axis) => {
		let lastValue: number | null = null
		const translationListener = (e: InteractiveEvent2<'mousemove'>) => {
			const intersection = e.intersection
			if (!intersection) return
			const intersectPosition = worldToRelevant(intersection.point)
			if (intersectPosition === null) return
			const newValue = axis === Axis.x ? intersectPosition.x : axis === Axis.y ? intersectPosition.y : intersectPosition.z
			if (lastValue) {
				const delta = newValue - lastValue
				const deltaVector = new Vector3(axis === Axis.x ? delta : 0, axis === Axis.y ? delta : 0, axis === Axis.z ? delta : 0)
				getPositionToUpdate(object).add(deltaVector)
				getPositionToUpdate(objectControl.container).add(deltaVector)
			}
			lastValue = newValue
		}
		interactionManager.add(a.arrowDetectionBox, 'mousedown')
		interactionManager.add(a.arrowDetectionBox, 'mouseup', false)
		a.arrowDetectionBox.addEventListener('mousedown', () => {
			if (controlIsBusy) return
			const cameraPosition = worldToRelevant(new Vector3(0, 0, 0))
			if (cameraPosition === null) return
			const objectPosition = getPositionToUpdate(object).clone()
			const relativeCameraPosition = cameraPosition.clone().sub(objectPosition)
			const angle = Math.PI/2 + (
				axis === Axis.x ? atanAngle(relativeCameraPosition.y, relativeCameraPosition.z) : 
				axis === Axis.y ? atanAngle(-relativeCameraPosition.x, relativeCameraPosition.z): 
				atanAngle(relativeCameraPosition.y, -relativeCameraPosition.x)
			)
			a.visiblePlane.quaternion.set(Math.sin(angle/2), 0, 0, Math.cos(angle/2))
			a.invisiblePlane.quaternion.set(Math.sin(angle/2), 0, 0, Math.cos(angle/2))
			
			a.visiblePlane.visible = true
			interactionManager.add(a.invisiblePlane, 'mousemove');
			(a.invisiblePlane as Object3D<InteractiveEvent2<'mousemove'>>).addEventListener('mousemove', translationListener)
			controlIsBusy = true
		})
		a.arrowDetectionBox.addEventListener('mouseup', () => {
			a.visiblePlane.visible = false
			interactionManager.remove(a.invisiblePlane, 'mousemove');
			(a.invisiblePlane as Object3D<InteractiveEvent2<'mousemove'>>).removeEventListener('mousemove', translationListener)
			lastValue = null
			controlIsBusy = false
		})
	}

	rings.forEach((r, index) => {
		const axis = index === 0 ? Axis.x : index === 1 ? Axis.y : Axis.z
		registerRing(r, axis)
	})

	arrows.forEach((a, index) => {
		const axis = index === 0 ? Axis.x : index === 1 ? Axis.y : Axis.z
		registerArrow(a, axis)
	})

	interactionManager.add(object, 'pinch');
	(object as Object3D as Object3D<PinchEvent>).addEventListener('pinch', (e: PinchEvent) => {
		object.scale.multiplyScalar(e.deltaScale)
		updateControlPosition(object, objectControl)
	})

	return objectControl
}

const calibrate = (setup: Setup, markers: MarkerInfo[], onComplete: (objects: Object3D[]) => void) => {
	// add light at the camera
	setup.scene.add(new PointLight())

	const arena = new Arena(setup, markers)
	const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions)
	arena.addObjects(...markerIndicators)

	const calibratableObjects: Object3D[] = []
	const interactionManager = new InteractionManager(setup.renderer, setup.camera, setup.renderer.domElement)

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

	const loader = new VTKLoader();
	loader.load( 'data/bunny.vtk', function ( geometry ) {
		geometry.center();
		geometry.computeVertexNormals();
		const material = new MeshLambertMaterial( { color: 0xffffff } );
		const mesh = new Mesh( geometry, material );
		mesh.position.set(0, 1, 0);
		mesh.scale.multiplyScalar(3);
		addCalibratableObject(mesh)
	});

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