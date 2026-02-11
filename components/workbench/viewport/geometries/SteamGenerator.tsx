"use client";

import React from "react";
import { ThreeEvent } from "@react-three/fiber";
import { COLORS } from "../../../../lib/workbench/theme";
import { useSelectionHighlight } from "../hooks/useSelectionHighlight";

interface SteamGeneratorProps {
  sgId: "sg-a" | "sg-b";
  position: [number, number, number];
  selected?: boolean;
  onSelect?: (id: string) => void;
}

const SG_RADIUS = 1.0;
const SG_HEIGHT = 6;
const UTUBE_RADIUS = 0.8;
const UTUBE_TUBE_RADIUS = 0.08;

function SteamGenerator({
  sgId,
  position,
  selected = false,
  onSelect,
}: SteamGeneratorProps) {
  const matRef = useSelectionHighlight(selected);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect?.(sgId);
  };

  // U-tube arc rotation: face toward vessel center (origin)
  const utubeRotY = Math.atan2(-position[0], -position[2]);

  return (
    <group position={position} onClick={handleClick}>
      {/* SG body shell */}
      <mesh>
        <cylinderGeometry args={[SG_RADIUS, SG_RADIUS, SG_HEIGHT, 24, 1]} />
        <meshStandardMaterial
          ref={matRef}
          color={COLORS.metalMedium}
          metalness={0.8}
          roughness={0.35}
          emissive={COLORS.highlightEmissive}
          emissiveIntensity={0}
        />
      </mesh>

      {/* Top dome cap */}
      <mesh position={[0, SG_HEIGHT / 2, 0]}>
        <sphereGeometry
          args={[SG_RADIUS, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial
          color={COLORS.metalMedium}
          metalness={0.8}
          roughness={0.35}
          emissive={COLORS.highlightEmissive}
          emissiveIntensity={selected ? 0.3 : 0}
        />
      </mesh>

      {/* Bottom dome cap */}
      <mesh position={[0, -SG_HEIGHT / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry
          args={[SG_RADIUS, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial
          color={COLORS.metalMedium}
          metalness={0.8}
          roughness={0.35}
          emissive={COLORS.highlightEmissive}
          emissiveIntensity={selected ? 0.3 : 0}
        />
      </mesh>

      {/* U-tube bundle (simplified as a single torus arc) */}
      <mesh
        position={[0, -SG_HEIGHT / 2 + 0.4, 0]}
        rotation={[0, utubeRotY, Math.PI / 2]}
      >
        <torusGeometry args={[UTUBE_RADIUS, UTUBE_TUBE_RADIUS, 12, 24, Math.PI]} />
        <meshStandardMaterial
          color="#7a7a7a"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Steam outlet nozzle (top) */}
      <mesh position={[0, SG_HEIGHT / 2 + SG_RADIUS * 0.5 + 0.2, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.4, 12, 1]} />
        <meshStandardMaterial
          color="#555555"
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

export default React.memo(SteamGenerator);
