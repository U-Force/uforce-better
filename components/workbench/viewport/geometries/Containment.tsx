"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CONTAINMENT } from "../layout";

interface ContainmentProps {
  visible?: boolean;
  viewMode?: "normal" | "xray" | "section" | "interior";
}

// ── Building geometry ──────────────────────────────────────────────────────
const R = CONTAINMENT.radius;
const BASE_Y = CONTAINMENT.baseY;
const SPRING_Y = CONTAINMENT.springLineY;
const CYL_H = SPRING_Y - BASE_Y;
const DOME_SCALE = CONTAINMENT.domeYScale;
const BASE_R = R + 1.0;
const GROUND_R = R + 6;
const SEGS = 64;

// ── Concrete palette ───────────────────────────────────────────────────────
const CONCRETE = "#b5b0a6";
const CONCRETE_LIGHT = "#c2bdb3";
const CONCRETE_DARK = "#a09c94";
const CONCRETE_BASE = "#9a968e";
const STEEL = "#4a4a4a";
const STEEL_LIGHT = "#5a5a5a";
const JOINT_COLOR = "#8a8680";
const GROUND_COLOR = "#807c74";

// ── Interior palette ───────────────────────────────────────────────────────
const LINER_COLOR = "#484848";
const CRANE_YELLOW = "#c9a800";
const CRANE_RAIL = "#555555";
const DECK_STEEL = "#5a5a5a";
const CABLE_TRAY = "#404040";
const BIO_SHIELD = "#8a8680";

// ── Buttresses ─────────────────────────────────────────────────────────────
const NUM_BUTTRESSES = 6;
const BUTTRESS_W = 1.3;
const BUTTRESS_D = 0.8;
const BUTTRESS_START_DEG = 25;

// ── Construction joints ────────────────────────────────────────────────────
const JOINT_YS = [-4, -0.5, 3, 6.5, 10];

// ── Equipment hatch (facing +X toward turbine) ────────────────────────────
const HATCH_Y = -2;
const HATCH_R = 2.0;

// ── Personnel airlock ──────────────────────────────────────────────────────
const AIRLOCK_ANGLE = (160 * Math.PI) / 180;
const AIRLOCK_Y = -4.5;

// ── Interior geometry ──────────────────────────────────────────────────────
const LINER_R = R - 0.3;
const CRANE_RAIL_Y = 10.5;
const CRANE_RAIL_R = R - 1.5;
const DECK_Y = -2;
const DECK_INNER_R = 3.5;

// ── Opacity targets ────────────────────────────────────────────────────────
const NORMAL_OPACITY = 1.0;
const INTERIOR_OPACITY = 0.0;
const XRAY_OPACITY = 0.06;

function Containment({
  visible = true,
  viewMode = "normal",
}: ContainmentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const opacityRef = useRef(NORMAL_OPACITY);

  useFrame(() => {
    if (!groupRef.current) return;
    const target =
      viewMode === "xray"
        ? XRAY_OPACITY
        : viewMode === "interior"
          ? INTERIOR_OPACITY
          : NORMAL_OPACITY;
    opacityRef.current = THREE.MathUtils.lerp(
      opacityRef.current,
      target,
      0.05
    );
    const op = opacityRef.current;
    const isTransparent = op < 0.99;

    groupRef.current.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (child.userData.skipOpacity) return;
      const mat = child.material;
      if (
        mat instanceof THREE.MeshStandardMaterial ||
        mat instanceof THREE.MeshBasicMaterial
      ) {
        const baseOp = (child.userData.baseOpacity as number) ?? 1.0;
        mat.opacity = op * baseOp;
        mat.transparent = isTransparent || baseOp < 1.0;
        mat.depthWrite = mat.opacity > 0.9;
      }
    });
  });

  const buttresses = useMemo(() => {
    return Array.from({ length: NUM_BUTTRESSES }, (_, i) => {
      const deg = BUTTRESS_START_DEG + (360 / NUM_BUTTRESSES) * i;
      const rad = (deg * Math.PI) / 180;
      return { angle: rad };
    });
  }, []);

  // Pre-compute interior light positions (6 lights around perimeter)
  const interiorLights = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (i * 60 * Math.PI) / 180;
      return {
        x: Math.cos(angle) * (R - 1),
        z: Math.sin(angle) * (R - 1),
      };
    });
  }, []);

  if (!visible) return null;

  const cylCenterY = BASE_Y + CYL_H / 2;
  const isInterior = viewMode === "interior";

  return (
    <group ref={groupRef}>
      {/* ── Main cylinder wall ──────────────────────────────────────── */}
      <mesh position={[0, cylCenterY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R, R, CYL_H, SEGS, 1, true]} />
        <meshStandardMaterial
          color={CONCRETE}
          roughness={0.93}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Dome (flattened hemisphere) ────────────────────────────── */}
      <group position={[0, SPRING_Y, 0]} scale={[1, DOME_SCALE, 1]}>
        <mesh castShadow>
          <sphereGeometry
            args={[R, SEGS, 32, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshStandardMaterial
            color={CONCRETE_LIGHT}
            roughness={0.9}
            metalness={0.02}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ── Spring line ring (dome-to-cylinder ledge) ──────────────── */}
      <mesh
        position={[0, SPRING_Y, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry args={[R + 0.05, 0.35, 12, SEGS]} />
        <meshStandardMaterial
          color={CONCRETE_DARK}
          roughness={0.88}
          metalness={0.03}
        />
      </mesh>

      {/* ── Base mat (thick foundation) ─────────────────────────────── */}
      <mesh position={[0, BASE_Y - 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[BASE_R, BASE_R + 0.3, 1.0, SEGS]} />
        <meshStandardMaterial
          color={CONCRETE_BASE}
          roughness={0.95}
          metalness={0.01}
        />
      </mesh>

      {/* ── Foundation ledge ring ────────────────────────────────────── */}
      <mesh
        position={[0, BASE_Y - 0.9, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[BASE_R + 0.15, 0.25, 8, SEGS]} />
        <meshStandardMaterial
          color={CONCRETE_DARK}
          roughness={0.95}
          metalness={0.01}
        />
      </mesh>

      {/* ── Ground apron ────────────────────────────────────────────── */}
      <mesh
        position={[0, BASE_Y - 1.0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <ringGeometry args={[BASE_R + 0.5, GROUND_R, SEGS]} />
        <meshStandardMaterial
          color={GROUND_COLOR}
          roughness={0.97}
          metalness={0.0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Buttresses (vertical reinforcement ribs) ────────────────── */}
      {buttresses.map((b, i) => {
        const bx = Math.cos(b.angle) * (R + BUTTRESS_D / 2);
        const bz = Math.sin(b.angle) * (R + BUTTRESS_D / 2);
        return (
          <mesh
            key={`buttress-${i}`}
            position={[bx, cylCenterY, bz]}
            rotation={[0, -b.angle + Math.PI / 2, 0]}
            castShadow
          >
            <boxGeometry args={[BUTTRESS_W, CYL_H, BUTTRESS_D]} />
            <meshStandardMaterial
              color={CONCRETE_DARK}
              roughness={0.92}
              metalness={0.02}
            />
          </mesh>
        );
      })}

      {/* ── Construction joints (horizontal rings) ──────────────────── */}
      {JOINT_YS.map((y, i) => (
        <mesh
          key={`joint-${i}`}
          position={[0, y, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[R + 0.02, 0.05, 6, SEGS]} />
          <meshStandardMaterial
            color={JOINT_COLOR}
            roughness={0.85}
            metalness={0.05}
          />
        </mesh>
      ))}

      {/* ── Equipment hatch (+X face, toward turbine building) ──────── */}
      <group position={[R + 0.02, HATCH_Y, 0]}>
        {/* Hatch collar (concrete protrusion) */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry
            args={[HATCH_R + 0.3, HATCH_R + 0.3, 0.8, 32, 1, true]}
          />
          <meshStandardMaterial
            color={CONCRETE_DARK}
            roughness={0.9}
            metalness={0.02}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Hatch ring frame */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[HATCH_R, 0.18, 16, 32]} />
          <meshStandardMaterial
            color={STEEL}
            roughness={0.35}
            metalness={0.85}
          />
        </mesh>
        {/* Hatch door */}
        <mesh rotation={[0, -Math.PI / 2, 0]} position={[0.1, 0, 0]}>
          <circleGeometry args={[HATCH_R - 0.2, 32]} />
          <meshStandardMaterial
            color={STEEL_LIGHT}
            roughness={0.45}
            metalness={0.75}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ── Personnel airlock (~160 deg face) ───────────────────────── */}
      <group
        position={[
          Math.cos(AIRLOCK_ANGLE) * R,
          AIRLOCK_Y,
          Math.sin(AIRLOCK_ANGLE) * R,
        ]}
        rotation={[0, -AIRLOCK_ANGLE, 0]}
      >
        {/* Airlock body */}
        <mesh position={[1.2, 0, 0]} castShadow>
          <boxGeometry args={[2.2, 3.0, 1.6]} />
          <meshStandardMaterial
            color={CONCRETE}
            roughness={0.92}
            metalness={0.02}
          />
        </mesh>
        {/* Airlock top slab */}
        <mesh position={[1.2, 1.55, 0]}>
          <boxGeometry args={[2.4, 0.12, 1.8]} />
          <meshStandardMaterial
            color={CONCRETE_DARK}
            roughness={0.9}
            metalness={0.02}
          />
        </mesh>
        {/* Airlock door */}
        <mesh
          position={[2.32, -0.2, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry args={[1.0, 2.2]} />
          <meshStandardMaterial
            color={STEEL}
            roughness={0.4}
            metalness={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ── Dome apex cap (ventilation / monitoring structure) ──────── */}
      <group position={[0, SPRING_Y + R * DOME_SCALE - 0.2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.4, 0.6, 0.6, 16]} />
          <meshStandardMaterial
            color={CONCRETE_DARK}
            roughness={0.88}
            metalness={0.03}
          />
        </mesh>
        {/* Small top cap */}
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={STEEL_LIGHT}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>
      </group>

      {/* ── Tendon gallery ring (base of cylinder) ──────────────────── */}
      <mesh
        position={[0, BASE_Y + 0.3, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[R + 0.2, 0.4, 10, SEGS]} />
        <meshStandardMaterial
          color={CONCRETE_BASE}
          roughness={0.95}
          metalness={0.01}
        />
      </mesh>

      {/* ── Wireframe structural grid (subtle, for x-ray depth) ────── */}
      <mesh
        position={[0, cylCenterY, 0]}
        userData={{ baseOpacity: 0.06 }}
      >
        <cylinderGeometry args={[R + 0.08, R + 0.08, CYL_H, 24, 8, true]} />
        <meshBasicMaterial
          color="#6688aa"
          wireframe
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>

      {/* ================================================================
          INTERIOR DETAILS — only rendered in interior view mode
          ================================================================ */}
      {isInterior && (
        <group>
          {/* ── Steel liner (inner wall surface) ───────────────────── */}
          <mesh position={[0, cylCenterY, 0]}>
            <cylinderGeometry
              args={[LINER_R, LINER_R, CYL_H, SEGS, 1, true]}
            />
            <meshStandardMaterial
              color={LINER_COLOR}
              roughness={0.4}
              metalness={0.85}
              side={THREE.BackSide}
            />
          </mesh>

          {/* ── Steel liner dome (inner dome surface) ──────────────── */}
          <group position={[0, SPRING_Y, 0]} scale={[1, DOME_SCALE, 1]}>
            <mesh>
              <sphereGeometry
                args={[LINER_R, SEGS, 32, 0, Math.PI * 2, 0, Math.PI / 2]}
              />
              <meshStandardMaterial
                color={LINER_COLOR}
                roughness={0.4}
                metalness={0.85}
                side={THREE.BackSide}
              />
            </mesh>
          </group>

          {/* ── Polar crane rail (circular track near top) ─────────── */}
          <mesh
            position={[0, CRANE_RAIL_Y, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[CRANE_RAIL_R, 0.3, 12, SEGS]} />
            <meshStandardMaterial
              color={CRANE_RAIL}
              roughness={0.5}
              metalness={0.8}
            />
          </mesh>

          {/* ── Polar crane bridge beam ─────────────────────────────── */}
          <mesh position={[0, CRANE_RAIL_Y + 0.5, 0]}>
            <boxGeometry args={[1.2, 1.0, CRANE_RAIL_R * 2]} />
            <meshStandardMaterial
              color={CRANE_YELLOW}
              roughness={0.5}
              metalness={0.4}
            />
          </mesh>

          {/* ── Crane bridge end trucks ─────────────────────────────── */}
          <mesh position={[0, CRANE_RAIL_Y + 0.1, CRANE_RAIL_R]}>
            <boxGeometry args={[2.4, 0.5, 1.0]} />
            <meshStandardMaterial
              color={CRANE_YELLOW}
              roughness={0.5}
              metalness={0.4}
            />
          </mesh>
          <mesh position={[0, CRANE_RAIL_Y + 0.1, -CRANE_RAIL_R]}>
            <boxGeometry args={[2.4, 0.5, 1.0]} />
            <meshStandardMaterial
              color={CRANE_YELLOW}
              roughness={0.5}
              metalness={0.4}
            />
          </mesh>

          {/* ── Crane trolley ──────────────────────────────────────── */}
          <mesh position={[0, CRANE_RAIL_Y + 1.1, 3]}>
            <boxGeometry args={[1.8, 0.5, 2.0]} />
            <meshStandardMaterial
              color={CRANE_YELLOW}
              roughness={0.5}
              metalness={0.4}
            />
          </mesh>

          {/* ── Hoist cable (hanging from trolley) ─────────────────── */}
          <mesh position={[0, (CRANE_RAIL_Y + DECK_Y) / 2 + 1, 3]}>
            <cylinderGeometry
              args={[0.03, 0.03, CRANE_RAIL_Y - DECK_Y - 1, 8]}
            />
            <meshStandardMaterial
              color="#333333"
              roughness={0.5}
              metalness={0.8}
            />
          </mesh>

          {/* ── Hoist block ────────────────────────────────────────── */}
          <mesh position={[0, DECK_Y + 2, 3]}>
            <boxGeometry args={[0.4, 0.6, 0.4]} />
            <meshStandardMaterial
              color={CRANE_RAIL}
              roughness={0.5}
              metalness={0.7}
            />
          </mesh>

          {/* ── Operating deck (floor with vessel opening) ─────────── */}
          <mesh
            position={[0, DECK_Y, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[DECK_INNER_R, LINER_R - 0.5, SEGS]} />
            <meshStandardMaterial
              color={DECK_STEEL}
              roughness={0.7}
              metalness={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* ── Deck edge rail (safety railing around vessel opening) ─ */}
          <mesh
            position={[0, DECK_Y + 0.5, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[DECK_INNER_R + 0.1, 0.04, 8, 48]} />
            <meshStandardMaterial
              color="#888888"
              roughness={0.4}
              metalness={0.8}
            />
          </mesh>
          <mesh
            position={[0, DECK_Y + 1.0, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[DECK_INNER_R + 0.1, 0.04, 8, 48]} />
            <meshStandardMaterial
              color="#888888"
              roughness={0.4}
              metalness={0.8}
            />
          </mesh>

          {/* ── Biological shield wall (concrete around reactor) ───── */}
          <mesh position={[0, (DECK_Y + 4) / 2, 0]}>
            <cylinderGeometry
              args={[3.2, 3.2, DECK_Y + 10, 32, 1, true]}
            />
            <meshStandardMaterial
              color={BIO_SHIELD}
              roughness={0.92}
              metalness={0.02}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* ── Cable tray runs (horizontal rings along wall) ──────── */}
          {[1, 5, 8].map((y, i) => (
            <mesh
              key={`tray-${i}`}
              position={[0, y, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[LINER_R - 0.5, 0.12, 4, SEGS]} />
              <meshStandardMaterial
                color={CABLE_TRAY}
                roughness={0.7}
                metalness={0.6}
              />
            </mesh>
          ))}

          {/* ── Vertical cable runs (4 risers) ─────────────────────── */}
          {[0, 90, 180, 270].map((deg, i) => {
            const angle = (deg * Math.PI) / 180;
            return (
              <mesh
                key={`vriser-${i}`}
                position={[
                  Math.cos(angle) * (LINER_R - 0.6),
                  cylCenterY,
                  Math.sin(angle) * (LINER_R - 0.6),
                ]}
              >
                <cylinderGeometry args={[0.08, 0.08, CYL_H * 0.7, 8]} />
                <meshStandardMaterial
                  color={CABLE_TRAY}
                  roughness={0.7}
                  metalness={0.6}
                />
              </mesh>
            );
          })}

          {/* ── Interior lighting fixtures + point lights ──────────── */}
          {interiorLights.map((l, i) => (
            <group key={`ilight-${i}`} position={[l.x, 8, l.z]}>
              <pointLight
                color="#fff5e0"
                intensity={0.5}
                distance={18}
                userData={{ skipOpacity: true }}
              />
              {/* Fixture box */}
              <mesh>
                <boxGeometry args={[0.5, 0.12, 0.3]} />
                <meshStandardMaterial
                  color="#dddddd"
                  emissive="#fff5e0"
                  emissiveIntensity={0.6}
                  roughness={0.3}
                  metalness={0.2}
                />
              </mesh>
            </group>
          ))}

          {/* ── Lower level lights (operating deck) ────────────────── */}
          {[0, 120, 240].map((deg, i) => {
            const angle = (deg * Math.PI) / 180;
            return (
              <group
                key={`llight-${i}`}
                position={[
                  Math.cos(angle) * (LINER_R - 1.5),
                  DECK_Y + 3,
                  Math.sin(angle) * (LINER_R - 1.5),
                ]}
              >
                <pointLight
                  color="#ffe8c0"
                  intensity={0.3}
                  distance={12}
                  userData={{ skipOpacity: true }}
                />
                <mesh>
                  <boxGeometry args={[0.3, 0.1, 0.2]} />
                  <meshStandardMaterial
                    color="#cccccc"
                    emissive="#ffe8c0"
                    emissiveIntensity={0.4}
                    roughness={0.3}
                    metalness={0.2}
                  />
                </mesh>
              </group>
            );
          })}

          {/* ── Containment floor (below operating deck) ───────────── */}
          <mesh
            position={[0, BASE_Y + 0.1, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[LINER_R - 0.2, SEGS]} />
            <meshStandardMaterial
              color="#5a5854"
              roughness={0.85}
              metalness={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default React.memo(Containment);
