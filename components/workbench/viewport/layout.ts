/**
 * Centralized layout configuration for the 4-loop Westinghouse PWR scene.
 *
 * Top-down view (Y is up):
 *
 *              +Z
 *               |
 *     Loop 2    |    Loop 1
 *   SG-2/RCP-2 -+- SG-1/RCP-1
 *               |
 *   ----[VESSEL]------ +X --> [TURBINE ISLAND]
 *               |
 *     Loop 3    |    Loop 4
 *   SG-3/RCP-3 -+- SG-4/RCP-4
 *               |
 *              -Z
 *
 * Pressurizer sits above Loop 2's hot leg.
 * Containment dome (R=16) encloses primary side only.
 * Turbine island is outside containment along +X axis.
 */

// ============================================================================
// Vessel
// ============================================================================

export const VESSEL = {
  radius: 1.8,
  height: 8,
  position: [0, 0, 0] as [number, number, number],
  /** Y level where hot leg nozzles exit the vessel */
  hotNozzleY: 1.5,
  /** Y level where cold leg nozzles enter the vessel */
  coldNozzleY: -2.0,
} as const;

// ============================================================================
// Loop definitions (4 loops at 90-degree spacing)
// ============================================================================

export interface LoopConfig {
  id: number;
  /** Angle in radians from +X axis (top-down, counter-clockwise) */
  angle: number;
  sgPosition: [number, number, number];
  rcpPosition: [number, number, number];
  /** Direction vector from vessel to SG (normalized XZ) */
  dirX: number;
  dirZ: number;
}

const SG_DISTANCE = 9.3;
const RCP_OFFSET_ALONG = 0.65; // fraction along SG->vessel direction for RCP placement
const RCP_Y = -4.0;

function buildLoop(id: number, angleDeg: number): LoopConfig {
  const angle = (angleDeg * Math.PI) / 180;
  const dirX = Math.cos(angle);
  const dirZ = Math.sin(angle);
  const sgX = dirX * SG_DISTANCE;
  const sgZ = dirZ * SG_DISTANCE;
  // RCP sits on the cold leg between SG bottom and vessel bottom
  const rcpX = sgX - dirX * SG_DISTANCE * RCP_OFFSET_ALONG;
  const rcpZ = sgZ - dirZ * SG_DISTANCE * RCP_OFFSET_ALONG;
  return {
    id,
    angle,
    sgPosition: [sgX, 0, sgZ],
    rcpPosition: [rcpX, RCP_Y, rcpZ],
    dirX,
    dirZ,
  };
}

/**
 * 4-loop layout:
 *   Loop 1: +X, +Z (45 deg)
 *   Loop 2: -X, +Z (135 deg)
 *   Loop 3: -X, -Z (225 deg)
 *   Loop 4: +X, -Z (315 deg)
 */
export const LOOPS: LoopConfig[] = [
  buildLoop(1, 45),
  buildLoop(2, 135),
  buildLoop(3, 225),
  buildLoop(4, 315),
];

// ============================================================================
// Steam Generator dimensions
// ============================================================================

export const SG = {
  /** Lower (tube bundle) section */
  lowerRadius: 1.0,
  lowerHeight: 5,
  /** Transition cone height */
  coneHeight: 1.5,
  /** Upper (steam drum) section */
  upperRadius: 1.5,
  upperHeight: 3,
  /** Total visual height ~ lowerHeight + coneHeight + upperHeight = 9.5 */
} as const;

// ============================================================================
// Reactor Coolant Pump
// ============================================================================

export const RCP = {
  casingRadius: 0.55,
  casingHeight: 1.2,
  motorRadius: 0.35,
  motorHeight: 0.9,
} as const;

// ============================================================================
// Pressurizer (on Loop 2 hot leg)
// ============================================================================

export const PRESSURIZER = {
  position: [-4, 4.5, 5.5] as [number, number, number],
  radius: 0.5,
  height: 3.5,
  /** Target point the surge line connects to (Loop 2 hot leg) */
  surgeLineTarget: [-3, 1.5, 3] as [number, number, number],
} as const;

// ============================================================================
// CRDM housings
// ============================================================================

export const CRDM = {
  radius: 0.08,
  height: 1.5,
  rings: [
    { count: 5, ringRadius: 0.5 },
    { count: 7, ringRadius: 0.95 },
    { count: 6, ringRadius: 1.35 },
  ],
} as const;

// ============================================================================
// Vessel nozzle stubs
// ============================================================================

export const NOZZLE = {
  radius: 0.15,
  length: 0.6,
} as const;

// ============================================================================
// Containment
// ============================================================================

export const CONTAINMENT = {
  radius: 16,
} as const;

// ============================================================================
// Turbine Island (outside containment, along +X)
// ============================================================================

export const TURBINE_ISLAND = {
  /** Center of the turbine island group */
  position: [24, 0, 0] as [number, number, number],

  hp: {
    radius: 0.7,
    length: 2.0,
    offset: [0, 0, -3] as [number, number, number],
  },
  lp: {
    radius: 1.0,
    length: 3.5,
    offsets: [
      [0, 0, 1.5] as [number, number, number],
      [0, 0, 5.5] as [number, number, number],
    ],
  },
  msr: {
    width: 1.2,
    height: 1.5,
    depth: 2.5,
    offset: [2.5, 0, -0.5] as [number, number, number],
  },
  generator: {
    radius: 1.3,
    length: 4.0,
    offset: [0, 0, 9] as [number, number, number],
  },
  condenser: {
    width: 4,
    height: 2.5,
    depth: 5,
    offset: [0, -2.5, 2.5] as [number, number, number],
  },
  shaftRadius: 0.15,
} as const;

// ============================================================================
// Camera
// ============================================================================

export const CAMERA = {
  position: [28, 18, 28] as [number, number, number],
  fov: 45,
  target: [2, 0, 0] as [number, number, number],
  minDistance: 8,
  maxDistance: 60,
} as const;

// ============================================================================
// Pipe dimensions
// ============================================================================

export const PIPING = {
  primaryRadius: 0.14,
  steamLineRadius: 0.2,
  feedwaterRadius: 0.16,
  segments: 10,
} as const;
