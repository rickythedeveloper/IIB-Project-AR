import { rotationQuaternion, createBufferObject } from "./three.js"
import { createOption, createButton } from "./elements.js"
import Arena from "./Arena.js"
import { ThreeObjectWrapper } from "./index.js"

enum ChangeOption { rotx, roty, rotz, transx, transy, transz, scale }
type ChangeOptionString = keyof typeof ChangeOption

export const createMoveDropdown = (objectWrapper: ThreeObjectWrapper, arena: Arena) => {
	// Add rotation / scale control
	const optionDropdown = document.createElement('select')
	optionDropdown.appendChild(createOption('rotx', 'Rotate about X'))
	optionDropdown.appendChild(createOption('roty', 'Rotate about Y'))
	optionDropdown.appendChild(createOption('rotz', 'Rotate about Z'))
	optionDropdown.appendChild(createOption('transx', 'Translate along X'))
	optionDropdown.appendChild(createOption('transy', 'Translate along Y'))
	optionDropdown.appendChild(createOption('transz', 'Translate along Z'))
	optionDropdown.appendChild(createOption('scale', 'Scale'))
	let selectedOption: ChangeOptionString = 'rotx'
	optionDropdown.onchange = (e) => { if (e.target) { selectedOption = (e.target as HTMLSelectElement).value as ChangeOptionString } }

	let changeIntervalObject: number | undefined
	const changeInterval = 10, angleChange = changeInterval / 1000, scaleChange = 0.005, positionChange = changeInterval / 1000
	const plusButton = createButton('+', () => { changeIntervalObject = createChangeInterval(1, selectedOption, changeIntervalObject, changeInterval, scaleChange, angleChange, positionChange, objectWrapper, arena) })
	const minusButton = createButton('-', () => { changeIntervalObject = createChangeInterval(-1, selectedOption, changeIntervalObject, changeInterval, scaleChange, angleChange, positionChange, objectWrapper, arena) })

	
	const createChangeInterval = (
		direction: 1 | -1,
		option: ChangeOptionString,
		intervalObject: number | undefined, 
		interval: number, 
		scaleChange: number, 
		angleChange: number, 
		positionChange: number, 
		objectWrapper: ThreeObjectWrapper, 
		arena: Arena
	) => {
		if (intervalObject !== undefined) {
			clearInterval(intervalObject)
			return undefined
		}

		return setInterval(() => {
			// if (objectWrapper === undefined || objectWrapper === null) return
			if (objectWrapper.object === null) return

			const objectIndex = arena.objectIndices[objectWrapper.object.uuid]
			if (option === 'scale') {
				objectWrapper.object.scale.addScalar(direction * scaleChange)
			} else if (option.includes('rot')) {
				const axis = option.slice(3) as 'x' | 'y' | 'z'
				arena.arenaObjects[objectIndex].quaternionInArena.premultiply(rotationQuaternion(axis, direction * angleChange))
			} else if (option.includes('trans')) {
				const axis = option.slice(5)
				const axisVector = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0)
				arena.arenaObjects[objectIndex].positionInArena.addScaledVector(axisVector, direction * positionChange)
			} else throw new Error('invalid change type')
		}, interval)
	}

	const moveSection = document.createElement('div')
	moveSection.appendChild(optionDropdown)
	moveSection.appendChild(plusButton)
	moveSection.appendChild(minusButton)
	return moveSection
}

export const createSimulationResultObject = (vertices: Float32Array, indices: Uint32Array, colors: Float32Array) => {
	const colorBufferSizePerTime = vertices.length
	const nTimes = colors.length / colorBufferSizePerTime
	if (!Number.isInteger(nTimes)) throw Error('totalTime is not an integer')
	const simulationResult = createBufferObject(vertices, indices, colors.slice(0, colorBufferSizePerTime))
	const simResultScale = 1.475
	simulationResult.scale.set(simResultScale, simResultScale, simResultScale)

	let time = 0;
	setInterval(() => {
		time = time < nTimes - 1 ? time + 1 : 0
		// @ts-ignore
		simulationResult.geometry.attributes.color.array = colors.slice(time * colorBufferSizePerTime, (time + 1) * colorBufferSizePerTime)
		simulationResult.geometry.attributes.color.needsUpdate = true
	}, 50)

	return simulationResult
}

export const createMarkerIndicators = (markerPositions: THREE.Vector3[], markerQuaternions: THREE.Quaternion[]) => {
	const markerIndicators = []
	for (let i = 0; i < markerPositions.length; i++) {
		const markerIndicatorGeometry = new THREE.PlaneGeometry(1, 1)
		const markerIndicatorMaterial = new THREE.MeshBasicMaterial({ opacity: 0.5, side: THREE.DoubleSide })
		const markerIndicator = new THREE.Mesh(markerIndicatorGeometry, markerIndicatorMaterial)
		markerIndicator.position.set(markerPositions[i].x, markerPositions[i].y, markerPositions[i].z)
		const correctionQuat = new THREE.Quaternion(Math.sin(Math.PI / 4), 0, 0, Math.cos(Math.PI / 4))
		const indicatorQuat = correctionQuat.clone().premultiply(markerQuaternions[i])
		markerIndicator.quaternion.set(indicatorQuat.x, indicatorQuat.y, indicatorQuat.z, indicatorQuat.w)
		markerIndicators.push(markerIndicator)
	}
	return markerIndicators
}