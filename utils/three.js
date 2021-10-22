/**
 * Given some data in rows, return the triangulated vertices.
 * @param {number[][][]} rows Each point is a 3D array. Each row is an array of points.
 * @returns 
 */
const convertRowsToVertices = (rows) => {
	const verticesArray = [];
	for (let i = 0; i < rows.length - 1; i++) {
		const row = rows[i]
		const nextRow = rows[i + 1]

		const verticesRow = []
		for (let j = 0; j < row.length - 1; j++) {
			verticesRow.push(...row[j], ...row[j + 1], ...nextRow[j])
			verticesRow.push(...row[j + 1], ...nextRow[j], ...nextRow[j + 1])
		}

		verticesArray.push(...verticesRow)
	}

	return new Float32Array(verticesArray)
}

const createArrow = (direction, length, colorHex) => new THREE.ArrowHelper(
	new THREE.Vector3(direction === 'x' ? 1 : 0, direction === 'y' ? 1 : 0, direction === 'z' ? 1 : 0),
	new THREE.Vector3(0, 0, 0),
	length,
	colorHex
)

const rotationQuaternion = (direction, angle) => new THREE.Quaternion(
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
const createPlane = (nVertices) => {
	const planeGeometry = new THREE.BufferGeometry()
	const planeVertices = new Float32Array(nVertices * 3)
	const colors = new Float32Array(nVertices * 3)
	planeGeometry.setAttribute('position', new THREE.BufferAttribute(planeVertices, 3))
	planeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

	const planeMaterial = new THREE.ShaderMaterial({
		vertexShader,
		fragmentShader,
		side: THREE.DoubleSide
	})
	const plane = new THREE.Mesh(planeGeometry, planeMaterial)

	return plane
}

export { convertRowsToVertices, createArrow, rotationQuaternion, createPlane }