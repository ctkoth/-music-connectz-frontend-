import { ChevronRight, ShieldCheck, CircleCheck } from "lucide-react";

// A deal as one compact card: cover art, status, title, who it is with, where the money stands and how
// the credit splits. Everything here is the server's (`status`, `participants`, `credit_split`); the card
// only words it. "View Deal" opens the full deal (every action it ever had) under the card.
const GROUP = (s) => (s === "draft" ? "draft" : ["released", "refunded", "cancelled"].includes(s) ? "completed" : "active");
export const dealGroup = GROUP;

const STATE = {
  draft: ["Draft", "Not funded yet", false],
  funded: ["Active", "Funds Secured", true],
  delivered: ["Active", "Funds Secured", true],
  disputed: ["Active", "In dispute", false],
  released: ["Completed", "Funds Released", true],
  refunded: ["Completed", "Refunded", false],
  cancelled: ["Completed", "Cancelled", false],
};

function Cover({ deal }) {
  const url = deal.image_url || deal.items?.find((i) => i.type === "image")?.url;
  if (url) return <img src={url} alt="" className="h-full w-full object-cover" />;
  // No art yet: the title itself, in the brand's gradient, so a card is never a grey box.
  return (
    <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900 via-fuchsia-900 to-slate-900 p-2 text-center text-[11px] font-bold uppercase tracking-[0.25em] text-white/90">
      {deal.title || "Deal"}
    </span>
  );
}

export default function DealCard({ deal, me, open, onToggle }) {
  const [label, escrow, good] = STATE[deal.status] || [deal.status, deal.status, false];
  const done = GROUP(deal.status) === "completed";
  const others = deal.participants.map((p) => p.username).filter((u) => u !== me);
  const split = deal.credit_split || [];
  const nameOf = (u) => (u === me ? "You" : u);
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex gap-3 p-3">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-white/10"><Cover deal={deal} /></div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-violet-300">
            <span className={`inline-block h-2 w-2 rounded-full ${done ? "bg-emerald-400" : "bg-violet-400"}`} />
            {label}{deal.status === "funded" || deal.status === "delivered" ? " · Escrow Secured" : done && deal.status === "released" ? " · Released" : ""}
          </p>
          <h3 className="truncate text-[19px] font-bold text-white">{deal.title || "Untitled deal"}</h3>
          {others.length > 0 && <p className="truncate text-[13px] text-white/65">with {others.join(" & ")}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-white/10 px-3 py-2.5 text-[12px]">
        <div>
          <p className="text-white/55">Escrow Status</p>
          <p className={`mt-1 flex items-center gap-1.5 text-[14px] font-semibold ${good ? "text-emerald-300" : "text-violet-300"}`}>
            {done && good ? <CircleCheck size={18} /> : <ShieldCheck size={18} />}{escrow}
          </p>
        </div>
        {split.length > 0 && (
          <div className="min-w-0 border-l border-white/10 pl-3">
            <p className="text-white/55">Credit Split</p>
            <p className="mt-1 text-[14px] font-semibold text-white">{split.map((s) => `${s.pct}%`).join(" · ")}</p>
            <p className="truncate text-[11px] text-white/60">{split.map((s) => nameOf(s.username)).join(" · ")}</p>
          </div>
        )}
      </div>
      <button onClick={onToggle} aria-expanded={open}
        className="flex w-full items-center gap-1 border-t border-white/10 px-3 py-2.5 text-[14px] font-semibold text-violet-300 hover:bg-white/5">
        {open ? "Hide Deal" : "View Deal"} <ChevronRight size={16} className={open ? "rotate-90" : ""} />
      </button>
    </article>
  );
}
