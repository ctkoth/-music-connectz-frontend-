import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { SPINAZ } from "../resources.js";

// OfferZ — offerwall. Complete an offer (sign-ups, surveys, installs) on the
// provider's wall; their server calls the backend callback and SpinAZ lands in
// your wallet. The wall opens in a new tab with your member id as the sub-id.
export default function OfferZ() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api("/api/economy/offerz/").then(setData).catch(() => setData({ enabled: false }));
  }, []);

  if (!data) return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading OfferZ…</p>;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="offerz.png" alt="OfferZ" className="h-11 w-11 rounded-xl" />
        <div>
          <h2 className="font-display text-xl font-extrabold">OfferZ</h2>
          <p className="text-xs text-white/45">Complete offers — surveys, sign-ups, installs — and earn SpinaZ.</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="pill !text-mcz-pink">{SPINAZ} {data.earned_spinaz ?? 0} earned</span>
      </div>

      <div className="re-card space-y-3">
        {data.enabled && data.url ? (
          <>
            <p className="text-sm text-white/70">Browse the offerwall and complete an offer. Rewards are credited to your SpinaZ balance automatically once the provider confirms — usually within a few minutes.</p>
            <a className="re-btn !w-auto px-5" href={data.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} /> Open the offerwall
            </a>
          </>
        ) : (
          <p className="text-sm text-white/60">The offerwall is being switched on — check back soon.</p>
        )}
      </div>
    </div>
  );
}
