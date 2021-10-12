const scene = document.getElementById('scene').object3D

const getPlane = () => {
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
	const planeVertices = new Float32Array([
		0.0, 2.0, 0.0,
		0.0, 2.0, 1.0,
		1.0, 2.0, 1.0,

		1.0, 2.0, 1.0,
		1.0, 2.0, 0.0,
		0.0, 2.0, 0.0
	])
	const colors = new Float32Array([
		1.0, 0.0, 0.0,
		0.0, 1.0, 0.0,
		0.0, 0.0, 1.0,

		0.0, 0.0, 1.0,
		1.0, 0.0, 1.0,
		1.0, 0.0, 0.0,
	])
	planeGeometry.setAttribute('position', new THREE.BufferAttribute(planeVertices, 3))
	planeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

	const planeMaterial = new THREE.ShaderMaterial({
		vertexShader,
		fragmentShader,
	})

	const plane = new THREE.Mesh(planeGeometry, planeMaterial)
	return plane
}

const sceneInit = () => {
	const geometry = new THREE.BoxGeometry()
	const material = new THREE.MeshStandardMaterial({ color: 0xff0000, opacity: 0.8 })
	const cube = new THREE.Mesh(geometry, material)
	cube.position.z = 2
	cube.position.y = 2
	scene.add(cube)

	scene.add(getPlane())

	console.log(scene)
}

sceneInit();