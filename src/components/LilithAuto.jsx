// "Lilith adds tasks for you" — StatZ's, like every automation. The switch, what it does in one
// sentence (the server's `what`), and what she added on this open, each with its reason. Without
// StatZ it says so and offers the sample; the suggestions below still work for everyone.
import { useState } from "react";
import { api } from "../api.js";
import { StatzSample } from "./StatzSample.jsx";

export default function LilithAuto({ auto, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!auto) return null;
  const flip = async () => {
    setBusy(true); setErr("");
    try { await api("/api/economy/lilith/auto/", { method: "POST", body: { on: !auto.on } }); onChanged?.(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[12px]" data-tour="lilith-auto">
      {!auto.allowed ? (
        <>
          <StatzSample what="Automatic tasks" />
          <p className="text-white/60">{auto.locked}</p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" aria-pressed={auto.on} disabled={busy} onClick={flip}
                    className={`rounded px-2 py-0.5 font-semibold ${auto.on ? "bg-emerald-500 text-black" : "bg-white/10 text-white/70"}`}>
              🤖 Lilith adds tasks for me: {auto.on ? "on" : "off"}
            </button>
            <span className="text-white/50">{auto.what}</span>
          </div>
          {auto.added?.length > 0 && <p className="text-white/50">Added in the last 24 hours:</p>}
          {auto.added?.length > 0 && auto.added.map((a) => (
            <p key={a.id} className="text-white/75">🤖 Added <b>{a.title}</b> — {a.why}</p>
          ))}
        </>
      )}
      {err && <p className="text-mcz-ember">{err}</p>}
    </div>
  );
}
