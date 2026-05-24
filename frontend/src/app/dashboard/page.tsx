"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Sparkles, RotateCcw, HelpCircle, ArrowLeft, Send, 
  Layers, Hammer, ShieldAlert, BadgeCheck, DollarSign,
  Maximize2, Compass, Sun, Moon, Eye, Grid3X3
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Types matching our Backend schema
interface RoomFurniture {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
}

interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  furniture: RoomFurniture[];
}

interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: string;
}

interface Aperture {
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  orientation: string;
}

interface Floor {
  floor: number;
  rooms: Room[];
  walls: Wall[];
  apertures: Aperture[];
}

interface Layout {
  width: number;
  height: number;
  floors: Floor[];
  svg: string;
  pool: boolean;
  garden: boolean;
}

interface CostBreakdown {
  item: string;
  percentage: number;
  cost_inr: number;
}

interface MaterialInventory {
  material: string;
  quantity: string;
}

interface SafetyMetrics {
  load_distribution: number;
  beam_stress_ratio: number;
  earthquake_resilience: number;
  fire_safety_rating_hours: number;
  safety_status: string;
  vaastu_compliance?: number;
}

interface CostSafety {
  built_up_area_sqft: number;
  total_cost_inr: number;
  total_cost_crores: number;
  cost_breakdown: CostBreakdown[];
  materials_inventory: MaterialInventory[];
  timeline_months: number;
  safety_metrics: SafetyMetrics;
}

interface GeneratorResponse {
  requirements: {
    style: string;
    rooms: {
      bedrooms: number;
      bathrooms: number;
      living_room: number;
      kitchen: number;
      study: number;
    };
    floors: number;
    pool: boolean;
    garden: boolean;
    width: number;
    length: number;
    budget_crores: number;
    materials: string[];
    balcony?: boolean;
    car_porch?: boolean;
    lift?: boolean;
    staircase?: string;
  };
  layout: Layout;
  costs_and_safety: CostSafety;
  cgi_render: string;
  lighting_preset: string;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export default function Dashboard() {
  // Input fields state
  const [prompt, setPrompt] = useState("Luxury modern villa with swimming pool");
  const [style, setStyle] = useState("Modern");
  const [floors, setFloors] = useState(2);
  const [width, setWidth] = useState(50);
  const [length, setLength] = useState(70);
  const [pool, setPool] = useState(true);
  const [garden, setGarden] = useState(false);
  const [bedrooms, setBedrooms] = useState(3);
  const [lighting, setLighting] = useState("Sunset");
  const [balcony, setBalcony] = useState(true);
  const [carPorch, setCarPorch] = useState(false);
  const [lift, setLift] = useState(false);
  const [staircase, setStaircase] = useState("internal");
  
  // Dashboard primary data state
  const [data, setData] = useState<GeneratorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"3d" | "2d" | "cgi">("3d");
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"solid" | "wireframe">("solid");

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: "ai", text: "Hello! I am your AI Chat Architect. Ask me to refine your design (e.g., 'Make it 3 floors', 'Add a garden', or 'Change style to Japanese Zen')." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // 3D Canvas Refs
  const canvas3DRef = useRef<HTMLCanvasElement | null>(null);
  const threeEngineRef = useRef<{
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    buildingGroup: THREE.Group;
  } | null>(null);

  // 1. Core Fetch Generator Endpoint
  const triggerGeneration = async (overridesMap?: Record<string, any>) => {
    setLoading(true);
    try {
      const payloadOverrides = overridesMap || {
        style,
        floors,
        width,
        length,
        pool,
        garden,
        balcony,
        car_porch: carPorch,
        lift,
        staircase,
        rooms: { bedrooms }
      };

      const res = await fetch("http://localhost:8000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          overrides: payloadOverrides,
          lighting_preset: lighting
        })
      });
      
      if (!res.ok) throw new Error("API failed");
      const result: GeneratorResponse = await res.json();
      if (result) {
        setData(result);
        
        // Sync states back in case NLP parser altered inputs
        setStyle(result.requirements.style);
        setFloors(result.requirements.floors);
        setWidth(result.requirements.width);
        setLength(result.requirements.length);
        setPool(result.requirements.pool);
        setGarden(result.requirements.garden);
        setBedrooms(result.requirements.rooms.bedrooms);
        setBalcony(result.requirements.balcony !== undefined ? result.requirements.balcony : balcony);
        setCarPorch(result.requirements.car_porch !== undefined ? result.requirements.car_porch : carPorch);
        setLift(result.requirements.lift !== undefined ? result.requirements.lift : lift);
        setStaircase(result.requirements.staircase !== undefined ? result.requirements.staircase : staircase);
      }
    } catch (err) {
      console.error("Failed to generate structure:", err);
      alert("Make sure the backend is running! Open a terminal and start the server with: uvicorn app.main:app --reload");
    } finally {
      setLoading(false);
    }
  };

  // Run on mount to fetch default villa
  useEffect(() => {
    triggerGeneration();
  }, []);

  // Whenever lighting changes, fetch updated CGI and lighting renders
  useEffect(() => {
    if (data) {
      triggerGeneration();
    }
  }, [lighting]);

  // 2. Chat corrections endpoint
  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput;
    setChatMessages(prev => [...prev, { sender: "user", text: userText }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          current_state: data || {}
        })
      });

      if (!res.ok) throw new Error("Chat engine offline");
      const chatRes = await res.json();
      
      setChatMessages(prev => [...prev, { sender: "ai", text: chatRes.reply }]);

      // If the AI parsed actual parameter changes, apply them and regenerate
      if (chatRes.suggested_overrides && Object.keys(chatRes.suggested_overrides).length > 0) {
        const mergedOverrides = {
          style: chatRes.suggested_overrides.style !== undefined ? chatRes.suggested_overrides.style : style,
          floors: chatRes.suggested_overrides.floors !== undefined ? chatRes.suggested_overrides.floors : floors,
          width: chatRes.suggested_overrides.width !== undefined ? chatRes.suggested_overrides.width : width,
          length: chatRes.suggested_overrides.length !== undefined ? chatRes.suggested_overrides.length : length,
          pool: chatRes.suggested_overrides.pool !== undefined ? chatRes.suggested_overrides.pool : pool,
          garden: chatRes.suggested_overrides.garden !== undefined ? chatRes.suggested_overrides.garden : garden,
          balcony: chatRes.suggested_overrides.balcony !== undefined ? chatRes.suggested_overrides.balcony : balcony,
          car_porch: chatRes.suggested_overrides.car_porch !== undefined ? chatRes.suggested_overrides.car_porch : carPorch,
          lift: chatRes.suggested_overrides.lift !== undefined ? chatRes.suggested_overrides.lift : lift,
          staircase: chatRes.suggested_overrides.staircase !== undefined ? chatRes.suggested_overrides.staircase : staircase,
          rooms: chatRes.suggested_overrides.rooms !== undefined ? chatRes.suggested_overrides.rooms : { bedrooms }
        };
        
        // Update dashboard slider states
        if (chatRes.suggested_overrides.style) setStyle(chatRes.suggested_overrides.style);
        if (chatRes.suggested_overrides.floors) setFloors(chatRes.suggested_overrides.floors);
        if (chatRes.suggested_overrides.pool !== undefined) setPool(chatRes.suggested_overrides.pool);
        if (chatRes.suggested_overrides.garden !== undefined) setGarden(chatRes.suggested_overrides.garden);
        if (chatRes.suggested_overrides.balcony !== undefined) setBalcony(chatRes.suggested_overrides.balcony);
        if (chatRes.suggested_overrides.car_porch !== undefined) setCarPorch(chatRes.suggested_overrides.car_porch);
        if (chatRes.suggested_overrides.lift !== undefined) setLift(chatRes.suggested_overrides.lift);
        if (chatRes.suggested_overrides.staircase) setStaircase(chatRes.suggested_overrides.staircase);
        if (chatRes.suggested_overrides.rooms?.bedrooms) setBedrooms(chatRes.suggested_overrides.rooms.bedrooms);

        triggerGeneration(mergedOverrides);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: "ai", text: "Error: I couldn't connect to the AI chat backend. Please verify your FastAPI server." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // 3. Initialize Three.js 3D Viewer Environment
  useEffect(() => {
    if (activeTab !== "3d" || !canvas3DRef.current) return;

    const canvas = canvas3DRef.current;
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#030712");
    scene.fog = new THREE.FogExp2("#030712", 0.012);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(25, 20, 35);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.01; // don't go below ground

    // Base Group to hold building extrusion meshes
    const buildingGroup = new THREE.Group();
    scene.add(buildingGroup);

    threeEngineRef.current = { scene, renderer, camera, controls, buildingGroup };

    // Resize handler
    const handleResize = () => {
      if (!canvas || !threeEngineRef.current) return;
      const { camera, renderer } = threeEngineRef.current;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    };
    window.addEventListener("resize", handleResize);

    // Render loop
    let animationId: number;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      threeEngineRef.current = null;
    };
  }, [activeTab]);

  // 4. Procedural 3D Building Extrusion Handler
  useEffect(() => {
    if (activeTab !== "3d" || !data || !threeEngineRef.current) return;

    const { scene, buildingGroup } = threeEngineRef.current;

    // Clear old building geometries
    while(buildingGroup.children.length > 0){
      const obj = buildingGroup.children[0];
      buildingGroup.remove(obj);
    }

    // Set Lighting based on preset
    // Clear old lights
    const lights = scene.children.filter(c => c instanceof THREE.Light);
    lights.forEach(l => scene.remove(l));

    const styleName = data.requirements.style;
    const floorHeight = 4.5;
    const scale = 0.08; // fit canvas coords beautifully
    
    // Aesthetic Styling Materials
    let wallMat: THREE.Material;
    let interiorWallMat: THREE.Material = new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.8 });
    let floorPlateMat: THREE.Material;
    let glassMat: THREE.Material = new THREE.MeshStandardMaterial({
      color: "#06b6d4",
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.9
    });

    if (styleName === "Brutalist") {
      wallMat = new THREE.MeshStandardMaterial({ color: "#64748b", roughness: 0.9, metalness: 0.1 }); // thick raw concrete
      floorPlateMat = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.9 });
    } else if (styleName === "Japanese Zen") {
      wallMat = new THREE.MeshStandardMaterial({ color: "#d97706", roughness: 0.6 }); // wooden panels
      floorPlateMat = new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.5 }); // darker cedar floorboards
    } else if (styleName === "Classical") {
      wallMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.5, metalness: 0.1 }); // marble stucco
      floorPlateMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.3 }); // marble tile
    } else if (styleName === "Indian Traditional") {
      wallMat = new THREE.MeshStandardMaterial({ color: "#c2410c", roughness: 0.75, metalness: 0.15 }); // Terracotta Jodhpur sandstone red-orange
      floorPlateMat = new THREE.MeshStandardMaterial({ color: "#ea580c", roughness: 0.8 }); // warm terracotta floor tiles
      interiorWallMat = new THREE.MeshStandardMaterial({ color: "#fef3c7", roughness: 0.9 }); // Makrana marble / warm cream
    } else if (styleName === "Futuristic") {
      wallMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.2, metalness: 0.8 }); // carbon composite
      floorPlateMat = new THREE.MeshStandardMaterial({ color: "#1e1b4b", roughness: 0.4 });
    } else { // Modern
      wallMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.5, metalness: 0.4 });
      floorPlateMat = new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.6 }); // parquet wood floor
    }

    // Toggle solid vs wireframe material style
    if (viewMode === "wireframe") {
      const wireMat = new THREE.MeshBasicMaterial({
        color: styleName === "Futuristic" ? "#06b6d4" : "#6366f1",
        wireframe: true
      });
      wallMat = wireMat;
      interiorWallMat = wireMat;
      floorPlateMat = wireMat;
      glassMat = wireMat;
    }

    // Centering offsets
    const plotW = data.layout.width;
    const plotH = data.layout.height;
    const cx = (plotW / 2) * scale;
    const cz = (plotH / 2) * scale;

    // Floor Plate geometry under plot
    const groundPlateGeo = new THREE.BoxGeometry(plotW * scale + 6, 0.2, plotH * scale + 6);
    const groundPlateMat = new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.9 });
    const groundPlate = new THREE.Mesh(groundPlateGeo, groundPlateMat);
    groundPlate.position.set(0, -0.1, 0);
    buildingGroup.add(groundPlate);

    // Spawning Swimming Pool if active
    if (data.layout.pool) {
      const pW = (plotW * 0.6) * scale;
      const pH = 25 * scale;
      const poolGeo = new THREE.BoxGeometry(pW, 0.15, pH);
      const poolWaterMat = new THREE.MeshStandardMaterial({
        color: "#06b6d4",
        emissive: "#0891b2",
        roughness: 0.1,
        transparent: true,
        opacity: 0.8
      });
      const poolWater = new THREE.Mesh(poolGeo, poolWaterMat);
      poolWater.position.set(0, 0.02, (plotH / 2 - 20) * scale);
      buildingGroup.add(poolWater);
    } else if (data.layout.garden) {
      // Draw a moss green lawn slab
      const gW = (plotW - 10) * scale;
      const gH = 25 * scale;
      const lawnGeo = new THREE.BoxGeometry(gW, 0.05, gH);
      const lawnMat = new THREE.MeshStandardMaterial({ color: "#15803d", roughness: 0.9 });
      const lawn = new THREE.Mesh(lawnGeo, lawnMat);
      lawn.position.set(0, 0.02, (plotH / 2 - 20) * scale);
      buildingGroup.add(lawn);
    }

    // Process each floor for extrusion
    data.layout.floors.forEach((f) => {
      // Check if user filtered to a specific floor (0 means all floors)
      if (selectedFloor !== 0 && f.floor !== selectedFloor) return;

      const floorOffset = (f.floor - 1) * floorHeight;

      // Draw Floor plate for this floor level
      const fPlateGeo = new THREE.BoxGeometry((plotW - 48) * scale, 0.15, (plotH - 48) * scale);
      const fPlate = new THREE.Mesh(fPlateGeo, floorPlateMat);
      fPlate.position.set(0, floorOffset, 0);
      buildingGroup.add(fPlate);

      // Extrude Walls
      f.walls.forEach((w) => {
        const x1 = w.x1 * scale - cx;
        const z1 = w.y1 * scale - cz;
        const x2 = w.x2 * scale - cx;
        const z2 = w.y2 * scale - cz;

        const wallLen = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
        const thickness = w.type === "exterior" ? 0.35 : 0.22;
        
        // Spawn Wall Mesh
        const wallGeo = new THREE.BoxGeometry(wallLen, floorHeight, thickness);
        const activeWallMat = w.type === "exterior" ? wallMat : interiorWallMat;
        const wall = new THREE.Mesh(wallGeo, activeWallMat);

        // Position at wall midpoint
        const mx = (x1 + x2) / 2;
        const mz = (z1 + z2) / 2;
        wall.position.set(mx, floorOffset + floorHeight / 2, mz);

        // Rotate wall
        const angle = Math.atan2(z2 - z1, x2 - x1);
        wall.rotation.y = -angle;

        buildingGroup.add(wall);
      });

      // Extrude Windows & Doors
      f.apertures.forEach((ap) => {
        const ax = ap.x * scale - cx;
        const az = ap.y * scale - cz;
        const apW = ap.w * scale;
        const apH = ap.type === "window" ? 2.2 : 3.8;

        if (ap.type === "window") {
          // Glass panel
          const glassGeo = new THREE.BoxGeometry(
            ap.orientation === "horizontal" ? apW : 0.08, 
            apH, 
            ap.orientation === "vertical" ? apW : 0.08
          );
          const glass = new THREE.Mesh(glassGeo, glassMat);
          glass.position.set(ax + (ap.orientation === "horizontal" ? apW / 2 : 0), floorOffset + 2.5, az + (ap.orientation === "vertical" ? apW / 2 : 0));
          buildingGroup.add(glass);
        }
      });

      // Spawning Cute Custom 3D Furniture Blocks
      f.rooms.forEach((r) => {
        const rx = r.x * scale - cx;
        const rz = r.y * scale - cz;
        const rw = r.w * scale;
        const rh = r.h * scale;

        // High-Fidelity Architectural Element Extrusion
        if (r.type === "porch") {
          if (viewMode === "wireframe") {
            const canopyGeo = new THREE.BoxGeometry(rw, 0.15, rh);
            const canopyEdges = new THREE.EdgesGeometry(canopyGeo);
            const canopyWire = new THREE.LineSegments(canopyEdges, new THREE.LineBasicMaterial({ color: "#f59e0b" }));
            canopyWire.position.set(rx + rw / 2, floorOffset + 3.8, rz + rh / 2);
            buildingGroup.add(canopyWire);

            const points = [
              [rx + 0.5, rz + rh - 0.5],
              [rx + rw - 0.5, rz + rh - 0.5]
            ];
            points.forEach(([px, pz]) => {
              const pillarGeo = new THREE.CylinderGeometry(0.2, 0.2, 3.8, 4);
              const pillarEdges = new THREE.EdgesGeometry(pillarGeo);
              const pillarWire = new THREE.LineSegments(pillarEdges, new THREE.LineBasicMaterial({ color: "#f59e0b" }));
              pillarWire.position.set(px, floorOffset + 1.9, pz);
              buildingGroup.add(pillarWire);
            });
          } else {
            const canopyGeo = new THREE.BoxGeometry(rw, 0.2, rh);
            const canopyMat = new THREE.MeshStandardMaterial({ 
              color: styleName === "Indian Traditional" ? "#b45309" : "#78350f", 
              roughness: 0.6 
            });
            const canopy = new THREE.Mesh(canopyGeo, canopyMat);
            canopy.position.set(rx + rw / 2, floorOffset + 3.8, rz + rh / 2);
            buildingGroup.add(canopy);

            const pillarColor = styleName === "Indian Traditional" ? "#ea580c" : "#64748b";
            const pillarMat = new THREE.MeshStandardMaterial({ color: pillarColor, roughness: 0.5, metalness: 0.2 });
            const points = [
              [rx + 0.5, rz + rh - 0.5],
              [rx + rw - 0.5, rz + rh - 0.5]
            ];
            points.forEach(([px, pz]) => {
              const pillarGeo = new THREE.CylinderGeometry(0.25, 0.25, 3.8, 16);
              const pillar = new THREE.Mesh(pillarGeo, pillarMat);
              pillar.position.set(px, floorOffset + 1.9, pz);
              buildingGroup.add(pillar);
            });

            const carGeo = new THREE.BoxGeometry(3.5, 1.4, 6.5);
            const carMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.3, metalness: 0.8 });
            const car = new THREE.Mesh(carGeo, carMat);
            car.position.set(rx + rw / 3, floorOffset + 0.7, rz + rh / 2);
            buildingGroup.add(car);

            const cabGeo = new THREE.BoxGeometry(3.2, 0.8, 3.2);
            const cab = new THREE.Mesh(cabGeo, carMat);
            cab.position.set(rx + rw / 3, floorOffset + 1.6, rz + rh / 2 - 0.5);
            buildingGroup.add(cab);
          }
        } 
        else if (r.type === "balcony") {
          const balconyThick = 0.15;
          if (viewMode === "wireframe") {
            const slabGeo = new THREE.BoxGeometry(rw, balconyThick, rh);
            const slabEdges = new THREE.EdgesGeometry(slabGeo);
            const slabWire = new THREE.LineSegments(slabEdges, new THREE.LineBasicMaterial({ color: "#f43f5e" }));
            slabWire.position.set(rx + rw / 2, floorOffset, rz + rh / 2);
            buildingGroup.add(slabWire);
          } else {
            const slabGeo = new THREE.BoxGeometry(rw, balconyThick, rh);
            const slabMat = floorPlateMat;
            const slab = new THREE.Mesh(slabGeo, slabMat);
            slab.position.set(rx + rw / 2, floorOffset, rz + rh / 2);
            buildingGroup.add(slab);

            const railHeight = 1.1;
            const railGlassMat = new THREE.MeshStandardMaterial({
              color: "#06b6d4",
              transparent: true,
              opacity: 0.35,
              roughness: 0.1,
              metalness: 0.9,
              side: THREE.DoubleSide
            });
            const railSteelMat = new THREE.MeshStandardMaterial({
              color: "#cbd5e1",
              roughness: 0.2,
              metalness: 0.8
            });

            const fRailGeo = new THREE.BoxGeometry(rw, railHeight, 0.05);
            const fRail = new THREE.Mesh(fRailGeo, railGlassMat);
            fRail.position.set(rx + rw / 2, floorOffset + railHeight / 2, rz + rh - 0.025);
            buildingGroup.add(fRail);

            const fSteelGeo = new THREE.BoxGeometry(rw, 0.05, 0.06);
            const fSteel = new THREE.Mesh(fSteelGeo, railSteelMat);
            fSteel.position.set(rx + rw / 2, floorOffset + railHeight, rz + rh - 0.025);
            buildingGroup.add(fSteel);

            const bRailGeo = new THREE.BoxGeometry(rw, railHeight, 0.05);
            const bRail = new THREE.Mesh(bRailGeo, railGlassMat);
            bRail.position.set(rx + rw / 2, floorOffset + railHeight / 2, rz + 0.025);
            buildingGroup.add(bRail);

            const bSteelGeo = new THREE.BoxGeometry(rw, 0.05, 0.06);
            const bSteel = new THREE.Mesh(bSteelGeo, railSteelMat);
            bSteel.position.set(rx + rw / 2, floorOffset + railHeight, rz + 0.025);
            buildingGroup.add(bSteel);

            const lRailGeo = new THREE.BoxGeometry(0.05, railHeight, rh);
            const lRail = new THREE.Mesh(lRailGeo, railGlassMat);
            lRail.position.set(rx + 0.025, floorOffset + railHeight / 2, rz + rh / 2);
            buildingGroup.add(lRail);

            const lSteelGeo = new THREE.BoxGeometry(0.06, 0.05, rh);
            const lSteel = new THREE.Mesh(lSteelGeo, railSteelMat);
            lSteel.position.set(rx + 0.025, floorOffset + railHeight, rz + rh / 2);
            buildingGroup.add(lSteel);
          }
        }
        else if (r.type === "lift") {
          if (viewMode === "wireframe") {
            const shaftGeo = new THREE.BoxGeometry(rw, floorHeight, rh);
            const shaftEdges = new THREE.EdgesGeometry(shaftGeo);
            const shaftWire = new THREE.LineSegments(shaftEdges, new THREE.LineBasicMaterial({ color: "#06b6d4" }));
            shaftWire.position.set(rx + rw / 2, floorOffset + floorHeight / 2, rz + rh / 2);
            buildingGroup.add(shaftWire);
          } else {
            const shaftGeo = new THREE.BoxGeometry(rw - 0.05, floorHeight, rh - 0.05);
            const shaftMat = new THREE.MeshStandardMaterial({
              color: "#22d3ee",
              transparent: true,
              opacity: 0.25,
              roughness: 0.1,
              metalness: 0.9,
              side: THREE.DoubleSide
            });
            const shaft = new THREE.Mesh(shaftGeo, shaftMat);
            shaft.position.set(rx + rw / 2, floorOffset + floorHeight / 2, rz + rh / 2);
            buildingGroup.add(shaft);

            const metalPillarMat = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.4, metalness: 0.7 });
            const corners = [
              [rx, rz],
              [rx + rw, rz],
              [rx, rz + rh],
              [rx + rw, rz + rh]
            ];
            corners.forEach(([cx2, cz2]) => {
              const pillarGeo = new THREE.BoxGeometry(0.12, floorHeight, 0.12);
              const pillar = new THREE.Mesh(pillarGeo, metalPillarMat);
              pillar.position.set(cx2, floorOffset + floorHeight / 2, cz2);
              buildingGroup.add(pillar);
            });

            const cabH = 2.8;
            const cabGeo = new THREE.BoxGeometry(rw * 0.75, cabH, rh * 0.75);
            const cabMat = new THREE.MeshStandardMaterial({
              color: "#fbbf24",
              emissive: "#b45309",
              transparent: true,
              opacity: 0.7,
              roughness: 0.3
            });
            const cab = new THREE.Mesh(cabGeo, cabMat);
            cab.position.set(rx + rw / 2, floorOffset + cabH / 2 + 0.6, rz + rh / 2);
            buildingGroup.add(cab);

            const plateGeo = new THREE.BoxGeometry(rw * 0.8, 0.1, rh * 0.8);
            const plateMat = metalPillarMat;
            const plate = new THREE.Mesh(plateGeo, plateMat);
            plate.position.set(rx + rw / 2, floorOffset + cabH + 0.6, rz + rh / 2);
            buildingGroup.add(plate);
          }
        }
        else if (r.type === "staircase") {
          const numSteps = 12;
          const stepHeightTotal = floorHeight;

          if (viewMode === "wireframe") {
            const mainBoxGeo = new THREE.BoxGeometry(rw, floorHeight, rh);
            const mainBoxEdges = new THREE.EdgesGeometry(mainBoxGeo);
            const mainBoxWire = new THREE.LineSegments(mainBoxEdges, new THREE.LineBasicMaterial({ color: "#818cf8" }));
            mainBoxWire.position.set(rx + rw / 2, floorOffset + floorHeight / 2, rz + rh / 2);
            buildingGroup.add(mainBoxWire);
          } else {
            const stepMat = new THREE.MeshStandardMaterial({ 
              color: styleName === "Indian Traditional" ? "#ea580c" : "#cbd5e1", 
              roughness: 0.7, 
              metalness: 0.1 
            });

            if (rw > rh) {
              const singleStepW = rw / numSteps;
              for (let i = 0; i < numSteps; i++) {
                const curStepH = ((i + 1) / numSteps) * stepHeightTotal;
                const stepGeo = new THREE.BoxGeometry(singleStepW, curStepH, rh);
                const stepMesh = new THREE.Mesh(stepGeo, stepMat);
                
                const curX = rx + i * singleStepW + singleStepW / 2;
                const curY = floorOffset + curStepH / 2;
                const curZ = rz + rh / 2;
                
                stepMesh.position.set(curX, curY, curZ);
                buildingGroup.add(stepMesh);
              }

              const railMat = new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.5 });
              const handrailGeo = new THREE.BoxGeometry(rw, 0.08, 0.08);
              const handrail = new THREE.Mesh(handrailGeo, railMat);
              handrail.position.set(rx + rw / 2, floorOffset + stepHeightTotal / 2 + 1.0, rz + rh - 0.1);
              handrail.rotation.z = -Math.atan2(stepHeightTotal, rw);
              buildingGroup.add(handrail);
            } else {
              const singleStepH = rh / numSteps;
              for (let i = 0; i < numSteps; i++) {
                const curStepH = ((i + 1) / numSteps) * stepHeightTotal;
                const stepGeo = new THREE.BoxGeometry(rw, curStepH, singleStepH);
                const stepMesh = new THREE.Mesh(stepGeo, stepMat);
                
                const curX = rx + rw / 2;
                const curY = floorOffset + curStepH / 2;
                const curZ = rz + i * singleStepH + singleStepH / 2;
                
                stepMesh.position.set(curX, curY, curZ);
                buildingGroup.add(stepMesh);
              }

              const railMat = new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.5 });
              const handrailGeo = new THREE.BoxGeometry(0.08, 0.08, rh);
              const handrail = new THREE.Mesh(handrailGeo, railMat);
              handrail.position.set(rx + rw - 0.1, floorOffset + stepHeightTotal / 2 + 1.0, rz + rh / 2);
              handrail.rotation.x = Math.atan2(stepHeightTotal, rh);
              buildingGroup.add(handrail);
            }
          }
        }

        r.furniture.forEach((furn) => {
          const fx = rx + furn.x * scale;
          const fz = rz + furn.y * scale;
          const fw = furn.w * scale;
          const fh = furn.h * scale;

          let furnColor = "#475569"; // slate dark
          let fHeight = 0.8;

          if (furn.type === "bed") {
            furnColor = "#6366f1"; // indigo
            fHeight = 0.9;
          } else if (furn.type === "sofa") {
            furnColor = "#ec4899"; // pink
            fHeight = 1.0;
          } else if (furn.type === "table") {
            furnColor = "#b45309"; // wood orange
            fHeight = 1.2;
          } else if (furn.type === "bath" || furn.type === "sink") {
            furnColor = "#06b6d4"; // cyan
            fHeight = 1.1;
          }

          if (viewMode === "wireframe") {
            const fGeo = new THREE.BoxGeometry(fw, fHeight, fh);
            const fEdges = new THREE.EdgesGeometry(fGeo);
            const fWire = new THREE.LineSegments(fEdges, new THREE.LineBasicMaterial({ color: furnColor }));
            fWire.position.set(fx + fw / 2, floorOffset + fHeight / 2 + 0.1, fz + fh / 2);
            buildingGroup.add(fWire);
          } else {
            // Main body
            const furnGeo = new THREE.BoxGeometry(fw, fHeight, fh);
            const furnMat = new THREE.MeshStandardMaterial({ color: furnColor, roughness: 0.8 });
            const furnMesh = new THREE.Mesh(furnGeo, furnMat);
            furnMesh.position.set(fx + fw / 2, floorOffset + fHeight / 2 + 0.08, fz + fh / 2);
            buildingGroup.add(furnMesh);
            
            // If bed, add a small pillow mesh
            if (furn.type === "bed") {
              const pillowGeo = new THREE.BoxGeometry(fw * 0.8, 0.2, fh * 0.25);
              const pillowMat = new THREE.MeshStandardMaterial({ color: "#f8fafc" });
              const pillow = new THREE.Mesh(pillowGeo, pillowMat);
              pillow.position.set(fx + fw / 2, floorOffset + fHeight + 0.1, fz + fh * 0.15);
              buildingGroup.add(pillow);
            }
          }
        });
      });
    });

    // Environmental Lights preset setup
    const ambientLight = new THREE.AmbientLight(
      lighting === "Sunset" ? "#311042" : lighting === "Cyberpunk" ? "#0b0f19" : lighting === "Rainy" ? "#334155" : "#e2e8f0",
      lighting === "Sunlit" ? 1.0 : 0.6
    );
    scene.add(ambientLight);

    if (lighting === "Sunset") {
      // Golden twilight glow
      const sun = new THREE.DirectionalLight("#f97316", 2.2);
      sun.position.set(40, 15, -20);
      scene.add(sun);
      
      const bounce = new THREE.DirectionalLight("#a21caf", 1.2);
      bounce.position.set(-20, 5, 20);
      scene.add(bounce);
    } else if (lighting === "Cyberpunk") {
      // Electric neon cyan & hot pink glows
      const pinkGlow = new THREE.DirectionalLight("#ec4899", 2.0);
      pinkGlow.position.set(-15, 8, 15);
      scene.add(pinkGlow);

      const cyanGlow = new THREE.DirectionalLight("#06b6d4", 2.0);
      cyanGlow.position.set(15, 12, -15);
      scene.add(cyanGlow);

      // Add warm point lights inside window chambers
      data.layout.floors.forEach((f, fIdx) => {
        if (selectedFloor !== 0 && f.floor !== selectedFloor) return;
        const floorOffset = (f.floor - 1) * floorHeight;
        
        f.rooms.forEach((r, rIdx) => {
          const rx = r.x * scale - cx + (r.w * scale) / 2;
          const rz = r.y * scale - cz + (r.h * scale) / 2;
          
          const pLight = new THREE.PointLight("#fbbf24", 1.8, 8); // warm yellow bulb glow
          pLight.position.set(rx, floorOffset + 2.5, rz);
          buildingGroup.add(pLight);
        });
      });
    } else if (lighting === "Rainy") {
      const greyLight = new THREE.DirectionalLight("#94a3b8", 1.2);
      greyLight.position.set(10, 20, 10);
      scene.add(greyLight);
    } else { // Sunlit
      const directSun = new THREE.DirectionalLight("#fffbeb", 2.8);
      directSun.position.set(20, 30, 20);
      scene.add(directSun);
    }

  }, [activeTab, data, selectedFloor, viewMode, lighting]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-semibold tracking-wider uppercase">Landing</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-widest text-white">
              NEO<span className="text-indigo-400">ARCHITECT</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
              STUDIO COCKPIT
            </span>
          </div>
        </div>

        {/* Global Lighting Quick-Selector */}
        <div className="flex items-center gap-2 bg-slate-900/60 border border-white/5 p-1 rounded-xl">
          {(["Sunlit", "Sunset", "Cyberpunk", "Rainy"] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => setLighting(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                lighting === preset
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </header>

      {/* Main Studio Core */}
      <div className="flex-grow grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 max-w-[1700px] w-full mx-auto">
        
        {/* Left Column: Requirements Control Form (3 Columns) */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-2xl glow-indigo border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold tracking-wider uppercase text-white">
                AI Synthesis Parameters
              </h2>
            </div>

            {/* Prompt input */}
            <div className="mb-5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Client Natural Text Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your architectural design..."
                rows={3}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-none font-medium"
              />
            </div>

            {/* Style Selector Cards */}
            <div className="mb-5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Architectural Style Design System
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["Modern", "Futuristic", "Brutalist", "Japanese Zen", "Classical", "Indian Traditional"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`py-2 px-3 rounded-lg border text-left text-xs font-bold transition-all relative overflow-hidden ${
                      style === s
                        ? "bg-indigo-600/15 border-indigo-500 text-white shadow-neon-indigo"
                        : "bg-slate-950 border-white/5 text-slate-400 hover:text-white hover:border-white/10"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Dimensions Sliders */}
            <div className="mb-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span>Plot Width</span>
                  <span className="text-white font-mono">{width} FT</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="80"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span>Plot Length</span>
                  <span className="text-white font-mono">{length} FT</span>
                </div>
                <input
                  type="range"
                  min="45"
                  max="100"
                  value={length}
                  onChange={(e) => setLength(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <span>Floors</span>
                    <span className="text-white font-mono">{floors}</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    value={floors}
                    onChange={(e) => setFloors(Math.min(3, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-bold text-center text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <span>Bedrooms</span>
                    <span className="text-white font-mono">{bedrooms}</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-bold text-center text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Checkbox features */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pool}
                  onChange={(e) => {
                    setPool(e.target.checked);
                    if (e.target.checked) setGarden(false);
                  }}
                  className="w-4 h-4 rounded border-white/10 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                Swimming Pool
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={garden}
                  onChange={(e) => {
                    setGarden(e.target.checked);
                    if (e.target.checked) setPool(false);
                  }}
                  className="w-4 h-4 rounded border-white/10 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                Zen Garden
              </label>
            </div>

            {/* Custom Luxury & Mechanical Structural Features */}
            <div className="border-t border-white/5 my-4 pt-4">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Luxury Architectural Features
              </label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={balcony}
                    onChange={(e) => setBalcony(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  Sunset Balcony
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={carPorch}
                    onChange={(e) => setCarPorch(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  Car Porch
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lift}
                    onChange={(e) => setLift(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  Glass Lift
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Vertical Circulation
                </label>
                <select
                  value={staircase}
                  onChange={(e) => setStaircase(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="none">No Staircase (Single Story)</option>
                  <option value="internal">Internal Staircase</option>
                  <option value="external">External Staircase</option>
                </select>
              </div>
            </div>

            {/* Trigger Button */}
            <button
              onClick={() => triggerGeneration()}
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 border ${
                loading 
                  ? "bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed" 
                  : "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 hover:shadow-indigo-500/40 active:scale-98"
              }`}
            >
              {loading ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  SYNTHESIZING MATRIX...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  GENERATE BUILDING Blueprint
                </>
              )}
            </button>
          </div>

          {/* Floating AI Chat Assistant Panel */}
          <div className="glass-panel p-4 rounded-2xl glow-indigo border border-white/10 flex-grow flex flex-col justify-between min-h-[280px]">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2.5 mb-3">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold tracking-wider uppercase text-white">
                AI CHAT ARCHITECT
              </h3>
            </div>

            {/* Chat Logs */}
            <div className="flex-grow overflow-y-auto max-h-[220px] space-y-3 pr-1.5 scrollbar-thin">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl text-[11px] leading-relaxed max-w-[85%] font-medium ${
                    msg.sender === "user"
                      ? "bg-indigo-600/20 text-indigo-100 border border-indigo-500/20 ml-auto"
                      : "bg-slate-900/60 text-slate-300 border border-white/5 mr-auto"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {chatLoading && (
                <div className="bg-slate-900/60 text-slate-500 border border-white/5 p-2 rounded-xl text-[10px] w-20 flex items-center gap-1.5 font-bold uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={sendChatMessage} className="flex gap-2 border-t border-white/5 pt-3 mt-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask to resize, change style..."
                className="flex-grow bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Center / Right Column: Main Viewers and Diagnostic panels (9 Columns) */}
        <div className="xl:col-span-9 flex flex-col gap-6">
          
          {/* Main Visualizer Tabs Wrapper */}
          <div className="glass-panel rounded-2xl glow-indigo border border-white/10 relative overflow-hidden flex flex-col min-h-[460px]">
            {/* Toolbar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/20 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("3d")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                    activeTab === "3d"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  3D Extruded Orbit Model
                </button>
                <button
                  onClick={() => setActiveTab("2d")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                    activeTab === "2d"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  2D Drafting Blueprint
                </button>
                <button
                  onClick={() => setActiveTab("cgi")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                    activeTab === "cgi"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Cinematic CGI Render
                </button>
              </div>

              {/* View options corresponding to tabs */}
              {activeTab === "3d" && data && (
                <div className="flex items-center gap-4">
                  {/* Floor Level Filter */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Floor:</span>
                    <button
                      onClick={() => setSelectedFloor(0)}
                      className={`px-2 py-1 rounded text-[10px] font-bold ${
                        selectedFloor === 0 ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      ALL
                    </button>
                    {data.layout.floors.map((fl) => (
                      <button
                        key={fl.floor}
                        onClick={() => setSelectedFloor(fl.floor)}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          selectedFloor === fl.floor ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        FL {fl.floor}
                      </button>
                    ))}
                  </div>

                  <div className="h-4 w-px bg-white/10" />

                  {/* Rendering Mode Solid vs Wireframe */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setViewMode("solid")}
                      className={`p-1.5 rounded-lg transition-colors ${
                        viewMode === "solid" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                      title="Solid Mesh"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("wireframe")}
                      className={`p-1.5 rounded-lg transition-colors ${
                        viewMode === "wireframe" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                      title="Draft Wireframe"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Viewer Display Board */}
            <div className="flex-grow relative flex items-center justify-center p-4">
              
              {/* Loading overlay */}
              {loading && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 border border-indigo-500 flex items-center justify-center animate-spin">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-white tracking-widest uppercase">
                      Compiling Building Core Matrix
                    </h3>
                    <p className="text-[10px] text-slate-500 tracking-wider font-semibold mt-1">
                      Generating structured 3D extrusion coordinates and Pillow CGI render styles
                    </p>
                  </div>
                </div>
              )}

              {/* 3D Viewer Canvas */}
              {activeTab === "3d" && (
                <div className="w-full h-[380px] relative">
                  <canvas ref={canvas3DRef} className="w-full h-full rounded-xl" />
                  {/* Orbit controls HUD guidance */}
                  <div className="absolute bottom-4 left-4 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 border border-white/5 rounded-lg text-[9px] font-bold text-slate-400 tracking-wider pointer-events-none flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: "12s" }} />
                    MOUSE DRAG TO ORBIT  |  SCROLL TO ZOOM  |  RIGHT-CLICK TO PAN
                  </div>
                </div>
              )}

              {/* 2D Plan SVG Viewer */}
              {activeTab === "2d" && data && (
                <div 
                  className="w-full max-w-[620px] aspect-[4/3] rounded-xl overflow-hidden border border-white/5 relative bg-slate-950 flex items-center justify-center p-2"
                  dangerouslySetInnerHTML={{ __html: data.layout.svg }}
                />
              )}

              {/* Cinematic CGI Render */}
              {activeTab === "cgi" && data && (
                <div className="relative w-full max-w-[700px] aspect-[8/5] rounded-xl overflow-hidden border border-white/5 bg-slate-900 group">
                  <img
                    src={data.cgi_render}
                    alt="Cinematic CGI Preview"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Overlay camera metadata */}
                  <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 border border-white/10 rounded-lg text-[9px] font-mono text-slate-300 font-bold tracking-wider">
                    RTX PATH-TRACED PREVIEW // f/1.8 35mm
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Bottom Diagnostic Panel: Cost Estimation & Structural Safety */}
          {data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Cost Estimation Block */}
              <div className="glass-panel p-6 rounded-2xl glow-indigo border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-bold tracking-wider uppercase text-white">
                        Cost Estimation Analyzer
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ESTIMATE BREAKDOWN
                    </span>
                  </div>

                  {/* Highlight Core Cost */}
                  <div className="flex items-baseline justify-between mb-5 bg-slate-950 p-4 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                      Total Estimated Budget (INR)
                    </span>
                    <span className="text-2xl font-black text-emerald-400 tracking-tight">
                      ₹ {data.costs_and_safety.total_cost_crores} Crores
                    </span>
                  </div>

                  {/* Cost breakdown progress items */}
                  <div className="space-y-3.5 mb-5">
                    {data.costs_and_safety.cost_breakdown.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between text-[10px] font-bold tracking-wider mb-1">
                          <span className="text-slate-400">{item.item}</span>
                          <span className="text-white font-mono">{item.percentage}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline / built-up square footage metrics */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                  <div className="bg-slate-950/60 border border-white/5 p-2.5 rounded-xl text-center">
                    <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                      Total Built Area
                    </span>
                    <span className="text-sm font-bold text-white font-mono">
                      {data.costs_and_safety.built_up_area_sqft} SQ FT
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-white/5 p-2.5 rounded-xl text-center">
                    <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                      Estimated Build Duration
                    </span>
                    <span className="text-sm font-bold text-white font-mono">
                      {data.costs_and_safety.timeline_months} Months
                    </span>
                  </div>
                </div>
              </div>

              {/* Structural Integrity Diagnostic Block */}
              <div className="glass-panel p-6 rounded-2xl glow-indigo border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Hammer className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-xs font-bold tracking-wider uppercase text-white">
                        Structural Engineering AI
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                      <BadgeCheck className="w-3.5 h-3.5 text-indigo-400" />
                      SAFE DESIGN
                    </span>
                  </div>

                  {/* Structural diagnostics scores */}
                  <div className="space-y-4 mb-5">
                    
                    {/* Load distribution */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold tracking-wider mb-1">
                        <span className="text-slate-400">Load Distribution Balance</span>
                        <span className="text-cyan-400 font-mono">{data.costs_and_safety.safety_metrics.load_distribution}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500 rounded-full" 
                          style={{ width: `${data.costs_and_safety.safety_metrics.load_distribution}%` }}
                        />
                      </div>
                    </div>

                    {/* Beam stress */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold tracking-wider mb-1">
                        <span className="text-slate-400">Critical Beam Stress Ratio (S/R)</span>
                        <span className="text-pink-400 font-mono">{data.costs_and_safety.safety_metrics.beam_stress_ratio}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-pink-500 rounded-full" 
                          style={{ width: `${data.costs_and_safety.safety_metrics.beam_stress_ratio * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Vaastu compliance score */}
                    {data.costs_and_safety.safety_metrics.vaastu_compliance !== undefined && (
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold tracking-wider mb-1">
                          <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: "10s" }} />
                            Vaastu Shastra Compliance
                          </span>
                          <span className="text-emerald-400 font-mono font-bold">{data.costs_and_safety.safety_metrics.vaastu_compliance}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${data.costs_and_safety.safety_metrics.vaastu_compliance}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Earthquake safety */}
                    <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-white/5 text-xs font-semibold">
                      <span className="text-slate-400">Earthquake Resistance (Richter scale)</span>
                      <span className="text-white font-mono font-bold">Grade {data.costs_and_safety.safety_metrics.earthquake_resilience} Max</span>
                    </div>

                    {/* Fire rating */}
                    <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-white/5 text-xs font-semibold">
                      <span className="text-slate-400">Firewall Retardant Rating</span>
                      <span className="text-white font-mono font-bold">{data.costs_and_safety.safety_metrics.fire_safety_rating_hours} Hour Duration</span>
                    </div>

                  </div>
                </div>

                {/* Materials Bill inventory list */}
                <div className="pt-3 border-t border-white/5">
                  <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 text-left">
                    Core Bill of Materials (BOM Inventory)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
                    {data.costs_and_safety.materials_inventory.map((mat, idx) => (
                      <div key={idx} className="flex justify-between bg-slate-900/40 p-2 rounded border border-white/5">
                        <span className="text-slate-400 truncate max-w-[130px]">{mat.material}</span>
                        <span className="text-white font-mono font-bold">{mat.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
