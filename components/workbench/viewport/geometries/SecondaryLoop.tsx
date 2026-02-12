"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "../../../../lib/workbench/theme";
import { LOOPS, SG, PIPING, TURBINE_ISLAND as TI } from "../layout";
import FeedwaterPump from "./FeedwaterPump";

interface SecondaryLoopProps {
  power: number;
  pumpOn: boolean;
  selectedComponent: string | null;
  onSelect: (id: string) => void;
}

function makeCurve(points: [number, number, number][]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    "catmullrom",
    0.5
  );
}

const STEAM_COLOR = new THREE.Color(COLORS.steamLine);
const FW_COLOR = new THREE.Color(COLORS.feedwater);

function SecondaryLoop({ power, pumpOn, selectedComponent, onSelect }: SecondaryLoopProps) {
  const steamRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([null, null, null, null]);
  const fwRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([null, null, null, null]);
  const phaseRef = useRef(0);

  // SG top → common header → HP turbine inlet (endpoint extends INTO HP casing to avoid gaps)
  const sgTopY = SG.lowerHeight / 2 + SG.coneHeight + SG.upperHeight + SG.upperRadius * 0.5 + 0.4;
  const hpWorldX = TI.position[0] + TI.hp.offset[0];
  const hpWorldY = TI.position[1] + TI.hp.offset[1];
  const hpWorldZ = TI.position[2] + TI.hp.offset[2];
  const turbineInlet: [number, number, number] = [
    hpWorldX,  // extend into center of HP turbine for solid visual connection
    hpWorldY,
    hpWorldZ,
  ];

  // Feedwater return: Condenser → Condensate Pump → Main FW Pump → branch to SGs
  const condenserWorldX = TI.position[0] + TI.condenser.offset[0];
  const condenserWorldY = TI.position[1] + TI.condenser.offset[1];
  const condenserWorldZ = TI.position[2] + TI.condenser.offset[2];
  const condFaceX = condenserWorldX - TI.condenser.width / 2;

  // Pump positions ON the feedwater pipe path
  const condensatePumpPos: [number, number, number] = [
    condFaceX - 1.2,       // just outside condenser -X face
    condenserWorldY,
    condenserWorldZ,
  ];
  const feedPumpPos: [number, number, number] = [
    17,                     // between condenser and containment boundary
    condenserWorldY + 0.5,
    0,                      // centered in Z (common header before branching)
  ];

  const { steamGeos, fwGeos } = useMemo(() => {
    const sGeos: THREE.TubeGeometry[] = [];
    const fGeos: THREE.TubeGeometry[] = [];

    for (const loop of LOOPS) {
      const [sx, , sz] = loop.sgPosition;

      // Steam line: SG top → rise above containment → descend to HP turbine
      const steamCurve = makeCurve([
        [sx, sgTopY, sz],
        [sx * 0.4, sgTopY + 2.5, sz * 0.3],
        [hpWorldX * 0.45, sgTopY + 1.5, hpWorldZ * 0.2],
        [hpWorldX - 4, 4, hpWorldZ],
        [hpWorldX - TI.hp.radius, hpWorldY, hpWorldZ],
        turbineInlet,
      ]);
      sGeos.push(new THREE.TubeGeometry(steamCurve, 64, PIPING.steamLineRadius, PIPING.segments, false));

      // Feedwater line: Condenser → Condensate Pump → Main FW Pump → SG
      const sgMidY = SG.lowerHeight / 2 + SG.coneHeight * 0.5;
      const fwCurve = makeCurve([
        [condenserWorldX, condenserWorldY, condenserWorldZ],
        condensatePumpPos,
        feedPumpPos,
        [sx * 0.5 + 2, sgMidY - 2, sz * 0.5],
        [sx, sgMidY, sz],
      ]);
      fGeos.push(new THREE.TubeGeometry(fwCurve, 64, PIPING.feedwaterRadius, PIPING.segments, false));
    }

    return { steamGeos: sGeos, fwGeos: fGeos };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sgTopY, hpWorldX, hpWorldY, hpWorldZ, condenserWorldX, condenserWorldY, condenserWorldZ,
      condFaceX, condensatePumpPos[0], feedPumpPos[1]]);

  useFrame((_, delta) => {
    phaseRef.current += delta * power * 2.0;
    const pulse = power > 0.01 ? 0.1 + 0.08 * Math.sin(phaseRef.current) : 0.03;

    for (let i = 0; i < 4; i++) {
      const sRef = steamRefs.current[i];
      if (sRef) {
        sRef.emissiveIntensity = pulse;
      }
      const fRef = fwRefs.current[i];
      if (fRef) {
        fRef.emissiveIntensity = pulse * 0.8;
      }
    }
  });

  return (
    <group>
      {/* Steam lines from each SG to turbine */}
      {LOOPS.map((loop, i) => (
        <mesh key={`steam-${loop.id}`} geometry={steamGeos[i]}>
          <meshStandardMaterial
            ref={(el) => { steamRefs.current[i] = el; }}
            color={COLORS.steamLine}
            metalness={0.5}
            roughness={0.5}
            emissive={STEAM_COLOR}
            emissiveIntensity={0.05}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}

      {/* Feedwater lines from feed system back to each SG */}
      {LOOPS.map((loop, i) => (
        <mesh key={`fw-${loop.id}`} geometry={fwGeos[i]}>
          <meshStandardMaterial
            ref={(el) => { fwRefs.current[i] = el; }}
            color={COLORS.feedwater}
            metalness={0.6}
            roughness={0.4}
            emissive={FW_COLOR}
            emissiveIntensity={0.05}
          />
        </mesh>
      ))}

      {/* Condensate pump — right at condenser outlet on the feedwater line */}
      <FeedwaterPump
        pumpId="condensate-pump"
        position={condensatePumpPos}
        pumpOn={pumpOn && power > 0.01}
        selected={selectedComponent === "condensate-pump"}
        onSelect={onSelect}
      />

      {/* Main feedwater pump — on common header before branching to SGs */}
      <FeedwaterPump
        pumpId="feed-pump"
        position={feedPumpPos}
        pumpOn={pumpOn && power > 0.01}
        selected={selectedComponent === "feed-pump"}
        onSelect={onSelect}
      />
    </group>
  );
}

export default React.memo(SecondaryLoop);
