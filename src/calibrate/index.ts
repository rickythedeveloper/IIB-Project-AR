import { Object3D, PointLight, Mesh, MeshLambertMaterial, ShaderMaterial, DoubleSide, MeshStandardMaterial } from 'three'
import Arena from "../utils/Arena"
import { createMarkerIndicators } from "../utils/scene_init"
import { Setup } from "../utils/setupAR"
import { InteractionManager } from "../utils/interactive"
import { HIDDEN_MARKER_COLOR, MARKER_INDICATOR_UPDATE_INTERVAL, VISIBLE_MARKER_COLOR } from "../utils/constants"
import { MarkerInfo } from "../utils/index"
import { createFileUpload, createObjectControlForObject } from './utils'
import VTSLoader, { Property } from '../loaders/VTK/VTSLoader'
import { createOption } from '../utils/elements'

const calibrate = (setup: Setup, markers: MarkerInfo[], onComplete: (objects: Object3D[]) => void, controlPanel: HTMLDivElement) => {
	setup.scene.add(new PointLight())

	const arena = new Arena(setup, markers)
	const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions)
	arena.addObjects(...markerIndicators)

	const calibratableObjects: Object3D[] = []
	const interactionManager = new InteractionManager(setup.renderer, setup.camera, setup.renderer.domElement)
	
	controlPanel.appendChild(createFileUpload((url) => {
		const loader = new VTSLoader();
		loader.load(url, ({ geometry, properties }) => {
			if (properties.length === 0) throw new Error('could not detect any properties to display')
			geometry.center();
			geometry.computeVertexNormals();
	
			const vertexShader = (property: string, min: number, max: number) => `
				attribute float ${property};
				varying vec3 v_color;
				void main() {
					float propertyValueNormalized = (${property} - (${min.toFixed(20)})) / (${max.toFixed(20)} - (${min.toFixed(20)}));
					v_color = vec3(propertyValueNormalized, 0.0, 0.0);
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`
			const fragmentShader = (opacity: number): string => `
				varying vec3 v_color;
				void main() {
					gl_FragColor = vec4(v_color, ${opacity});
				}
			`
	
			const getMaterial = (property: Property) => new ShaderMaterial({
				vertexShader: vertexShader(property.name, property.min, property.max),
				fragmentShader: fragmentShader(1),
				transparent: true,
				side: DoubleSide
			})
	
			const mesh = new Mesh(geometry, getMaterial(properties[0]))
			mesh.position.set(0, 1, 0);
			mesh.scale.multiplyScalar(3);
			addCalibratableObject(mesh)
	
			// add dropdown option
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
			controlPanel.append(optionDropdown)
		});
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
	}, 3000000)

	const addCalibratableObject = (object: Mesh) => {
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
			markerIndicators[i].material.color.set(
				arena.markers[i].visible ? VISIBLE_MARKER_COLOR : 
				HIDDEN_MARKER_COLOR
			)
		}
	}, MARKER_INDICATOR_UPDATE_INTERVAL);
}

export default calibrate