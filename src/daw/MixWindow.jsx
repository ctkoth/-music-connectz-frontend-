// The Mix window: one channel strip per track, then the master — inserts at the top, pan, the fader
// with its dB, and a meter. It changes the session through `onTrack` / `onInserts`; faders and pans
// reach a playing session at once (the engine's setLive), an insert change restarts playback where it
// was because a chain is wired when playback starts.
import { useEffect, useRef, useState } from "react";
import { Power, X } from "lucide-react";
import { GAIN_DB } from "./session.js";
import { EQ_GAIN, MAX_INSERTS, PLUGINS, newInsert } from "./plugins.js";
import EqBands from "../components/EqBands.jsx";
import { reads } from "./automation.js";
import { StatzSample, useStatzTrial } from "../components/StatzSample.jsx";
import TonePicker, { useTonePresets } from "./TonePresets.jsx";

const fmtDb = (v) => (v <= GAIN_DB.min ? "−∞" : `${v > 0 ? "+" : ""}${v.toFixed(1)}`);

/** Live meters, read from the engine on their own animation frame so the rest of the screen does not re-render 60 times a second. */
function useMeters(daw, on) {
  const [m, setM] = useState({});
  useEffect(() => {
    if (!on) { setM({}); return undefined; }
    let raf = 0; let last = 0;
    const tick = (now) => {
      if (now - last > 66) { setM(daw.meters()); last = now; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [daw, on]);
  return m;
}

function Meter({ db }) {
  const pct = Number.isFinite(db) ? Math.max(0, Math.min(100, ((db + 60) / 60) * 100)) : 0;
  const hot = db > -3;
  return (
    <div className="relative h-32 w-2 overflow-hidden rounded bg-white/10" aria-hidden="true">
      <div className={`absolute bottom-0 w-full ${hot ? "bg-red-500" : db > -12 ? "bg-yellow-400" : "bg-emerald-400"}`} style={{ height: `${pct}%` }} />
    </div>
  );
}

function InsertEditor({ insert, onChange, onClose, bands }) {
  const spec = PLUGINS[insert.type];
  return (
    <div className="mt-1 space-y-1 rounded-xl border border-white/15 bg-black/60 p-2 text-[10px]">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-white">{spec.emoji} {spec.label}</span>
        <button type="button" onClick={onClose} aria-label="Close"><X size={12} /></button>
      </div>
      <p className="text-white/50">{spec.what}</p>
      {insert.type === "eq" && (
        <EqBands compact bands={insert.bands || []} gainMax={EQ_GAIN} cap={bands?.cap} above={bands?.above} name="EQ"
          onChange={(list) => onChange({ ...insert, bands: list })} />
      )}
      {Object.entries(spec.params).map(([k, p]) => (
        <label key={k} className="block">
          <span className="flex justify-between text-white/70"><span>{p.label}</span><span className="tabular-nums">{insert.params[k]}{p.unit && ` ${p.unit}`}</span></span>
          <input type="range" min={p.min} max={p.max} step={p.step} value={insert.params[k]} className="w-full"
                 onChange={(e) => onChange({ ...insert, params: { ...insert.params, [k]: Number(e.target.value) } })} />
        </label>
      ))}
    </div>
  );
}

function Strip({ name, color, gain, pan, mute, solo, invert, inserts, meter, onTrack, onInserts, master, auto = {}, tones, bands }) {
  const [open, setOpen] = useState(null);
  const pick = useRef(null);
  // The plugin-grade effects (PLUGINS[k].statz) are StatZ's or the sample's to ADD; one already on the track plays.
  const { s: st } = useStatzTrial();
  const fxOk = !!(st?.is_statz || st?.active);
  const [fxLocked, setFxLocked] = useState(false);
  const setInsert = (next) => onInserts(inserts.map((x) => (x.id === next.id ? next : x)));
  return (
    // A strip widens while its EQ is open: band rows need room for "2.8 kHz" and "−6.0 dB".
    <div className={`flex ${inserts.some((x) => x.id === open && x.type === "eq") ? "w-64" : "w-36"} shrink-0 flex-col gap-1.5 rounded-xl border border-white/10 bg-black/40 p-2 text-[10px]`}>
      <div className="flex items-center gap-1">
        <span className="h-3 w-1.5 rounded" style={{ background: color }} />
        <span className="truncate font-semibold text-white">{name}</span>
      </div>
      {!master && (
        <>
          {tones && <TonePicker tones={tones} inserts={inserts} onApply={onInserts} trackName={name} statzOk={fxOk} />}
          <p className="uppercase tracking-wider text-white/55">Inserts</p>
          {inserts.map((ins) => (
            <div key={ins.id}>
              <div className="flex items-center gap-1 rounded bg-white/10 px-1 py-0.5">
                <button type="button" aria-label={`${ins.on ? "Bypass" : "Turn on"} ${PLUGINS[ins.type].label}`} aria-pressed={ins.on}
                        className={ins.on ? "text-emerald-300" : "text-white/30"} onClick={() => setInsert({ ...ins, on: !ins.on })}><Power size={11} /></button>
                <button type="button" className="min-w-0 flex-1 truncate text-left text-white/80" onClick={() => setOpen(open === ins.id ? null : ins.id)}>
                  {PLUGINS[ins.type].emoji} {PLUGINS[ins.type].label}
                </button>
                <button type="button" aria-label={`Remove ${PLUGINS[ins.type].label}`} className="text-white/55 hover:text-mcz-ember"
                        onClick={() => onInserts(inserts.filter((x) => x.id !== ins.id))}><X size={11} /></button>
              </div>
              {open === ins.id && <InsertEditor insert={ins} onChange={setInsert} onClose={() => setOpen(null)} bands={bands} />}
            </div>
          ))}
          {inserts.length < MAX_INSERTS && (
            <select ref={pick} className="rounded bg-white/10 px-1 py-0.5 text-white/70" data-nomemo="true" value="" aria-label={`Add an effect to ${name}`}
                    onChange={(e) => {
                      if (PLUGINS[e.target.value]?.statz && !fxOk) { setFxLocked(true); return; }
                      const ins = newInsert(e.target.value); if (ins) { onInserts([...inserts, ins]); setOpen(ins.id); }
                    }}>
              <option value="">+ Add effect</option>
              <optgroup label="Free">
                {Object.entries(PLUGINS).filter(([, p]) => !p.statz).map(([k, p]) => <option key={k} value={k}>{p.emoji} {p.label}</option>)}
              </optgroup>
              <optgroup label={fxOk ? "StatZ" : "StatZ — try the free sample"}>
                {Object.entries(PLUGINS).filter(([, p]) => p.statz).map(([k, p]) => <option key={k} value={k}>{p.emoji} {p.label}{fxOk ? "" : " 🔒"}</option>)}
              </optgroup>
            </select>
          )}
          {fxLocked && !fxOk && <StatzSample what="The pro effects (saturation, chorus, de-esser, limiter, glue compressor, pro reverb, pro delay, widener)" />}
          <label className="mt-1 block text-white/60">
            {auto.pan && <span className="mr-1 rounded bg-emerald-500/20 px-1 text-emerald-300" title="Pan follows its automation lane">auto</span>}
            Pan {pan === 0 ? "C" : pan < 0 ? `L${Math.round(-pan * 100)}` : `R${Math.round(pan * 100)}`}
            <input type="range" min={-1} max={1} step={0.01} value={pan} className="w-full" onDoubleClick={() => onTrack({ pan: 0 })}
                   onChange={(e) => onTrack({ pan: Number(e.target.value) })} aria-label={`${name} pan`} />
          </label>
        </>
      )}
      <div className="flex items-end justify-center gap-2">
        <input type="range" min={GAIN_DB.min} max={GAIN_DB.max} step={0.1} value={gain} aria-label={`${name} fader`}
               className="h-32 [writing-mode:vertical-lr] [direction:rtl]" onDoubleClick={() => onTrack({ gain: 0 })}
               onChange={(e) => onTrack({ gain: Number(e.target.value) })} />
        <Meter db={meter} />
      </div>
      <p className="text-center tabular-nums text-white/80">{fmtDb(gain)} dB</p>
      {auto.volume && <p className="text-center text-emerald-300" title="While it plays, the level follows the track's volume lane; the fader is used when the lane is off">follows its lane</p>}
      {!master && (
        <div className="flex justify-center gap-1 font-bold">
          <button type="button" aria-pressed={solo} className={`rounded px-2 py-0.5 ${solo ? "bg-yellow-400 text-black" : "bg-white/10 text-white/60"}`} onClick={() => onTrack({ solo: !solo })}>S</button>
          {!master && <button type="button" aria-pressed={!!invert} title="Flip polarity (the same sound upside down)" aria-label="Flip polarity"
                  className={`rounded px-2 py-0.5 ${invert ? "bg-mcz-cyan text-black" : "bg-white/10 text-white/60"}`} onClick={() => onTrack({ invert: !invert })}>Ø</button>}
          <button type="button" aria-pressed={mute} className={`rounded px-2 py-0.5 ${mute ? "bg-sky-500 text-black" : "bg-white/10 text-white/60"}`} onClick={() => onTrack({ mute: !mute })}>M</button>
        </div>
      )}
    </div>
  );
}

export default function MixWindow({ session, daw, playing, onTrack, onInserts, onMaster, writeAuto, onWriteAuto, autoMode = "latch", onAutoMode, autoAllowed = false, bands }) {
  const meters = useMeters(daw, playing);
  const tones = useTonePresets();
  return (
    <div className="space-y-2">
      {onWriteAuto && !autoAllowed && (
        <div className="rounded-lg border border-white/10 p-2 text-[11px]" data-tour="daw-automation">
          <StatzSample what="Writing automation (ride a fader and keep the move)" />
        </div>
      )}
      {onWriteAuto && autoAllowed && (
        <div className={`flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] ${writeAuto ? "border-red-500/60 bg-red-500/10" : "border-white/10"}`}
             data-tour="daw-automation">
          <button type="button" aria-pressed={!!writeAuto} onClick={() => onWriteAuto(!writeAuto)}
                  className={`rounded px-2 py-0.5 font-bold ${writeAuto ? "bg-red-600 text-white" : "bg-white/10 text-white/70"}`}>
            ✍️ Write automation {writeAuto ? "on" : "off"}
          </button>
          {onAutoMode && (
            <span className="flex items-center gap-1" role="group" aria-label="Automation write mode">
              {[["latch", "Latch", "Keeps writing from your first move until you press Stop."], ["touch", "Touch", "Writes only while you hold the control; the lane takes over again when you let go."]].map(([k, label, tip]) => (
                <button key={k} type="button" title={tip} aria-pressed={autoMode === k} onClick={() => onAutoMode(k)}
                        className={`rounded px-2 py-0.5 ${autoMode === k ? "bg-white text-black" : "bg-white/10 text-white/70"}`}>{label}</button>
              ))}
            </span>
          )}
          <span className="text-white/60">
            {writeAuto
              ? (autoMode === "touch" ? "Press play and move a fader or pan: only the part you hold is written; let go and the lane takes over again." : "Press play and move any fader or pan: the move is recorded on that track from the playhead. Stop to keep the pass.")
              : "Turn on, press play and ride the faders — every move becomes a line you can edit in Tracks."}
          </span>
        </div>
      )}
      <p className="text-[11px] text-white/50">Faders and pans move while it plays. Double-tap a fader or pan to reset it. Every effect is built in and free.</p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {session.tracks.map((t) => (
          <Strip key={t.id} name={t.name} color={t.color} gain={t.gain} pan={t.pan} mute={t.mute} solo={t.solo} invert={t.invert} inserts={t.inserts}
                 auto={{ volume: reads(t, "volume"), pan: reads(t, "pan") }} tones={tones} bands={bands}
                 meter={meters[t.id]} onTrack={(patch) => onTrack(t.id, patch)} onInserts={(list) => onInserts(t.id, list)} />
        ))}
        <Strip master name="Master" color="#ffffff" gain={session.master} pan={0} inserts={[]} meter={meters.master}
               onTrack={(patch) => onMaster(patch.gain)} onInserts={() => {}} />
      </div>
    </div>
  );
}
