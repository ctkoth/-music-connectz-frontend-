// The QuestZ board — the rows, the streak line and the claim.
//
// This lived inside MimeZ.jsx, which is how it shipped and is not where it
// belongs. `questz.py` opens by saying what it is: Energy regenerates from
// REACH, so a member with no audience earns zero an hour — not slowly, zero —
// while Energy is what an OCC run, a GameZ build and a priced post all cost.
// Quests are the income that exists before reach does.
//
// A member who cannot afford to do anything was therefore being asked to find
// their income inside "silent-performance training and practice drills". That
// is the same failure CLAUDE.md already records about the offer engine
// shipping with its only surface inside PostZ — a feature with no tab, that
// nobody can be sent to.
//
// So the board is a component now and the tab is its own. MimeZ still renders
// it, because one of the dailies sends you there and arriving to find the
// quest gone would be worse than where we started. Two mount points, ONE
// implementation — a second copy is two boards that disagree about what a
// streak is worth.
import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Flame, Lock, Zap } from "lucide-react";
import { api } from "./api.js";
import { useSay } from "./voice.js";
import { P } from "./phrases.js";
import { playSound } from "./sound.js";
import { asList } from "./shape.js";
import { goToSpot } from "./goto.js";
import { ENERGY } from "./resources.js";

const SCOPES = [
  ["daily", "Today", "Resets at midnight."],
  ["weekly", "This week", "Resets Monday."],
  ["once", "Milestones", "Once each, ever — this is the on-ramp."],
];

function Bar({ done, target }) {
  const pct = Math.min(100, Math.round((done / Math.max(1, target)) * 100));
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
      <div className="h-full rounded-full bg-mcz-gold transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Quest({ q, onClaim, busy }) {
  const done = q.done >= q.target;
  return (
    <div className={`rounded-lg border p-3 ${q.claimed
      ? "border-emerald-400/25 bg-emerald-400/[0.04]"
      : done ? "border-mcz-gold/40 bg-mcz-gold/[0.05]"
             : "border-white/[0.08] bg-white/[0.02]"}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[13px] font-semibold text-white">{q.title}</span>
        {/* The gain, up front — green plus, resource emoji, never a bare
            number. A quest whose reward you learn by finishing it is the same
            failure as a price you learn by paying it. */}
        <span className="text-[11px] font-semibold text-emerald-300">
          +{q.energy} {ENERGY}
        </span>
        {q.energy !== q.base_energy && (
          <span className="text-[10px] text-mcz-gold">streak bonus on {q.base_energy}</span>
        )}
        <span className="ml-auto text-[11px] tabular-nums text-white/45">
          {Math.min(q.done, q.target)}/{q.target}
        </span>
      </div>

      <p className="mt-1 text-[11px] leading-relaxed text-white/55">{q.what}</p>
      <p className="mt-0.5 text-[11px] italic leading-relaxed text-white/35">{q.why}</p>
      <Bar done={q.done} target={q.target} />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {q.claimed ? (
          <span className="flex items-center gap-1 text-[11px] text-emerald-300">
            <Check size={12} /> Claimed
          </span>
        ) : q.capped ? (
          // Not a disabled button. The Energy isn't lost, it's deferred, and
          // saying that is the difference between a limit and a punishment.
          <span className="flex items-center gap-1 text-[11px] text-mcz-ember">
            <Lock size={12} /> Today's ceiling reached — this keeps until tomorrow
          </span>
        ) : q.claimable ? (
          <button className="neon-btn-primary !w-auto px-4 !py-1.5 text-xs"
                  onClick={() => onClaim(q)} disabled={busy}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            {" "}Claim +{q.energy} {ENERGY}
          </button>
        ) : (
          // Every quest is a doorway. Landing on the control beats landing on
          // the tab and leaving somebody to hunt for it.
          <button className="pill !text-[11px] hover:!text-white"
                  onClick={() => goToSpot(q.app, q.target_anchor)}>
            Take me there →
          </button>
        )}
      </div>
    </div>
  );
}

export default function QuestBoard() {
  const talk = useSay();
  const [board, setBoard] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api("/api/economy/questz/").then(setBoard).catch((e) => setMsg(e.message || "Couldn't load quests."));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function claim(q) {
    setBusy(q.id); setMsg("");
    try {
      const r = await api(`/api/economy/questz/${q.id}/claim/`, { method: "POST", body: {} });
      setBoard(r);
      setMsg(talk(P.mimez_claimed(r.energy, q.title)));
      playSound("energy_gain");
    } catch (e) {
      // The server's real reason, never a cheerful lie. A claim that quietly
      // fails while the screen says "done" is the worst bug class in this app.
      setMsg(e.message || "Couldn't claim that one.");
      load();
    } finally { setBusy(""); }
  }

  const quests = asList(board?.quests);

  return (
    <div className="space-y-4">
      {/* Why quests exist at all, in the member's terms. Served by the API so
          this screen and the economy can't tell different stories. */}
      {board?.note && (
        <p className="rounded-lg border border-mcz-cyan/20 bg-mcz-cyan/[0.04] px-3 py-2 text-[12px] leading-relaxed text-white/70">
          {board.note}
        </p>
      )}

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">{msg}</p>}

      {board && (
        <div className="re-card flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
          <span className="flex items-center gap-1.5 text-white/70">
            <Flame size={14} className={board.streak_days ? "text-mcz-ember" : "text-white/25"} />
            {board.streak_days
              ? <>{board.streak_days}-day streak · dailies pay ×{board.streak_multiplier}</>
              : <>No streak yet — claim a daily to start one</>}
          </span>
          {board.next_streak_step && (
            <span className="text-white/40">
              {board.next_streak_step - board.streak_days} more day
              {board.next_streak_step - board.streak_days === 1 ? "" : "s"} for the next step
            </span>
          )}
          <span className="ml-auto text-white/45">
            {board.minted_today}/{board.daily_cap} {ENERGY} claimed today
          </span>
        </div>
      )}

      {board === null && !msg ? (
        <p className="flex items-center gap-2 text-white/50">
          <Loader2 className="animate-spin" size={16} /> Loading quests…
        </p>
      ) : (
        SCOPES.map(([scope, label, note]) => {
          const rows = quests.filter((q) => q.scope === scope);
          if (!rows.length) return null;
          return (
            <div key={scope} className="space-y-2" data-tour={`questz-${scope}`}>
              <div className="flex items-baseline gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
                  {label}
                </h3>
                <span className="text-[11px] text-white/30">{note}</span>
              </div>
              {rows.map((q) => (
                <Quest key={q.id} q={q} onClaim={claim} busy={busy === q.id} />
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
