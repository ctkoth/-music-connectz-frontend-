// The MetZ click, as a component. One metronome, two sizes.
//
// `compact` is the version that sits inline under a coach's drill — the whole
// reason this exists. The drill says "eight steady clicks at 75 BPM", and
// before this the member had to go and find a metronome somewhere else, which
// is a dead end wearing an instruction's clothes. Now the click is ON the line
// that asked for it, already set to the numbers it named.
//
// The full version is the MetZ tab. Same engine, same component, so the two
// can't drift into disagreeing about what 75 BPM sounds like.
//
// Three rules this screen is holding:
//
//   * **Free, at every tier, and it says so.** A metronome is a few oscillators
//     in the member's own browser — nothing is uploaded, no model runs, it
//     costs us nothing. Metering it would be charging for something we don't
//     pay for, which is the argument `keyconnectz.py` already makes about the
//     device voice. So the price is stated for the same reason a price always
//     is, and the answer is Free.
//   * **The sound is never the only signal.** The beat dots carry the beat, so
//     practising with the click muted — headphones off, sleeping house, or a
//     member who can't hear it — is a supported way to use this and not a
//     broken one.
//   * **It counts what happened.** The rep counter counts clicks that actually
//     elapsed. It does not score your timing, because nothing here listens,
//     and a number that looks like a judgement of your playing while measuring
//     only that time passed is exactly the decoration the substance rule is
//     about.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown, ChevronUp, Minus, Music2, Pause, Play, Plus, RotateCcw,
  Volume2, VolumeX,
} from "lucide-react";
import {
  BPM_MAX, BPM_MIN, Metronome as Engine, SUBDIVISIONS, clampBpm, marking,
  subdivisionFor, tap,
} from "./metronome.js";

const BEATS_CHOICES = [2, 3, 4, 5, 6, 7, 8];

/** The beat, drawn. Beat one is the accent and is gold; the rest are cyan.
 *  This is the half of the tool that works with the sound off. */
function Beats({ beats, at, running }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {Array.from({ length: beats }, (_, i) => {
        const live = running && at === i;
        const accent = i === 0;
        return (
          <span
            key={i}
            aria-hidden="true"
            className={`h-3 w-3 rounded-full transition-[transform,background-color,box-shadow] duration-75 ${
              live
                ? accent
                  ? "scale-150 bg-mcz-gold shadow-[0_0_12px_rgba(255,207,63,0.9)]"
                  : "scale-150 bg-mcz-cyan shadow-[0_0_12px_rgba(34,230,255,0.9)]"
                : accent
                  ? "bg-mcz-gold/30"
                  : "bg-white/15"
            }`}
          />
        );
      })}
    </div>
  );
}

/**
 * @param bpm            starting tempo
 * @param beats          beats in a bar (the accent lands on one)
 * @param subdivision    "quarter" | "eighth" | "triplet" | "sixteenth"
 * @param beatsPerRep    one pass through the exercise, counted in beats
 * @param reps           how many passes before it stops itself
 * @param quoted         which of the above the COACH said, so the screen can
 *                       tell "the drill asked for this" from "this is a default"
 * @param compact        the inline strip rather than the full panel
 * @param onOpenFull     offered under the inline strip; omitted logged-out
 */
export default function Metronome({
  bpm: bpm0 = 90,
  beats: beats0 = 4,
  subdivision: sub0 = "quarter",
  beatsPerRep = null,
  reps = null,
  quoted = null,
  compact = false,
  onOpenFull = null,
  onFinished = null,
}) {
  const engine = useRef(null);
  if (!engine.current) engine.current = new Engine();

  const [bpm, setBpm] = useState(() => clampBpm(bpm0));
  const [beats, setBeats] = useState(beats0);
  const [sub, setSub] = useState(sub0);
  const [running, setRunning] = useState(false);
  const [muted, setMuted] = useState(false);
  const [beatAt, setBeatAt] = useState(-1);
  const [rep, setRep] = useState(0);
  const [taps, setTaps] = useState([]);
  const [rampUp, setRampUp] = useState(false);
  const [more, setMore] = useState(false);

  const per = subdivisionFor(sub).per;
  const audible = engine.current.audible;

  // A drill is a finite thing: N beats, R times. Without both it just clicks.
  const drill = beatsPerRep && reps ? { beatsPerRep, reps } : null;
  const clicksPerRep = drill ? drill.beatsPerRep * per : 0;

  // Beats booked but not yet sounded. Drawn off the AUDIO clock in the frame
  // loop below, never off the timer that booked them — see metronome.js.
  const queue = useRef([]);
  // Read by the engine's callback, which is installed once and must not close
  // over a stale rep count.
  const state = useRef({ rep: 0, clicksPerRep: 0, reps: 0, rampUp: false, bpm });
  state.current = { rep, clicksPerRep, reps: drill?.reps || 0, rampUp, bpm };

  const stop = useCallback(() => {
    engine.current.stop();
    setRunning(false);
    setBeatAt(-1);
    queue.current = [];
  }, []);

  // Push settings down on every change. Tempo can move while it is running —
  // that is what the ramp and the ± buttons are for — and the engine picks the
  // new interval up on its next booking, a quarter second out at most.
  useEffect(() => {
    engine.current.set({ bpm, beats, per, muted });
  }, [bpm, beats, per, muted]);

  // A tempo chosen OUTSIDE this component — a preset in the MetZ tab, a second
  // drill arriving from the coach — has to land here. Keyed on the prop alone,
  // so the ± buttons and the slider inside are not fighting it, and done
  // without a remount so a preset pressed mid-practice moves the tempo instead
  // of stopping the click.
  useEffect(() => { setBpm(clampBpm(bpm0)); }, [bpm0]);

  // Stop the click when the component goes, and give the audio context back.
  useEffect(() => {
    const e = engine.current;
    return () => e.dispose();
  }, []);

  // The beat that is currently sounding, drawn from the audio clock. Only
  // while running — a frame loop that never sleeps is a battery cost on a tool
  // people leave open.
  useEffect(() => {
    if (!running) return undefined;
    let raf = 0;
    const draw = () => {
      const now = engine.current.now;
      let latest = null;
      while (queue.current.length && queue.current[0].at <= now) latest = queue.current.shift();
      if (latest) setBeatAt(latest.beat);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const start = useCallback(() => {
    const e = engine.current;
    e.set({ bpm, beats, per, muted });
    e.onBeat = (b) => {
      if (b.onBeat) queue.current.push(b);
      const s = state.current;
      if (!s.clicksPerRep) return;
      // A rep is finished when its last click has been BOOKED; the counter is
      // updated when that click SOUNDS, below, so the number on screen never
      // runs ahead of the beat the member is hearing.
      const done = Math.floor((b.click + 1) / s.clicksPerRep);
      if (done > s.rep) {
        if (done >= s.reps) {
          // Let the last click ring before the transport drops.
          setTimeout(() => {
            stop();
            setRep(s.reps);
            onFinished?.(s.reps);
          }, Math.max(0, (b.at - e.now) * 1000) + 90);
          return;
        }
        setRep(done);
        // Progressive tempo: the point of practising to a click is to be able
        // to do it faster than you can now, and stepping up between reps is
        // how that is done. +2 keeps it under what anybody can hear as a jump.
        if (s.rampUp) setBpm((n) => clampBpm(n + 2));
      }
    };
    queue.current = [];
    setRep(0);
    if (e.start()) setRunning(true);
  }, [bpm, beats, per, muted, stop, onFinished]);

  const toggle = useCallback(() => (running ? stop() : start()), [running, stop, start]);

  // Space is the transport, the way it is in every DAW — but never while
  // somebody is typing a tempo into the field beside it.
  useEffect(() => {
    const h = (e) => {
      if (e.code !== "Space" && e.key !== " ") return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [toggle]);

  const doTap = () => {
    const r = tap(taps);
    setTaps(r.times);
    if (r.bpm) setBpm(r.bpm);
  };

  const nudge = (n) => setBpm((v) => clampBpm(v + n));

  /* ------------------------------------------------------------- the strip */

  const transport = (
    <button
      onClick={toggle}
      disabled={!audible}
      title={running ? "Stop (space)" : "Start (space)"}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
        running
          ? "bg-mcz-ember text-white shadow-[0_0_18px_rgba(255,85,0,0.5)]"
          : "bg-mcz-cyan text-black hover:brightness-110"
      } disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30`}
    >
      {running ? <Pause size={19} /> : <Play size={19} className="ml-0.5" />}
    </button>
  );

  if (compact) {
    return (
      <div className="mt-2 space-y-1.5 rounded-lg border border-mcz-cyan/25 bg-black/30 p-2.5"
           data-tour="metz-inline">
        <div className="flex items-center gap-3">
          {transport}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-xl font-extrabold tabular-nums text-white">{bpm}</span>
              <span className="text-[10px] uppercase tracking-widest text-white/40">BPM</span>
              {drill && (
                <span className="ml-1 text-[11px] text-white/50">
                  rep {Math.min(rep + (running ? 1 : 0), drill.reps) || 0}/{drill.reps}
                </span>
              )}
            </div>
            <Beats beats={beats} at={beatAt} running={running} />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button onClick={() => nudge(-5)} title="Slower"
                    className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white">
              <Minus size={14} />
            </button>
            <button onClick={() => nudge(5)} title="Faster"
                    className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white">
              <Plus size={14} />
            </button>
            <button onClick={() => setMuted((m) => !m)} title={muted ? "Click is muted" : "Mute the click"}
                    className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white">
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 text-[10px] text-white/35">
          <span className="text-emerald-300">Free</span>
          <span>· every tier, nothing leaves your browser</span>
          {onOpenFull && (
            <button className="re-link !text-[10px]" onClick={onOpenFull}>
              Open in MetZ →
            </button>
          )}
        </p>
        {!audible && (
          <p className="text-[10px] text-mcz-ember/80">
            This browser has no Web Audio, so there's no click to play here.
          </p>
        )}
      </div>
    );
  }

  /* --------------------------------------------------------- the full panel */

  return (
    <div className="re-card space-y-4" data-tour="metz-click">
      <div className="flex items-center justify-between gap-2">
        <div className="re-label">The click</div>
        {/* The price, on the control rather than after it. It is free, and a
            free thing whose price is unstated still reads risky. */}
        <p className="text-[11px]">
          <span className="text-emerald-300">Free</span>
          <span className="text-white/35"> — at every tier, and nothing is uploaded</span>
        </p>
      </div>

      {quoted?.bpm != null ? (
        <p className="rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/5 px-3 py-2 text-[11px] text-white/65">
          The drill asked for <b className="text-mcz-cyan">{quoted.bpm} BPM</b>
          {quoted.beatsPerRep ? <> across <b className="text-mcz-cyan">{quoted.beatsPerRep}</b> clicks</> : null}
          {quoted.reps ? <> for <b className="text-mcz-cyan">{quoted.reps}</b> reps</> : null}.
        </p>
      ) : quoted ? (
        // Said out loud rather than papered over: a tempo shown as if the coach
        // chose it, when the coach chose nothing, is a number nobody can check.
        <p className="rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-[11px] text-white/45">
          That drill didn't name a tempo — this is your last one, not the coach's.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        {transport}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-extrabold tabular-nums leading-none text-white">
              {bpm}
            </span>
            <span className="text-[11px] uppercase tracking-widest text-white/40">BPM</span>
          </div>
          <p className="text-[11px] text-mcz-gold/80">{marking(bpm)}</p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1.5">
          <Beats beats={beats} at={beatAt} running={running} />
          {drill && (
            <p className="text-[11px] tabular-nums text-white/55">
              rep <b className="text-white/85">{Math.min(rep + (running ? 1 : 0), drill.reps) || 0}</b> of {drill.reps}
              <span className="text-white/30"> · {drill.beatsPerRep} clicks each</span>
            </p>
          )}
        </div>
      </div>

      {!audible && (
        <p className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[11px] text-mcz-ember">
          This browser has no Web Audio, so MetZ can't make a click here. The
          beat lights still run if you start it.
        </p>
      )}

      {/* Tempo. A slider for finding one, ± for nudging a known one, and tap
          for the case the member is chasing a track they can hear. */}
      <div className="space-y-2">
        <input
          type="range" min={BPM_MIN} max={BPM_MAX} value={bpm}
          onChange={(e) => setBpm(clampBpm(e.target.value))}
          className="w-full accent-mcz-cyan"
          aria-label="Tempo in beats per minute"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {[-5, -1, +1, +5].map((n) => (
            <button key={n} className="re-btn !w-auto px-3 py-1.5 text-[12px]" onClick={() => nudge(n)}>
              {n > 0 ? `+${n}` : n}
            </button>
          ))}
          <button className="re-btn re-btn-cyan !w-auto px-4 py-1.5 text-[12px]" onClick={doTap}>
            <Music2 size={13} /> Tap
          </button>
          <input
            className="neon-input !w-24 !py-1.5 text-center text-[12px]" inputMode="numeric"
            value={bpm} aria-label="Tempo"
            onChange={(e) => setBpm(clampBpm(e.target.value))}
          />
        </div>
      </div>

      {/* Bar and subdivision. Both change what you hear immediately, including
          mid-run — you should be able to switch to eighths in the middle of a
          rep without losing your place. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-white/35">Bar</span>
          {BEATS_CHOICES.map((n) => (
            <button key={n} onClick={() => setBeats(n)}
                    className={`pill !py-0.5 !text-[11px] ${beats === n ? "!border-mcz-gold/60 !text-mcz-gold" : ""}`}>
              {n}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-white/35">Feel</span>
          {SUBDIVISIONS.map((s) => (
            <button key={s.key} onClick={() => setSub(s.key)} title={s.name}
                    className={`pill !py-0.5 !text-[12px] ${sub === s.key ? "!border-mcz-cyan/60 !text-mcz-cyan" : ""}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setMuted((m) => !m)}
                className={`re-btn !w-auto px-3 py-1.5 text-[12px] ${muted ? "!text-mcz-ember" : ""}`}>
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          {muted ? "Muted — the lights still run" : "Click on"}
        </button>
        {drill && (
          <button className="re-btn !w-auto px-3 py-1.5 text-[12px]"
                  onClick={() => { stop(); setRep(0); }}>
            <RotateCcw size={13} /> Reset reps
          </button>
        )}
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-white/55">
          <input type="checkbox" checked={rampUp} onChange={(e) => setRampUp(e.target.checked)}
                 className="accent-mcz-gold" />
          Step up +2 BPM each rep
        </label>
      </div>

      <button className="flex items-center gap-1 text-[11px] text-white/35 hover:text-white/60"
              onClick={() => setMore((m) => !m)}>
        {more ? <ChevronUp size={12} /> : <ChevronDown size={12} />} How this behaves
      </button>
      {more && (
        <div className="space-y-1.5 rounded-lg border border-white/[0.06] bg-black/20 p-3 text-[11px] leading-relaxed text-white/45">
          <p>
            <b className="text-white/70">Space</b> starts and stops it. The tempo can move
            while it runs — the new one lands within a quarter of a second.
          </p>
          <p>
            <b className="text-white/70">MetZ has its own sound.</b> The app's sound switch in
            the header doesn't silence the click, because a silenced metronome
            isn't one. Use the mute here — the beat lights carry the beat on
            their own.
          </p>
          <p>
            <b className="text-white/70">Nothing here scores you.</b> The rep counter counts
            clicks that went past. MetZ doesn't listen, so it has no opinion on
            whether you were on them — send the take to the coach for that.
          </p>
        </div>
      )}
    </div>
  );
}
