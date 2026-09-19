import { type ReactNode } from "react";
import { Icon } from "../components/Icon";
import { ModuleHeader } from "../components/Shell";
import { revealPath } from "../services/desktop";
import type { AppContext } from "../types";

export function SettingsModule({ context }: { context?: AppContext }) {
  return <div className="module-page settings-page">
    <ModuleHeader title="Open showcase settings" subtitle="Local-only public demonstration" badges={[{ label: "No network services", tone: "success" }]} />
    <section className="panel settings-content">
      <span className="eyebrow">Runtime</span><h2>Local engine</h2>
      <Setting title="Repository" detail="Fresh public repository with no private PlanVec history."><code>{context?.repositoryRoot || "Discovering…"}</code></Setting>
      <Setting title="Engine" detail="Synthetic/demo-safe Python raster and manual CAD implementation."><code>{context?.engineRoot || "Discovering…"}</code></Setting>
      <Setting title="Python" detail="Override with the VAPTERZ_PYTHON environment variable when required."><code>{context?.pythonPath || "python"}</code></Setting>
      <Setting title="Project workspace" detail="Generated examples and outputs remain local and ignored by Git."><button className="secondary-button" disabled={!context?.projectRoot} onClick={() => context?.projectRoot && void revealPath(context.projectRoot)}><Icon name="folder" /> Open workspace</button></Setting>
      <Setting title="CAD boundary" detail="Only raw layer discovery and explicit manual layer export are available."><span className="status-badge status-badge--success"><Icon name="lock" /> AI disabled</span></Setting>
      <Setting title="Raster model" detail="The included MLP parameters are hand-authored demonstration values, not production weights."><span className="status-badge status-badge--success"><Icon name="check" /> Synthetic-safe</span></Setting>
    </section>
  </div>;
}

function Setting({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return <div className="setting-block"><div><strong>{title}</strong><small>{detail}</small></div>{children}</div>;
}
