import { useEffect, useState } from "react";
import { Loader2, PlayCircle, Smartphone, Star } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";

// AdZ — Google AdMob rewarded video. The actual ad plays through the AdMob SDK
// in the native (Capacitor) app; Google then calls the backend SSV endpoint to
// grant SpinAZ. On the web this tab shows status + earnings and points to the
// app. `window.Capacitor` is only present inside the native shell.
export default function AdZ() {
  const [cfg, setCfg] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api("/api/economy/adz/admob-config/").then(setCfg).catch(() => setCfg({ enabled: false }));
    api("/api/economy/adz/").then(setStats).catch(() => setStats(null));
  }, []);

  const isNative = typeof window !== "undefined" && !!window.Capacitor;

  if (!cfg) return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading AdZ…</p>;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="adz.png" alt="AdZ" className="h-11 w-11 rounded-xl" />
        <div>
          <h2 className="font-display text-xl font-extrabold">AdZ</h2>
          <p className="text-xs text-white/45">Watch a short rewarded ad, earn SpinaZ. Powered by AdMob.</p>
        </div>
      </header>

      {stats?.mine != null && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="pill"><PlayCircle size={11} className="inline" /> {stats.mine?.count ?? 0} watched</span>
          <span className="pill !text-mcz-pink"><Star size={11} className="inline" /> {stats.mine?.spinaz ?? 0} SpinaZ earned</span>
        </div>
      )}

      <div className="re-card space-y-3">
        {!cfg.enabled ? (
          <p className="text-sm text-white/60">Rewarded ads are being switched on — check back soon.</p>
        ) : isNative ? (
          <>
            <p className="text-sm text-white/70">Rewarded ads are live. Watch a short clip to earn SpinaZ — your reward is credited automatically once the ad completes.</p>
            <button
              className="re-btn !w-auto px-5"
              onClick={() => window.dispatchEvent(new CustomEvent("mcz-show-rewarded-ad", { detail: { unitId: cfg.rewarded_unit_id } }))}
            >
              <PlayCircle size={15} /> Watch an ad
            </button>
          </>
        ) : (
          <p className="flex items-start gap-2 text-sm text-white/60">
            <Smartphone size={16} className="mt-0.5 shrink-0 text-mcz-cyan" />
            Rewarded ads play in the Music ConnectZ mobile app. Install it to watch ads and earn SpinaZ — your balance syncs here automatically.
          </p>
        )}
      </div>
    </div>
  );
}
