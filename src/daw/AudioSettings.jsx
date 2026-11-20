// Audio settings for the DAW: which input and output to use, a live level meter with plain-words advice, and a monitor.
//
// The meter only opens the microphone when you press Check level (a browser permission prompt, so it is asked for when you
// want it, not on page load), listens, and lets go when you stop it. Nothing is recorded and nothing is sent anywhere.
// Hearing yourself is OFF by default and says why: a mic beside speakers feeds back, and the browser adds a delay you will
// hear. Outputs can only be chosen where the browser allows it (Chrome and Edge); the screen says when it does not.
import { useCallback, useEffect, useRef, useState } from "react";
import { Headphones, Mic, Volume2 } from "lucide-react";
import { FLOOR_DB, holdPeak, latencyMs, levelAdvice, levelFromSamples, meterPos } from "./audioIO.js";

const TONE = { clip: "bg-red-500", hot: "bg-amber-400", good: "bg-emerald-400", low: "bg-sky-400", silent: "bg-white/30" };

export default function AudioSettings({ daw }) {
  const [inputs, setInputs] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [on, setOn] = useState(false);
  const [mon, setMon] = useState(false);
  const [lat, setLat] = useState(null);
  const [lvl, setLvl] = useState({ peakDb: FLOOR_DB, held: FLOOR_DB, clipped: false });
  const [err, setErr] = useState("");
  const stream = useRef(null);
  const meter = useRef(null);
  const raf = useRef(0);
  const canOut = daw.outputCanChange();

  const list = useCallback(() => navigator.mediaDevices?.enumerateDevices?.().then((ds) => {
    setInputs(ds.filter((d) => d.kind === "audioinput" && d.deviceId !== "default"));
    setOutputs(ds.filter((d) => d.kind === "audiooutput" && d.deviceId !== "default"));
  }).catch(() => {}), []);
  useEffect(() => { list(); navigator.mediaDevices?.addEventListener?.("devicechange", list); return () => navigator.mediaDevices?.removeEventListener?.("devicechange", list); }, [list]);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current); daw.monitorOff(); meter.current?.stop(); meter.current = null;
    stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null;
    setOn(false); setMon(false);
  }, [daw]);
  useEffect(() => stop, [stop]);

  const start = async () => {
    setErr("");
    try {
      stop();
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: input ? { exact: input } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      meter.current = daw.inputMeter(stream.current);
      setOn(true); list();                       // labels only appear once the mic has been allowed
      let held = FLOOR_DB, last = performance.now();
      const tick = (now) => {
        const l = levelFromSamples(meter.current.read());
        held = holdPeak(held, l.peakDb, (now - last) / 1000); last = now;
        setLvl({ peakDb: l.peakDb, held, clipped: l.clipped || (prevClip.current = prevClip.current || l.clipped) });
        raf.current = requestAnimationFrame(tick);
      };
      prevClip.current = false; raf.current = requestAnimationFrame(tick);
    } catch (e) {
      setErr(e?.name === "NotAllowedError" ? "The browser blocked the microphone. Allow it for this site, then try again."
        : e?.name === "NotFoundError" ? "No microphone was found on this device."
        : e?.name === "NotReadableError" ? "Another app is holding that input (Zoom, Teams, OBS, another tab). Close it and try again." : (e?.message || "Couldn't open that input."));
      stop();
    }
  };
  const prevClip = useRef(false);

  const toggleMon = async () => {
    if (mon) { daw.monitorOff(); setMon(false); return; }
    if (!window.confirm("Hear yourself through the output? Use headphones: a mic next to speakers will squeal. You may also hear a small delay.")) return;
    try { await daw.monitorOn(stream.current); setMon(true); setLat(latencyMs(daw.context())); } catch (e) { setErr(e?.message || "Couldn't start monitoring."); }
  };
  const chooseOutput = async (id) => {
    setOutput(id); setErr("");
    try { const r = await daw.setOutput(id); if (!r.ok) setErr("This browser can't switch the output; it uses the system's current one."); } catch (e) { setErr(e?.message || "Couldn't switch the output."); }
  };

  const a = levelAdvice(lvl.held, lvl.clipped);
  return (
    <details className="basis-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs" data-tour="daw-audio-settings">
      <summary className="cursor-pointer text-white/80"><Volume2 size={12} className="mr-1 inline" />Audio settings: input, output and levels</summary>
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-white/60"><Mic size={11} /> Input
            <select className="neon-input !w-auto !py-1" data-nomemo="true" value={input} aria-label="Input device" disabled={on} onChange={(e) => setInput(e.target.value)}>
              <option value="">System default</option>
              {inputs.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Input ${i + 1}`}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1 text-white/60"><Headphones size={11} /> Output
            <select className="neon-input !w-auto !py-1" data-nomemo="true" value={output} aria-label="Output device" disabled={!canOut} onChange={(e) => chooseOutput(e.target.value)}>
              <option value="">System default</option>
              {outputs.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Output ${i + 1}`}</option>)}
            </select>
          </label>
          {!canOut && <span className="text-white/50">This browser plays through the system output; Chrome or Edge can switch it here.</span>}
        </div>
        <p className="text-white/50">Each track picks its own input and channel when armed (R). This is for checking the room, the gain and the headphones before you record.</p>
        <div className="flex flex-wrap items-center gap-2">
          {!on ? <button type="button" className="re-btn !w-auto px-3" onClick={start}><Mic size={12} /> Check level</button>
                : <button type="button" className="re-btn !w-auto px-3" onClick={stop}>Stop checking</button>}
          {on && <button type="button" aria-pressed={mon} className={`rounded-lg border px-2 py-1 ${mon ? "border-mcz-cyan bg-mcz-cyan/20 text-white" : "border-white/15 text-white/60"}`} onClick={toggleMon}>
            🎧 Hear myself {mon ? "on" : "off"}</button>}
          {mon && <span className="text-white/60">{lat ? `about ${lat} ms of delay. ` : ""}Use headphones.</span>}
          <span className="text-emerald-300">free</span>
        </div>
        {on && (
          <div className="space-y-1" role="status" aria-live="polite">
            <div className="relative h-3 w-full overflow-hidden rounded bg-white/10" aria-label={`Input level, peak ${Math.round(lvl.held)} dB`}>
              <div className={`h-full ${TONE[a.state]}`} style={{ width: `${meterPos(lvl.peakDb) * 100}%` }} />
              <div className="absolute top-0 h-full w-0.5 bg-white" style={{ left: `${meterPos(lvl.held) * 100}%` }} />
              <div className="absolute top-0 h-full w-px bg-white/40" style={{ left: `${meterPos(-18) * 100}%` }} title="-18 dB" />
              <div className="absolute top-0 h-full w-px bg-white/40" style={{ left: `${meterPos(-6) * 100}%` }} title="-6 dB" />
            </div>
            <p className={a.state === "clip" ? "text-mcz-ember" : a.state === "good" ? "text-emerald-300" : "text-white/70"}>
              Peak {lvl.held <= FLOOR_DB ? "—" : `${lvl.held.toFixed(1)} dB`}. {a.say}
            </p>
          </div>
        )}
        {err && <p className="text-mcz-ember">{err}</p>}
      </div>
    </details>
  );
}
