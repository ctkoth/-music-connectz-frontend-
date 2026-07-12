import SkillZPanel from "../skillz/SkillZPanel.jsx";
import { RapzProfilePanel, SingzProfilePanel } from "./GameProfilePanel.jsx";
import { IconImg } from "../App.jsx";

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
      <SkillZPanel basePath={`/api/${appKey}`} accent={accent} />
    </div>
  );
}
