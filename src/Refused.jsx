// A refusal, turned into the offer it always was.
//
// `api.js` has carried the whole refusal body on the error since it was
// written, for a reason it states out loud: "every screen that wanted to turn
// a 403 into an offer had to re-request something to find out what it had just
// been refused." Nothing ever did. So a member who could not afford a battle
// entry got one grey sentence and a dead end — at the exact moment they had
// already decided they wanted the thing, which is the one moment the answer is
// worth reading.
//
// This is that answer, in the shape the cost/gain rule asks for: what it costs
// in ember, what you hold, and the gap between them — then the ways to close
// the gap, from `/api/economy/earn/`, so the list here can never drift from
// what the server actually pays.
//
// Two things it deliberately does NOT do:
//
//   * No invented urgency. No countdown, no "2 left", no streak about to
//     lapse. A number nobody can check, in front of a button that takes money,
//     is the substance rule's failure case — and the honest urgency is already
//     here anyway: Energy regenerates, so "wait, or do one of these now" is a
//     real fork and reads as one.
//   * No copy of its own for the ways out. It renders what the server lists.
//     A second list of ways to earn, written into a screen, is how "20 free
//     prompts" reached nine files.
import { AlertCircle } from "lucide-react";
import EarnInstead from "./EarnInstead.jsx";
import { ENERGY, MONEY, PROMPTZ, SPINAZ } from "./resources.js";
import { labelForSkill } from "./personaSkills.js";

const EMOJI = { energy: ENERGY, spinaz: SPINAZ, promptz: PROMPTZ, money: MONEY };

/** The refusal body off an api.js error, whichever way it was handed over. */
const bodyOf = (err) => (err && (err.data || err)) || null;

/** True when this error is a priced refusal this component can render. */
export const isInsufficient = (err) => Boolean(bodyOf(err)?.insufficient);

export default function Refused({ err, title = "" }) {
  const d = bodyOf(err);
  if (!d?.insufficient) return null;

  const res = d.resource || "energy";
  const mark = EMOJI[res] || "";
  // The server names the gap rather than the screen subtracting it: one
  // arithmetic, server-side, is one that cannot disagree with the charge.
  const need = d.energy_needed ?? d.cost?.amount ?? 0;
  const have = d.energy_available ?? 0;
  const short = d.energy_short ?? Math.max(0, need - have);

  return (
    // Not a neon-frame: this renders INSIDE the panel holding the button that
    // was refused, and a frame inside a frame reads as a second thing.
    <div className="space-y-3 rounded-lg border border-mcz-ember/30 bg-mcz-ember/[0.04] p-3">
      <p className="flex items-start gap-2 text-[13px] text-white/85">
        <AlertCircle size={15} className="mt-0.5 shrink-0 text-mcz-ember" />
        <span>{title || d.detail}</span>
      </p>

      {/* The three numbers, in the paradigm's colours: what it takes, what you
          hold, and the only one that decides anything — the difference. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
        <span className="text-mcz-ember">−{need} {mark}</span>
        <span className="text-white/45">you have {have} {mark}</span>
        {short > 0 && (
          <span className="font-bold text-white/85">{short} {mark} short</span>
        )}
      </div>

      {/* Which priced skills added up to that. A total with no lines under it
          is a bill; this is what makes it a price. */}
      {Array.isArray(d.lines) && d.lines.length > 0 && (
        <ul className="space-y-0.5 text-[11px] text-white/45">
          {d.lines.map((l, i) => (
            <li key={`${l.skill}-${i}`} className="flex justify-between gap-3">
              <span className="truncate">{labelForSkill(l.skill)}</span>
              <span className={l.cents ? "text-white/60" : "text-white/25"}>
                {l.cents ? `${l.cents} ${mark}` : "unpriced"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <EarnInstead resource={res} title="Close the gap" />
    </div>
  );
}
