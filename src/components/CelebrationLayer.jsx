import { useEffect, useRef, useState } from "react";
import { EMOJI } from "../celebrate.js";

// Renders celebrate()'s chips. Decorative only: aria-live announces the text
// once for screen readers, and reduced-motion members get the chip without
// the float or the burst (index.css).
export default function CelebrationLayer() {
  const [chips, setChips] = useState([]);
  const id = useRef(0);
  useEffect(() => {
    const on = (e) => {
      const n = ++id.current;
      setChips((c) => [...c.slice(-4), { n, ...e.detail }]);
      setTimeout(() => setChips((c) => c.filter((x) => x.n !== n)), e.detail.big ? 2200 : 1500);
    };
    window.addEventListener("mcz-celebrate", on);
    return () => window.removeEventListener("mcz-celebrate", on);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[120] flex flex-col items-center gap-2" aria-live="polite">
      {chips.map((c) => (
        <div key={c.n} className={`mcz-chip ${c.big ? "mcz-chip-big" : ""} ${c.gain ? "text-emerald-300 border-emerald-400/50" : "text-mcz-ember border-mcz-ember/50"}`}>
          {c.big && <span className="mcz-burst" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ "--a": `${i * 30}deg` }} />)}</span>}
          {c.resource ? (c.amount
            ? `${c.gain ? "+" : "−"}${c.resource === "money" ? `$${(Math.abs(c.amount) / 100).toFixed(2)}` : Math.abs(c.amount).toLocaleString()} ${EMOJI[c.resource] || ""}`
            : `${c.gain ? "+" : "−"} ${EMOJI[c.resource] || ""}`) : ""}
          {c.label && <span className="ml-1">{c.label}</span>}
        </div>
      ))}
    </div>
  );
}
