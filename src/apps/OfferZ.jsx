import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { api } from "../api.js";
import EarnInstead from "../EarnInstead.jsx";
import { IconImg } from "../App.jsx";
import { SPINAZ } from "../resources.js";
import { playSound } from "../sound.js";

// OfferZ — offerwall. Complete an offer (sign-ups, surveys, installs) on the
// provider's wall; their server calls the backend callback and SpinAZ lands in
// your wallet. The wall opens in a new tab with your member id as the sub-id.
export default function OfferZ() {
  const [data, setData] = useState(null);
  // How much landed while you were sitting here, if any.
  const [landed, setLanded] = useState(0);

  // An offer doesn't clear when you click it — the provider's server calls
  // ours minutes later, so there is no client event to hang anything on. The
  // wall opens in another tab and this one just sat there, stale, until a
  // reload: the member came back to the same "0 earned" they left. Polling
  // while this tab is open is the only honest way to notice the credit, so
  // that's what this does — and only an INCREASE says anything, because a
  // number that hasn't moved is not news.
  useEffect(() => {
    let on = true;
    let last = null;
    const read = () => {
      if (document.hidden) return;   // don't poll a tab nobody is looking at
      api("/api/economy/offerz/")
        .then((d) => {
          if (!on) return;
          setData(d);
          const now = Number(d?.earned_spinaz ?? 0);
          // `last === null` is the first read — a baseline, never a payout.
          if (last !== null && now > last) {
            setLanded(now - last);
            playSound("spinaz_gain");
          }
          last = now;
        })
        .catch(() => on && setData((cur) => cur || { enabled: false }));
    };
    read();
    const t = setInterval(read, 20000);   // "usually within a few minutes"
    return () => { on = false; clearInterval(t); };
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
        {landed > 0 && (
          <span className="pill !border-emerald-400/40 !text-emerald-300">
            +{landed} {SPINAZ} just cleared
          </span>
        )}
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
          <>
            <p className="text-sm text-white/60">The offerwall is being switched on — check back soon.</p>
            <EarnInstead exclude={["offerz"]} title="In the meantime, these do pay" />
          </>
        )}
      </div>
    </div>
  );
}
