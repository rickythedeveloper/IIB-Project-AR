export interface ThreeObjectWrapper {
	object: THREE.Object3D | null
}

export type Matrix<T> = T[][]
export type Vector<T> = T[]

export interface MarkerInfo {
	number: number
	position: THREE.Vector3
	quaternion: THREE.Quaternion
}

export interface Positioning {
	position: THREE.Vector3
	quaternion: THREE.Quaternion
}

export interface ObjectInfo {
	object: THREE.Object3D
	positioning: Positioning
}