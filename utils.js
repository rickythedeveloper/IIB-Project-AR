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

const createSlider = (min, max, initialValue, step) => {
	const slider = document.createElement('input')
	slider.type = 'range'
	slider.min = min
	slider.max = max
	slider.value = initialValue
	slider.step = step
	return slider
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

export { convertRowsToVertices, createSlider, createArrow, rotationQuaternion }