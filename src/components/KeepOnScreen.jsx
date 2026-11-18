// "Keep this session on screen" — the control on BodieZ's Today card.
//
// What it costs is stated BEFORE it is pressed (the cost/gain rule): it uses one of the day's sessions on
// screen (the server's `bodiez_float`: Free 3, Premium 6, StatZ unlimited), spends no ⚡ 🍥 🏷️, and a session
// counts once however many times it is switched off and on. The number, the wording of a refusal and the
// next plan's allowance are the server's; this decides nothing. A tier buys how OFTEN, never whether the
// session runs — past the number the session is untouched and BodieZ still shows everything.
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { floatPrice } from "../sessionHold.js";

export default function KeepOnScreen({ session, on, onChange, onKept }) {
  const [st, setSt] = useState(null);       // null = not asked yet / failed: no price is invented
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const kept = !!session?.floated_at;

  useEffect(() => {
    let live = true;
    api("/api/economy/bodiez/float/").then((d) => { if (live) setSt(d); }).catch(() => {});
    return () => { live = false; };
  }, [session?.id, kept]);

  const keep = async () => {
    setBusy(true); setErr("");
    try {
      const d = await api(`/api/economy/bodiez/sessions/${session.id}/float/`, { method: "POST", body: {} });
      setSt(d.float);
      onKept(d.floated_at);
      onChange(true);
    } catch (e) {
      // The server's sentence, unreworded — it says the session is untouched and nothing was charged.
      setErr(e.message || "Couldn't do that. Nothing was charged.");
    } finally { setBusy(false); }
  };

  const price = floatPrice(kept ? { ...(st || {}), already: true } : st);
  const blocked = !kept && price?.blocked;
  return (
    <div className="re-card space-y-1.5" data-tour="today-float">
      <div className="flex flex-wrap items-center gap-2">
        {kept ? (
          <button type="button" onClick={() => onChange(!on)}
                  className={`pill !py-1.5 text-xs ${on ? "ring-1 ring-emerald-400 text-emerald-300" : ""}`}
                  aria-pressed={on}>
            {on ? "✓ On screen over other apps — turn off" : "Turn on screen-keeping again"}
          </button>
        ) : (
          <button type="button" onClick={keep} disabled={busy || !st || !!blocked}
                  className="pill !py-1.5 text-xs disabled:opacity-50">
            🪟 Keep this session on screen over other apps
          </button>
        )}
        {price?.cost && <span className="text-xs font-semibold text-mcz-ember">{price.cost}</span>}
        {price?.text && <span className="text-xs text-emerald-300">{price.text}</span>}
      </div>
      {price && !blocked && <p className="text-[11px] text-white/45">{price.free} Open any app and a bar shows your rest and the next lift; the session keeps running.</p>}
      {blocked && <p className="text-[11px] text-amber-300/90">{blocked}</p>}
      {err && <p role="alert" className="text-[11px] text-mcz-ember">{err}</p>}
    </div>
  );
}
