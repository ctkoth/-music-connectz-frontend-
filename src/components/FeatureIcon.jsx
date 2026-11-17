import { useState } from "react";

// The neon tile for a feature INSIDE an app (Inspiration, Boss Take, HookZ…), beside its
// heading. The art is generated in the tab icons' chassis (tools/make-neon-icons.mjs).
//
// It draws the file directly and imports nothing from App.jsx on purpose: a heading
// component (the shared score card, for one) is bundled and tested on its own, and
// reaching into the app shell for an icon pulled the whole app in with it. A tile that
// is missing falls back to the emoji the heading used to wear, so a heading never
// loses its mark. The same files are also registered in App.jsx as `feature_<name>.png`
// so IconZ lists them.
const EMOJI = {
  inspiration: "✨", bosstake: "👑", versez: "🎼", radar: "📡", superfanz: "🫶",
  challenge: "🏁", hookz: "🪝", feelz: "💗", casino: "🎰", highroller: "💎",
};

/** Which feature tile an extra score wears (the server's keys for HookZ and FeelZ). */
export const EXTRA_ICON = { hook: "hookz", hookz: "hookz", feelz: "feelz" };

export const featureIconSrc = (name) => (EMOJI[name] ? `/icons/${name}-neon.svg` : "");

export default function FeatureIcon({ name, className = "h-5 w-5" }) {
  const [failed, setFailed] = useState(false);
  if (!EMOJI[name]) return null;
  if (failed) return <span aria-hidden="true">{EMOJI[name]}</span>;
  return (
    <img src={featureIconSrc(name)} alt="" onError={() => setFailed(true)}
         className={`inline-block shrink-0 rounded-md object-cover align-[-0.25em] ${className}`} />
  );
}
