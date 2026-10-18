import { useEffect, useState } from "react";
import { Link2, Loader2, Undo2 } from "lucide-react";
import { api } from "../api.js";
import { StatzSample, useStatzTrial } from "./StatzSample.jsx";
import { normalize } from "../supersets.js";

// The Coach choosing superset partners for a routine. StatZ's, or the free hour's.
//
// Linking two lifts by hand is NOT gated and lives in the designer's own rows: a
// superset is just an order of work, and a tier that could say whether somebody
// may do two exercises in a row would be the ladder rule's first counter-example.
// What this sells is the Coach doing the choosing — and it says so up front, with
// the way to do it for free beside it, before anything is pressed.
//
// It decides nothing. The modes, what each means and the example all come from
// `/api/economy/bodiez/pair/`; the pairing itself is the server's `superset.py`,
// and the rows come back in the same shape a hand-made pair has, so the designer
// edits them like any other. Nothing is saved here: the member reads what was
// paired, can undo it, and saves the routine as they always do.
export default function PairWithCoach({ rows, equipment, nameOf, onApply }) {
  const { s } = useStatzTrial();
  const allowed = !!(s?.is_statz || s?.active);
  const [offer, setOffer] = useState(null);
  const [mode, setMode] = useState("");
  const [add, setAdd] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [before, setBefore] = useState(null);

  useEffect(() => {
    api("/api/economy/bodiez/pair/").then((o) => {
      setOffer(o);
      setMode((m) => m || o?.modes?.[0]?.key || "");
    }).catch(() => setOffer(null));
  }, []);

  // No modes means the endpoint was not there: render nothing rather than a
  // control that cannot do what it says.
  if (!offer?.modes?.length) return null;
  const chosen = offer.modes.find((m) => m.key === mode);

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const out = await api("/api/economy/bodiez/pair/", {
        method: "POST",
        body: {
          mode, add, equipment,
          exercises: rows.map((r) => ({
            exercise_id: r.exercise_id, sets: r.sets ? Number(r.sets) : undefined,
            reps: r.reps ? Number(r.reps) : undefined,
            weight_kg: r.weight_kg === "" || r.weight_kg == null ? null : Number(r.weight_kg),
            ...(r.group ? { group: r.group } : {}),
          })),
        },
      });
      setBefore(rows);
      setResult(out);
      onApply(normalize(out.exercises));
    } catch (e) {
      setErr(e.message || "The Coach couldn't pair that.");
    }
    setBusy(false);
  }

  const undo = () => { if (before) onApply(before); setResult(null); setBefore(null); };

  return (
    <div className="space-y-2 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/[0.04] p-3" data-tour="bodiez-pairing">
      <p className="re-label flex items-center gap-1.5"><Link2 size={13} /> Pair with the Coach</p>
      <div className="space-y-1">
        {offer.modes.map((m) => (
          <label key={m.key} className="flex cursor-pointer items-start gap-2 text-xs text-white/70">
            <input type="radio" name="pair-mode" className="mt-0.5" checked={mode === m.key}
                   onChange={() => setMode(m.key)} />
            <span><span className="font-semibold text-white/90">{m.label}</span> — {m.what}{" "}
              <span className="text-white/40">e.g. {m.example}</span></span>
          </label>
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60">
        <input type="checkbox" checked={add} onChange={(e) => setAdd(e.target.checked)} />
        Add a partner when a lift has none (it is marked as the Coach's, and you can remove it)
      </label>

      {allowed ? (
        <div className="flex flex-wrap items-center gap-2">
          <button className="neon-btn-primary !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
                  disabled={busy || !mode || rows.length === 0} onClick={run}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />} Pair these
          </button>
          {/* No resource moves, so there is no price to state — only that nothing is saved yet. */}
          <span className="text-[11px] text-white/45">
            {s?.active && !s?.is_statz ? "Using your StatZ sample. " : ""}
            Nothing is saved until you press Save routine.
          </span>
        </div>
      ) : (
        <div className="space-y-1">
          <StatzSample what="Coach supersets" />
          <p className="text-[11px] text-white/45">{offer.manual} Use the link button on a lift's row.</p>
        </div>
      )}

      {err && <p role="alert" className="text-xs text-mcz-ember">{err}</p>}

      {result && (
        <div className="space-y-1 border-t border-white/10 pt-2 text-xs text-white/70">
          {result.pairs.length === 0 && (
            <p>Nothing to pair here{chosen ? ` for “${chosen.label}”` : ""}. {offer.manual}</p>
          )}
          {result.pairs.map((p) => (
            <p key={p.group}>
              <span className="font-semibold text-fuchsia-300">{p.group}</span>{" "}
              {p.names.join(" + ")} <span className="text-white/40">— {p.why}</span>
            </p>
          ))}
          {result.added.length > 0 && (
            <p className="text-white/50">
              Added: {result.added.map((id) => nameOf(id)).join(", ")}.
            </p>
          )}
          {result.left_single.length > 0 && result.pairs.length > 0 && (
            <p className="text-white/40">
              Left as they were: {result.left_single.map((id) => nameOf(id)).join(", ")}.
            </p>
          )}
          <button className="inline-flex items-center gap-1 text-mcz-cyan hover:underline" onClick={undo}>
            <Undo2 size={12} /> Undo
          </button>
        </div>
      )}
    </div>
  );
}
