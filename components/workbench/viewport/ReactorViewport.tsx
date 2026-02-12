"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Stars } from "@react-three/drei";
import * as THREE from "three";
import PWRScene from "./PWRScene";
import { CAMERA, TURBINE_ISLAND as TI } from "./layout";
import type { SceneProps } from "./hooks/usePhysicsToScene";

interface ReactorViewportProps extends SceneProps {
  selectedComponent: string | null;
  onSelectComponent: (id: string | null) => void;
  showHotspots: boolean;
  toolMode: "select" | "pan" | "orbit";
}

function SceneContent(props: ReactorViewportProps) {
  const { toolMode, ...sceneProps } = props;
  return (
    <>
      {/* Lighting */}
      <hemisphereLight args={["#b1d8ff", "#7a7060", 0.35]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[15, 22, 10]} intensity={1.3} castShadow />
      <directionalLight position={[-12, 16, -10]} intensity={0.6} />
      <directionalLight position={[5, 3, 18]} intensity={0.3} />
      <pointLight position={[0, 2, 0]} intensity={0.6} color="#ff6f00" distance={8} />
      {/* Turbine area light */}
      <pointLight
        position={[TI.position[0], 8, TI.position[2]]}
        intensity={0.6}
        color="#ffffff"
        distance={20}
      />

      {/* Environment for reflections */}
      <Environment preset="city" />

      {/* Background stars */}
      <Stars radius={100} depth={50} count={800} factor={2.5} saturation={0} />

      {/* PWR Scene */}
      <PWRScene {...sceneProps} />

      {/* Camera Controls */}
      <OrbitControls
        makeDefault
        enablePan={toolMode === "pan"}
        enableRotate={toolMode === "orbit" || toolMode === "select"}
        enableZoom
        mouseButtons={{
          LEFT: toolMode === "pan" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        minDistance={CAMERA.minDistance}
        maxDistance={CAMERA.maxDistance}
        target={CAMERA.target}
      />
    </>
  );
}

export default function ReactorViewport(props: ReactorViewportProps) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas
        camera={{ position: CAMERA.position, fov: CAMERA.fov, near: 0.1, far: 300 }}
        style={{ background: "transparent" }}
        gl={{ antialias: true, alpha: true }}
        shadows
      >
        <Suspense fallback={null}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
