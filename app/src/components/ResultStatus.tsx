import { useState } from "react";
import type { RunState } from "../types";
import { revealGeneratedFile, revealPath } from "../services/desktop";
import { Icon } from "./Icon";
import { InfoTip } from "./InfoTip";

export function ResultStatus({
  state,
  title,
  detail,
  outputPath,
  cleanSvgPath,
  coloring,
  onOpenColoring,
}: {
  state: RunState;
  title: string;
  detail: string;
  outputPath?: string;
  cleanSvgPath?: string;
  coloring?: boolean;
  onOpenColoring?: () => void;
}) {
  const [actionError, setActionError] = useState("");
  const svgOutput = Boolean(cleanSvgPath?.toLowerCase().endsWith(".svg"));

  async function runNativeAction(action: () => Promise<void>, fallback: string) {
    setActionError("");
    try {
      await action();
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : String(reason || "");
      setActionError(detail ? `${fallback} ${detail}` : fallback);
    }
  }

  return (
    <div className={`run-status run-status--${state} ${outputPath ? "has-actions" : ""}`}>
      <Icon name={state === "error" ? "warning" : "check"} />
      <span className="run-status-copy">
        <strong>{title}</strong>
        <small title={detail}>{detail}</small>
      </span>
      {!outputPath && <InfoTip text="Generate an output to unlock Open SVG, output folder, and area-coloring actions." />}
      {outputPath && (
        <div className="result-actions" aria-label="Output actions">
          <button title="Open the generated file" onClick={() => void runNativeAction(() => revealPath(outputPath), "Could not open the generated file.")}>
            <Icon name="file" /><span>{outputPath.toLowerCase().endsWith(".svg") ? "Open SVG" : "Open output"}</span>
          </button>
          <button title="Show the generated file in its output directory" onClick={() => void runNativeAction(() => revealGeneratedFile(outputPath), "Could not open the output folder.")}>
            <Icon name="folder" /><span>Folder</span>
          </button>
          {svgOutput && onOpenColoring && (
            <button title="Review coloring settings and generate a separate colored SVG" disabled={coloring} onClick={onOpenColoring}>
              {coloring ? <span className="spinner" /> : <Icon name="palette" />}<span>{coloring ? "Coloring" : "Color"}</span>
            </button>
          )}
        </div>
      )}
      {actionError && <div className="native-action-error native-action-error--status"><Icon name="warning" /><span>{actionError}</span></div>}
    </div>
  );
}
