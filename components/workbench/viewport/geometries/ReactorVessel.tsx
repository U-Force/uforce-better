"use client";

import React from "react";
import { ThreeEvent } from "@react-three/fiber";
import { COLORS } from "../../../../lib/workbench/theme";
import { useSelectionHighlight } from "../hooks/useSelectionHighlight";

interface ReactorVesselProps {
  selected?: boolean;
  onSelect?: (id: string) => void;
}

const VESSEL_RADIUS = 1.8;
const VESSEL_HEIGHT = 8;
const CAP_RADIUS = VESSEL_RADIUS;
const CRDM_COUNT = 5;
const CRDM_RADIUS = 0.08;
const CRDM_HEIGHT = 0.6;
const CRDM_RING_RADIUS = 0.9;

function ReactorVessel({ selected = false, onSelect }: ReactorVesselProps) {
  const bodyMatRef = useSelectionHighlight(selected);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect?.("vessel");
  };

  // Precompute CRDM positions
  const crdmPositions: [number, number, number][] = [];
  for (let i = 0; i < CRDM_COUNT; i++) {
    const angle = (i / CRDM_COUNT) * Math.PI * 2;
    crdmPositions.push([
      Math.cos(angle) * CRDM_RING_RADIUS,
      VESSEL_HEIGHT / 2 + CAP_RADIUS * 0.6 + CRDM_HEIGHT / 2,
      Math.sin(angle) * CRDM_RING_RADIUS,
    ]);
  }

  return (
    <group onClick={handleClick}>
      {/* Vessel body cylinder */}
      <mesh>
        <cylinderGeometry args={[VESSEL_RADIUS, VESSEL_RADIUS, VESSEL_HEIGHT, 32, 1]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color={COLORS.metalDark}
          metalness={0.85}
          roughness={0.3}
          emissive={COLORS.highlightEmissive}
          emissiveIntensity={0}
        />
      </mesh>

      {/* Top hemispherical cap (vessel head) */}
      <mesh position={[0, VESSEL_HEIGHT / 2, 0]}>
        <sphereGeometry
          args={[CAP_RADIUS, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial
          color={COLORS.metalDark}
          metalness={0.85}
          roughness={0.3}
          emissive={COLORS.highlightEmissive}
          emissiveIntensity={selected ? 0.3 : 0}
        />
      </mesh>

      {/* Bottom hemispherical cap */}
      <mesh position={[0, -VESSEL_HEIGHT / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry
          args={[CAP_RADIUS, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial
          color={COLORS.metalDark}
          metalness={0.85}
          roughness={0.3}
          emissive={COLORS.highlightEmissive}
          emissiveIntensity={selected ? 0.3 : 0}
        />
      </mesh>

      {/* CRDM housing nubs on vessel head */}
      {crdmPositions.map((pos, i) => (
        <mesh key={`crdm-${i}`} position={pos}>
          <cylinderGeometry args={[CRDM_RADIUS, CRDM_RADIUS, CRDM_HEIGHT, 8, 1]} />
          <meshStandardMaterial
            color={COLORS.metalMedium}
            metalness={0.9}
            roughness={0.25}
          />
        </mesh>
      ))}

      {/* Center CRDM nub */}
      <mesh
        position={[
          0,
          VESSEL_HEIGHT / 2 + CAP_RADIUS * 0.85 + CRDM_HEIGHT / 2,
          0,
        ]}
      >
        <cylinderGeometry args={[CRDM_RADIUS, CRDM_RADIUS, CRDM_HEIGHT, 8, 1]} />
        <meshStandardMaterial
          color={COLORS.metalMedium}
          metalness={0.9}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}

export default React.memo(ReactorVessel);
