export const vertexShader = (property: string, min: number, max: number) => `
	attribute float ${property};
	varying float propertyValueNormalized;
	void main() {
		propertyValueNormalized = (${property} - (${min.toFixed(20)})) / (${max.toFixed(20)} - (${min.toFixed(20)}));
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`

export const fragmentShader = (): string => `
	uniform sampler2D colorMap;
	varying float propertyValueNormalized;
	void main() {
		gl_FragColor = texture2D(colorMap, vec2(propertyValueNormalized, 0.5));
	}
`