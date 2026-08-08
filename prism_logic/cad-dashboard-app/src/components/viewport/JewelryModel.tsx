import React, { useMemo, forwardRef, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { STLLoader, OBJLoader, Rhino3dmLoader, GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';

export type MetalType = 'gold' | 'silver' | 'rose';

interface JewelryModelProps {
  url?: string;
  metalType: MetalType;
  fileName?: string;
  fileData?: ArrayBuffer;
  onPointerDown?: (event: any) => void;
  wireframe?: boolean;
  onLoadStats?: (volume: number) => void;
  gemColor?: string;
}

function getExactVolume(geometry: THREE.BufferGeometry) {
  let isIndexed = geometry.index !== null;
  let position = geometry.attributes.position;
  let sum = 0;
  let p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), p3 = new THREE.Vector3();
  if (!isIndexed) {
    for (let i = 0; i < position.count; i += 3) {
      p1.fromBufferAttribute(position, i);
      p2.fromBufferAttribute(position, i + 1);
      p3.fromBufferAttribute(position, i + 2);
      sum += p1.dot(p2.cross(p3)) / 6.0;
    }
  } else {
    let index = geometry.index;
    if (!index) return 0;
    for (let i = 0; i < index.count; i += 3) {
      p1.fromBufferAttribute(position, index.getX(i));
      p2.fromBufferAttribute(position, index.getX(i+1));
      p3.fromBufferAttribute(position, index.getX(i+2));
      sum += p1.dot(p2.cross(p3)) / 6.0;
    }
  }
  return Math.abs(sum);
}

const METAL_PROPS = {
  gold: {
    color: '#ffcc66',
    metalness: 1,
    roughness: 0.15,
  },
  silver: {
    color: '#e5e4e2',
    metalness: 1,
    roughness: 0.15,
  },
  rose: {
    color: '#e8a39d',
    metalness: 1,
    roughness: 0.15,
  }
};

const GEM_COLORS: Record<string, string> = {
  'Diamond': '#ffffff',
  'Emerald': '#2fa854',
  'Sapphire': '#114cb3',
  'Ruby': '#d61845',
};

function getGemMaterial(colorKey: string) {
  const hex = GEM_COLORS[colorKey] || GEM_COLORS['Diamond'];
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex),
    metalness: 0.1, // Slight metallic highlight on facets
    roughness: 0.0,
    transmission: 0.9,
    ior: 2.417, // Strict natural diamond IOR
    thickness: 12.0, // Deep thickness to heavily refract and distort the shank behind the stone
    envMapIntensity: 6.0, // Reactive and intense reflections
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    flatShading: true,
    dispersion: 0.1, // Realistic chromatic aberration fire
    reflectivity: 1.0, // Max Fresnel reflectivity
  });
}

const JewelryModel = forwardRef<THREE.Mesh, JewelryModelProps>(({ url, metalType, fileName, onPointerDown, wireframe = false, onLoadStats, gemColor = 'Diamond' }, ref) => {
  const isObj = url?.toLowerCase().split('?')[0].endsWith('.obj') || (fileName && fileName.toLowerCase().endsWith('.obj'));
  const is3dm = url?.toLowerCase().split('?')[0].endsWith('.3dm') || (fileName && fileName.toLowerCase().endsWith('.3dm'));
  const isGltf = url?.toLowerCase().split('?')[0].endsWith('.glb') || url?.toLowerCase().split('?')[0].endsWith('.gltf') || (fileName && (fileName.toLowerCase().endsWith('.glb') || fileName.toLowerCase().endsWith('.gltf')));

  let LoaderClass: any = STLLoader;
  if (isObj) LoaderClass = OBJLoader;
  if (is3dm) LoaderClass = Rhino3dmLoader;
  if (isGltf) LoaderClass = GLTFLoader;

  const result = useLoader(LoaderClass, url!, (loader: any) => {
    if (is3dm) {
      loader.setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@8.4.0/');
    }
  });

  // Extract geometry from the loaded result
  const geometry = useMemo(() => {
    if (isGltf) return undefined; // Gltf loads a scene group directly
    let geo: THREE.BufferGeometry | undefined;
    if (isObj || is3dm) {
      const group = result as THREE.Object3D;
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && !geo) {
          geo = (child as THREE.Mesh).geometry;
        }
      });
    } else {
      geo = result as THREE.BufferGeometry;
    }
    
    if (geo) {
      geo.computeBoundingBox();
      geo.center();
    }
    return geo;
  }, [result, isObj, isGltf]);

  useEffect(() => {
    if (geometry && onLoadStats) {
      const volume = getExactVolume(geometry);
      onLoadStats(volume);
    }
  }, [geometry, onLoadStats]);

  // Materials definition for GLTF multi-mesh assignment
  const metalMat = useMemo(() => {
    const props = METAL_PROPS[metalType];
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(props.color),
      metalness: props.metalness,
      roughness: props.roughness,
      envMapIntensity: 2.0,
    });
  }, [metalType]);

  const gemMat = useMemo(() => getGemMaterial(gemColor), [gemColor]);

  // If GLTF/GLB, traverse scene group and assign materials dynamically
  if (isGltf) {
    const gltfScene = result.scene || result;
    const clonedScene = useMemo(() => gltfScene.clone(), [gltfScene]);

    useEffect(() => {
      clonedScene.traverse((child: any) => {
        if (child.isMesh) {
          const name = child.name.toLowerCase();
          if (name.includes('gem') || name.includes('stone') || name.includes('diamond')) {
            child.material = gemMat;
          } else {
            child.material = metalMat;
          }
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }, [clonedScene, metalMat, gemMat]);

    return <primitive object={clonedScene} ref={ref} onPointerDown={onPointerDown} />;
  }

  if (!geometry) return null;

  return (
    <mesh 
      ref={ref}
      geometry={geometry} 
      castShadow 
      receiveShadow
      onPointerDown={onPointerDown}
      material={metalMat}
    />
  );
});

JewelryModel.displayName = 'JewelryModel';

export const JewelryModelFromData = forwardRef<THREE.Mesh, { data: ArrayBuffer; metalType: MetalType; isObj: boolean; onPointerDown?: (event: any) => void; wireframe?: boolean; onLoadStats?: (volume: number) => void; gemColor?: string }>(({ data, metalType, isObj, onPointerDown, wireframe = false, onLoadStats, gemColor = 'Diamond' }, ref) => {
  const geometry = useMemo(() => {
    if (isObj) {
      const loader = new OBJLoader();
      const text = new TextDecoder().decode(data);
      const group = loader.parse(text);
      let geo: THREE.BufferGeometry | undefined;
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && !geo) {
          geo = (child as THREE.Mesh).geometry;
        }
      });
      if (geo) {
        geo.computeBoundingBox();
        geo.center();
      }
      return geo;
    } else {
      const loader = new STLLoader();
      const header = new TextDecoder().decode(data.slice(0, 500));
      let geo: THREE.BufferGeometry;
      if (header.includes('facet normal') || header.trim().startsWith('solid')) {
        const text = new TextDecoder().decode(data);
        geo = loader.parse(text) as THREE.BufferGeometry;
      } else {
        geo = loader.parse(data) as THREE.BufferGeometry;
      }
      geo.computeBoundingBox();
      geo.center();
      return geo;
    }
  }, [data, isObj]);

  useEffect(() => {
    if (geometry && onLoadStats) {
      const volume = getExactVolume(geometry);
      onLoadStats(volume);
    }
  }, [geometry, onLoadStats]);

  if (!geometry) return null;

  const props = METAL_PROPS[metalType];
  const metalMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(props.color),
      metalness: props.metalness,
      roughness: props.roughness,
      envMapIntensity: 2.0,
    });
  }, [props]);

  return (
    <mesh 
      ref={ref}
      geometry={geometry} 
      castShadow 
      receiveShadow
      onPointerDown={onPointerDown}
      material={metalMat}
    />
  );
});

JewelryModelFromData.displayName = 'JewelryModelFromData';

export default JewelryModel;
