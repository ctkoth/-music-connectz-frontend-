import { useEffect, useRef, useState } from "react";

// A number that counts to its new value and flashes green going up, ember
// going down — so a balance changing is something you SEE happen.
export default function Ticker({ value, format = (n) => n.toLocaleString() }) {
  const [shown, setShown] = useState(value);
  const [flash, setFlash] = useState("");
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current, to = value;
    prev.current = value;
    if (from == null || to == null || from === to || typeof to !== "number") { setShown(to); return undefined; }
    setFlash(to > from ? "mcz-flash-up" : "mcz-flash-down");
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(to); return undefined; }
    const t0 = performance.now(), dur = 600;
    let raf;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      setShown(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const clear = setTimeout(() => setFlash(""), 900);
    return () => { cancelAnimationFrame(raf); clearTimeout(clear); };
  }, [value]);
  return <span className={`tabular-nums ${flash}`}>{shown == null ? "" : format(shown)}</span>;
}

/** Counts up from 0 once, on mount — for a result being revealed. */
export function CountUp({ to, ms = 900 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (typeof to !== "number" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setN(to); return undefined; }
    const t0 = performance.now();
    let raf;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <span className="tabular-nums">{n}</span>;
}
