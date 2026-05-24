"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronRight, Cpu, Layers, Box, Sparkles } from "lucide-react";
import * as THREE from "three";

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Initialize Three.js Environment
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#030712", 0.015);

    const camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 8, 16);
    camera.lookAt(0, 1.5, 0);

    // 2. Add Ambient Lights & Glowing Points
    const ambientLight = new THREE.AmbientLight("#1e293b", 0.5);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight("#6366f1", 1.5);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight("#06b6d4", 1.0);
    dirLight2.position.set(-5, 5, -7);
    scene.add(dirLight2);

    // 3. Spawning Floor Grid
    const gridHelper = new THREE.GridHelper(30, 30, "#6366f1", "#1e293b");
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // 4. Create Procedural Wireframe Villa (Floating Geometry)
    const villaGroup = new THREE.Group();

    // Base Slab
    const slabGeo = new THREE.BoxGeometry(6, 0.2, 8);
    const slabMat = new THREE.MeshPhongMaterial({
      color: "#0f172a",
      emissive: "#1e1b4b",
      flatShading: true,
      shininess: 100,
    });
    const baseSlab = new THREE.Mesh(slabGeo, slabMat);
    baseSlab.position.y = -0.4;
    villaGroup.add(baseSlab);

    // Exterior wireframes helper to draw glowing neon lines
    const wireframeMat = new THREE.LineBasicMaterial({
      color: "#6366f1",
      linewidth: 1.5,
    });
    const secondaryWireframeMat = new THREE.LineBasicMaterial({
      color: "#06b6d4",
      linewidth: 1.0,
    });

    // Floor volumes (boxes)
    const box1Geo = new THREE.BoxGeometry(5, 2.5, 7);
    const box1Edges = new THREE.EdgesGeometry(box1Geo);
    const box1Wire = new THREE.LineSegments(box1Edges, wireframeMat);
    box1Wire.position.y = 0.9;
    villaGroup.add(box1Wire);

    const box2Geo = new THREE.BoxGeometry(4.5, 2.2, 5);
    const box2Edges = new THREE.EdgesGeometry(box2Geo);
    const box2Wire = new THREE.LineSegments(box2Edges, secondaryWireframeMat);
    box2Wire.position.set(0.2, 3.25, -0.5);
    villaGroup.add(box2Wire);

    // Roof planes
    const roof1Geo = new THREE.ConeGeometry(3.5, 1.5, 4);
    const roof1Edges = new THREE.EdgesGeometry(roof1Geo);
    const roof1Wire = new THREE.LineSegments(roof1Edges, wireframeMat);
    roof1Wire.rotation.y = Math.PI / 4;
    roof1Wire.position.set(0.2, 5.1, -0.5);
    villaGroup.add(roof1Wire);

    // Columns
    const colGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8);
    const colMat = new THREE.MeshPhongMaterial({ color: "#334155" });
    const colOffsets = [
      [-2.4, -3.4],
      [2.4, -3.4],
      [-2.4, 3.4],
      [2.4, 3.4],
    ];
    colOffsets.forEach(([cx, cz]) => {
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(cx, 0.9, cz);
      villaGroup.add(col);
    });

    scene.add(villaGroup);

    // 5. Add Volumetric Floating Particle Sparkles
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 250;
    const posArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 35;
    }

    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(posArray, 3)
    );

    const particleMat = new THREE.PointsMaterial({
      size: 0.05,
      color: "#22d3ee",
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 6. Responsive Resize Handler
    const handleResize = () => {
      if (!canvas) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    window.addEventListener("resize", handleResize);

    // 7. Animation Loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Spin structure elegantly
      villaGroup.rotation.y = elapsedTime * 0.15;
      villaGroup.rotation.x = Math.sin(elapsedTime * 0.4) * 0.05;
      
      // Floating translation
      villaGroup.position.y = Math.sin(elapsedTime * 0.8) * 0.15;

      // Slow drift particles
      particles.rotation.y = elapsedTime * -0.05;
      particles.rotation.x = elapsedTime * 0.02;

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      scene.clear();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-background">
      {/* 3D Background Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      />

      {/* Header Panel */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 border-b border-white/5 bg-slate-950/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/40">
            N
          </div>
          <span className="text-xl font-bold tracking-widest text-white">
            NEO<span className="text-indigo-400">ARCHITECT</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span className="hidden sm:inline text-xs text-slate-400 tracking-wider font-semibold">
            V1.0 MVP
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI SERVER ONLINE
          </span>
        </div>
      </header>

      {/* Main Hero Card */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-6 py-12 md:py-24">
        <div className="max-w-xl w-full text-center glass-panel p-8 md:p-12 rounded-2xl glow-indigo border border-white/10 relative overflow-hidden">
          {/* Decorative glows */}
          <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: "8s" }} />
            Generative AI Studio
          </span>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none text-white mb-6">
            THE FUTURE OF <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              DIGITAL CREATION
            </span>
          </h1>

          <p className="text-sm md:text-base text-slate-300 font-medium leading-relaxed mb-8 max-w-md mx-auto">
            Design your dream structure in seconds. Input natural language requirements, auto-compile 2D SVG plans, extrude real-time 3D meshes, and render cinematic CGI visuals.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm tracking-wide shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:from-indigo-500 hover:to-purple-500 active:scale-95 transition-all flex items-center justify-center gap-2 group"
            >
              Enter Design Studio
              <ChevronRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer / Steps grid */}
      <footer className="relative z-10 px-6 md:px-12 py-8 bg-slate-950/40 border-t border-white/5 backdrop-blur-md">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
          <div className="flex gap-3">
            <div className="p-2 h-fit rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide uppercase mb-1">
                1. Requirement NLP
              </h4>
              <p className="text-[10px] text-slate-400 leading-snug">
                Extracts rooms, budget, styles and features from free-text blocks.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="p-2 h-fit rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide uppercase mb-1">
                2. SVG Layouts
              </h4>
              <p className="text-[10px] text-slate-400 leading-snug">
                Procedurally allocates spaces, furniture layers, and swing arcs.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="p-2 h-fit rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide uppercase mb-1">
                3. Real-time 3D
              </h4>
              <p className="text-[10px] text-slate-400 leading-snug">
                Extrudes structural coordinates into orbitable building meshes.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="p-2 h-fit rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide uppercase mb-1">
                4. Cinematic CGI
              </h4>
              <p className="text-[10px] text-slate-400 leading-snug">
                Procedural lightning simulators mimic path-traced camera renders.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
