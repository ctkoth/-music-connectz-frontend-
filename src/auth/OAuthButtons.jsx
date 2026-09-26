import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import AccountChoice from "./AccountChoice.jsx";
import { track } from "../track.js";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { GoogleG, PROVIDERS as REDIRECT_PROVIDERS, rand, pkceChallenge, clearFlowMarkers } from "../oauthProviders.jsx";

// Optional build-time fallback; the primary source is the backend config below.
const VITE_ID = (key) => import.meta.env[`VITE_${key.toUpperCase()}_CLIENT_ID`] || "";

// Google is prepended here rather than living in the shared registry — it
// renders as its own Google Identity Services button below, not one of these
// grid tiles, and `oauthProviders.jsx` says why it stays out of that list.
const PROVIDERS = [{ key: "google", label: "Google", Icon: GoogleG, color: "#ffffff" },
                    ...REDIRECT_PROVIDERS];

export default function OAuthButtons({ onSuccess, onError }) {
  const { oauth } = useAuth();
  const navigate = useNavigate();
  const googleBtn = useRef(null);
  // The server's "do you already have an account?" answer. A NEW Google
  // visitor always gets it (no identity yet, nothing to match), and this
  // component used to hand that answer straight to `onSuccess` — which on
  // Register and Login is `() => navigate("/")`. So the one-tap door, for
  // anybody who had never been here, ended on the home page signed out: no
  // account, no message, nothing to say why.
  const [choice, setChoice] = useState(null);
  const [choiceBusy, setChoiceBusy] = useState(false);
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
    if (!gid || !googleBtn.current) return;
    const render = () => {
      if (!window.google?.accounts?.id || !googleBtn.current) return;
      window.google.accounts.id.initialize({
        client_id: gid,
        callback: async (resp) => {
          try {
            setBusy("google");
            const res = await oauth("google", { credential: resp.credential });
            if (res?.needs_choice) setChoice(res);
            else onSuccess?.(res);
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
    if (!id) return onError?.(`${p.label} sign-in isn't available right now.`);

    // This is an ordinary sign-in, not an import or a connect — a marker left
    // over from either of those, abandoned mid-flow in this tab, would
    // otherwise hijack the callback that is about to happen.
    clearFlowMarkers();
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

  async function createFromChoice() {
    setChoiceBusy(true);
    try {
      const res = await oauth(choice.provider, { pending: choice.pending });
      track("register_success");
      onSuccess?.(res);
    } catch (e) {
      onError?.(e.message);
      setChoiceBusy(false);
    }
  }

  function signInInstead() {
    // Same hand-off OAuthCallback uses: Login links the provider after sign-in.
    sessionStorage.setItem("mcz_oauth_pending", choice.pending);
    sessionStorage.setItem("mcz_oauth_provider", choice.provider);
    navigate("/login");
  }

  if (choice) {
    return (
      <AccountChoice choice={choice} onCreate={createFromChoice}
                     onSignIn={signInInstead} busy={choiceBusy} />
    );
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
  const featured = grid.filter((p) => p.key === "spotify" || p.key === "soundcloud");
  const rest = grid.filter((p) => p.key !== "spotify" && p.key !== "soundcloud");

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

      {featured.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
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
