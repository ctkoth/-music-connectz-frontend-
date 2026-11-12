// The bar that follows a recording around the app.
//
// A take keeps running when the member opens another app (recordingHold.js).
// A microphone that is open under a screen nobody can see has to SAY so, on
// every screen, with the two things anyone would want from it: stop it, or go
// back to it. Nothing is shown for the app that is on screen — its own
// recorder already says all of this.
import { useEffect, useState } from "react";
import { ArrowRight, Check, Square } from "lucide-react";
import { PHASES, holdClock } from "../recordingHold.js";

export default function RecordingBar({ holds, activeTab, labelOf, onOpen }) {
  const away = holds.filter((h) => h.tab !== activeTab);
  const running = away.some((h) => h.phase === PHASES.recording);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  if (!away.length) return null;
  return (
    <div className="sticky top-16 z-40 mb-3 space-y-1.5">
      {away.map((h) => {
        const app = labelOf(h.tab) || "another app";
        const rec = h.phase === PHASES.recording;
        return (
          <div key={h.id} role="status"
               aria-label={rec ? `Recording in ${app}` : `Recording finished in ${app}`}
               className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-lg backdrop-blur ${rec
                 ? "border-mcz-ember/50 bg-black/85 text-white"
                 : "border-emerald-400/40 bg-black/85 text-white"}`}>
            {rec ? (
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-mcz-ember" aria-hidden="true" />
                <span className="truncate">
                  <span className="font-semibold text-mcz-ember">Recording</span>
                  {" "}in {app}{h.label ? ` — ${h.label}` : ""}
                </span>
                {/* aria-hidden: a status region re-announces whatever changes
                    inside it, and a clock changes every second. */}
                <span className="shrink-0 tabular-nums text-white/70" aria-hidden="true">{holdClock(now - h.since)}</span>
              </span>
            ) : (
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <Check size={14} className="shrink-0 text-emerald-300" aria-hidden="true" />
                <span className="truncate">
                  <span className="font-semibold text-emerald-300">Take ready</span>
                  {" "}in {app} — it's kept there until you open it.
                </span>
              </span>
            )}
            <span className="flex shrink-0 items-center gap-1.5">
              {rec && h.stop && (
                <button type="button" onClick={() => h.stop()}
                        className="flex items-center gap-1 rounded-lg bg-mcz-ember/90 px-2.5 py-1.5 font-semibold text-black hover:bg-mcz-ember">
                  <Square size={11} fill="currentColor" aria-hidden="true" /> Stop
                </button>
              )}
              <button type="button" onClick={() => onOpen(h.tab)}
                      className="flex items-center gap-1 rounded-lg border border-white/25 px-2.5 py-1.5 font-semibold hover:bg-white/10">
                {rec ? `Back to ${app}` : `Open ${app}`} <ArrowRight size={12} aria-hidden="true" />
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}
