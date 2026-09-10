// DupeZ — one person, one account.
//
// Two screens in one file because they are two views of one thing: a member
// sees only the accounts strongly tied to their own and can say "that one's
// also me"; the owner sees every group on the platform and is the one who
// decides. The server draws that line (`apps/economy/dupez.py`); this file
// renders whichever answer it was given.
//
// The thing this screen exists to make hard: **deleting an account is
// irreversible, and it is the enforcement of the rule.** So nothing here is a
// one-tap action. Every account shows what a delete would destroy — posts,
// uploads, journal entries, money — BEFORE the button, which is the cost/gain
// rule applied to the most expensive action in the app. The price of pressing
// it is that whole list.
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, ShieldQuestion, Trash2, X } from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { ENERGY, MONEY, SPINAZ } from "../resources.js";
import RuleNote from "../RuleNote.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

const money = (cents) => `${((cents || 0) / 100).toFixed(2)} ${MONEY}`;

/** What a delete would destroy, stated before the control that destroys it. */
function AccountCard({ a, right = null, dim = false }) {
  const cash = (a.money_cents || 0) + (a.royalties_cents || 0);
  return (
    <div className={`rounded-lg border border-white/10 bg-white/[0.03] p-3 ${dim ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white/90">
            @{a.username}
            <span className="ml-2 rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] font-normal text-white/50">
              {a.tier}
            </span>
          </p>
          <p className="truncate text-[11px] text-white/40">{a.email || "no email"}</p>
          <p className="mt-0.5 text-[11px] text-white/35">
            joined {(a.joined || "").slice(0, 10)}
            {a.sign_ins?.length > 0 && <> · signs in with {a.sign_ins.join(", ")}</>}
          </p>
        </div>
        {right}
      </div>

      {/* The price of deleting this one. Everything here goes. */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/50">
        <span>{a.posts} posts</span>
        <span>{a.uploads} uploads</span>
        <span>{a.journal_entries} journal</span>
        <span>{a.spinaz} {SPINAZ}</span>
        <span>{a.energy} {ENERGY}</span>
        {cash > 0 && (
          // Cash is the one thing a delete may never destroy, so it is the one
          // number that shouts. The server refuses rather than trusting this.
          <span className="font-semibold text-mcz-ember">{money(cash)}</span>
        )}
      </div>
    </div>
  );
}

function Signals({ pairs }) {
  const rows = asList(pairs);
  if (!rows.length) return null;
  return (
    <ul className="mt-2 space-y-0.5 text-[11px] text-white/45">
      {rows.flatMap((p, i) =>
        asList(p.signals).map((s, j) => (
          <li key={`${i}-${j}`}>
            <span className="text-white/60">@{p.a}</span> ~ <span className="text-white/60">@{p.b}</span>:{" "}
            {s.label}
            {s.detail ? ` (${s.detail})` : ""}
            {/* Strong and weak are shown as words, not folded into a score.
                A number nobody can check behind an action nobody can undo is
                exactly what this screen must not have. */}
            <span className={s.weight === "strong" ? "ml-1 text-mcz-cyan" : "ml-1 text-white/30"}>
              {s.weight}
            </span>
          </li>
        )),
      )}
    </ul>
  );
}

export default function DupeZ() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [claims, setClaims] = useState([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api("/api/economy/dupez/")
      .then((d) => {
        setData(d);
        if (d?.owner) {
          api("/api/economy/dupez/review/")
            .then((r) => setClaims(asList(r?.claims)))
            .catch(() => setClaims([]));
        }
      })
      // The real error, never a shrug — a screen about deleting accounts is
      // the last place to answer "something went wrong".
      .catch((e) => setErr(e.message || "Couldn't load DupeZ."));
  }, []);

  useEffect(load, [load]);

  if (err) return <p className="text-sm text-mcz-ember">{err}</p>;
  if (!data) {
    return (
      <p className="flex items-center gap-2 text-white/50">
        <Loader2 className="animate-spin" size={16} /> Loading DupeZ…
      </p>
    );
  }

  const groups = asList(data.groups);

  const act = async (path, body, ok) => {
    setBusy(path + JSON.stringify(body));
    setMsg("");
    try {
      const r = await api(path, { method: "POST", body });
      setMsg(ok(r));
      load();
    } catch (e) {
      setMsg(e.message || "That didn't work.");
    }
    setBusy("");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-extrabold">DupeZ</h2>
        <p className="text-[12px] text-white/50">
          {data.owner
            ? "Every account on the platform that shares a strong identity signal with another."
            : "Accounts that look like they might also be you."}
        </p>
      </div>

      {/* The rule, from the server, above the thing that enforces it. */}
      <RuleNote rule="one_account" detail />

      {msg && <p className="text-[12px] text-mcz-cyan">{msg}</p>}

      {data.owner && claims.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
            Claims waiting on you
          </h3>
          {claims.map((c) => (
            <div key={c.id} className="rounded-xl border border-mcz-gold/30 bg-mcz-gold/[0.04] p-3">
              <p className="text-[12px] text-white/80">
                <span className="font-semibold">@{c.claimant}</span> says{" "}
                <span className="font-semibold">@{c.target}</span> is also them.
              </p>
              {c.note && <p className="mt-1 text-[11px] italic text-white/50">“{c.note}”</p>}
              <Signals pairs={[{ a: c.claimant, b: c.target, signals: c.signals }]} />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <AccountCard a={c.claimant_account} />
                <AccountCard a={c.target_account} dim />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  className="re-btn !w-auto !py-1.5 !px-3 !text-[12px]"
                  disabled={!!busy}
                  onClick={() =>
                    act("/api/economy/dupez/review/", { id: c.id, action: "approve" },
                        (r) => `@${r.receipt.deleted} deleted. ${
                          r.receipt.swept.money_cents
                            ? `${money(r.receipt.swept.money_cents)} moved to @${r.receipt.kept}.`
                            : ""}`)
                  }
                >
                  <Check size={13} /> Approve — delete @{c.target}
                </button>
                <button
                  className="re-btn !w-auto !py-1.5 !px-3 !text-[12px] !border-white/25 !text-white/70"
                  disabled={!!busy}
                  onClick={() =>
                    act("/api/economy/dupez/review/",
                        { id: c.id, action: "refuse", note: "Not enough to go on." },
                        () => "Refused, and they've been told.")
                  }
                >
                  <X size={13} /> Refuse
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {!groups.length && !asList(data.weak_pairs).length && (
        <p className="text-[12px] text-white/45">
          {data.owner
            ? "No accounts share a strong signal with another. Nothing to do."
            : "Nothing here looks like a second account of yours."}
        </p>
      )}

      {groups.map((g, i) => (
        <Group key={i} g={g} owner={data.owner} busy={busy} act={act} />
      ))}

      {asList(data.weak_pairs).length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
            Possible matches (weak signals only)
          </h3>
          {asList(data.weak_pairs).map((pair, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[12px] text-white/80 mb-2">
                <span className="font-semibold">@{pair.a}</span> — <span className="font-semibold">@{pair.b}</span>
              </p>
              <Signals pairs={[pair]} />
              <p className="text-[11px] text-white/40 mt-2">
                These accounts share a signal, but it could be a coincidence. Review before taking action.
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Group({ g, owner, busy, act }) {
  const { user } = useAuth();
  const accounts = asList(g.accounts);
  const [keep, setKeep] = useState(g.suggested_keep);

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center gap-2 text-[12px] text-white/60">
        <ShieldQuestion size={14} className="text-mcz-cyan" />
        {accounts.length} accounts look like one person
      </div>

      {owner && (
        <label className="mb-2 block text-[11px] text-white/50">
          Keep{" "}
          <select
            value={keep}
            onChange={(e) => setKeep(e.target.value)}
            className="rounded border border-white/15 bg-black/40 px-2 py-1 text-[12px] text-white/85"
          >
            {accounts.map((a) => (
              <option key={a.username} value={a.username}>@{a.username}</option>
            ))}
          </select>
          {/* Suggested, not chosen. The oldest account is usually the one
              somebody built on and is just as often not. */}
          <span className="ml-2 text-white/30">oldest suggested</span>
        </label>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {accounts.map((a) => (
          <AccountCard
            key={a.username}
            a={a}
            dim={owner && a.username !== keep}
            right={
              owner && a.username !== keep && !a.is_owner ? (
                <button
                  title={`Delete @${a.username}`}
                  className="shrink-0 rounded p-1 text-white/30 hover:text-mcz-ember"
                  disabled={!!busy}
                  onClick={() => {
                    const cash = (a.money_cents || 0) + (a.royalties_cents || 0);
                    const warn = cash
                      ? `\n\n${money(cash)} will move to @${keep} first.`
                      : "";
                    // The browser's own confirm, on purpose: this is the one
                    // action in the app that cannot be undone by anybody.
                    if (!window.confirm(
                      `Delete @${a.username}?\n\n` +
                      `${a.posts} posts, ${a.uploads} uploads and ` +
                      `${a.journal_entries} journal entries go with it, permanently.` +
                      warn)) return;
                    act("/api/economy/dupez/delete/",
                        { username: a.username, keep, confirm: "DELETE" },
                        (r) => `@${r.deleted} deleted.` + (r.swept.money_cents
                          ? ` ${money(r.swept.money_cents)} moved to @${r.kept}.` : ""));
                  }}
                >
                  <Trash2 size={14} />
                </button>
              ) : null
            }
          />
        ))}
      </div>

      <Signals pairs={g.pairs} />

      {!owner && (
        <div className="mt-3 space-y-2">
          <p className="flex items-start gap-1.5 text-[11px] text-white/45">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-mcz-gold" />
            Say which one is yours and the other goes. If they use different
            emails it's reviewed by the owner first — nothing is deleted before
            then.
          </p>
          <div className="flex flex-wrap gap-2">
            {/* Never offer to close the account you are signed in to — that is
                what account deletion in ProfileZ is for, and mixing the two here
                would put "delete my own account" behind a duplicate button. */}
            {accounts.filter((a) => a.username !== user?.username).map((a) => (
              <button
                key={a.username}
                className="re-btn !w-auto !py-1.5 !px-3 !text-[12px]"
                disabled={!!busy}
                onClick={() => {
                  if (!window.confirm(
                    `Close @${a.username}?\n\n` +
                    `${a.posts} posts, ${a.uploads} uploads and ` +
                    `${a.journal_entries} journal entries go with it, permanently.`)) return;
                  act("/api/economy/dupez/claim/",
                      { username: a.username, confirm: "DELETE" },
                      (r) => r.deleted
                        ? `@${r.deleted} closed.`
                        : r.detail || "Filed — you'll hear back.");
                }}
              >
                @{a.username} is also me — close it
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
