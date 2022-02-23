import { Quaternion, Vector3 } from 'three'

export interface MarkerInfo {
	number: number
	position: Vector3
	quaternion: Quaternion
}

export interface Positioning {
	position: Vector3
	quaternion: Quaternion
}