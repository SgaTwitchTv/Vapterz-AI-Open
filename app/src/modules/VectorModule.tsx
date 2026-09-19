import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { ModuleHeader, WorkflowSteps } from "../components/Shell";
import { PlanCanvas } from "../components/PlanCanvas";
import { ResultStatus } from "../components/ResultStatus";
import { InfoTip } from "../components/InfoTip";
import { VisualStandardSelect } from "../components/StandardSelectors";
import { chooseCadFile, inspectCadLayers, readPreview } from "../services/desktop";
import type {
  CadLayer,
  CadLayerDescendant,
  EngineRunRequest,
  ProcessModeId,
  RunState,
  VisualStandardId,
} from "../types";
import { PUBLIC_DEMO } from "../config/publicDemo";

export interface VectorSettings {
  standardId: VisualStandardId;
  processMode: ProcessModeId;
  layerMode: string;
  cropMode: string;
  wallCleanup: string;
  includeBeams: boolean;
  outputFormat: "svg" | "dxf" | "svg+dxf";
  generateColored: boolean;
  diagnostics: boolean;
  allowedClasses: string[];
  outputName: string;
}

const fallbackLayers: CadLayer[] = [
  { name: "A-WALL-____-OTLN", semanticRole: "Architecture", semanticGuess: "structure", entityCount: 1834, confidence: .98, selected: true, color: "#2f91ff" },
  { name: "A-DOOR-____-OTLN", semanticRole: "Doors", semanticGuess: "geometry", entityCount: 228, confidence: .96, selected: true, color: "#4dd59f" },
  { name: "M-EQPM-____-OTLN", semanticRole: "Equipment", semanticGuess: "geometry", entityCount: 496, confidence: .91, selected: true, color: "#ffc928" },
  { name: "S-GRID-____-OTLN", semanticRole: "Grid", semanticGuess: "geometry", entityCount: 120, confidence: .88, selected: true, color: "#b6c0cd" },
  { name: "A-FURN-____-OTLN", semanticRole: "Furniture", semanticGuess: "geometry", entityCount: 847, confidence: .84, selected: true, color: "#aa8cff" },
];

export function VectorModule({
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
  onOpenDiagnostics,
  onOpenColoring,
  logLines,
}: {
  settings: VectorSettings;
  onSettingsChange: (settings: VectorSettings) => void;
  runState: RunState;
  projectPath: string;
  inputPath: string;
  outputPath: string;
  coloredOutputPath: string;
  colorState: RunState;
  onInputPath: (path: string) => void;
  onRun: (request: EngineRunRequest) => void;
  onOpenArtifacts: () => void;
  onOpenDiagnostics: () => void;
  onOpenColoring?: () => void;
  logLines: string[];
}) {
  const [layers, setLayers] = useState<CadLayer[]>(() => fallbackLayers.map((layer) => ({
    ...layer,
    selected: PUBLIC_DEMO ? false : layer.selected,
  })));
  const [layerQuery, setLayerQuery] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [outputPreview, setOutputPreview] = useState<string>();
  const [settingsTab, setSettingsTab] = useState<"layers" | "output">("layers");
  const [addingLayer, setAddingLayer] = useState(false);
  const [manualLayerName, setManualLayerName] = useState("");
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(() => new Set());
  const patch = (changes: Partial<VectorSettings>) => onSettingsChange({ ...settings, ...changes });
  const running = runState === "running" || runState === "preparing";

  useEffect(() => {
    const previewPath = coloredOutputPath || outputPath;
    if (!previewPath) return setOutputPreview(undefined);
    void readPreview(previewPath).then(setOutputPreview).catch(() => setOutputPreview(undefined));
  }, [coloredOutputPath, outputPath, runState, colorState]);

  useEffect(() => {
    if (!inputPath) return;
    let cancelled = false;
    setInspecting(true);
    void inspectCadLayers(inputPath, PUBLIC_DEMO)
      .then((items) => {
        if (!cancelled && items.length) setLayers(items.map((layer) => ({
          ...layer,
          selected: PUBLIC_DEMO ? false : layerSelectedByMode(layer, settings.layerMode),
          semanticRole: PUBLIC_DEMO ? "CAD layer" : layer.semanticRole,
          confidence: PUBLIC_DEMO ? 1 : layer.confidence,
        })));
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setInspecting(false); });
    return () => { cancelled = true; };
  }, [inputPath]);

  const layerSearch = useMemo(() => buildLayerSearch(layers, layerQuery), [layers, layerQuery]);
  const visibleLayers = useMemo(
    () => layerSearch.query
      ? layers.filter((layer) => layerSearch.visibleRootNames.has(layer.name))
      : layers,
    [layerSearch, layers],
  );
  const selectedCount = layers.filter((layer) => layer.selected).length;
  const progressWindow = useMemo(
    () => cadProgressWindow(logLines, runState, settings.outputFormat, Boolean(inputPath)),
    [inputPath, logLines, runState, settings.outputFormat],
  );
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (runState === "idle") {
      setDisplayProgress(0);
      return;
    }
    if (runState === "success") {
      setDisplayProgress(100);
      return;
    }
    setDisplayProgress((current) => {
      if (runState === "preparing" || (current > 95 && progressWindow.ceiling <= 5)) return progressWindow.floor;
      return Math.max(current, progressWindow.floor);
    });
    if (runState === "error") return;

    const timer = window.setInterval(() => {
      setDisplayProgress((current) => {
        if (current >= progressWindow.ceiling) return current;
        const remaining = progressWindow.ceiling - current;
        return Math.min(progressWindow.ceiling, current + Math.max(.08, remaining * .025));
      });
    }, 180);
    return () => window.clearInterval(timer);
  }, [progressWindow.ceiling, progressWindow.floor, runState]);

  function chooseLayer(layerName: string, selected: boolean, entityCount = 0) {
    setLayers((current) => current.some((layer) => layer.name === layerName)
      ? current.map((layer) => layer.name === layerName ? { ...layer, selected } : layer)
      : [...current, {
        name: layerName,
        semanticRole: "Nested block layer",
        semanticGuess: "geometry",
        entityCount,
        confidence: 1,
        selected,
        color: "#7aa8c7",
      }]);
  }

  function chooseContainer(container: CadLayer, selected: boolean) {
    const descendants = (container.descendantLayers || []).filter((child) => child.name !== container.name);
    const selectedNames = new Set([container.name, ...descendants.map((child) => child.name)]);
    setLayers((current) => {
      const existingNames = new Set(current.map((layer) => layer.name));
      const updated = current.map((layer) => selectedNames.has(layer.name) ? { ...layer, selected } : layer);
      const missing = descendants
        .filter((child) => !existingNames.has(child.name))
        .map((child) => ({
          name: child.name,
          semanticRole: "Nested block layer",
          semanticGuess: "geometry",
          entityCount: child.entityCount,
          confidence: 1,
          selected,
          color: "#7aa8c7",
        }));
      return [...updated, ...missing];
    });
    if (selected) {
      setExpandedContainers((current) => new Set(current).add(container.name));
    }
  }

  function toggleContainer(layerName: string) {
    setExpandedContainers((current) => {
      const next = new Set(current);
      if (next.has(layerName)) next.delete(layerName);
      else next.add(layerName);
      return next;
    });
  }

  function run() {
    const selected = new Set(layers.filter((layer) => layer.selected).map((layer) => layer.name));
    const excluded = layers.filter((layer) => !selected.has(layer.name)).map((layer) => layer.name);
    onRun({
      kind: "vector",
      publicDemo: PUBLIC_DEMO,
      inputPath,
      projectPath,
      outputName: settings.outputName,
      standardId: settings.standardId,
      processMode: PUBLIC_DEMO ? "clean" : settings.processMode,
      preparationMode: "auto-safe",
      lineProfile: "auto",
      scale: 2,
      generateColored: false,
      diagnostics: PUBLIC_DEMO ? false : settings.diagnostics,
      layerMode: PUBLIC_DEMO ? "no-geometry" : settings.layerMode,
      cropMode: settings.cropMode,
      wallCleanup: PUBLIC_DEMO ? "none" : settings.wallCleanup,
      includeBeams: PUBLIC_DEMO ? false : settings.includeBeams,
      outputFormat: settings.outputFormat,
      addLayers: layers.filter((layer) => layer.selected).map((layer) => layer.name),
      excludeLayers: excluded,
      allowedClasses: settings.allowedClasses,
    });
  }

  function addManualLayer() {
    const name = manualLayerName.trim();
    if (!name) return;
    setLayers((current) => current.some((layer) => layer.name.toLowerCase() === name.toLowerCase())
      ? current.map((layer) => layer.name.toLowerCase() === name.toLowerCase() ? { ...layer, selected: true } : layer)
      : [...current, { name, semanticRole: "Manual include", semanticGuess: "geometry", entityCount: 0, confidence: 1, selected: true, color: "#52d4e8" }]);
    setManualLayerName("");
    setAddingLayer(false);
  }

  const activeStep = runState === "success" ? 4 : running ? 2 : inputPath ? 1 : 0;

  return (
    <div className="module-page workflow-page vector-page">
      <ModuleHeader
        title="Vector Transformation"
        subtitle={inputPath ? fileName(inputPath) : "Selected DXF layers to editable SVG"}
        badges={[{ label: PUBLIC_DEMO ? "Public demo · manual CAD" : "Offline ready", tone: "success" }]}
        actions={<button className="secondary-button" onClick={async () => { const path = await chooseCadFile(); if (path) onInputPath(path); }}><Icon name="folder" /> Select DXF</button>}
      />
      <WorkflowSteps steps={["Inspect", "Select", "Convert", "Review", "Export"]} activeIndex={activeStep} />

      <div className="workspace-grid workspace-grid--vector">
        <section className="workspace-canvas panel">
          <PlanCanvas outputPreview={outputPreview} mode="vector" onLayers={() => setSettingsTab("layers")} />
        </section>
        <aside className="inspector-column vector-inspector">
          <div className="segmented-control">
            <button className={settingsTab === "layers" ? "is-active" : ""} onClick={() => setSettingsTab("layers")}><Icon name="layers" /> Layers</button>
            <button className={settingsTab === "output" ? "is-active" : ""} onClick={() => setSettingsTab("output")}><Icon name="settings" /> Output</button>
          </div>
          {settingsTab === "layers" ? (
            <section className="inspector-card inspector-card--layers">
              <header><div><span className="eyebrow">Drawing structure</span><h3>CAD layers</h3></div><span className="count-chip">{selectedCount}/{layers.length}</span></header>
              <label className="search-field search-field--wide"><Icon name="search" /><input value={layerQuery} onChange={(event) => setLayerQuery(event.target.value)} placeholder="Search layers" />{inspecting && <span className="spinner" />}</label>
              <div className="layer-list">
                {visibleLayers.map((layer) => {
                  const allDescendants = (layer.descendantLayers || []).filter((child) => child.name !== layer.name);
                  const descendants = layerSearch.query
                    ? searchedDescendants(layer, layers, layerSearch)
                    : allDescendants;
                  const isContainer = Boolean(layer.isContainer && allDescendants.length);
                  const childSelection = allDescendants.map((child) => layers.find((candidate) => candidate.name === child.name)?.selected ?? false);
                  const allChildrenSelected = childSelection.length === 0 || childSelection.every(Boolean);
                  const anyChildSelected = childSelection.some(Boolean);
                  const fullySelected = layer.selected && allChildrenSelected;
                  const partiallySelected = !fullySelected && (layer.selected || anyChildSelected);
                  const expanded = isContainer && (expandedContainers.has(layer.name)
                    || Boolean(layerSearch.query && descendants.length));
                  return (
                    <div className="layer-tree-node" key={layer.name}>
                      <div className={`layer-row${isContainer ? " layer-row--container" : ""}`}>
                        {isContainer
                          ? <button className={`layer-expander${expanded ? " is-expanded" : ""}`} type="button" aria-label={`${expanded ? "Collapse" : "Expand"} ${layer.name}`} onClick={() => toggleContainer(layer.name)}><Icon name="chevron" /></button>
                          : <span className="layer-expander-spacer" />}
                        <LayerCheckbox
                          checked={isContainer ? fullySelected : layer.selected}
                          indeterminate={isContainer && partiallySelected}
                          label={`Include ${layer.name}`}
                          onChange={(selected) => isContainer ? chooseContainer(layer, selected) : chooseLayer(layer.name, selected)}
                        />
                        <span className="layer-color" style={{ background: layer.color }} />
                        <span className="layer-copy">
                          <strong title={layer.name}>{layer.name}</strong>
                          <small>{isContainer ? `Block container · ${layer.blockReferenceCount || layer.entityCount} refs · depth ${layer.maxBlockDepth || 1}` : PUBLIC_DEMO ? "Manual CAD layer" : `${layer.semanticRole} · ${Math.round(layer.confidence * 100)}%`}</small>
                        </span>
                        <span className="layer-count">{isContainer ? descendants.reduce((sum, child) => sum + child.entityCount, 0) : layer.entityCount}</span>
                        <Icon name={isContainer ? "folder" : "eye"} className="layer-eye" />
                      </div>
                      {expanded && (
                        <div className="layer-children" role="group" aria-label={`Layers referenced by ${layer.name}`}>
                          {!layerSearch.query && <div className="layer-block-summary" title={(layer.blockNames || []).join("\n")}>
                            <Icon name="folder" />
                            <span><strong>{(layer.blockNames || []).length} referenced block{(layer.blockNames || []).length === 1 ? "" : "s"}</strong><small>{(layer.blockNames || []).join(" · ") || "Unnamed CAD block"}</small></span>
                          </div>}
                          {descendants.map((child) => {
                            const childLayer = layers.find((candidate) => candidate.name === child.name);
                            const depth = child.minDepth === child.maxDepth ? `${child.minDepth}` : `${child.minDepth}–${child.maxDepth}`;
                            return (
                              <div className="layer-row layer-row--child" key={`${layer.name}/${child.name}`} style={{ paddingLeft: `${Math.max(0, child.minDepth - 1) * 12}px` }}>
                                <span className="layer-branch" />
                                <LayerCheckbox checked={childLayer?.selected ?? false} label={`Include nested layer ${child.name}`} onChange={(selected) => chooseLayer(child.name, selected, child.entityCount)} />
                                <span className="layer-color" style={{ background: childLayer?.color || "#7aa8c7" }} />
                                <span className="layer-copy"><strong title={child.name}>{child.name}</strong><small>{childLayer?.semanticRole || "Nested block layer"} · block depth {depth}</small></span>
                                <span className="layer-count">{child.entityCount}</span>
                                <Icon name="layers" className="layer-eye" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {addingLayer && <div className="manual-layer-form"><input autoFocus value={manualLayerName} onChange={(event) => setManualLayerName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addManualLayer(); if (event.key === "Escape") setAddingLayer(false); }} placeholder="Exact CAD layer name" /><button className="text-button" onClick={addManualLayer}>Add</button><button className="icon-button" aria-label="Cancel adding layer" onClick={() => setAddingLayer(false)}><Icon name="close" /></button></div>}
              {!addingLayer && <button className="text-button" onClick={() => setAddingLayer(true)}><Icon name="plus" /> Add missing layer</button>}
            </section>
          ) : (
            <>
              <section className="inspector-card">
                <header><div><span className="eyebrow">Geometry</span><h3>Drawing scope</h3></div><InfoTip text="The public showcase never classifies CAD content. It exports only layers explicitly selected by the user." /></header>
                <div className="public-demo-note"><Icon name="lock" /><span><strong>Manual selection only</strong><small>Return to Layers and tick every layer that should be exported.</small></span></div>
              </section>
              <section className="inspector-card">
                <header><div><span className="eyebrow">Presentation</span><h3>Output profile</h3></div><InfoTip text="The public showcase exports neutral editable SVG without a private client profile." /></header>
                <VisualStandardSelect value={settings.standardId} onChange={(standardId) => patch({ standardId })} />
                <div className="field-group"><label htmlFor="output-format">Deliverable</label><div className="select-wrap"><select id="output-format" value="svg" disabled><option value="svg">Editable SVG</option></select><Icon name="chevron" /></div></div>
                <div className="field-group"><div className="field-label-row"><label htmlFor="output-name">Output name</label><InfoTip text="Changing this name creates or overwrites a file inside the same project. Selecting another DXF starts another project." /></div><div className="output-name-field"><input id="output-name" value={settings.outputName} onChange={(event) => patch({ outputName: event.target.value })} placeholder={inputPath ? `${fileName(inputPath).replace(/\.[^.]+$/, "")}_clean_C` : "drawing_clean_C"} /><span>.{settings.outputFormat === "dxf" ? "dxf" : "svg"}</span></div></div>
              </section>
            </>
          )}
        </aside>
      </div>

      <footer className="action-dock">
        <button className="dock-drawer-button" onClick={onOpenArtifacts}><Icon name="artifacts" /> Artifacts <span>{outputPath ? "Ready" : "0"}</span><Icon name="chevron" /></button>
        <div className="primary-action-stack">
          <button className="primary-button" disabled={!inputPath || running || selectedCount === 0} title={inputPath && selectedCount === 0 ? "Select at least one CAD layer in the Layers panel." : undefined} onClick={run}>{running ? <span className="spinner spinner--dark" /> : <Icon name="sparkles" />}{running ? "Generating…" : selectedCount === 0 ? "Select a layer" : "Generate vector"}</button>
          <div className={`generation-progress generation-progress--${runState}`}>
            <div className="generation-progress-copy"><span>{progressWindow.label}</span><b>{Math.round(displayProgress)}%</b></div>
            <div className="generation-progress-track" role="progressbar" aria-label="Vector generation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(displayProgress)}><span style={{ width: `${displayProgress}%` }} /></div>
          </div>
        </div>
        <button className="secondary-button" disabled={!outputPath} onClick={onOpenDiagnostics}><Icon name="compare" /> Review output</button>
        <ResultStatus
          state={colorState === "error" ? "error" : runState}
          title={colorState === "running" || colorState === "preparing" ? "Coloring output" : coloredOutputPath ? "Colored SVG ready" : runState === "success" ? "Output ready" : inputPath ? `Ready · ${selectedCount} layers selected` : "Select a DXF drawing"}
          detail={logLines.at(-1) || `${settings.outputFormat.toUpperCase()} · ${settings.processMode}`}
          outputPath={coloredOutputPath || outputPath || undefined}
          cleanSvgPath={outputPath.toLowerCase().endsWith(".svg") ? outputPath : undefined}
          coloring={colorState === "running" || colorState === "preparing"}
          onOpenColoring={outputPath.toLowerCase().endsWith(".svg") ? onOpenColoring : undefined}
        />
      </footer>
    </div>
  );
}

function fileName(path: string) { return path.split(/[\\/]/).at(-1) || path; }

interface LayerSearchResult {
  query: string;
  visibleRootNames: Set<string>;
  descendantNamesByContainer: Map<string, string[]>;
  descendantDepthsByContainer: Map<string, Map<string, number>>;
}

function buildLayerSearch(layers: CadLayer[], rawQuery: string): LayerSearchResult {
  const query = rawQuery.trim().toLowerCase();
  const visibleRootNames = new Set<string>();
  const descendantNamesByContainer = new Map<string, string[]>();
  const descendantDepthsByContainer = new Map<string, Map<string, number>>();
  if (!query) return { query, visibleRootNames, descendantNamesByContainer, descendantDepthsByContainer };

  const layerByName = new Map(layers.map((layer) => [layer.name, layer]));
  const nestedMatches = new Set<string>();
  for (const container of layers) {
    if (!container.isContainer) continue;
    const orderedNames: string[] = [];
    const depths = new Map<string, number>();
    const addAncestorPath = (path: string[], targetIndex: number) => {
      for (let index = 1; index <= targetIndex; index += 1) {
        const name = path[index];
        if (!name || name === container.name) continue;
        if (!depths.has(name)) orderedNames.push(name);
        depths.set(name, Math.min(depths.get(name) ?? index, index));
        nestedMatches.add(name);
      }
    };

    for (const child of container.descendantLayers || []) {
      const paths = child.paths?.length ? child.paths : [[container.name, child.name]];
      for (const candidatePath of paths) {
        const path = candidatePath[0] === container.name
          ? candidatePath
          : [container.name, ...candidatePath];
        for (let index = 1; index < path.length; index += 1) {
          if (layerMatchesQuery(layerByName.get(path[index]), path[index], query)) {
            addAncestorPath(path, index);
          }
        }
      }
    }

    const containerMatch = layerMatchesQuery(container, container.name, query)
      || (container.blockNames || []).some((blockName) => blockName.toLowerCase().includes(query));
    if (containerMatch || orderedNames.length) visibleRootNames.add(container.name);
    if (orderedNames.length) {
      descendantNamesByContainer.set(container.name, orderedNames);
      descendantDepthsByContainer.set(container.name, depths);
    }
  }

  for (const layer of layers) {
    if (layerMatchesQuery(layer, layer.name, query) && !nestedMatches.has(layer.name)) {
      visibleRootNames.add(layer.name);
    }
  }

  return { query, visibleRootNames, descendantNamesByContainer, descendantDepthsByContainer };
}

function layerMatchesQuery(layer: CadLayer | undefined, fallbackName: string, query: string) {
  return `${fallbackName} ${layer?.semanticRole || ""} ${layer?.semanticGuess || ""}`
    .toLowerCase()
    .includes(query);
}

function searchedDescendants(
  container: CadLayer,
  layers: CadLayer[],
  search: LayerSearchResult,
): CadLayerDescendant[] {
  const names = search.descendantNamesByContainer.get(container.name) || [];
  const depths = search.descendantDepthsByContainer.get(container.name) || new Map<string, number>();
  const knownDescendants = new Map((container.descendantLayers || []).map((child) => [child.name, child]));
  const knownLayers = new Map(layers.map((layer) => [layer.name, layer]));
  return names.map((name) => {
    const child = knownDescendants.get(name);
    const directLayer = knownLayers.get(name);
    const depth = depths.get(name) || child?.minDepth || 1;
    return {
      name,
      entityCount: child?.entityCount ?? directLayer?.entityCount ?? 0,
      minDepth: depth,
      maxDepth: depth,
      paths: child?.paths,
    };
  });
}

function LayerCheckbox({ checked, indeterminate = false, label, onChange }: { checked: boolean; indeterminate?: boolean; label: string; onChange: (checked: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label className="layer-check" title={indeterminate ? "Some nested layers are selected" : undefined}>
      <input ref={ref} type="checkbox" checked={checked} aria-label={label} onChange={(event) => onChange(event.target.checked)} />
      <span className="check-box"><Icon name={indeterminate ? "minimize" : "check"} /></span>
    </label>
  );
}

function layerSelectedByMode(layer: CadLayer, mode: string) {
  const semantic = layer.semanticGuess.toLowerCase();
  if (mode === "no-geometry") return false;
  if (mode === "structure") return semantic === "structure";
  if (mode === "architecture") return semantic === "structure" || semantic === "geometry";
  return semantic !== "annotation";
}

interface CadProgressWindow {
  floor: number;
  ceiling: number;
  label: string;
}

const svgStageStarts = [4, 12, 56, 63, 76, 85, 91, 96];
const svgStageCeilings = [11, 55, 62, 75, 84, 90, 95, 99];
const dxfStageStarts = [4, 14, 60, 68, 82, 92];
const dxfStageCeilings = [13, 59, 67, 81, 91, 99];

function cadProgressWindow(
  logLines: string[],
  runState: RunState,
  outputFormat: VectorSettings["outputFormat"],
  hasInput: boolean,
): CadProgressWindow {
  if (runState === "idle") return { floor: 0, ceiling: 0, label: hasInput ? "Ready to generate" : "Waiting for DXF" };
  if (runState === "success") return { floor: 100, ceiling: 100, label: "Generation complete" };
  if (runState === "preparing") return { floor: 2, ceiling: 4, label: "Preparing local engine" };

  let latest: { line: string; stage: number; total: number; isDxf: boolean; complete: boolean } | undefined;
  for (const line of logLines) {
    const match = line.match(/CAD( DXF)? stage (\d+)\/(\d+)( complete)?:\s*(.+)/i);
    if (!match) continue;
    latest = {
      line: match[5].trim(),
      stage: Number(match[2]),
      total: Number(match[3]),
      isDxf: Boolean(match[1]),
      complete: Boolean(match[4]),
    };
  }

  if (!latest) {
    const preparingDxf = outputFormat === "svg+dxf" && logLines.some((line) => line.includes("Clean DXF transformation"));
    return preparingDxf
      ? { floor: 70, ceiling: 72, label: "Preparing cleaned DXF" }
      : { floor: 3, ceiling: 5, label: "Starting vector engine" };
  }

  const starts = latest.isDxf ? dxfStageStarts : svgStageStarts;
  const ceilings = latest.isDxf ? dxfStageCeilings : svgStageCeilings;
  const fallbackStart = 4 + ((latest.stage - 1) / Math.max(1, latest.total)) * 92;
  const fallbackCeiling = 4 + (latest.stage / Math.max(1, latest.total)) * 95;
  let floor = starts[latest.stage - 1] ?? fallbackStart;
  let ceiling = ceilings[latest.stage - 1] ?? fallbackCeiling;
  if (latest.complete) floor = ceiling;

  if (outputFormat === "svg+dxf") {
    if (latest.isDxf) {
      floor = 70 + floor * .3;
      ceiling = 70 + ceiling * .3;
    } else {
      floor *= .7;
      ceiling *= .7;
    }
  }

  return {
    floor,
    ceiling,
    label: `${latest.isDxf ? "DXF" : "SVG"} ${latest.stage}/${latest.total} · ${friendlyStageLabel(latest.line)}`,
  };
}

function friendlyStageLabel(label: string) {
  const clean = label.replace(/^complete:\s*/i, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
