import { useState } from "react";
import { Loader2, Link2Off } from "lucide-react";
import { api } from "./api.js";

// Linking a provider shipped without an unlink, and `_user_from_oauth` matches
// a known provider_uid before it looks at anything else — so a SoundCloud that
// landed on the wrong account signed you back into that account every time,
// and no screen in the app could undo it. This is that screen.
//
// It renders the server's `connections` and nothing of its own. Whether a link
// can be removed depends on the password and on how many others are attached,
// and a client working that out would be the second place the rule lives.

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

  // An older API has no `connections` key at all, and an empty list is a real
  // answer ("nothing linked") rather than a failure. Absent renders nothing,
  // which reads as a feature that isn't switched on yet — what a missing key
  // actually means while the two repos deploy independently.
  if (!Array.isArray(connections)) return null;

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
          None yet. Linking one from the login screen lets you sign in with it.
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

      {error && <p className="pt-2 text-sm text-mcz-pink">{error}</p>}
      {done && <p className="pt-2 text-sm text-emerald-300">{done}</p>}
    </div>
  );
}
