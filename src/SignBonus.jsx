import { useEffect, useState } from "react";
import { Loader2, ChevronDown, Check } from "lucide-react";
import { api } from "./api.js";
import { SPINAZ } from "./resources.js";
import { goToSpot, goToTab } from "./goto.js";

// ZodiacZ bonuses — the gain, stated BEFORE the thing that earns it.
//
// This screen exists because of the half of the cost/gain rule people forget.
// A cost discovered by paying it is a bill; a REWARD discovered by accident is
// a coincidence, and a coincidence changes nobody's behaviour. The whole point
// of a sign bonus is the nudge, and a nudge nobody read is decoration.
//
// Three things it deliberately does NOT do:
//
// * It does not compute anything. The sign, the amounts, what each bonus asks
//   for and WHERE you go to do it all come from `/api/economy/signbonus/`.
//   A client that knew Leo was worth 20 🍥 would be the second place that
//   number lives, and the working notes already say how that ends.
// * It does not hide the other eleven. A member can only check that their
//   birthday is not earning them less than somebody else's by seeing the rest,
//   and "trust us, it's fair" is not an answer to that.
// * It renders nothing at all when the server has nothing to say. A bonus
//   panel that appears empty reads as a broken feature; absent, it reads as a
//   feature that isn't on yet — which is the truth.

const EMOJI = { Aries:"♈",Taurus:"♉",Gemini:"♊",Cancer:"♋",Leo:"♌",Virgo:"♍",
  Libra:"♎",Scorpio:"♏",Sagittarius:"♐",Capricorn:"♑",Aquarius:"♒",Pisces:"♓" };

/** `+20 🍥`, in the green the rule asks for, or struck through once it's spent. */
function Gain({ amount, earned }) {
  return earned
    ? <span className="inline-flex items-center gap-1 text-white/35 line-through">
        +{amount} {SPINAZ}
      </span>
    : <span className="font-semibold text-emerald-300">+{amount} {SPINAZ}</span>;
}

/** One half of a bonus: what it asks, what it pays, and whether it's done. */
function Half({ label, does, amount, earned }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-2.5">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">{label}</p>
        <p className="text-sm text-white/80">{does}</p>
      </div>
      <div className="shrink-0 whitespace-nowrap text-sm">
        {earned
          ? <span className="inline-flex items-center gap-1 text-emerald-300/60">
              <Check size={12} /> <Gain amount={amount} earned />
            </span>
          : <Gain amount={amount} />}
      </div>
    </div>
  );
}

export default function SignBonus({ onOpenBirthday }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    api("/api/economy/signbonus/").then(setData).catch(() => setErr(true));
  }, []);

  if (err) return null;
  if (!data) {
    return (
      <p className="flex items-center gap-2 text-xs text-white/40">
        <Loader2 className="animate-spin" size={12} /> Loading your sign's bonus…
      </p>
    );
  }

  const mine = data.mine;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
        ZodiacZ — your sign's bonus
      </p>

      {!mine ? (
        // No birthday, so no sign, so no bonus — and the fix is one control
        // away, which is the only reason this branch is worth rendering at
        // all. A dead end that says "unavailable" would be worse than blank.
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
          <p className="text-sm text-white/70">
            Set your birthday and your sign picks up its own bonus — worth{" "}
            <span className="font-semibold text-emerald-300">
              +{data.base_spinaz} {SPINAZ}
            </span>{" "}and{" "}
            <span className="font-semibold text-emerald-300">
              +{data.stretch_spinaz} {SPINAZ}
            </span>, the same for every sign.
          </p>
          <button className="neon-btn mt-2 !px-3 !py-1 text-xs"
                  onClick={() => (onOpenBirthday ? onOpenBirthday() : goToSpot("profilez", "birthday"))}>
            Set your birthday
          </button>
        </div>
      ) : (
        <div className="neon-frame space-y-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-lg font-bold" style={{ color: "#ffcf3f" }}>
              {EMOJI[mine.sign]} {mine.name}
            </p>
            <span className="pill">{mine.sign}</span>
          </div>

          <Half label="Do this" does={mine.does}
                amount={mine.base_spinaz} earned={mine.earned_base} />
          <Half label="Or go further" does={mine.stretch}
                amount={mine.stretch_spinaz} earned={mine.earned_stretch} />

          {/* Why THIS sign gets THIS action. Without it the bonus reads as a
              number somebody assigned at random, and a member who thinks it
              was random has no reason to believe the rest of the twelve are
              worth the same. */}
          <p className="text-xs italic leading-relaxed text-white/45">{mine.why}</p>

          {/* Cross-pollination: a screen that names an action and leaves you
              to find the app is a read-only surface. */}
          {(!mine.earned_base || !mine.earned_stretch) && mine.tab && (
            <button className="neon-btn !px-3 !py-1 text-xs"
                    onClick={() => goToTab(mine.tab)}>
              Go and do it →
            </button>
          )}
          {mine.earned_base && mine.earned_stretch && (
            <p className="text-xs text-emerald-300/70">
              Both halves earned. Each one pays once — that's the whole of it.
            </p>
          )}
        </div>
      )}

      <button onClick={() => setShowAll((v) => !v)}
              className="flex items-center gap-1 text-xs text-white/45 hover:text-white/70">
        <ChevronDown size={12} className={showAll ? "rotate-180 transition" : "transition"} />
        {showAll ? "Hide" : "See all twelve"}
      </button>

      {showAll && (
        <div className="space-y-1.5">
          {/* Every sign, same two numbers. Said once here rather than repeated
              on twelve rows, because a figure printed twelve times is a figure
              that will read twelve ways within a year. */}
          <p className="text-xs text-white/40">
            Every sign is worth the same:{" "}
            <span className="text-emerald-300">+{data.base_spinaz} {SPINAZ}</span> for the
            first half and{" "}
            <span className="text-emerald-300">+{data.stretch_spinaz} {SPINAZ}</span> for
            the second. Your birthday picks WHICH action you're nudged at, never how much
            it's worth.
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {data.all.map((b) => (
              <div key={b.sign}
                   className={`rounded-xl border p-2 ${
                     mine && b.sign === mine.sign
                       ? "border-mcz-gold/50 bg-mcz-gold/5"
                       : "border-white/10 bg-black/20"
                   }`}>
                <p className="text-sm font-semibold text-white/85">
                  {EMOJI[b.sign]} {b.sign} — {b.name}
                </p>
                <p className="text-xs text-white/55">{b.does}</p>
                <p className="text-xs text-white/35">Further: {b.stretch}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
