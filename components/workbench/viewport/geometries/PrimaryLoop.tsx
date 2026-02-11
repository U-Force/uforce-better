"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "../../../../lib/workbench/theme";

interface PrimaryLoopProps {
  /** Coolant temperature normalized 0-1 (0=cold ~290C, 1=hot ~330C) */
  coolantTemp: number;
  /** Flow speed multiplier; 0 when pump is off */
  flowSpeed: number;
  /** Steam generator A position */
  sgAPosition?: [number, number, number];
  /** Steam generator B position */
  sgBPosition?: [number, number, number];
}

const PIPE_RADIUS = 0.12;
const PIPE_SEGMENTS = 8;
const COLD_COLOR = new THREE.Color(COLORS.pipeCold);
const HOT_COLOR = new THREE.Color(COLORS.pipeHot);

/** Build a CatmullRomCurve3 from an array of [x,y,z] tuples */
function makeCurve(points: [number, number, number][]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    "catmullrom",
    0.5
  );
}

function PrimaryLoop({
  coolantTemp,
  flowSpeed,
  sgAPosition = [6, 0, 0],
  sgBPosition = [-6, 0, 0],
}: PrimaryLoopProps) {
  const hotLegARef = useRef<THREE.MeshStandardMaterial>(null);
  const hotLegBRef = useRef<THREE.MeshStandardMaterial>(null);
  const coldLegARef = useRef<THREE.MeshStandardMaterial>(null);
  const coldLegBRef = useRef<THREE.MeshStandardMaterial>(null);
  const currentColor = useMemo(() => new THREE.Color(), []);
  const phaseRef = useRef(0);

  // Hot leg curves: vessel -> SG
  const hotLegACurve = useMemo(() => {
    const [sx, sy, sz] = sgAPosition;
    return makeCurve([
      [1.8, 1.0, 0],
      [3.0, 1.5, 0],
      [sx - 1.0, sy + 1.0, sz],
      [sx, sy, sz],
    ]);
  }, [sgAPosition]);

  const hotLegBCurve = useMemo(() => {
    const [sx, sy, sz] = sgBPosition;
    return makeCurve([
      [-1.8, 1.0, 0],
      [-3.0, 1.5, 0],
      [sx + 1.0, sy + 1.0, sz],
      [sx, sy, sz],
    ]);
  }, [sgBPosition]);

  // Cold leg curves: SG -> vessel (return through bottom)
  const coldLegACurve = useMemo(() => {
    const [sx, sy, sz] = sgAPosition;
    return makeCurve([
      [sx, sy - 2.0, sz],
      [sx - 1.0, sy - 2.5, sz],
      [3.0, -2.0, 0],
      [1.8, -1.5, 0],
    ]);
  }, [sgAPosition]);

  const coldLegBCurve = useMemo(() => {
    const [sx, sy, sz] = sgBPosition;
    return makeCurve([
      [sx, sy - 2.0, sz],
      [sx + 1.0, sy - 2.5, sz],
      [-3.0, -2.0, 0],
      [-1.8, -1.5, 0],
    ]);
  }, [sgBPosition]);

  // Tube geometries
  const hotLegAGeo = useMemo(
    () => new THREE.TubeGeometry(hotLegACurve, 32, PIPE_RADIUS, PIPE_SEGMENTS, false),
    [hotLegACurve]
  );
  const hotLegBGeo = useMemo(
    () => new THREE.TubeGeometry(hotLegBCurve, 32, PIPE_RADIUS, PIPE_SEGMENTS, false),
    [hotLegBCurve]
  );
  const coldLegAGeo = useMemo(
    () => new THREE.TubeGeometry(coldLegACurve, 32, PIPE_RADIUS, PIPE_SEGMENTS, false),
    [coldLegACurve]
  );
  const coldLegBGeo = useMemo(
    () => new THREE.TubeGeometry(coldLegBCurve, 32, PIPE_RADIUS, PIPE_SEGMENTS, false),
    [coldLegBCurve]
  );

  useFrame((_, delta) => {
    const t = THREE.MathUtils.clamp(coolantTemp, 0, 1);

    // Animate phase for emissive pulsing to indicate flow
    phaseRef.current += delta * flowSpeed * 3.0;

    // Pulsing emissive intensity to indicate flowing coolant
    const pulse = flowSpeed > 0
      ? 0.15 + 0.1 * Math.sin(phaseRef.current)
      : 0.05;

    // Compute hot and cold leg colors
    const hotColor = currentColor.copy(COLD_COLOR).lerp(HOT_COLOR, t);
    const coldT = Math.max(t - 0.15, 0); // cold leg is slightly cooler
    const coldColor = new THREE.Color().copy(COLD_COLOR).lerp(HOT_COLOR, coldT);

    const refs = [
      { ref: hotLegARef, color: hotColor },
      { ref: hotLegBRef, color: hotColor },
      { ref: coldLegARef, color: coldColor },
      { ref: coldLegBRef, color: coldColor },
    ];

    for (const { ref, color } of refs) {
      if (ref.current) {
        ref.current.color.copy(color);
        ref.current.emissive.copy(color);
        ref.current.emissiveIntensity = pulse;
      }
    }
  });

  return (
    <group>
      {/* Hot leg A: vessel -> SG-A */}
      <mesh geometry={hotLegAGeo}>
        <meshStandardMaterial
          ref={hotLegARef}
          color={COLORS.pipeHot}
          metalness={0.6}
          roughness={0.4}
          emissive={COLORS.pipeHot}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Hot leg B: vessel -> SG-B */}
      <mesh geometry={hotLegBGeo}>
        <meshStandardMaterial
          ref={hotLegBRef}
          color={COLORS.pipeHot}
          metalness={0.6}
          roughness={0.4}
          emissive={COLORS.pipeHot}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Cold leg A: SG-A -> vessel */}
      <mesh geometry={coldLegAGeo}>
        <meshStandardMaterial
          ref={coldLegARef}
          color={COLORS.pipeCold}
          metalness={0.6}
          roughness={0.4}
          emissive={COLORS.pipeCold}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Cold leg B: SG-B -> vessel */}
      <mesh geometry={coldLegBGeo}>
        <meshStandardMaterial
          ref={coldLegBRef}
          color={COLORS.pipeCold}
          metalness={0.6}
          roughness={0.4}
          emissive={COLORS.pipeCold}
          emissiveIntensity={0.1}
        />
      </mesh>
    </group>
  );
}

export default React.memo(PrimaryLoop);
