import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { limitsFor } from "./economy.js";
import { getLimitsApi } from "./economyApi.js";

// Exposes the active tier's caps (char/upload/storage) to any /v2 component.
// Source of truth is the backend /api/economy/limits/ endpoint when reachable;
// otherwise we fall back to the local TIER_LIMITS table (kept in sync with the
// server catalog) so the app still enforces caps offline / pre-deploy.
const LimitsContext = createContext(null);

export function LimitsProvider({ tier, serverOk, children }) {
  const [limits, setLimits] = useState(() => ({ ...limitsFor(tier), live: false }));

  useEffect(() => {
    let on = true;
    const local = { ...limitsFor(tier), live: false };
    if (!serverOk) {
      setLimits(local);
      return;
    }
    getLimitsApi()
      .then((r) => {
        if (!on) return;
        setLimits({
          char_limit: r.char_limit,
          upload_mb: r.upload_mb,
          storage_mb: r.storage_mb,
          storage_used_mb: r.storage_used_mb ?? 0,
          tier: r.tier,
          live: true,
        });
      })
      .catch(() => on && setLimits(local));
    return () => { on = false; };
  }, [tier, serverOk]);

  const value = useMemo(() => limits, [limits]);
  return <LimitsContext.Provider value={value}>{children}</LimitsContext.Provider>;
}

export function useLimits() {
  return useContext(LimitsContext) || { ...limitsFor(""), live: false };
}
