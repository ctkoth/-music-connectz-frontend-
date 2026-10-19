// The SubstanceZ vocabulary — which substances, and the frequency scale —
// read from the server, never retyped. ProfileZ's list and metricz.py's used
// to be two typed copies in two orders; one served list cannot disagree with
// itself, and the scale's `hint` ("most weeks") is what keeps "often" from
// meaning three different things to three members.
//
// `null` while loading, `false` when the fetch failed. A failure must not
// look like an empty list: the editor says it could not load, and the member's
// saved declarations are untouched either way (they are held in state, not
// derived from this).
import { useEffect, useState } from "react";
import { api } from "./api.js";

let cached = null;

export function useSubstanceScale() {
  const [scale, setScale] = useState(cached);
  useEffect(() => {
    if (cached) return undefined;
    let live = true;
    api("/api/economy/substancez/")
      .then((d) => { cached = d; if (live) setScale(d); })
      .catch(() => { if (live) setScale(false); });
    return () => { live = false; };
  }, []);
  return scale;
}

/** "Often" → "most weeks", from the served scale; "" when unknown. */
export function frequencyHint(scale, key) {
  return scale?.frequencies?.find((f) => f.key === key)?.hint || "";
}

export function frequencyLabel(scale, key) {
  return scale?.frequencies?.find((f) => f.key === key)?.label || key;
}
