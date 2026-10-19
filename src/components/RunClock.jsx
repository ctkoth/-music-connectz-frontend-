import { useEffect, useState } from "react";
import { clock } from "../aiRun.js";

// "0:42 of up to 1:30" while a run is out. A bare count that only goes up cannot
// tell working from hung — the one thing the person waiting needs to know — so
// this renders only when the server STATED how long a run may take
// (`budget_seconds`), and shows that ceiling beside the clock. With no stated
// budget there is no honest end to show, so it shows nothing rather than a
// number that only climbs.
export default function RunClock({ running, budgetSeconds, what = "Working" }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!running) { setSec(0); return undefined; }
    const started = Date.now();
    setSec(0);
    const t = setInterval(() => setSec(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [running]);
  if (!running || !budgetSeconds) return null;
  return (
    <span role="status" className="font-mono text-[11px] tabular-nums text-white/55">
      {what}… {clock(sec)} of up to {clock(budgetSeconds)}
    </span>
  );
}
