"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "../../../../lib/workbench/theme";

interface CoreRegionProps {
  /** Normalized reactor power, 0 to 1 */
  power: number;
}

const CORE_RADIUS = 1.2;
const CORE_HEIGHT = 4;

// Power-to-color mapping thresholds
const COLOR_LOW = new THREE.Color(COLORS.coreGlowLow); // dim blue
const COLOR_MID = new THREE.Color(COLORS.coreGlowMid); // blue-purple
const COLOR_HIGH = new THREE.Color(COLORS.coreGlowHigh); // bright orange-red

const EMISSIVE_LOW = 0.1;
const EMISSIVE_MID = 0.5;
const EMISSIVE_HIGH = 2.0;

function CoreRegion({ power }: CoreRegionProps) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const currentColor = useMemo(() => new THREE.Color(COLORS.coreGlowLow), []);
  const targetColor = useMemo(() => new THREE.Color(), []);
  const currentIntensity = useRef(EMISSIVE_LOW);

  useFrame(() => {
    if (!matRef.current) return;

    const p = THREE.MathUtils.clamp(power, 0, 1);

    // Compute target color and intensity based on power level
    let targetIntensity: number;

    if (p < 0.5) {
      // Low to medium: lerp between blue and purple
      const t = p / 0.5;
      targetColor.copy(COLOR_LOW).lerp(COLOR_MID, t);
      targetIntensity = THREE.MathUtils.lerp(EMISSIVE_LOW, EMISSIVE_MID, t);
    } else {
      // Medium to high: lerp between purple and orange-red
      const t = (p - 0.5) / 0.5;
      targetColor.copy(COLOR_MID).lerp(COLOR_HIGH, t);
      targetIntensity = THREE.MathUtils.lerp(EMISSIVE_MID, EMISSIVE_HIGH, t);
    }

    // Smooth interpolation
    currentColor.lerp(targetColor, 0.04);
    currentIntensity.current = THREE.MathUtils.lerp(
      currentIntensity.current,
      targetIntensity,
      0.04
    );

    matRef.current.emissive.copy(currentColor);
    matRef.current.emissiveIntensity = currentIntensity.current;
    matRef.current.color.copy(currentColor).multiplyScalar(0.3);
  });

  return (
    <mesh>
      <cylinderGeometry args={[CORE_RADIUS, CORE_RADIUS, CORE_HEIGHT, 24, 1]} />
      <meshStandardMaterial
        ref={matRef}
        color={COLORS.coreGlowLow}
        emissive={COLORS.coreGlowLow}
        emissiveIntensity={EMISSIVE_LOW}
        metalness={0.1}
        roughness={0.6}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

export default React.memo(CoreRegion);
