import { heardRows, thinkLine } from "../coachUpgrades.js";

/** What the coach heard, collapsed, plus whether the logic check ran.
 *  Renders from the server's `heard` and `think`; it decides nothing. */
export default function HeardList({ result, labels }) {
  const rows = heardRows(result?.heard, labels);
  const line = thinkLine(result?.think);
  if (!rows.length && !line) return null;
  return (
    <div className="text-[11px] text-white/55">
      {rows.length > 0 && (
        <details>
          <summary className="cursor-pointer select-none font-semibold text-mcz-cyan/80">
            What the coach heard ({rows.length})
          </summary>
          <ul className="mt-1 space-y-1">
            {rows.map((r, i) => (
              <li key={i} className="leading-relaxed">
                {r.time && <span className="mr-1 font-mono text-white/70">{r.time}</span>}
                {r.what}
                {r.dim && <span className="ml-1 text-white/40">· {r.dim}</span>}
                {r.possible && <span className="ml-1 rounded bg-white/10 px-1 text-[10px] uppercase">possible</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
      {line && <p className="mt-1 text-white/40">{line}</p>}
    </div>
  );
}
