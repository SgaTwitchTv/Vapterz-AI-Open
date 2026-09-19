import type { SVGProps } from "react";

export type IconName =
  | "projects"
  | "raster"
  | "vector"
  | "training"
  | "settings"
  | "search"
  | "layers"
  | "sparkles"
  | "compare"
  | "folder"
  | "chevron"
  | "check"
  | "warning"
  | "info"
  | "close"
  | "minimize"
  | "maximize"
  | "pan"
  | "fit"
  | "diagnostics"
  | "artifacts"
  | "file"
  | "play"
  | "refresh"
  | "plus"
  | "eye"
  | "lock"
  | "cpu"
  | "shield"
  | "palette";

const paths: Record<IconName, React.ReactNode> = {
  projects: <><path d="M3.5 7.5h6l2-2h9v13h-17z"/><path d="M3.5 9.5h17"/></>,
  raster: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.6"/><path d="m5 18 5-5 3 3 2.5-2.5L20 18"/></>,
  vector: <><path d="M5 18 9 6l3 3 3-3 4 12"/><circle cx="5" cy="18" r="1.5"/><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="19" cy="18" r="1.5"/><path d="M8 18h8M12 9v9"/></>,
  training: <><path d="m3 9 9-5 9 5-9 5z"/><path d="M7 12v5c3 2 7 2 10 0v-5M21 9v6"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7-.7-2H8l-.7 2-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2h3l.7-2 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7z"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
  layers: <><path d="m4 8 8-4 8 4-8 4z"/><path d="m4 12 8 4 8-4M4 16l8 4 8-4"/></>,
  sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2zM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8zM19 13l.6 1.4 1.4.6-1.4.6L19 17l-.6-1.4L17 15l1.4-.6z"/></>,
  compare: <><path d="M7 4H4v16h3M17 4h3v16h-3M9 7v10M15 7v10"/></>,
  folder: <path d="M3 7h6l2-2h10v14H3z"/>,
  chevron: <path d="m8 10 4 4 4-4"/>,
  check: <path d="m5 12 4 4 10-10"/>,
  warning: <><path d="m12 3 9 17H3z"/><path d="M12 9v4M12 17h.01"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  minimize: <path d="M6 16h12"/>,
  maximize: <rect x="5" y="5" width="14" height="14" rx="1"/>,
  pan: <><path d="M8 11V7a2 2 0 0 1 4 0v4-6a2 2 0 0 1 4 0v7-4a2 2 0 0 1 4 0v7c0 4-3 6-7 6h-1c-3 0-5-2-7-5l-2-3a2 2 0 0 1 3-2l2 2"/></>,
  fit: <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>,
  diagnostics: <path d="M3 13h4l2-6 4 11 3-7 2 2h3"/>,
  artifacts: <><path d="m4 8 8-4 8 4-8 4z"/><path d="M4 8v9l8 4 8-4V8M12 12v9"/></>,
  file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/></>,
  play: <path d="m8 5 11 7-11 7z"/>,
  refresh: <><path d="M20 7v5h-5"/><path d="M18 16a8 8 0 1 1 1.8-8.6L20 12"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  eye: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12"/><circle cx="12" cy="12" r="2.5"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  cpu: <><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/></>,
  shield: <><path d="m12 3 8 3v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/><path d="m8 12 3 3 5-6"/></>,
  palette: <><path d="M12 3a9 9 0 0 0 0 18h1.2a1.8 1.8 0 0 0 1.4-2.9l-.4-.5a1.8 1.8 0 0 1 1.4-2.9H18A3 3 0 0 0 21 12a9 9 0 0 0-9-9Z"/><circle cx="7.5" cy="10" r="1"/><circle cx="10" cy="6.8" r="1"/><circle cx="15" cy="7.5" r="1"/></>,
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

export function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span className="brand-wing brand-wing--sky" />
      <span className="brand-wing brand-wing--blue" />
      <span className="brand-core" />
    </div>
  );
}
