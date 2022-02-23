import { Box3, BufferGeometry, Color, DataTexture, DoubleSide, Group, Mesh, Object3D, PointLight, ShaderMaterial } from 'three'
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
import { Property } from '../loaders/VTK/types'
import { interpolateRdBu } from 'd3-scale-chromatic'


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

const getPropertyInspector = (properties: Property[], initialPropertyName: string, mesh: Mesh<BufferGeometry, ShaderMaterial>) => {
	let propertyName = initialPropertyName
	return new PropertyInspector(
		properties,
		interpolateRdBu,
		(newProperty) => {
			const matchingProperties = properties.filter(p => p.name === newProperty.name)
			if (matchingProperties.length === 0) throw Error('could not find matching property')
			const propertyWithData = matchingProperties[0]
			mesh.material.vertexShader = vertexShader(propertyWithData.name, propertyWithData.min, propertyWithData.max)
			propertyName = propertyWithData.name
		},
		(min, max) => {
			mesh.material.vertexShader = vertexShader(propertyName, min, max)
		}
	)
}

const calibrate = (setup: Setup, markers: MarkerInfo[], onComplete: (objects: Object3D[]) => void, controlPanel: HTMLDivElement) => {
	setup.scene.add(new PointLight())

	const arena = new Arena(setup, markers)
	const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions)
	arena.addObjects(...markerIndicators)

	const calibratableObjects: Object3D[] = []
	const interactionManager = new InteractionManager(setup.renderer, setup.camera, setup.renderer.domElement)

	const uploadButton = createFileUpload(fileInfos => {
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
				const initialProperty = properties[0]
				const mesh = getMesh(geometry, initialProperty, 1)
				// TODO only create property inspector at the end, having collected the property names
				const propertyInspector = getPropertyInspector(properties, initialProperty.name, mesh)

				group.add(mesh)
				controlPanel.append(propertyInspector.element)

				if (group.children.length === fileInfos.length) {
					const groupWrapper = new Group()
					groupWrapper.add(group)
					const groupBox = new Box3().expandByObject(group)
					groupBox.getCenter(group.position).multiplyScalar(-1)
					addCalibratableObject(groupWrapper)
				}
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