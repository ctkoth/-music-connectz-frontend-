// Withdraw — the one place money leaves the platform for a bank.
//
// Everything this says comes from GET /api/economy/payouts/: the balance,
// the minimum and maximum, the fee and what lands, and — when a withdrawal
// can't happen yet — every reason why, which is what a member can act on.
// Bank details never touch this app: "Connect" opens the provider's own
// onboarding, and it sends the member back here with ?payout=done, which
// is when this asks the provider whether they can be paid yet.
import { useEffect, useState } from "react";
import { Banknote, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { api } from "../api.js";
import { MONEY } from "../resources.js";

const usd = (c) => `$${((c || 0) / 100).toFixed(2)}`;
const STATUS = {
  paid: ["Sent", "text-emerald-300"],
  failed: ["Returned to your balance", "text-mcz-ember"],
  pending: ["Sending…", "text-white/60"],
};

export default function Withdraw() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [amount, setAmount] = useState("");

  const load = () => api("/api/economy/payouts/").then(setData).catch((e) => setErr(e.message));

  useEffect(() => {
    const back = new URLSearchParams(window.location.search).get("payout");
    if (back) {
      // Returning from the provider. Reaching the end of their form is not the
      // same as being approved, so ask them rather than assuming.
      setBusy("refresh");
      api("/api/economy/payouts/refresh/", { method: "POST" })
        .then(() => setMsg(back === "done" ? "Checked with the provider." : "Pick up where you left off below."))
        .catch(() => {})
        .finally(() => { setBusy(""); load(); });
    } else load();
  }, []);

  if (err && !data) return <p className="re-card text-[13px] text-mcz-ember">{err}</p>;
  if (!data) return <p className="flex items-center gap-2 text-white/50"><Loader2 size={14} className="animate-spin" /> Loading withdrawals…</p>;

  const q = data.quote || {};
  const cents = amount ? Math.round(parseFloat(amount) * 100) || 0 : q.balance_cents;
  const fee = Math.min(q.fee_cents ?? 0, cents);   // the server's flat fee, never more than the amount

  const connect = async () => {
    setBusy("connect"); setErr("");
    try {
      const r = await api("/api/economy/payouts/connect/", { method: "POST" });
      if (r.url) window.location.href = r.url;
    } catch (e) { setErr(e.message || "Couldn't start that."); }
    finally { setBusy(""); }
  };
  const refresh = async () => {
    setBusy("refresh"); setErr("");
    try { const r = await api("/api/economy/payouts/refresh/", { method: "POST" }); setData({ ...data, quote: r.quote }); }
    catch (e) { setErr(e.message); }
    finally { setBusy(""); }
  };
  const withdraw = async () => {
    setBusy("send"); setErr(""); setMsg("");
    try {
      const r = await api("/api/economy/payouts/", { method: "POST", body: { amount_cents: cents } });
      setMsg(`${usd(r.payout?.net_cents)} is on its way to your bank.`);
      setAmount("");
      load();
    } catch (e) {
      // The server's sentence — it says whether the balance was touched.
      setErr(e.message || "That didn't go through. Your balance hasn't changed.");
      load();
    } finally { setBusy(""); }
  };

  const inRange = cents >= q.min_cents && cents <= Math.min(q.max_cents, q.balance_cents);

  return (
    <div className="space-y-2" data-tour="withdraw">
      <p className="re-label">Withdraw to your bank</p>
      <div className="re-card space-y-3">
        <p className="text-[13px] text-white/70">
          Spendable balance <b className="text-white">{usd(q.balance_cents)} {MONEY}</b>
          <span className="text-white/40"> · withdrawals {usd(q.min_cents)}–{usd(q.max_cents)}</span>
        </p>

        {!q.connected ? (
          <button className="re-btn re-btn-cyan !w-auto px-4" disabled={!!busy} onClick={connect}>
            {busy === "connect" ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />} Connect a payout account
          </button>
        ) : !q.payouts_enabled ? (
          <div className="flex flex-wrap gap-2">
            <button className="re-btn !w-auto px-4" disabled={!!busy} onClick={connect}>
              <ExternalLink size={14} /> Finish setup
            </button>
            <button className="re-btn !w-auto px-4" disabled={!!busy} onClick={refresh}>
              <RefreshCw size={14} className={busy === "refresh" ? "animate-spin" : ""} /> Check approval
            </button>
          </div>
        ) : null}
        <p className="text-[11px] text-white/40">
          Your bank details go to the payout provider, never to Music ConnectZ.
        </p>

        {q.connected && q.payouts_enabled && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[13px] text-white/60">
              Amount $
              <input value={amount} inputMode="decimal" placeholder={(q.balance_cents / 100).toFixed(2)}
                     onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                     className="w-28 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-white" />
              <span className="text-white/35">blank = everything</span>
            </label>
            <p className="flex flex-wrap items-center gap-3 text-[13px] font-bold">
              <span className="text-mcz-ember">−{usd(cents)} {MONEY}</span>
              {fee > 0 && <span className="text-white/50">fee {usd(fee)}</span>}
              <span className="text-emerald-300">+{usd(cents - fee)} to your bank</span>
            </p>
            <button className="re-btn re-btn-emerald !w-auto px-4" disabled={!!busy || !q.can_withdraw || !inRange} onClick={withdraw}>
              {busy === "send" ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />} Withdraw {usd(cents - fee)}
            </button>
            <p className="text-[11px] text-white/40">If the transfer is refused, the full amount comes straight back to your balance.</p>
          </div>
        )}

        {q.why_not?.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-5 text-[12px] text-white/55">
            {q.why_not.map((r) => <li key={r}>{r}</li>)}
          </ul>
        )}
        {msg && <p className="text-[13px] text-emerald-300">{msg}</p>}
        {err && <p className="text-[13px] text-mcz-ember">{err}</p>}
      </div>

      {data.payouts?.length > 0 && (
        <ul className="space-y-1.5">
          {data.payouts.map((p) => {
            const [label, cls] = STATUS[p.status] || [p.status, "text-white/60"];
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                <span className="min-w-0 text-[12px]">
                  <span className={`block ${cls}`}>{label}</span>
                  <span className="block text-[10px] text-white/35">
                    {new Date(p.created_at).toLocaleDateString()}{p.failure_reason ? ` · ${p.failure_reason}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] font-bold text-white/80">{usd(p.net_cents)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
