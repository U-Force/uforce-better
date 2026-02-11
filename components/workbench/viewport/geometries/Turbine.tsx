"use client";

import React, { useRef } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "../../../../lib/workbench/theme";
import { useSelectionHighlight } from "../hooks/useSelectionHighlight";

interface TurbineProps {
  /** Normalized power 0-1, drives blade rotation speed */
  power: number;
  position?: [number, number, number];
  selected?: boolean;
  onSelect?: (id: string) => void;
}

const BODY_RADIUS = 0.8;
const BODY_LENGTH = 2.5;
const BLADE_COUNT = 8;
const BLADE_INNER = 0.2;
const BLADE_OUTER = 0.7;
const DISC_COUNT = 3;

function Turbine({
  power,
  position = [10, 0, 0],
  selected = false,
  onSelect,
}: TurbineProps) {
  const rotorRef = useRef<THREE.Group>(null);
  const bodyMatRef = useSelectionHighlight(selected, 0.25);
  const currentSpeed = useRef(0);

  useFrame((_, delta) => {
    const p = THREE.MathUtils.clamp(power, 0, 1);
    const targetSpeed = p * 6.0; // max 6 rad/s visual speed

    // Smooth spin-up/spin-down
    currentSpeed.current = THREE.MathUtils.lerp(
      currentSpeed.current,
      targetSpeed,
      0.03
    );

    if (rotorRef.current) {
      // Rotor spins around the Z axis (shaft axis along Z for horizontal turbine)
      rotorRef.current.rotation.z += currentSpeed.current * delta;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect?.("turbine");
  };

  // Precompute blade angles
  const bladeAngles: number[] = [];
  for (let i = 0; i < BLADE_COUNT; i++) {
    bladeAngles.push((i / BLADE_COUNT) * Math.PI * 2);
  }

  // Disc positions along shaft
  const discPositions: number[] = [];
  for (let i = 0; i < DISC_COUNT; i++) {
    const t = (i / (DISC_COUNT - 1)) - 0.5; // -0.5 to 0.5
    discPositions.push(t * BODY_LENGTH * 0.7);
  }

  return (
    <group position={position} onClick={handleClick}>
      {/* Turbine casing (horizontal cylinder along Z) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[BODY_RADIUS, BODY_RADIUS, BODY_LENGTH, 24, 1]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color={COLORS.metalMedium}
          metalness={0.85}
          roughness={0.3}
          emissive={COLORS.highlightEmissive}
          emissiveIntensity={0}
        />
      </mesh>

      {/* End caps */}
      <mesh position={[0, 0, BODY_LENGTH / 2]}>
        <sphereGeometry
          args={[BODY_RADIUS, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial
          color={COLORS.metalMedium}
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0, -BODY_LENGTH / 2]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry
          args={[BODY_RADIUS, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial
          color={COLORS.metalMedium}
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>

      {/* Rotor assembly (spins) */}
      <group ref={rotorRef}>
        {/* Central shaft */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, BODY_LENGTH * 1.3, 8, 1]} />
          <meshStandardMaterial
            color="#aaaaaa"
            metalness={0.9}
            roughness={0.15}
          />
        </mesh>

        {/* Blade discs at intervals along shaft */}
        {discPositions.map((zPos, di) => (
          <group key={`disc-${di}`} position={[0, 0, zPos]}>
            {/* Disc hub */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[BLADE_INNER, BLADE_INNER, 0.04, 12, 1]} />
              <meshStandardMaterial
                color="#999999"
                metalness={0.9}
                roughness={0.2}
              />
            </mesh>

            {/* Blades radiating outward */}
            {bladeAngles.map((angle, bi) => (
              <mesh
                key={`blade-${di}-${bi}`}
                position={[
                  Math.cos(angle) * (BLADE_INNER + BLADE_OUTER) * 0.5,
                  Math.sin(angle) * (BLADE_INNER + BLADE_OUTER) * 0.5,
                  0,
                ]}
                rotation={[0, 0, angle]}
              >
                <boxGeometry
                  args={[BLADE_OUTER - BLADE_INNER, 0.08, 0.02]}
                />
                <meshStandardMaterial
                  color="#b0b0b0"
                  metalness={0.9}
                  roughness={0.2}
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Steam inlet pipe (top) */}
      <mesh position={[0, BODY_RADIUS + 0.3, -BODY_LENGTH * 0.3]}>
        <cylinderGeometry args={[0.12, 0.12, 0.6, 10, 1]} />
        <meshStandardMaterial
          color="#555555"
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>

      {/* Exhaust pipe (bottom) */}
      <mesh position={[0, -BODY_RADIUS - 0.3, BODY_LENGTH * 0.2]}>
        <cylinderGeometry args={[0.15, 0.18, 0.6, 10, 1]} />
        <meshStandardMaterial
          color="#555555"
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

export default React.memo(Turbine);
