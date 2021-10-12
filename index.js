import { convertRowsToVertices } from "./utils.js";

const vertices = convertRowsToVertices([
	[
		[0.0, 3.0, 0.0],
		[0.5, 3.0, 0.0],
		[1.0, 3.0, 0.0]
	],
	[
		[0.0, 3.0, 0.5],
		[0.5, 3.0, 0.5],
		[1.0, 3.0, 0.5]
	]
])

const colors = convertRowsToVertices([
	[
		[0.0, 0.0, 0.0],
		[0.0, 0.0, 0.5],
		[0.0, 0.0, 1.0]
	],
	[
		[0.0, 1.0, 0.0],
		[0.5, 0.5, 0.0],
		[1.0, 0.0, 0.0]
	]
])

const scene = document.getElementById('scene').object3D

let plane;

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

const updatePlaneVertices = (newVertices) => {
	plane.geometry.attributes.position.array = newVertices
	plane.geometry.attributes.position.needsUpdate = true;
}

const updatePlaneColors = (newColors) => {
	plane.geometry.attributes.color.array = newColors
	plane.geometry.attributes.color.needsUpdate = true;
}

plane = createPlane(vertices.length / 3)
scene.add(plane)
updatePlaneVertices(vertices)
updatePlaneColors(colors)