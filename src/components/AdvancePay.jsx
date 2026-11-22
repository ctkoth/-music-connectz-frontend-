// Pay an advance on a CollabZ deal: part of YOUR held share goes to a collaborator now, out of escrow. Real money
// and not reversible, so the cost and the gain are on the button before it is pressed, and the server's note says what
// it changes (they receive that much less at release; a refund returns only what is still held). Who may be paid and
// the most for each is the server's (`deal.advance`) — nothing is worked out here.
import { useState } from "react";
import { MONEY } from "../resources.js";

const usd = (c) => `$${((c || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdvancePay({ deal, onAction, busy }) {
  const adv = deal.advance;
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("50");
  if (!adv || !Array.isArray(adv.to) || !adv.to.length) return null;
  const pick = adv.to.find((p) => p.username === (to || adv.to[0].username));
  const cents = Math.round(Number(amount) * 100);
  const ok = pick && cents > 0 && cents <= pick.max_cents;
  const go = () => {
    if (!ok) return;
    if (!window.confirm(`Pay @${pick.username} ${usd(cents)} now? It leaves your held share and can't be taken back.`)) return;
    onAction(deal.id, "advance", { to: pick.username, amount });
  };
  return (
    <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
      <p className="font-semibold text-violet-200">💵 Pay an advance</p>
      <div className="flex flex-wrap items-center gap-2">
        <select data-nomemo="true" aria-label="Pay who" className="neon-input !w-36 !py-1.5" value={pick?.username || ""} onChange={(e) => setTo(e.target.value)}>
          {adv.to.map((p) => <option key={p.username} value={p.username}>@{p.username}</option>)}
        </select>
        <input aria-label="Advance in dollars" type="number" min="0" step="any" className="neon-input !w-28 !py-1.5" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button className="neon-btn-primary !w-auto px-3 py-1.5" disabled={busy || !ok} onClick={go}>Pay advance</button>
      </div>
      <p>
        <span className="text-mcz-ember">−{ok ? usd(cents) : "$0.00"} {MONEY} from your held share</span>{" "}
        <span className="text-emerald-300">+{ok ? usd(cents) : "$0.00"} {MONEY} to @{pick?.username} now</span>
        {pick && <span className="text-white/50"> · most you can advance: {usd(pick.max_cents)}</span>}
      </p>
      <p className="text-white/50">{adv.note}</p>
    </div>
  );
}
