import { useCallback, useEffect, useRef, useState } from "react";
import { recall, remember } from "./remember.js";

// useState that opens on the member's last (else most-used) choice for `field`.
//
// `allowed` is the list the field can hold right now, when it is known — pass
// it once the options have loaded and the hook re-applies the memory if the
// member hasn't chosen anything this visit. [value, set, setQuiet]:
// `set` is a choice and is remembered; `setQuiet` is for values we supply
// (a hand-off from another app) — it wins over the memory and is not counted.
export function useRemembered(field, fallback, allowed, usual) {
  const [value, setValue] = useState(() => recall(field, allowed) ?? fallback);
  const touched = useRef(false);
  const sig = allowed ? allowed.join("\u0001") : null;

  // `usual` is what the server read off their past takes. This device's own
  // memory is newer than that, so it wins; the server's is for the member whose
  // history is on their account but not in this browser.
  useEffect(() => {
    if (touched.current || !allowed) return;
    const r = recall(field, allowed);
    if (r != null) { setValue(r); return; }
    if (usual && allowed.includes(usual)) setValue(usual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, sig, usual]);

  const set = useCallback((v) => {
    touched.current = true;
    setValue(v);
    remember(field, v);
  }, [field]);
  const setQuiet = useCallback((v) => { touched.current = true; setValue(v); }, []);
  return [value, set, setQuiet];
}

// Same, for a numeric field (remembered as text, handed back as a Number).
// Blank stays blank — "no choice" is not the number 0.
export function useRememberedNumber(field, fallback) {
  const [v, set, quiet] = useRemembered(field, fallback);
  const n = v === "" || v == null ? NaN : Number(v);
  return [Number.isFinite(n) ? n : fallback, (x) => set(x === "" || x == null ? "" : Number(x)), quiet];
}
