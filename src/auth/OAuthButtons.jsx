import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import AccountChoice, { choiceRoutes } from "./AccountChoice.jsx";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { goesExternal, openProvider, statePrefixFor, appShell } from "../externalAuth.js";
import { GoogleG, ID_TOKEN_AUTH, PROVIDERS as REDIRECT_PROVIDERS, rand, pkceChallenge, clearFlowMarkers, isInAppBrowser } from "../oauthProviders.jsx";

// Optional build-time fallback; the primary source is the backend config below.
const VITE_ID = (key) => import.meta.env[`VITE_${key.toUpperCase()}_CLIENT_ID`] || "";

// Google is prepended here rather than living in the shared registry — it
// renders as its own Google Identity Services button below, not one of these
// grid tiles, and `oauthProviders.jsx` says why it stays out of that list.
const PROVIDERS = [{ key: "google", label: "Google", Icon: GoogleG, color: "#ffffff" },
                    ...REDIRECT_PROVIDERS];

// The standalone BodieZ build is on another origin, and the providers' redirect
// URIs are registered for musicconnectz.net only — a button there would open a
// provider that then refuses to come back. Absent is honest; broken is not.
export default function OAuthButtons(props) {
  return import.meta.env.VITE_STANDALONE ? null : <OAuthButtonsInner {...props} />;
}

function OAuthButtonsInner({ onSuccess, onError }) {
  const { oauth } = useAuth();
  const navigate = useNavigate();
  // Google and Apple sign in by popup, so their answer lands HERE rather than
  // on /oauth/callback. A brand-new member's answer is a question ("do you
  // already have an account?"), and passing it to onSuccess as if it were a
  // sign-in sent them to the home page still signed out — every first-time
  // Google signup ended there.
  const [choice, setChoice] = useState(null);
  // Which build we're in decides how Google and Apple can work at all.
  const shell = appShell();
  // In the Android and Windows apps their popups have nothing to return to,
  // so they go through the device's real browser instead (ID_TOKEN_AUTH).
  const viaBrowser = shell === "android" || shell === "desktop";
  // An app built before that hand-back existed can't do either — say so
  // rather than render a button that dead-ends.
  const oldApp = shell === "android-old" || shell === "desktop-old";
  const finish = (res) => (res?.needs_choice ? setChoice(res) : onSuccess?.(res));
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
  // Six providers deep in a same-sized icon grid made every option look
  // equally likely to work, which is worse than showing none: a first-time
  // visitor can't tell "the one everyone has" from "the one from 2019 nobody
  // configured." Featured providers (Spotify and SoundCloud) are shown
  // side-by-side; the long tail collapses behind a toggle instead of eating
  // screen space by default.
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
    if (!gid || !googleBtn.current || viaBrowser || oldApp || shell === "inapp") return;
    const render = () => {
      if (!window.google?.accounts?.id || !googleBtn.current) return;
      window.google.accounts.id.initialize({
        client_id: gid,
        callback: async (resp) => {
          try {
            setBusy("google");
            finish(await oauth("google", { credential: resp.credential }));
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

  // Sign in with Apple — Apple's own JS in popup mode hands back an identity
  // token, which the server verifies against its Services ID. Shown only when
  // the server has that ID, so the button never leads somewhere that fails.
  // Google/Apple in the Android or Windows app: out to the real browser,
  // back through the app's deep link, finished on /oauth/callback.
  async function startViaBrowser(key) {
    const id = clientId(key);
    if (!id) return onError?.(`${key === "google" ? "Google" : "Apple"} sign-in isn't available right now.`);
    clearFlowMarkers();
    const p = { key };
    const state = statePrefixFor(p) + rand();
    sessionStorage.setItem("mcz_oauth_provider", key);
    sessionStorage.setItem("mcz_oauth_state", state);
    sessionStorage.removeItem("mcz_oauth_verifier");
    await openProvider(p, ID_TOKEN_AUTH[key](id, state, rand()));
  }

  async function startApple() {
    if (viaBrowser) return startViaBrowser("apple");
    const id = clientId("apple");
    if (!id) return onError?.("Apple sign-in isn't available right now.");
    setBusy("apple");
    try {
      if (!window.AppleID?.auth) {
        await new Promise((ok, fail) => {
          const sc = document.createElement("script");
          sc.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
          sc.onload = ok;
          sc.onerror = () => fail(new Error("Apple sign-in didn't load. Use email or another option."));
          document.head.appendChild(sc);
        });
      }
      window.AppleID.auth.init({
        clientId: id, scope: "name email", usePopup: true,
        redirectURI: `${window.location.origin}/login`,
      });
      const resp = await window.AppleID.auth.signIn();
      const token = resp?.authorization?.id_token;
      if (!token) throw new Error("Apple didn't send a sign-in token back.");
      finish(await oauth("apple", { id_token: token }));
    } catch (e) {
      // Closing the popup is a choice, not an error worth a red line.
      if (e?.error !== "popup_closed_by_user") onError?.(e?.message || e?.error || "Apple sign-in didn't finish.");
    } finally { setBusy(""); }
  }

  async function start(p) {
    const id = clientId(p.key);
    if (p.key === "google") {
      return onError?.(id ? "Use the Google button above." : "Google sign-in isn't available yet.");
    }
    if (!id) return onError?.(`${p.label} sign-in isn't available right now.`);

    // Facebook refuses to log anyone in from inside the Facebook or Instagram
    // app's own embedded browser — it shows a dead-end page that never
    // redirects back. That strands Spotify too, since Spotify itself offers
    // "Continue with Facebook" on its own login screen. There is nothing we
    // can do once the member is on Facebook's page, so warn before we send
    // them there rather than let them hit a screen that goes nowhere.
    if (isInAppBrowser() && (p.key === "facebook" || p.key === "spotify")) {
      return onError?.(
        `Facebook sign-in doesn't work inside the ${/Instagram/i.test(navigator.userAgent) ? "Instagram" : "Facebook"} app's browser. Open this page in Chrome or Safari and try again.`
      );
    }

    // This is an ordinary sign-in, not an import or a connect — a marker left
    // over from either of those, abandoned mid-flow in this tab, would
    // otherwise hijack the callback that is about to happen.
    clearFlowMarkers();
    const state = statePrefixFor(p) + rand();
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
    await openProvider(p, p.auth(encodeURIComponent(id), state, challenge));
  }

  // Google renders as its own GIS button when configured; otherwise it shows in
  // the grid like the rest. All provider logos are always visible so the
  // login/register screen presents the full set of social options.
  const hasGoogle = !!clientId("google") && !viaBrowser && !oldApp && shell !== "inapp";
  const googleViaBrowser = !!clientId("google") && viaBrowser;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  // Only hide the generic Google button once GSI has actually put one on the
  // screen. Hiding it on `hasGoogle` alone meant configuring Google could
  // REMOVE the member's only way to use it.
  // In the apps and in-app browsers Google is the button above (or the note
  // explaining why it can't be), never a dead tile in the grid.
  const grid = PROVIDERS.filter((p) => !(p.key === "google"
    && ((hasGoogle && gsi !== "failed") || viaBrowser || oldApp || shell === "inapp")));
  // The one-tap sign-ins people actually have go up front; the long tail folds.
  const FEATURED = ["google", "spotify", "soundcloud"];
  // Google is only featured as a tile when it is configured (GIS failed to
  // render it) — an unconfigured tile up front would be a dead button.
  const isFeatured = (p) => FEATURED.includes(p.key) && (p.key !== "google" || hasGoogle);
  const featured = grid.filter(isFeatured);
  const rest = grid.filter((p) => !isFeatured(p));
  const hasApple = !!clientId("apple") && !oldApp && shell !== "inapp";
  const blockedHere = (shell === "inapp" || oldApp) && (clientId("google") || clientId("apple"));

  if (choice) {
    const go = choiceRoutes(choice, navigate, oauth);
    const create = async () => {
      setBusy("choice");
      try { await go.create(); } catch (e) { onError?.(e.message); setBusy(""); }
    };
    return <AccountChoice choice={choice} onCreate={create} onSignIn={go.signIn} busy={busy === "choice"} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-white/40">
        <span className="h-px flex-1 bg-white/10" /> or continue with <span className="h-px flex-1 bg-white/10" />
      </div>

      {hasGoogle && <div ref={googleBtn} className="flex justify-center" />}

      {googleViaBrowser && (
        <div className="flex justify-center">
          <button type="button" onClick={() => startViaBrowser("google")} aria-label="Continue with Google"
                  className="flex h-10 w-[280px] items-center justify-center gap-2 rounded-full border border-white/20 bg-[#131314] text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95">
            <GoogleG size={16} color="#ffffff" /> Continue with Google
          </button>
        </div>
      )}

      {/* Instagram's, TikTok's and Facebook's own browsers: Google refuses to
          sign anyone in there ("disallowed_useragent") and Apple's popup has
          nowhere to land. Most visitors from a social link are in one. */}
      {blockedHere && (
        <div className="rounded-lg border border-mcz-cyan/30 bg-mcz-cyan/10 px-3 py-2 text-[12px] leading-relaxed text-white/80">
          {oldApp ? (
            <p>Google and Apple sign-in need the latest version of the app. Update it, or use email or another option below.</p>
          ) : (
            <>
              <p>Google and Apple don't allow sign-in inside this app's browser. Open this page in Chrome or Safari to use them — or sign up with email right here.</p>
              <button type="button" className="mt-1 text-mcz-cyan underline"
                      onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => onError?.("Link copied — paste it into Chrome or Safari."))}>
                Copy this page's link
              </button>
            </>
          )}
        </div>
      )}

      {hasApple && (
        <div className="flex justify-center">
          <button type="button" onClick={startApple} disabled={busy === "apple"}
                  aria-label="Continue with Apple"
                  className="flex h-10 w-[280px] items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-black transition hover:bg-white/90 active:scale-95">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
              <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.72-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.75.73 1.05 1.6 2.24 2.73 2.2 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.3-3.51zM14.2 6.12c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.67-.92 2.66.97.07 1.96-.49 2.56-1.21z"/>
            </svg>
            {busy === "apple" ? "Opening Apple…" : "Continue with Apple"}
          </button>
        </div>
      )}

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

      {featured.length > 0 && (
        <div className={`grid gap-2 ${featured.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {featured.map((p) => (
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
