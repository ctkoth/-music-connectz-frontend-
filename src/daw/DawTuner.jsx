// TunerZ inside the DAW: a live tuner on the armed track's input (works while a take runs), and the key of
// what is being played, set on the project when the member says so. It listens to the mic the DAW already has
// and keeps nothing: the notes heard are a 12-number tally in this tab. Free; the plan sets how many times a day
// it can be switched on (Free 3 / Premium 6 / StatZ unlimited), stated before the button.
import { useEffect, useRef, useState } from "react";
import { tuneVerdict } from "../tuning.js";
import { keyOfTally, liveNote, tally } from "./liveTuner.js";
import { leftToday, spendOne } from "./tunerDaily.js";

const store = () => { try { return window.localStorage; } catch { return { getItem: () => null, setItem: () => {} }; } };

export default function DawTuner({ daw, track, cap, onSetKey, onKeyFromBeat, beatBusy, disabled }) {
  const [open, setOpen] = useState(false);
  const [on, setOn] = useState(false);
  const [note, setNote] = useState(null);
  const [found, setFound] = useState(null);
  const [err, setErr] = useState("");
  const [left, setLeft] = useState(() => leftToday(store(), cap));
  const hist = useRef(new Array(12).fill(0));
  const dev = track?.input?.device || "";

  useEffect(() => { if (!on) setLeft(leftToday(store(), cap)); }, [on, cap, open]);

  useEffect(() => {
    if (!on) return undefined;
    let dead = false, timer = 0, stream, meter, prev = null;
    (async () => {
      try {
        stream = await daw.openMic(dev);
        if (dead) { stream.getTracks().forEach((t) => t.stop()); return; }
        meter = daw.inputMeter(stream);
        const rate = daw.sampleRate();
        timer = setInterval(() => {
          const cur = Float32Array.from(meter.read());
          const block = prev ? Float32Array.from([...prev, ...cur]) : cur;
          prev = cur;
          const n = liveNote(block, rate);
          setNote(n);
          if (n) { tally(hist.current, n); setFound(keyOfTally(hist.current)); }
        }, 100);
      } catch (e) { setErr(e?.message || "The microphone couldn't be opened."); setOn(false); }
    })();
    return () => { dead = true; clearInterval(timer); try { meter?.stop(); } catch { /* gone */ } stream?.getTracks().forEach((t) => t.stop()); };
  }, [on, daw, dev]);

  const start = () => {
    setErr("");
    if (!spendOne(store(), cap)) { setErr(`You've used all ${cap} tuner starts for today. They come back tomorrow.`); return; }
    hist.current = new Array(12).fill(0); setFound(null); setNote(null); setOn(true);
  };
  const verdict = note ? tuneVerdict(note.cents) : null;
  const plan = cap == null ? "unlimited a day" : `${cap} starts a day on your plan`;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs" data-tour="daw-tuner">
      <button type="button" className="font-semibold text-white" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        🎯 TunerZ {open ? "▴" : "▾"} <span className="font-normal text-white/55">— tune your input and set the key while you record</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {!on
              ? <button type="button" className="neon-btn-primary !w-auto px-3 !py-1.5" disabled={disabled || (cap != null && left <= 0)} onClick={start}>Start the tuner</button>
              : <button type="button" className="re-btn !w-auto px-3 !py-1.5" onClick={() => setOn(false)}>Stop the tuner</button>}
            <span className="text-emerald-300">Free{cap == null ? "" : ` · ${left === Infinity ? "" : `${left} left today · `}${plan}`}{cap == null ? " · unlimited a day" : ""}</span>
            <span className="text-white/55">Listens to {track ? `${track.name}'s input` : "the default mic"}. Nothing is recorded or sent.</span>
          </div>
          {on && (
            <div className="flex items-center gap-4" role="status" aria-live="polite">
              <div className="min-w-[4.5rem] text-4xl font-bold text-cyan-300">{note ? note.name : "—"}</div>
              <div className="min-w-0 flex-1">
                <div className="relative h-3 overflow-hidden rounded bg-white/15" aria-hidden>
                  <span className="absolute inset-y-0 left-1/2 w-0.5 bg-white/60" />
                  {note && <span className={`absolute inset-y-0 w-1.5 rounded ${verdict?.state === "in" ? "bg-emerald-400" : "bg-mcz-ember"}`} style={{ left: `${50 + Math.max(-50, Math.min(50, note.cents)) * 0.94}%` }} />}
                </div>
                <p className={verdict?.state === "in" ? "text-emerald-300" : "text-white/80"}>{verdict ? `${verdict.text} — ${verdict.action}` : "Sing or play a note…"}</p>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {on && (
              <button type="button" className="re-btn !w-auto px-3 !py-1" disabled={!found} onClick={() => onSetKey(found)}
                      title="The key the notes you have played so far point to">
                {found ? `Set the project key to ${found.label}` : "Keep playing — listening for the key…"}
              </button>
            )}
            <button type="button" className="re-btn !w-auto px-3 !py-1" disabled={beatBusy || disabled} onClick={onKeyFromBeat}
                    title="Reads the key and tempo from the beat and instruments already on the tracks">
              {beatBusy ? "Listening…" : "Set key from the beat on the tracks"}
            </button>
            <span className="text-white/55">The key is a best estimate (relative keys share every note).</span>
          </div>
          {err && <p role="alert" className="text-mcz-ember">{err}</p>}
        </div>
      )}
    </div>
  );
}
