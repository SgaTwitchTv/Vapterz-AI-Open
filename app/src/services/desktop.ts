import { invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { AppContext, ArtifactItem, CadLayer, EngineRunRequest, EngineRunResult, ProjectSummary } from "../types";

const browserContext: AppContext = { repositoryRoot: "Browser preview", engineRoot: "Local Python engine", pythonPath: "python", projectRoot: "workspace/projects", desktopAvailable: false };
export function desktopAvailable() { return isTauri(); }
export async function getAppContext() { return isTauri() ? invoke<AppContext>("get_app_context") : browserContext; }
export async function listProjects() { return isTauri() ? invoke<ProjectSummary[]>("list_projects") : []; }
export async function listArtifacts(projectPath: string) { return isTauri() && projectPath ? invoke<ArtifactItem[]>("list_artifacts", { projectPath }) : []; }
export async function inspectCadLayers(inputPath: string, manualOnly = true) { return isTauri() && inputPath ? invoke<CadLayer[]>("inspect_cad_layers", { inputPath, manualOnly }) : []; }
export async function runEngine(request: EngineRunRequest): Promise<EngineRunResult> {
  if (isTauri()) return invoke<EngineRunResult>("run_engine", { request });
  await new Promise((resolve) => window.setTimeout(resolve, 500));
  return { runId: "browser-preview", success: true, exitCode: 0, projectPath: "Browser preview", primaryOutput: request.inputPath, message: "Browser UI preview completed. Use the desktop app to execute the local engine." };
}
export async function readPreview(path: string) { return isTauri() && path ? invoke<string>("read_preview", { path }) : undefined; }
async function choose(extensions: string[], name: string) {
  if (!isTauri()) return undefined;
  const result = await open({ multiple: false, directory: false, filters: [{ name, extensions }] });
  return typeof result === "string" ? result : undefined;
}
export function chooseRasterFile() { return choose(["png", "jpg", "jpeg", "bmp", "tif", "tiff"], "Raster floorplans"); }
export function chooseCadFile() { return choose(["dxf"], "DXF drawings"); }
export async function chooseProjectFolder() { if (!isTauri()) return undefined; const result = await open({ multiple: false, directory: true }); return typeof result === "string" ? result : undefined; }
export async function revealPath(path: string) { if (isTauri() && path) await invoke<void>("open_local_path", { path }); }
export async function revealGeneratedFile(path: string) { if (isTauri() && path) await revealItemInDir(path); }

