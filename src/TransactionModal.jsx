import { useEffect, useState } from "react";
import { X, Loader2, RefreshCw } from "lucide-react";
import { api } from "./api.js";
import { asList } from "./shape.js";
import { useTransactionModal } from "./TransactionModalContext.jsx";
import { IconImg } from "./App.jsx";

// Map resource keys to icon filenames
const RESOURCE_ICONS = {
  "money": "money.png",
  "spinaz": "spinaz.png",
  "energy": "energy.png",
  "promptz": "promptz.png",
  "xp": "xp.png",
};

const when = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function TransactionModal() {
  const { resource, closeTransactions } = useTransactionModal();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!resource) return;
    setBusy(true);
    api(`/api/economy/logz/?resource=${resource.key}`)
      .then((d) => { setData(d); setErr(""); })
      .catch((e) => setErr(e.message || "Couldn't load transactions."))
      .finally(() => setBusy(false));
  }, [resource]);

  if (!resource) return null;

  const entries = asList(data?.entries);
  const totals = asList(data?.totals).filter((t) => t.amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl neon-frame">
        <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-slate-900/95 p-4 backdrop-blur">
          <div className="flex items-center gap-3 flex-1">
            {RESOURCE_ICONS[resource.key] ? (
              <IconImg icon={RESOURCE_ICONS[resource.key]} alt="" className="h-8 w-8 rounded" />
            ) : (
              <span className="text-2xl">{resource.emoji}</span>
            )}
            <div>
              <h2 className="font-display text-lg font-extrabold">{resource.label}</h2>
              <p className="text-xs text-white/45">Transaction history</p>
            </div>
          </div>
          <button
            onClick={closeTransactions}
            className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {err && (
            <p className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[12px] text-mcz-ember">{err}</p>
          )}

          {!data && !err && (
            <p className="flex items-center gap-2 text-white/50 py-4">
              <Loader2 className="animate-spin" size={16} /> Loading transactions…
            </p>
          )}

          {totals.length > 0 && (
            <div className="rounded-lg bg-white/5 p-3 border border-white/10">
              <p className="text-xs text-white/50 mb-2">Net movement</p>
              <div className="flex flex-wrap gap-2">
                {totals.map((t) => (
                  <span key={t.resource} className="text-sm font-bold">
                    <span className={t.amount > 0 ? "text-emerald-300" : "text-mcz-ember"}>
                      {t.amount > 0 ? "+" : ""}
                      {resource.key === "money" ? (t.amount / 100).toFixed(2) : t.amount.toLocaleString()}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="neon-frame divide-y divide-white/[0.06]">
            {entries.length === 0 ? (
              <p className="flex items-center gap-2 p-4 text-sm text-white/45">
                No transactions yet.
              </p>
            ) : (
              entries.map((entry, i) => (
                <div key={i} className="p-3 hover:bg-white/[0.03] transition">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1">
                      <p className="text-sm text-white">{entry.kind}</p>
                      <p className="text-xs text-white/40 mt-0.5">{when(entry.at)}</p>
                    </div>
                    <span className={`font-bold whitespace-nowrap ${entry.amount > 0 ? "text-emerald-300" : "text-mcz-ember"}`}>
                      {entry.display}
                    </span>
                  </div>
                  {entry.note && (
                    <p className="text-xs text-white/35 mt-2 pl-2 border-l border-white/10">{entry.note}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
