import { useEffect, useState } from "react";
import { Loader2, Circle, CheckCircle2 } from "lucide-react";
import { api } from "../api.js";
import { ENERGY, SPINAZ, PROMPTZ, MONEY, XP } from "../resources.js";
import { goToSpot } from "../goto.js";

// The offer catalogue — every promotion the platform runs, in FunnelZ, for the
// owner.
//
// This sits beside the join funnel because the two halves of FunnelZ answer
// the same question from opposite ends: the measurement says where people
// stop, and this says what the platform does about it. Splitting them across
// two tabs would mean nobody ever looks at both, which is the only way either
// number means anything.
//
// It exists because `OfferPanel.jsx` — the member-facing one — is capped at
// three and only ever shows what is TRUE for the person looking. That's right
// for a member and useless for whoever runs the place: from inside that panel
// there's no way to see the offers that never fire, and an offer nobody has
// matched is exactly the decoration the engine's own docstring warns about.
//
// Every row carries its `why`, which is written beside each offer in the
// server and until now was served nowhere. A promotion whose reason lives only
// in a code comment is one the next person rewords into something that no
// longer has one.

const EMOJI = { energy: ENERGY, spinaz: SPINAZ, promptz: PROMPTZ, money: MONEY, xp: XP };

const STEP_LABEL = {
  acquisition: "Acquisition — before they join",
  activation: "Activation — the first real action",
  monetisation: "Monetisation — at the wall they actually hit",
  retention: "Retention — a reason to come back",
};

function Line({ line }) {
  const minus = line.sign === "−";
  return (
    <span className={minus ? "text-mcz-ember" : "text-emerald-300"}>
      {line.amount ? `${line.sign}${line.amount} ` : ""}{EMOJI[line.resource] || ""}
    </span>
  );
}

function Row({ o }) {
  return (
    <div className={`rounded-xl border p-3 ${
      o.live_for_me ? "border-emerald-400/30 bg-emerald-400/5" : "border-white/10 bg-black/25"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white/90">
            {/* Whether the engine says this is true for YOU right now. It is the
                one way to watch it deciding rather than take it on trust. */}
            {o.live_for_me
              ? <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
              : <Circle size={13} className="shrink-0 text-white/20" />}
            {o.title}
          </p>
          <p className="pt-0.5 text-xs text-white/45">{o.cta} → {o.tab}:{o.target}</p>
        </div>
        <span className="shrink-0 whitespace-nowrap text-sm">
          {o.cost?.map((l, i) => <Line key={`c${i}`} line={l} />)}
          {o.cost?.length > 0 && o.gain?.length > 0 && <span className="px-1 text-white/20">→</span>}
          {o.gain?.map((l, i) => (
            <span key={`g${i}`}>
              {i > 0 && <span className="px-0.5 text-white/20">/</span>}
              <Line line={l} />
            </span>
          ))}
        </span>
      </div>

      {/* The reason, in the owner's face rather than in a file. */}
      <p className="pt-1.5 text-xs italic leading-relaxed text-white/40">{o.why}</p>

      <div className="flex flex-wrap items-center gap-3 pt-1.5 text-[10px] text-white/35">
        <button className="underline decoration-white/20 hover:text-white/70"
                onClick={() => goToSpot(o.tab, o.target)}>
          See where it lands
        </button>
        {/* Dismissals are the ONLY count here. Somebody saw it and said no is
            an honest signal; "impressions" would need a write on every render
            and would turn a read-only panel into a tracking surface. */}
        <span>{o.dismissed_by} dismissed it</span>
        {o.ends_at && <span className="text-mcz-ember">ends {new Date(o.ends_at).toLocaleDateString()}</span>}
      </div>
    </div>
  );
}

export default function OfferCatalog() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/economy/offerz/catalog/")
      .then(setData)
      .catch((e) => setErr(e?.message || "Couldn't load the offer catalogue."));
  }, []);

  // Unlike the member panel, a failure HERE is worth saying out loud: the
  // owner came looking for this, so silence would read as "there are no
  // offers" rather than "the request failed".
  if (err) return <p className="text-xs text-mcz-ember">{err}</p>;
  if (!data) {
    return (
      <p className="flex items-center gap-2 text-xs text-white/40">
        <Loader2 className="animate-spin" size={12} /> Loading the offers…
      </p>
    );
  }

  const live = data.offers.filter((o) => o.live_for_me).length;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
          The offers — what the platform springs, and when
        </p>
        <p className="pt-1 text-xs text-white/45">
          {data.offers.length} offers, {live} true for you right now. A member is
          shown at most {data.max_shown} at a time. {data.base_note}
        </p>
      </div>

      {data.steps.map((step) => {
        const rows = data.offers.filter((o) => o.step === step);
        if (!rows.length) return null;
        return (
          <div key={step} className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
              {STEP_LABEL[step] || step}
            </p>
            {rows.map((o) => <Row key={o.key} o={o} />)}
          </div>
        );
      })}
    </div>
  );
}
