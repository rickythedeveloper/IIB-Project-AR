import { Property } from '../components/PropertyInspector'
import { SHADER_COLOR_MAP, SHADER_PROPERTY_PREFIX } from '../constants'

export const getPropertyVariableNameInShader = (propertyName: string): string => SHADER_PROPERTY_PREFIX + propertyName.replace(/\s/g, '_')

export const vertexShader = (property: Property, min: number, max: number) => {
	const propertyVariableName = getPropertyVariableNameInShader(property.name)
	const minValue = min.toFixed(20), maxValue = max.toFixed(20)
	return `
		attribute float ${propertyVariableName};
		varying float propertyValueNormalized;
		void main() {
			propertyValueNormalized = 
			(${propertyVariableName} - (${minValue})) / (${maxValue} - (${minValue}));
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`
}

export const fragmentShader = (): string => `
	uniform sampler2D ${SHADER_COLOR_MAP};
	varying float propertyValueNormalized;
	void main() {
		gl_FragColor = texture2D(${SHADER_COLOR_MAP}, vec2(propertyValueNormalized, 0.5));
	}
`