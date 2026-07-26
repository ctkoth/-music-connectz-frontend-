import { useEffect, useRef, useState } from "react";
import { Apple, Facebook, Github, Instagram } from "lucide-react";
import { useAuth } from "./AuthContext.jsx";
import { api } from "../api.js";

const REDIRECT =
  import.meta.env.VITE_OAUTH_REDIRECT ||
  (typeof window !== "undefined" ? `${window.location.origin}/oauth/callback` : "");

// Optional build-time fallback; the primary source is the backend config below.
const VITE_ID = (key) => import.meta.env[`VITE_${key.toUpperCase()}_CLIENT_ID`] || "";

/* --- inline brand glyphs (lucide lacks these) --- */
const Spotify = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.3c-.2.4-.7.5-1 .3-2.9-1.8-6.5-2.2-10.8-1.2-.4.1-.8-.2-.9-.6-.1-.4.2-.8.6-.9 4.7-1.1 8.7-.6 11.9 1.4.3.2.4.7.2 1zm1.5-3.3c-.3.4-.8.6-1.3.3-3.3-2-8.3-2.6-12.2-1.4-.5.1-1-.1-1.1-.6-.1-.5.1-1 .6-1.1 4.5-1.4 10-.7 13.8 1.6.4.2.5.8.2 1.2zm.1-3.4C15.2 8.3 8.7 8.1 4.9 9.2c-.6.2-1.2-.2-1.4-.7-.2-.6.2-1.2.7-1.4 4.4-1.3 11.5-1 16 1.7.5.3.7 1 .4 1.5-.3.5-1 .7-1.5.3z"/>
  </svg>
);
const Microsoft = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <rect x="1" y="1" width="10" height="10"/><rect x="13" y="1" width="10" height="10"/>
    <rect x="1" y="13" width="10" height="10"/><rect x="13" y="13" width="10" height="10"/>
  </svg>
);
const GoogleG = (p) => (
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
const TikTok = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <path d="M19.6 6.7a5.6 5.6 0 0 1-3.4-3.5c-.1-.4-.2-.8-.2-1.2h-3.5v13.6a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.2a6.4 6.4 0 1 0 5.5 6.3V9.7a9 9 0 0 0 4.6 1.3V7.5c-.3 0-.7 0-1-.1z"/>
  </svg>
);
const SoundCloud = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <path d="M1 14.5v2.9c0 .2.2.4.4.4s.4-.2.4-.4v-2.9c0-.2-.2-.4-.4-.4s-.4.2-.4.4zm2.2-1.2v5.2c0 .3.2.5.5.5s.5-.2.5-.5v-5.2c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm2.3-1.6v6.9c0 .3.2.5.5.5s.5-.2.5-.5v-6.9c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm2.3-.9v7.8c0 .3.2.5.5.5s.5-.2.5-.5V10.8c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm2.4-1.9v9.7c0 .3.2.5.5.5h.1c.2 0 .4-.2.4-.5V8.9c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm10.1 3.4c-.4 0-.8.1-1.2.2A5.5 5.5 0 0 0 13.9 7c-.5 0-1 .1-1.4.2-.2.1-.3.2-.3.4v10.6c0 .2.2.4.4.4h7.7a3.2 3.2 0 0 0 0-6.3z"/>
  </svg>
);

/* provider registry: brand color + authorize url builder per provider */
const PROVIDERS = [
  { key: "google",     label: "Google",     Icon: GoogleG,    color: "#ffffff" },
  { key: "apple",      label: "Apple",      Icon: Apple,      color: "#ffffff" },
  { key: "spotify",    label: "Spotify",    Icon: Spotify,    color: "#1DB954",
    auth: (id, s) => `https://accounts.spotify.com/authorize?response_type=code&client_id=${id}&redirect_uri=${REDIRECT}&scope=user-read-email&state=${s}` },
  { key: "microsoft",  label: "Microsoft",  Icon: Microsoft,  color: "#00A4EF",
    auth: (id, s) => `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?response_type=code&client_id=${id}&redirect_uri=${REDIRECT}&scope=User.Read&state=${s}` },
  { key: "github",     label: "GitHub",     Icon: Github,     color: "#ffffff",
    auth: (id, s) => `https://github.com/login/oauth/authorize?client_id=${id}&redirect_uri=${REDIRECT}&scope=read:user%20user:email&state=${s}` },
  { key: "twitter",    label: "Twitter / X", Icon: XTwitter,  color: "#ffffff", pkce: true,
    auth: (id, s, ch) => `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${id}&redirect_uri=${REDIRECT}&scope=tweet.read%20users.read&state=${s}&code_challenge=${ch}&code_challenge_method=S256` },
  { key: "soundcloud", label: "SoundCloud", Icon: SoundCloud, color: "#FF5500",
    auth: (id, s) => `https://secure.soundcloud.com/authorize?response_type=code&client_id=${id}&redirect_uri=${REDIRECT}&state=${s}` },
  { key: "instagram",  label: "Instagram",  Icon: Instagram,  color: "#E4405F",
    auth: (id, s) => `https://api.instagram.com/oauth/authorize?response_type=code&client_id=${id}&redirect_uri=${REDIRECT}&scope=user_profile&state=${s}` },
  { key: "facebook",   label: "Facebook",   Icon: Facebook,   color: "#1877F2",
    auth: (id, s) => `https://www.facebook.com/v18.0/dialog/oauth?response_type=code&client_id=${id}&redirect_uri=${REDIRECT}&scope=email,public_profile&state=${s}` },
  { key: "tiktok",     label: "TikTok",     Icon: TikTok,     color: "#25F4EE",
    auth: (id, s) => `https://www.tiktok.com/v2/auth/authorize/?response_type=code&client_key=${id}&redirect_uri=${REDIRECT}&scope=user.info.basic&state=${s}` },
];

function rand() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}
async function pkceChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function OAuthButtons({ onSuccess, onError }) {
  const { oauth } = useAuth();
  const googleBtn = useRef(null);
  const [busy, setBusy] = useState("");
  // Provider client IDs served by the backend (GET /api/auth/oauth/config/).
  // null while loading; {} means "loaded, nothing configured".
  const [cfg, setCfg] = useState(null);

  const clientId = (key) => (cfg && cfg[key]) || VITE_ID(key);

  // Pull the configured providers from the backend so no VITE_* build vars are
  // required — configure OAuth once on the server and it just works here.
  useEffect(() => {
    let on = true;
    api("/api/auth/oauth/config/", { auth: false })
      .then((d) => {
        if (!on) return;
        const map = {};
        (d.providers || []).forEach((p) => { map[p.key] = p.client_id; });
        setCfg(map);
      })
      .catch(() => on && setCfg({})); // backend unreachable → fall back to VITE
    return () => { on = false; };
  }, []);

  /* Google Identity Services button, rendered once its client_id is known. */
  useEffect(() => {
    const gid = clientId("google");
    if (!gid || !googleBtn.current) return;
    const render = () => {
      if (!window.google?.accounts?.id || !googleBtn.current) return;
      window.google.accounts.id.initialize({
        client_id: gid,
        callback: async (resp) => {
          try {
            setBusy("google");
            onSuccess?.(await oauth("google", { credential: resp.credential }));
          } catch (e) { onError?.(e.message); } finally { setBusy(""); }
        },
      });
      window.google.accounts.id.renderButton(googleBtn.current, {
        theme: "filled_black", size: "large", shape: "pill", text: "continue_with", width: 280,
      });
    };
    if (window.google?.accounts?.id) return render();
    let poll;
    if (!document.getElementById("gsi-js")) {
      const s = document.createElement("script");
      s.id = "gsi-js";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = render;
      document.head.appendChild(s);
    } else {
      poll = setInterval(() => {
        if (window.google?.accounts?.id) { clearInterval(poll); render(); }
      }, 200);
    }
    return () => poll && clearInterval(poll);
  }, [cfg, oauth, onSuccess, onError]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start(p) {
    const id = clientId(p.key);
    if (p.key === "google") {
      return onError?.(id ? "Use the Google button above." : "Google sign-in isn't available yet.");
    }
    if (p.key === "apple") {
      if (!id) return onError?.("Apple sign-in isn't available right now.");
      try {
        setBusy("apple");
        await new Promise((res, rej) => {
          if (document.getElementById("apple-js")) return res();
          const s = document.createElement("script");
          s.id = "apple-js";
          s.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
          s.onload = res; s.onerror = rej; document.head.appendChild(s);
        });
        window.AppleID.auth.init({ clientId: id, scope: "name email", redirectURI: REDIRECT, usePopup: true });
        const data = await window.AppleID.auth.signIn();
        onSuccess?.(await oauth("apple", { id_token: data?.authorization?.id_token }));
      } catch (e) { onError?.(e.message || "Apple sign-in was cancelled."); }
      finally { setBusy(""); }
      return;
    }
    if (!id) return onError?.(`${p.label} sign-in isn't available right now.`);

    const state = rand();
    sessionStorage.setItem("mcz_oauth_provider", p.key);
    sessionStorage.setItem("mcz_oauth_state", state);
    let challenge = "";
    if (p.pkce) {
      const verifier = rand();
      sessionStorage.setItem("mcz_oauth_verifier", verifier);
      challenge = await pkceChallenge(verifier);
    } else {
      sessionStorage.removeItem("mcz_oauth_verifier");
    }
    window.location.href = p.auth(encodeURIComponent(id), state, challenge);
  }

  // Google renders as its own GIS button when configured; otherwise it shows in
  // the grid like the rest. All provider logos are always visible so the
  // login/register screen presents the full set of social options.
  const hasGoogle = !!clientId("google");
  const grid = PROVIDERS.filter((p) => !(p.key === "google" && hasGoogle));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-white/40">
        <span className="h-px flex-1 bg-white/10" /> or continue with <span className="h-px flex-1 bg-white/10" />
      </div>

      {hasGoogle && <div ref={googleBtn} className="flex justify-center" />}

      <div className="grid grid-cols-5 gap-2">
        {grid.map((p) => (
          <button
            key={p.key}
            title={p.label}
            aria-label={`Continue with ${p.label}`}
            onClick={() => start(p)}
            disabled={busy === p.key}
            className="flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10 active:scale-95"
          >
            <p.Icon size={20} color={p.color} />
          </button>
        ))}
      </div>
    </div>
  );
}
