// Originally sourced from from https://github.com/markuslerner/THREE.Interactive
// Modified and Typescript-adapted by Rintaro Kawagishi 26/01/2022

export class InteractiveObject {
	target: THREE.Object3D
	name: string
	intersection: THREE.Intersection | null = null
	lastIntersection: THREE.Intersection | null = null

  constructor(target: THREE.Object3D, name: string) {
    this.target = target;
    this.name = name;
  }
}

export class InteractiveEvent<K extends keyof HTMLElementEventMap> {
	cancelBubble: boolean = false
	type: K
	originalEvent: HTMLElementEventMap[K] | null
	mousePosition: THREE.Vector2 = new THREE.Vector2(0, 0)
	intersection: THREE.Intersection | null = null
	
  constructor(type: K, originalEvent: HTMLElementEventMap[K] | null = null) {
    this.type = type;
    this.originalEvent = originalEvent;
  }

  stopPropagation() {
    this.cancelBubble = true;
  }
}

export class InteractionManager {
	renderer: THREE.WebGLRenderer
	camera: THREE.Camera
	domElement: HTMLCanvasElement
	mouse: THREE.Vector2
	supportsPointerEvents: boolean
	interactiveObjects: InteractiveObject[]
	raycaster: THREE.Raycaster
	treatTouchEventsAsMouseEvents: boolean

  constructor(renderer: THREE.WebGLRenderer, camera: THREE.Camera, domElement: HTMLCanvasElement) {
    this.renderer = renderer;
    this.camera = camera;
    this.domElement = domElement;
    this.mouse = new THREE.Vector2(-1, 1); // top left default position
    this.supportsPointerEvents = !!window.PointerEvent;
    this.interactiveObjects = [];
    this.raycaster = new THREE.Raycaster();

    domElement.ownerDocument.addEventListener('click', this.onMouseClick);

    if (this.supportsPointerEvents) {
      domElement.ownerDocument.addEventListener('pointermove', this.onDocumentMouseMove);
      domElement.addEventListener('pointerdown', this.onMouseDown);
      domElement.addEventListener('pointerup', this.onMouseUp);
    } else {
      domElement.ownerDocument.addEventListener('mousemove',this.onDocumentMouseMove);
      domElement.addEventListener('mousedown', this.onMouseDown);
      domElement.addEventListener('mouseup', this.onMouseUp);
      domElement.addEventListener('touchstart', this.onTouchStart, { passive: true });
      domElement.addEventListener('touchmove', this.onTouchMove, { passive: true });
      domElement.addEventListener('touchend', this.onTouchEnd, { passive: true });
    }

    this.treatTouchEventsAsMouseEvents = true;
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

  add = (object: THREE.Object3D, childNames: string[] = []) => {
		if (childNames.length > 0) {
			childNames.forEach((name) => {
				const o = object.getObjectByName(name);
				if (o) {
					const interactiveObject = new InteractiveObject(o, name);
					this.interactiveObjects.push(interactiveObject);
				}
			});
		} else {
			const interactiveObject = new InteractiveObject(object, object.name);
			this.interactiveObjects.push(interactiveObject);
		}
  };

  remove = (object: THREE.Object3D, childNames: string[] = []) => {
		if (childNames.length > 0) {
			const interactiveObjectsNew: InteractiveObject[] = [];
			this.interactiveObjects.forEach((o) => {
				if (!childNames.includes(o.name)) {
					interactiveObjectsNew.push(o);
				}
			});
			this.interactiveObjects = interactiveObjectsNew;
		} else {
			const interactiveObjectsNew: InteractiveObject[] = [];
			this.interactiveObjects.forEach((o) => {
				if (o.name !== object.name) {
					interactiveObjectsNew.push(o);
				}
			});
			this.interactiveObjects = interactiveObjectsNew;
		}
  };

  update = () => {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    this.interactiveObjects.forEach((object) => { this.checkIntersection(object); });

    const eventOut = new InteractiveEvent('mouseout');
    this.interactiveObjects.forEach((object) => {
      if (object.intersection === null && object.lastIntersection !== null) this.dispatch(object, eventOut);
    });
    const eventOver = new InteractiveEvent('mouseover');
    this.interactiveObjects.forEach((object) => {
      if (object.intersection !== null && object.lastIntersection === null) this.dispatch(object, eventOver);
    });
  };

  checkIntersection = (object: InteractiveObject) => {
    var intersects = this.raycaster.intersectObjects([object.target], true);
		object.lastIntersection = object.intersection
		object.intersection = intersects.length > 0 ? intersects[0] : null
  };

  onDocumentMouseMove = (mouseEvent: MouseEvent) => {
    // event.preventDefault();
    this.mapPositionToPoint(this.mouse, mouseEvent.clientX, mouseEvent.clientY);
    const event = new InteractiveEvent('mousemove', mouseEvent);

    this.interactiveObjects.forEach((object) => {
      this.dispatch(object, event);
    });
  };

  onTouchMove = (touchEvent: TouchEvent) => {
    // event.preventDefault();
    this.mapPositionToPoint(this.mouse, touchEvent.touches[0].clientX, touchEvent.touches[0].clientY);

    const event = new InteractiveEvent(
      this.treatTouchEventsAsMouseEvents ? 'mousemove' : 'touchmove',
      touchEvent
    );

    this.interactiveObjects.forEach((object) => {
      this.dispatch(object, event);
    });
  };

  onMouseClick = (mouseEvent: MouseEvent) => {
		this.mapPositionToPoint(this.mouse, mouseEvent.clientX, mouseEvent.clientY);
    this.update();

    const event = new InteractiveEvent('click', mouseEvent);

    this.interactiveObjects.forEach((object) => {
      if (object.intersection !== null) {
        this.dispatch(object, event);
      }
    });
  };

  onMouseDown = (mouseEvent: MouseEvent) => {
    this.mapPositionToPoint(this.mouse, mouseEvent.clientX, mouseEvent.clientY);
    this.update();

    const event = new InteractiveEvent('mousedown', mouseEvent);

    this.interactiveObjects.forEach((object) => {
      if (object.intersection !== null) {
        this.dispatch(object, event);
      }
    });
  };

  onTouchStart = (touchEvent: TouchEvent) => {
    this.mapPositionToPoint(this.mouse, touchEvent.touches[0].clientX, touchEvent.touches[0].clientY);
    this.update();

    const event = new InteractiveEvent(
      this.treatTouchEventsAsMouseEvents ? 'mousedown' : 'touchstart',
      touchEvent
    );

    this.interactiveObjects.forEach((object) => {
      if (object.intersection !== null) {
        this.dispatch(object, event);
      }
    });
  };

  onMouseUp = (mouseEvent: MouseEvent) => {
		this.mapPositionToPoint(this.mouse, mouseEvent.clientX, mouseEvent.clientY);
		this.update()

    const event = new InteractiveEvent('mouseup', mouseEvent);

    this.interactiveObjects.forEach((object) => {
      this.dispatch(object, event);
    });
  };

  onTouchEnd = (touchEvent: TouchEvent) => {
    this.mapPositionToPoint(this.mouse, touchEvent.touches[0].clientX, touchEvent.touches[0].clientY);
    this.update();

    const event = new InteractiveEvent(
      this.treatTouchEventsAsMouseEvents ? 'mouseup' : 'touchend',
      touchEvent
    );

    this.interactiveObjects.forEach((object) => {
      this.dispatch(object, event);
    });
  };

  dispatch = (object: InteractiveObject, event: InteractiveEvent<any>) => {
    if (object.target && !event.cancelBubble) {
      event.mousePosition = this.mouse;
      event.intersection = object.intersection;
      object.target.dispatchEvent(event);
    }
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