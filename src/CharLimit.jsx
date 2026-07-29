// The character counter and the upgrade nudge that goes with it.
//
// Three states, because a limit you only discover by hitting it is the worst
// kind: normal, "near" once you are inside the last 10%, and "full" where
// further typing is refused and the tier that removes the cap is named.
import { Lock, Sparkles } from "lucide-react";
import { TIER_CHAR_LIMITS, TIER_LABEL, nextTier } from "./limits.js";

const COLOR = {
  ok: "text-white/35",
  near: "text-mcz-gold",
  full: "text-mcz-ember",
};

/**
 * Counter + upgrade line for a text field.
 * `cl` is the object from useCharLimit(); `value` is the current text.
 */
export default function CharLimit({ cl, value, className = "" }) {
  if (!cl.ready) return null;

  const used = (value || "").length;
  const state = cl.state(value);
  const up = nextTier(cl.tier);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 text-[11px] ${className}`}>
      <span className={COLOR[state]}>
        {cl.unlimited ? (
          <>
            {used.toLocaleString()} characters ·{" "}
            <span className="text-mcz-ember">{TIER_LABEL[cl.tier] || cl.tier}</span> writes without a limit
          </>
        ) : (
          <>
            {used.toLocaleString()} / {cl.limit.toLocaleString()}
            {state === "full" && <> · <Lock size={10} className="inline" /> limit reached</>}
            {state === "near" && <> · nearly full</>}
          </>
        )}
      </span>

      {!cl.unlimited && up && (state === "near" || state === "full") && (
        <span className="flex items-center gap-1 text-mcz-cyan">
          <Sparkles size={10} />
          {TIER_LABEL[up]} gets{" "}
          {typeof TIER_CHAR_LIMITS[up] === "number"
            ? TIER_CHAR_LIMITS[up].toLocaleString()
            : String(TIER_CHAR_LIMITS[up]).toLowerCase()}
          <button
            className="font-semibold underline hover:brightness-125"
            onClick={() => window.dispatchEvent(new CustomEvent("mcz-goto-tab", { detail: "membershipz" }))}
          >
            Upgrade
          </button>
        </span>
      )}
    </div>
  );
}

/** Every tier's character allowance, for the tier-listing copy. */
export function TierCharTable({ current }) {
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px]">
      {Object.entries(TIER_CHAR_LIMITS).map(([tier, chars]) => (
        <span key={tier}
          className={`pill ${tier === current ? "!border-mcz-ember/60 !text-mcz-ember" : "!text-white/45"}`}>
          {TIER_LABEL[tier]} {typeof chars === "number" ? chars.toLocaleString() : chars}
        </span>
      ))}
    </div>
  );
}
