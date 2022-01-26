// Originally sourced from from https://github.com/markuslerner/THREE.Interactive
// Modified and Typescript-adapted by Rintaro Kawagishi 26/01/2022
export class InteractiveObject {
    constructor(target, name) {
        this.intersection = null;
        this.lastIntersection = null;
        this.target = target;
        this.name = name;
    }
}
export class InteractiveEvent {
    constructor(type, originalEvent = null) {
        this.cancelBubble = false;
        this.mousePosition = new THREE.Vector2(0, 0);
        this.intersection = null;
        this.type = type;
        this.originalEvent = originalEvent;
    }
    stopPropagation() {
        this.cancelBubble = true;
    }
}
export class InteractionManager {
    constructor(renderer, camera, domElement) {
        this.dispose = () => {
            this.domElement.removeEventListener('click', this.onMouseClick);
            if (this.supportsPointerEvents) {
                this.domElement.ownerDocument.removeEventListener('pointermove', this.onDocumentMouseMove);
                this.domElement.removeEventListener('pointerdown', this.onMouseDown);
                this.domElement.removeEventListener('pointerup', this.onMouseUp);
            }
            else {
                this.domElement.ownerDocument.removeEventListener('mousemove', this.onDocumentMouseMove);
                this.domElement.removeEventListener('mousedown', this.onMouseDown);
                this.domElement.removeEventListener('mouseup', this.onMouseUp);
                this.domElement.removeEventListener('touchstart', this.onTouchStart);
                this.domElement.removeEventListener('touchmove', this.onTouchMove);
                this.domElement.removeEventListener('touchend', this.onTouchEnd);
            }
        };
        this.add = (object, childNames = []) => {
            if (childNames.length > 0) {
                childNames.forEach((name) => {
                    const o = object.getObjectByName(name);
                    if (o) {
                        const interactiveObject = new InteractiveObject(o, name);
                        this.interactiveObjects.push(interactiveObject);
                    }
                });
            }
            else {
                const interactiveObject = new InteractiveObject(object, object.name);
                this.interactiveObjects.push(interactiveObject);
            }
        };
        this.remove = (object, childNames = []) => {
            if (childNames.length > 0) {
                const interactiveObjectsNew = [];
                this.interactiveObjects.forEach((o) => {
                    if (!childNames.includes(o.name)) {
                        interactiveObjectsNew.push(o);
                    }
                });
                this.interactiveObjects = interactiveObjectsNew;
            }
            else {
                const interactiveObjectsNew = [];
                this.interactiveObjects.forEach((o) => {
                    if (o.name !== object.name) {
                        interactiveObjectsNew.push(o);
                    }
                });
                this.interactiveObjects = interactiveObjectsNew;
            }
        };
        this.update = () => {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            this.interactiveObjects.forEach((object) => { this.checkIntersection(object); });
            const eventOut = new InteractiveEvent('mouseout');
            this.interactiveObjects.forEach((object) => {
                if (object.intersection === null && object.lastIntersection !== null)
                    this.dispatch(object, eventOut);
            });
            const eventOver = new InteractiveEvent('mouseover');
            this.interactiveObjects.forEach((object) => {
                if (object.intersection !== null && object.lastIntersection === null)
                    this.dispatch(object, eventOver);
            });
        };
        this.checkIntersection = (object) => {
            var intersects = this.raycaster.intersectObjects([object.target], true);
            object.lastIntersection = object.intersection;
            object.intersection = intersects.length > 0 ? intersects[0] : null;
        };
        this.onDocumentMouseMove = (mouseEvent) => {
            // event.preventDefault();
            this.mapPositionToPoint(this.mouse, mouseEvent.clientX, mouseEvent.clientY);
            const event = new InteractiveEvent('mousemove', mouseEvent);
            this.interactiveObjects.forEach((object) => {
                this.dispatch(object, event);
            });
        };
        this.onTouchMove = (touchEvent) => {
            // event.preventDefault();
            this.mapPositionToPoint(this.mouse, touchEvent.touches[0].clientX, touchEvent.touches[0].clientY);
            const event = new InteractiveEvent(this.treatTouchEventsAsMouseEvents ? 'mousemove' : 'touchmove', touchEvent);
            this.interactiveObjects.forEach((object) => {
                this.dispatch(object, event);
            });
        };
        this.onMouseClick = (mouseEvent) => {
            this.mapPositionToPoint(this.mouse, mouseEvent.clientX, mouseEvent.clientY);
            this.update();
            const event = new InteractiveEvent('click', mouseEvent);
            this.interactiveObjects.forEach((object) => {
                if (object.intersection !== null) {
                    this.dispatch(object, event);
                }
            });
        };
        this.onMouseDown = (mouseEvent) => {
            this.mapPositionToPoint(this.mouse, mouseEvent.clientX, mouseEvent.clientY);
            this.update();
            const event = new InteractiveEvent('mousedown', mouseEvent);
            this.interactiveObjects.forEach((object) => {
                if (object.intersection !== null) {
                    this.dispatch(object, event);
                }
            });
        };
        this.onTouchStart = (touchEvent) => {
            this.mapPositionToPoint(this.mouse, touchEvent.touches[0].clientX, touchEvent.touches[0].clientY);
            this.update();
            const event = new InteractiveEvent(this.treatTouchEventsAsMouseEvents ? 'mousedown' : 'touchstart', touchEvent);
            this.interactiveObjects.forEach((object) => {
                if (object.intersection !== null) {
                    this.dispatch(object, event);
                }
            });
        };
        this.onMouseUp = (mouseEvent) => {
            this.mapPositionToPoint(this.mouse, mouseEvent.clientX, mouseEvent.clientY);
            this.update();
            const event = new InteractiveEvent('mouseup', mouseEvent);
            this.interactiveObjects.forEach((object) => {
                this.dispatch(object, event);
            });
        };
        this.onTouchEnd = (touchEvent) => {
            this.mapPositionToPoint(this.mouse, touchEvent.touches[0].clientX, touchEvent.touches[0].clientY);
            this.update();
            const event = new InteractiveEvent(this.treatTouchEventsAsMouseEvents ? 'mouseup' : 'touchend', touchEvent);
            this.interactiveObjects.forEach((object) => {
                this.dispatch(object, event);
            });
        };
        this.dispatch = (object, event) => {
            if (object.target && !event.cancelBubble) {
                event.mousePosition = this.mouse;
                event.intersection = object.intersection;
                object.target.dispatchEvent(event);
            }
        };
        this.mapPositionToPoint = (point, x, y) => {
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
            }
            else {
                rect = this.renderer.domElement.getBoundingClientRect();
            }
            point.x = ((x - rect.left) / rect.width) * 2 - 1;
            point.y = -((y - rect.top) / rect.height) * 2 + 1;
        };
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
        }
        else {
            domElement.ownerDocument.addEventListener('mousemove', this.onDocumentMouseMove);
            domElement.addEventListener('mousedown', this.onMouseDown);
            domElement.addEventListener('mouseup', this.onMouseUp);
            domElement.addEventListener('touchstart', this.onTouchStart, { passive: true });
            domElement.addEventListener('touchmove', this.onTouchMove, { passive: true });
            domElement.addEventListener('touchend', this.onTouchEnd, { passive: true });
        }
        this.treatTouchEventsAsMouseEvents = true;
    }
}
//# sourceMappingURL=interactive.js.map