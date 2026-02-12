"use client";

import React, { useRef, useMemo } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "../../../../lib/workbench/theme";
import { useSelectionHighlight } from "../hooks/useSelectionHighlight";
import { TURBINE_ISLAND as TI, PIPING } from "../layout";

interface TurbineIslandProps {
  power: number;
  selectedComponent: string | null;
  onSelect: (id: string) => void;
}

function TurbineIsland({ power, selectedComponent, onSelect }: TurbineIslandProps) {
  const rotorRef = useRef<THREE.Group>(null);
  const hpMatRef = useSelectionHighlight(selectedComponent === "hp-turbine", 0.25);
  const msrMatRef = useSelectionHighlight(selectedComponent === "msr", 0.25);
  const currentSpeed = useRef(0);

  useFrame((_, delta) => {
    const p = THREE.MathUtils.clamp(power, 0, 1);
    const targetSpeed = p * 6.0;
    currentSpeed.current = THREE.MathUtils.lerp(currentSpeed.current, targetSpeed, 0.03);

    if (rotorRef.current) {
      rotorRef.current.rotation.z += currentSpeed.current * delta;
    }
  });

  const bladeAngles: number[] = [];
  for (let i = 0; i < 8; i++) {
    bladeAngles.push((i / 8) * Math.PI * 2);
  }

  const handleClick = (id: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(id);
  };

  // Crossover piping: HP exhaust → MSR → LP1 inlet
  // Endpoints terminate INSIDE the MSR box so no overshoot is visible
  const { hpToMsrGeo, msrToLpGeo } = useMemo(() => {
    const hpExhaust: THREE.Vector3[] = [
      // HP +Z end (exhaust side)
      new THREE.Vector3(0, 0, TI.hp.offset[2] + TI.hp.length / 2),
      // Curve outward toward MSR
      new THREE.Vector3(TI.msr.offset[0] * 0.5, 0, TI.msr.offset[2] - TI.msr.depth / 2 - 0.3),
      // Inside MSR center (hidden by box)
      new THREE.Vector3(TI.msr.offset[0], TI.msr.offset[1], TI.msr.offset[2]),
    ];
    const msrToLp: THREE.Vector3[] = [
      // Inside MSR center (hidden by box)
      new THREE.Vector3(TI.msr.offset[0], TI.msr.offset[1], TI.msr.offset[2]),
      // Curve back toward turbine centerline
      new THREE.Vector3(TI.msr.offset[0] * 0.5, 0, TI.lp.offsets[0][2] - TI.lp.length / 2 - 0.3),
      // LP1 -Z end (inlet side)
      new THREE.Vector3(0, 0, TI.lp.offsets[0][2] - TI.lp.length / 2),
    ];
    const hpCurve = new THREE.CatmullRomCurve3(hpExhaust, false, "catmullrom", 0.5);
    const lpCurve = new THREE.CatmullRomCurve3(msrToLp, false, "catmullrom", 0.5);
    return {
      hpToMsrGeo: new THREE.TubeGeometry(hpCurve, 24, PIPING.steamLineRadius * 0.8, PIPING.segments, false),
      msrToLpGeo: new THREE.TubeGeometry(lpCurve, 24, PIPING.steamLineRadius * 0.8, PIPING.segments, false),
    };
  }, []);

  return (
    <group position={TI.position}>
      {/* Shared rotor assembly (spins all turbines) */}
      <group ref={rotorRef}>
        {/* Shaft from HP -Z end through to generator +Z end */}
        <mesh position={[0, 0, (TI.hp.offset[2] - TI.hp.length / 2 + TI.generator.offset[2] + TI.generator.length / 2) / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[TI.shaftRadius, TI.shaftRadius,
            (TI.generator.offset[2] + TI.generator.length / 2) - (TI.hp.offset[2] - TI.hp.length / 2),
            8, 1]} />
          <meshStandardMaterial color="#aaaaaa" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>

      {/* HP Turbine */}
      <group position={TI.hp.offset} onClick={handleClick("hp-turbine")}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[TI.hp.radius, TI.hp.radius, TI.hp.length, 24, 1]} />
          <meshStandardMaterial
            ref={hpMatRef}
            color={COLORS.metalMedium}
            metalness={0.85}
            roughness={0.3}
            emissive={COLORS.highlightEmissive}
            emissiveIntensity={0}
          />
        </mesh>
        {/* HP end caps — rotated to align dome along ±Z (cylinder axis) */}
        <mesh position={[0, 0, TI.hp.length / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[TI.hp.radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={COLORS.metalMedium} metalness={0.85} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, -TI.hp.length / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[TI.hp.radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={COLORS.metalMedium} metalness={0.85} roughness={0.3} />
        </mesh>
      </group>

      {/* MSR (Moisture Separator Reheater) */}
      <group position={TI.msr.offset} onClick={handleClick("msr")}>
        <mesh>
          <boxGeometry args={[TI.msr.width, TI.msr.height, TI.msr.depth]} />
          <meshStandardMaterial
            ref={msrMatRef}
            color={COLORS.msrGreen}
            metalness={0.6}
            roughness={0.5}
            emissive={COLORS.highlightEmissive}
            emissiveIntensity={0}
          />
        </mesh>
      </group>

      {/* LP Turbines (2x, larger than HP) */}
      {TI.lp.offsets.map((offset, i) => (
        <group key={`lp-${i}`} position={offset} onClick={handleClick("lp-turbine")}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[TI.lp.radius, TI.lp.radius, TI.lp.length, 24, 1]} />
            <meshStandardMaterial
              color={COLORS.metalMedium}
              metalness={0.85}
              roughness={0.3}
              emissive={COLORS.highlightEmissive}
              emissiveIntensity={selectedComponent === "lp-turbine" ? 0.3 : 0}
            />
          </mesh>
          {/* LP end caps — rotated to align dome along ±Z (cylinder axis) */}
          <mesh position={[0, 0, TI.lp.length / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[TI.lp.radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={COLORS.metalMedium} metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, -TI.lp.length / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[TI.lp.radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={COLORS.metalMedium} metalness={0.85} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Generator */}
      <group position={TI.generator.offset} onClick={handleClick("generator")}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[TI.generator.radius, TI.generator.radius, TI.generator.length, 24, 1]} />
          <meshStandardMaterial
            color={COLORS.generatorCopper}
            metalness={0.7}
            roughness={0.4}
            emissive={COLORS.highlightEmissive}
            emissiveIntensity={selectedComponent === "generator" ? 0.3 : 0}
          />
        </mesh>
        {/* Generator end caps — rotated to align dome along ±Z (cylinder axis) */}
        <mesh position={[0, 0, TI.generator.length / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[TI.generator.radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={COLORS.generatorCopper} metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, -TI.generator.length / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[TI.generator.radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={COLORS.generatorCopper} metalness={0.7} roughness={0.4} />
        </mesh>
      </group>

      {/* Condenser (below LP turbines) */}
      <group position={TI.condenser.offset} onClick={handleClick("condenser")}>
        <mesh>
          <boxGeometry args={[TI.condenser.width, TI.condenser.height, TI.condenser.depth]} />
          <meshStandardMaterial
            color={COLORS.condenserShell}
            metalness={0.5}
            roughness={0.6}
            emissive={COLORS.highlightEmissive}
            emissiveIntensity={selectedComponent === "condenser" ? 0.3 : 0}
          />
        </mesh>
        {/* CW inlet nozzle */}
        <mesh
          position={[-TI.condenser.width / 2 - 0.3, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          onClick={handleClick("cw-inlet")}
        >
          <cylinderGeometry args={[0.2, 0.2, 0.6, 10, 1]} />
          <meshStandardMaterial
            color="#555555"
            metalness={0.85}
            roughness={0.3}
            emissive={COLORS.highlightEmissive}
            emissiveIntensity={selectedComponent === "cw-inlet" ? 0.3 : 0}
          />
        </mesh>
        {/* CW outlet nozzle */}
        <mesh
          position={[TI.condenser.width / 2 + 0.3, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          onClick={handleClick("cw-outlet")}
        >
          <cylinderGeometry args={[0.2, 0.2, 0.6, 10, 1]} />
          <meshStandardMaterial
            color="#555555"
            metalness={0.85}
            roughness={0.3}
            emissive={COLORS.highlightEmissive}
            emissiveIntensity={selectedComponent === "cw-outlet" ? 0.3 : 0}
          />
        </mesh>
      </group>

      {/* Steam inlet nozzle on HP turbine (-X side, horizontal) */}
      <mesh
        position={[-TI.hp.radius - 0.2, TI.hp.offset[1], TI.hp.offset[2]]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[PIPING.steamLineRadius + 0.06, PIPING.steamLineRadius + 0.08, 0.5, 12, 1]} />
        <meshStandardMaterial color={COLORS.steamLine} metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Feedwater outlet nozzle on condenser (-X side, horizontal) */}
      <mesh
        position={[
          TI.condenser.offset[0] - TI.condenser.width / 2 - 0.2,
          TI.condenser.offset[1],
          TI.condenser.offset[2],
        ]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[PIPING.feedwaterRadius + 0.05, PIPING.feedwaterRadius + 0.07, 0.5, 12, 1]} />
        <meshStandardMaterial color={COLORS.feedwater} metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Crossover: HP exhaust → MSR */}
      <mesh geometry={hpToMsrGeo}>
        <meshStandardMaterial color={COLORS.steamLine} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Crossover: MSR → LP1 inlet */}
      <mesh geometry={msrToLpGeo}>
        <meshStandardMaterial color={COLORS.steamLine} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

export default React.memo(TurbineIsland);
