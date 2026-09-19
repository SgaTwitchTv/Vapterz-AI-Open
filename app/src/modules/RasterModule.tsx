import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { ModuleHeader, WorkflowSteps } from "../components/Shell";
import { PlanCanvas } from "../components/PlanCanvas";
import { ResultStatus } from "../components/ResultStatus";
import { VisualStandardSelect } from "../components/StandardSelectors";
import { chooseRasterFile, readPreview } from "../services/desktop";
import type { EngineRunRequest, RunState, VisualStandardId } from "../types";

export interface RasterSettings {
  standardId: VisualStandardId;
  preparationMode: string;
  lineProfile: string;
  scale: number;
  generateColored: boolean;
  diagnostics: boolean;
}

export function RasterModule({
  settings,
  onSettingsChange,
  runState,
  projectPath,
  inputPath,
  outputPath,
  coloredOutputPath,
  colorState,
  onInputPath,
  onRun,
  onOpenArtifacts,
  onOpenColoring,
  logLines,
}: {
  settings: RasterSettings;
  onSettingsChange: (settings: RasterSettings) => void;
  runState: RunState;
  projectPath: string;
  inputPath: string;
  outputPath: string;
  coloredOutputPath: string;
  colorState: RunState;
  onInputPath: (path: string) => void;
  onRun: (request: EngineRunRequest) => void;
  onOpenArtifacts: () => void;
  onOpenColoring?: () => void;
  logLines: string[];
}) {
  const [sourcePreview, setSourcePreview] = useState<string>();
  const [outputPreview, setOutputPreview] = useState<string>();
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!inputPath) return setSourcePreview(undefined);
    void readPreview(inputPath).then(setSourcePreview).catch(() => setSourcePreview(undefined));
  }, [inputPath]);
  useEffect(() => {
    const previewPath = coloredOutputPath || outputPath;
    if (!previewPath) return setOutputPreview(undefined);
    void readPreview(previewPath).then(setOutputPreview).catch(() => setOutputPreview(undefined));
  }, [coloredOutputPath, outputPath, runState, colorState]);

  const running = runState === "running" || runState === "preparing";
  const activeStep = runState === "success" ? 3 : running ? 2 : inputPath ? 1 : 0;
  const patch = (changes: Partial<RasterSettings>) => onSettingsChange({ ...settings, ...changes });

  function run() {
    onRun({
      kind: "raster",
      inputPath,
      projectPath,
      standardId: settings.standardId,
      processMode: "clean",
      preparationMode: settings.preparationMode,
      lineProfile: settings.lineProfile,
      scale: settings.scale,
      generateColored: false,
      diagnostics: settings.diagnostics,
      layerMode: "structure",
      cropMode: "auto",
      wallCleanup: "none",
      includeBeams: false,
      outputFormat: "svg",
      addLayers: [],
      excludeLayers: [],
      allowedClasses: [],
    });
  }

  return (
    <div className="module-page workflow-page">
      <ModuleHeader
        title="Raster Transformation"
        subtitle={inputPath ? fileName(inputPath) : "PNG/JPG to editable SVG"}
        badges={[{ label: "Offline ready", tone: "success" }]}
        actions={<button className="secondary-button" onClick={async () => { const path = await chooseRasterFile(); if (path) onInputPath(path); }}><Icon name="folder" /> Select image</button>}
      />
      <WorkflowSteps steps={["Source", "Prepare", "Vectorize", "Verify"]} activeIndex={activeStep} />

      <div className="workspace-grid">
        <section className="workspace-canvas panel">
          <PlanCanvas sourcePreview={sourcePreview} outputPreview={outputPreview} compare={Boolean(sourcePreview && outputPreview)} mode="raster" />
        </section>
        <aside className="inspector-column">
          <section className="inspector-card">
            <header><div><span className="eyebrow">Automatic preparation</span><h3>Vector-ready image</h3></div><span className="recommended-chip">Recommended</span></header>
            <div className="field-group">
              <label htmlFor="preparation-mode">Preparation strategy</label>
              <div className="select-wrap"><select id="preparation-mode" value="auto-safe" disabled><option value="auto-safe">Open demo pipeline</option></select><Icon name="chevron" /></div>
              <p className="field-description">Applies local grayscale normalization, denoising, sharpening, thresholding and conservative contour filtering.</p>
            </div>
            <button className="text-button" onClick={() => setShowDetails((value) => !value)}>{showDetails ? "Hide preparation details" : "Show preparation details"} <Icon name="chevron" /></button>
            {showDetails && <div className="details-grid"><label>Geometry filter<div className="select-wrap"><select value="demo-mlp" disabled><option value="demo-mlp">Bundled demo MLP</option></select><Icon name="chevron" /></div></label><label>Working scale<div className="select-wrap"><select value={settings.scale} onChange={(event) => patch({ scale: Number(event.target.value) })}><option value="1">1.0×</option><option value="1.5">1.5×</option><option value="2">2.0×</option></select><Icon name="chevron" /></div></label></div>}
          </section>
          <section className="inspector-card">
            <header><div><span className="eyebrow">Presentation</span><h3>Output profile</h3></div></header>
            <VisualStandardSelect value={settings.standardId} onChange={(standardId) => patch({ standardId })} />
          </section>
          <section className="inspector-card">
            <header><div><span className="eyebrow">Open demo</span><h3>Model disclosure</h3></div></header>
            <p className="field-description">Contour filtering uses the included from-scratch MLP with hand-authored demonstration parameters. No production weights or private training material are included.</p>
          </section>
          <QualityCard state={runState} hasInput={Boolean(inputPath)} />
        </aside>
      </div>

      <footer className="action-dock">
        <button className="dock-drawer-button" onClick={onOpenArtifacts}><Icon name="artifacts" /> Artifacts <span>{outputPath ? "Ready" : "0"}</span><Icon name="chevron" /></button>
        <button className="primary-button" disabled={!inputPath || running} onClick={run}>{running ? <span className="spinner spinner--dark" /> : <Icon name="sparkles" />}{running ? "Generating…" : "Generate SVG"}</button>
        <button className="secondary-button" onClick={() => setShowDetails(true)}><Icon name="settings" /> Review settings</button>
        <ResultStatus
          state={colorState === "error" ? "error" : runState}
          title={colorState === "running" || colorState === "preparing" ? "Coloring output" : coloredOutputPath ? "Colored SVG ready" : statusTitle(runState, Boolean(inputPath))}
          detail={logLines.at(-1) || "Settings and engine remain local."}
          outputPath={coloredOutputPath || outputPath || undefined}
          cleanSvgPath={outputPath || undefined}
          coloring={colorState === "running" || colorState === "preparing"}
          onOpenColoring={outputPath ? onOpenColoring : undefined}
        />
      </footer>
    </div>
  );
}

function QualityCard({ state, hasInput }: { state: RunState; hasInput: boolean }) {
  const complete = state === "success";
  return <section className="quality-card"><div className="score-ring" style={{ "--score": complete ? "360deg" : "0deg" } as React.CSSProperties}><span>{complete ? "✓" : "—"}</span></div><div><span className="eyebrow">Local pipeline</span><strong>{complete ? "Generation complete" : hasInput ? "Input ready" : "Waiting for source"}</strong><small>Deterministic open-demo processing</small></div></section>;
}

function fileName(path: string) { return path.split(/[\\/]/).at(-1) || path; }
function statusTitle(state: RunState, hasInput: boolean) {
  if (state === "running" || state === "preparing") return "Local engine running";
  if (state === "success") return "Generation completed";
  if (state === "error") return "Run needs attention";
  return hasInput ? "Ready to generate" : "Select a source image";
}
