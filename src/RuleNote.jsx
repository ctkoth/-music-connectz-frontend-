// One house rule, rendered where somebody is about to meet it.
//
// The copy is the server's (`rulez.js` → `/api/economy/rulez/`) so the rule a
// member reads on the signup form and the rule the code enforces are the same
// sentence. If it can't be loaded, nothing renders: a screen that half-states
// a rule is worse than one that doesn't mention it, because the half somebody
// read is the half they'll hold you to.
import { useEffect, useState } from "react";
import { loadRule } from "./rulez.js";

export default function RuleNote({ rule: ruleKey, detail = false, className = "" }) {
  const [rule, setRule] = useState(null);
  useEffect(() => { loadRule(ruleKey).then(setRule); }, [ruleKey]);
  if (!rule) return null;

  return (
    <div className={`rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 ${className}`}>
      <p className="text-[12px] font-semibold text-white/80">
        <span className="mr-1.5">{rule.emoji}</span>{rule.rule}
      </p>
      {rule.note && <p className="mt-1 text-[11px] leading-relaxed text-white/45">{rule.note}</p>}
      {detail && (
        <>
          <p className="mt-2 text-[11px] leading-relaxed text-white/55">{rule.why}</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/70">{rule.what_happens}</p>
        </>
      )}
    </div>
  );
}
