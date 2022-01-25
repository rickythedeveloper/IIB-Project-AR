/**
 * Given some data in rows, return the triangulated vertices.
 * @param {number[][][]} rows Each point is a 3D array. Each row is an array of points.
 * @returns 
 */
export const convertRowsToVertices = (rows: number[][][]) => {
	const verticesArray: number[] = [];
	for (let i = 0; i < rows.length - 1; i++) {
		const row = rows[i]
		const nextRow = rows[i + 1]

		const verticesRow: number[] = []
		for (let j = 0; j < row.length - 1; j++) {
			verticesRow.push(...row[j], ...row[j + 1], ...nextRow[j])
			verticesRow.push(...row[j + 1], ...nextRow[j], ...nextRow[j + 1])
		}

		verticesArray.push(...verticesRow)
	}

	return new Float32Array(verticesArray)
}

enum Axis { x, y, z }
type AxisString = keyof typeof Axis

export const createArrow = (direction: AxisString, length: number, colorHex: string) => new THREE.ArrowHelper(
	new THREE.Vector3(direction === 'x' ? 1 : 0, direction === 'y' ? 1 : 0, direction === 'z' ? 1 : 0),
	new THREE.Vector3(0, 0, 0),
	length,
	colorHex
)

export const rotationQuaternion = (direction: AxisString, angle: number) => new THREE.Quaternion(
	direction == 'x' ? Math.sin(angle / 2) : 0,
	direction == 'y' ? Math.sin(angle / 2) : 0,
	direction == 'z' ? Math.sin(angle / 2) : 0,
	Math.cos(angle / 2)
)

const vertexShader = `
	attribute vec3 color;	
	varying vec3 v_color;
	void main() {
		v_color = color;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`

const fragmentShader = `
	varying vec3 v_color;
	void main() {
		gl_FragColor = vec4(v_color, 0.5);
	}
`

export const createBufferObject = (vertices: Float32Array, indices: Uint32Array, colors: Float32Array) => {
	const geometry = new THREE.BufferGeometry()
	geometry.index = new THREE.BufferAttribute(indices, 1)
	geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
	geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

	const material = new THREE.ShaderMaterial({
		vertexShader,
		fragmentShader,
		side: THREE.DoubleSide
	})

	const mesh = new THREE.Mesh(geometry, material)
	return mesh
}

export const createMarkerIndicator = (color: number, opacity: number) => {
	const geometry = new THREE.PlaneGeometry(1, 1)
	const material = new THREE.MeshBasicMaterial({ color, opacity, side: THREE.DoubleSide })
	const mesh = new THREE.Mesh(geometry, material)
	mesh.quaternion.set(Math.sin(Math.PI / 4), 0, 0, Math.cos(Math.PI / 4))
	return mesh
}

export const createLine = (color: number) => {
	const geometry = new THREE.BufferGeometry()
	geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Array(6).fill(0)), 3))
	const material = new THREE.LineBasicMaterial({ color })
	const mesh = new THREE.Line(geometry, material)
	return mesh
}