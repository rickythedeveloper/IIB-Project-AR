export const matrixMultiplyScalar = (matrix, scalar) => {
	const result = []
	for (let i = 0; i < matrix.length; i++) {
		result.push([])
		for (let j = 0; j < matrix[0].length; j++) {
			result[i].push(matrix[i][j] * scalar)
		}
	}
	return result
}

export const matrixAdd = (m1, m2) => {
	const result = []
	for (let i = 0; i < m1.length; i++) {
		result.push([])
		for (let j = 0; j < m1[0].length; j++) {
			result[i].push(m1[i][j] + m2[i][j])
		}
	}
	return result
}

export const outerProduct = (v1, v2) => {
	const nRows = v1.length, nCols = v2.length
	const result = []
	for (let i = 0; i < nRows; i++) {
		result.push([])
		for (let j = 0; j < nCols; j++) {
			result[i].push(v1[i] * v2[j])
		}
	}
	return result
}

export const getColumn = (matrix, columnIndex) => {
	return matrix.map(row => row[columnIndex])
}