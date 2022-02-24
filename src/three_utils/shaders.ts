import { SHADER_COLOR_MAP, SHADER_PROPERTY_PREFIX } from '../constants'

export const vertexShader = (property: string, min: number, max: number) => `
	attribute float ${SHADER_PROPERTY_PREFIX + property};
	varying float propertyValueNormalized;
	void main() {
		propertyValueNormalized = (${SHADER_PROPERTY_PREFIX + property} - (${min.toFixed(20)})) / (${max.toFixed(20)} - (${min.toFixed(20)}));
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`

export const fragmentShader = (): string => `
	uniform sampler2D ${SHADER_COLOR_MAP};
	varying float propertyValueNormalized;
	void main() {
		gl_FragColor = texture2D(${SHADER_COLOR_MAP}, vec2(propertyValueNormalized, 0.5));
	}
`