import { useEffect, useMemo, useState } from "react";
import { Loader2, ShoppingBag, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import MemberName from "../MemberName.jsx";
import { MONEY } from "../resources.js";

// MercheZ — the creator marketplace: apparel, art, beats, sample packs,
// accessories, digital goods and routines. Legal goods only. The backend
// (/api/economy/merch/) has existed with no screen while ToolZ called this
// "coming soon".
//
// Cost/gain up front: the buy button IS the price. A seller is told the fee
// honestly — it is taken at the BUYER's tier rate, so their net depends on
// who buys, and the form states that range rather than inventing one figure.

const CATS = [["", "Everything"], ["apparel", "Apparel"], ["art", "Art"], ["beats", "Beats"], ["samples", "Sample packs"],
  ["accessories", "Accessories"], ["digital", "Digital"], ["routines", "Routines"]];
const usd = (c) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;

export default function MerchZ() {
  const [items, setItems] = useState(null);
  const [fees, setFees] = useState(null);
  const [money, setMoney] = useState(null);
  const [cat, setCat] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({ title: "", description: "", category: "apparel", price: "" });
  const [img, setImg] = useState(null);

  const load = () => {
    api("/api/economy/merch/").then((d) => setItems(d.items || [])).catch((e) => setErr(e.message));
    api("/api/economy/wallet/").then((w) => setMoney(w.money_cents)).catch(() => {});
  };
  useEffect(() => {
    load();
    api("/api/economy/tiers/", { auth: false })
      .then((d) => setFees((d.tiers || []).map((t) => t.platform_fee_pct).filter((x) => x != null))).catch(() => {});
  }, []);

  const shown = useMemo(() => (items || []).filter((i) => !cat || i.category === cat), [items, cat]);
  const priceCents = Math.round(parseFloat(form.price || "0") * 100);
  const lo = fees?.length ? Math.min(...fees) : null, hi = fees?.length ? Math.max(...fees) : null;

  async function buy(it) {
    setBusy(`buy${it.id}`); setErr(""); setMsg("");
    try {
      await api(`/api/economy/merch/${it.id}/buy/`, { method: "POST" });
      setMsg(`Bought “${it.title}”. ${usd(it.price_cents)} left your balance.`);
      window.dispatchEvent(new Event("mcz-stats-refresh")); load();
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  }

  async function sell(e) {
    e.preventDefault(); setBusy("sell"); setErr(""); setMsg("");
    try {
      const body = new FormData();
      body.append("title", form.title); body.append("description", form.description);
      body.append("category", form.category); body.append("price_cents", String(priceCents));
      if (img) body.append("image", img);
      await api("/api/economy/merch/", { method: "POST", body });
      setForm({ title: "", description: "", category: "apparel", price: "" }); setImg(null);
      setMsg("Listed."); load();
    } catch (x) { setErr(x.message); } finally { setBusy(""); }
  }

  async function unlist(it) {
    try { await api(`/api/economy/merch/${it.id}/`, { method: "DELETE" }); load(); } catch (x) { setErr(x.message); }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="merchz.png" alt="MercheZ" className="h-16 w-16 rounded-2xl object-cover shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">MercheZ</h2>
          <p className="text-sm text-white/60">Sell and buy from other creators — apparel, art, beats, packs, routines. Legal goods only.</p>
        </div>
      </header>
      {money != null && <p className="text-xs text-white/50">Your balance: {usd(money)} {MONEY}</p>}
      {msg && <p className="text-sm text-emerald-300">{msg}</p>}
      {err && <p className="text-sm text-mcz-ember">{err}</p>}

      <div className="flex flex-wrap gap-2">
        {CATS.map(([k, l]) => (
          <button key={k} onClick={() => setCat(k)}
            className={`rounded-full border px-3 py-1 text-sm ${cat === k ? "border-mcz-cyan bg-mcz-cyan/15" : "border-white/15 text-white/60"}`}>{l}</button>
        ))}
      </div>

      {!items && !err && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>}
      {items && shown.length === 0 && <p className="text-sm text-white/55">Nothing listed here yet — be the first, below.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((it) => (
          <div key={it.id} className="re-card space-y-2">
            {it.image_url
              ? <img src={it.image_url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              : <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-white/5"><ShoppingBag className="text-white/30" /></div>}
            <p className="font-semibold">{it.title}</p>
            {it.description && <p className="text-xs text-white/60">{it.description}</p>}
            <p className="text-[11px] text-white/45">{CATS.find(([k]) => k === it.category)?.[1] || it.category} · {it.sold} sold</p>
            <MemberName username={it.seller} />
            {it.mine ? (
              <button className="re-btn !w-auto px-3 py-1 text-xs" onClick={() => unlist(it)}><Trash2 size={12} /> Take it down</button>
            ) : (
              <button className="neon-btn-primary !w-auto px-4 py-1.5 text-sm" disabled={!!busy || it.bought || (money != null && money < it.price_cents)}
                onClick={() => buy(it)}>
                {busy === `buy${it.id}` ? <Loader2 className="animate-spin" size={14} />
                  : it.bought ? "Bought" : <span className="text-mcz-ember">−{usd(it.price_cents)} {MONEY}</span>} {!it.bought && "Buy"}
              </button>
            )}
            {!it.mine && !it.bought && money != null && money < it.price_cents && (
              <p className="text-[11px] text-white/45">Your balance is {usd(money)} — top up in your wallet first.</p>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={sell} className="neon-frame space-y-2 p-4">
        <h3 className="font-semibold">Sell something</h3>
        <input className="neon-input" required maxLength={120} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="neon-input" rows={2} maxLength={500} placeholder="What is it?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="flex flex-wrap gap-2">
          <select className="neon-input !w-auto" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATS.filter(([k]) => k).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input className="neon-input !w-32" required type="number" min="1" max="5000" step="0.01" placeholder="Price $" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <label className="re-btn !w-auto cursor-pointer px-3 text-xs">{img ? img.name.slice(0, 18) : "Add a photo"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setImg(e.target.files?.[0] || null)} />
          </label>
        </div>
        {priceCents > 0 && lo != null && (
          <p className="text-[11px] text-white/55">
            Listing is free. When it sells you get <span className="text-emerald-300">+{usd(Math.round(priceCents * (1 - hi / 100)))}–{usd(Math.round(priceCents * (1 - lo / 100)))} {MONEY}</span>:
            the platform fee ({lo}–{hi}%) is taken at the buyer's tier rate.
          </p>
        )}
        <button className="neon-btn-primary !w-auto px-5" disabled={busy === "sell"}>{busy === "sell" ? <Loader2 className="animate-spin" size={16} /> : null} List it</button>
      </form>
    </div>
  );
}
