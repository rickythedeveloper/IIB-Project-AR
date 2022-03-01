import { SHADER_COLOR_MAP, SHADER_PROPERTY_PREFIX } from '../constants'

export const getPropertyVariableNameInShader = (propertyName: string): string => SHADER_PROPERTY_PREFIX + propertyName.replace(/\s/g, '_')

export const vertexShader = (property: string, min: number, max: number) => `
	attribute float ${getPropertyVariableNameInShader(property)};
	varying float propertyValueNormalized;
	void main() {
		propertyValueNormalized = (${getPropertyVariableNameInShader(property)} - (${min.toFixed(20)})) / (${max.toFixed(20)} - (${min.toFixed(20)}));
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