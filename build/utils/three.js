/**
 * Given some data in rows, return the triangulated vertices.
 * @param {number[][][]} rows Each point is a 3D array. Each row is an array of points.
 * @returns
 */
export const convertRowsToVertices = (rows) => {
    const verticesArray = [];
    for (let i = 0; i < rows.length - 1; i++) {
        const row = rows[i];
        const nextRow = rows[i + 1];
        const verticesRow = [];
        for (let j = 0; j < row.length - 1; j++) {
            verticesRow.push(...row[j], ...row[j + 1], ...nextRow[j]);
            verticesRow.push(...row[j + 1], ...nextRow[j], ...nextRow[j + 1]);
        }
        verticesArray.push(...verticesRow);
    }
    return new Float32Array(verticesArray);
};
var Axis;
(function (Axis) {
    Axis[Axis["x"] = 0] = "x";
    Axis[Axis["y"] = 1] = "y";
    Axis[Axis["z"] = 2] = "z";
})(Axis || (Axis = {}));
export const createArrow = (direction, length, colorHex) => new THREE.ArrowHelper(new THREE.Vector3(direction === 'x' ? 1 : 0, direction === 'y' ? 1 : 0, direction === 'z' ? 1 : 0), new THREE.Vector3(0, 0, 0), length, colorHex);
export const rotationQuaternion = (direction, angle) => new THREE.Quaternion(direction == 'x' ? Math.sin(angle / 2) : 0, direction == 'y' ? Math.sin(angle / 2) : 0, direction == 'z' ? Math.sin(angle / 2) : 0, Math.cos(angle / 2));
const vertexShader = `
	attribute vec3 color;	
	varying vec3 v_color;
	void main() {
		v_color = color;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;
const fragmentShader = `
	varying vec3 v_color;
	void main() {
		gl_FragColor = vec4(v_color, 0.5);
	}
`;
export const createBufferObject = (vertices, indices, colors) => {
    const geometry = new THREE.BufferGeometry();
    geometry.index = new THREE.BufferAttribute(indices, 1);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
};
export const createMarkerIndicator = (color, opacity) => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({ color, opacity, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.quaternion.set(Math.sin(Math.PI / 4), 0, 0, Math.cos(Math.PI / 4));
    return mesh;
};
export const createLine = (color) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Array(6).fill(0)), 3));
    const material = new THREE.LineBasicMaterial({ color });
    const mesh = new THREE.Line(geometry, material);
    return mesh;
};
class Circle3D extends THREE.Curve {
    constructor(radius) {
        super();
        this.radius = radius;
    }
    getPoint(t, optionalTarget = new THREE.Vector3()) {
        const tx = 0;
        const ty = this.radius * Math.sin(2 * Math.PI * t);
        const tz = this.radius * Math.cos(2 * Math.PI * t);
        return optionalTarget.set(tx, ty, tz);
    }
}
export const createRing = (ringRadius, tubeRadius, nSegments, color) => {
    const circle = new Circle3D(ringRadius);
    const geometry = new THREE.TubeGeometry(circle, nSegments, tubeRadius, 8, true);
    const material = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
};
const ROTATION_RING_RADIUS = 0.5;
const ROTATION_RING_TUBE_RADIUS = 0.1;
const ROTATION_RING_N_SEGMENTS = 16;
const axisColor = (axis) => axis === 'x' ? 0xff0000 : axis === 'y' ? 0x00ff00 : 0x0000ff;
const createRotationRing = (axis) => {
    const color = axisColor(axis);
    const ring = createRing(ROTATION_RING_RADIUS, ROTATION_RING_TUBE_RADIUS, ROTATION_RING_N_SEGMENTS, color);
    const invisiblePlaneGeometry = new THREE.PlaneGeometry(20, 20);
    const invisiblePlaneMaterial = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
    const invisiblePlane = new THREE.Mesh(invisiblePlaneGeometry, invisiblePlaneMaterial);
    invisiblePlane.visible = false;
    invisiblePlane.quaternion.premultiply(new THREE.Quaternion(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)));
    const visiblePlaneGeometry = new THREE.PlaneGeometry(3, 3);
    const visiblePlaneMaterial = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const visiblePlane = new THREE.Mesh(visiblePlaneGeometry, visiblePlaneMaterial);
    visiblePlane.visible = false;
    visiblePlane.quaternion.premultiply(new THREE.Quaternion(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)));
    const ringPlaneContainer = new THREE.Group();
    const offset = 1;
    const positionOffset = new THREE.Vector3(axis === 'x' ? offset : 0, axis === 'y' ? offset : 0, axis === 'z' ? offset : 0);
    ringPlaneContainer.position.set(positionOffset.x, positionOffset.y, positionOffset.z);
    ringPlaneContainer.quaternion.premultiply(axis === 'x' ? new THREE.Quaternion(0, 0, 0, 1) :
        axis === 'y' ? new THREE.Quaternion(0, 0, Math.sin(Math.PI / 4), Math.cos(Math.PI / 4)) :
            new THREE.Quaternion(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)));
    ringPlaneContainer.add(ring, invisiblePlane, visiblePlane);
    return { ringPlaneContainer, ring, visiblePlane, invisiblePlane };
};
export const createRotationRings = () => [createRotationRing('x'), createRotationRing('y'), createRotationRing('z')];
const createThickArrow = (radius, height, color) => {
    const cylinderHeight = height * 0.7;
    const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, cylinderHeight, 32);
    const cylinderMaterial = new THREE.MeshStandardMaterial({ color });
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.position.set(0, cylinderHeight / 2, 0);
    const coneHeight = height - cylinderHeight;
    const coneRadius = radius * 1.5;
    const coneGeometry = new THREE.ConeGeometry(coneRadius, coneHeight, 32);
    const coneMaterial = new THREE.MeshStandardMaterial({ color });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.set(0, cylinderHeight + coneHeight / 2, 0);
    const arrow = new THREE.Group();
    arrow.add(cylinder, cone);
    return arrow;
};
const createTranslationArrow = (axis) => {
    const color = axisColor(axis);
    const arrow = createThickArrow(0.1, 1, color);
    arrow.quaternion.premultiply(rotationQuaternion('z', -Math.PI / 2));
    const invisiblePlaneGeometry = new THREE.PlaneGeometry(10, 10);
    const invisiblePlaneMaterial = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
    const invisiblePlane = new THREE.Mesh(invisiblePlaneGeometry, invisiblePlaneMaterial);
    invisiblePlane.visible = false;
    const visiblePlaneGeometry = new THREE.PlaneGeometry(2, 1);
    const visiblePlaneMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.1, color, side: THREE.DoubleSide });
    const visiblePlane = new THREE.Mesh(visiblePlaneGeometry, visiblePlaneMaterial);
    visiblePlane.visible = false;
    const container = new THREE.Group();
    container.add(arrow, invisiblePlane, visiblePlane);
    container.quaternion.premultiply(axis === 'x' ? rotationQuaternion('x', 0) : axis === 'y' ? rotationQuaternion('z', Math.PI / 2) : rotationQuaternion('y', -Math.PI / 2));
    const offset = 1.5;
    container.position.set(axis === 'x' ? offset : 0, axis === 'y' ? offset : 0, axis === 'z' ? offset : 0);
    return { container, arrow, invisiblePlane, visiblePlane };
};
export const createTranslationArrows = () => [createTranslationArrow('x'), createTranslationArrow('y'), createTranslationArrow('z')];
//# sourceMappingURL=three.js.map