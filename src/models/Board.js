import * as THREE from 'three';

export class Board {
  constructor(id, dimensions, position = { x: 0, y: 0, z: 0 }, rotation = { x: 0, y: 0, z: 0 }) {
    this.id = id;
    this.dimensions = dimensions;
    this.position = position;
    this.rotation = rotation;
    this.grainDirection = 'width';
    this.woodType = 'ash';
    this.joints = new Map();
    this.mesh = null;
    this.displayName = id;
  }

  createMesh(materialLibrary) {
    const { width, height, thickness } = this.dimensions;
    const geometry = new THREE.BoxGeometry(width, height, thickness);
    const material = materialLibrary.getMaterial(this.woodType, this.grainDirection);

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
    this.mesh.userData.boardId = this.id;

    return this.mesh;
  }

  updateMesh(materialLibrary = null) {
    if (!this.mesh) return;

    const { width, height, thickness } = this.dimensions;
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.BoxGeometry(width, height, thickness);

    // Update material if materialLibrary is provided and woodType might have changed
    if (materialLibrary) {
      const newMaterial = materialLibrary.getMaterial(this.woodType, this.grainDirection);
      this.mesh.material = newMaterial;
    }

    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
  }

  clone() {
    const cloned = new Board(this.id, { ...this.dimensions }, { ...this.position }, { ...this.rotation });
    cloned.grainDirection = this.grainDirection;
    cloned.woodType = this.woodType;
    cloned.joints = new Map(this.joints);
    cloned.displayName = this.displayName;
    return cloned;
  }
}
