// Audio settings for the DAW: which input and output to use, a live level meter with plain-words advice, and a monitor.
//
// The meter only opens the microphone when you press Check level (a browser permission prompt, so it is asked for when you
// want it, not on page load), listens, and lets go when you stop it. Nothing is recorded and nothing is sent anywhere.
// Hearing yourself is OFF by default and says why: a mic beside speakers feeds back, and the browser adds a delay you will
// hear. Outputs can only be chosen where the browser allows it (Chrome and Edge); the screen says when it does not.
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Volume2 } from "lucide-react";
import { FLOOR_DB, LATENCY_MODES, holdPeak, latencyMs, levelAdvice, levelFromSamples, meterPos, outputNameFor } from "./audioIO.js";

const TONE = { clip: "bg-red-500", hot: "bg-amber-400", good: "bg-emerald-400", low: "bg-sky-400", silent: "bg-white/30" };

export default function AudioSettings({ daw, onUseInput }) {
  const box = useRef(null);
  const [inputs, setInputs] = useState([]);
  const [input, setInput] = useState("");
  const [on, setOn] = useState(false);
  const [mon, setMon] = useState(false);
  const [lat, setLat] = useState(null);
  const [lvl, setLvl] = useState({ peakDb: FLOOR_DB, held: FLOOR_DB, clipped: false });
  const [err, setErr] = useState("");
  const [info, setInfo] = useState(null);
  const [mode, setMode] = useState(() => daw.latencyMode());
  const changeMode = async (e) => {
    setErr("");
    if (daw.isPlaying() || daw.isRecording()) { setErr("Stop playing or recording first: the audio quality changes when the audio engine restarts."); return; }
    stop();
    setMode(await daw.setLatencyMode(e.target.value));
    setInfo(null);
  };  const stream = useRef(null);
  const meter = useRef(null);
  const raf = useRef(0);
  // Every start and stop takes a number: a mic that finishes opening after a newer pick (or a Stop) is closed, not kept.
  const attempt = useRef(0);
  // Open (and bring into view) when a track's level bar is tapped, and remember the chosen output on this device.
  useEffect(() => {
    const f = () => { if (box.current) { box.current.open = true; box.current.scrollIntoView({ block: "center", behavior: "smooth" }); } };
    window.addEventListener("mcz-audio-settings", f);
    return () => window.removeEventListener("mcz-audio-settings", f);
  }, []);

  const list = useCallback(() => navigator.mediaDevices?.enumerateDevices?.().then((ds) => {
    // Every device the browser names, "Default" ones included: the Windows default is often the one that is not the mic you mean.
    setInputs(ds.filter((d) => d.kind === "audioinput"));
  }).catch(() => {}), []);
  useEffect(() => { list(); navigator.mediaDevices?.addEventListener?.("devicechange", list); return () => navigator.mediaDevices?.removeEventListener?.("devicechange", list); }, [list]);

  const stop = useCallback(() => {
    attempt.current += 1;
    cancelAnimationFrame(raf.current); daw.monitorOff(); meter.current?.stop(); meter.current = null;
    stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null;
    setOn(false); setMon(false);
  }, [daw]);
  useEffect(() => stop, [stop]);

  // `dev` is the mic to open: the one picked, or "" for the system default.
  const start = async (dev = input) => {
    setErr("");
    stop();
    const mine = attempt.current;
    try {
      // The same request the armed tracks make (daw.openMic): two opens of one mic with different settings is what a Bluetooth headset refuses.
      const s = await daw.openMic(dev);
      if (mine !== attempt.current) { s.getTracks().forEach((t) => t.stop()); return; }   // a newer pick, or Stop, came first
      stream.current = s;
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
      if (mine !== attempt.current) return;   // superseded: its outcome stands, not this one's error
      // The browser's own name and words are shown too, so a report says what the browser said, not only our guess at it.
      const said = e?.name && e.name !== "NoMediaDevices" ? ` Browser error: ${e.name}${e.message ? ` — ${e.message}` : ""}.` : "";
      setErr((e?.name === "NotAllowedError" ? "The browser blocked the microphone. Allow it for this site, then try again."
        : e?.name === "NotFoundError" ? "No microphone was found on this device. Pick another input, or reconnect the headset."
        : e?.name === "NotReadableError" ? "Windows or another app is holding this mic. A Bluetooth headset often does this: switch the headset off and on, or pick another input."
        : (e?.message || "Couldn't open that input.")) + said);
      stop();
    }
  };
  const prevClip = useRef(false);
  const test = async () => {
    setErr("");
    try {
      const i = await daw.testTone();
      const outs = ((await navigator.mediaDevices?.enumerateDevices?.().catch(() => [])) || []).filter((d) => d.kind === "audiooutput");
      setInfo({ ...i, to: outputNameFor(outs, daw.context().sinkId || "") });
    } catch (e) { setErr(e?.message || "Couldn't play the test sound."); }
  };

  const toggleMon = async () => {
    if (mon) { daw.monitorOff(); setMon(false); return; }
    if (!window.confirm("Hear yourself through the output? Use headphones: a mic next to speakers will squeal. You may also hear a small delay.")) return;
    try { await daw.monitorOn(stream.current); setMon(true); setLat(latencyMs(daw.context())); } catch (e) { setErr(e?.message || "Couldn't start monitoring."); }
  };

  // Changing the mic is allowed at any time except mid-take (a take keeps the mic it started on). While checking, the meter moves
  // to the new mic at once, so what you hear the level from is the mic you picked, without pressing Check level again.
  const pickInput = (dev) => {
    setErr("");
    if (daw.isRecording()) { setErr("Stop recording first: the take is using the mic it started on."); return; }
    setInput(dev);
    onUseInput?.(dev);
    if (on) start(dev);
  };
  const a = levelAdvice(lvl.held, lvl.clipped);
  return (
    <details ref={box} className="basis-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs" data-tour="daw-audio-settings">
      <summary className="cursor-pointer font-semibold text-white"><Volume2 size={12} className="mr-1 inline" />🎙️ Input &amp; 🎧 output: choose your mic and speakers, check levels</summary>
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-white/60"><Mic size={11} /> Input
            <select className="neon-input !w-auto !py-1" data-nomemo="true" value={input} aria-label="Input device" onChange={(e) => pickInput(e.target.value)}>
              <option value="">System default</option>
              {inputs.map((d, i) => <option key={d.deviceId || `input-${i}`} value={d.deviceId}>{d.label || `Input ${i + 1}`}</option>)}
            </select>
          </label>
          <span className="text-white/60">Output is the 🎧 menu beside the transport.</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-white/60">Audio quality
            <select className="neon-input !w-auto !py-1 [color-scheme:dark]" data-nomemo="true" aria-label="Audio quality" value={mode} onChange={changeMode} title={LATENCY_MODES[mode].what}>
              {Object.entries(LATENCY_MODES).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </select>
          </label>
          <span className="text-white/50">{LATENCY_MODES[mode].what} Bluetooth headphones add their own delay (often 150 to 250 ms) that no app can remove; use wired headphones to record.</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="re-btn !w-auto px-3" onClick={test}><Volume2 size={12} /> 🔊 Test sound</button>
          <span className="text-white/60">
            {info ? (info.state === "running"
              ? `Played a tone to ${info.to || "your output"}, at ${info.rate} Hz${info.latencyMs ? `, about ${info.latencyMs} ms delay` : ""}. Did you hear it? If not, it's the output device or the volume, not the app.`
              : `The audio engine is ${info.state}: the browser is holding audio until you click something on the page. Press Test sound again.`)
              : "Plays a short tone through your chosen output, so you can tell a silent output from a silent mix."}
          </span>
        </div>
        <p className="text-white/50">Choosing an input here sets it on every armed track, and each track can still take its own from its input menu. Changing it while checking moves the check to that mic. Armed tracks show a live level bar, so you can see the mic is heard before you record.</p>
        <div className="flex flex-wrap items-center gap-2">
          {!on ? <button type="button" className="re-btn !w-auto px-3" onClick={() => start()}><Mic size={12} /> Check level</button>
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
        <details className="rounded border border-white/10 bg-black/20 px-2 py-1" data-tour="audio-troubleshoot">
          <summary className="cursor-pointer text-white/80">Hear nothing, or the mic bar stays flat? Check these, in order</summary>
          <ol className="mt-1 list-decimal space-y-1 pl-4 text-white/70">
            <li><b>Restart Chrome.</b> Close every Chrome window and open it again. Chrome's audio can get stuck after a device is plugged in or unplugged or after another app takes the mic, and nothing short of a restart clears it.</li>
            <li><b>Close apps that listen to the mic:</b> Windows Voice Access (Win + Ctrl + S turns it off), Zoom, Teams, OBS, Discord, other browser tabs.</li>
            <li><b>Windows sound settings</b> (Settings, System, Sound): pick the right <b>Input</b> and watch "Test your microphone" move when you talk. Pick the right <b>Output</b>.</li>
            <li><b>Volume mixer:</b> right-click the speaker icon, Open volume mixer, and make sure Chrome isn't muted or at zero.</li>
            <li><b>Microphone privacy:</b> Settings, Privacy &amp; security, Microphone: allow apps and Chrome to use it.</li>
            <li><b>Exclusive mode:</b> in Sound, open your mic and speaker's Properties, Advanced, and untick "Allow applications to take exclusive control" so Chrome can share the device.</li>
            <li><b>Chrome's site settings:</b> click the icon at the left of the address bar, Site settings: Sound and Microphone should be Allow, and the mic should be the one you mean.</li>
            <li>Then press <b>🔊 Test sound</b> above. If you hear it, the speakers are fine. Arm a track and talk: the bar should move.</li>
          </ol>
        </details>
        {err && <p className="text-mcz-ember">{err}</p>}
      </div>
    </details>
  );
}
