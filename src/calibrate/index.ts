import { Box3, BufferGeometry, DoubleSide, Group, Mesh, Object3D, PointLight, ShaderMaterial } from 'three'
import PropertyInspector from '../components/PropertyInspector'
import { fragmentShader, vertexShader } from '../three_utils/shaders'
import { getTexture } from '../three_utils/texture'
import Arena from '../utils/Arena'
import { createMarkerIndicators } from '../three_utils/convenience'
import { Setup } from '../utils/setupAR'
import { InteractionManager } from '../utils/interactive'
import { HIDDEN_MARKER_COLOR, MARKER_INDICATOR_UPDATE_INTERVAL, VISIBLE_MARKER_COLOR } from '../constants'
import { MarkerInfo } from '../utils'
import { createFileUpload, createObjectControlForObject, getFileExtension } from './utils'
import VTSLoader from '../loaders/VTK/VTSLoader'
import VTPLoader from '../loaders/VTK/VTPLoader'
import { interpolateRdBu } from 'd3-scale-chromatic'
import { Property } from '../components/PropertyInspector'

const updateMeshVertexShader = (mesh: Mesh<BufferGeometry, ShaderMaterial>, property: Property) => {
	mesh.material.vertexShader = vertexShader(property.name, property.min, property.max)
}

const getMesh = (geometry: BufferGeometry, initialProperty: Property, opacity: number): Mesh<BufferGeometry, ShaderMaterial> => {
	const material = new ShaderMaterial({
		vertexShader: vertexShader(initialProperty.name, initialProperty.min, initialProperty.max),
		fragmentShader: fragmentShader(),
		transparent: true,
		side: DoubleSide,
		uniforms: {
			colorMap: { value: getTexture(opacity) },
		}
	})
	return new Mesh(geometry, material)
}

const getPropertyInspector = (properties: Property[], meshes: Mesh<BufferGeometry, ShaderMaterial>[]) => {
	return new PropertyInspector(
		properties,
		interpolateRdBu,
		(newProperty) => {
			for (const mesh of meshes) updateMeshVertexShader(mesh, newProperty)
		},
		(min, max, propertyName) => {
			for (const mesh of meshes) mesh.material.vertexShader = vertexShader(propertyName, min, max)
		}
	)
}

const INITIAL_PROPERTY_INDEX = 0

const calibrate = (setup: Setup, markers: MarkerInfo[], onComplete: (objects: Object3D[]) => void, controlPanel: HTMLDivElement) => {
	setup.scene.add(new PointLight())

	const arena = new Arena(setup, markers)
	const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions)
	arena.addObjects(...markerIndicators)

	const calibratableObjects: Object3D[] = []
	const interactionManager = new InteractionManager(setup.renderer, setup.camera, setup.renderer.domElement)

	const uploadButton = createFileUpload(fileInfos => {
		const group = new Group()
		const meshes: Mesh<BufferGeometry, ShaderMaterial>[] = []
		let commonProperties: Property[] | null = null
		const onLoadAll = () => {
			if (commonProperties === null || commonProperties.length === 0) return // TODO show error message (no common properties)
			const propertyInspector = getPropertyInspector(commonProperties, meshes)

			// all meshes show the first common property
			const initialProperty = commonProperties[INITIAL_PROPERTY_INDEX]
			for (const mesh of meshes) updateMeshVertexShader(mesh, initialProperty)

			group.add(...meshes)
			controlPanel.append(propertyInspector.element)

			const groupWrapper = new Group()
			groupWrapper.add(group)
			const groupBox = new Box3().expandByObject(group)
			groupBox.getCenter(group.position).multiplyScalar(-1)
			addCalibratableObject(groupWrapper)
		}

		for (let i = 0; i < fileInfos.length; i++) {
			const fileInfo = fileInfos[i]
			const ext = getFileExtension(fileInfo.name)
			const loader =
				ext === 'vtp' ? new VTPLoader() :
					ext === 'vts' ? new VTSLoader() :
						null
			if (loader === null) throw new Error('uploaded a file with an invalid file extension')

			loader.load(fileInfo.url, ({ geometry, properties }) => {
				meshes.push(getMesh(geometry, properties[0], 1)) // create mesh with whatever property is first

				if (commonProperties === null) commonProperties = properties
				else {
					const propertyNames = properties.map(p => p.name)
					commonProperties = commonProperties.filter(p => propertyNames.includes(p.name))
					// make sure the common properties have the correct values of min and max
					for (const commonProperty of commonProperties) {
						const property = properties.filter(p => p.name === commonProperty.name)
						if (property.length === 0) break
						if (property[0].min < commonProperty.min) commonProperty.min = property[0].min
						if (property[0].max > commonProperty.max) commonProperty.max = property[0].max
					}
				}

				// loading complete
				if (meshes.length === fileInfos.length) onLoadAll()
			})
		}
	})
	uploadButton.style.pointerEvents = 'auto' // enable mouse events for this element
	controlPanel.appendChild(uploadButton)

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

	setTimeout(() => {
		calibratableObjects.forEach(o => {
			const objectIndex = arena.objectIndices[o.uuid]
			const position = arena.arenaObjects[objectIndex].positionInArena, quaternion = arena.arenaObjects[objectIndex].quaternionInArena
			o.position.set(position.x, position.y, position.z)
			o.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
		})
		arena.clean()
		onComplete(calibratableObjects)
	}, 3000000)

	setInterval(() => {
		for (let i = 0; i < arena.markers.length; i++) {
			markerIndicators[i].material.color.set(arena.markers[i].visible ? VISIBLE_MARKER_COLOR : HIDDEN_MARKER_COLOR)
		}
	}, MARKER_INDICATOR_UPDATE_INTERVAL)
}

export default calibrate