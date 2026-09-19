import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ReactNode } from "react";
import { BrandMark, Icon, type IconName } from "./Icon";
import type { ModuleId } from "../types";
import { desktopAvailable } from "../services/desktop";

const navigation: Array<{ id: ModuleId; label: string; icon: IconName }> = [
  { id: "projects", label: "Projects", icon: "projects" },
  { id: "raster", label: "Raster", icon: "raster" },
  { id: "vector", label: "Vector", icon: "vector" },
];

interface ShellProps {
  activeModule: ModuleId;
  onModuleChange: (module: ModuleId) => void;
  children: ReactNode;
}

async function windowAction(action: "minimize" | "maximize" | "close") {
  if (!desktopAvailable()) return;
  const window = getCurrentWindow();
  if (action === "minimize") await window.minimize();
  if (action === "maximize") await window.toggleMaximize();
  if (action === "close") await window.close();
}

export function Shell({ activeModule, onModuleChange, children }: ShellProps) {
  return (
    <div className="app-frame">
      <AppTitlebar />

      <div className="app-body">
        <aside className="module-rail">
          <nav aria-label="Main modules">
            {navigation.map((item) => (
              <button
                key={item.id}
                className={`module-link ${activeModule === item.id ? "is-active" : ""}`}
                onClick={() => onModuleChange(item.id)}
                aria-current={activeModule === item.id ? "page" : undefined}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <button
            className={`module-link module-link--settings ${activeModule === "settings" ? "is-active" : ""}`}
            onClick={() => onModuleChange("settings")}
            aria-label="Settings"
          >
            <Icon name="settings" />
          </button>
        </aside>

        <main className="module-stage">{children}</main>
      </div>
    </div>
  );
}

export function AppTitlebar() {
  return (
    <header className="titlebar" data-tauri-drag-region onDoubleClick={() => void windowAction("maximize")}>
      <div className="brand" data-tauri-drag-region>
        <BrandMark />
        <span className="brand-name">Vapterz</span>
        <span className="brand-product">AI Open</span>
      </div>
      <div className="window-controls" onDoubleClick={(event) => event.stopPropagation()}>
        <button aria-label="Minimize" onClick={() => void windowAction("minimize")}><Icon name="minimize" /></button>
        <button aria-label="Maximize" onClick={() => void windowAction("maximize")}><Icon name="maximize" /></button>
        <button className="window-close" aria-label="Close" onClick={() => void windowAction("close")}><Icon name="close" /></button>
      </div>
    </header>
  );
}

export function ModuleHeader({
  title,
  subtitle,
  badges,
  actions,
}: {
  title: string;
  subtitle?: string;
  badges?: Array<{ label: string; tone: "success" | "warning" | "info" }>;
  actions?: ReactNode;
}) {
  return (
    <header className="module-header">
      <div className="module-heading">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {badges?.map((badge) => (
          <span key={badge.label} className={`status-badge status-badge--${badge.tone}`}>
            {badge.tone === "success" && <Icon name="check" />}
            {badge.tone === "warning" && <Icon name="warning" />}
            {badge.tone === "info" && <Icon name="info" />}
            {badge.label}
          </span>
        ))}
      </div>
      {actions && <div className="module-header-actions">{actions}</div>}
    </header>
  );
}

export function WorkflowSteps({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return (
    <div className="workflow-steps" aria-label="Workflow progress">
      {steps.map((step, index) => (
        <div
          key={step}
          className={`workflow-step ${index < activeIndex ? "is-complete" : ""} ${index === activeIndex ? "is-current" : ""}`}
        >
          <span className="workflow-dot">{index < activeIndex ? <Icon name="check" /> : index + 1}</span>
          <span>{step}</span>
          {index < steps.length - 1 && <span className="workflow-line" />}
        </div>
      ))}
    </div>
  );
}
