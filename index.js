import { convertRowsToVertices, createSlider } from "./utils.js";

const getVertices = (y) => {
	return convertRowsToVertices([
		[
			[0.0, y, 0.0],
			[0.5, y, 0.0],
			[1.0, y, 0.0]
		],
		[
			[0.0, y, 0.5],
			[0.5, y, 0.5],
			[1.0, y, 0.5]
		]
	])
}

const getColors = (time) => {
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
		]
	])
}

const createPlane = (nVertices) => {
	const vertexShader = `
	attribute vec3 color;	
	varying vec3 v_color;
	void main() {
		v_color = color;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
	`
	const fragmentShader = `
	varying vec3 v_color;
	void main() {
		gl_FragColor = vec4(v_color, 0.5);
	}
	`

	const planeGeometry = new THREE.BufferGeometry()
	const planeVertices = new Float32Array(nVertices * 3)
	const colors = new Float32Array(nVertices * 3)
	planeGeometry.setAttribute('position', new THREE.BufferAttribute(planeVertices, 3))
	planeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

	const planeMaterial = new THREE.ShaderMaterial({
		vertexShader,
		fragmentShader,
		side: THREE.DoubleSide
	})
	const plane = new THREE.Mesh(planeGeometry, planeMaterial)

	return plane
}

const updatePlaneVertices = (plane, newVertices) => {
	plane.geometry.attributes.position.array = newVertices
	plane.geometry.attributes.position.needsUpdate = true;
}

const updatePlaneColors = (plane, newColors) => {
	plane.geometry.attributes.color.array = newColors
	plane.geometry.attributes.color.needsUpdate = true;
}

const minY = 0, maxY = 5, initialY = 3.0, stepY = 0.1
const testSlider = createSlider(minY, maxY, initialY, stepY)
document.body.appendChild(testSlider)
testSlider.style.zIndex = 1000
testSlider.style.position = 'absolute'
testSlider.style.top = '20px'
testSlider.style.left = '20px'
testSlider.oninput = (e) => {
	const y = e.target.value
	const positionArray = plane.geometry.attributes.position.array
	for (let i = 1; i < positionArray.length; i += 3) {
		positionArray[i] = y
	}
	plane.geometry.attributes.position.needsUpdate = true;
}

const scene = document.getElementById('scene').object3D
const initialVertices = getVertices(initialY)
const plane = createPlane(initialVertices.length / 3)
scene.add(plane)

let time = 0
const interval = 100
setInterval(() => {
	time += interval / 1000
	updatePlaneColors(plane, getColors(time))
}, interval);

updatePlaneVertices(plane, initialVertices)
updatePlaneColors(plane, getColors(time))