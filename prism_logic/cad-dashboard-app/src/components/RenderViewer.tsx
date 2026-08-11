"use client";

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Environment, 
  ContactShadows, 
  Float, 
  useGLTF,
  Center,
  Stage
} from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, RenderPass, UnrealBloomPass, RGBELoader } from 'three-stdlib';

// --------------------------------------------------------
// MATERIALS
// --------------------------------------------------------

export const METAL_COLORS: Record<string, string> = {
  'Yellow Gold': '#ffcc66',
  'Rose Gold': '#e8a39d',
  'White Gold': '#f2f5f8',
  'Platinum': '#e5e4e2',
};

export const GEM_COLORS: Record<string, string> = {
  'Diamond': '#ffffff',
  'Emerald': '#2fa854',
  'Sapphire': '#114cb3',
  'Ruby': '#d61845',
};

function getMetalMaterial(colorKey: string, roughness: number, metalness: number) {
  const hex = METAL_COLORS[colorKey] || METAL_COLORS['Yellow Gold'];
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    metalness: metalness,
    roughness: roughness,
    envMapIntensity: 3.0,
  });
}

function getGemMaterial(colorKey: string, dispersion: number) {
  const hex = GEM_COLORS[colorKey] || GEM_COLORS['Diamond'];
  // High-fidelity realistic diamond/gem material using PhysicalMaterial
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex),
    metalness: 0.1, // Slight metallic highlight on facets
    roughness: 0.0,
    transmission: 0.9, 
    ior: 2.417, // Strictly 2.417 for natural diamond index
    thickness: 12.0, // Deep thickness to heavily refract and distort the shank behind the stone
    envMapIntensity: 6.0, // Reactive and intense reflections
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    flatShading: true, // Crucial for distinct, sharp, sparkly gem facets
    dispersion: 0.1, // Realistic chromatic aberration fire
    reflectivity: 1.0, // Max Fresnel reflectivity
  });
}

// --------------------------------------------------------
// CLASSIC BRILLIANT-CUT GEM GEOMETRY GENERATOR
// --------------------------------------------------------
function createBrilliantGemGeometry() {
  const vertices: number[] = [];
  const indices: number[] = [];

  // Index 0: Top center table point
  vertices.push(0, 0.35, 0);

  // Indices 1 to 8: Table ring (8 vertices at height y=0.35, radius 0.45)
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    vertices.push(0.45 * Math.cos(angle), 0.35, 0.45 * Math.sin(angle));
  }

  // Indices 9 to 24: Girdle ring (16 vertices at height y=0.0, radius 0.75)
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8;
    vertices.push(0.75 * Math.cos(angle), 0.0, 0.75 * Math.sin(angle));
  }

  // Index 25: Bottom point (culet, height y=-0.75)
  vertices.push(0, -0.75, 0);

  // --- FACES ---
  // Table top triangles (fan around index 0)
  for (let i = 0; i < 8; i++) {
    const next = ((i + 1) % 8) + 1;
    indices.push(0, i + 1, next);
  }

  // Crown facets (between table and girdle)
  for (let i = 0; i < 8; i++) {
    const tCurrent = i + 1;
    const tNext = ((i + 1) % 8) + 1;
    const gCurrent = 9 + 2 * i;
    const gMid = 9 + 2 * i + 1;
    const gNext = 9 + ((2 * i + 2) % 16);

    indices.push(tCurrent, gCurrent, gMid);
    indices.push(tCurrent, gMid, tNext);
    indices.push(tNext, gMid, gNext);
  }

  // Pavilion facets (between girdle and bottom culet)
  for (let i = 0; i < 16; i++) {
    const gCurrent = 9 + i;
    const gNext = 9 + ((i + 1) % 16);
    indices.push(gCurrent, 25, gNext);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

const brilliantGemGeometry = createBrilliantGemGeometry();

// --------------------------------------------------------
// CUSTOM MODEL LOADER
// --------------------------------------------------------

interface ModelProps {
  url: string;
  metalKey: string;
  gemKey: string;
  roughness: number;
  metalness: number;
  dispersion: number;
}

function CustomModel({ url, metalKey, gemKey, roughness, metalness, dispersion }: ModelProps) {
  const { scene } = useGLTF(url);
  
  // Clone the scene so we can mutate materials safely
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  
  const metalMat = useMemo(() => getMetalMaterial(metalKey, roughness, metalness), [metalKey, roughness, metalness]);
  const gemMat = useMemo(() => getGemMaterial(gemKey, dispersion), [gemKey, dispersion]);

  useEffect(() => {
    // Traverse and assign materials based on name heuristics
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();
        
        if (name.includes('gem') || name.includes('stone') || name.includes('diamond')) {
          mesh.material = gemMat;
        } else {
          mesh.material = metalMat;
        }
      }
    });
  }, [clonedScene, metalMat, gemMat]);

  return <primitive object={clonedScene} />;
}

// --------------------------------------------------------
// PLACEHOLDER RING
// --------------------------------------------------------

interface PlaceholderProps {
  metalKey: string;
  gemKey: string;
  roughness: number;
  metalness: number;
  dispersion: number;
}

function PlaceholderRing({ metalKey, gemKey, roughness, metalness, dispersion }: PlaceholderProps) {
  const metalMat = useMemo(() => getMetalMaterial(metalKey, roughness, metalness), [metalKey, roughness, metalness]);
  const gemMat = useMemo(() => getGemMaterial(gemKey, dispersion), [gemKey, dispersion]);

  return (
    <group>
      {/* Ring Band */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={metalMat} receiveShadow castShadow>
        <torusGeometry args={[1, 0.15, 64, 128]} />
      </mesh>
      
      {/* Gem Setting (Prongs) */}
      <mesh position={[0, 1.1, 0]} material={metalMat} receiveShadow castShadow>
        <cylinderGeometry args={[0.3, 0.2, 0.4, 32]} />
      </mesh>

      {/* Gemstone */}
      <mesh position={[0, 1.35, 0]} material={gemMat} geometry={brilliantGemGeometry} receiveShadow castShadow />
    </group>
  );
}

// --------------------------------------------------------
// POST-PROCESSING BLOOM EFFECT (NO NPM INSTALLS NEEDED)
// --------------------------------------------------------

function BloomEffects({ active }: { active: boolean }) {
  const { gl, scene, camera, size } = useThree();
  const composer = useRef<EffectComposer | null>(null);

  useEffect(() => {
    if (!active) {
      composer.current = null;
      return;
    }
    const comp = new EffectComposer(gl);
    comp.addPass(new RenderPass(scene, camera));

    // High threshold and soft strength to glow specular diamond highlights
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      1.2,   // strength
      0.35,  // radius
      0.85   // threshold
    );
    comp.addPass(bloomPass);

    composer.current = comp;
  }, [gl, scene, camera, size, active]);

  useFrame(() => {
    if (active && composer.current) {
      composer.current.render();
    } else {
      gl.render(scene, camera);
    }
  }, 1);

  return null;
}

// --------------------------------------------------------
// CUSTOM EQUIRECTANGULAR HDRI LIGHTING ENVIRONMENT LOADER
// --------------------------------------------------------
function CustomEnvironment({ url }: { url: string }) {
  const { gl } = useThree();
  const [texture, setTexture] = useState<THREE.DataTexture | null>(null);

  useEffect(() => {
    const loader = new RGBELoader();
    loader.load(url, (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      setTexture(tex);
    });

    return () => {
      if (texture) texture.dispose();
    };
  }, [url]);

  if (!texture) return null;

  return <Environment map={texture} background={false} />;
}

// --------------------------------------------------------
// MAIN CANVAS COMPONENT
// --------------------------------------------------------

interface RenderViewerProps {
  metalColor: string;
  gemColor: string;
  environment: string; 
  autoRotate: boolean;
  modelUrl?: string | null;
  onCanvasCreated?: (gl: THREE.WebGLRenderer) => void;
  // Advanced control props
  roughness?: number;
  metalness?: number;
  dispersion?: number;
  bloomActive?: boolean;
  customHdriUrl?: string | null;
}

function RenderEventDispatcher({ onCanvasCreated }: { onCanvasCreated?: (gl: THREE.WebGLRenderer) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    if (onCanvasCreated) {
      onCanvasCreated(gl);
    }
  }, [gl, onCanvasCreated]);
  return null;
}

export default function RenderViewer({ 
  metalColor, 
  gemColor, 
  environment, 
  autoRotate, 
  modelUrl,
  onCanvasCreated,
  roughness = 0.15,
  metalness = 1.0,
  dispersion = 0.044,
  bloomActive = true,
  customHdriUrl = null
}: RenderViewerProps) {
  return (
    <div className="w-full h-full relative bg-white overflow-hidden border border-neutral-200">
      <Canvas 
        shadows 
        camera={{ position: [0, 2, 5], fov: 45 }}
        gl={{ preserveDrawingBuffer: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <RenderEventDispatcher onCanvasCreated={onCanvasCreated} />
        <BloomEffects active={bloomActive} />
        
        {/* Environment & Lighting */}
        {environment === 'custom' && customHdriUrl ? (
          <CustomEnvironment url={customHdriUrl} />
        ) : (
          <Environment preset={environment as any} background={false} />
        )}
        <ambientLight intensity={0.5} />
        <spotLight position={[2, 5, 2]} angle={0.3} penumbra={1} intensity={3.5} castShadow />
        <spotLight position={[-2, 5, -2]} angle={0.3} penumbra={1} intensity={2.0} castShadow />
        
        <Center>
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            {modelUrl ? (
              <CustomModel 
                url={modelUrl} 
                metalKey={metalColor} 
                gemKey={gemColor} 
                roughness={roughness}
                metalness={metalness}
                dispersion={dispersion}
              />
            ) : (
              <PlaceholderRing 
                metalKey={metalColor} 
                gemKey={gemColor} 
                roughness={roughness}
                metalness={metalness}
                dispersion={dispersion}
              />
            )}
          </Float>
        </Center>

        {/* Soft shadow plane underneath */}
        <ContactShadows position={[0, -1.5, 0]} opacity={0.15} scale={10} blur={2.5} far={4} color="#000000" />
 
        <OrbitControls 
          makeDefault 
          autoRotate={autoRotate} 
          autoRotateSpeed={2.0} 
          enablePan={false}
          minDistance={2}
          maxDistance={10}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
}
