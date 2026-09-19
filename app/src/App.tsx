import { useCallback, useEffect, useState } from "react";
import { ArtifactDrawer } from "./components/ArtifactDrawer";
import { Shell } from "./components/Shell";
import { randomWelcomeLine, WelcomeScreen } from "./components/WelcomeScreen";
import { ProjectsModule } from "./modules/ProjectsModule";
import { RasterModule, type RasterSettings } from "./modules/RasterModule";
import { SettingsModule } from "./modules/SettingsModule";
import { VectorModule, type VectorSettings } from "./modules/VectorModule";
import { getAppContext, listProjects, runEngine } from "./services/desktop";
import type { AppContext, EngineRunRequest, ModuleId, ProjectSummary, RunState } from "./types";

const rasterDefaults: RasterSettings = { standardId: "classic", preparationMode: "auto-safe", lineProfile: "auto", scale: 2, generateColored: false, diagnostics: false };
const vectorDefaults: VectorSettings = { standardId: "classic", processMode: "clean", layerMode: "no-geometry", cropMode: "none", wallCleanup: "none", includeBeams: false, outputFormat: "svg", generateColored: false, diagnostics: false, allowedClasses: [], outputName: "" };

export default function App() {
  const [welcomeVisible, setWelcomeVisible] = useState(true);
  const [welcomeLeaving, setWelcomeLeaving] = useState(false);
  const [welcomeLine] = useState(randomWelcomeLine);
  const [activeModule, setActiveModule] = useState<ModuleId>("projects");
  const [context, setContext] = useState<AppContext>();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [currentProjectPath, setCurrentProjectPath] = useState("");
  const [rasterProjectPath, setRasterProjectPath] = useState("");
  const [vectorProjectPath, setVectorProjectPath] = useState("");
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const [artifactsVersion, setArtifactsVersion] = useState(0);
  const [rasterSettings, setRasterSettings] = useState(rasterDefaults);
  const [vectorSettings, setVectorSettings] = useState(vectorDefaults);
  const [rasterInput, setRasterInput] = useState("");
  const [vectorInput, setVectorInput] = useState("");
  const [rasterOutput, setRasterOutput] = useState("");
  const [vectorOutput, setVectorOutput] = useState("");
  const [rasterState, setRasterState] = useState<RunState>("idle");
  const [vectorState, setVectorState] = useState<RunState>("idle");
  const [rasterLog, setRasterLog] = useState<string[]>([]);
  const [vectorLog, setVectorLog] = useState<string[]>([]);

  const refreshProjects = useCallback(() => {
    setProjectsLoading(true);
    void listProjects().then(setProjects).catch(() => setProjects([])).finally(() => setProjectsLoading(false));
  }, []);

  useEffect(() => { void getAppContext().then(setContext).catch(() => undefined); refreshProjects(); }, [refreshProjects]);
  useEffect(() => {
    if (!welcomeLeaving) return;
    const timer = window.setTimeout(() => { setActiveModule("projects"); setWelcomeVisible(false); setWelcomeLeaving(false); }, 860);
    return () => window.clearTimeout(timer);
  }, [welcomeLeaving]);

  const execute = useCallback(async (request: EngineRunRequest) => {
    const raster = request.kind === "raster";
    const setState = raster ? setRasterState : setVectorState;
    const setLog = raster ? setRasterLog : setVectorLog;
    const setOutput = raster ? setRasterOutput : setVectorOutput;
    const setProject = raster ? setRasterProjectPath : setVectorProjectPath;
    setState("running"); setLog(["Running the local Vapterz AI Open engine…"]);
    try {
      const result = await runEngine(request);
      if (!result.success) throw new Error(result.message);
      setCurrentProjectPath(result.projectPath); setProject(result.projectPath); setOutput(result.primaryOutput);
      setLog((current) => [...current, result.message]); setState("success"); setArtifactsVersion((value) => value + 1); refreshProjects();
    } catch (error) { setLog((current) => [...current, error instanceof Error ? error.message : String(error)]); setState("error"); }
  }, [refreshProjects]);

  function openProject(project: ProjectSummary) {
    setCurrentProjectPath(project.path);
    if (project.sourceType === "dxf") { setVectorInput(`${project.path}\\source\\${project.sourceName}`); setVectorProjectPath(project.path); setActiveModule("vector"); }
    else { setRasterInput(`${project.path}\\source\\${project.sourceName}`); setRasterProjectPath(project.path); setActiveModule("raster"); }
  }

  const idleColor: RunState = "idle";
  return <>
    <div className={`studio-shell-layer ${welcomeVisible ? welcomeLeaving ? "is-entering" : "is-awaiting" : ""}`} aria-hidden={welcomeVisible && !welcomeLeaving}>
      <Shell activeModule={activeModule} onModuleChange={setActiveModule}>
        {activeModule === "projects" && <ProjectsModule projects={projects} loading={projectsLoading} onRefresh={refreshProjects} onOpenModule={setActiveModule} onProjectSelected={openProject} />}
        {activeModule === "raster" && <RasterModule settings={rasterSettings} onSettingsChange={setRasterSettings} runState={rasterState} colorState={idleColor} projectPath={rasterProjectPath} inputPath={rasterInput} outputPath={rasterOutput} coloredOutputPath="" onInputPath={(path) => { setRasterInput(path); setRasterProjectPath(""); setRasterOutput(""); setRasterState("idle"); }} onRun={(request) => void execute(request)} onOpenArtifacts={() => setArtifactsOpen(true)} logLines={rasterLog} />}
        {activeModule === "vector" && <VectorModule settings={vectorSettings} onSettingsChange={setVectorSettings} runState={vectorState} colorState={idleColor} projectPath={vectorProjectPath} inputPath={vectorInput} outputPath={vectorOutput} coloredOutputPath="" onInputPath={(path) => { setVectorInput(path); setVectorProjectPath(""); setVectorOutput(""); setVectorState("idle"); setVectorSettings((value) => ({ ...value, outputName: defaultOutputName(path) })); }} onRun={(request) => void execute(request)} onOpenArtifacts={() => setArtifactsOpen(true)} onOpenDiagnostics={() => setArtifactsOpen(true)} logLines={vectorLog} />}
        {activeModule === "settings" && <SettingsModule context={context} />}
        <ArtifactDrawer projectPath={currentProjectPath} open={artifactsOpen} refreshKey={artifactsVersion} onClose={() => setArtifactsOpen(false)} />
      </Shell>
    </div>
    {welcomeVisible && <WelcomeScreen line={welcomeLine} leaving={welcomeLeaving} onEnter={() => setWelcomeLeaving(true)} />}
  </>;
}

function defaultOutputName(path: string) { return `${(path.split(/[\\/]/).at(-1) || "drawing").replace(/\.[^.]+$/, "")}_open`; }
