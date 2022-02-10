import { Setup, createMarker } from './setupAR'
import { getAverageQuaternion } from './arrays'
import { MarkerInfo } from './index'
import { Object3D, Quaternion, Vector3 } from 'three'

interface ArenaObject {
	object: Object3D
	positionInArena: Vector3
	quaternionInArena: Quaternion
}

export default class Arena {
	setup: Setup
	markers: Object3D[] = []
	markerPositions: Vector3[]
	markerQuaternions: Quaternion[]
	objectIndices: {[objectUUID: string]: number} = {}
	arenaObjects: ArenaObject[] = []

	constructor(setup: Setup, markerInfos: MarkerInfo[]) {
		const markerNumbers = markerInfos.map(m => m.number), markerPositions = markerInfos.map(m => m.position), markerQuaternions = markerInfos.map(m => m.quaternion)
		this.setup = setup
		this.markerPositions = markerPositions
		this.markerQuaternions = markerQuaternions

		this._addMarkers(markerNumbers)

		setInterval(this._mainLoop.bind(this), 50)
	}

	get visibleMarkerPositions() {
		return this.markerPositions.filter((_, index) => this.markers[index].visible)
	}

	findClosestVisibleMarkerIndex(position: Vector3) {
		let minD: number | null = null, minDIndex: number | null = null
		for (let i = 0; i < this.markers.length; i++) {
			if (!this.markers[i].visible) continue
			const d = this.markerPositions[i].distanceTo(position)
			if (minD === null || d < minD) {
				minD = d
				minDIndex = i
			}
		}
		return minDIndex
	}

	/**
	 * object.position and object.quaternion should be in the frame of the dominant marker
	 */
	addObject(object: Object3D) {
		this.objectIndices[object.uuid] = this.arenaObjects.length
		const arenaObject = {
			object,
			positionInArena: object.position.clone(),
			quaternionInArena: object.quaternion.clone(),
		}
		this.arenaObjects.push(arenaObject)
	}

	addObjects(...objects: Object3D[]) {
		objects.forEach(object => this.addObject(object))
	}

	clean() {
		this.setup.scene.children.forEach(child => { if (child.uuid !== this.setup.camera.uuid) this.setup.scene.remove(child) })
		this.arenaObjects.forEach(ao => ao.object.removeFromParent())
		this.setup.camera.clear()
	}

	/**
	 * Convert a position from the camera coordinates to the frame of the dominant marker
	 */
	positionFromCameraToDominant(position: Vector3) {
		let markerIndex: number | null = null
		for (let i = 0; i < this.markers.length; i++) {
			if (this.markers[i].visible) {
				markerIndex = i
				break
			}
		}
		if (markerIndex === null) return null

		const marker = this.markers[markerIndex]
		const worldPosition = new Vector3(), worldQuaternion = new Quaternion()
		marker.getWorldPosition(worldPosition)
		marker.getWorldQuaternion(worldQuaternion)

		// 0: camera, 1: dominant marker: 2: visible marker
		const q020 = worldQuaternion.clone()
		const q121 = this.markerQuaternions[markerIndex].clone()
		const q010 = q020.clone().multiply(q121.clone().invert())
		const p020 = worldPosition.clone()
		const p121 = this.markerPositions[markerIndex]
		const p211 = p121.clone().multiplyScalar(-1)
		const p010 = p020.clone().add(p211.clone().applyQuaternion(q010))

		// 3: the position
		const p030 = position.clone()
		const p131 = p030.clone().sub(p010).applyQuaternion(q010.clone().invert())
		return p131
	}

	_addMarkers(markerNumbers: number[]) {
		const markers = markerNumbers.map(n => createMarker(n, this.setup))
		markers.forEach(m => this.setup.camera.add(m))
		this.markers.push(...markers)
	}

	_mainLoop() {
		const children = [...this.arenaObjects]
		// on the cloeset marker, show the children based on averaging
		for (let childIndex = 0; childIndex < children.length; childIndex++) {
			const child = children[childIndex]

			const arr_p030 = [], arr_q030 = []
			const weights = []
			let weightSum = 0
			for (let markerIndex = 0; markerIndex < this.markers.length; markerIndex++) {
				if (!this.markers[markerIndex].visible) continue

				// 0: camera, 1: dominant marker, 2: this marker, 3: object
				const p020 = this.markers[markerIndex].position
				const q020 = this.markers[markerIndex].quaternion
				if (p020.length() > 1000) continue
				const p121 = this.markerPositions[markerIndex].clone()
				const q121 = this.markerQuaternions[markerIndex].clone()
				const p131 = this.arenaObjects[childIndex].positionInArena.clone()
				const q131 = this.arenaObjects[childIndex].quaternionInArena.clone()

				const p232 = p131.clone().sub(p121).applyQuaternion(q121.clone().invert())
				const q232 = q121.clone().invert().multiply(q131)

				const p030 = p020.clone().add(p232.clone().applyQuaternion(q020))
				const q030 = q020.clone().multiply(q232)
				arr_p030.push(p030)
				arr_q030.push(q030)

				const d02 = p020.length()
				const d23 = p232.length()
				const weight = (1 / d02) * (d23 < 0.1 ? 10 : 1 / d23)
				weights.push(weight)
				weightSum += weight
			}

			// normalise the weights
			for (let w = 0; w < weights.length; w++) {
				weights[w] /= weightSum
			}

			let x = 0, y = 0, z = 0 // in world coordinates (camera frame)
			for (let w = 0; w < weights.length; w++) {
				if (weights[w] === 0) continue
				const p030 = arr_p030[w]
				x += weights[w] * p030.x
				y += weights[w] * p030.y
				z += weights[w] * p030.z
			}

			// average
			const p030 = new Vector3(x, y, z)
			const q030 = getAverageQuaternion(arr_q030, weights)

			// 4: nearest marker
			const closestMarkerIndex = this.findClosestVisibleMarkerIndex(this.arenaObjects[childIndex].positionInArena)
			if (closestMarkerIndex === null) continue
			const p040 = this.markers[closestMarkerIndex].position
			const q040 = this.markers[closestMarkerIndex].quaternion
			const p434 = p030.clone().sub(p040).applyQuaternion(q040.clone().invert())
			const q434 = q040.clone().invert().multiply(q030)

			this.markers[closestMarkerIndex].add(child.object)
			child.object.position.set(p434.x, p434.y, p434.z)
			child.object.quaternion.set(q434.x, q434.y, q434.z, q434.w)
		}
	}
}