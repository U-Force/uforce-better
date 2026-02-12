"use client";

import React, { useRef } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "../../../../lib/workbench/theme";
import { useSelectionHighlight } from "../hooks/useSelectionHighlight";

interface FeedwaterPumpProps {
  pumpId: string;
  position: [number, number, number];
  pumpOn: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

const PUMP_R = 0.65;
const PUMP_H = 1.2;
const MOTOR_R = 0.4;
const MOTOR_H = 0.85;

function FeedwaterPump({
  pumpId,
  position,
  pumpOn,
  selected = false,
  onSelect,
}: FeedwaterPumpProps) {
  const impellerRef = useRef<THREE.Mesh>(null);
  const bodyMatRef = useSelectionHighlight(selected, 0.25);
  const currentSpeed = useRef(0);

  useFrame((_, delta) => {
    const targetSpeed = pumpOn ? 3.0 : 0;
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
    onSelect?.(pumpId);
  };

  return (
    <group position={position} onClick={handleClick}>
      {/* Pump casing */}
      <mesh>
        <cylinderGeometry args={[PUMP_R, PUMP_R, PUMP_H, 16, 1]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color="#505050"
          metalness={0.85}
          roughness={0.3}
          emissive={COLORS.highlightEmissive}
          emissiveIntensity={0}
        />
      </mesh>

      {/* Motor */}
      <mesh position={[0, PUMP_H / 2 + MOTOR_H / 2 + 0.03, 0]}>
        <cylinderGeometry args={[MOTOR_R, MOTOR_R, MOTOR_H, 12, 1]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.35} />
      </mesh>

      {/* Spinning impeller disc */}
      <mesh ref={impellerRef} position={[0, 0.05, 0]}>
        <cylinderGeometry args={[PUMP_R * 0.7, PUMP_R * 0.7, 0.05, 8, 1]} />
        <meshStandardMaterial color={COLORS.metalLight} metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

export default React.memo(FeedwaterPump);
