// Mix check (StatZ, or the daily sample): headroom, frequency clashes and ducking — measured on this device,
// nothing sent, no credits. Each part says what it found BEFORE anything changes; Apply makes the change and
// Undo puts it back. It is StatZ's because it acts for the member (Corey's rule for automations).
import { useState } from "react";
import { StatzSample, useStatzTrial } from "../components/StatzSample.jsx";
import { bandSpectrum } from "../mastering/meter.js";
import { guessRole } from "../mastering/multitrack.js";
import { HEADROOM_TARGET, clashes, envelope, headroomMove, peakDb } from "./mixcheck.js";

export default function MixCheck({ tracks, measure, measureMix, apply, busy }) {
  const { s: statz } = useStatzTrial();
  const allowed = !!(statz?.is_statz || statz?.active);
  const [res, setRes] = useState(null);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState({});
  const lead = tracks.find((t) => (t.role || guessRole(t.name)) === "lead");
  const [duckId, setDuckId] = useState("");
  const duckable = tracks.filter((t) => t.id !== lead?.id);
  const duckTarget = duckable.find((t) => t.id === duckId) || duckable.find((t) => ["beat", "instrument"].includes(t.role || guessRole(t.name))) || duckable[0];

  const check = async () => {
    setErr(""); setRes(null); setDone({}); setWorking(true);
    try {
      const mix = await measureMix();
      const peak = peakDb(mix.channels);
      const rows = [];
      let leadEnv = null;
      for (const t of tracks) {
        const m = await measure(t);
        rows.push({ id: t.id, name: t.name, role: t.role || guessRole(t.name), bands: bandSpectrum(m.channels, m.rate) });
        if (lead && t.id === lead.id) leadEnv = envelope(m.channels, m.rate);
      }
      setRes({ peak, move: headroomMove(peak), cuts: clashes(rows), leadEnv });
    } catch (e) { setErr(e.message || "Couldn't measure the mix."); } finally { setWorking(false); }
  };
  const fmt = (v) => (Number.isFinite(v) ? `${v > 0 ? "+" : ""}${Math.round(v * 10) / 10} dB` : "silence");
  const act = (key, change) => { apply(change); setDone((d) => ({ ...d, [key]: true })); };

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs" data-tour="daw-mixcheck">
      <p className="font-semibold text-white">🧰 Mix check — headroom, clashes, ducking</p>
      {!allowed ? (
        <>
          <p className="text-white/60">Sets headroom for mastering, finds parts fighting in the same frequencies and dips them, and ducks the beat under the vocal. StatZ's — or try it in the free sample. Faders, EQ and automation by hand stay as they are.</p>
          <StatzSample what="Mix check" />
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="neon-btn-primary !w-auto px-3 !py-1.5" disabled={busy || working} onClick={check}>{working ? "Measuring…" : "Check the mix"}</button>
          <span className="text-white/60">Measured on this device · <span className="text-emerald-300">no credits</span> · nothing changes until you press Apply.</span>
        </div>
      )}
      {err && <p role="alert" className="text-mcz-ember">{err}</p>}
      {res && (
        <div className="space-y-2">
          <div className="rounded-lg bg-black/30 px-2 py-1.5">
            <p><span className="font-semibold text-white">Headroom</span> <span className="text-white/60">— the mix peaks at {fmt(res.peak)}; mastering wants about {HEADROOM_TARGET} dB.</span></p>
            {res.move ? (
              <button type="button" className="re-btn mt-1 !w-auto px-3 !py-1" disabled={done.head} onClick={() => act("head", { faders: res.move })}>
                {done.head ? "Applied — Undo puts it back" : `Move every fader ${fmt(res.move)} (the balance stays)`}
              </button>
            ) : <p className="text-emerald-300">Already about right.</p>}
          </div>
          <div className="rounded-lg bg-black/30 px-2 py-1.5">
            <p className="font-semibold text-white">Frequency clashes</p>
            {res.cuts.length ? (
              <>
                <ul className="mt-1 space-y-0.5 text-white/65">{res.cuts.map((c) => <li key={c.id}>{c.why}</li>)}</ul>
                <button type="button" className="re-btn mt-1 !w-auto px-3 !py-1" disabled={done.cuts} onClick={() => act("cuts", { cuts: res.cuts })}>
                  {done.cuts ? "Applied — Undo puts it back" : `Add ${res.cuts.length === 1 ? "the dip" : `${res.cuts.length} dips`} (an EQ on each)`}
                </button>
              </>
            ) : <p className="text-emerald-300">No two parts are fighting for the same frequencies.</p>}
          </div>
          <div className="rounded-lg bg-black/30 px-2 py-1.5">
            <p className="font-semibold text-white">Ducking</p>
            {!lead ? <p className="text-white/60">No track reads as the lead vocal — name one "vocal" or "lead" and check again.</p>
              : !duckTarget ? <p className="text-white/60">Nothing else to duck.</p> : (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-white/65">Dip</span>
                <select className="neon-input !w-auto !py-1" value={duckTarget.id} data-nomemo="true" onChange={(e) => setDuckId(e.target.value)}>
                  {duckable.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <span className="text-white/65">4 dB while {lead.name} is singing — drawn as a volume line you can edit.</span>
                <button type="button" className="re-btn !w-auto px-3 !py-1" disabled={done.duck || !res.leadEnv}
                        onClick={() => act("duck", { duck: { id: duckTarget.id, env: res.leadEnv } })}>
                  {done.duck ? "Applied — Undo puts it back" : "Duck it"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
