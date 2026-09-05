import { useEffect, useRef, useState } from "react";
import { Apple, ChevronDown, Facebook, Github } from "lucide-react";
import { useAuth } from "./AuthContext.jsx";
import { api } from "../api.js";
import { asList } from "../shape.js";

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
const SoundCloud = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <path d="M1 14.5v2.9c0 .2.2.4.4.4s.4-.2.4-.4v-2.9c0-.2-.2-.4-.4-.4s-.4.2-.4.4zm2.2-1.2v5.2c0 .3.2.5.5.5s.5-.2.5-.5v-5.2c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm2.3-1.6v6.9c0 .3.2.5.5.5s.5-.2.5-.5v-6.9c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm2.3-.9v7.8c0 .3.2.5.5.5s.5-.2.5-.5V10.8c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm2.4-1.9v9.7c0 .3.2.5.5.5h.1c.2 0 .4-.2.4-.5V8.9c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm10.1 3.4c-.4 0-.8.1-1.2.2A5.5 5.5 0 0 0 13.9 7c-.5 0-1 .1-1.4.2-.2.1-.3.2-.3.4v10.6c0 .2.2.4.4.4h7.7a3.2 3.2 0 0 0 0-6.3z"/>
  </svg>
);
const Discord = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25-1.845-.276-3.68-.276-5.487 0-.164-.393-.406-.874-.618-1.25a.077.077 0 0 0-.078-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.028C.533 9.046-.319 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.1.246.198.373.292a.077.077 0 0 1-.007.128 12.3 12.3 0 0 1-1.873.891.076.076 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.029zM8.02 15.33c-1.183 0-2.157-1.086-2.157-2.42 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.096 2.156 2.42 0 1.334-.956 2.42-2.156 2.42zm7.975 0c-1.183 0-2.157-1.086-2.157-2.42 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.096 2.156 2.42 0 1.334-.946 2.42-2.156 2.42z"/>
  </svg>
);
const RedditAlien = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614.027.17.042.344.042.52 0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 3.32 12.5c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.02-.553zM9.25 12c-.689 0-1.25.562-1.25 1.25 0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
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
  { key: "facebook",   label: "Facebook",   Icon: Facebook,   color: "#1877F2",
    auth: (id, s) => `https://www.facebook.com/v18.0/dialog/oauth?response_type=code&client_id=${id}&redirect_uri=${REDIRECT}&scope=email,public_profile&state=${s}` },
  { key: "discord",    label: "Discord",    Icon: Discord,    color: "#5865F2",
    auth: (id, s) => `https://discord.com/oauth2/authorize?response_type=code&client_id=${id}&redirect_uri=${REDIRECT}&scope=identify%20email&state=${s}` },
  { key: "reddit",     label: "Reddit",     Icon: RedditAlien, color: "#FF4500",
    // duration=temporary — this is a sign-in, not a standing connection; no
    // refresh token means nothing to revoke later for a member who never asked
    // Music ConnectZ to keep talking to their Reddit account.
    auth: (id, s) => `https://www.reddit.com/api/v1/authorize?response_type=code&client_id=${id}&redirect_uri=${REDIRECT}&scope=identity&state=${s}&duration=temporary` },
];
// Instagram and TikTok are deliberately absent. The backend can only complete a
// sign-in for google/github/apple plus its OAUTH2_PROVIDERS registry (spotify,
// microsoft, facebook, soundcloud, twitter, discord, reddit); anything else
// comes back as an unsupported provider. Only re-add a button here alongside a
// backend handler.

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
  // "loading" | "ok" | "failed". Google Identity Services reports a refused
  // origin, a blocked script and third-party-cookie trouble to the CONSOLE and
  // then renders nothing. Setting a client ID also removes the generic Google
  // button from the grid below, so a failure left the member with no Google
  // option and no explanation — the button simply was not there.
  const [gsi, setGsi] = useState("loading");
  // Did the config come from the SERVER, or are we falling back to build vars?
  // It matters, because only the backend can COMPLETE a sign-in — it verifies
  // the token's audience against its own client ID. A VITE_* var the server
  // doesn't share doesn't enable a provider; it enables a button that walks the
  // member all the way to the provider and comes back refused. So once the
  // server has answered it is the authority, and VITE_* is only for when it
  // never answers at all.
  const [served, setServed] = useState(false);
  // Apple reports a bad Services ID as `invalid_client` from inside its own
  // popup, which the catch below used to relabel "cancelled" — the one word
  // that makes an owner stop looking. Remember it and say what it means.
  const [appleErr, setAppleErr] = useState("");
  // Six providers deep in a same-sized icon grid made every option look
  // equally likely to work, which is worse than showing none: a first-time
  // visitor can't tell "the one everyone has" from "the one from 2019 nobody
  // configured." Apple joins Google as a full-width, labeled button; the
  // long tail collapses behind a toggle instead of eating screen space by
  // default.
  const [showMore, setShowMore] = useState(false);

  // Nothing is enabled while the answer is still in flight: a button that
  // appears and then vanishes is worse than one that arrives a moment late.
  const clientId = (key) => (!cfg ? "" : served ? cfg[key] || "" : VITE_ID(key));

  // Pull the configured providers from the backend so no VITE_* build vars are
  // required — configure OAuth once on the server and it just works here.
  useEffect(() => {
    let on = true;
    // `api` has no timeout, and a sleeping Render instance takes the better
    // part of a minute to answer its first request. Waiting that out with an
    // empty grid would be a blank login screen for anyone arriving first, so
    // fall back to the build vars after a few seconds and let the real answer
    // overwrite them whenever it lands. Late is fine; never is not.
    const fallback = setTimeout(() => on && setCfg((c) => c || {}), 4000);
    api("/api/auth/oauth-config/", { auth: false })
      .then((d) => {
        // Backend returns a flat map: { google: "<client_id>", github: "…", … }.
        if (!on) return;
        setCfg(d && typeof d === "object" ? d : {});
        setServed(true);
      })
      .catch(() => on && setCfg({})); // backend unreachable → fall back to VITE
    return () => { on = false; clearTimeout(fallback); };
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
      try {
        window.google.accounts.id.renderButton(googleBtn.current, {
          theme: "filled_black", size: "large", shape: "pill", text: "continue_with", width: 280,
        });
      } catch {
        return setGsi("failed");
      }
      // renderButton does not throw on a refused origin — it just leaves the
      // container empty. Whether a button actually exists is the only honest
      // signal, so check for one rather than assuming the call worked.
      setTimeout(() => {
        setGsi(googleBtn.current?.childElementCount ? "ok" : "failed");
      }, 2500);
    };
    if (window.google?.accounts?.id) return render();
    let poll;
    // The script itself can be blocked outright — by an extension, a strict
    // network, or an offline device. Give up loudly rather than spinning.
    const giveUp = setTimeout(() => setGsi((v) => (v === "loading" ? "failed" : v)), 8000);
    if (!document.getElementById("gsi-js")) {
      const s = document.createElement("script");
      s.id = "gsi-js";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = render;
      s.onerror = () => setGsi("failed");
      document.head.appendChild(s);
    } else {
      poll = setInterval(() => {
        if (window.google?.accounts?.id) { clearInterval(poll); render(); }
      }, 200);
    }
    return () => { clearTimeout(giveUp); poll && clearInterval(poll); };
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
        setAppleErr("");
        onSuccess?.(await oauth("apple", { id_token: data?.authorization?.id_token }));
      } catch (e) {
        // Apple rejects with a plain object carrying `error`, not an Error, so
        // `e.message` is undefined and every failure read as "cancelled" —
        // including the one that isn't the member's doing at all.
        const why = String(e?.error || e?.message || "");
        const bad = /invalid[_\s-]?client/i.test(why);
        if (bad) setAppleErr(why);
        onError?.(bad ? "Apple refused this site's sign-in setup." : (e?.message || "Apple sign-in was cancelled."));
      }
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
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  // Only hide the generic Google button once GSI has actually put one on the
  // screen. Hiding it on `hasGoogle` alone meant configuring Google could
  // REMOVE the member's only way to use it.
  const grid = PROVIDERS.filter((p) => !(p.key === "google" && hasGoogle && gsi !== "failed"));
  const apple = grid.find((p) => p.key === "apple");
  const rest = grid.filter((p) => p.key !== "apple");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-white/40">
        <span className="h-px flex-1 bg-white/10" /> or continue with <span className="h-px flex-1 bg-white/10" />
      </div>

      {hasGoogle && <div ref={googleBtn} className="flex justify-center" />}

      {/* Say what went wrong, and print the origin Google has to be told about
          — that is the fix in almost every case, and it is not guessable. */}
      {/* The server can see something the browser can't: a client ID that
          isn't shaped like one. Show that FIRST — it's a different fix from
          the origins list, and guessing between them costs an afternoon. */}
      {asList(cfg?.warnings).map((w) => (
        <div key={w} className="rounded-lg border border-mcz-gold/30 bg-mcz-gold/10 px-3 py-2 text-[11px] leading-relaxed text-mcz-gold">
          <p className="font-semibold">Sign-in is misconfigured on the server.</p>
          <p className="mt-1 text-mcz-gold/80">{w}</p>
        </div>
      ))}

      {hasGoogle && gsi === "failed" && (
        <div className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[11px] leading-relaxed text-mcz-ember">
          <p className="font-semibold">Google sign-in didn't load.</p>
          <p className="mt-1 text-mcz-ember/80">
            Use email, or another provider below. If you run this site: add{" "}
            <code className="rounded bg-black/40 px-1 text-white/80">{origin}</code> to the OAuth
            client's <span className="font-semibold">Authorized JavaScript origins</span> in the
            Google Console. An ad blocker or blocked third-party cookies will also do this.
          </p>
        </div>
      )}

      {/* `invalid_client` is Apple's answer to three different mistakes and it
          names none of them. All three are on the Services ID, and none is
          guessable from the popup — so list them, with the two values Apple
          has to be told, which are the parts nobody can look up for you. */}
      {appleErr && (
        <div className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[11px] leading-relaxed text-mcz-ember">
          <p className="font-semibold">Apple refused this site's sign-in setup.</p>
          <p className="mt-1 text-mcz-ember/80">
            Use email, or another provider below. If you run this site,{" "}
            <code className="rounded bg-black/40 px-1 text-white/80">invalid_client</code> means one
            of three things on the Apple <span className="font-semibold">Services ID</span>: it's
            the App ID (bundle ID) rather than a Services ID, Sign in with Apple isn't enabled on
            it, or these two aren't registered on it —{" "}
            <code className="rounded bg-black/40 px-1 text-white/80">{origin.replace(/^https?:\/\//, "")}</code>{" "}
            as a domain, and{" "}
            <code className="rounded bg-black/40 px-1 text-white/80">{REDIRECT}</code> as a return
            URL. The same string goes in{" "}
            <code className="rounded bg-black/40 px-1 text-white/80">APPLE_OAUTH_CLIENT_ID</code>.
          </p>
        </div>
      )}

      {apple && (
        <button
          onClick={() => start(apple)}
          disabled={busy === "apple"}
          className="neon-btn-ghost"
        >
          <Apple size={18} /> Continue with Apple
        </button>
      )}

      {rest.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="flex w-full items-center justify-center gap-1 py-1 text-xs font-semibold text-white/40 hover:text-white/70"
          >
            {showMore ? "Fewer options" : `More sign-in options (${rest.length})`}
            <ChevronDown size={13} className={`transition ${showMore ? "rotate-180" : ""}`} />
          </button>
          {showMore && (
            <div className="grid grid-cols-5 gap-2">
              {rest.map((p) => (
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
          )}
        </>
      )}
    </div>
  );
}
