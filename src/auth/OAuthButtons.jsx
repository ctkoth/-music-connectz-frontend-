import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { PROVIDERS, REDIRECT, startOAuthRedirect } from "./oauthProviders.jsx";

// Optional build-time fallback; the primary source is the backend config below.
const VITE_ID = (key) => import.meta.env[`VITE_${key.toUpperCase()}_CLIENT_ID`] || "";

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
    await startOAuthRedirect(p, id, "signin");
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
