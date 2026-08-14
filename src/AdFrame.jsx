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
//   `allow-popups` is the CLICK, not a convenience. This file used to drop it,
//   reasoning that an ad which can open windows is a disruptive-ads problem
//   with the stores. That was right about pop-unders and wrong about
//   everything else: inside a sandboxed frame the flag gates `window.open`
//   AND `<a target="_blank">`, which between them are every route an ad
//   network has to the advertiser. So the slot rendered, took up the page,
//   cost a member their attention, and could never return anything — a
//   decoration wearing a revenue stream's clothes, which is worse than the
//   risk it was avoiding. The hazard actually worth refusing is top-level
//   navigation with no gesture behind it, and that is refused specifically
//   below rather than by breaking the click.
import { useEffect, useState } from "react";
import { loadLimits } from "./limits.js";

// What the frame may do — and, as much to the point, what it still may not.
const SANDBOX = [
  "allow-scripts",
  "allow-same-origin",
  // The click-through itself.
  "allow-popups",
  // The opened tab escapes OUR sandbox. Without this the advertiser's page
  // inherits these restrictions and renders broken, so the click "works" and
  // the advertiser still gets a dead visit. The snippet this replaced was
  // missing it too.
  "allow-popups-to-escape-sandbox",
  // Some networks click through by navigating the top window instead of
  // opening a tab. The -by-user-activation form fires only on a real gesture,
  // so this buys the click without buying the drive-by redirect.
  "allow-top-navigation-by-user-activation",
].join(" ");
// Still refused, deliberately: allow-forms, allow-modals, allow-pointer-lock,
// and bare allow-top-navigation — that last one is the actual disruptive-ads
// hazard, and the gesture-gated variant above covers the legitimate case.

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
        // Origin only — "https://musicconnectz.net", no path, no query.
        // `no-referrer` hands a network nothing to price the placement on,
        // and they bid on the domain an ad runs on. This is what an advertiser
        // legitimately needs to value the slot, and nothing beyond it.
        referrerPolicy="strict-origin-when-cross-origin"
        style={{ border: 0, width, height, maxWidth: "100%" }}
      />
    </div>
  );
}
