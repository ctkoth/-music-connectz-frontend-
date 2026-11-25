import { useEffect, useState } from "react";
import { api } from "../api.js";
import { usd } from "../shopSplit.js";

// Every member's design shop. The split under each item is the server's, worked out at the viewer's own plan rate.
// Checkout is closed until a printer is connected, and the button says so rather than appearing to work.
export default function ShopList({ refresh = 0 }) {
  const [data, setData] = useState(null);
  const [mine, setMine] = useState(false);
  const [err, setErr] = useState("");
  const load = () => api(`/api/economy/merch/shop/${mine ? "?mine=1" : ""}`).then((d) => { setData(d); setErr(""); })
    .catch((e) => setErr(e.message || "Couldn't load the shops."));
  useEffect(() => { load(); }, [mine, refresh]);   // eslint-disable-line react-hooks/exhaustive-deps
  const takeOut = async (id) => {
    if (!window.confirm("Take this design out of your shop?")) return;
    try { await api(`/api/economy/merch/shop/${id}/`, { method: "DELETE" }); load(); } catch (e) { setErr(e.message); }
  };
  if (err) return <p role="alert" className="text-sm text-mcz-ember">{err}</p>;
  if (!data) return null;
  return (
    <div className="re-card space-y-3" data-tour="merchz-shops">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">🛍️ Design shops</h2>
        <div className="flex gap-1.5">
          <button type="button" className={`pill ${!mine ? "!border-mcz-cyan !text-mcz-cyan" : ""}`} onClick={() => setMine(false)}>Everyone's</button>
          <button type="button" className={`pill ${mine ? "!border-mcz-cyan !text-mcz-cyan" : ""}`} onClick={() => setMine(true)}>My shop</button>
        </div>
      </div>
      <p className="text-xs text-white/60">{data.split_rule} {data.estimate_note}</p>
      {!data.designs.length ? <p className="text-sm text-white/60">{mine ? "Nothing in your shop yet — design something above and put it in." : "No designs in shops yet."}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.designs.map((d) => (
          <div key={d.id} className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-2">
            {d.image ? <img src={d.image} alt={d.title} className="w-full rounded-lg" loading="lazy" /> : null}
            <p className="font-semibold">{d.title}</p>
            <p className="text-xs text-white/60">{d.product_label} by @{d.designer}</p>
            <p className="text-xs text-white/70">
              Printer {usd(d.split.printer)} · dev tax {usd(d.split.dev_tax)} · designer <span className="text-emerald-300">+{usd(d.split.designer)}</span>
            </p>
            {d.mine && d.designer_keeps ? <p className="text-xs text-emerald-300">You keep +{usd(d.designer_keeps.min)}–{usd(d.designer_keeps.max)} 💵 a sale, depending on the buyer's plan.</p> : null}
            {d.mine
              ? <button type="button" className="pill text-xs" onClick={() => takeOut(d.id)}>Take out of my shop</button>
              : <button type="button" className="re-btn !w-auto px-3" disabled title={data.closed_note}><span className="text-mcz-ember">−{usd(d.split.price)} 💵</span> Buy · not open yet</button>}
          </div>
        ))}
      </div>
      {!data.checkout_open ? <p className="text-xs text-mcz-gold">{data.closed_note}</p> : null}
    </div>
  );
}
