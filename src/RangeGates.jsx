// The five range gates, in one control, used everywhere they apply.
//
// Search, CollabZ, VenueZ and BattleZ all gate on the same five ranges, and the
// server evaluates them from one spec. This is the matching half on the client
// so a host can't be shown a different set of ranges than the door enforces.
//
// The ranges are EXCLUSIVE and the control says so out loud: set one and a
// member with no value for that metric is out. That is not a footnote — it is
// the single thing most likely to surprise somebody whose battle gets three
// entries instead of thirty.
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

// Keys and labels mirror apps/economy/gates.py — GATE_KEYS, and describe().
const RANGES = [
  { key: "rating", label: "Skill rating", suffix: "/10", min: 1, max: 10,
    note: "Their overall community rating." },
  { key: "price", label: "Skill price", prefix: "$", money: true,
    note: "Their cheapest skill's hourly rate." },
  { key: "attract", label: "Attractiveness", suffix: "/10", min: 1, max: 10,
    note: "Community median from RateZ." },
  { key: "age", label: "Age", min: 13, max: 120, note: "" },
];

const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

/** `value` and `onChange` speak the server's shape: {key: [min, max]}, km max-only. */
export default function RangeGates({ value = {}, onChange, title = "Who can join" }) {
  const [open, setOpen] = useState(false);

  const pair = (key) => (Array.isArray(value[key]) ? value[key] : [null, null]);
  const kmMax = Array.isArray(value.km) ? value.km[1] : null;
  const active = Object.keys(value || {}).length;

  function setSide(key, side, raw, money) {
    const next = { ...value };
    const cur = [...pair(key)];
    let v = num(raw);
    if (v !== null && money) v = Math.round(v * 100);   // dollars in, cents out
    cur[side] = v;
    if (cur[0] === null && cur[1] === null) delete next[key];
    else next[key] = cur;
    onChange(next);
  }

  function setKm(raw) {
    const next = { ...value };
    const v = num(raw);
    if (v === null) delete next.km;
    else next.km = [null, v];       // "within N km" has no floor worth stating
    onChange(next);
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      <button className="flex w-full items-center justify-between px-3 py-2 text-left"
              onClick={() => setOpen(!open)} type="button">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
          {title}{active > 0 && <span className="ml-2 text-mcz-ember">{active} set</span>}
        </span>
        {open ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>

      {open && (
        <div className="space-y-2 px-3 pb-3">
          {/* Said once, plainly, at the top — this is the behaviour that
              surprises people, not the numbers. */}
          <p className="text-[10px] leading-relaxed text-white/35">
            Ranges are exclusive: set one and anybody with no value for it is out — an unrated
            member fails a rating range, someone with no price set fails a price range. Leave a
            range blank to ask nothing of it.
          </p>

          {RANGES.map((r) => {
            const [lo, hi] = pair(r.key);
            const show = (v) => (v === null || v === undefined ? "" : r.money ? v / 100 : v);
            return (
              <div key={r.key} className="flex flex-wrap items-center gap-2">
                <span className="w-28 shrink-0 text-[11px] text-white/55">{r.label}</span>
                <input className="neon-input !w-20 !py-1.5 text-[11px]" inputMode="decimal"
                       placeholder={r.prefix ? `${r.prefix}min` : "min"}
                       value={show(lo)} onChange={(e) => setSide(r.key, 0, e.target.value, r.money)} />
                <span className="text-white/25">–</span>
                <input className="neon-input !w-20 !py-1.5 text-[11px]" inputMode="decimal"
                       placeholder={r.prefix ? `${r.prefix}max` : "max"}
                       value={show(hi)} onChange={(e) => setSide(r.key, 1, e.target.value, r.money)} />
                {r.suffix && <span className="text-[10px] text-white/30">{r.suffix}</span>}
                {r.note && <span className="hidden text-[10px] text-white/25 sm:inline">{r.note}</span>}
              </div>
            );
          })}

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-28 shrink-0 text-[11px] text-white/55">Distance</span>
            <input className="neon-input !w-20 !py-1.5 text-[11px]" inputMode="numeric"
                   placeholder="max km"
                   value={kmMax ?? ""} onChange={(e) => setKm(e.target.value)} />
            <span className="text-[10px] text-white/30">
              km — needs both of you sharing location
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
