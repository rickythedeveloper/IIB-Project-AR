import { Box3, BufferGeometry, Color, DataTexture, DoubleSide, Group, Mesh, Object3D, PointLight, ShaderMaterial } from 'three'
import Arena from '../utils/Arena'
import { createMarkerIndicators } from '../utils/scene_init'
import { Setup } from '../utils/setupAR'
import { InteractionManager } from '../utils/interactive'
import { HIDDEN_MARKER_COLOR, MARKER_INDICATOR_UPDATE_INTERVAL, VISIBLE_MARKER_COLOR } from '../utils/constants'
import { MarkerInfo } from '../utils'
import { createFileUpload, createObjectControlForObject, getFileExtension } from './utils'
import VTSLoader from '../loaders/VTK/VTSLoader'
import { createOption } from '../utils/elements'
import VTPLoader from '../loaders/VTK/VTPLoader'
import { Property } from '../loaders/VTK/types'
import { interpolateRdBu } from 'd3-scale-chromatic'

const vertexShader = (property: string, min: number, max: number) => `
	attribute float ${property};
	varying float propertyValueNormalized;
	void main() {
		propertyValueNormalized = (${property} - (${min.toFixed(20)})) / (${max.toFixed(20)} - (${min.toFixed(20)}));
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`

const fragmentShader = (): string => `
	uniform sampler2D colorMap;
	varying float propertyValueNormalized;
	void main() {
		gl_FragColor = texture2D(colorMap, vec2(propertyValueNormalized, 0.5));
	}
`

const getTexture = (opacity: number): DataTexture => {
	const schemeSize = 100
	const colorData = new Uint8Array(4 * schemeSize)
	for (let i = 0; i < schemeSize; i++) {
		const stride = i * 4
		const t = i / (schemeSize - 1)
		const color = new Color(interpolateRdBu(t))
		colorData[stride] = Math.floor(color.r * 255)
		colorData[stride + 1] = Math.floor(color.g * 255)
		colorData[stride + 2] = Math.floor(color.b * 255)
		colorData[stride + 3] = Math.floor(opacity * 255)
	}

	const texture = new DataTexture(colorData, schemeSize, 1)
	texture.needsUpdate = true
	return texture
}

const getMaterial = (property: Property): ShaderMaterial => {
	const opacity = 1
	return new ShaderMaterial({
		vertexShader: vertexShader(property.name, property.min, property.max),
		fragmentShader: fragmentShader(),
		transparent: true,
		side: DoubleSide,
		uniforms: {
			colorMap: { value: getTexture(opacity) },
		}
	})
}

const getMeshAndFlowPropertyDropdown = (geometry: BufferGeometry, properties: Property[]): {mesh: Mesh, optionDropdown: HTMLSelectElement} => {
	const mesh = new Mesh(geometry, getMaterial(properties[0]))

	const optionDropdown = document.createElement('select')
	properties.forEach(p => optionDropdown.appendChild(createOption(p.name, p.name)))
	optionDropdown.onchange = (e) => {
		if (e.target) {
			const propertyName = (e.target as HTMLSelectElement).value
			const property = properties.filter(p => p.name === propertyName)[0]
			mesh.material = getMaterial(property)
		}
	}
	optionDropdown.selectedIndex = 0
	return { mesh, optionDropdown }
}

const calibrate = (setup: Setup, markers: MarkerInfo[], onComplete: (objects: Object3D[]) => void, controlPanel: HTMLDivElement) => {
	setup.scene.add(new PointLight())

	const arena = new Arena(setup, markers)
	const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions)
	arena.addObjects(...markerIndicators)

	const calibratableObjects: Object3D[] = []
	const interactionManager = new InteractionManager(setup.renderer, setup.camera, setup.renderer.domElement)

	controlPanel.appendChild(createFileUpload(fileInfos => {
		const group = new Group()
		for (let i = 0; i < fileInfos.length; i++) {
			const fileInfo = fileInfos[i]
			const ext = getFileExtension(fileInfo.name)
			const loader =
				ext === 'vtp' ? new VTPLoader() :
					ext === 'vts' ? new VTSLoader() :
						null
			if (loader === null) throw new Error('uploaded a file with an invalid file extension')

			loader.load(fileInfo.url, ({ geometry, properties }) => {
				const { mesh, optionDropdown } = getMeshAndFlowPropertyDropdown(geometry, properties)
				group.add(mesh)
				controlPanel.append(optionDropdown)

				if (group.children.length === fileInfos.length) {
					const groupWrapper = new Group()
					groupWrapper.add(group)
					const groupBox = new Box3().expandByObject(group)
					groupBox.getCenter(group.position).multiplyScalar(-1)
					addCalibratableObject(groupWrapper)
				}
			})
		}
	}))

	setTimeout(() => {
		calibratableObjects.forEach(o => {
			const objectIndex = arena.objectIndices[o.uuid]
			const position = arena.arenaObjects[objectIndex].positionInArena, quaternion = arena.arenaObjects[objectIndex].quaternionInArena
			o.position.set(position.x, position.y, position.z)
			o.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
		})
		arena.clean()
		onComplete(calibratableObjects)
	}, 30000)

	const addCalibratableObject = (object: Object3D) => {
		const objectControl = createObjectControlForObject(
			object,
			interactionManager,
			(o) => {
				const objectIndex = arena.objectIndices[o.uuid]
				return arena.arenaObjects[objectIndex].positionInArena
			},
			(o) => {
				const objectIndex = arena.objectIndices[o.uuid]
				return arena.arenaObjects[objectIndex].quaternionInArena
			},
			(worldCoords) => {
				const position = arena.positionFromCameraToDominant(worldCoords)
				if (position === null) throw new Error(`Could not convert position ${worldCoords} from camera frame to dominant marker frame`)
				return position
			}
		)
		arena.addObjects(object, objectControl.container)
		calibratableObjects.push(object)
	}

	// getProcessedData().then(({ vertices, indices, colors }) => {
	// 	const simulationResult = createSimulationResultObject(vertices, indices, colors)
	// 	addCalibratableObject(simulationResult)
	// })

	setInterval(() => {
		for (let i = 0; i < arena.markers.length; i++) {
			markerIndicators[i].material.color.set(arena.markers[i].visible ? VISIBLE_MARKER_COLOR : HIDDEN_MARKER_COLOR)
		}
	}, MARKER_INDICATOR_UPDATE_INTERVAL)
}

export default calibrate