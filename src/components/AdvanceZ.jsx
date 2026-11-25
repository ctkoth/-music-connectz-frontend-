// AdvanceZ — the record a label and an artist keep of an advance and what was recouped against it. It moves
// NOTHING: no money, no SpinaZ, no cut of anybody's royalties (the money is settled between the two, off the
// platform). The label writes a line, the artist confirms it, and only confirmed lines count. Every figure,
// the balance and the note come from the server; this screen adds nothing up.
import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";

const usd = (c) => `$${((c || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdvanceZ({ contractId }) {
  const [d, setD] = useState(null);
  const [form, setForm] = useState({ kind: "advance", amount: "", note: "" });
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const load = useCallback(() => api(`/api/economy/labelz/contracts/${contractId}/advances/`).then(setD).catch(() => setD(null)), [contractId]);
  useEffect(() => { if (open) load(); }, [open, load]);

  const act = async (fn) => { setMsg(""); try { setD(await fn()); } catch (e) { setMsg(e.message); } };
  const add = () => act(async () => { const r = await api(`/api/economy/labelz/contracts/${contractId}/advances/`, { method: "POST", body: form }); setForm({ ...form, amount: "", note: "" }); return r; });
  const confirm = (id) => act(() => api(`/api/economy/labelz/advances/${id}/confirm/`, { method: "POST", body: {} }));
  const withdraw = (id) => act(() => api(`/api/economy/labelz/advances/${id}/`, { method: "DELETE" }));

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <button className="text-sm font-semibold text-violet-200" onClick={() => setOpen(!open)} aria-expanded={open}>💵 AdvanceZ {open ? "▾" : "▸"}</button>
      {open && d && (
        <div className="mt-2 space-y-2 text-xs">
          <p className="text-white/60">{d.note}</p>
          {d.promised_cents != null && <p className="text-white/70">The terms promise an advance of <b>{usd(d.promised_cents)}</b>.</p>}
          <p className="text-white/85">
            Advanced <b>{usd(d.advanced_cents)}</b> · recouped <b>{usd(d.recouped_cents)}</b> · outstanding <b className="text-emerald-300">{usd(d.outstanding_cents)}</b>
            {d.waiting_cents > 0 && <span className="text-mcz-gold"> · {usd(d.waiting_cents)} waiting for the artist to confirm</span>}
          </p>
          <ul className="divide-y divide-white/10">
            {d.lines.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2 py-1.5">
                <span className="text-white/70">{l.on} · {l.kind === "advance" ? "Advance" : "Recouped"} {usd(l.amount_cents)}{l.note ? ` · ${l.note}` : ""}</span>
                {l.confirmed ? <span className="pill text-[10px]">confirmed</span> : <span className="pill text-[10px] !text-mcz-gold">not confirmed</span>}
                {!l.confirmed && !d.i_own && <button className="neon-btn-primary !w-auto px-3 py-1 text-[11px]" onClick={() => confirm(l.id)}>Confirm it's right</button>}
                {!l.confirmed && d.i_own && <button className="text-white/55 underline" onClick={() => withdraw(l.id)}>Withdraw</button>}
              </li>
            ))}
            {!d.lines.length && <li className="py-1.5 text-white/50">Nothing recorded yet.</li>}
          </ul>
          {d.i_own && (
            <div className="flex flex-wrap items-center gap-2">
              <select data-nomemo="true" aria-label="Line type" className="neon-input !w-32 !py-1.5" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="advance">Advance</option><option value="recoup">Recouped</option>
              </select>
              <input aria-label="Amount in dollars" type="number" min="0" step="any" className="neon-input !w-28 !py-1.5" placeholder="$ amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <input aria-label="Note" className="neon-input !w-48 !py-1.5" placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              <button className="neon-btn-primary !w-auto px-3 py-1.5" disabled={!form.amount} onClick={add}>Record</button>
              <span className="text-white/50">Costs nothing · moves nothing · artist confirms</span>
            </div>
          )}
          {msg && <p className="text-mcz-gold">{msg}</p>}
        </div>
      )}
    </div>
  );
}
