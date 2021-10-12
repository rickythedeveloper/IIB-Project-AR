const scene = document.getElementById('scene').object3D

const sceneInit = () => {
	const geometry = new THREE.BoxGeometry()
	const material = new THREE.MeshStandardMaterial({ color: 0xff0000, opacity: 0.5 })
	const cube = new THREE.Mesh(geometry, material)
	cube.position.z = 2
	cube.position.y = 2
	scene.add(cube)

	console.log(scene)
}

sceneInit();