import { AppTitlebar } from "./Shell";
import { BrandMark, Icon } from "./Icon";

const WELCOME_LINES = [
  "Plans in. Clarity out.",
  "Turn drawings into understanding.",
  "From raw geometry to usable intelligence.",
  "Every space begins with a line.",
  "Read the plan. Shape the space.",
  "Adapt complexity into clarity.",
  "Better plans start with better understanding.",
  "Where floorplans become intelligent.",
  "See more than lines.",
  "Transform. Understand. Adapt.",
  "Engineering clarity, one plan at a time.",
  "Your drawing. Vapterz intelligence.",
  "Local processing. Professional results.",
  "Raw plans, refined.",
  "Let's make this drawing useful.",
] as const;

export function randomWelcomeLine() {
  return WELCOME_LINES[Math.floor(Math.random() * WELCOME_LINES.length)];
}

export function WelcomeScreen({ line, leaving, onEnter }: { line: string; leaving: boolean; onEnter: () => void }) {
  return (
    <div className={`app-frame welcome-frame ${leaving ? "is-leaving" : ""}`}>
      <AppTitlebar />
      <main className="welcome-stage">
        <div className="welcome-blueprint" aria-hidden="true">
          <span className="welcome-plan welcome-plan--one" />
          <span className="welcome-plan welcome-plan--two" />
          <span className="welcome-plan welcome-plan--three" />
        </div>
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-emblem" aria-hidden="true"><BrandMark /></div>
          <span className="welcome-eyebrow">Local floorplan intelligence</span>
          <h1 id="welcome-title"><span>Vapterz</span> AI Studio</h1>
          <p className="welcome-slogan">Every line, understood.</p>
          <p className="welcome-line">{line}</p>
          <button className="primary-button welcome-action" autoFocus disabled={leaving} onClick={onEnter}>
            <Icon name="sparkles" /> Let's adapt a plan
          </button>
          <div className="welcome-assurance"><Icon name="lock" /> Private by design <span /> Fully local <span /> Ready when you are</div>
        </section>
        <footer className="welcome-footer"><span>Raster</span><i /><span>Manual CAD</span><i /><span>Offline</span></footer>
      </main>
    </div>
  );
}
