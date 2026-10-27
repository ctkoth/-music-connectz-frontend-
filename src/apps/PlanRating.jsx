// A routine's Plan rating: how closely it, as written, follows its goal's prescription — each check shown with the lift
// that decided it. NOT the Thorough rating (that comes from sessions trained, and the caveat the server sends says so).
// When it is under 10 and the Planner can fix what failed, it offers the fix and SHOWS it first: the score before and
// after, which check moved, and which lift moved it. Nothing is saved until Apply.
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../api.js";
import { RatingRow } from "../components/Rating.jsx";
import { canFix, checkMoves, mark, moveText, planDetail, stillYours } from "../planRating.js";

export default function PlanRating({ routine, caveat, onApply, autoOpen = false }) {
  const plan = routine.plan;
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [done, setDone] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(!!autoOpen);

  const propose = async () => {
    setBusy(true); setErr(""); setDone("");
    try {
      setProposal(await api("/api/economy/bodiez/routines/plan/", {
        method: "POST", body: { exercises: routine.exercises, goal: routine.goal || "", polish: true, compare_to: routine.id } }));
    } catch (e) { setErr(e.message || "Couldn't check that. Nothing was changed."); }
    finally { setBusy(false); }
  };
  const apply = async () => {
    setBusy(true); setErr("");
    try {
      if (await onApply(proposal.polished.exercises)) {
        setDone(`Plan ${moveText(proposal.polished.compare)}.`);
        setProposal(null);
      } else setErr("Couldn't save that. Nothing was changed.");
    } catch (e) { setErr(e.message || "Couldn't save that. Nothing was changed."); }
    finally { setBusy(false); }
  };

  // Landed on from "Improve this routine": the checks are open and, when the Planner can fix something, its proposal is
  // already on screen (the member sees every change before Apply — nothing is saved by arriving).
  useEffect(() => { if (autoOpen && plan && canFix(plan)) propose(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!plan) return null;

  const p = proposal?.polished;
  return (
    <div className="space-y-1.5" data-testid="plan-rating">
      {plan.score != null
        ? <RatingRow value={Math.round(plan.score)} exact={plan.score} label="Plan" detail={planDetail(plan)} outOf size="sm" />
        : <p className="text-[11px] text-white/40">Plan: {planDetail(plan)}</p>}
      {(plan.checks || []).length > 0 && (
        <details className="text-[11px] text-white/55" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
          <summary className="cursor-pointer text-mcz-cyan/80">What the Plan checks</summary>
          <ul className="mt-1 space-y-0.5">
            {plan.checks.map((c) => (
              <li key={c.key} className={c.ok === false ? "text-amber-200" : ""}>
                <span className="mr-1 font-semibold">{mark(c.ok)}</span>
                <b className="font-semibold text-white/80">{c.label}.</b> {c.detail}
              </li>
            ))}
          </ul>
          {caveat && <p className="mt-1 text-white/35">{caveat}</p>}
        </details>
      )}
      {canFix(plan) && !proposal && (
        <button type="button" className="neon-btn-ghost !w-auto px-3 py-1 text-[11px] inline-flex items-center gap-1" disabled={busy} onClick={propose}>
          {busy ? <Loader2 size={11} className="animate-spin" /> : null} Let the Planner fix this
        </button>
      )}
      {p && (
        <div className="space-y-1 rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.05] p-2 text-[11px] text-white/70" data-testid="plan-proposal">
          <p className="font-semibold text-white">Plan {moveText(p.compare)} if the Planner fixes it</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {p.changes.map((c, i) => <li key={i}>{c.what}</li>)}
          </ul>
          {checkMoves(p.compare).map((m) => <p key={m.key} className="text-white/45">{m.text}</p>)}
          {stillYours(p.plan).length > 0 && (
            <p className="text-amber-200">Still yours to fix: {stillYours(p.plan).map((c) => c.detail).join(" ")}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" className="neon-btn-primary !w-auto px-3 py-1 text-[11px]" disabled={busy} onClick={apply}>Apply</button>
            <button type="button" className="neon-btn-ghost !w-auto px-3 py-1 text-[11px]" disabled={busy} onClick={() => setProposal(null)}>Not now</button>
            <span className="self-center text-white/35">Free · weights are untouched.</span>
          </div>
        </div>
      )}
      {done && <p className="text-[11px] text-emerald-300">{done}</p>}
      {err && <p role="alert" className="text-[11px] text-mcz-ember">{err}</p>}
    </div>
  );
}
