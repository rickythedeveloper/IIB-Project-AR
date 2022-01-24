export const getMean = (values: number[]): number => {
	if (values.length === 0) throw new Error('The values array has to have a length greater than 0')
	let sum = 0
	values.forEach(value => sum += value)
	return sum / values.length
}

export const getMidValues = (values: number[], proportion: number): number[] => {
	if (proportion < 0) proportion = 0
	else if (proportion > 1) proportion = 1
	const sortedValues = values.slice().sort((a, b) => a - b)
	const sideProportion = (1 - proportion) / 2
	const startIndex = Math.floor(sortedValues.length * sideProportion)
	const endIndex = Math.floor(sortedValues.length * (1 - sideProportion))
	return values.slice(startIndex, endIndex)
}

export const arrayIsFilled = (arr: Array<any>): boolean => {
	for (const val of arr) {
		if (val === undefined || val === null) return false
	}
	return true
}

export const getMedian = (values: number[]): number => {
	if (values.length === 0) throw new Error('The values array has to have a length greater than 0')
	const sortedValues = values.slice().sort((a, b) => a - b)
	const middle = Math.floor(sortedValues.length / 2)
	return sortedValues.length % 2 === 0 ? (sortedValues[middle] + sortedValues[middle - 1]) / 2 : sortedValues[middle]
}

export const getVariance = (values: number[], mean: number | undefined): number => {
	if (mean === undefined) return getVariance(values, getMean(values))
	if (values.length === 0) throw new Error('The values array has to have a length greater than 0')
	let squaredErrorSum = 0
	values.forEach(value => squaredErrorSum += (value - mean) ** 2)
	return squaredErrorSum / values.length
}

export const initMatrix = (shape: [number, number], initialValueFunc: () => any) => {
	const arr: any[][] = []
	for (let i = 0; i < shape[0]; i++) {
		arr.push([])
		for (let j = 0; j < shape[1]; j++) {
			arr[i].push(initialValueFunc())
		}
	}
	return arr
}