// IntelligenceZ dials: how much you value each variable in the piece you are about to make.
// 0 = "don't care", 5 = "matters most"; a dial you leave alone is "no preference" and is not sent.
// The variables, their meanings and the scale are the server's (/api/economy/priorities/) — never
// typed here — and what is sent is only {key: number}, so a dial cannot carry words to the model.
import { useEffect, useState } from "react";
import { api } from "../api.js";

let cache = null;
const load = () => (cache ? Promise.resolve(cache) : api("/api/economy/priorities/").then((d) => (cache = d)));

/** The server's list of writer kinds the dials apply to (so a screen never retypes it). */
export function usePriorityInfo() {
  const [info, setInfo] = useState(cache);
  useEffect(() => { let on = true; load().then((d) => on && setInfo(d)).catch(() => {}); return () => { on = false; }; }, []);
  return info;
}

export default function PriorityDials({ medium, value, onChange, disabled }) {
  const info = usePriorityInfo();
  const vars = info?.media?.[medium];
  if (!vars?.length) return null;                       // a failed fetch renders nothing
  const set = (k, v) => {
    const next = { ...value };
    if (v === null) delete next[k]; else next[k] = v;
    onChange(next);
  };
  const max = info.scale?.max ?? 5;
  const count = Object.keys(value || {}).length;
  return (
    <details className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/60">
      <summary className="cursor-pointer text-white/75">
        What matters most to you here <span className="text-white/35">(optional{count ? ` · ${count} set` : ""})</span>
      </summary>
      <p className="mt-1 text-white/35">
        Rate how much you value each one, 0 (don't care) to {max} (matters most). It steers what the
        maker spends its effort on. Leave a dial alone and it has no preference. It doesn't change the price.
      </p>
      <div className="mt-2 space-y-1.5" aria-disabled={disabled}>
        {vars.map((v) => {
          const cur = value?.[v.key];
          return (
            <div key={v.key} className="flex flex-wrap items-center gap-2">
              <span className="w-36 shrink-0 text-white/80" title={v.means}>{v.label}</span>
              <input type="range" min="0" max={max} step="1" disabled={disabled}
                     value={cur ?? 0} onChange={(e) => set(v.key, Number(e.target.value))}
                     aria-label={`How much you value ${v.label}`} className="min-w-0 flex-1 accent-mcz-cyan" />
              <span className="w-14 text-right text-white/50">{cur === undefined ? "—" : cur}</span>
              <button type="button" className="text-white/30 hover:text-white" disabled={disabled || cur === undefined}
                      onClick={() => set(v.key, null)} aria-label={`Clear ${v.label}`}>✕</button>
            </div>
          );
        })}
      </div>
    </details>
  );
}
