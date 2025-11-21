import "./styles.css";

import * as THREE from "three";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";

import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { TextureLoader } from "three/src/loaders/TextureLoader";

function BoxTestTexture(props) {
  const woodtexture = useLoader(TextureLoader, "./woodmap_diffuseOriginal.png");
  woodtexture.wrapS = woodtexture.wrapT = THREE.RepeatWrapping;
  woodtexture.repeat.set(1, 1);

  return (
    <mesh {...props} castShadow>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial map={woodtexture} />
    </mesh>
  );
}

function Model(props) {
  const { fbx } = props;

  let glass2 = fbx.getObjectByName("aluminium_profile_windowgroup4pCube28");
  glass2.material.color = new THREE.Color(
    0.1499597898006365,
    0.55201140150344,
    0.7011018919268015
  );
  glass2.material.transparent = true;
  glass2.material.opacity = 0.1;

  let woodpart1 = fbx.getObjectByName(
    "aluminium_profile_windowgroup4polySurface15"
  );
  let woodpart2 = fbx.getObjectByName(
    "aluminium_profile_windowgroup4polySurface14"
  );
  let woodpart3 = fbx.getObjectByName(
    "aluminium_profile_windowgroup4polySurface16"
  );

  const woodtexture = useLoader(TextureLoader, "./woodmap_diffuseOriginal.png");

  // woodtexture.magFilter = THREE.NearestFilter;
  // woodtexture.minFilter = THREE.LinearMipMapLinearFilter;
  //woodtexture.mapping = THREE.CubeUVReflectionMapping;
  woodtexture.wrapS = woodtexture.wrapT = THREE.RepeatWrapping;
  woodtexture.repeat.set(1, 1);
  // woodtexture.offset.set(100, 100);
  //  woodtexture.rotation = Math.PI / 2;
  //woodtexture.anisotropy = 32;

  woodtexture.colorSpace = THREE.SRGBColorSpace;

  let woodmaterial = new THREE.MeshPhysicalMaterial({});
  // woodmaterial.metalness = 0;
  // woodmaterial.roughness = 1;
  woodmaterial.map = woodtexture;

  woodpart1.material = woodmaterial;
  woodpart2.material = woodmaterial;
  woodpart3.material = woodmaterial;

  return (
    <>
      <group>
        {fbx.children.map((child, index) => {
          return (
            <mesh
              key={index}
              {...child}
              castShadow
              receiveShadow
              geometry={child.geometry}
            />
          );
        })}
      </group>
    </>
  );
}

export default function App() {
  let modelName = "./window.fbx";
  const fbx = useLoader(FBXLoader, modelName);

  return (
    <Canvas shadows camera={{ fov: 20, position: [-27.6, 36.59, 20.8] }}>
      <OrbitControls makeDefault />
      <ambientLight />
      <directionalLight castShadow={true} position={[0, 10, 0]} />
      <Environment preset="city" />
      <Model fbx={fbx} />
      <BoxTestTexture position={[0, 0, 20]} />
    </Canvas>
  );
}
