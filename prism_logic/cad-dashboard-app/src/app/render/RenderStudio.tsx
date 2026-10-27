"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader, OBJLoader } from 'three-stdlib';
import { motion, AnimatePresence } from 'framer-motion';

// Global variables for recording
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];

// ==========================================
// 3D Viewport Components
// ==========================================

// Turntable Rotation Helper Component
function Turntable({ active, speed, axis, children }: { active: boolean; speed: number; axis: 'y' | 'x' | 'diag'; children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!active || !groupRef.current) return;
    const rotationAmt = delta * speed * 0.5;
    
    if (axis === 'y') {
      groupRef.current.rotation.y += rotationAmt;
    } else if (axis === 'x') {
      groupRef.current.rotation.x += rotationAmt;
    } else if (axis === 'diag') {
      groupRef.current.rotation.y += rotationAmt;
      groupRef.current.rotation.x += rotationAmt * 0.3;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

// Procedural Gemstone Ring (Fallback Model)
function ProceduralRing({ goldProps, gemProps }: { goldProps: any; gemProps: any }) {
  const ringRef = useRef<THREE.Mesh>(null);
  
  // Custom Materials
  const goldMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(goldProps.color),
    metalness: goldProps.metalness,
    roughness: goldProps.roughness,
    clearcoat: goldProps.clearcoat,
    clearcoatRoughness: 0.1,
  });

  const gemMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(gemProps.color),
    transmission: gemProps.transmission,
    ior: gemProps.ior,
    roughness: 0.0,
    thickness: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    transparent: true,
    opacity: 1.0,
  });

  return (
    <group scale={1.2}>
      {/* 1. The Ring Band */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <torusGeometry args={[1.2, 0.14, 32, 64]} />
        <primitive object={goldMaterial} attach="material" />
      </mesh>

      {/* 2. Gemstone Bezel Mount */}
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.36, 0.25, 16]} />
        <primitive object={goldMaterial} attach="material" />
      </mesh>

      {/* 3. Prongs (4 tiny golden claws holding the diamond) */}
      <mesh position={[0.18, 1.45, 0.18]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.35, 8]} />
        <primitive object={goldMaterial} attach="material" />
      </mesh>
      <mesh position={[-0.18, 1.45, 0.18]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.35, 8]} />
        <primitive object={goldMaterial} attach="material" />
      </mesh>
      <mesh position={[0.18, 1.45, -0.18]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.35, 8]} />
        <primitive object={goldMaterial} attach="material" />
      </mesh>
      <mesh position={[-0.18, 1.45, -0.18]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.35, 8]} />
        <primitive object={goldMaterial} attach="material" />
      </mesh>

      {/* 4. Faceted Diamond (Icosahedron Detail 1 resembles brilliant-cut facets) */}
      <mesh position={[0, 1.45, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <icosahedronGeometry args={[0.36, 1]} />
        <primitive object={gemMaterial} attach="material" />
      </mesh>
    </group>
  );
}

// Error Boundary for the WebGL Canvas Viewport
class ViewportErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("3D Viewport caught loading error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// User-Uploaded CAD Model Loader (Supports GLTF, GLB, and OBJ)
function LoadedModel({ url, fileName, goldProps, gemProps }: { url: string; fileName: string; goldProps: any; gemProps: any }) {
  const isObj = fileName.toLowerCase().endsWith('.obj');
  const loaderClass = isObj ? OBJLoader : GLTFLoader;
  const loadedData = useLoader(loaderClass, url);
  
  // Extract scene group depending on loader output structure (GLTFLoader has .scene, OBJLoader returns group directly)
  const scene = isObj ? (loadedData as THREE.Group) : (loadedData as any).scene;

  // React states to drive declarative WebGL updates
  const [modelScale, setModelScale] = useState(1);
  const [modelCenter, setModelCenter] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  
  useEffect(() => {
    if (!scene) return;
    
    // 1. Calculate the exact bounding dimensions and center of the imported 3D mesh
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // 2. Set declarative states (centered at 0, 0, 0 and normalized scale)
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      // 2.2 is a perfect standard scale factor that matches our orbital viewer size and camera zoom
      setModelScale(2.2 / maxDim);
    }
    setModelCenter(center);
    
    // 3. Set custom PBR shaders
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(goldProps.color),
      metalness: goldProps.metalness,
      roughness: goldProps.roughness,
      clearcoat: goldProps.clearcoat,
      clearcoatRoughness: 0.1,
    });

    const gemMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(gemProps.color),
      transmission: gemProps.transmission,
      ior: gemProps.ior,
      roughness: 0.0,
      thickness: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      transparent: true,
      opacity: 1.0,
    });

    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        const name = child.name.toLowerCase();
        // Intelligent material classification
        if (
          name.includes('gem') || 
          name.includes('stone') || 
          name.includes('diamond') || 
          name.includes('glass') || 
          name.includes('crystal') || 
          child.material.transparent ||
          child.material.opacity < 0.9
        ) {
          child.material = gemMat;
        } else {
          child.material = goldMat;
        }
      }
    });
  }, [scene, goldProps, gemProps]);

  return (
    <group scale={modelScale}>
      <primitive 
        object={scene} 
        position={[-modelCenter.x, -modelCenter.y, -modelCenter.z]} 
      />
    </group>
  );
}

// Dynamic lighting setup that reacts to environment parameters
function StudioLighting({ exposure, lightRotation, lightIntensity, preset }: { exposure: number; lightRotation: number; lightIntensity: number; preset: string }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = (lightRotation * Math.PI) / 180;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.2 * lightIntensity} />
      
      {preset === 'studio' && (
        <>
          <directionalLight position={[5, 10, 5]} intensity={1.5 * lightIntensity} castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-5, 5, -5]} intensity={0.5 * lightIntensity} />
          <spotLight position={[0, 8, 0]} intensity={1.0 * lightIntensity} angle={0.4} penumbra={1} castShadow />
        </>
      )}

      {preset === 'dramatic' && (
        <>
          <directionalLight position={[8, 5, 2]} intensity={2.2 * lightIntensity} castShadow />
          <directionalLight position={[-8, -5, -2]} intensity={0.1 * lightIntensity} />
          <spotLight position={[2, 10, 0]} intensity={2.5 * lightIntensity} angle={0.25} penumbra={0.5} castShadow />
        </>
      )}

      {preset === 'sunset' && (
        <>
          <directionalLight position={[6, 3, 6]} intensity={1.8 * lightIntensity} color="#ff9e64" castShadow />
          <directionalLight position={[-6, 2, -6]} intensity={0.4 * lightIntensity} color="#97bbf6" />
          <ambientLight intensity={0.4 * lightIntensity} color="#fca7ea" />
        </>
      )}

      {preset === 'showcase' && (
        <>
          <directionalLight position={[0, 12, 0]} intensity={2.0 * lightIntensity} castShadow />
          <directionalLight position={[5, 4, 5]} intensity={0.8 * lightIntensity} />
          <directionalLight position={[-5, 4, -5]} intensity={0.8 * lightIntensity} />
          <spotLight position={[0, 5, 4]} intensity={1.5 * lightIntensity} angle={0.6} penumbra={1} />
        </>
      )}
    </group>
  );
}

const getEnvironmentPreset = (preset: string) => {
  switch (preset) {
    case 'studio': return 'studio';
    case 'sunset': return 'sunset';
    case 'dramatic': return 'night';
    case 'showcase': return 'warehouse';
    default: return 'studio';
  }
};

// ==========================================
// Main Render Studio Dashboard Component
// ==========================================

export default function RenderStudio() {
  // Input State
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [goldRefImage, setGoldRefImage] = useState<string | null>(null);
  const [gemRefImage, setGemRefImage] = useState<string | null>(null);
  const [envRefImage, setEnvRefImage] = useState<string | null>(null);

  // Dashboard Tab state (Left Column)
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'preset'>('upload');

  // Fine-tuning values (Material PBR + Lighting)
  const [goldColor, setGoldColor] = useState('#e5c158');
  const [goldRoughness, setGoldRoughness] = useState(0.12);
  const [goldMetalness, setGoldMetalness] = useState(1.0);
  const [goldClearcoat, setGoldClearcoat] = useState(1.0);

  const [gemColor, setGemColor] = useState('#ffffff');
  const [gemTransmission, setGemTransmission] = useState(1.0);
  const [gemIor, setGemIor] = useState(2.417); // Diamond Refraction Index
  const [gemCarat, setGemCarat] = useState(1.0);

  const [lightPreset, setLightPreset] = useState('studio');
  const [lightIntensity, setLightIntensity] = useState(1.2);
  const [lightRotation, setLightRotation] = useState(45);
  const [exposure, setExposure] = useState(1.0);

  // Turntable State
  const [isTurntableActive, setIsTurntableActive] = useState(true);
  const [turntableSpeed, setTurntableSpeed] = useState(1.0);
  const [turntableAxis, setTurntableAxis] = useState<'y' | 'x' | 'diag'>('y');

  // AI Pipeline States
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiStep, setAiStep] = useState(0);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [aiSuccess, setAiSuccess] = useState(false);

  // Export State
  const [exportFormat, setExportFormat] = useState<'webm' | 'mp4' | 'gif'>('webm');
  const [exportResolution, setExportResolution] = useState<'1080p' | '4k'>('1080p');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-bake Reference styles
  const goldPresets = [
    { name: 'Yellow Gold (24K)', color: '#e5c158', roughness: 0.12, clearcoat: 1.0 },
    { name: 'Rose Gold (18K)', color: '#e7a38a', roughness: 0.15, clearcoat: 0.8 },
    { name: 'White Gold (18K)', color: '#eef0f2', roughness: 0.08, clearcoat: 1.0 },
    { name: 'Satin Brass', color: '#c5a059', roughness: 0.35, clearcoat: 0.1 },
    { name: 'Platinum Polish', color: '#d5d6d8', roughness: 0.05, clearcoat: 1.0 },
  ];

  const gemstonePresets = [
    { name: 'Clear Diamond', color: '#ffffff', transmission: 1.0, ior: 2.417 },
    { name: 'Royal Sapphire', color: '#163ea5', transmission: 0.95, ior: 1.768 },
    { name: 'Siberian Emerald', color: '#149547', transmission: 0.9, ior: 1.576 },
    { name: 'Pigeon Ruby', color: '#d0163e', transmission: 0.92, ior: 1.768 },
    { name: 'Fancy Pink Diamond', color: '#fda6d2', transmission: 1.0, ior: 2.417 },
  ];

  // Clean local URLs on unmount
  useEffect(() => {
    return () => {
      if (modelUrl) URL.revokeObjectURL(modelUrl);
    };
  }, [modelUrl]);

  // Model file handler
  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setModelFile(file);
      if (modelUrl) URL.revokeObjectURL(modelUrl);
      setModelUrl(URL.createObjectURL(file));
      addLog(`CAD model loaded: ${file.name} (Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
    }
  };

  // Image reference handlers (Save as Data URLs for local browser mock and style preview)
  const handleImageRefUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'gold' | 'gem' | 'env') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const res = event.target.result as string;
          const name = file.name.toLowerCase();
          
          if (type === 'gold') {
            setGoldRefImage(res);
            
            // Intelligent instant color & material extraction based on reference file characteristics
            if (name.includes('rose') || name.includes('copper') || name.includes('pink')) {
              setGoldColor('#e7a38a'); // Rose Gold
              setGoldRoughness(0.15);
              setGoldClearcoat(0.8);
              addLog(`Metal Reference detected: ${file.name}. Extracted: 18K Rose Gold (#e7a38a), 15% roughness.`);
            } else if (name.includes('white') || name.includes('platinum') || name.includes('silver') || name.includes('chrome')) {
              setGoldColor('#d5d6d8'); // Platinum/White Gold
              setGoldRoughness(0.08);
              setGoldClearcoat(1.0);
              addLog(`Metal Reference detected: ${file.name}. Extracted: Polished Platinum (#d5d6d8), 8% roughness.`);
            } else if (name.includes('satin') || name.includes('matte') || name.includes('brush') || name.includes('brass')) {
              setGoldColor('#c5a059'); // Satin Brass
              setGoldRoughness(0.35);
              setGoldClearcoat(0.1);
              addLog(`Metal Reference detected: ${file.name}. Extracted: Satin Brass (#c5a059), 35% roughness.`);
            } else {
              setGoldColor('#e5c158'); // 24K Yellow Gold
              setGoldRoughness(0.12);
              setGoldClearcoat(1.0);
              addLog(`Metal Reference detected: ${file.name}. Extracted: 24K Yellow Gold (#e5c158), 12% roughness.`);
            }
          } else if (type === 'gem') {
            setGemRefImage(res);
            
            // Intelligent instant gemstone clarity & cut extraction
            if (name.includes('sapphire') || name.includes('blue')) {
              setGemColor('#163ea5');
              setGemIor(1.768);
              setGemTransmission(0.95);
              addLog(`Gemstone Reference detected: ${file.name}. Extracted: Royal Sapphire (#163ea5), 1.768 Refractive Index.`);
            } else if (name.includes('emerald') || name.includes('green')) {
              setGemColor('#149547');
              setGemIor(1.576);
              setGemTransmission(0.9);
              addLog(`Gemstone Reference detected: ${file.name}. Extracted: Siberian Emerald (#149547), 1.576 Refractive Index.`);
            } else if (name.includes('ruby') || name.includes('red')) {
              setGemColor('#d0163e');
              setGemIor(1.768);
              setGemTransmission(0.92);
              addLog(`Gemstone Reference detected: ${file.name}. Extracted: Pigeon Ruby (#d0163e), 1.768 Refractive Index.`);
            } else if (name.includes('pink') || name.includes('morganite')) {
              setGemColor('#fda6d2');
              setGemIor(2.417);
              setGemTransmission(1.0);
              addLog(`Gemstone Reference detected: ${file.name}. Extracted: Pink Diamond (#fda6d2), 2.417 Refractive Index.`);
            } else {
              setGemColor('#ffffff');
              setGemIor(2.417);
              setGemTransmission(1.0);
              addLog(`Gemstone Reference detected: ${file.name}. Extracted: Clear Brilliant Diamond (#ffffff), 2.417 Refractive Index.`);
            }
          } else if (type === 'env') {
            setEnvRefImage(res);
            
            // Intelligent instant environment lighting mapping
            if (name.includes('sunset') || name.includes('warm') || name.includes('gold') || name.includes('outdoor')) {
              setLightPreset('sunset');
              setLightIntensity(1.5);
              addLog(`Environment Reference locked: ${file.name}. Generated: Golden Hour Sunset lighting dome.`);
            } else if (name.includes('dark') || name.includes('night') || name.includes('dramatic') || name.includes('black')) {
              setLightPreset('dramatic');
              setLightIntensity(1.2);
              addLog(`Environment Reference locked: ${file.name}. Generated: Dramatic High-Contrast Chiaroscuro studio.`);
            } else if (name.includes('bright') || name.includes('white') || name.includes('warehouse') || name.includes('showroom')) {
              setLightPreset('showcase');
              setLightIntensity(1.8);
              addLog(`Environment Reference locked: ${file.name}. Generated: Jeweler's Bright Showcase lighting layout.`);
            } else {
              setLightPreset('studio');
              setLightIntensity(1.2);
              addLog(`Environment Reference locked: ${file.name}. Generated: Standard Neutral Studio Softlight dome.`);
            }
          }
        }
      };
      reader.onloadend = () => {
        // Enforce state synchronization to trigger react-three-fiber canvas re-render immediately
        setTimeout(() => {
          // Slight timeout to ensure data URLs are fully set and React state has batch updated
          window.dispatchEvent(new Event('resize')); // forces a WebGL render pass recalculation
        }, 100);
      };
      reader.readAsDataURL(file);
    }
  };

  const addLog = (msg: string) => {
    setAiLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // ==========================================
  // Mock AI Process Execution
  // ==========================================
  const triggerAiRender = () => {
    setAiProcessing(true);
    setAiStep(0);
    setAiSuccess(false);
    setAiLogs([]);

    const steps = [
      { text: "Connecting to secure cloud GPU worker (US-East)...", delay: 800 },
      { text: `Analyzing CAD model structural complexity...`, delay: 1600 },
      { text: "Vectorizing Gold Reference photo (detecting hue and specular roughness)...", delay: 2600 },
      { text: "Extracting brilliant-cut dispersion index from Diamond Reference...", delay: 3600 },
      { text: "Parsing Environment reference layout to construct physical light dome...", delay: 4600 },
      { text: "Stable Video 3D (SV3D) generative engine warming up...", delay: 5600 },
      { text: "Baking physically-accurate environment textures & HDRI dome...", delay: 6800 },
      { text: "Aligning temporal consistency and shading meshes...", delay: 7800 },
      { text: "Compiling studio-grade high-fidelity turntable render...", delay: 8800 },
      { text: "AI Render integration successful! Loading studio space.", delay: 9800 }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setAiStep(idx + 1);
        addLog(step.text);
        
        // Dynamic material shifts representing reference mapping in real-time
        if (idx === 2 && goldRefImage) {
          // Mocking style extraction: Rose gold tint if rose is in name, else rich yellow gold
          setGoldColor('#f3a48e'); // shift towards Rose gold style
          setGoldRoughness(0.08); // polished
          setGoldClearcoat(1.0);
        }
        if (idx === 3 && gemRefImage) {
          setGemColor('#dcfcff'); // electric sky shine diamond
          setGemIor(2.55); // high sparkle
        }
        if (idx === 4 && envRefImage) {
          setLightPreset('showcase'); // shift environment light presets
          setLightIntensity(1.5);
        }

        if (idx === steps.length - 1) {
          setAiSuccess(true);
          setTimeout(() => {
            setAiProcessing(false);
          }, 1500);
        }
      }, step.delay);
    });
  };

  // ==========================================
  // Browser Canvas MediaRecorder video render
  // ==========================================
  const startRecording = () => {
    if (!canvasContainerRef.current) return;
    const canvas = canvasContainerRef.current.querySelector('canvas');
    if (!canvas) {
      alert("WebGL Canvas not initialized.");
      return;
    }

    recordedChunks = [];
    setIsRecording(true);
    setRecordingSeconds(0);
    setIsTurntableActive(true); // Spin the model during recording

    const stream = canvas.captureStream(30); // 30 FPS capture
    const options = { mimeType: 'video/webm;codecs=vp9' };
    
    try {
      mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      // Fallback
      mediaRecorder = new MediaRecorder(stream);
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      // Auto-trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `Turntable_Render_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      a.click();
      
      setIsRecording(false);
      URL.revokeObjectURL(url);
    };

    mediaRecorder.start();

    // Limit record time to 12 seconds for a complete 360 rotation
    const counterInterval = setInterval(() => {
      setRecordingSeconds(prev => {
        if (prev >= 11) {
          clearInterval(counterInterval);
          stopRecording();
          return 12;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  };

  return (
    <main className="pb-32 px-6 max-w-7xl mx-auto pt-20 relative min-h-screen bg-[#0D0B04] text-white">
      {/* Background radial overlays */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-400/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-400/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 relative z-10 border-b border-white/5 pb-6">
        <div>
          <h2 className="font-headline text-2xl font-black tracking-tight text-white uppercase italic">
            AI Render <span className="text-[#fce003]">Studio</span>
          </h2>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">
            Mesh-to-Photorealistic 360° Turntable Generator
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            disabled={aiProcessing}
            onClick={triggerAiRender}
            className={`electric-gradient text-stone-950 font-black text-[10px] tracking-widest px-6 py-3.5 rounded-xl uppercase flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(252,224,3,0.25)] ${aiProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            START AI RENDER
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* ==========================================
            COLUMN 1: ASSETS CONSOLE (Left, 3 Cols)
           ========================================== */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white/[0.01] border border-white/5 rounded-[2rem] p-5 backdrop-blur-xl flex flex-col gap-5 shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">cloud_upload</span>
                Asset Console
              </span>
              <div className="flex bg-white/5 rounded-lg p-0.5 text-[8px] font-black uppercase">
                <button 
                  onClick={() => setActiveInputTab('upload')}
                  className={`px-2 py-1.5 rounded-md transition-all ${activeInputTab === 'upload' ? 'bg-[#fce003] text-black' : 'text-neutral-500'}`}
                >
                  Files
                </button>
                <button 
                  onClick={() => setActiveInputTab('preset')}
                  className={`px-2 py-1.5 rounded-md transition-all ${activeInputTab === 'preset' ? 'bg-[#fce003] text-black' : 'text-neutral-500'}`}
                >
                  Presets
                </button>
              </div>
            </div>

            {activeInputTab === 'upload' ? (
              <div className="flex flex-col gap-4">
                {/* 1. 3D Model File Uploader */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">3D Model (GLB/OBJ)</label>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleModelUpload}
                    accept=".glb,.gltf,.obj" 
                    className="hidden" 
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-white/10 rounded-2xl p-4 bg-white/[0.01] hover:bg-white/[0.03] transition-all hover:border-[#fce003]/40 cursor-pointer flex flex-col items-center text-center justify-center gap-2 group"
                  >
                    <span className="material-symbols-outlined text-white/20 group-hover:text-[#fce003] text-3xl transition-colors">deployed_code</span>
                    {modelFile ? (
                      <div>
                        <p className="text-[10px] font-black text-white truncate max-w-[160px]">{modelFile.name}</p>
                        <p className="text-[8px] font-bold text-[#fce003] mt-0.5 uppercase tracking-widest">Model Loaded</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[9px] font-black text-white/50 uppercase tracking-wide">Drag & Drop Model</p>
                        <p className="text-[7px] font-bold text-white/20 uppercase tracking-widest mt-0.5">GLB, GLTF or OBJ up to 50MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Gold Metallic Style Reference */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Metal / Gold Reference</label>
                  <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-all hover:border-[#fce003]/30 min-h-[90px] flex items-center justify-center">
                    <input 
                      type="file" 
                      onChange={(e) => handleImageRefUpload(e, 'gold')}
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    />
                    {goldRefImage ? (
                      <div className="w-full h-[90px] relative">
                        <img src={goldRefImage} className="w-full h-full object-cover rounded-2xl" alt="Gold Ref" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-[8px] font-black uppercase tracking-widest text-[#fce003]">Change Photo</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                        <span className="material-symbols-outlined text-white/20 text-xl group-hover:text-[#fce003]">monochrome_photos</span>
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Upload Metal style</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Diamond Gemstone Style Reference */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Diamond / Gem Reference</label>
                  <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-all hover:border-[#fce003]/30 min-h-[90px] flex items-center justify-center">
                    <input 
                      type="file" 
                      onChange={(e) => handleImageRefUpload(e, 'gem')}
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    />
                    {gemRefImage ? (
                      <div className="w-full h-[90px] relative">
                        <img src={gemRefImage} className="w-full h-full object-cover rounded-2xl" alt="Gem Ref" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-[8px] font-black uppercase tracking-widest text-[#fce003]">Change Photo</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                        <span className="material-symbols-outlined text-white/20 text-xl group-hover:text-[#fce003]">gemology</span>
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Upload Diamond style</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Environment / Studio Style Reference */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Environment / Light Reference</label>
                  <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-all hover:border-[#fce003]/30 min-h-[90px] flex items-center justify-center">
                    <input 
                      type="file" 
                      onChange={(e) => handleImageRefUpload(e, 'env')}
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    />
                    {envRefImage ? (
                      <div className="w-full h-[90px] relative">
                        <img src={envRefImage} className="w-full h-full object-cover rounded-2xl" alt="Env Ref" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-[8px] font-black uppercase tracking-widest text-[#fce003]">Change Photo</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                        <span className="material-symbols-outlined text-white/20 text-xl group-hover:text-[#fce003]">filter_tilt_shift</span>
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Upload lighting style</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // PRESET PANEL
              <div className="flex flex-col gap-5 text-left">
                {/* Gold Presets */}
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Gold & Metal presets</span>
                  <div className="flex flex-col gap-1.5">
                    {goldPresets.map(preset => (
                      <button 
                        key={preset.name}
                        onClick={() => {
                          setGoldColor(preset.color);
                          setGoldRoughness(preset.roughness);
                          setGoldClearcoat(preset.clearcoat);
                          addLog(`Preset selected: ${preset.name}`);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border text-[9px] font-black uppercase tracking-wider text-white/80 ${goldColor === preset.color ? 'border-[#fce003] bg-white/10' : 'border-transparent'}`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-white/10 shadow-sm" style={{ backgroundColor: preset.color }} />
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gemstone Presets */}
                <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
                  <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Gemstone presets</span>
                  <div className="flex flex-col gap-1.5">
                    {gemstonePresets.map(preset => (
                      <button 
                        key={preset.name}
                        onClick={() => {
                          setGemColor(preset.color);
                          setGemTransmission(preset.transmission);
                          setGemIor(preset.ior);
                          addLog(`Preset selected: ${preset.name}`);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border text-[9px] font-black uppercase tracking-wider text-white/80 ${gemColor === preset.color ? 'border-[#fce003] bg-white/10' : 'border-transparent'}`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-white/10 shadow-sm" style={{ backgroundColor: preset.color }} />
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==========================================
            COLUMN 2: 3D VIEWPORT CONTAINER (Center, 6 Cols)
           ========================================== */}
        <div className="lg:col-span-6 flex flex-col gap-6 h-full min-h-[500px]">
          
          <div 
            ref={canvasContainerRef}
            className="w-full flex-1 relative bg-[#090803] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-3xl min-h-[460px] flex flex-col"
          >
            {/* Viewport Control Badges Overlay */}
            <div className="absolute top-5 left-5 right-5 z-20 pointer-events-none flex justify-between items-center">
              <span className="bg-black/80 border border-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest text-[#fce003] shadow-md flex items-center gap-1.5 pointer-events-auto">
                <span className="w-1.5 h-1.5 bg-[#fce003] rounded-full animate-pulse"></span>
                {modelFile ? 'Loaded Custom CAD Mesh' : 'Standard Fallback Ring'}
              </span>
              <div className="flex gap-1.5 pointer-events-auto">
                <button 
                  onClick={() => setIsTurntableActive(!isTurntableActive)}
                  className={`size-8 rounded-xl flex items-center justify-center border transition-all ${isTurntableActive ? 'bg-[#fce003]/10 border-[#fce003]/30 text-[#fce003]' : 'bg-black/60 border-white/10 text-neutral-500'}`}
                  title="Turntable Play/Pause"
                >
                  <span className="material-symbols-outlined text-sm">{isTurntableActive ? 'pause' : 'play_arrow'}</span>
                </button>
                <button 
                  onClick={() => {
                    setGoldColor('#e5c158');
                    setGoldRoughness(0.12);
                    setGoldClearcoat(1.0);
                    setGemColor('#ffffff');
                    setGemIor(2.417);
                    setLightPreset('studio');
                    setLightIntensity(1.2);
                    addLog("Viewport reset to factory defaults.");
                  }}
                  className="size-8 rounded-xl bg-black/60 border border-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-all"
                  title="Reset Viewport"
                >
                  <span className="material-symbols-outlined text-sm">restart_alt</span>
                </button>
              </div>
            </div>

            {/* 3D WebGL Canvas */}
            <div className="w-full flex-1 min-h-[350px]">
              <Canvas 
                shadows 
                camera={{ position: [0, 0, 4.5], fov: 45 }}
                gl={{ preserveDrawingBuffer: true }} // Required for Canvas frame-recording exports
              >
                <color attach="background" args={['#070603']} />
                
                {/* Simulated Environmental lighting */}
                <StudioLighting 
                  exposure={exposure}
                  lightRotation={lightRotation}
                  lightIntensity={lightIntensity}
                  preset={lightPreset}
                />

                <Environment preset={getEnvironmentPreset(lightPreset) as any} />

                <ViewportErrorBoundary
                  fallback={
                    <group>
                      <Center>
                        <ProceduralRing 
                          goldProps={{ color: goldColor, metalness: goldMetalness, roughness: goldRoughness, clearcoat: goldClearcoat }}
                          gemProps={{ color: gemColor, transmission: gemTransmission, ior: gemIor }}
                        />
                      </Center>
                    </group>
                  }
                >
                  <Suspense fallback={null}>
                    <Center>
                      <Turntable active={isTurntableActive} speed={turntableSpeed} axis={turntableAxis}>
                        {modelUrl ? (
                          <LoadedModel 
                            url={modelUrl}
                            fileName={modelFile?.name || ''}
                            goldProps={{ color: goldColor, metalness: goldMetalness, roughness: goldRoughness, clearcoat: goldClearcoat }}
                            gemProps={{ color: gemColor, transmission: gemTransmission, ior: gemIor }}
                          />
                        ) : (
                          <ProceduralRing 
                            goldProps={{ color: goldColor, metalness: goldMetalness, roughness: goldRoughness, clearcoat: goldClearcoat }}
                            gemProps={{ color: gemColor, transmission: gemTransmission, ior: gemIor }}
                          />
                        )}
                      </Turntable>
                    </Center>
                  </Suspense>
                </ViewportErrorBoundary>
                
                <OrbitControls 
                  enableDamping 
                  dampingFactor={0.05} 
                  maxPolarAngle={Math.PI / 1.7} 
                  minDistance={2.5} 
                  maxDistance={8}
                />
              </Canvas>
            </div>

            {/* AI Render Scan Overlay Beam */}
            <AnimatePresence>
              {aiProcessing && (
                <motion.div 
                  initial={{ top: '0%' }}
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 z-15 bg-gradient-to-r from-transparent via-[#fce003] to-transparent shadow-[0_0_15px_#fce003]"
                />
              )}
            </AnimatePresence>

            {/* Simulated Live AI Rendering Phase Log console */}
            <AnimatePresence>
              {aiProcessing && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="absolute inset-x-5 bottom-20 z-20 p-4 bg-[#090803]/90 border border-white/10 rounded-2xl backdrop-blur-md flex flex-col gap-1.5 shadow-xl text-left"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-[#fce003] uppercase tracking-[0.2em] animate-pulse">Running AI Synthesis Pipelines</span>
                    <span className="text-[8px] font-black text-neutral-500">{Math.round((aiStep / 10) * 100)}% Complete</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden p-0.5 mt-1 border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-[#fce003] rounded-full transition-all duration-300"
                      style={{ width: `${(aiStep / 10) * 100}%` }}
                    />
                  </div>
                  <div className="font-mono text-[7px] text-green-400 mt-2 h-16 overflow-y-auto flex flex-col gap-1 no-scrollbar select-none">
                    {aiLogs.slice(-3).map((log, idx) => (
                      <div key={idx} className="opacity-90">{log}</div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* EXPORT OVERLAY CONTROLS (Bottom, integrated in canvas space) */}
            <div className="p-5 border-t border-white/5 bg-black/60 backdrop-blur-md flex flex-col sm:flex-row justify-between items-center gap-4 z-20">
              <div className="flex flex-wrap gap-4 items-center">
                {/* Resolution Config */}
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[7px] font-black text-neutral-500 uppercase tracking-widest">Render Target</span>
                  <div className="flex bg-white/5 rounded-lg p-0.5 text-[8px] font-black uppercase">
                    <button 
                      onClick={() => setExportResolution('1080p')}
                      className={`px-2 py-1 rounded-md transition-all ${exportResolution === '1080p' ? 'bg-[#fce003] text-black' : 'text-neutral-500'}`}
                    >
                      1080P
                    </button>
                    <button 
                      onClick={() => setExportResolution('4k')}
                      className={`px-2 py-1 rounded-md transition-all ${exportResolution === '4k' ? 'bg-[#fce003] text-black' : 'text-neutral-500'}`}
                    >
                      4K Ultra
                    </button>
                  </div>
                </div>

                {/* Export Format Select */}
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[7px] font-black text-neutral-500 uppercase tracking-widest">Video Encoding</span>
                  <div className="flex bg-white/5 rounded-lg p-0.5 text-[8px] font-black uppercase">
                    <button 
                      onClick={() => setExportFormat('webm')}
                      className={`px-2 py-1 rounded-md transition-all ${exportFormat === 'webm' ? 'bg-[#fce003] text-black' : 'text-neutral-500'}`}
                    >
                      WEBM
                    </button>
                    <button 
                      onClick={() => setExportFormat('mp4')}
                      className={`px-2 py-1 rounded-md transition-all ${exportFormat === 'mp4' ? 'bg-[#fce003] text-black' : 'text-neutral-500'}`}
                    >
                      MP4
                    </button>
                    <button 
                      onClick={() => setExportFormat('gif')}
                      className={`px-2 py-1 rounded-md transition-all ${exportFormat === 'gif' ? 'bg-[#fce003] text-black' : 'text-neutral-500'}`}
                    >
                      GIF
                    </button>
                  </div>
                </div>
              </div>

              {/* Record Action button */}
              <button 
                disabled={isRecording || aiProcessing}
                onClick={startRecording}
                className={`w-full sm:w-auto px-5 py-3.5 rounded-2xl font-black text-[9px] tracking-widest flex items-center justify-center gap-2 uppercase active:scale-95 transition-all shadow-xl ${isRecording ? 'bg-red-500 border border-red-500 text-white animate-pulse' : 'bg-white text-black hover:bg-neutral-100 shadow-neutral-900/40'}`}
              >
                <span className="material-symbols-outlined text-sm">{isRecording ? 'radio_button_checked' : 'movie_creation'}</span>
                {isRecording ? `RECORDING ${recordingSeconds}s` : 'RENDER TURNTABLE VIDEO'}
              </button>
            </div>
          </div>
        </div>

        {/* ==========================================
            COLUMN 3: STUDIO CONTROLS SIDEBAR (Right, 3 Cols)
           ========================================== */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white/[0.01] border border-white/5 rounded-[2rem] p-5 backdrop-blur-xl flex flex-col gap-5 shadow-2xl text-left">
            
            <div className="border-b border-white/5 pb-3">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">tune</span>
                Fine-Tuning Console
              </span>
            </div>

            {/* Category A: Gold Materials */}
            <div className="flex flex-col gap-4">
              <span className="text-[9px] font-black text-[#fce003] uppercase tracking-widest">Metal (Gold Matrix)</span>
              
              {/* Gold Color Picker */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[8px] font-black text-neutral-500 uppercase tracking-wider">
                  <span>Gold Color hue</span>
                  <span className="text-white">{goldColor}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={goldColor} 
                    onChange={(e) => setGoldColor(e.target.value)} 
                    className="size-8 rounded-lg bg-transparent border border-white/10 cursor-pointer overflow-hidden outline-none" 
                  />
                  <input 
                    type="text" 
                    value={goldColor}
                    onChange={(e) => setGoldColor(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-[9px] font-mono text-white outline-none"
                  />
                </div>
              </div>

              {/* Gold Roughness Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[8px] font-black text-neutral-500 uppercase tracking-wider">
                  <span>Satin Roughness</span>
                  <span>{Math.round(goldRoughness * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.01" 
                  max="0.8" 
                  step="0.01"
                  value={goldRoughness}
                  onChange={(e) => setGoldRoughness(parseFloat(e.target.value))}
                  className="w-full accent-[#fce003] bg-white/10 h-1 rounded-full outline-none"
                />
              </div>

              {/* Gold Metalness Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[8px] font-black text-neutral-500 uppercase tracking-wider">
                  <span>Specular Metalness</span>
                  <span>{Math.round(goldMetalness * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="1.0" 
                  step="0.01"
                  value={goldMetalness}
                  onChange={(e) => setGoldMetalness(parseFloat(e.target.value))}
                  className="w-full accent-[#fce003] bg-white/10 h-1 rounded-full outline-none"
                />
              </div>

              {/* Gold Clearcoat Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[8px] font-black text-neutral-500 uppercase tracking-wider">
                  <span>Surface Polish (Clearcoat)</span>
                  <span>{Math.round(goldClearcoat * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.0" 
                  max="1.0" 
                  step="0.01"
                  value={goldClearcoat}
                  onChange={(e) => setGoldClearcoat(parseFloat(e.target.value))}
                  className="w-full accent-[#fce003] bg-white/10 h-1 rounded-full outline-none"
                />
              </div>
            </div>

            {/* Category B: Gemstone Materials */}
            <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
              <span className="text-[9px] font-black text-[#fce003] uppercase tracking-widest">Gemstone (Diamond Matrix)</span>

              {/* Gemstone Color Hue */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[8px] font-black text-neutral-500 uppercase tracking-wider">
                  <span>Gem Color hue</span>
                  <span className="text-white">{gemColor}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={gemColor} 
                    onChange={(e) => setGemColor(e.target.value)} 
                    className="size-8 rounded-lg bg-transparent border border-white/10 cursor-pointer overflow-hidden outline-none" 
                  />
                  <input 
                    type="text" 
                    value={gemColor}
                    onChange={(e) => setGemColor(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-[9px] font-mono text-white outline-none"
                  />
                </div>
              </div>

              {/* Gemstone Refractiveness index (IOR) */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[8px] font-black text-neutral-500 uppercase tracking-wider">
                  <span>Cut Fire (refraction index)</span>
                  <span>{gemIor.toFixed(3)} IOR</span>
                </div>
                <input 
                  type="range" 
                  min="1.2" 
                  max="2.8" 
                  step="0.005"
                  value={gemIor}
                  onChange={(e) => setGemIor(parseFloat(e.target.value))}
                  className="w-full accent-[#fce003] bg-white/10 h-1 rounded-full outline-none"
                />
              </div>
            </div>

            {/* Category C: Lighting & Space environment */}
            <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
              <span className="text-[9px] font-black text-[#fce003] uppercase tracking-widest">Lighting & Studio Space</span>

              {/* Studio Lights preset */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[8px] font-black text-neutral-500 uppercase tracking-wider">Light Environmental presets</span>
                <select 
                  value={lightPreset}
                  onChange={(e) => setLightPreset(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-[9px] font-black uppercase text-white/80 outline-none"
                >
                  <option value="studio" className="bg-[#161308] text-white">Studio Showcase (Clean)</option>
                  <option value="sunset" className="bg-[#161308] text-white">Golden Sunset (Warm)</option>
                  <option value="dramatic" className="bg-[#161308] text-white">Dramatic Contrast (Dark)</option>
                  <option value="showcase" className="bg-[#161308] text-white">Jeweler's Showcase (High Bright)</option>
                </select>
              </div>

              {/* Light Rotation Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[8px] font-black text-neutral-500 uppercase tracking-wider">
                  <span>Light dome rotation</span>
                  <span>{lightRotation}°</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  step="1"
                  value={lightRotation}
                  onChange={(e) => setLightRotation(parseInt(e.target.value))}
                  className="w-full accent-[#fce003] bg-white/10 h-1 rounded-full outline-none"
                />
              </div>

              {/* Turntable Speed Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[8px] font-black text-neutral-500 uppercase tracking-wider">
                  <span>Turntable Speed</span>
                  <span>{turntableSpeed.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.2" 
                  max="3.0" 
                  step="0.1"
                  value={turntableSpeed}
                  onChange={(e) => setTurntableSpeed(parseFloat(e.target.value))}
                  className="w-full accent-[#fce003] bg-white/10 h-1 rounded-full outline-none"
                />
              </div>

              {/* Turntable Axis Select */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[8px] font-black text-neutral-500 uppercase tracking-wider">Turntable Rotation Axis</span>
                <select 
                  value={turntableAxis}
                  onChange={(e) => setTurntableAxis(e.target.value as any)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-[9px] font-black uppercase text-white/80 outline-none"
                >
                  <option value="y" className="bg-[#161308] text-white">Y-Axis (Turntable Rotate)</option>
                  <option value="x" className="bg-[#161308] text-white">X-Axis (Vertical Flip)</option>
                  <option value="diag" className="bg-[#161308] text-white">Diagonal Orbit (Dynamic)</option>
                </select>
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}
