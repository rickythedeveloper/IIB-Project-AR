import { Object3D, Quaternion, Vector3 } from 'three'

export interface ThreeObjectWrapper {
	object: Object3D | null
}

export type Matrix<T> = T[][]
export type Vector<T> = T[]

export interface MarkerInfo {
	number: number
	position: Vector3
	quaternion: Quaternion
}

export interface Positioning {
	position: Vector3
	quaternion: Quaternion
}

export interface ObjectInfo {
	object: Object3D
	positioning: Positioning
}