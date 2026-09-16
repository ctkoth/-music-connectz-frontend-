// The redirect-based OAuth providers — icon, brand color and authorize-URL
// builder, one entry per provider, read by everything that starts one of
// these flows.
//
// It used to live only in OAuthButtons.jsx, and SoundCloudImport.jsx grew its
// own second, hardcoded copy of the SoundCloud authorize URL rather than
// import it — survivable for one provider and one URL, but ConnectionZ.jsx
// needs the whole registry to let an already-signed-in member link ANY of
// them, and a third hand-typed copy of six authorize-URL shapes (PKCE for
// Twitter, Basic-auth quirks elsewhere) is exactly the kind of drift this
// session's `recorder.js` extraction exists to stop happening again.
import { Facebook, Github } from "lucide-react";

export const REDIRECT =
  import.meta.env.VITE_OAUTH_REDIRECT ||
  (typeof window !== "undefined" ? `${window.location.origin}/oauth/callback` : "");

/* --- inline brand glyphs (lucide lacks these) --- */
const Spotify = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.3c-.2.4-.7.5-1 .3-2.9-1.8-6.5-2.2-10.8-1.2-.4.1-.8-.2-.9-.6-.1-.4.2-.8.6-.9 4.7-1.1 8.7-.6 11.9 1.4.3.2.4.7.2 1zm1.5-3.3c-.3.4-.8.6-1.3.3-3.3-2-8.3-2.6-12.2-1.4-.5.1-1-.1-1.1-.6-.1-.5.1-1 .6-1.1 4.5-1.4 10-.7 13.8 1.6.4.2.5.8.2 1.2zm.1-3.4C15.2 8.3 8.7 8.1 4.9 9.2c-.6.2-1.2-.2-1.4-.7-.2-.6.2-1.2.7-1.4 4.4-1.3 11.5-1 16 1.7.5.3.7 1 .4 1.5-.3.5-1 .7-1.5.3z"/>
  </svg>
);
export const Microsoft = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <rect x="1" y="1" width="10" height="10"/><rect x="13" y="1" width="10" height="10"/>
    <rect x="1" y="13" width="10" height="10"/><rect x="13" y="13" width="10" height="10"/>
  </svg>
);
export const GoogleG = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4c-.2 1.2-1 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z"/>
    <path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.7 19.8 8.1 22 12 22z"/>
    <path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1C2.4 8.8 2 10.4 2 12s.4 3.2 1.1 4.6L6.4 14z"/>
    <path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 2.9 14.7 2 12 2 8.1 2 4.7 4.2 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"/>
  </svg>
);
const XTwitter = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L1.2 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L7 3.9H5.2L17.8 20z"/>
  </svg>
);
export const SoundCloud = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <path d="M1 14.5v2.9c0 .2.2.4.4.4s.4-.2.4-.4v-2.9c0-.2-.2-.4-.4-.4s-.4.2-.4.4zm2.2-1.2v5.2c0 .3.2.5.5.5s.5-.2.5-.5v-5.2c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm2.3-1.6v6.9c0 .3.2.5.5.5s.5-.2.5-.5v-6.9c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm2.3-.9v7.8c0 .3.2.5.5.5s.5-.2.5-.5V10.8c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm2.4-1.9v9.7c0 .3.2.5.5.5h.1c.2 0 .4-.2.4-.5V8.9c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm10.1 3.4c-.4 0-.8.1-1.2.2A5.5 5.5 0 0 0 13.9 7c-.5 0-1 .1-1.4.2-.2.1-.3.2-.3.4v10.6c0 .2.2.4.4.4h7.7a3.2 3.2 0 0 0 0-6.3z"/>
  </svg>
);

/* provider registry: brand color + authorize url builder per provider.
 * Google is deliberately absent — it signs in through Google Identity
 * Services (a rendered button + JWT credential), not this authorization-code
 * redirect, and that flow is enough of a different shape (a DOM-mounted
 * widget, no `state`/PKCE dance) that folding it in here would blur the one
 * thing every entry below actually has in common. `OAuthButtons.jsx` keeps
 * its own Google handling beside this list. */
export const PROVIDERS = [
  { key: "spotify",    label: "Spotify",    Icon: Spotify,    color: "#1DB954",
    auth: (id, s) => `https://accounts.spotify.com/authorize?response_type=code&client_id=${id}&redirect_uri=${REDIRECT}&scope=user-read-email&state=${s}` },
  { key: "soundcloud", label: "SoundCloud", Icon: SoundCloud, color: "#FF5500",
    auth: (id, s) => `https://secure.soundcloud.com/authorize?response_type=code&client_id=${id}&redirect_uri=${REDIRECT}&state=${s}` },
  { key: "microsoft",  label: "Microsoft",  Icon: Microsoft,  color: "#00A4EF",
    auth: (id, s) => `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?response_type=code&client_id=${id}&redirect_uri=${REDIRECT}&scope=User.Read&state=${s}` },
  { key: "github",     label: "GitHub",     Icon: Github,     color: "#ffffff",
    auth: (id, s) => `https://github.com/login/oauth/authorize?client_id=${id}&redirect_uri=${REDIRECT}&scope=read:user%20user:email&state=${s}` },
  { key: "twitter",    label: "Twitter / X", Icon: XTwitter,  color: "#ffffff", pkce: true,
    auth: (id, s, ch) => `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${id}&redirect_uri=${REDIRECT}&scope=tweet.read%20users.read&state=${s}&code_challenge=${ch}&code_challenge_method=S256` },
  { key: "facebook",   label: "Facebook",   Icon: Facebook,   color: "#1877F2",
    auth: (id, s) => `https://www.facebook.com/v18.0/dialog/oauth?response_type=code&client_id=${id}&redirect_uri=${REDIRECT}&scope=email,public_profile&state=${s}` },
];
// Instagram and TikTok are deliberately absent. The backend can only complete a
// sign-in for google/github/apple plus its OAUTH2_PROVIDERS registry (spotify,
// microsoft, facebook, soundcloud, twitter); anything else comes back as an
// unsupported provider. Only re-add a button here alongside a backend handler.

// Three flows spend the same authorization code differently: an ordinary
// sign-in, a SoundCloud catalogue import (`SoundCloudImport.jsx`), and now a
// logged-in member linking a new provider (`connectOAuth.js`). Each marks
// which one it is with its own sessionStorage flag, and none of the three
// ever cleared the OTHERS — so abandoning one flow (closing the provider's
// consent page instead of finishing it) left its marker behind, and the next
// ordinary sign-in in that tab would silently be spent on the abandoned
// flow's endpoint instead of logging anybody in. `clearFlowMarkers()` is
// called by whichever flow starts next, so only the one actually in progress
// is ever set.
export const FLOW_MARKERS = ["mcz_sc_import", "mcz_oauth_connect"];
export function clearFlowMarkers() {
  FLOW_MARKERS.forEach((k) => sessionStorage.removeItem(k));
}

export function rand() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function pkceChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
