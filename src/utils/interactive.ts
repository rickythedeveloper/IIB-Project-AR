// Originally sourced from from https://github.com/markuslerner/THREE.Interactive
// Modified and Typescript-adapted by Rintaro Kawagishi

interface InteractiveObject {
  target: THREE.Object3D
  type: keyof HTMLElementEventMap
  requiresIntersection: boolean
}

interface InteractiveEvent2<K extends keyof HTMLElementEventMap> extends THREE.Event {
  type: K
  target: THREE.Object3D
  htmlElementEvent: HTMLElementEventMap[K] | null
  position: THREE.Vector2 // mouse / pointer position
  intersection: THREE.Intersection | null
}

export class InteractionManager {
	renderer: THREE.WebGLRenderer
	camera: THREE.Camera
	domElement: HTMLCanvasElement
	mousePosition: THREE.Vector2 = new THREE.Vector2(-1, 1); // top left default position
	supportsPointerEvents: boolean = !!window.PointerEvent
	interactiveObjects: InteractiveObject[] = []
	raycaster: THREE.Raycaster = new THREE.Raycaster()
	treatTouchEventsAsMouseEvents: boolean = true

  constructor(renderer: THREE.WebGLRenderer, camera: THREE.Camera, domElement: HTMLCanvasElement) {
    this.renderer = renderer;
    this.camera = camera;
    this.domElement = domElement;

    domElement.ownerDocument.addEventListener('click', this.onMouseClick);

    if (this.supportsPointerEvents) {
      domElement.ownerDocument.addEventListener('pointermove', this.onDocumentMouseMove);
      domElement.ownerDocument.addEventListener('pointerdown', this.onMouseDown);
      domElement.ownerDocument.addEventListener('pointerup', this.onMouseUp);
    } else {
      domElement.ownerDocument.addEventListener('mousemove',this.onDocumentMouseMove);
      domElement.ownerDocument.addEventListener('mousedown', this.onMouseDown);
      domElement.ownerDocument.addEventListener('mouseup', this.onMouseUp);
      domElement.ownerDocument.addEventListener('touchstart', this.onTouchStart, { passive: true });
      domElement.ownerDocument.addEventListener('touchmove', this.onTouchMove, { passive: true });
      domElement.ownerDocument.addEventListener('touchend', this.onTouchEnd, { passive: true });
    }
  }

  dispose = () => {
    this.domElement.removeEventListener('click', this.onMouseClick);

    if (this.supportsPointerEvents) {
      this.domElement.ownerDocument.removeEventListener('pointermove', this.onDocumentMouseMove);
      this.domElement.removeEventListener('pointerdown', this.onMouseDown);
      this.domElement.removeEventListener('pointerup', this.onMouseUp);
    } else {
      this.domElement.ownerDocument.removeEventListener('mousemove', this.onDocumentMouseMove);
      this.domElement.removeEventListener('mousedown', this.onMouseDown);
      this.domElement.removeEventListener('mouseup', this.onMouseUp);
      this.domElement.removeEventListener('touchstart', this.onTouchStart);
      this.domElement.removeEventListener('touchmove', this.onTouchMove);
      this.domElement.removeEventListener('touchend', this.onTouchEnd);
    }
  };

  add = (object: THREE.Object3D, type: keyof HTMLElementEventMap, requiresIntersection: boolean = true) => {
    this.interactiveObjects.push({target: object, type, requiresIntersection})
  }

  remove = (object: THREE.Object3D, type: keyof HTMLElementEventMap) => {
    this.interactiveObjects = this.interactiveObjects.filter(o => o.target.uuid !== object.uuid || o.type !== type)
  };

  dispatchForEvent = (type: keyof HTMLElementEventMap, htmlElementEvent: MouseEvent | TouchEvent, x: number, y: number) => {
    this.mapPositionToPoint(this.mousePosition, x, y);
    this.raycaster.setFromCamera(this.mousePosition, this.camera)
    for (let i = 0; i < this.interactiveObjects.length; i++) {
      const interactiveObject = this.interactiveObjects[i]
      if (interactiveObject.type !== type) continue 
      const intersects = this.raycaster.intersectObject(interactiveObject.target)
      const intersect = intersects.length > 0 ? intersects[0] : null
      if (interactiveObject.requiresIntersection && intersect === null) continue
      else {
        const event: InteractiveEvent2<typeof type> = {
          type: type,
          target: interactiveObject.target,
          htmlElementEvent: htmlElementEvent,
          position: this.mousePosition,
          intersection: intersect
        }
        event.target.dispatchEvent(event)
      }
    }
  }

  onDocumentMouseMove = (mouseEvent: MouseEvent) => {
    this.dispatchForEvent('mousemove', mouseEvent, mouseEvent.clientX, mouseEvent.clientY)
  };

  onTouchMove = (touchEvent: TouchEvent) => {
    this.dispatchForEvent('touchmove', touchEvent, touchEvent.touches[0].clientX, touchEvent.touches[0].clientY)
  };

  onMouseClick = (mouseEvent: MouseEvent) => {
    this.dispatchForEvent('click', mouseEvent, mouseEvent.clientX, mouseEvent.clientY)
  };

  onMouseDown = (mouseEvent: MouseEvent) => {
    this.dispatchForEvent('mousedown', mouseEvent, mouseEvent.clientX, mouseEvent.clientY)
  };

  onTouchStart = (touchEvent: TouchEvent) => {
    this.dispatchForEvent('touchstart', touchEvent, touchEvent.touches[0].clientX, touchEvent.touches[0].clientY)
  };

  onMouseUp = (mouseEvent: MouseEvent) => {
    this.dispatchForEvent('mouseup', mouseEvent, mouseEvent.clientX, mouseEvent.clientY)
  };

  onTouchEnd = (touchEvent: TouchEvent) => {
    this.dispatchForEvent('touchend', touchEvent, touchEvent.touches[0].clientX, touchEvent.touches[0].clientY)
  };

  mapPositionToPoint = (point: THREE.Vector2, x: number, y: number) => {
    let rect;

    // IE 11 fix
    if (!this.renderer.domElement.parentElement) {
      rect = {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      };
    } else {
      rect = this.renderer.domElement.getBoundingClientRect();
    }

    point.x = ((x - rect.left) / rect.width) * 2 - 1;
    point.y = -((y - rect.top) / rect.height) * 2 + 1;
  };
}