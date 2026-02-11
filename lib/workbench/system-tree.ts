/**
 * Plant structure tree data for the left navigation panel.
 * Maps PWR systems into an expandable tree hierarchy.
 */

export interface TreeNodeData {
  id: string;
  label: string;
  icon?: string;
  children?: TreeNodeData[];
  /** Component ID for 3D viewport selection */
  componentId?: string;
  /** Linked scenario IDs */
  scenarioIds?: string[];
  /** Whether this is a training-only node */
  trainingNode?: boolean;
}

export const PLANT_TREE: TreeNodeData[] = [
  {
    id: "reactor",
    label: "Reactor",
    children: [
      {
        id: "reactor-vessel",
        label: "Reactor Vessel",
        componentId: "vessel",
      },
      {
        id: "reactor-core",
        label: "Core Region",
        componentId: "core",
        children: [
          {
            id: "control-rods",
            label: "Control Rod Assemblies",
            componentId: "rods",
          },
          {
            id: "fuel-assemblies",
            label: "Fuel Assemblies",
            componentId: "core",
          },
        ],
      },
    ],
  },
  {
    id: "rcs",
    label: "Reactor Coolant System",
    children: [
      {
        id: "hot-leg",
        label: "Hot Leg",
        componentId: "hotleg",
      },
      {
        id: "cold-leg",
        label: "Cold Leg",
        componentId: "coldleg",
      },
      {
        id: "rcp",
        label: "Reactor Coolant Pump",
        componentId: "pump",
      },
      {
        id: "pressurizer",
        label: "Pressurizer",
        componentId: "pressurizer",
      },
    ],
  },
  {
    id: "sg",
    label: "Steam Generators",
    children: [
      {
        id: "sg-a",
        label: "Steam Generator A",
        componentId: "sg-a",
      },
      {
        id: "sg-b",
        label: "Steam Generator B",
        componentId: "sg-b",
      },
    ],
  },
  {
    id: "secondary",
    label: "Secondary System",
    children: [
      {
        id: "turbine",
        label: "Turbine-Generator",
        componentId: "turbine",
      },
    ],
  },
  {
    id: "containment",
    label: "Containment",
    componentId: "containment",
  },
];
