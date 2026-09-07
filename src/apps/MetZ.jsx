// MetZ 🎼 — the click the coach keeps asking for.
//
// Every Boss Take comes back with a drill, and the drills name tempos: "eight
// steady metronome clicks at 75 BPM ... for ten reps". The app has been
// printing that sentence and then leaving the member to go and find a
// metronome on some other site — which is the dead end the cross-pollination
// rule exists to close, in its purest form. The instruction was there; the
// tool it required was not.
//
// So the drill line now carries the click itself (see BossTake), and this tab
// is where it opens when somebody wants the full transport: bar, feel, tap,
// a rep counter, and the doors back out to recording the thing they just
// practised.
//
// It is FREE, at every tier, and that is not a generosity — it's the tier rule.
// "A tier limit says how MUCH, how OFTEN or how FAST. It may never say
// whether." A metronome behind a paywall says whether. It also costs us
// literally nothing: a few oscillators in the member's own browser, no upload,
// no model, no request. Metering it would be counting something we don't pay
// for in order to charge for it — the same argument `keyconnectz.py` makes
// about the device voice.
import { useEffect, useState } from "react";
import { ArrowRight, Mic, NotebookPen } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import Metronome from "../Metronome.jsx";
import { clampBpm, readLastBpm, writeLastBpm } from "../metronome.js";
import { goToSpot } from "../goto.js";
import { handOff, onHandoff } from "../handoff.js";

// Tempos worth one press. Not a ladder and not a recommendation — just the
// speeds practice actually happens at, so somebody who knows what they want
// isn't dragging a slider to find it.
const PRESETS = [
  [60, "Slow"], [75, "Drill"], [90, "Steady"], [100, "Walk"],
  [120, "Pop"], [140, "Up"], [174, "Fast"],
];

export default function MetZ() {
  // What the coach asked for, when MetZ was opened from a drill. Null means
  // somebody came here directly, which is a different screen: no quote, no
  // rep target, just a click.
  const [drill, setDrill] = useState(null);
  const [bpm, setBpm] = useState(readLastBpm);
  const [comfort, setComfort] = useState(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(0);

  // A drill handed over from the coach's result. `handoff.js` parks it before
  // the jump and clears it on the way in, so coming back to MetZ later doesn't
  // silently reload last week's exercise over the tempo you just dialled.
  useEffect(() => onHandoff("metz", (p) => {
    const next = {
      bpm: p.bpm ?? null,
      beatsPerRep: p.beatsPerRep ?? null,
      reps: p.reps ?? null,
      subdivision: p.subdivision || "quarter",
      text: p.text || "",
      from: p.from || "",
    };
    setDrill(next);
    if (next.bpm) setBpm(clampBpm(next.bpm));
    setDone(0);
  }), []);

  // The member's own comfortable tempo band, which their RapZ profile already
  // knows. Nothing here writes it and nothing breaks without it — a singer has
  // never set one, and this is a preset, not a gate.
  useEffect(() => {
    api("/api/rapz/profile/")
      .then((p) => {
        const lo = clampBpm(p?.bpm_min);
        const hi = clampBpm(p?.bpm_max);
        if (p?.bpm_min && p?.bpm_max && hi >= lo) setComfort({ lo, hi });
      })
      .catch(() => {});
  }, []);

  const choose = (n) => {
    const v = clampBpm(n);
    setBpm(v);
    writeLastBpm(v);
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="metz.png" alt="MetZ" className="h-11 w-11 rounded-xl" />
        <div className="flex-1">
          <h2 className="font-display text-xl font-extrabold">MetZ</h2>
          <p className="text-xs text-white/45">
            The click. Set it, or let a coach's drill set it for you — free at
            every tier, and it never leaves your browser.
          </p>
        </div>
      </header>

      {/* What was asked for, in the coach's own words. The drill is the reason
          this screen is open; showing the numbers without the sentence they
          came from would make them unverifiable. */}
      {drill?.text && (
        <div className="rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/5 p-3">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-mcz-cyan/80">
            The drill{drill.from ? ` · from ${drill.from}` : ""}
          </p>
          <p className="text-[12px] leading-relaxed text-white/75">{drill.text}</p>
        </div>
      )}

      <Metronome
        key={drill ? `${drill.bpm}-${drill.reps}-${drill.text.length}` : "free"}
        bpm={bpm}
        beats={4}
        subdivision={drill?.subdivision || "quarter"}
        beatsPerRep={drill?.beatsPerRep || null}
        reps={drill?.reps || null}
        quoted={drill ? { bpm: drill.bpm, beatsPerRep: drill.beatsPerRep, reps: drill.reps } : null}
        onFinished={(n) => setDone(n)}
      />

      <div className="re-card space-y-2">
        <div className="re-label">Straight to a tempo</div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(([n, label]) => (
            <button key={n} onClick={() => choose(n)}
                    className={`pill !text-[11px] ${bpm === n ? "!border-mcz-cyan/60 !text-mcz-cyan" : ""}`}>
              {n} <span className="text-white/35">{label}</span>
            </button>
          ))}
        </div>
        {/* Their own number, from their own profile — the kind of handoff the
            crux is about. It leads back to where it is set, so a wrong one
            isn't a fact you have to live with. */}
        {comfort && (
          <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-white/45">
            <span>Your RapZ comfort band:</span>
            <button className="pill !py-0.5 !text-[11px]" onClick={() => choose(comfort.lo)}>{comfort.lo}</button>
            <span className="text-white/25">—</span>
            <button className="pill !py-0.5 !text-[11px]" onClick={() => choose(comfort.hi)}>{comfort.hi}</button>
            <button className="re-link !text-[11px]" onClick={() => goToSpot("rapz", "")}>
              change it in RapZ
            </button>
          </p>
        )}
      </div>

      {/* Finished a drill? Then this screen is not where it ends. A practice
          tool whose only outcome is that the clicking stopped is a read-only
          surface — the point of running the drill is the next take. */}
      {done > 0 && (
        <p className="rounded-lg border border-emerald-400/25 bg-emerald-400/5 px-3 py-2 text-[12px] text-emerald-300">
          {done} reps done. Nothing was scored — MetZ doesn't listen. Put it on
          tape and let the coach say whether it landed.
        </p>
      )}

      <div className="re-card space-y-2" data-tour="metz-open-in">
        <div className="re-label">Take it somewhere</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-mcz-pink/40"
            onClick={() => goToSpot("singz", "bosstake-mic")}
          >
            <Mic size={14} className="shrink-0 text-mcz-pink" />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] text-white/80">Record it in SingZ</span>
              <span className="block text-[10px] text-white/35">
                The drill is practice; the take is what gets scored.
              </span>
            </span>
            <ArrowRight size={12} className="shrink-0 text-white/25" />
          </button>

          <button
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-mcz-pink/40"
            onClick={() => goToSpot("rapz", "bosstake-mic")}
          >
            <Mic size={14} className="shrink-0 text-mcz-gold" />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] text-white/80">Record it in RapZ</span>
              <span className="block text-[10px] text-white/35">
                Same recorder, scored on flow and breath instead.
              </span>
            </span>
            <ArrowRight size={12} className="shrink-0 text-white/25" />
          </button>

          <button
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-mcz-gold/40 sm:col-span-2"
            onClick={() => handOff("journalz", "journalz-composer", {
              title: `Practice — ${bpm} BPM`,
              description: [
                drill?.text ? `Drill: ${drill.text}` : "",
                done > 0 ? `Ran ${done} reps at ${bpm} BPM.` : `Worked at ${bpm} BPM.`,
                note.trim(),
              ].filter(Boolean).join("\n\n"),
            })}
          >
            <NotebookPen size={14} className="shrink-0 text-mcz-gold" />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] text-white/80">Keep it in JournalZ</span>
              <span className="block text-[10px] text-white/35">
                What you practised and at what tempo. Private until you publish it.
              </span>
            </span>
            <ArrowRight size={12} className="shrink-0 text-white/25" />
          </button>
        </div>
        <input
          className="w-full rounded-lg border border-white/[0.08] bg-black/40 p-2.5 text-[12px] text-white placeholder-white/30 outline-none focus:border-mcz-gold/60"
          placeholder="Anything to remember about this session (goes in the journal entry)"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </div>
  );
}
