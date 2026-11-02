// The ⚡ half of an AI run's price, beside the 🏷️ half, before the press. Read from the
// server (/api/economy/ai/energy/), which uses the same formula it charges with: engine
// base × tier factor. Renders nothing until it knows the number — never a guess.
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { ENERGY } from "../resources.js";

let cache = null, pending = null;
function load() {
  if (cache) return Promise.resolve(cache);
  if (!pending) pending = api("/api/economy/ai/energy/").then((d) => (cache = d)).catch(() => { pending = null; return null; });
  return pending;
}

export function useAiEnergy() {
  const [d, setD] = useState(cache);
  useEffect(() => { let on = true; load().then((x) => on && setD(x)); return () => { on = false; }; }, []);
  return d;
}

export default function AiEnergy({ engine = null, className = "" }) {
  const d = useAiEnergy();
  if (!d) return null;
  const n = engine ? d.by_engine?.[engine] ?? d.energy_cost : d.energy_cost;
  return <span className={`text-mcz-ember ${className}`} title={d.note}>−{n} {ENERGY}</span>;
}
