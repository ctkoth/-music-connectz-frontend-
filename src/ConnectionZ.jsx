import { useEffect, useState } from "react";
import { Loader2, Link2Off, Plus } from "lucide-react";
import { api } from "./api.js";
import { PROVIDERS } from "./oauthProviders.jsx";
import { startConnect } from "./connectOAuth.js";

// Linking a provider shipped without an unlink, and `_user_from_oauth` matches
// a known provider_uid before it looks at anything else — so a SoundCloud that
// landed on the wrong account signed you back into that account every time,
// and no screen in the app could undo it. This is that screen.
//
// It renders the server's `connections` and nothing of its own. Whether a link
// can be removed depends on the password and on how many others are attached,
// and a client working that out would be the second place the rule lives.
//
// The CONNECT half was missing entirely — the only way to link a new provider
// was to answer "I already have one" at login, which only comes up when a
// provider we can't already match asks the question. A member who wanted to
// add SoundCloud to an account they were already signed into had no button
// anywhere. `OAuthLinkView.post` has taken a fresh authorization code from an
// authenticated member the whole time; this is the door to it.

const LABEL = {
  google: "Google",
  github: "GitHub",
  spotify: "Spotify",
  microsoft: "Microsoft",
  facebook: "Facebook",
  soundcloud: "SoundCloud",
  twitter: "Twitter",
};

const name = (key) => LABEL[key] || key.charAt(0).toUpperCase() + key.slice(1);

export default function ConnectionZ({ connections, onChange }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  // Client IDs the backend actually has configured — same endpoint
  // OAuthButtons reads, so a provider button here and one on the login
  // screen can never disagree about which providers are live.
  const [cfg, setCfg] = useState(null);
  const [connectBusy, setConnectBusy] = useState("");

  useEffect(() => {
    api("/api/auth/oauth-config/", { auth: false }).then(setCfg).catch(() => setCfg({}));
  }, []);

  // The landing OAuthCallback.jsx sends a member back to after a connect
  // attempt, carrying the result — the same pattern PostZ.jsx already reads
  // `imported` with after a SoundCloud import redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const failed = params.get("connect_failed");
    if (!connected && !failed) return;
    if (connected) {
      setDone(`${name(connected)} linked to your account.`);
      // The server's connections list just grew; refetch rather than guess
      // the shape of the new row from here.
      api("/api/auth/me/").then(onChange).catch(() => {});
    } else {
      setError(failed);
    }
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect(provider) {
    const id = cfg?.[provider.key];
    if (!id) return;
    setError("");
    setDone("");
    setConnectBusy(provider.key);
    try {
      await startConnect(provider, id);
      // startConnect navigates the whole page away on success; busy only
      // needs clearing on the paths that DON'T leave (id missing, above).
    } catch (err) {
      setError(err.message);
      setConnectBusy("");
    }
  }

  // An older API has no `connections` key at all, and an empty list is a real
  // answer ("nothing linked") rather than a failure. Absent renders nothing,
  // which reads as a feature that isn't switched on yet — what a missing key
  // actually means while the two repos deploy independently.
  if (!Array.isArray(connections)) return null;

  const linked = new Set(connections.map((c) => c.provider));
  // Google is excluded — it signs in through a rendered Google Identity
  // Services widget, not this authorize-redirect dance, and `oauthProviders`
  // says why folding it into one list would blur what the rest share.
  const linkable = PROVIDERS.filter((p) => !linked.has(p.key) && cfg?.[p.key]);

  async function disconnect(provider) {
    setError("");
    setDone("");
    setBusy(provider);
    try {
      const res = await api(`/api/auth/oauth/${provider}/link/`, { method: "DELETE" });
      setDone(res.detail || `${name(provider)} disconnected.`);
      onChange?.(res.user);
    } catch (err) {
      // The server knows whether this was the last way in, whether the link
      // was already gone, or whether it never existed. Those need different
      // answers, so its sentence reaches the screen unreworded.
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">
        Sign-ins linked to this account
      </p>

      {connections.length === 0 ? (
        <p className="text-sm text-white/55">
          None yet. Add one below and it'll sign you straight in next time.
        </p>
      ) : (
        <ul className="space-y-2">
          {connections.map((c) => (
            <li
              key={c.provider}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{name(c.provider)}</p>
                  {c.email ? (
                    <p className="truncate text-xs text-white/50">{c.email}</p>
                  ) : null}
                </div>

                <button
                  type="button"
                  /* `neon-btn` is w-full by default — in a flex row that eats
                     the whole line and collapses the provider name and email
                     to nothing. They stayed in the DOM, so a text check read
                     them and passed; only the screenshot showed the row was
                     blank. */
                  className="neon-btn !w-auto shrink-0 disabled:opacity-40"
                  disabled={!c.can_disconnect || busy === c.provider}
                  onClick={() => disconnect(c.provider)}
                >
                  {busy === c.provider ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Link2Off size={16} />
                  )}
                  {busy === c.provider ? "Disconnecting…" : "Disconnect"}
                </button>
              </div>

              {/* Why the button is dead, ON the button rather than behind it.
                  A disabled control with no reason beside it is the thing
                  somebody reports as broken. */}
              {c.blocked_reason ? (
                <p className="pt-2 text-xs text-mcz-ember">{c.blocked_reason}</p>
              ) : (
                <p className="pt-2 text-xs text-white/40">
                  You'll stop being able to sign in with {name(c.provider)}. Your
                  account, posts and balances are untouched, and you can link it
                  again any time.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* The connect half. `cfg === null` is still loading, so nothing
          renders rather than a grid that pops in a beat later — the same
          "nothing until it's real" rule the offers panel and the tiers cards
          on the signup screen already follow. */}
      {cfg && linkable.length > 0 && (
        <div className="pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">
            Add a sign-in
          </p>
          <div className="flex flex-wrap gap-2">
            {linkable.map((p) => (
              <button
                key={p.key}
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/[0.07] disabled:opacity-40"
                disabled={connectBusy === p.key}
                onClick={() => connect(p)}
              >
                {connectBusy === p.key
                  ? <Loader2 className="animate-spin" size={14} />
                  : <Plus size={14} />}
                <p.Icon size={14} color={p.color} />
                {name(p.key)}
              </button>
            ))}
          </div>
          <p className="pt-1.5 text-[11px] text-white/40">
            You'll be sent to the provider to authorize it, then straight back here.
          </p>
        </div>
      )}

      {error && <p className="pt-2 text-sm text-mcz-pink">{error}</p>}
      {done && <p className="pt-2 text-sm text-emerald-300">{done}</p>}
    </div>
  );
}
