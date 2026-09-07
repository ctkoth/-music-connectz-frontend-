// What the recording itself says — pitch and timing, read off the take.
//
// Two things here are load-bearing:
//
//   * It goes through `api()`, not `fetch()`. The backend is a DIFFERENT
//     ORIGIN (admin.musicconnectz.net) and wants a JWT. A bare
//     fetch("/api/…") hits the SPA's own host, where vercel.json rewrites
//     every unmatched path to index.html — so the response is 200 with HTML,
//     `response.ok` is TRUE, and the JSON parse throws into a catch that
//     logs to the console and renders nothing. The component would have sat
//     there looking deliberate and empty forever.
//
//   * The jump to TunerZ is `goToSpot`, not an <a href>. A raw href is a full
//     page load: it drops the SPA, re-downloads the bundle and loses the feed
//     the member was reading. The drill is a tab away, not a navigation.
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { handOff } from "../handoff.js";

export default function TakeAnalysisDisplay({ uploadId, mine }) {
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    // Owner-only on the server: a post is public, a breakdown of where its
    // author sang flat is not. Asking for somebody else's would 404, so the
    // card doesn't ask.
    if (!uploadId || !mine) return;
    let live = true;
    api(`/api/economy/takes/${uploadId}/analysis/`)
      .then((d) => { if (live) setAnalysis(d); })
      .catch(() => { if (live) setAnalysis(null); });
    return () => { live = false; };
  }, [uploadId, mine]);

  if (!analysis || analysis.analysis_status !== "done") return null;

  const acc = analysis.overall_pitch_accuracy;
  const weak = analysis.weak_notes || [];
  const timing = analysis.timing_issues || {};
  const rushing = timing.rushing_count || 0;
  const dragging = timing.dragging_count || 0;

  // Nothing measurable and nothing to say. An empty panel invites a real
  // take; a 0% invents a verdict on singing we never heard.
  if (acc === null && !weak.length && !rushing && !dragging) return null;

  // handOff, not goToSpot: the drill needs to arrive KNOWING which note. The
  // app switches tabs without touching the URL, so params on a link would
  // never reach TunerZ — it reads window.location.search once, at render.
  const goDrill = (note) => handOff("tunerz", "tunerz-drill", {
    note: note.note, freq: note.freq, cents: note.cents_off,
  });

  return (
    <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/20 p-3">
      <p className="text-[11px] uppercase tracking-widest text-white/45">
        Read off this take
      </p>

      {acc !== null && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded bg-white/[0.08]">
              <div className={acc >= 80 ? "h-full bg-emerald-400" : "h-full bg-mcz-ember"}
                   style={{ width: `${acc}%` }} />
            </div>
            <span className={`text-[12px] font-semibold ${acc >= 80 ? "text-emerald-300" : "text-mcz-ember"}`}>
              {acc}%
            </span>
          </div>
          <p className="mt-1 text-[11px] text-white/40">
            of the notes you actually sang landed within 5 cents. Silence isn't counted.
          </p>
        </div>
      )}

      {weak.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] text-white/45">
            Consistently out of tune — drilling one is free.
          </p>
          <div className="mt-1.5 space-y-1.5">
            {weak.map((n) => (
              <div key={n.note}
                   className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                <span className="text-[13px] font-bold text-mcz-cyan">{n.note}</span>
                <span className="text-[11px] text-white/40">
                  {n.cents_off > 0 ? "sharp" : "flat"} by {Math.abs(n.cents_off)} cents
                </span>
                <button onClick={() => goDrill(n)}
                        className="ml-auto text-[12px] font-semibold text-white hover:text-mcz-gold">
                  Drill it <span className="text-emerald-300">Free</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(rushing > 0 || dragging > 0) && (
        <p className="mt-2 text-[11px] text-white/45">
          Timing · {rushing > 0 && <>{rushing} rushed</>}
          {rushing > 0 && dragging > 0 && " · "}
          {dragging > 0 && <>{dragging} dragged</>}
          {" — "}
          <button onClick={() => goToSpot("metz", "metz-bpm")}
                  className="text-white hover:text-mcz-gold">
            take it to MetZ
          </button>
        </p>
      )}
    </div>
  );
}
