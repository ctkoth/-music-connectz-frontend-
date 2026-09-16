import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import SkillZPanel from "../skillz/SkillZPanel.jsx";
import { RapzProfilePanel, SingzProfilePanel } from "./GameProfilePanel.jsx";
import { IconImg } from "../App.jsx";
import BossTake from "./BossTake.jsx";
import ProgressPanel from "./ProgressPanel.jsx";
import { lazyRoute } from "../chunkError.js";

// Lazy even though this file itself is already a lazy route: a static import
// here would put the beat sequencer's code in the ONE chunk every instrument
// tab shares, so SingZ/RapZ/GuitarZ/BassZ/KeyZ/ViolinZ would all download a
// drum machine they never render. Same reasoning App.jsx's own route-level
// lazy() calls already follow, one level down.
const DrumZ = lazy(lazyRoute(() => import("./DrumZ.jsx")));

// Generic SkillZ instrument app view — one component powers DrumZ/ViolinZ/
// GuitarZ/BassZ/KeyZ (and any future instrument) via props.
//
// It always did — this file's own comment has said so since it was written.
// What never happened is App.jsx actually instantiating it for four of those
// five: guitarz, bassz, keyz and violinz had a real, scored, tested backend
// coach and NO route a signed-in member could reach it from at all, and
// "drumz" pointed at an unrelated beat-sequencer tool instead. Backend
// CLAUDE.md documents the identical bug already fixed once for the LOGGED-OUT
// trial door ("The trial door: five coaches nobody could find") — this was
// the same failure one layer up, on the member Dock, which that fix never
// touched because it was verified from the trial side, not the Dock.
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
      {/* DrumZ kept its practice pad — a real, self-contained beat sequencer,
          not a stand-in for the coach — rather than losing it when the coach
          finally got a door. Warm up on the pad, then record the take below
          it; one tab, both tools, instead of a tab rename that would have
          broken every existing link to it. */}
      {appKey === "drumz" && (
        <Suspense fallback={
          <div className="flex items-center gap-2 text-white/50">
            <Loader2 className="animate-spin" size={16} /> Loading…
          </div>
        }>
          <DrumZ />
        </Suspense>
      )}
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
