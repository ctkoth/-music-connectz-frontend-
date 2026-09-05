// RoyaltieZ — the money your music made, and what it costs to take it out.
//
// The backend for this has been finished and mounted for months: three
// endpoints, a balance on the wallet, a full per-tier cashout schedule. There
// was no screen. A member could accrue money they could not see and could not
// withdraw, which is worse than the feature not existing, because not existing
// is at least honest.
//
// The cost here is a PERCENTAGE, which makes the cost/gain rule harder than
// usual and more important: "−15%" means nothing until you know what it is 15%
// OF. So the server does the arithmetic for this balance at this tier and this
// screen shows both halves in cents on every plan, before one is picked —
// what it takes, and what lands. Picking the expensive plan should be a
// decision, never a discovery.
import { useEffect, useState } from "react";
import { Loader2, Coins, ArrowRight, AlertTriangle } from "lucide-react";

import { api } from "../api.js";
import { asList } from "../shape.js";
import { MONEY } from "../resources.js";
import { goToSpot } from "../goto.js";
import { playSound } from "../sound.js";

const usd = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

const when = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// Cheapest plan first is the wrong order and the honest one is worse: a member
// scanning top-down should meet the option that keeps the most of their money
// before the one that hands it over fastest. The server sends them in
// speed order, so this reverses it deliberately.
const PLAN_BLURB = {
  instant: "Paid the moment you press it.",
  weekly: "Batched weekly. Your tier sets this rate.",
  monthly: "Batched monthly.",
  quarterly: "Batched quarterly. Keeps all of it.",
};

export default function RoyaltieZ() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    api("/api/economy/royalties/")
      .then((d) => { setData(d); setErr(""); })
      .catch((e) => setErr(e.message || "Couldn't load RoyaltieZ."));
  };
  useEffect(load, []);

  async function cashout(plan) {
    setBusy(true); setMsg("");
    try {
      const r = await api("/api/economy/royalties/cashout/", {
        method: "POST", body: { plan },
      });
      const b = r.breakdown || {};
      playSound("money_earn");
      // Both halves again, after the fact, so the receipt matches the quote.
      setMsg(`${usd(b.net_cents)} ${MONEY} into your balance — ${usd(b.gross_cents)} less ${usd(b.tax_cents)} fee.`);
      load();
    } catch (e) {
      // The real error, never a cheerful lie. A cashout that says "done" on a
      // failure is the worst bug class in this app.
      setMsg(e.message || "That cashout didn't go through.");
    } finally {
      setBusy(false);
    }
  }

  if (err) {
    return (
      <div className="re-card flex items-start gap-2 text-sm text-mcz-ember">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {err}
      </div>
    );
  }
  if (!data) {
    return (
      <p className="flex items-center gap-2 text-sm text-white/50">
        <Loader2 className="animate-spin" size={15} /> Loading RoyaltieZ…
      </p>
    );
  }

  const gross = data.royalties_cents || 0;
  const plans = asList(data.plans);
  const entries = asList(data.entries);
  // Lowest fee first — the member's money, ordered by how much of it they keep.
  // By RATE and not by net: at a zero balance every net is 0, so sorting on net
  // falls back to the server's speed order and puts the 15% option at the top
  // of the screen for exactly the member who has not earned anything yet. The
  // rate is the same ordering and it does not move when the balance does.
  const ordered = [...plans].sort((a, b) => (a.rate || 0) - (b.rate || 0));

  return (
    <div className="space-y-4">
      <div className="re-card space-y-1">
        <p className="re-label">Royalty balance</p>
        <p className="font-display text-3xl font-extrabold text-emerald-300">
          {usd(gross)} <span className="text-2xl">{MONEY}</span>
        </p>
        <p className="text-[12px] text-white/45">
          Held separately from your spendable balance until you cash it out.
        </p>
      </div>

      {/* An empty balance means two very different things and guessing wrong is
          the difference between "I've earned nothing" and "this isn't wired
          up". The server says which, so this screen can too. */}
      {gross === 0 && data.accrual_is_live === false && (
        <div className="re-card space-y-2 text-[13px] text-white/60">
          <p className="font-semibold text-white/80">Nothing pays into this yet.</p>
          <p>
            RoyaltieZ is built and ready, but no distributor is wired to it — so
            your balance is zero because nothing has been paid in, not because
            you haven't earned. When a release starts reporting, it lands here.
          </p>
          <button className="re-btn re-btn-cyan !w-auto px-4"
                  onClick={() => goToSpot("postz", "composer")}>
            Get a release out <ArrowRight size={14} />
          </button>
        </div>
      )}

      <div className="space-y-2">
        <p className="re-label">Cash out</p>
        {/* Every plan states the fee AND the net, in cents, before it is
            pressed — a percentage on its own is not a price. */}
        <div className="grid gap-2 sm:grid-cols-2">
          {ordered.map((p) => (
            <div key={p.plan} className="re-card space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-sm font-extrabold capitalize">{p.plan}</span>
                <span className="text-[11px] text-white/40">{p.rate_percent}% fee</span>
              </div>
              <p className="text-[11px] text-white/45">{PLAN_BLURB[p.plan] || ""}</p>
              <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
                <span className="text-mcz-ember">−{usd(p.tax_cents)} {MONEY}</span>
                <span className="text-emerald-300">+{usd(p.net_cents)} {MONEY}</span>
              </p>
              <button
                className={`re-btn !w-auto px-4 ${p.tax_cents === 0 ? "re-btn-emerald" : ""}`}
                disabled={busy || gross <= 0}
                onClick={() => cashout(p.plan)}
              >
                <Coins size={14} /> Cash out {p.plan}
              </button>
            </div>
          ))}
        </div>
        {gross <= 0 && (
          <p className="text-[11px] text-white/35">
            Nothing to cash out yet — the rates are here so you know them before you do.
          </p>
        )}
      </div>

      {msg && <p className="re-card text-[13px] text-white/80">{msg}</p>}

      <div className="space-y-2">
        <p className="re-label">Ledger</p>
        {entries.length === 0 ? (
          <p className="text-[12px] text-white/35">No royalty movements yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((e, i) => (
              <li key={i}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-white/85">
                    {e.source || (e.kind === "cashout" ? "Cashed out" : "Royalty")}
                  </span>
                  <span className="block text-[10px] text-white/35">
                    {when(e.created_at)}
                    {e.tax_cents ? ` · ${usd(e.tax_cents)} fee` : ""}
                  </span>
                </span>
                <span className={`shrink-0 text-[13px] font-bold ${
                  e.amount_cents >= 0 ? "text-emerald-300" : "text-mcz-ember"}`}>
                  {e.amount_cents >= 0 ? "+" : "−"}{usd(Math.abs(e.amount_cents))} {MONEY}
                </span>
              </li>
            ))}
          </ul>
        )}
        {/* Nothing is a dead end: a movement here is a movement in LogZ too. */}
        <button className="re-link text-[12px]" onClick={() => goToSpot("logz", "")}>
          See it beside everything else in LogZ <ArrowRight size={12} className="inline" />
        </button>
      </div>
    </div>
  );
}
