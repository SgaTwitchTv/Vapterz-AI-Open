import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

const MIN_ZOOM = .35;
const MAX_ZOOM = 2.2;

type Point = { x: number; y: number };
type MediaSize = { width: number; height: number };

function distanceBetween(first: Point, second: Point) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function PlanCanvas({
  sourcePreview,
  outputPreview,
  compare = false,
  mode = "vector",
  onLayers,
}: {
  sourcePreview?: string;
  outputPreview?: string;
  compare?: boolean;
  mode?: "raster" | "vector";
  onLayers?: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [divider, setDivider] = useState(50);
  const [panEnabled, setPanEnabled] = useState(false);
  const [panning, setPanning] = useState(false);
  const [pinching, setPinching] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const sourceSizeRef = useRef<MediaSize>({ width: 0, height: 0 });
  const outputSizeRef = useRef<MediaSize>({ width: 0, height: 0 });
  const zoomRef = useRef(1);
  const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const touchPointsRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  useEffect(() => {
    sourceSizeRef.current = { width: 0, height: 0 };
    outputSizeRef.current = { width: 0, height: 0 };
    zoomRef.current = 1;
    touchPointsRef.current.clear();
    pinchRef.current = null;
    setFrameSize({ width: 0, height: 0 });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setPinching(false);
  }, [sourcePreview, outputPreview]);

  const preview = outputPreview || sourcePreview;
  const transform = `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`;

  const fitMediaFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const natural = compare && outputSizeRef.current.width > 0
      ? outputSizeRef.current
      : sourceSizeRef.current.width > 0
        ? sourceSizeRef.current
        : outputSizeRef.current;
    if (!canvas || natural.width <= 0 || natural.height <= 0) return;
    const gutter = Math.max(14, Math.min(28, Math.min(canvas.clientWidth, canvas.clientHeight) * .025));
    const availableWidth = Math.max(1, canvas.clientWidth - gutter * 2);
    const availableHeight = Math.max(1, canvas.clientHeight - gutter * 2);
    const fit = Math.min(availableWidth / natural.width, availableHeight / natural.height);
    setFrameSize({ width: Math.max(1, natural.width * fit), height: Math.max(1, natural.height * fit) });
  }, [compare]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(fitMediaFrame);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [fitMediaFrame]);

  function rememberNaturalSize(kind: "source" | "output", event: React.SyntheticEvent<HTMLImageElement>) {
    const target = kind === "source" ? sourceSizeRef : outputSizeRef;
    target.current = {
      width: event.currentTarget.naturalWidth || 1600,
      height: event.currentTarget.naturalHeight || 1000,
    };
    fitMediaFrame();
  }

  const clampOffset = useCallback((candidate: Point, zoomValue: number) => {
    const canvas = canvasRef.current;
    if (!canvas || frameSize.width <= 0 || frameSize.height <= 0) return candidate;
    const scaledWidth = frameSize.width * zoomValue;
    const scaledHeight = frameSize.height * zoomValue;
    // Keep a small grip of the drawing visible, but otherwise allow free
    // traversal even when the complete fitted drawing is smaller than the canvas.
    const visibleGripX = Math.min(64, scaledWidth / 2);
    const visibleGripY = Math.min(64, scaledHeight / 2);
    const maxX = Math.max(0, (canvas.clientWidth + scaledWidth) / 2 - visibleGripX);
    const maxY = Math.max(0, (canvas.clientHeight + scaledHeight) / 2 - visibleGripY);
    return {
      x: Math.min(maxX, Math.max(-maxX, candidate.x)),
      y: Math.min(maxY, Math.max(-maxY, candidate.y)),
    };
  }, [frameSize.height, frameSize.width]);

  const applyZoom = useCallback((requestedZoom: number) => {
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, requestedZoom));
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    setOffset((current) => clampOffset(current, nextZoom));
  }, [clampOffset]);

  function startPan(event: React.PointerEvent<HTMLDivElement>) {
    if (!panEnabled || !preview || event.button !== 0) return;
    if ((event.target as Element).closest("[data-canvas-control]")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: offset.x, y: offset.y, startX: event.clientX, startY: event.clientY };
    setPanning(true);
  }

  function movePan(event: React.PointerEvent<HTMLDivElement>) {
    if (!panning) return;
    setOffset(clampOffset({
      x: dragRef.current.x + event.clientX - dragRef.current.startX,
      y: dragRef.current.y + event.clientY - dragRef.current.startY,
    }, zoomRef.current));
  }

  function stopPan(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (panning) setPanning(false);
  }

  function resetView() {
    zoomRef.current = 1;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    fitMediaFrame();
  }

  function zoomBy(amount: number) {
    applyZoom(zoomRef.current + amount);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preview) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey) {
        const scale = Math.exp(-event.deltaY * .01);
        applyZoom(zoomRef.current * scale);
        return;
      }
      applyZoom(zoomRef.current + (event.deltaY < 0 ? .12 : -.12));
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [applyZoom, preview]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as Element).closest("[data-canvas-control]")) return;
    if (event.pointerType === "touch") {
      touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      event.currentTarget.setPointerCapture(event.pointerId);
      if (touchPointsRef.current.size >= 2) {
        const [first, second] = Array.from(touchPointsRef.current.values());
        pinchRef.current = { distance: Math.max(1, distanceBetween(first, second)), zoom: zoomRef.current };
        setPanning(false);
        setPinching(true);
        return;
      }
    }
    startPan(event);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" && touchPointsRef.current.has(event.pointerId)) {
      touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointsRef.current.size >= 2 && pinchRef.current) {
        const [first, second] = Array.from(touchPointsRef.current.values());
        const distance = Math.max(1, distanceBetween(first, second));
        event.preventDefault();
        applyZoom(pinchRef.current.zoom * distance / pinchRef.current.distance);
        return;
      }
    }
    movePan(event);
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    touchPointsRef.current.delete(event.pointerId);
    if (touchPointsRef.current.size < 2) {
      pinchRef.current = null;
      setPinching(false);
    }
    stopPan(event);
  }

  const frameStyle = {
    transform,
    width: frameSize.width ? `${frameSize.width}px` : "100%",
    height: frameSize.height ? `${frameSize.height}px` : "100%",
  };

  return (
    <div
      className={`plan-canvas plan-canvas--${mode} ${panEnabled ? "is-pan-enabled" : ""} ${panning ? "is-panning" : ""} ${pinching ? "is-pinching" : ""}`}
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      {!preview && <BlueprintPlaceholder />}
      {preview && compare && sourcePreview && outputPreview ? (
        <div className="comparison-stage" style={frameStyle}>
          <img src={sourcePreview} alt="Source floorplan" draggable={false} onLoad={(event) => rememberNaturalSize("source", event)} />
          <div className="comparison-output" style={{ clipPath: `inset(0 0 0 ${divider}%)` }}>
            <img src={outputPreview} alt="Generated floorplan" draggable={false} onLoad={(event) => rememberNaturalSize("output", event)} />
          </div>
          <div className="comparison-divider" style={{ left: `${divider}%` }}>
            <span><Icon name="compare" /></span>
          </div>
          <input
            className="comparison-range"
            aria-label="Before and after comparison"
            type="range"
            min="5"
            max="95"
            value={divider}
            onChange={(event) => setDivider(Number(event.target.value))}
            data-canvas-control
          />
        </div>
      ) : preview ? (
        <div className="single-preview" style={frameStyle}>
          <img src={preview} alt="Floorplan preview" draggable={false} onLoad={(event) => rememberNaturalSize(outputPreview ? "output" : "source", event)} />
        </div>
      ) : null}
      <div className="canvas-labels">
        {compare && sourcePreview && <span>Original</span>}
        {outputPreview && <span className="canvas-label--output">{mode === "raster" ? "Vector SVG" : "Clean vector"}</span>}
      </div>
      <div className="canvas-tools" data-canvas-control onPointerDown={(event) => event.stopPropagation()}>
        <button className={panEnabled ? "is-active" : ""} aria-label={panEnabled ? "Disable pan mode" : "Enable pan mode"} aria-pressed={panEnabled} onClick={() => { setPanning(false); setPanEnabled((value) => !value); }}><Icon name="pan" /></button>
        <button aria-label="Zoom out" onClick={() => zoomBy(-.12)}>−</button>
        <span title="Scroll or pinch to zoom">{Math.round(zoom * 100)}%</span>
        <button aria-label="Zoom in" onClick={() => zoomBy(.12)}>+</button>
        <button aria-label="Center and reset view" title="Center and reset view" onClick={resetView}><Icon name="fit" /></button>
        {onLayers && <button aria-label="Show layers" onClick={onLayers}><Icon name="layers" /></button>}
      </div>
    </div>
  );
}

function BlueprintPlaceholder() {
  return (
    <div className="blueprint-placeholder" aria-label="Floorplan preview placeholder">
      <svg viewBox="0 0 900 600" role="img">
        <g className="grid-lines">
          {Array.from({ length: 13 }).map((_, index) => <path key={`v${index}`} d={`M${60 + index * 65} 30v540`} />)}
          {Array.from({ length: 9 }).map((_, index) => <path key={`h${index}`} d={`M35 ${45 + index * 65}h830`} />)}
        </g>
        <g className="floor-lines">
          <path d="M125 95h625v405H125zM125 255h625M365 95v405M560 95v160M485 255v245" />
          <path d="M365 182h195M220 255v245M485 375h265M560 95h190" />
          <path d="M365 210a45 45 0 0 1 45 45M560 210a45 45 0 0 0-45 45M485 330a45 45 0 0 1 45 45M220 455a45 45 0 0 1 45 45" />
          <rect x="160" y="130" width="150" height="78" rx="4" />
          <rect x="595" y="130" width="115" height="62" rx="4" />
          <rect x="270" y="315" width="60" height="105" rx="4" />
          <rect x="535" y="405" width="165" height="55" rx="4" />
        </g>
        <g className="selection-lines">
          <path d="M560 95h190v160H560zM485 375h265v125H485z" />
          <circle cx="652" cy="175" r="11" />
          <circle cx="610" cy="430" r="11" />
        </g>
      </svg>
      <div className="placeholder-message">
        <Icon name="folder" />
        <strong>Select a floorplan to begin</strong>
        <span>The drawing workspace will appear here.</span>
      </div>
    </div>
  );
}
