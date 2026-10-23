import AiEnergy from "./AiEnergy.jsx";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../api.js";
import { PROMPTZ, MONEY } from "../resources.js";
import { IN_SHELL } from "../standalone.js";
import { goToSpot } from "../goto.js";
import { marketsLine, payParts, safeHref } from "../coachUpgrades.js";

// Longer than the server's own 100s budget, so the server decides (api.js rule).
const WAIT_MS = 130_000;

/** Optional gear and settings advice for one scored take. Price BESIDE the
 *  button before it is pressed; everything else (markets, links, citations,
 *  references) is rendered exactly as the server built it. */
export default function CoachUpgrades({ appKey, price, takeScoreId }) {
  const q = price?.upgrades;
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [markets, setMarkets] = useState(null);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    let live = true;
    api("/api/economy/coach/markets/").then((m) => live && setMarkets(m)).catch(() => {});
    return () => { live = false; };
  }, []);

  if (!q || !takeScoreId) return null;
  const pay = payParts(q);

  const run = async () => {
    setBusy(true); setErr("");
    try {
      setRes(await api(`/api/${appKey}/coach/upgrades/`, { method: "POST", body: { take_score_id: takeScoreId }, timeoutMs: WAIT_MS }));
    } catch (e) {
      setErr(e?.message || "The gear advice couldn't be completed. Nothing was charged.");
    } finally { setBusy(false); }
  };

  const toggle = async (m, on) => {
    const cur = markets?.markets || [];
    const next = on ? [...cur.filter((x) => x.store !== m.store), m] : cur.filter((x) => x.store !== m.store);
    try { setMarkets(await api("/api/economy/coach/markets/", { method: "PATCH", body: { markets: next } })); setSaveMsg(""); }
    catch (e) { setSaveMsg(e?.message || "Couldn't save that."); }
  };

  return (
    <div data-tour="coach-upgrades" className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[12px] font-semibold text-white/80">🎛️ Gear and settings for this take</p>
      <p className="text-[11px] leading-relaxed text-white/55">{q.explain}</p>
      <p className="text-[11px] text-white/55">{marketsLine(q.markets)}</p>
      {markets?.can_choose ? (
        <div className="space-y-1">
          {Object.entries(markets.options || {}).map(([store, doms]) => (
            <label key={store} className="flex items-center gap-2 text-[11px] text-white/60">
              <span className="w-14 capitalize">{store}</span>
              <select aria-label={`${store} site for gear links`} className="neon-input !py-0.5 text-[11px]"
                value={(markets.markets.find((m) => m.store === store) || {}).domain || ""}
                onChange={(e) => toggle({ store, domain: e.target.value }, !!e.target.value)}>
                <option value="">Off</option>
                {doms.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          ))}
          <p className="text-[11px] text-white/40">
            Pick a country site and the gear links search that store there; Off leaves that store out. Saved as soon as you choose.
          </p>
          {saveMsg && <p className="text-[11px] text-mcz-ember">{saveMsg}</p>}
        </div>
      ) : (
        <p className="text-[11px] text-white/40">
          Which stores the links go to is a StatZ setting.
          {!IN_SHELL && (
            <> <button className="underline" onClick={() => goToSpot("membershipz", "tiers")}>See StatZ</button></>
          )}
        </p>
      )}

      {!res && (
        <div className="flex flex-wrap items-center gap-2">
          <button className="neon-btn" disabled={busy || !q.configured || !pay?.affordable} onClick={run}>
            {busy ? <Loader2 className="inline h-4 w-4 animate-spin" /> : "Get gear advice"}
          </button>
          {pay && (
            <span className="text-[11px] text-mcz-ember">
              −{pay.cost} {PROMPTZ} <AiEnergy />
              {pay.cash > 0 && <> ({pay.promptz} {PROMPTZ} + {pay.cash}¢ {MONEY})</>}
              <span className="text-white/40"> — a failed run isn't charged. A free daily prompt doesn't cover this one.</span>
            </span>
          )}
          {!q.configured && <span className="text-[11px] text-white/40">Not switched on yet.</span>}
        </div>
      )}
      {err && <p role="alert" className="text-[11px] text-mcz-ember">{err}</p>}

      {res && (
        <div className="space-y-3">
          <p className="text-[11px] text-emerald-300">
            {res.already_paid ? "Already paid for — no charge." : <span className="text-mcz-ember">−{res.charged} {PROMPTZ} spent</span>}
          </p>
          {res.summary && <p className="text-[12px] leading-relaxed text-white/75">{res.summary}</p>}
          {res.items?.map((it, i) => (
            <div key={i} className="space-y-1">
              <p className="text-[12px] font-semibold text-white/85">{it.heading}</p>
              <p className="text-[12px] leading-relaxed text-white/70">
                {it.advice} {it.citations?.length > 0 && <span className="text-white/45">{it.citations.join(" ")}</span>}
              </p>
              {it.settings?.length > 0 && (
                <ul className="text-[11px] text-white/55">{it.settings.map((s, j) => <li key={j}>· {s}</li>)}</ul>
              )}
              <p className="text-[11px] text-white/40">
                Why: {it.why_anchor === "general" || it.general_practice ? "general practice" : it.why}
                {it.why_anchor !== "general" && it.why && it.general_practice ? ` (${it.why})` : ""}
                {it.note && ` — ${it.note}`}
              </p>
              {it.products?.map((p, j) => (
                <p key={j} className="text-[11px] text-white/60">
                  {p.name}:{" "}
                  {p.links.map((l) => (
                    <a key={l.url} className="mr-2 underline" href={safeHref(l.url)} target="_blank" rel="noopener noreferrer">{l.label}</a>
                  ))}
                  {p.direct?.map((d) => (
                    <a key={d} className="mr-2 underline" href={safeHref(d)} target="_blank" rel="noopener noreferrer">product page</a>
                  ))}
                </p>
              ))}
            </div>
          ))}
          {res.references?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-white/70">📚 References</p>
              <ul className="space-y-1">
                {res.references.map((r) => (
                  <li key={r.url} className="pl-4 text-[11px] -indent-4 leading-relaxed text-white/50">
                    {r.author}. ({r.date}). <i>{r.title}</i>.{" "}
                    <a className="underline" href={safeHref(r.url)} target="_blank" rel="noopener noreferrer">{r.url}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
