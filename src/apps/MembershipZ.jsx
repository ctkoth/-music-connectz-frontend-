import { useEffect, useState } from "react";
import { Check, Crown, Loader2, Lock, Sparkles, Star, Zap } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";

const money = (cents) => `$${((cents || 0) / 100).toFixed(2).replace(/\.00$/, "")}`;

// Real tier perks, mirrored from the backend economy constants:
//   DEV_TAX 10/5/3% · ENERGY_TOPUP_MULT 1×/2×/4× · SUBMISSION_DAILY_CAP 5/15/50
//   PROMPT_ALLOWANCE 1/5/20 · SpecZ marketplace is StatZ-only.
const PERKS = [
  { label: "Platform fee on your sales", free: "10%", premium: "5%", statz: "3%" },
  { label: "Energy per $1 topped up", free: "1×", premium: "2×", statz: "4×" },
  { label: "Daily free AI prompts", free: "1", premium: "5", statz: "20" },
  { label: "Scored submissions / day", free: "5", premium: "15", statz: "50" },
  { label: "SpecZ marketplace", free: false, premium: false, statz: true },
];

function tierKey(t) {
  const s = (t || "").toLowerCase();
  if (s.includes("statz") || s.includes("stats")) return "statz";
  if (s.includes("premium") || s.includes("pro")) return "premium";
  return "free";
}

function Cell({ v }) {
  if (v === true) return <Check size={15} className="mx-auto text-emerald-400" />;
  if (v === false) return <span className="text-white/25">—</span>;
  return <span className="text-white/85">{v}</span>;
}

export default function MembershipZ() {
  const [me, setMe] = useState(null);
  const [founding, setFounding] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/api/auth/me/").then(setMe).catch(() => setMe({ tier: "free" }));
    api("/api/economy/founding/").then(setFounding).catch(() => setFounding(null));
    api("/api/economy/checkout/config/").then(setCfg).catch(() => setCfg({ stripe_enabled: false }));
    // Surface a checkout return (backend now redirects to /?checkout=…).
    const q = new URLSearchParams(window.location.search);
    if (q.get("checkout") === "success") setMsg("✅ Payment received — your StatZ upgrade activates as soon as the payment clears.");
    else if (q.get("checkout") === "cancel") setMsg("Checkout canceled — no charge was made.");
    if (q.has("checkout")) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const mine = tierKey(me?.tier);
  const stripeOn = !!cfg?.stripe_enabled;
  const seatsLeft = founding?.remaining ?? null;
  const soldOut = !!founding?.sold_out;

  async function checkout(endpoint, plan, key) {
    setMsg(""); setBusy(key);
    try {
      const r = await api(endpoint, { method: "POST", body: { plan } });
      if (r?.url) { window.location.href = r.url; return; }
      setMsg("Couldn't start checkout — please try again.");
    } catch (e) {
      const m = e?.message || "";
      if (/503|not configured/i.test(m)) setMsg("Card payments aren't switched on yet — check back soon.");
      else if (/409|sold out/i.test(m)) setMsg("The founding offer just sold out.");
      else setMsg("Couldn't start checkout — please try again.");
    }
    setBusy("");
  }
  const buyFounding = (plan) => checkout("/api/economy/founding/checkout/", plan, plan);
  const buyPremium = (plan) => checkout("/api/economy/premium/checkout/", plan, "prem_" + plan);

  if (!me) {
    return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading membership…</p>;
  }

  const TierBadge = ({ k, children }) => (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
      mine === k ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/50"
    }`}>{mine === k ? "Your tier" : children}</span>
  );

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="money.png" alt="MembershipZ" className="h-11 w-11 rounded-xl" />
        <div>
          <h2 className="font-display text-xl font-extrabold">MembershipZ</h2>
          <p className="text-xs text-white/45">Upgrade your tier for lower fees, more energy, more AI prompts &amp; the SpecZ marketplace.</p>
        </div>
      </header>

      {msg && <p className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-sm text-white/85">{msg}</p>}

      {/* Founding StatZ offer — the live headline deal. */}
      <div className="re-card space-y-3 border-mcz-ember/40">
        <div className="flex items-center justify-between">
          <span className="re-label flex items-center gap-2"><Crown size={14} className="text-mcz-ember" /> Founding StatZ · 50% off, forever</span>
          {seatsLeft != null && !soldOut && (
            <span className="text-xs font-bold text-mcz-ember">{seatsLeft} of {founding.limit} seats left</span>
          )}
        </div>
        <p className="text-xs text-white/60">
          The first {founding?.limit ?? 50} members lock in half price for life. Cancel any time within 10 days for a full refund.
        </p>
        {soldOut ? (
          <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-white/60">The founding offer is sold out — full StatZ pricing is coming soon.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            <button className="re-btn !w-auto flex-col !items-start gap-0 px-4 py-2" disabled={!!busy || mine === "statz"} onClick={() => buyFounding("month")}>
              <span className="text-sm font-bold">{busy === "month" ? "…" : `${money(founding?.month_cents)}/mo`}</span>
              <span className="text-[10px] font-normal opacity-70">was $15/mo</span>
            </button>
            <button className="re-btn !w-auto flex-col !items-start gap-0 px-4 py-2" disabled={!!busy || mine === "statz"} onClick={() => buyFounding("year")}>
              <span className="text-sm font-bold">{busy === "year" ? "…" : `${money(founding?.year_cents)}/yr`}</span>
              <span className="text-[10px] font-normal opacity-70">was $120/yr</span>
            </button>
            <button className="re-btn !w-auto flex-col !items-start gap-0 px-4 py-2" disabled={!!busy || mine === "statz"} onClick={() => buyFounding("lifetime")}>
              <span className="text-sm font-bold">{busy === "lifetime" ? "…" : `${money(founding?.price_cents)} once`}</span>
              <span className="text-[10px] font-normal opacity-70">lifetime · was {money(founding?.full_price_cents)}</span>
            </button>
          </div>
        )}
        {!stripeOn && <p className="text-[11px] text-white/45">Card payments are being switched on — buttons go live once Stripe is configured.</p>}
        {mine === "statz" && <p className="text-[11px] text-emerald-300">You're already on StatZ — thank you! 🎉</p>}
      </div>

      {/* Tier comparison */}
      <div className="re-card overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-white/45">
              <th className="py-2 font-medium">Perk</th>
              <th className="py-2 text-center font-medium"><div className="flex flex-col items-center gap-1"><Star size={14} /> Free <TierBadge k="free">Free</TierBadge></div></th>
              <th className="py-2 text-center font-medium"><div className="flex flex-col items-center gap-1"><Zap size={14} className="text-mcz-cyan" /> Premium <TierBadge k="premium">$6/mo</TierBadge></div></th>
              <th className="py-2 text-center font-medium"><div className="flex flex-col items-center gap-1"><Crown size={14} className="text-mcz-ember" /> StatZ <TierBadge k="statz">Founding</TierBadge></div></th>
            </tr>
          </thead>
          <tbody>
            {PERKS.map((p) => (
              <tr key={p.label} className="border-t border-white/[0.06]">
                <td className="py-2 text-white/70">{p.label}</td>
                <td className="py-2 text-center"><Cell v={p.free} /></td>
                <td className="py-2 text-center"><Cell v={p.premium} /></td>
                <td className="py-2 text-center"><Cell v={p.statz} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Premium — mid tier, buyable now. */}
      <div className="re-card space-y-3">
        <span className="re-label flex items-center gap-2"><Zap size={13} className="text-mcz-cyan" /> Premium</span>
        <p className="text-xs text-white/60">Half the platform fee, double energy per top-up, and 5 AI prompts a day.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button className="re-btn !w-auto flex-col !items-start gap-0 px-4 py-2" disabled={!!busy || mine !== "free"} onClick={() => buyPremium("month")}>
            <span className="text-sm font-bold">{busy === "prem_month" ? "…" : "$6/mo"}</span>
            <span className="text-[10px] font-normal opacity-70">billed monthly</span>
          </button>
          <button className="re-btn !w-auto flex-col !items-start gap-0 px-4 py-2" disabled={!!busy || mine !== "free"} onClick={() => buyPremium("year")}>
            <span className="text-sm font-bold">{busy === "prem_year" ? "…" : "$48/yr"}</span>
            <span className="text-[10px] font-normal opacity-70">2 months free</span>
          </button>
        </div>
        {mine === "premium" && <p className="text-[11px] text-emerald-300">You're on Premium. 🎉</p>}
        {mine === "statz" && <p className="flex items-center gap-1.5 text-[11px] text-white/40"><Lock size={11} /> You're already on StatZ, which includes everything in Premium.</p>}
        {!stripeOn && <p className="text-[11px] text-white/45">Card payments are being switched on — buttons go live once Stripe is configured.</p>}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-white/40">
        <Sparkles size={12} /> Prices are grandfathered — founding members keep their rate even after public prices rise.
      </p>
    </div>
  );
}
