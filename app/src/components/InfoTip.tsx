import { Icon } from "./Icon";

export function InfoTip({ text, align = "right" }: { text: string; align?: "left" | "right" }) {
  return (
    <span className={`info-tip info-tip--${align}`} tabIndex={0} aria-label={text}>
      <Icon name="info" />
      <span className="info-tip-bubble" role="tooltip">{text}</span>
    </span>
  );
}
