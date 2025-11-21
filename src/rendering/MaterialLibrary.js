import * as THREE from 'three';
import ashTextureUrl from '../textures/woodmap_ash.png';
import cherryTextureUrl from '../textures/woodmap_cherry.png';

export class MaterialLibrary {
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.materials = new Map(); // Cache materials by woodType + grainDirection
    
    // Load textures
    this.ashTexture = this.textureLoader.load(ashTextureUrl);
    this.cherryTexture = this.textureLoader.load(cherryTextureUrl);
    
    // Configure texture properties
    [this.ashTexture, this.cherryTexture].forEach(texture => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
    });
  }

  getMaterial(woodType, grainDirection) {
    // Normalize grainDirection (handle 'horizontal' as 'width' for backward compatibility)
    const normalizedGrain = grainDirection === 'horizontal' ? 'width' : grainDirection;
    
    // Create cache key
    const cacheKey = `${woodType}_${normalizedGrain}`;
    
    // Return cached material if it exists
    if (this.materials.has(cacheKey)) {
      return this.materials.get(cacheKey);
    }
    
    // Get the appropriate texture
    const baseTexture = woodType === 'cherry' ? this.cherryTexture : this.ashTexture;
    
    // Clone texture to avoid modifying the base texture
    const texture = baseTexture.clone();
    
    // Set texture repeat based on grain direction
    // For height grain (vertical), texture is already vertical, no rotation needed
    // For width grain (horizontal), rotate texture 90 degrees
    if (normalizedGrain === 'width') {
      texture.rotation = Math.PI / 2; // Rotate 90 degrees
    } else {
      texture.rotation = 0; // No rotation for height grain
    }
    
    // Set repeat values (can be adjusted based on board dimensions if needed)
    texture.repeat.set(1, 1);
    
    // Create material with texture
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: woodType === 'cherry' ? 0.7 : 0.8,
      metalness: 0.1
    });
    
    // Cache the material
    this.materials.set(cacheKey, material);
    
    return material;
  }

  dispose() {
    // Dispose all cached materials
    this.materials.forEach(mat => {
      if (mat.map) {
        mat.map.dispose();
      }
      mat.dispose();
    });
    this.materials.clear();
    
    // Dispose base textures
    if (this.ashTexture) {
      this.ashTexture.dispose();
    }
    if (this.cherryTexture) {
      this.cherryTexture.dispose();
    }
  }
}
