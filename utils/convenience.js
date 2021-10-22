import { convertRowsToVertices } from "./three.js"

export const getVertices = (y) => {
	return convertRowsToVertices([
		[
			[-0.5, y, -0.5],
			[0.0, y, -0.5],
			[0.5, y, -0.5]
		],
		[
			[-0.5, y, 0.0],
			[0.0, y, 0.0],
			[0.5, y, 0.0]
		],
		[
			[-0.5, y, 0.5],
			[0.0, y, 0.5],
			[0.5, y, 0.5]
		]
	])
}

export const getColors = (time) => {
	const halfAmplitudeValue = 1 / 2 + Math.sin(time * 2) / 4
	const fullAmplitudeValue = 1 / 2 + Math.sin(time * 2) / 2
	return convertRowsToVertices([
		[
			[0.0, 0.0, 0.0],
			[0.0, 0.0, halfAmplitudeValue],
			[0.0, 0.0, fullAmplitudeValue]
		],
		[
			[0.0, fullAmplitudeValue, 0.0],
			[halfAmplitudeValue, halfAmplitudeValue, 0.0],
			[fullAmplitudeValue, 0.0, 0.0]
		],
		[
			[0.0, 0.0, 0.0],
			[0.0, 0.0, halfAmplitudeValue],
			[0.0, 0.0, fullAmplitudeValue]
		],
	])
}