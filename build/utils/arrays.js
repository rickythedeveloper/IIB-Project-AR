import { getColumn, matrixAdd, matrixMultiplyScalar, outerProduct } from "./vectors.js";
export const getMean = (values) => {
    if (values.length === 0)
        throw new Error('The values array has to have a length greater than 0');
    let sum = 0;
    values.forEach(value => sum += value);
    return sum / values.length;
};
export const getMidValues = (values, proportion) => {
    if (proportion < 0)
        proportion = 0;
    else if (proportion > 1)
        proportion = 1;
    const sortedValues = values.slice().sort((a, b) => a - b);
    const sideProportion = (1 - proportion) / 2;
    const startIndex = Math.floor(sortedValues.length * sideProportion);
    const endIndex = Math.floor(sortedValues.length * (1 - sideProportion));
    return values.slice(startIndex, endIndex);
};
export const arrayIsFilled = (arr) => {
    for (const val of arr) {
        if (val === undefined || val === null)
            return false;
    }
    return true;
};
export const getMedian = (values) => {
    if (values.length === 0)
        throw new Error('The values array has to have a length greater than 0');
    const sortedValues = values.slice().sort((a, b) => a - b);
    const middle = Math.floor(sortedValues.length / 2);
    return sortedValues.length % 2 === 0 ? (sortedValues[middle] + sortedValues[middle - 1]) / 2 : sortedValues[middle];
};
export const getVariance = (values, mean) => {
    if (mean === undefined)
        return getVariance(values, getMean(values));
    if (values.length === 0)
        throw new Error('The values array has to have a length greater than 0');
    let squaredErrorSum = 0;
    values.forEach(value => squaredErrorSum += (value - mean) ** 2);
    return squaredErrorSum / values.length;
};
export const initMatrix = (shape, initialValueFunc) => {
    const arr = [];
    for (let i = 0; i < shape[0]; i++) {
        arr.push([]);
        for (let j = 0; j < shape[1]; j++) {
            arr[i].push(initialValueFunc());
        }
    }
    return arr;
};
export const createMatrix = (shape, value) => {
    const arr = [];
    for (let i = 0; i < shape[0]; i++) {
        arr.push([]);
        for (let j = 0; j < shape[1]; j++) {
            arr[i].push(value(i, j));
        }
    }
    return arr;
};
export const createVector = (length, value) => {
    const vector = [];
    for (let i = 0; i < length; i++) {
        vector.push(value(i));
    }
    return vector;
};
export const getMeanVector = (vectors) => {
    const xs = vectors.map(v => v.x), ys = vectors.map(v => v.y), zs = vectors.map(v => v.z);
    const meanAndVariance = [xs, ys, zs].map(values => {
        const midValues = getMidValues(values, 0.8);
        const mean = getMean(midValues);
        const variance = getVariance(midValues, mean);
        return { mean, variance };
    });
    const variances = meanAndVariance.map(x => x.variance);
    return {
        vector: new THREE.Vector3(meanAndVariance[0].mean, meanAndVariance[1].mean, meanAndVariance[2].mean),
        variances: { x: variances[0], y: variances[1], z: variances[2] }
    };
};
export const getAverageQuaternion = (quaternions, weights = undefined) => {
    if (weights === undefined)
        weights = Array(quaternions.length).fill(1);
    if (quaternions.length !== weights.length)
        throw new Error('quaternions and weights do not have the same lengths');
    let M = [];
    for (let i = 0; i < 4; i++) {
        M.push(Array(4).fill(0));
    }
    for (let i = 0; i < quaternions.length; i++) {
        const q = quaternions[i];
        const qVector = [q.x, q.y, q.z, q.w];
        const contribution = matrixMultiplyScalar(outerProduct(qVector, qVector), weights[i]);
        M = matrixAdd(M, contribution);
    }
    const { values: eigValues, vectors: eigVectors } = math.eigs(M);
    const maxEigVectors = getColumn(eigVectors, eigValues.length - 1);
    return new THREE.Quaternion(maxEigVectors[0], maxEigVectors[1], maxEigVectors[2], maxEigVectors[3]);
};
//# sourceMappingURL=arrays.js.map