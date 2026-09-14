import SkillZPanel from "../skillz/SkillZPanel.jsx";
import { RapzProfilePanel, SingzProfilePanel } from "./GameProfilePanel.jsx";
import { IconImg } from "../App.jsx";
import BossTake from "./BossTake.jsx";
import ProgressPanel from "./ProgressPanel.jsx";

// Generic SkillZ instrument app view — one component powers DrumZ/ViolinZ/
// GuitarZ/BassZ/KeyZ (and any future instrument) via props.
export default function InstrumentZ({ appKey, icon, title, tagline, accent }) {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon={icon} alt={title} className="h-16 w-16 rounded-2xl shadow-neon" />
        <div className="flex-1">
          <h2
            className="font-display text-3xl font-extrabold"
            style={{ color: accent, textShadow: `0 0 12px ${accent}80` }}
          >
            {title}
          </h2>
          <p className="text-sm text-white/60">{tagline}</p>
          <span className="pill mt-1 inline-block">Teen-safe · SkillZ training</span>
        </div>
      </header>
      {appKey === "rapz" && <RapzProfilePanel />}
      {appKey === "singz" && <SingzProfilePanel />}
      {/* Every InstrumentZ app takes a scored Boss Take — record in the
          browser or upload a file. The dimensions differ per instrument and
          come from /api/<appKey>/coach/. */}
      <BossTake appKey={appKey} />
      {/* Directly under the recorder, because it is the same take seen over
          time — and because the three scores a single clip cannot show
          (consistency, health, goal match) are the ones the coach's own caveat
          points at from one screen up. */}
      <ProgressPanel appKey={appKey} />
      <div data-tour={`${appKey}-drills`}>
        <SkillZPanel basePath={`/api/${appKey}`} accent={accent} />
      </div>
    </div>
  );
}
