import * as THREE from "three";
import { CSG } from "three-csg-ts";
import { BoxJointGenerator } from "../generators/BoxJointGenerator.js";

/**
 * Handles visualization of box joints on board geometry.
 * Subtracts groove volumes from board meshes using CSG boolean operations,
 * rendering grooves as voids (empty space) rather than solid geometry.
 */
export class JointVisualizer {
  constructor(scene3D, materialLibrary) {
    this.scene3D = scene3D;
    this.materialLibrary = materialLibrary;
  }

  /**
   * Removes all joint visualization meshes from the scene.
   * Note: Grooves are now part of board geometry, so this mainly handles cleanup.
   */
  clearAll() {
    // No separate joint meshes to clear - grooves are part of board geometry
  }

  /**
   * Processes all boards and visualizes their joints.
   * Subtracts groove volumes from board geometry using CSG operations.
   * @param {Array} boards - Array of board objects with dimensions and joints
   */
  visualizeAllBoards(boards) {
    this.clearAll();
    
    boards.forEach((board) => {
      if (!board || !board.joints || !board.dimensions) {
        console.warn("Invalid board object:", board);
        return;
      }

      // Ensure board has a mesh, and if it's been grooved, recreate base mesh
      if (!board.mesh) {
        board.createMesh(this.materialLibrary);
        this.scene3D.addMesh(board.mesh);
      } else {
        // If mesh exists but might be grooved, ensure we have base geometry
        // Recreate base mesh to ensure we start from clean geometry
        const originalMaterial = board.mesh.material;
        const originalPosition = board.mesh.position.clone();
        const originalRotation = board.mesh.rotation.clone();
        const originalUserData = { ...board.mesh.userData };
        
        // Remove old mesh from scene
        this.scene3D.removeMesh(board.mesh);
        board.mesh.geometry.dispose();
        
        // Create fresh base mesh
        const { width, height, thickness } = board.dimensions;
        const baseGeometry = new THREE.BoxGeometry(width, height, thickness);
        board.mesh = new THREE.Mesh(baseGeometry, originalMaterial);
        board.mesh.position.copy(originalPosition);
        board.mesh.rotation.copy(originalRotation);
        board.mesh.userData = originalUserData;
        
        // Add back to scene
        this.scene3D.addMesh(board.mesh);
      }

      // Collect all groove geometries for all sides
      const grooveGeometries = [];
      const { thickness } = board.dimensions;

      board.joints.forEach((joint, side) => {
        const dimension = this.getSideDimension(board, side);
        // Use joint.grooveDepth with fallback to board thickness, and clamp to thickness
        let grooveDepth = joint.grooveDepth ?? thickness;
        if (grooveDepth > thickness) {
          grooveDepth = thickness;
        }
        if (grooveDepth <= 0) {
          grooveDepth = thickness;
        }
        
        let result;
        
        if (joint.mode === "fixed") {
          result = BoxJointGenerator.generateFixedJoints(joint, dimension);
        } else {
          result = BoxJointGenerator.generateVariableJoints(joint, dimension);
        }
        
        if (result.valid) {
          result.segments.forEach(segment => {
            if (segment.type === "groove") {
              const grooveGeometry = this.createGrooveGeometry(board, side, segment, grooveDepth);
              if (grooveGeometry) {
                grooveGeometries.push(grooveGeometry);
              }
            }
          });
        }
      });

      // Apply all grooves at once using CSG subtraction
      if (grooveGeometries.length > 0) {
        this.subtractGroovesFromBoard(board, grooveGeometries);
      }
    });
  }

  /**
   * Determines the dimension of a board side for joint calculation.
   * @param {Object} board - Board object with dimensions
   * @param {string} side - Side identifier (top/bottom/left/right)
   * @returns {number} Dimension in the direction of the joint
   */
  getSideDimension(board, side) {
    switch (side) {
      case "top":
      case "bottom":
        return board.dimensions.width;
      case "left":
      case "right":
        return board.dimensions.height;
      default:
        return 0;
    }
  }

  /**
   * Creates groove geometry for CSG subtraction.
   * Returns a mesh positioned relative to board origin (not world space).
   * @param {Object} board - Board object
   * @param {string} side - Side identifier
   * @param {Object} segment - Segment defining groove location and size
   * @param {number} grooveDepth - Depth of groove cut
   * @returns {THREE.Mesh|null} Groove mesh for CSG operations or null
   */
  createGrooveGeometry(board, side, segment, grooveDepth) {
    const { width, height, thickness } = board.dimensions;
    
    let geometry, position;

    switch (side) {
      case "top":
        geometry = new THREE.BoxGeometry(segment.width, grooveDepth, thickness);
        position = new THREE.Vector3(
          -width / 2 + segment.start + segment.width / 2,
          height / 2 - grooveDepth / 2,
          0
        );
        break;
      case "bottom":
        geometry = new THREE.BoxGeometry(segment.width, grooveDepth, thickness);
        position = new THREE.Vector3(
          -width / 2 + segment.start + segment.width / 2,
          -height / 2 + grooveDepth / 2,
          0
        );
        break;
      case "left":
        geometry = new THREE.BoxGeometry(grooveDepth, segment.width, thickness);
        position = new THREE.Vector3(
          -width / 2 + grooveDepth / 2,
          -height / 2 + segment.start + segment.width / 2,
          0
        );
        break;
      case "right":
        geometry = new THREE.BoxGeometry(grooveDepth, segment.width, thickness);
        position = new THREE.Vector3(
          width / 2 - grooveDepth / 2,
          -height / 2 + segment.start + segment.width / 2,
          0
        );
        break;
      default:
        return null;
    }

    const mesh = new THREE.Mesh(geometry);
    mesh.position.copy(position);
    // Note: rotation is handled at board level, not per groove

    return mesh;
  }

  /**
   * Subtracts groove volumes from board mesh using CSG operations.
   * Properly handles mesh disposal and scene updates to avoid rendering issues.
   * Works in board-local coordinate space to ensure correct alignment.
   * @param {Object} board - Board object with mesh
   * @param {Array<THREE.Mesh>} grooveMeshes - Array of groove meshes to subtract
   */
  subtractGroovesFromBoard(board, grooveMeshes) {
    if (!board.mesh || grooveMeshes.length === 0) {
      return;
    }

    try {
      // Store original board properties
      const originalMaterial = board.mesh.material;
      const originalPosition = board.mesh.position.clone();
      const originalRotation = board.mesh.rotation.clone();
      const originalUserData = { ...board.mesh.userData };

      // Create temporary board mesh at origin for CSG operations (work in local space)
      const tempBoardMesh = new THREE.Mesh(board.mesh.geometry.clone(), originalMaterial);
      tempBoardMesh.position.set(0, 0, 0);
      tempBoardMesh.rotation.set(0, 0, 0);
      tempBoardMesh.scale.set(1, 1, 1);
      tempBoardMesh.updateMatrix();
      tempBoardMesh.updateMatrixWorld();

      // Convert board mesh to CSG
      const boardCSG = CSG.fromMesh(tempBoardMesh);

      // Convert all groove meshes to CSG and subtract them
      // Groove meshes are already in board-local coordinates
      let resultCSG = boardCSG;
      grooveMeshes.forEach(grooveMesh => {
        grooveMesh.scale.set(1, 1, 1);
        grooveMesh.updateMatrix();
        grooveMesh.updateMatrixWorld();
        const grooveCSG = CSG.fromMesh(grooveMesh);
        resultCSG = resultCSG.subtract(grooveCSG);
        // Dispose temporary groove geometry
        grooveMesh.geometry.dispose();
      });

      // Convert CSG result back to BufferGeometry
      // Use identity matrix since we worked in local space
      const identityMatrix = new THREE.Matrix4();
      const resultGeometry = resultCSG.toGeometry(identityMatrix);

      // Clean up temporary board mesh
      tempBoardMesh.geometry.dispose();

      // Remove old mesh from scene
      this.scene3D.removeMesh(board.mesh);
      
      // Dispose old geometry
      board.mesh.geometry.dispose();

      // Create new mesh with result geometry and original material
      const newMesh = new THREE.Mesh(resultGeometry, originalMaterial);
      newMesh.position.copy(originalPosition);
      newMesh.rotation.copy(originalRotation);
      newMesh.userData = originalUserData;

      // Update board reference
      board.mesh = newMesh;

      // Add new mesh to scene
      this.scene3D.addMesh(newMesh);
    } catch (error) {
      console.error("Error performing CSG subtraction:", error);
      // If CSG fails, keep original board mesh
    }
  }
}