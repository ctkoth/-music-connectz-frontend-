import { useCallback, useEffect, useRef, useState } from "react";
import { recall, remember } from "./remember.js";

// useState that opens on the member's last (else most-used) choice for `field`.
//
// `allowed` is the list the field can hold right now, when it is known — pass
// it once the options have loaded and the hook re-applies the memory if the
// member hasn't chosen anything this visit. [value, set, setQuiet]:
// `set` is a choice and is remembered; `setQuiet` is for values we supply
// (a hand-off from another app) — it wins over the memory and is not counted.
export function useRemembered(field, fallback, allowed) {
  const [value, setValue] = useState(() => recall(field, allowed) ?? fallback);
  const touched = useRef(false);
  const sig = allowed ? allowed.join("\u0001") : null;

  useEffect(() => {
    if (touched.current || !allowed) return;
    const r = recall(field, allowed);
    if (r != null) setValue(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, sig]);

  const set = useCallback((v) => {
    touched.current = true;
    setValue(v);
    remember(field, v);
  }, [field]);
  const setQuiet = useCallback((v) => { touched.current = true; setValue(v); }, []);
  return [value, set, setQuiet];
}
