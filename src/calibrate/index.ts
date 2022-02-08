import { Object3D, PointLight, Mesh, MeshLambertMaterial, ShaderMaterial, DoubleSide, MeshStandardMaterial } from 'three'
import Arena from "../utils/Arena"
import { createMarkerIndicators } from "../utils/scene_init"
import { Setup } from "../utils/setupAR"
import { InteractionManager } from "../utils/interactive"
import { HIDDEN_MARKER_COLOR, MARKER_INDICATOR_UPDATE_INTERVAL, VISIBLE_MARKER_COLOR } from "../utils/constants"
import { MarkerInfo } from "../utils/index"
import { createFileUpload, createObjectControlForObject } from './utils'
import VTKLoader from '../loaders/VTKLoader'

const calibrate = (setup: Setup, markers: MarkerInfo[], onComplete: (objects: Object3D[]) => void, controlPanel: HTMLDivElement) => {
	setup.scene.add(new PointLight())

	const arena = new Arena(setup, markers)
	const markerIndicators = createMarkerIndicators(arena.markerPositions, arena.markerQuaternions)
	arena.addObjects(...markerIndicators)

	const calibratableObjects: Object3D[] = []
	const interactionManager = new InteractionManager(setup.renderer, setup.camera, setup.renderer.domElement)
	
	controlPanel.appendChild(createFileUpload((object) => addCalibratableObject(object)))

	const loader = new VTKLoader();
	loader.load('data/ricky_test3_0_0.vts', (geometry) => {
	// loader.load('data/TEST_ro_0_0.vts', (geometry) => {
		geometry.center();
		geometry.computeVertexNormals();

		const vertexShader = (property: string, min: number, max: number) => `
			attribute float ${property};
			varying vec3 v_color;
			void main() {
				float propertyValueNormalized = (${property} - (${min})) / (${max} - (${min}));
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
		const material = new ShaderMaterial({
			vertexShader: vertexShader('rovx', -23.180418015, 71.037857056),
			fragmentShader: fragmentShader(1),
			transparent: true,
			side: DoubleSide
		})

		const mesh = new Mesh(geometry, material)
		mesh.position.set(0, 1, 0);
		mesh.scale.multiplyScalar(3);
		addCalibratableObject(mesh)
	});

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