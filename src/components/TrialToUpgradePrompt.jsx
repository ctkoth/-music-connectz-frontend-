import { Check, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { SPINAZ } from "../resources.js";

/**
 * Under a trial score: what moved, the free take still left, and what each tier
 * REALLY adds — every number and feature from /api/economy/tiers/, never typed here.
 *
 * Corey: people need a reason to spend money, so show them the value. This used to
 * do that with three things that were not true ("2x faster Energy" — it is 3x at the
 * rate a new member is on; "AI vocal coach feedback" as a Premium perk — every tier
 * has it; "Advanced analytics" — never built). A visitor who joins on a claim and finds
 * it false stops believing the rest, so the value shown is only what the server gates.
 * No tiers (a failed fetch) means no ladder, never an invented one.
 */
const money = (c) => (c ? `$${(c / 100).toFixed(c % 100 ? 2 : 0)}` : "$0");
const gb = (n) => (n == null ? "" : n >= 1024 ? `${Math.round(n / 1024)}GB` : `${n}MB`);
const runs = (n) => (n == null ? "" : n >= 999 ? "Unlimited free AI runs" : `${n} free AI runs a day`);

function Change({ previous }) {
  if (!previous) return null;
  const c = previous.change;
  const up = c > 0, same = c === 0;
  return (
    <p className={`text-center font-display text-lg font-bold ${up ? "text-emerald-300" : "text-white/85"}`}>
      {same ? "Same as your first take" : `${up ? "▲ +" : "▼ "}${Math.abs(c)} since your first take`}
      <span className="block text-[12px] font-normal text-white/55">
        That's what an account keeps for you: every take, and the number moving.
      </span>
    </p>
  );
}

function Tier({ t, title, accent, items }) {
  return (
    <div className={`rounded-lg border p-3 ${accent}`}>
      <p className="mb-2 font-semibold text-white">
        {title} <span className="text-[12px] font-normal text-white/55">{t.month_cents ? `${money(t.month_cents)}/mo` : "$0"}</span>
      </p>
      <ul className="space-y-1 text-[12px] text-white/75">
        {items.filter(Boolean).map((x, i) => (
          <li key={i} className="flex items-start gap-1.5"><Check size={13} className="mt-0.5 shrink-0 text-emerald-300" /><span>{x}</span></li>
        ))}
      </ul>
    </div>
  );
}

export default function TrialToUpgradePrompt({ info, previous, takesLeft, onAgain }) {
  const by = Object.fromEntries((info?.tiers || []).map((t) => [t.key, t]));
  const free = by.free, premium = by.premium, statz = by.statz;
  const sample = info?.statz_sample;
  return (
    <div className="space-y-4 rounded-lg border border-mcz-cyan/30 bg-black/40 p-4" data-tour="trial-value">
      <Change previous={previous} />
      {takesLeft > 0 && !previous && (
        <div className="rounded-lg border border-emerald-300/30 bg-emerald-300/5 p-3 text-center">
          <p className="text-sm text-white/85">
            You have <span className="font-semibold text-emerald-300">{takesLeft} more free take</span> today. Run the drill, then
            send it again — and see your number move.
          </p>
          {onAgain && (
            <button type="button" className="re-btn re-btn-cyan mt-2 !w-auto px-4" onClick={onAgain}>
              <RotateCcw size={14} /> Take it again
            </button>
          )}
        </div>
      )}

      {free && premium && statz && (
        <>
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-white/50">What an account adds</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Tier t={free} title="Free" accent="border-emerald-300/25 bg-emerald-300/5" items={[
              `${runs(free.daily_prompts)} — coach takes included`,
              "This take saved, and every one after it, with your progress",
              info.join?.welcome_spinaz ? `+${info.join.welcome_spinaz} ${SPINAZ} just for joining` : "",
              free.storage_mb ? `${gb(free.storage_mb)} for your recordings` : "",
            ]} />
            <Tier t={premium} title="Premium" accent="border-mcz-gold/30 bg-mcz-gold/5" items={[
              runs(premium.daily_prompts),
              premium.wav_bits ? `${premium.wav_bits}-bit WAV masters from Mix ConnectZ` : "",
              `${gb(premium.storage_mb)} storage, ${gb(premium.upload_mb)} per upload`,
              premium.profile_links ? `${premium.profile_links} portfolio links` : "",
              premium.energy_per_hour && free.energy_per_hour ? `${Math.round(premium.energy_per_hour / free.energy_per_hour)}× the ⚡ Energy` : "",
            ]} />
            <Tier t={statz} title="StatZ" accent="border-orange-400/40 bg-orange-400/5" items={[
              runs(statz.daily_prompts),
              statz.wav_bits ? `${statz.wav_bits}-bit WAV masters` : "",
              ...(info.statz_features || []).slice(0, 5).map((f) => f.label),
            ]} />
          </div>
          {sample && (
            <p className="text-center text-[12px] text-white/60">
              Not sure about StatZ? Every member can try it free: {sample.first_minutes} minutes the first time, then
              {" "}{sample.daily_minutes} minutes a day.
            </p>
          )}
        </>
      )}

      <div className="flex justify-center">
        <Link to="/register" className="neon-btn-primary !w-auto px-6 py-2 text-center">Join free — keep this take</Link>
      </div>
    </div>
  );
}
