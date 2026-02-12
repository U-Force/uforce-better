/**
 * Component metadata for the 3D inspector cards.
 * Each entry provides educational info displayed when a component is clicked.
 */

export interface InspectorMeta {
  id: string;
  name: string;
  description: string;
  parameters: { label: string; key: string; unit: string; format?: (v: number) => string }[];
  /** Which soft control card to open, if any */
  controlCard?: "rod" | "boron" | "pump";
  educationalNote?: string;
}

function sgEntry(id: string, num: number): InspectorMeta {
  return {
    id,
    name: `Steam Generator ${num}`,
    description:
      "U-tube heat exchanger transferring heat from primary (radioactive) to secondary (non-radioactive) coolant. The tubes provide the pressure boundary between the two systems.",
    parameters: [
      { label: "Hot Leg Temp", key: "Tc", unit: "K", format: (v) => v.toFixed(0) },
    ],
    educationalNote:
      "Each SG has thousands of thin tubes with ~11,000 m\u00B2 of heat transfer area. Tube degradation is a major maintenance concern.",
  };
}

function rcpEntry(id: string, num: number): InspectorMeta {
  return {
    id,
    name: `Reactor Coolant Pump ${num}`,
    description:
      "The RCP forces primary coolant through the core to remove heat. Each loop has a dedicated pump providing ~6× better heat transfer than natural circulation alone.",
    parameters: [
      { label: "Coolant Temp", key: "Tc", unit: "K", format: (v) => v.toFixed(0) },
    ],
    controlCard: "pump",
    educationalNote:
      "A pump trip is a significant event: reduced cooling can cause temperatures to rise rapidly. Natural circulation can maintain decay heat removal after shutdown.",
  };
}

export const INSPECTOR_DATA: Record<string, InspectorMeta> = {
  vessel: {
    id: "vessel",
    name: "Reactor Pressure Vessel",
    description:
      "The RPV contains the reactor core, control rod assemblies, and supporting internals. It is made of low-alloy steel with stainless steel cladding, designed for ~155 bar operating pressure.",
    parameters: [
      { label: "Power", key: "P", unit: "%", format: (v) => (v * 100).toFixed(1) },
      { label: "Fuel Temp", key: "Tf", unit: "K", format: (v) => v.toFixed(0) },
      { label: "Coolant Temp", key: "Tc", unit: "K", format: (v) => v.toFixed(0) },
    ],
    educationalNote:
      "The vessel is designed to last the full 60-year life of the plant. Embrittlement from neutron irradiation is the primary aging concern.",
  },
  core: {
    id: "core",
    name: "Reactor Core",
    description:
      "The core contains ~193 fuel assemblies with UO2 fuel rods in a 17x17 lattice. Nuclear fission produces 3000 MWth at full power. Power is controlled by rod position, boron concentration, and inherent feedback.",
    parameters: [
      { label: "Power", key: "P", unit: "%", format: (v) => (v * 100).toFixed(1) },
      { label: "Total Reactivity", key: "rhoTotal", unit: "pcm", format: (v) => (v * 1e5).toFixed(0) },
    ],
    educationalNote:
      "The chain reaction is self-regulating: as temperature increases, reactivity decreases (negative feedback). This is the most important safety feature of a PWR.",
  },
  rods: {
    id: "rods",
    name: "Control Rod Assemblies",
    description:
      "Control rods contain neutron-absorbing material (Ag-In-Cd or B4C). Inserting rods absorbs more neutrons and reduces reactivity. Rod worth follows an S-curve: more effect in the middle of the core.",
    parameters: [
      { label: "Rod Position", key: "rodActual", unit: "%", format: (v) => (v * 100).toFixed(1) },
      { label: "Rod Worth", key: "rhoExt", unit: "pcm", format: (v) => (v * 1e5).toFixed(0) },
    ],
    controlCard: "rod",
    educationalNote:
      "In an emergency, rods are released and fall by gravity in ~2 seconds (SCRAM). The word comes from the first reactor's Safety Control Rod Ax Man.",
  },

  // 4 Steam Generators
  "sg-1": sgEntry("sg-1", 1),
  "sg-2": sgEntry("sg-2", 2),
  "sg-3": sgEntry("sg-3", 3),
  "sg-4": sgEntry("sg-4", 4),

  // 4 Reactor Coolant Pumps
  "rcp-1": rcpEntry("rcp-1", 1),
  "rcp-2": rcpEntry("rcp-2", 2),
  "rcp-3": rcpEntry("rcp-3", 3),
  "rcp-4": rcpEntry("rcp-4", 4),

  pressurizer: {
    id: "pressurizer",
    name: "Pressurizer",
    description:
      "Maintains RCS pressure at ~155 bar using electric heaters (to increase) and spray (to decrease). Contains a steam bubble above liquid water for pressure control.",
    parameters: [
      { label: "Coolant Temp", key: "Tc", unit: "K", format: (v) => v.toFixed(0) },
    ],
    controlCard: "boron",
    educationalNote:
      "The pressurizer is the only place in the RCS where boiling is intentional. The CVCS injects/removes borated water through the pressurizer.",
  },

  // Secondary side
  "hp-turbine": {
    id: "hp-turbine",
    name: "HP Turbine",
    description:
      "The high-pressure turbine receives steam directly from the steam generators at ~7 MPa and ~285\u00B0C. It extracts about 30% of the steam energy before passing to the MSR and LP turbines.",
    parameters: [
      { label: "Power", key: "P", unit: "%", format: (v) => (v * 100).toFixed(1) },
    ],
    educationalNote:
      "HP turbine blades are shorter than LP blades because the steam is at higher density/pressure.",
  },
  "lp-turbine": {
    id: "lp-turbine",
    name: "LP Turbines",
    description:
      "Two low-pressure turbines receive reheated steam from the MSR. The steam expands to condenser vacuum (~5 kPa), extracting the remaining energy.",
    parameters: [
      { label: "Power", key: "P", unit: "%", format: (v) => (v * 100).toFixed(1) },
    ],
    educationalNote:
      "LP turbine last-stage blades can be over 1 meter long. Wet steam erosion is the primary maintenance concern.",
  },
  msr: {
    id: "msr",
    name: "Moisture Separator Reheater",
    description:
      "Removes moisture from HP exhaust and reheats the steam before it enters the LP turbines. This improves cycle efficiency and reduces blade erosion.",
    parameters: [],
    educationalNote:
      "The MSR uses live steam from the main steam lines as the heating medium.",
  },
  generator: {
    id: "generator",
    name: "Main Generator",
    description:
      "Converts the turbine shaft mechanical energy to electrical energy at ~22 kV. A hydrogen-cooled synchronous generator producing ~1100 MWe at full load.",
    parameters: [
      { label: "Power", key: "P", unit: "%", format: (v) => (v * 100).toFixed(1) },
    ],
    educationalNote:
      "The generator rotor spins at 1800 RPM (60 Hz grid) or 1500 RPM (50 Hz grid). Hydrogen cooling allows higher power density.",
  },
  condenser: {
    id: "condenser",
    name: "Main Condenser",
    description:
      "Condenses LP turbine exhaust steam back to liquid water at ~33\u00B0C using circulating water from the cooling tower or ocean. Maintains vacuum to maximize turbine efficiency.",
    parameters: [],
    educationalNote:
      "The condenser is the plant's primary heat sink, rejecting ~2000 MW of waste heat to the environment.",
  },
  "feed-pump": {
    id: "feed-pump",
    name: "Main Feedwater Pump",
    description:
      "Pumps condensate from the condenser hotwell back to the steam generators at high pressure (~7 MPa). Driven by a steam turbine or large electric motor.",
    parameters: [],
    educationalNote:
      "The feedwater pumps are among the largest auxiliary equipment in the plant, consuming ~30 MW.",
  },
  "condensate-pump": {
    id: "condensate-pump",
    name: "Condensate Pump",
    description:
      "Low-pressure pump that moves condensate from the condenser hotwell through the feedwater heaters to the main feed pump suction.",
    parameters: [],
    educationalNote:
      "Multiple condensate pumps are typically installed in parallel for redundancy.",
  },
  "cw-inlet": {
    id: "cw-inlet",
    name: "Circulating Water Inlet",
    description:
      "Supplies cooling water from the cooling tower or natural water source (river/ocean) to the condenser tubes. This water absorbs the waste heat from the exhaust steam and condenses it back to liquid.",
    parameters: [],
    educationalNote:
      "Loss of circulating water flow degrades condenser vacuum and can force a turbine trip. Redundant CW pumps provide backup.",
  },
  "cw-outlet": {
    id: "cw-outlet",
    name: "Circulating Water Outlet",
    description:
      "Returns heated circulating water from the condenser back to the cooling tower or discharge canal. The temperature rise is typically 10\u201315\u00B0C across the condenser.",
    parameters: [],
    educationalNote:
      "Environmental regulations limit the maximum discharge temperature to protect aquatic ecosystems.",
  },
  containment: {
    id: "containment",
    name: "Containment Building",
    description:
      "The containment is the final barrier preventing radioactive release. The reinforced concrete and steel liner are designed to withstand the maximum credible accident pressure.",
    parameters: [],
    educationalNote:
      "Containment is tested periodically to ensure leak-tightness. It must maintain integrity during design-basis accidents including a full LOCA.",
  },
  hotleg: {
    id: "hotleg",
    name: "Hot Leg",
    description: "Carries heated coolant from the reactor vessel to the steam generators. Typical temperature ~325\u00B0C at full power.",
    parameters: [
      { label: "Coolant Temp", key: "Tc", unit: "K", format: (v) => v.toFixed(0) },
    ],
  },
  coldleg: {
    id: "coldleg",
    name: "Cold Leg",
    description: "Returns cooled coolant from the steam generators back to the reactor vessel via the RCP. Typical temperature ~290\u00B0C at full power.",
    parameters: [
      { label: "Coolant Temp", key: "Tc", unit: "K", format: (v) => v.toFixed(0) },
    ],
  },
};
