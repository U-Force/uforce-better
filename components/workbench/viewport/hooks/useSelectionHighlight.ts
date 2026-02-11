import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Smoothly animates the emissive intensity of a MeshStandardMaterial
 * to indicate selection state. Duplicated in 5 geometry components before
 * extraction: ReactorVessel, SteamGenerator, Pressurizer, CoolantPump, Turbine.
 *
 * @param selected  Whether the geometry is currently selected
 * @param intensity Peak emissive intensity when selected (default 0.3)
 * @param speed     Lerp speed per frame (default 0.08)
 * @returns         Ref to attach to the target meshStandardMaterial
 */
export function useSelectionHighlight(
  selected: boolean,
  intensity = 0.3,
  speed = 0.08,
) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const target = selected ? intensity : 0;

  useFrame(() => {
    if (matRef.current) {
      matRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        matRef.current.emissiveIntensity,
        target,
        speed,
      );
    }
  });

  return matRef;
}
