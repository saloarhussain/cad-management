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

// --------------------------------------------------------
// PROCEDURAL HIGH-CONTRAST HDRI GENERATOR
// --------------------------------------------------------
function createProceduralHdri(presetName: string): THREE.CanvasTexture | null {
  if (typeof window === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Default dark backdrop
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (presetName === 'sunset') {
    // Sunset Warm: warm oranges, reds, and deep purple sky
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#1a0628'); // deep purple zenith
    grad.addColorStop(0.5, '#5e1914'); // red-orange
    grad.addColorStop(0.7, '#d95d14'); // warm amber
    grad.addColorStop(0.85, '#fca71c'); // golden horizon
    grad.addColorStop(1, '#1b0d02'); // dark warm terrain
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Bright setting sun
    ctx.beginPath();
    ctx.arc(512, 380, 70, 0, Math.PI * 2);
    const sunGrad = ctx.createRadialGradient(512, 380, 0, 512, 380, 70);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.4, '#ffe79a');
    sunGrad.addColorStop(1, 'rgba(217, 93, 20, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fill();
  } else if (presetName === 'dawn' || presetName === 'warehouse') {
    // Cyber Neon: high contrast vibrant hot pink and cyan lights
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#020005');
    grad.addColorStop(1, '#0c0216');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Neon tubes
    ctx.strokeStyle = '#ff007b';
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.moveTo(150, 80);
    ctx.lineTo(450, 80);
    ctx.stroke();

    ctx.strokeStyle = '#00f3ff';
    ctx.beginPath();
    ctx.moveTo(574, 432);
    ctx.lineTo(874, 432);
    ctx.stroke();

    // Add small high intensity white points for dispersion sparkles
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(300, 80, 10, 0, Math.PI * 2);
    ctx.arc(724, 432, 10, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Studio White: cool overhead lighting and side softboxes
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#151c24');
    grad.addColorStop(0.5, '#05070a');
    grad.addColorStop(1, '#0e1115');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Overhead soft lights
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(350, 0, 324, 80);
    ctx.fillStyle = '#aaaaaa';
    ctx.fillRect(100, 10, 150, 40);
    ctx.fillRect(774, 10, 150, 40);

    // Side light panels
    const sideGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    sideGrad.addColorStop(0, '#ffffff');
    sideGrad.addColorStop(0.1, '#222222');
    sideGrad.addColorStop(0.5, '#000000');
    sideGrad.addColorStop(0.9, '#222222');
    sideGrad.addColorStop(1.0, '#ffffff');
    ctx.fillStyle = sideGrad;
    ctx.fillRect(0, 100, canvas.width, 312);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

// --------------------------------------------------------
// SHADER MANAGER FOR MULTI-PASS REFRACTION/DISPERSION
// --------------------------------------------------------
interface DiamondShaderManagerProps {
  gemColor: string;
  environment: string;
}

const vertexShaderCode = `
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying vec4 vScreenPos;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vNormal = normalMatrix * normal;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -viewPos.xyz;
    vScreenPos = projectionMatrix * viewPos;
    gl_Position = vScreenPos;
  }
`;

const backFaceFragmentShaderCode = `
  varying vec3 vWorldNormal;
  void main() {
    vec3 n = normalize(vWorldNormal);
    gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
  }
`;

const frontFaceFragmentShaderCode = `
  uniform sampler2D u_backfaceTexture;
  uniform sampler2D u_envMap;
  uniform vec3 u_cameraPos;
  uniform float u_iorRed;
  uniform float u_iorGreen;
  uniform float u_iorBlue;
  uniform vec3 u_gemColor;
  uniform float u_bounceIntensity;
  uniform float u_hdrIntensity;

  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying vec4 vScreenPos;

  vec2 sampleEquirectangular(vec3 dir) {
    float phi = acos(clamp(dir.y, -1.0, 1.0));
    float theta = atan(dir.z, dir.x) + 3.14159265359;
    return vec2(theta / (2.0 * 3.14159265359), phi / 3.14159265359);
  }

  void main() {
    vec3 viewRay = normalize(vWorldPosition - u_cameraPos);
    vec3 N_front = normalize(vWorldNormal);

    // Get screen texture coordinates to sample back faces
    vec2 texCoord = (vScreenPos.xy / vScreenPos.w) * 0.5 + 0.5;
    vec4 backData = texture2D(u_backfaceTexture, texCoord);
    
    // Reconstruct back face world normal
    vec3 N_back = normalize(backData.xyz * 2.0 - 1.0);

    // Snell's Law bending for Red, Green, Blue channels
    vec3 rayR = refract(viewRay, N_front, 1.0 / u_iorRed);
    vec3 rayG = refract(viewRay, N_front, 1.0 / u_iorGreen);
    vec3 rayB = refract(viewRay, N_front, 1.0 / u_iorBlue);

    // Bending at exit (back faces) - fallback to reflection on TIR
    vec3 rayR_out = refract(rayR, -N_back, u_iorRed);
    if (length(rayR_out) == 0.0) rayR_out = reflect(rayR, -N_back);

    vec3 rayG_out = refract(rayG, -N_back, u_iorGreen);
    if (length(rayG_out) == 0.0) rayG_out = reflect(rayG, -N_back);

    vec3 rayB_out = refract(rayB, -N_back, u_iorBlue);
    if (length(rayB_out) == 0.0) rayB_out = reflect(rayB, -N_back);

    // Sample Environment Map for primary refracted ray
    vec3 envColor = vec3(0.0);
    envColor.r = texture2D(u_envMap, sampleEquirectangular(rayR_out)).r;
    envColor.g = texture2D(u_envMap, sampleEquirectangular(rayG_out)).g;
    envColor.b = texture2D(u_envMap, sampleEquirectangular(rayB_out)).b;

    // Add secondary bounces for internal sparkling "fire" highlights
    vec3 reflectIntR = reflect(rayR, -N_back);
    vec3 reflectIntG = reflect(rayG, -N_back);
    vec3 reflectIntB = reflect(rayB, -N_back);
    
    vec3 bounceColor = vec3(0.0);
    bounceColor.r = texture2D(u_envMap, sampleEquirectangular(reflectIntR)).r;
    bounceColor.g = texture2D(u_envMap, sampleEquirectangular(reflectIntG)).g;
    bounceColor.b = texture2D(u_envMap, sampleEquirectangular(reflectIntB)).b;
    
    vec3 internalColor = mix(envColor, bounceColor, u_bounceIntensity) * u_gemColor;

    // External sharp reflection (Fresnel / Schlick's approximation)
    float fresnel = pow(1.0 - max(dot(-viewRay, N_front), 0.0), 5.0);
    fresnel = 0.06 + 0.94 * fresnel;
    
    vec3 reflectRay = reflect(viewRay, N_front);
    vec3 externalReflectColor = texture2D(u_envMap, sampleEquirectangular(reflectRay)).rgb;

    vec3 finalColor = mix(internalColor, externalReflectColor, fresnel) * u_hdrIntensity;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

interface DiamondShaderManagerProps {
  gemColor: string;
  environment: string;
  customHdriUrl?: string | null;
}

function getHdriUrl(environment: string, customHdriUrl?: string | null): string {
  if (environment === 'custom' && customHdriUrl) {
    return customHdriUrl;
  }
  const presetUrls: Record<string, string> = {
    studio: 'https://cdn.jsdelivr.net/gh/pmndrs/3d-assets@main/hdr/studio.hdr',
    apartment: 'https://cdn.jsdelivr.net/gh/pmndrs/3d-assets@main/hdr/apartment.hdr',
    city: 'https://cdn.jsdelivr.net/gh/pmndrs/3d-assets@main/hdr/city.hdr',
    dawn: 'https://cdn.jsdelivr.net/gh/pmndrs/3d-assets@main/hdr/dawn.hdr',
    lobby: 'https://cdn.jsdelivr.net/gh/pmndrs/3d-assets@main/hdr/lobby.hdr',
    warehouse: 'https://cdn.jsdelivr.net/gh/pmndrs/3d-assets@main/hdr/warehouse.hdr',
  };
  return presetUrls[environment] || presetUrls['studio'];
}

function DiamondShaderManager({ gemColor, environment, customHdriUrl = null }: DiamondShaderManagerProps) {
  const { gl, size, scene, camera } = useThree();
  const [loadedHdri, setLoadedHdri] = useState<THREE.Texture | null>(null);

  // 1. Initialize RenderTarget for back-face normals pass
  const rtt = useMemo(() => {
    return new THREE.WebGLRenderTarget(size.width * 2, size.height * 2, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });
  }, [size.width, size.height]);

  // 2. Initialize Uniforms
  const uniforms = useMemo(() => ({
    u_backfaceTexture: { value: null as THREE.Texture | null },
    u_envMap: { value: null as THREE.Texture | null },
    u_cameraPos: { value: new THREE.Vector3() },
    u_iorRed: { value: 2.40 },
    u_iorGreen: { value: 2.42 },
    u_iorBlue: { value: 2.44 },
    u_gemColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
    u_bounceIntensity: { value: 0.5 },
    u_hdrIntensity: { value: 1.4 }
  }), []);

  // 3. Initialize Materials (Adding transparent: true)
  const backFaceMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: vertexShaderCode,
      fragmentShader: backFaceFragmentShaderCode,
      side: THREE.BackSide,
      transparent: true
    });
  }, []);

  const frontFaceMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: vertexShaderCode,
      fragmentShader: frontFaceFragmentShaderCode,
      side: THREE.FrontSide,
      uniforms: uniforms,
      transparent: true
    });
  }, [uniforms]);

  // 4. Update gemstone uniforms reactively
  useEffect(() => {
    if (gemColor === 'Diamond') {
      uniforms.u_gemColor.value.setRGB(1.0, 1.0, 1.0);
      uniforms.u_iorRed.value = 2.40;
      uniforms.u_iorGreen.value = 2.42;
      uniforms.u_iorBlue.value = 2.44;
      uniforms.u_bounceIntensity.value = 0.55;
    } else if (gemColor === 'Emerald') {
      uniforms.u_gemColor.value.setRGB(0.18, 0.95, 0.40);
      uniforms.u_iorRed.value = 1.56;
      uniforms.u_iorGreen.value = 1.57;
      uniforms.u_iorBlue.value = 1.58;
      uniforms.u_bounceIntensity.value = 0.20;
    } else if (gemColor === 'Sapphire') {
      uniforms.u_gemColor.value.setRGB(0.08, 0.32, 0.95);
      uniforms.u_iorRed.value = 1.75;
      uniforms.u_iorGreen.value = 1.76;
      uniforms.u_iorBlue.value = 1.77;
      uniforms.u_bounceIntensity.value = 0.35;
    } else if (gemColor === 'Ruby') {
      uniforms.u_gemColor.value.setRGB(0.95, 0.08, 0.18);
      uniforms.u_iorRed.value = 1.75;
      uniforms.u_iorGreen.value = 1.76;
      uniforms.u_iorBlue.value = 1.77;
      uniforms.u_bounceIntensity.value = 0.35;
    }
  }, [gemColor, uniforms]);

  // 5. Procedural HDRI map as fallback
  const hdriFallbackTexture = useMemo(() => {
    return createProceduralHdri(environment);
  }, [environment]);

  // 6. RGBELoader for equirectangular HDRI
  useEffect(() => {
    const url = getHdriUrl(environment, customHdriUrl);
    const loader = new RGBELoader();
    
    let isCurrent = true;
    loader.load(url, (texture) => {
      if (isCurrent) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        setLoadedHdri(texture);
      }
    }, undefined, (err) => {
      console.error("Failed to load HDR map via RGBELoader:", err);
    });

    return () => {
      isCurrent = false;
    };
  }, [environment, customHdriUrl]);

  // Clean up loaded HDRI texture when it changes
  useEffect(() => {
    return () => {
      if (loadedHdri) {
        loadedHdri.dispose();
      }
    };
  }, [loadedHdri]);

  // Clean up static resources
  useEffect(() => {
    return () => {
      rtt.dispose();
      backFaceMaterial.dispose();
      frontFaceMaterial.dispose();
      if (hdriFallbackTexture) hdriFallbackTexture.dispose();
    };
  }, [rtt, backFaceMaterial, frontFaceMaterial, hdriFallbackTexture]);

  // 7. Explicit Two-Pass Render Loop using useFrame with render priority 1
  useFrame((state) => {
    const gemMeshes: THREE.Mesh[] = [];
    const metalMeshes: THREE.Mesh[] = [];

    // Traverse active scene graph to intercept and route meshes
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();
        const isGem = name.includes('gem') || name.includes('stone') || name.includes('diamond') || mesh.geometry === brilliantGemGeometry;
        if (isGem) {
          gemMeshes.push(mesh);
        } else {
          metalMeshes.push(mesh);
        }
      }
    });

    if (gemMeshes.length === 0) {
      // Just render the scene normally if no gem is present
      gl.render(scene, camera);
      return;
    }

    // Save camera pos and active envMap to uniforms
    uniforms.u_cameraPos.value.copy(camera.position);
    uniforms.u_envMap.value = loadedHdri ? loadedHdri : hdriFallbackTexture;
    uniforms.u_backfaceTexture.value = rtt.texture;

    // PASS 1: Capture back-face depth and normals
    // Hide metal components
    metalMeshes.forEach(mesh => {
      mesh.visible = false;
    });

    // Apply back-face material
    gemMeshes.forEach(mesh => {
      mesh.material = backFaceMaterial;
    });

    // Render to RTT
    gl.setRenderTarget(rtt);
    gl.clear();
    gl.render(scene, camera);

    // PASS 2: Composite scene with front-face refract shader
    // Restore metal components visibility
    metalMeshes.forEach(mesh => {
      mesh.visible = true;
    });

    // Set gem materials to front-face material
    gemMeshes.forEach(mesh => {
      mesh.material = frontFaceMaterial;
    });

    // Reset render target to screen and render composite view
    gl.setRenderTarget(null);
    gl.clear();
    gl.render(scene, camera);
  }, 1);

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
        <DiamondShaderManager gemColor={gemColor} environment={environment} customHdriUrl={customHdriUrl} />
        
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
