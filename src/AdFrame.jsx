// AdFrame — a third-party ad, or nothing at all.
//
// The reason this is a component rather than an iframe pasted into a screen:
// `play/data-safety.md` answers "Committed to the Play Families Policy: Yes",
// and that answer was earned by hard-walling the adult surfaces for teen
// accounts. Teens are an intended audience — RapZ carries a "Teen-safe · SkillZ
// training" badge — and the Families Policy requires ads shown to them to come
// from a Play-certified ad SDK. A third-party frame is not one and cannot
// attest to being one.
//
// So an ad may only be rendered for a member the SERVER says may see one. The
// decision arrives as `third_party_ads` on /api/economy/limits/; the client is
// never told an age, because it does not need one to render a banner and a
// birthday sent so a browser can decide whether to show an advert is a
// birthday travelling further than it has to.
//
// Three things this file is careful about:
//
//   Nothing renders until the answer arrives. `undefined` is not "yes, probably"
//   — it is "we have not been told", and the difference between those two is a
//   policy breach.
//
//   `allow-same-origin` stays. It is safe HERE and it is load-bearing: the
//   frame is a different origin, so the flag lets the ad keep ITS own origin
//   and grants nothing of ours. (It is the opposite story for same-origin
//   content — see the game bundles, which must never have it.)
//
//   `allow-popups` is dropped. An ad that can open windows is a disruptive-ads
//   problem with the stores and an unpleasant surprise for the member. If the
//   network genuinely needs it, that is a conversation to have deliberately,
//   not a flag to inherit from a copy-pasted snippet.
import { useEffect, useState } from "react";
import { loadLimits } from "./limits.js";

// What the frame may do. Deliberately narrower than the snippet this replaced.
const SANDBOX = "allow-scripts allow-same-origin";

/** Whether this member may be shown a third-party ad.
 *
 * `null` while the answer is still in flight, so a caller can tell "not yet"
 * from "no" and render neither.
 */
export function useAdsAllowed() {
  const [allowed, setAllowed] = useState(null);
  useEffect(() => {
    let live = true;
    loadLimits()
      .then((d) => { if (live) setAllowed(d?.third_party_ads === true); })
      // loadLimits already falls back rather than rejecting, but a throw here
      // must not leave the answer as anything except "no".
      .catch(() => { if (live) setAllowed(false); });
    return () => { live = false; };
  }, []);
  return allowed;
}

export default function AdFrame({ site, width = 300, height = 130,
                                  className = "flex justify-center pb-2 pt-4" }) {
  const allowed = useAdsAllowed();
  // Strictly true. Null (still loading) and false both render nothing — the
  // banner is worth far less than the answer being wrong.
  if (allowed !== true || !site) return null;
  // The spacing lives INSIDE the null check on purpose. A caller wrapping this
  // in its own padded div would leave that div behind when the ad is withheld,
  // and a teen would be looking at a gap where an advert isn't — which is a
  // worse tell than the ad itself.
  return (
    <div className={className}>
      <iframe
        src={`https://ad-swap.web.app/frame.html?site=${encodeURIComponent(site)}`}
        title="Ad"
        loading="lazy"
        sandbox={SANDBOX}
        referrerPolicy="no-referrer"
        style={{ border: 0, width, height, maxWidth: "100%" }}
      />
    </div>
  );
}
