import { PROCESS_MODES, VISUAL_STANDARDS, processMode, visualStandard } from "../design/standards";
import type { ProcessModeId, VisualStandardId } from "../types";
import { Icon } from "./Icon";
import { InfoTip } from "./InfoTip";

export function VisualStandardSelect({
  value,
  onChange,
  id = "visual-standard",
}: {
  value: VisualStandardId;
  onChange: (value: VisualStandardId) => void;
  id?: string;
}) {
  const selected = visualStandard(value);
  return (
    <div className="field-group">
      <div className="field-label-row">
        <label htmlFor={id}>Visual standard</label>
        <InfoTip text={selected.description} />
      </div>
      <div className="select-wrap">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as VisualStandardId)}
        >
          {VISUAL_STANDARDS.map((standard) => (
            <option key={standard.id} value={standard.id}>{standard.label}</option>
          ))}
        </select>
        <Icon name="chevron" />
      </div>
      <p className="field-description">{selected.description}</p>
    </div>
  );
}

export function ProcessModeSelect({
  value,
  onChange,
}: {
  value: ProcessModeId;
  onChange: (value: ProcessModeId) => void;
}) {
  const selected = processMode(value);
  return (
    <div className="field-group">
      <div className="field-label-row">
        <label htmlFor="process-mode">Processing mode</label>
        {selected.risk === "review" && <span className="review-chip">Review output</span>}
      </div>
      <div className="select-wrap">
        <select
          id="process-mode"
          value={value}
          onChange={(event) => onChange(event.target.value as ProcessModeId)}
        >
          {PROCESS_MODES.map((mode) => (
            <option key={mode.id} value={mode.id}>{mode.label}</option>
          ))}
        </select>
        <Icon name="chevron" />
      </div>
      <p className="field-description">{selected.description}</p>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-track"><span /></span>
    </label>
  );
}
