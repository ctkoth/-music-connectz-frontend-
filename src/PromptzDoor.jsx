// The two doors into PromptZ, each with its cost and gain on the button:
// earned 🍥 (no card needed) and cash. Both rates are the server's.
import { useEffect, useState } from "react";
import { api } from "./api.js";
import { MONEY, PROMPTZ, SPINAZ } from "./resources.js";

export default function PromptzDoor() {
  const [conv, setConv] = useState(null);
  const [buy, setBuy] = useState(null);
  const [spin, setSpin] = useState("");
  const [dollars, setDollars] = useState("");
  const [msg, setMsg] = useState("");
  const load = () => {
    api("/api/economy/promptz/convert/").then(setConv).catch(() => setConv(null));
    api("/api/economy/promptz/buy/").then(setBuy).catch(() => setBuy(null));
  };
  useEffect(load, []);
  if (!conv && !buy) return null;

  const per = conv?.spinaz_per_promptz || 0;
  const spinN = Math.max(0, Math.floor(Number(spin) || 0));
  const convGets = per ? Math.floor(spinN / per) : 0;
  const cents = Math.max(0, Math.round((Number(dollars) || 0) * 100));
  const buyGets = buy ? Math.round(cents * buy.promptz_per_cent) : 0;

  async function go(path, body, done) {
    try { const r = await api(path, { method: "POST", body }); setMsg(done(r)); load(); }
    catch (e) { setMsg(e.message || "That didn't go through — nothing was charged."); }
  }

  return (
    <div className="re-card space-y-3">
      <p className="text-sm font-semibold text-white">Get PromptZ {PROMPTZ}</p>
      {conv && (
        <div className="space-y-1">
          <p className="text-[11px] text-white/50">{conv.note} You have {conv.spinaz} {SPINAZ}.</p>
          <div className="flex flex-wrap items-center gap-2">
            <input className="neon-input !py-2 w-28 text-sm" type="number" min={per} step={per} inputMode="numeric"
                   placeholder={`${SPINAZ} to convert`} value={spin} onChange={(e) => setSpin(e.target.value)} />
            <button className="neon-btn-primary !w-auto px-3 py-2 text-xs disabled:opacity-40"
                    disabled={!convGets || convGets * per > conv.spinaz}
                    onClick={() => go("/api/economy/promptz/convert/", { spinaz: convGets * per },
                                      (r) => `Converted — +${convGets} ${PROMPTZ}.`)}>
              Convert <span className="text-mcz-ember">−{convGets * per} {SPINAZ}</span>{" "}
              <span className="text-emerald-300">+{convGets} {PROMPTZ}</span>
            </button>
          </div>
        </div>
      )}
      {buy && (
        <div className="space-y-1 border-t border-white/10 pt-2">
          <p className="text-[11px] text-white/50">Or buy with your balance (${((buy.money_cents || 0) / 100).toFixed(2)}).</p>
          <div className="flex flex-wrap items-center gap-2">
            <input className="neon-input !py-2 w-24 text-sm" type="number" min="0.5" step="0.5" inputMode="decimal"
                   placeholder="$ amount" value={dollars} onChange={(e) => setDollars(e.target.value)} />
            <button className="neon-btn-primary !w-auto px-3 py-2 text-xs disabled:opacity-40"
                    disabled={!cents || cents > (buy.money_cents || 0)}
                    onClick={() => go("/api/economy/promptz/buy/", { cents }, (r) => `Bought — +${r.granted} ${PROMPTZ}.`)}>
              Buy <span className="text-mcz-ember">−{MONEY}{(cents / 100).toFixed(2)}</span>{" "}
              <span className="text-emerald-300">+{buyGets} {PROMPTZ}</span>
            </button>
          </div>
        </div>
      )}
      <p className="text-[10px] text-white/35">A refused or failed conversion charges nothing.</p>
      {msg && <p className="text-[11px] text-mcz-cyan">{msg}</p>}
    </div>
  );
}
