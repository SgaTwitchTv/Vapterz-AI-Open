import type {
  ProcessModeDefinition,
  ProcessModeId,
  StandardDefinition,
  VisualStandardId,
} from "../types";

export const VISUAL_STANDARDS: StandardDefinition[] = [
  {
    id: "classic",
    label: "Classic",
    shortLabel: "Classic",
    description: "Preserves the original clean SVG styling with no client profile applied.",
  },
];

export const PROCESS_MODES: ProcessModeDefinition[] = [
  {
    id: "clean",
    label: "Clean architecture",
    description: "Normal layer-based CAD cleaning for drawings with a dependable structure.",
    risk: "safe",
  },
];

export function visualStandard(id: VisualStandardId) {
  return VISUAL_STANDARDS.find((item) => item.id === id) ?? VISUAL_STANDARDS[0];
}

export function processMode(id: ProcessModeId) {
  return PROCESS_MODES.find((item) => item.id === id) ?? PROCESS_MODES[0];
}
