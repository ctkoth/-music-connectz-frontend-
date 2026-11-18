// "Answered by 🎹 Opus ▾" — which Claude writes the coach's answer, beside the button that sends the take.
//
// Gemini listens to the take (no Claude model takes audio); Claude writes the answer, on the member's own engine,
// capped by their plan — Free picks Haiku or Sonnet, Premium reaches Opus, StatZ reaches Fable (Corey's ladder). The
// list, the member's engine, what each plan reaches and the sentence are the server's (`think` on GET /api/<key>/coach/);
// this decides nothing. Higher engines are shown, locked, with the plan that has them: a ladder you cannot see is a
// secret, not an upsell. Changing it saves the SAME choice the OCC picker uses (PATCH /api/economy/ai/models/), then
// asks the coach again, so the free-today line and the ⚡ beside the button are judged on the engine shown.
import { useState } from "react";
import { api } from "../api.js";

const PLAN = { free: "Free", premium: "Premium", statz: "StatZ" };

export default function EnginePick({ think, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!think?.configured || !think?.engine || !Array.isArray(think.engines)) return null;
  const change = async (key) => {
    if (!key || key === think.engine.key) return;
    setBusy(true); setErr("");
    try {
      await api("/api/economy/ai/models/", { method: "PATCH", body: { model: key } });
      await onChanged?.();
    } catch (e) { setErr(e.message || "Couldn't switch engine."); }
    finally { setBusy(false); }
  };
  return (
    <span className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 text-[11px] text-white/60" data-tour="coach-engine">
      <label className="flex min-w-0 items-center gap-1">
        Answered by
        <select className="neon-input !w-auto !py-1 text-[11px]" data-nomemo="true" value={think.engine.key}
                disabled={busy} onChange={(e) => change(e.target.value)}
                title={think.note || ""}>
          {think.engines.map((e) => (
            <option key={e.key} value={e.key} disabled={!e.allowed}>
              {e.emoji} {e.name}{e.allowed ? "" : ` — ${PLAN[e.required_tier] || e.required_tier}`}
            </option>
          ))}
        </select>
      </label>
      {think.note && <span className="text-white/40">{think.note}</span>}
      {err && <span role="alert" className="text-mcz-ember">{err}</span>}
    </span>
  );
}
