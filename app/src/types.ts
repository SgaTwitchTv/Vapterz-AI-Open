export type ModuleId = "projects" | "raster" | "vector" | "settings";

export type VisualStandardId = "classic" | "newest" | "visa";

export type ProcessModeId = "clean";

export interface StandardDefinition {
  id: VisualStandardId;
  label: string;
  shortLabel: string;
  description: string;
  badge?: string;
}

export interface ProcessModeDefinition {
  id: ProcessModeId;
  label: string;
  description: string;
  risk: "safe" | "review";
}

export interface ProjectSummary {
  name: string;
  path: string;
  sourceName: string;
  sourceType: string;
  updatedLabel: string;
  artifactCount: number;
  status: "ready" | "review" | "unknown";
}

export interface ArtifactItem {
  name: string;
  path: string;
  category: string;
  extension: string;
  sizeLabel: string;
}

export interface CadLayer {
  name: string;
  semanticRole: string;
  semanticGuess: string;
  entityCount: number;
  confidence: number;
  selected: boolean;
  color: string;
  isContainer?: boolean;
  blockNames?: string[];
  blockReferenceCount?: number;
  descendantLayers?: CadLayerDescendant[];
  maxBlockDepth?: number;
  nestedInsertCount?: number;
}

export interface CadLayerDescendant {
  name: string;
  entityCount: number;
  minDepth: number;
  maxDepth: number;
  paths?: string[][];
}

export interface AppContext {
  repositoryRoot: string;
  engineRoot: string;
  pythonPath: string;
  projectRoot: string;
  desktopAvailable: boolean;
}

export interface EngineRunRequest {
  kind: "raster" | "vector";
  publicDemo?: boolean;
  inputPath: string;
  projectPath?: string;
  outputName?: string;
  standardId: VisualStandardId;
  processMode: ProcessModeId;
  preparationMode: string;
  lineProfile: string;
  scale: number;
  generateColored: boolean;
  diagnostics: boolean;
  layerMode: string;
  cropMode: string;
  wallCleanup: string;
  includeBeams: boolean;
  outputFormat: "svg" | "dxf" | "svg+dxf";
  addLayers: string[];
  excludeLayers: string[];
  allowedClasses: string[];
}

export interface EngineRunResult {
  runId: string;
  success: boolean;
  exitCode: number;
  projectPath: string;
  primaryOutput: string;
  coloredOutput?: string;
  logPath?: string;
  message: string;
}

export type RunState = "idle" | "preparing" | "running" | "success" | "error";
