import { Object3D, Quaternion, Vector3 } from 'three'
import { atanAngle } from '../maths/angle'
import { Axis } from '../three_utils'
import { InteractionManager, InteractiveEvent2, PinchEvent } from '../utils/interactive'
import { ObjectControl, RotationRing, TranslationArrow, createObjectControl } from './three'

const updateControlPosition = (object: Object3D, objectControl: ObjectControl) => {
	const rings = objectControl.rings
	const arrows = objectControl.arrows
	const ringOffset = 1, arrowOffset = 1.5
	rings[0].container.position.set(ringOffset, 0, 0)
	rings[1].container.position.set(0, ringOffset, 0)
	rings[2].container.position.set(0, 0, ringOffset)
	arrows[0].container.position.set(arrowOffset, 0, 0)
	arrows[1].container.position.set(0, arrowOffset, 0)
	arrows[2].container.position.set(0, 0, arrowOffset)
}

export const createObjectControlForObject = (
	object: Object3D,
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

	const registerRing = (r: RotationRing, axis: Axis) => {
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
		(r.ringDetectionCylinder as Object3D<InteractiveEvent2<'mousedown'>>).addEventListener('mousedown', () => {
			if (controlIsBusy) return
			interactionManager.add(r.invisiblePlane, 'mousemove');
			(r.invisiblePlane as Object3D<InteractiveEvent2<'mousemove'>>).addEventListener('mousemove', rotationListener)
			r.visiblePlane.visible = true
			controlIsBusy = true
		});
		(r.ringDetectionCylinder as Object3D<InteractiveEvent2<'mouseup'>>).addEventListener('mouseup', () => {
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

interface FileInfo {
	arrayBuffer: ArrayBuffer
	name: string
}

export const createFileUpload = (onComplete: (fileInfos: FileInfo[]) => void) => {
	const input = document.createElement('input')
	input.type = 'file'
	input.setAttribute('multiple', '')
	input.onchange = () => {
		if (input.files === null) return
		const fileInfos: FileInfo[] = []
		for (let i = 0; i < input.files.length; i++) {
			const file = input.files[i]
			const reader = new FileReader()
			reader.onload = () => {
				fileInfos.push({ arrayBuffer: reader.result as ArrayBuffer, name: file.name })
				if (input.files !== null && fileInfos.length === input.files.length) onComplete(fileInfos)
			}
			reader.readAsArrayBuffer(file)
		}
	}
	return input
}

export const getFileExtension = (fileName: string): string => {
	const splits = fileName.split('.')
	return splits[splits.length-1]
}