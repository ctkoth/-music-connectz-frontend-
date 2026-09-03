// LinkedAccountsCard — attach more than one OAuth provider to ONE account, so
// a member can sign back in with whichever they have handy.
//
// OAuthButtons (the signed-out login screen) only ever matches-or-creates an
// account — it never reads who's already signed in, so it had no way to say
// "this is ALSO me." This card is that missing half: the same verifiers, the
// same PROVIDERS registry, run while authenticated, writing the resulting
// identity onto the CURRENT account (`/api/auth/oauth/<provider>/link/`)
// instead of resolving one to sign in as.
import { useEffect, useRef, useState } from "react";
import { Link2, Loader2, Unlink } from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { PROVIDERS, REDIRECT, startOAuthRedirect } from "../auth/oauthProviders.jsx";

export default function LinkedAccountsCard() {
  const { linkOAuth } = useAuth();
  const googleBtn = useRef(null);
  const [cfg, setCfg] = useState(null);          // provider -> client_id, from the server
  const [identities, setIdentities] = useState(null); // null = loading
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [wantGoogle, setWantGoogle] = useState(false); // render the real GSI button on demand

  const load = () => api("/api/auth/oauth/linked/").then((d) => setIdentities(asList(d?.identities)));

  useEffect(() => {
    load().catch(() => setIdentities([]));
    api("/api/auth/oauth-config/", { auth: false }).then(setCfg).catch(() => setCfg({}));
    // A redirect-based link just landed us back here — say so once.
    const params = new URLSearchParams(window.location.search);
    const linked = params.get("linked");
    if (linked) {
      setMsg(`${linked[0].toUpperCase()}${linked.slice(1)} linked — you can sign in with it now.`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };
  const linkedProvider = (key) => (identities || []).find((i) => i.provider === key);

  async function afterLink(provider) {
    await load();
    flash(`${PROVIDERS.find((p) => p.key === provider)?.label || provider} linked — you can sign in with it now.`);
  }

  async function unlink(key) {
    const label = PROVIDERS.find((p) => p.key === key)?.label || key;
    if (!window.confirm(`Unlink ${label}? You won't be able to sign in with it any more.`)) return;
    setBusy(key);
    try {
      await api(`/api/auth/oauth/${key}/link/`, { method: "DELETE" });
      await load();
      flash(`${label} unlinked.`);
    } catch (e) { flash(e.message || `Couldn't unlink ${label}.`); }
    finally { setBusy(""); }
  }

  async function linkApple(id) {
    setBusy("apple");
    try {
      await new Promise((res, rej) => {
        if (document.getElementById("apple-js")) return res();
        const s = document.createElement("script");
        s.id = "apple-js";
        s.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
      window.AppleID.auth.init({ clientId: id, scope: "name email", redirectURI: REDIRECT, usePopup: true });
      const data = await window.AppleID.auth.signIn();
      await linkOAuth("apple", { id_token: data?.authorization?.id_token });
      await afterLink("apple");
    } catch (e) {
      flash(e?.message || "Apple sign-in was cancelled.");
    } finally { setBusy(""); }
  }

  async function link(p) {
    const id = cfg?.[p.key];
    if (!id) return flash(`${p.label} isn't set up on the server yet.`);
    if (p.key === "google") { setWantGoogle(true); return; }
    if (p.key === "apple") return linkApple(id);
    setBusy(p.key);
    await startOAuthRedirect(p, id, "link"); // navigates away; nothing after this runs
  }

  /* Google renders through its own widget, not a custom button — load it only
   * once the member has actually asked to link Google. */
  useEffect(() => {
    if (!wantGoogle || !cfg?.google || !googleBtn.current) return;
    const render = () => {
      if (!window.google?.accounts?.id || !googleBtn.current) return;
      window.google.accounts.id.initialize({
        client_id: cfg.google,
        callback: async (resp) => {
          try {
            setBusy("google");
            await linkOAuth("google", { credential: resp.credential });
            setWantGoogle(false);
            await afterLink("google");
          } catch (e) { flash(e.message || "Couldn't link Google."); }
          finally { setBusy(""); }
        },
      });
      window.google.accounts.id.renderButton(googleBtn.current, {
        theme: "filled_black", size: "medium", shape: "pill", text: "continue_with", width: 220,
      });
    };
    if (window.google?.accounts?.id) return render();
    if (!document.getElementById("gsi-js")) {
      const s = document.createElement("script");
      s.id = "gsi-js";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = render;
      document.head.appendChild(s);
    } else {
      const poll = setInterval(() => {
        if (window.google?.accounts?.id) { clearInterval(poll); render(); }
      }, 200);
      return () => clearInterval(poll);
    }
  }, [wantGoogle, cfg]); // eslint-disable-line react-hooks/exhaustive-deps

  if (identities === null) {
    return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading linked accounts…</p>;
  }

  return (
    <div className="neon-frame space-y-3 p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/45">
        <Link2 size={12} /> Linked sign-in accounts
      </p>
      <p className="text-[11px] text-white/40">
        Attach more than one, and sign back in with whichever's handy. Nothing here changes your
        display name or profile — it just adds another way in.
      </p>

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-mcz-gold">{msg}</p>}

      <ul className="space-y-1.5">
        {PROVIDERS.map((p) => {
          const linked = linkedProvider(p.key);
          return (
            <li key={p.key} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="flex min-w-0 items-center gap-2">
                <p.Icon size={16} color={p.color} />
                <span className="min-w-0 truncate text-[12px] text-white/80">{p.label}</span>
                {linked && <span className="shrink-0 text-[10px] text-emerald-300">✓ linked{linked.email ? ` · ${linked.email}` : ""}</span>}
              </span>
              {linked ? (
                <button className="re-btn !w-auto shrink-0 px-2.5 text-[11px]" disabled={busy === p.key} onClick={() => unlink(p.key)}>
                  {busy === p.key ? <Loader2 className="animate-spin" size={12} /> : <Unlink size={12} />} Unlink
                </button>
              ) : p.key === "google" && wantGoogle ? (
                <div ref={googleBtn} className="shrink-0" />
              ) : (
                <button className="re-btn !w-auto shrink-0 px-2.5 text-[11px]" disabled={busy === p.key} onClick={() => link(p)}>
                  {busy === p.key ? <Loader2 className="animate-spin" size={12} /> : <Link2 size={12} />} Link
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
