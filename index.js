const scene = document.getElementById('scene')

const sceneInit = () => {
	const box = document.createElement('a-box')
	box.setAttribute('position', '0 3 0')
	box.setAttribute('material', 'opacity: 0.5;')

	scene.appendChild(box)
	console.log(scene)
}

sceneInit();