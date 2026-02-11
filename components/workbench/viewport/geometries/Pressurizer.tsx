"use client";

import React, { useRef } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "../../../../lib/workbench/theme";
import { useSelectionHighlight } from "../hooks/useSelectionHighlight";

interface PressurizerProps {
  /** Normalized heater power 0-1, drives bottom glow */
  power?: number;
  selected?: boolean;
  onSelect?: (id: string) => void;
  position?: [number, number, number];
}

const PZR_RADIUS = 0.5;
const PZR_HEIGHT = 3.5;
const SURGE_RADIUS = 0.1;
const SURGE_LENGTH = 2.5;
const HEATER_COLOR = new THREE.Color("#ff4400");

function Pressurizer({
  power = 0,
  selected = false,
  onSelect,
  position = [3.5, 2, 0],
}: PressurizerProps) {
  const bodyMatRef = useSelectionHighlight(selected, 0.25);
  const heaterMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const currentHeaterIntensity = useRef(0);

  useFrame(() => {
    // Heater glow driven by power
    if (heaterMatRef.current) {
      const p = THREE.MathUtils.clamp(power, 0, 1);
      const targetIntensity = p * 1.5;
      currentHeaterIntensity.current = THREE.MathUtils.lerp(
        currentHeaterIntensity.current,
        targetIntensity,
        0.05
      );
      heaterMatRef.current.emissiveIntensity = currentHeaterIntensity.current;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect?.("pressurizer");
  };

  return (
    <group position={position} onClick={handleClick}>
      {/* Pressurizer body */}
      <mesh>
        <cylinderGeometry args={[PZR_RADIUS, PZR_RADIUS, PZR_HEIGHT, 20, 1]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color="#3d3d3d"
          metalness={0.85}
          roughness={0.3}
          emissive={COLORS.highlightEmissive}
          emissiveIntensity={0}
        />
      </mesh>

      {/* Top dome */}
      <mesh position={[0, PZR_HEIGHT / 2, 0]}>
        <sphereGeometry
          args={[PZR_RADIUS, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial
          color="#3d3d3d"
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>

      {/* Bottom dome */}
      <mesh position={[0, -PZR_HEIGHT / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry
          args={[PZR_RADIUS, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial
          color="#3d3d3d"
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>

      {/* Heater element glow region at bottom */}
      <mesh position={[0, -PZR_HEIGHT / 2 + 0.3, 0]}>
        <cylinderGeometry args={[PZR_RADIUS * 0.75, PZR_RADIUS * 0.75, 0.5, 16, 1]} />
        <meshStandardMaterial
          ref={heaterMatRef}
          color="#331100"
          emissive={HEATER_COLOR}
          emissiveIntensity={0}
          metalness={0.3}
          roughness={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Surge line (angled cylinder connecting pressurizer bottom to hot leg) */}
      <mesh
        position={[-0.8, -PZR_HEIGHT / 2 - 0.8, 0]}
        rotation={[0, 0, Math.PI / 4]}
      >
        <cylinderGeometry args={[SURGE_RADIUS, SURGE_RADIUS, SURGE_LENGTH, 8, 1]} />
        <meshStandardMaterial
          color="#505050"
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>

      {/* Relief valve nozzle on top */}
      <mesh position={[0, PZR_HEIGHT / 2 + PZR_RADIUS * 0.5 + 0.15, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.3, 8, 1]} />
        <meshStandardMaterial
          color="#555555"
          metalness={0.9}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}

export default React.memo(Pressurizer);
