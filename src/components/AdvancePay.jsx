// Pay an advance on a CollabZ deal: part of YOUR held share goes to a collaborator now, out of escrow. Real money
// and not reversible, so the cost and the gain are on the button before it is pressed, and the server's note says what
// it changes (they receive that much less at release; a refund returns only what is still held). Who may be paid and
// the most for each is the server's (`deal.advance`) — nothing is worked out here.
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { MONEY } from "../resources.js";

const usd = (c) => `$${((c || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdvancePay({ deal, onAction, busy }) {
  const listed = deal.advance;                               // names and caps, from the list (no per-card queries)
  const [detail, setDetail] = useState(null);               // + skill prices and the label link, asked for per deal
  const has = !!(listed && Array.isArray(listed.to) && listed.to.length);
  useEffect(() => {
    if (!has) return undefined;
    let on = true;
    api(`/api/economy/collab/${deal.id}/advance/`).then((d) => on && setDetail(d)).catch(() => {});
    return () => { on = false; };
  }, [has, deal.id, deal.held_cents]);
  const adv = detail?.to?.length ? { ...listed, ...detail } : listed;
  const [to, setTo] = useState("");
  const [typed, setTyped] = useState(null);                  // null = nothing typed yet, so the suggestion shows
  const [inLabel, setInLabel] = useState(true);
  if (!adv || !Array.isArray(adv.to) || !adv.to.length) return null;
  const pick = adv.to.find((p) => p.username === (to || adv.to[0].username));
  // The amount opens on the price of the skills this person brings that the deal is looking for — their own rates,
  // from the server. No matching skill means no suggestion: blank, never an invented figure.
  const suggested = pick?.skill_price_cents ? String(pick.skill_price_cents / 100) : "";
  const amount = typed ?? suggested;
  const cents = Math.round(Number(amount) * 100);
  const ok = pick && cents > 0 && cents <= pick.max_cents;
  const go = () => {
    if (!ok) return;
    if (!window.confirm(`Pay @${pick.username} ${usd(cents)} now? It leaves your held share and can't be taken back.`)) return;
    onAction(deal.id, "advance", { to: pick.username, amount, record_in_labelz: !!(pick.label && inLabel) });
  };
  return (
    <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
      <p className="font-semibold text-violet-200">💵 Pay an advance</p>
      <div className="flex flex-wrap items-center gap-2">
        <select data-nomemo="true" aria-label="Pay who" className="neon-input !w-36 !py-1.5" value={pick?.username || ""} onChange={(e) => { setTo(e.target.value); setTyped(null); }}>
          {adv.to.map((p) => <option key={p.username} value={p.username}>@{p.username}</option>)}
        </select>
        <input aria-label="Advance in dollars" type="number" min="0" step="any" className="neon-input !w-28 !py-1.5" value={amount} placeholder="$ amount" onChange={(e) => setTyped(e.target.value)} />
        <button className="neon-btn-primary !w-auto px-3 py-1.5" disabled={busy || !ok} onClick={go}>Pay advance</button>
      </div>
      <p>
        <span className="text-mcz-ember">−{ok ? usd(cents) : "$0.00"} {MONEY} from your held share</span>{" "}
        <span className="text-emerald-300">+{ok ? usd(cents) : "$0.00"} {MONEY} to @{pick?.username} now</span>
        {pick && <span className="text-white/50"> · most you can advance: {usd(pick.max_cents)}</span>}
      </p>
      {pick?.skill_lines?.length > 0 && (
        <p className="text-white/60">
          Starts at the price of the skills @{pick.username} brings here: {pick.skill_lines.map((l) => `${l.skill} ${usd(l.cents)}/${l.unit}`).join(" + ")}.
        </p>
      )}
      {pick?.label && (
        <label className="flex items-start gap-2 text-white/70">
          <input type="checkbox" className="mt-0.5" checked={inLabel} onChange={(e) => setInLabel(e.target.checked)} />
          <span>Also put it on @{pick.username}'s {pick.label.label} AdvanceZ record — they confirm it there. Free.</span>
        </label>
      )}
      <p className="text-white/50">{adv.note}</p>
    </div>
  );
}
