"use client";

import React, { useRef } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "../../../../lib/workbench/theme";
import { useSelectionHighlight } from "../hooks/useSelectionHighlight";

interface CoolantPumpProps {
  pumpOn: boolean;
  position?: [number, number, number];
  selected?: boolean;
  onSelect?: (id: string) => void;
}

const PUMP_RADIUS = 0.45;
const PUMP_HEIGHT = 0.9;
const IMPELLER_RADIUS = 0.35;
const BLADE_COUNT = 6;

function CoolantPump({
  pumpOn,
  position = [4, -2, 0],
  selected = false,
  onSelect,
}: CoolantPumpProps) {
  const impellerRef = useRef<THREE.Group>(null);
  const bodyMatRef = useSelectionHighlight(selected, 0.25);
  const currentSpeed = useRef(0);

  useFrame((_, delta) => {
    // Smooth spin-up / spin-down
    const targetSpeed = pumpOn ? 4.0 : 0;
    currentSpeed.current = THREE.MathUtils.lerp(
      currentSpeed.current,
      targetSpeed,
      pumpOn ? 0.03 : 0.015
    );

    if (impellerRef.current) {
      impellerRef.current.rotation.y += currentSpeed.current * delta;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect?.("pump");
  };

  // Precompute blade rotations
  const bladeAngles: number[] = [];
  for (let i = 0; i < BLADE_COUNT; i++) {
    bladeAngles.push((i / BLADE_COUNT) * Math.PI * 2);
  }

  return (
    <group position={position} onClick={handleClick}>
      {/* Pump casing */}
      <mesh>
        <cylinderGeometry args={[PUMP_RADIUS, PUMP_RADIUS, PUMP_HEIGHT, 20, 1]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color="#505050"
          metalness={0.85}
          roughness={0.3}
          emissive={COLORS.highlightEmissive}
          emissiveIntensity={0}
        />
      </mesh>

      {/* Impeller assembly (spins) */}
      <group ref={impellerRef} position={[0, 0.1, 0]}>
        {/* Central hub */}
        <mesh>
          <cylinderGeometry args={[0.08, 0.08, 0.15, 12, 1]} />
          <meshStandardMaterial
            color={COLORS.metalLight}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Impeller blades */}
        {bladeAngles.map((angle, i) => (
          <mesh
            key={`blade-${i}`}
            position={[
              Math.cos(angle) * IMPELLER_RADIUS * 0.5,
              0.12,
              Math.sin(angle) * IMPELLER_RADIUS * 0.5,
            ]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[IMPELLER_RADIUS * 0.7, 0.03, 0.06]} />
            <meshStandardMaterial
              color="#999999"
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
        ))}
      </group>

      {/* Inlet nozzle */}
      <mesh position={[0, -PUMP_HEIGHT / 2 - 0.2, 0]}>
        <cylinderGeometry args={[0.15, 0.12, 0.4, 12, 1]} />
        <meshStandardMaterial
          color="#454545"
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>

      {/* Outlet nozzle (side discharge) */}
      <mesh
        position={[PUMP_RADIUS + 0.15, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.12, 0.12, 0.3, 12, 1]} />
        <meshStandardMaterial
          color="#454545"
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

export default React.memo(CoolantPump);
