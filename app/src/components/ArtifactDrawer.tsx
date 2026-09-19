import { useCallback, useEffect, useMemo, useState } from "react";
import type { ArtifactItem } from "../types";
import { listArtifacts, revealPath } from "../services/desktop";
import { Icon } from "./Icon";

export function ArtifactDrawer({ projectPath, open, refreshKey, onClose }: { projectPath: string; open: boolean; refreshKey: number; onClose: () => void }) {
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!projectPath) {
      setArtifacts([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setArtifacts(await listArtifacts(projectPath));
    } catch (reason) {
      setArtifacts([]);
      setError(errorMessage(reason, "Could not load project artifacts."));
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh, refreshKey]);

  async function openItem(path: string, fallback: string) {
    setError("");
    try {
      await revealPath(path);
    } catch (reason) {
      setError(errorMessage(reason, fallback));
    }
  }

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(artifacts.map((artifact) => artifact.category)))],
    [artifacts],
  );
  const visible = filter === "all" ? artifacts : artifacts.filter((artifact) => artifact.category === filter);

  return (
    <div className={`drawer-backdrop ${open ? "is-open" : ""}`} onMouseDown={onClose} aria-hidden={!open}>
      <aside className="artifact-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">Current project</span>
            <h2>Run artifacts</h2>
          </div>
          <span className="drawer-header-actions">
            <button className="icon-button" onClick={() => void refresh()} aria-label="Refresh artifacts" disabled={loading}><Icon name="refresh" /></button>
            <button className="icon-button" onClick={onClose} aria-label="Close artifacts"><Icon name="close" /></button>
          </span>
        </header>
        <div className="drawer-filters">
          {categories.map((category) => (
            <button key={category} className={filter === category ? "is-active" : ""} onClick={() => setFilter(category)}>
              {category === "all" ? "All" : category}
            </button>
          ))}
        </div>
        <div className="artifact-list">
          {loading && <div className="drawer-loading"><span className="spinner" /> Loading project files…</div>}
          {!loading && visible.length === 0 && (
            <div className="empty-state empty-state--compact">
              <Icon name="artifacts" />
              <strong>No artifacts yet</strong>
              <span>Complete a run or select an existing project.</span>
            </div>
          )}
          {visible.map((artifact) => (
            <button key={artifact.path} className="artifact-row" onClick={() => void openItem(artifact.path, "Could not open this artifact.")}>
              <span className="artifact-icon"><Icon name="file" /></span>
              <span className="artifact-copy">
                <strong>{artifact.name}</strong>
                <small>{artifact.category} · {artifact.sizeLabel}</small>
              </span>
              <span className="artifact-extension">{artifact.extension}</span>
            </button>
          ))}
        </div>
        {error && <div className="native-action-error"><Icon name="warning" /><span>{error}</span></div>}
        {projectPath && (
          <button className="secondary-button drawer-folder-button" onClick={() => void openItem(projectPath, "Could not open the project folder.")}>
            <Icon name="folder" /> Open project folder
          </button>
        )}
      </aside>
    </div>
  );
}

function errorMessage(reason: unknown, fallback: string) {
  const detail = reason instanceof Error ? reason.message : String(reason || "");
  return detail ? `${fallback} ${detail}` : fallback;
}
