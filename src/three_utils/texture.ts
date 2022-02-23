import { interpolateRdBu } from 'd3-scale-chromatic'
import { Color, DataTexture } from 'three'

export const getTexture = (opacity: number): DataTexture => {
	const schemeSize = 100
	const colorData = new Uint8Array(4 * schemeSize)
	for (let i = 0; i < schemeSize; i++) {
		const stride = i * 4
		const t = i / (schemeSize - 1)
		const color = new Color(interpolateRdBu(t))
		colorData[stride] = Math.floor(color.r * 255)
		colorData[stride + 1] = Math.floor(color.g * 255)
		colorData[stride + 2] = Math.floor(color.b * 255)
		colorData[stride + 3] = Math.floor(opacity * 255)
	}

	const texture = new DataTexture(colorData, schemeSize, 1)
	texture.needsUpdate = true
	return texture
}