import { useMemo, useState } from "react";
import type { ModuleId, ProjectSummary } from "../types";
import { Icon } from "../components/Icon";
import { ModuleHeader } from "../components/Shell";
import { chooseProjectFolder, revealPath } from "../services/desktop";

export function ProjectsModule({
  projects,
  loading,
  onRefresh,
  onOpenModule,
  onProjectSelected,
}: {
  projects: ProjectSummary[];
  loading: boolean;
  onRefresh: () => void;
  onOpenModule: (module: ModuleId) => void;
  onProjectSelected: (project: ProjectSummary) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () => projects.filter((project) => `${project.name} ${project.sourceName}`.toLowerCase().includes(query.toLowerCase())),
    [projects, query],
  );

  return (
    <div className="module-page projects-page">
      <ModuleHeader
        title="Projects"
        subtitle="Create, continue and verify local Vapterz work"
        badges={[{ label: "Local workspace", tone: "success" }]}
        actions={
          <button className="secondary-button" onClick={async () => {
            const folder = await chooseProjectFolder();
            if (folder) void revealPath(folder);
          }}><Icon name="folder" /> Open folder</button>
        }
      />

      <section className="module-launch-grid">
        <button className="module-launch-card module-launch-card--raster" onClick={() => onOpenModule("raster")}>
          <span className="launch-icon"><Icon name="raster" /></span>
          <span className="launch-index">Module 1</span>
          <strong>Raster Transformation</strong>
          <p>Prepare PNG/JPG floorplans and generate editable SVG output.</p>
          <span className="launch-action">Start raster workflow <span>→</span></span>
        </button>
        <button className="module-launch-card module-launch-card--vector" onClick={() => onOpenModule("vector")}>
          <span className="launch-icon"><Icon name="vector" /></span>
          <span className="launch-index">Module 2</span>
          <strong>Vector Transformation</strong>
          <p>Inspect a DXF and export only the layers selected by the user.</p>
          <span className="launch-action">Start vector workflow <span>→</span></span>
        </button>
      </section>

      <section className="recent-projects panel">
        <header className="section-header">
          <div>
            <span className="eyebrow">Workspace</span>
            <h2>Recent projects</h2>
          </div>
          <div className="section-actions">
            <label className="search-field">
              <Icon name="search" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" />
            </label>
            <button className="icon-button" onClick={onRefresh} aria-label="Refresh projects"><Icon name="refresh" /></button>
          </div>
        </header>
        <div className="project-table" role="table">
          <div className="project-table-head" role="row">
            <span>Project</span><span>Source</span><span>Artifacts</span><span>Updated</span><span>Status</span><span />
          </div>
          {loading && <div className="loading-row"><span className="spinner" /> Loading local projects…</div>}
          {!loading && visible.length === 0 && (
            <div className="empty-state">
              <Icon name="projects" />
              <strong>{projects.length ? "No matching projects" : "No projects discovered"}</strong>
              <span>Start Raster or Vector Transformation to create the first project.</span>
            </div>
          )}
          {visible.slice(0, 12).map((project) => (
            <button className="project-row" role="row" key={project.path} onClick={() => onProjectSelected(project)}>
              <span className="project-name-cell"><span className="project-file-icon"><Icon name={project.sourceType === "dxf" ? "vector" : "raster"} /></span><strong>{project.name}</strong></span>
              <span>{project.sourceName || "Unknown source"}</span>
              <span>{project.artifactCount}</span>
              <span>{project.updatedLabel}</span>
              <span><span className={`table-status table-status--${project.status}`}>{project.status}</span></span>
              <span className="row-arrow">→</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
