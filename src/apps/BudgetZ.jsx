// BudgetZ — money in, money out, a limit per category, what is left.
//
// Free at every tier and typed by hand. StatZ adds the bank (Stripe Financial Connections): you sign
// in inside Stripe's window and transactions arrive on their own. The tier buys the convenience,
// never the budget. It adds up what was entered or imported and decides nothing — no score, no advice.
// The server's `link_note` says who may link before anything is pressed; the screen never works out a tier.
import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { api } from "../api.js";

const usd = (c) => `${c < 0 ? "−" : ""}$${(Math.abs(c || 0) / 100).toFixed(2)}`;
const thisMonth = () => new Date().toISOString().slice(0, 7);

function loadStripeJs() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js.stripe.com/v3/";
    s.onload = () => resolve(window.Stripe);
    s.onerror = () => reject(new Error("Couldn't load Stripe."));
    document.head.appendChild(s);
  });
}

export default function BudgetZ() {
  const [month, setMonth] = useState(thisMonth());
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ kind: "expense", amount: "", category: "Food", note: "" });

  const load = useCallback(() => api(`/api/economy/budgetz/?month=${month}`)
    .then((r) => { setD(r); setErr(""); }).catch((e) => setErr(e.message || "Couldn't load.")), [month]);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api("/api/economy/budgetz/", { method: "POST", body: { ...form, on: `${month}-${month === thisMonth() ? new Date().toISOString().slice(8, 10) : "01"}` } });
      setD(r); setForm((f) => ({ ...f, amount: "", note: "" })); setErr("");
    } catch (e2) { setErr(e2.message || "Couldn't add that."); } finally { setBusy(false); }
  };
  const del = async (id) => { try { await api(`/api/economy/budgetz/line/${id}/`, { method: "DELETE" }); load(); } catch (e) { setErr(e.message); } };
  const setLimit = async (category) => {
    const v = window.prompt(`Monthly limit for ${category} in dollars (blank clears it)`);
    if (v === null) return;
    try { setD(await api(`/api/economy/budgetz/limit/?month=${month}`, { method: "PUT", body: { category, amount: v } })); }
    catch (e) { setErr(e.message); }
  };

  const link = async () => {
    setBusy(true);
    try {
      const s = await api("/api/economy/budgetz/bank/session/", { method: "POST", body: {} });
      const Stripe = await loadStripeJs();
      const res = await Stripe(s.publishable_key).collectFinancialConnectionsAccounts({ clientSecret: s.client_secret });
      if (res.error) throw new Error(res.error.message);
      const accounts = (res.financialConnectionsSession?.accounts || []).map((a) => ({ id: a.id, label: a.display_name || a.institution_name }));
      await api("/api/economy/budgetz/bank/link/", { method: "POST", body: { accounts } });
      const r = await api("/api/economy/budgetz/bank/sync/", { method: "POST", body: {} });
      setD(r); setErr(r.added ? "" : "Linked. Nothing new to import yet.");
    } catch (e) { setErr(e.message || "Couldn't link the bank."); } finally { setBusy(false); }
  };
  const sync = async () => {
    setBusy(true);
    try { const r = await api("/api/economy/budgetz/bank/sync/", { method: "POST", body: {} }); setD(r); setErr(`Imported ${r.added} new.`); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (!d) return err ? <p className="text-[12px] text-mcz-ember">{err}</p> : <Loader2 className="animate-spin text-white/50" size={18} />;
  const cats = d.categories.map((c) => c.category);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-white">BudgetZ <span className="text-white/50">(planner for finances)</span></h2>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="neon-input !w-auto" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="re-card"><p className="text-[11px] text-white/50">In</p><p className="font-bold text-emerald-300">{usd(d.income_cents)}</p></div>
        <div className="re-card"><p className="text-[11px] text-white/50">Out</p><p className="font-bold text-mcz-ember">{usd(d.spent_cents)}</p></div>
        <div className="re-card"><p className="text-[11px] text-white/50">Left</p><p className={`font-bold ${d.left_cents < 0 ? "text-mcz-ember" : "text-white"}`}>{usd(d.left_cents)}</p></div>
      </div>

      <form onSubmit={add} className="re-card flex flex-wrap items-end gap-2">
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="neon-input !w-auto" data-nomemo="true">
          <option value="expense">Money out</option><option value="income">Money in</option>
        </select>
        <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} inputMode="decimal" placeholder="$ amount" className="neon-input !w-28" />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="neon-input !w-auto" data-nomemo="true">
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="note (optional)" maxLength={120} className="neon-input flex-1" />
        <button disabled={busy || !form.amount} className="pill">Add</button>
      </form>
      {err && <p className="text-[12px] text-mcz-ember">{err}</p>}

      <div className="space-y-1.5">
        {d.categories.filter((c) => c.limit_cents != null || c.spent_cents > 0).map((c) => (
          <button key={c.category} type="button" onClick={() => setLimit(c.category)} className="re-card flex w-full items-center justify-between text-left">
            <span className="text-sm text-white">{c.category}</span>
            <span className={`text-[12px] ${c.over ? "text-mcz-ember" : "text-white/60"}`}>
              {usd(c.spent_cents)}{c.limit_cents != null ? ` of ${usd(c.limit_cents)}` : " · set a limit"}
            </span>
          </button>
        ))}
      </div>

      <div className="re-card space-y-2">
        <p className="text-sm font-semibold text-white">Bank</p>
        <p className="text-[12px] text-white/60">{d.link_note}</p>
        {d.banks.map((b) => <p key={b.id} className="text-[12px] text-white/70">🏦 {b.label || "Linked account"}</p>)}
        {d.can_link && (
          <div className="flex gap-2">
            <button className="pill" disabled={busy} onClick={link}>Link a bank</button>
            {!!d.banks.length && <button className="pill" disabled={busy} onClick={sync}>Import new</button>}
          </div>
        )}
        {!!d.banks.length && <p className="text-[11px] text-white/40">A bank line you delete comes back on the next import.</p>}
      </div>

      <div className="space-y-1">
        {d.lines.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-lg border border-white/5 px-2 py-1.5 text-[12px]">
            <span className="text-white/70">{l.on.slice(5)} · {l.category}{l.note ? ` · ${l.note}` : ""}{l.source === "bank" ? " 🏦" : ""}</span>
            <span className="flex items-center gap-2">
              <span className={l.kind === "income" ? "text-emerald-300" : "text-mcz-ember"}>{l.kind === "income" ? "+" : "−"}{usd(l.amount_cents)}</span>
              <button type="button" aria-label="Delete" onClick={() => del(l.id)}><Trash2 size={13} className="text-white/40" /></button>
            </span>
          </div>
        ))}
        {!d.lines.length && <p className="text-[12px] text-white/40">Nothing this month yet.</p>}
      </div>
    </div>
  );
}
