import { getMean, getMidValues, getVariance } from "./arrays.js"
import { matrixMultiplyScalar, getColumn, outerProduct, matrixAdd } from "./vectors.js"

export const getMeanVector = (vectors) => {
	const xs = vectors.map(v => v.x), ys = vectors.map(v => v.y), zs = vectors.map(v => v.z)
	const meanAndVariance = [xs, ys, zs].map(values => {
		const midValues = getMidValues(values, 0.8)
		const mean = getMean(midValues)
		const variance = getVariance(midValues, mean)
		return { mean, variance }
	})
	return {
		vector: new THREE.Vector3(meanAndVariance[0].mean, meanAndVariance[1].mean, meanAndVariance[2].mean),
		variances: meanAndVariance.map(x => x.variance)
	}
}

export const getAverageQuaternion = (quaternions, weights) => {
	if (weights === undefined) weights = Array(quaternions.length).fill(1)
	if (quaternions.length !== weights.length) throw new Error('quaternions and weights do not have the same lengths')

	let M = []
	for (let i = 0; i < 4; i++) {
		M.push(Array(4).fill(0))
	}

	for (let i = 0; i < quaternions.length; i++) {
		const q = quaternions[i]
		const qVector = [q.x, q.y, q.z, q.w]
		const contribution = matrixMultiplyScalar(outerProduct(qVector, qVector), weights[i])
		M = matrixAdd(M, contribution)
	}

	const { values: eigValues, vectors: eigVectors } = math.eigs(M)
	const maxEigVectors = getColumn(eigVectors, eigValues.length - 1)
	return new THREE.Quaternion(maxEigVectors[0], maxEigVectors[1], maxEigVectors[2], maxEigVectors[3])
}