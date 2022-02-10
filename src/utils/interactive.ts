// Originally sourced from from https://github.com/markuslerner/Interactive
// Modified and Typescript-adapted by Rintaro Kawagishi
import { Camera, Intersection, Object3D, Raycaster, Event as THREEEvent, Vector2, WebGLRenderer } from 'three'

interface InteractiveObject {
  target: Object3D
  type: keyof HTMLElementEventMap | 'pinch'
  requiresIntersection: boolean
}

export interface PinchEvent extends THREEEvent {
  type: 'pinch'
  target: Object3D
  deltaScale: number
}

export interface InteractiveEvent2<K extends keyof HTMLElementEventMap> extends THREEEvent {
  type: K
  target: Object3D
  htmlElementEvent: HTMLElementEventMap[K] | null
  position: Vector2 // mouse / pointer position
  intersection: Intersection | null
}

export class InteractionManager {
	renderer: WebGLRenderer
	camera: Camera
	domElement: HTMLCanvasElement
	mousePosition: Vector2 = new Vector2(-1, 1) // top left default position
	supportsPointerEvents = !!window.PointerEvent
	interactiveObjects: InteractiveObject[] = []
	raycaster: Raycaster = new Raycaster()
	treatTouchEventsAsMouseEvents = true
	lastTouches: {[pointerId: number]: PointerEvent} = {}

	constructor(renderer: WebGLRenderer, camera: Camera, domElement: HTMLCanvasElement) {
		this.renderer = renderer
		this.camera = camera
		this.domElement = domElement

		domElement.ownerDocument.addEventListener('click', this.onMouseClick)

		if (this.supportsPointerEvents) {
			domElement.ownerDocument.addEventListener('pointermove', this.onDocumentMouseMove)
			domElement.ownerDocument.addEventListener('pointerdown', this.onMouseDown)
			domElement.ownerDocument.addEventListener('pointerup', this.onMouseUp)
		} else {
			domElement.ownerDocument.addEventListener('mousemove',this.onDocumentMouseMove)
			domElement.ownerDocument.addEventListener('mousedown', this.onMouseDown)
			domElement.ownerDocument.addEventListener('mouseup', this.onMouseUp)
			domElement.ownerDocument.addEventListener('touchstart', this.onTouchStart, { passive: true })
			domElement.ownerDocument.addEventListener('touchmove', this.onTouchMove, { passive: true })
			domElement.ownerDocument.addEventListener('touchend', this.onTouchEnd, { passive: true })
		}
	}

	dispose = () => {
		this.domElement.removeEventListener('click', this.onMouseClick)

		if (this.supportsPointerEvents) {
			this.domElement.ownerDocument.removeEventListener('pointermove', this.onDocumentMouseMove)
			this.domElement.removeEventListener('pointerdown', this.onMouseDown)
			this.domElement.removeEventListener('pointerup', this.onMouseUp)
		} else {
			this.domElement.ownerDocument.removeEventListener('mousemove', this.onDocumentMouseMove)
			this.domElement.removeEventListener('mousedown', this.onMouseDown)
			this.domElement.removeEventListener('mouseup', this.onMouseUp)
			this.domElement.removeEventListener('touchstart', this.onTouchStart)
			this.domElement.removeEventListener('touchmove', this.onTouchMove)
			this.domElement.removeEventListener('touchend', this.onTouchEnd)
		}
	}

	add = (object: Object3D, type: keyof HTMLElementEventMap | 'pinch', requiresIntersection = true) => {
		this.interactiveObjects.push({ target: object, type, requiresIntersection })
	}

	remove = (object: Object3D, type: keyof HTMLElementEventMap) => {
		this.interactiveObjects = this.interactiveObjects.filter(o => o.target.uuid !== object.uuid || o.type !== type)
	}

	dispatchForEvent = (type: keyof HTMLElementEventMap, htmlElementEvent: MouseEvent | TouchEvent, x: number, y: number) => {
		this.mapPositionToPoint(this.mousePosition, x, y)
		this.raycaster.setFromCamera(this.mousePosition, this.camera)

		const objectsToConsider: InteractiveObject[] = []
		for (let i = 0; i < this.interactiveObjects.length; i++) {
			const interactiveObject = this.interactiveObjects[i]
			if (interactiveObject.type === type) objectsToConsider.push(interactiveObject)
		}

		// dispatch event for all intersection in the order of proximity
		const intersects = this.raycaster.intersectObjects(objectsToConsider.map(o => o.target))
		const notifiedObjectIDs: string[] = []
		for (let i = 0; i < intersects.length; i++) {
			const intersect = intersects[i]
			const event: InteractiveEvent2<typeof type> = {
				type: type,
				target: intersect.object,
				htmlElementEvent: htmlElementEvent,
				position: this.mousePosition,
				intersection: intersect
			}
			notifiedObjectIDs.push(event.target.uuid)
			event.target.dispatchEvent(event)
		}

		// check objects that do not require intersection
		for (let i = 0; i < objectsToConsider.length; i++) {
			const interactiveObject = objectsToConsider[i]
			if (notifiedObjectIDs.includes(interactiveObject.target.uuid)) continue
			if (interactiveObject.requiresIntersection) continue
			const event: InteractiveEvent2<typeof type> = {
				type: type,
				target: interactiveObject.target,
				htmlElementEvent: htmlElementEvent,
				position: this.mousePosition,
				intersection: null
			}
			event.target.dispatchEvent(event)
		}
	}

	get pinchDistance(): number | null {
		if (Object.keys(this.lastTouches).length !== 2) return null
		const points: [number, number][] = []
		for (const pointerId in this.lastTouches) {
			const pointerEvent = this.lastTouches[pointerId]
			points.push([pointerEvent.clientX, pointerEvent.clientY])
		}
		const distance = Math.sqrt((points[0][0] - points[1][0]) ** 2 + (points[0][1] - points[1][1]) ** 2)
		return distance
	}

	dispatchPinch = (pointerEvent: PointerEvent) => {
		const lastDistance = this.pinchDistance
		this.lastTouches[pointerEvent.pointerId] = pointerEvent
		const newDistance = this.pinchDistance
		if (lastDistance === null || newDistance === null) return
		for (let i = 0; i < this.interactiveObjects.length; i++) {
			const interactiveObject = this.interactiveObjects[i]
			if (interactiveObject.type !== 'pinch') continue
			const pinchEvent: PinchEvent = {
				type: 'pinch',
				target: interactiveObject.target,
				deltaScale: newDistance / lastDistance
			}
			pinchEvent.target.dispatchEvent(pinchEvent)
		}
	}

	onDocumentMouseMove = (mouseEvent: MouseEvent) => {
		this.dispatchForEvent('mousemove', mouseEvent, mouseEvent.clientX, mouseEvent.clientY)
		this.dispatchPinch(mouseEvent as PointerEvent)
	}

	onTouchMove = (touchEvent: TouchEvent) => {
		this.dispatchForEvent('touchmove', touchEvent, touchEvent.touches[0].clientX, touchEvent.touches[0].clientY)
	}

	onMouseClick = (mouseEvent: MouseEvent) => {
		this.dispatchForEvent('click', mouseEvent, mouseEvent.clientX, mouseEvent.clientY)
	}

	onMouseDown = (mouseEvent: MouseEvent) => {
		this.dispatchForEvent('mousedown', mouseEvent, mouseEvent.clientX, mouseEvent.clientY)
		this.dispatchPinch(mouseEvent as PointerEvent)
	}

	onTouchStart = (touchEvent: TouchEvent) => {
		this.dispatchForEvent('touchstart', touchEvent, touchEvent.touches[0].clientX, touchEvent.touches[0].clientY)
	}

	onMouseUp = (mouseEvent: MouseEvent) => {
		this.dispatchForEvent('mouseup', mouseEvent, mouseEvent.clientX, mouseEvent.clientY)
		delete this.lastTouches[(mouseEvent as PointerEvent).pointerId]
	}

	onTouchEnd = (touchEvent: TouchEvent) => {
		this.dispatchForEvent('touchend', touchEvent, touchEvent.touches[0].clientX, touchEvent.touches[0].clientY)
	}

	mapPositionToPoint = (point: Vector2, x: number, y: number) => {
		let rect

		// IE 11 fix
		if (!this.renderer.domElement.parentElement) {
			rect = {
				x: 0,
				y: 0,
				left: 0,
				top: 0,
				width: 0,
				height: 0,
			}
		} else {
			rect = this.renderer.domElement.getBoundingClientRect()
		}

		point.x = ((x - rect.left) / rect.width) * 2 - 1
		point.y = -((y - rect.top) / rect.height) * 2 + 1
	}
}