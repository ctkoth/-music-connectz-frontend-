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
  Libra:"♎",Scorpio:"♏",Sagittarius:"♐",Capricorn:"♑",Aquarius:"♒",Pisces:"♓",
  // The other twelve. Same map on purpose — a bonus renders by NAME and the
  // two zodiacs share no name, which is the same property the server relies
  // on to address both from one column.
  Rat:"🐀",Ox:"🐂",Tiger:"🐅",Rabbit:"🐇",Dragon:"🐉",Snake:"🐍",
  Horse:"🐎",Goat:"🐐",Monkey:"🐒",Rooster:"🐓",Dog:"🐕",Pig:"🐖" };

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

/** One member's own bonus, whichever zodiac it came from.
 *
 * Both are rendered by the same component because they ARE the same thing:
 * one action, two halves, the same 20/50. A second layout for the animals
 * would be a second place the design could drift, and would also suggest the
 * two are worth different amounts — which is the one thing they are not. */
function MineCard({ b, label }) {
  const name = b.sign || b.animal || b.key;
  const done = b.earned_base && b.earned_stretch;
  return (
    <div className="neon-frame space-y-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-lg font-bold" style={{ color: "#ffcf3f" }}>
          {EMOJI[name]} {b.name}
        </p>
        <span className="pill" title={label}>{name}</span>
      </div>

      <Half label="Do this" does={b.does}
            amount={b.base_spinaz} earned={b.earned_base} />
      <Half label="Or go further" does={b.stretch}
            amount={b.stretch_spinaz} earned={b.earned_stretch} />

      {/* Why THIS sign gets THIS action. Without it the bonus reads as a
          number somebody assigned at random, and a member who thinks it was
          random has no reason to believe the rest are worth the same. */}
      <p className="text-xs italic leading-relaxed text-white/45">{b.why}</p>

      {/* Cross-pollination: a screen that names an action and leaves you to
          find the app is a read-only surface. */}
      {!done && b.tab && (
        <button className="neon-btn !px-3 !py-1 text-xs" onClick={() => goToTab(b.tab)}>
          Go and do it →
        </button>
      )}
      {done && (
        <p className="text-xs text-emerald-300/70">
          Both halves earned. Each one pays once — that's the whole of it.
        </p>
      )}
    </div>
  );
}

/** Twelve rows of one zodiac. Both lists use it, for the same reason both
 *  cards do: two renderers would be two places the design drifts. */
function AllGrid({ rows, field, mineKey, title }) {
  if (!rows?.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
        {title}
      </p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {rows.map((b) => {
          const name = b[field];
          return (
            <div key={name}
                 className={`rounded-xl border p-2 ${
                   name === mineKey
                     ? "border-mcz-gold/50 bg-mcz-gold/5"
                     : "border-white/10 bg-black/20"
                 }`}>
              <p className="text-sm font-semibold text-white/85">
                {EMOJI[name]} {name} — {b.name}
              </p>
              <p className="text-xs text-white/55">{b.does}</p>
              <p className="text-xs text-white/35">Further: {b.stretch}</p>
            </div>
          );
        })}
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
  // `mine_animal` is a key the server grew AFTER this screen shipped, so an
  // older API answers undefined here rather than erroring — which renders as
  // one card instead of two, and that is the correct degradation.
  const animal = data.mine_animal;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
        ZodiacZ — your bonuses
      </p>

      {!mine && !animal ? (
        // No birthday, so no sign, no animal, and no bonus — and the fix is one
        // control away, which is the only reason this branch is worth rendering
        // at all. A dead end that says "unavailable" would be worse than blank.
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
          <p className="text-sm text-white/70">
            Set your birthday and you pick up <strong>two</strong> bonuses — one for
            your star sign, one for your animal year. Each is worth{" "}
            <span className="font-semibold text-emerald-300">
              +{data.base_spinaz} {SPINAZ}
            </span>{" "}and{" "}
            <span className="font-semibold text-emerald-300">
              +{data.stretch_spinaz} {SPINAZ}
            </span>, the same for all twenty-four.
          </p>
          <button className="neon-btn mt-2 !px-3 !py-1 text-xs"
                  onClick={() => (onOpenBirthday ? onOpenBirthday() : goToSpot("profilez", "birthday"))}>
            Set your birthday
          </button>
        </div>
      ) : (
        // Two cards, side by side where there's room. Deliberately equal in
        // size and styling: the whole claim this feature makes is that the two
        // are worth the same, and a layout that made one the headline would be
        // arguing the opposite underneath the copy that says otherwise.
        <div className="grid gap-2 lg:grid-cols-2">
          {mine && <MineCard b={mine} label="Your star sign — the month you were born" />}
          {animal && <MineCard b={animal} label="Your animal year — the year you were born" />}
        </div>
      )}

      <button onClick={() => setShowAll((v) => !v)}
              className="flex items-center gap-1 text-xs text-white/45 hover:text-white/70">
        <ChevronDown size={12} className={showAll ? "rotate-180 transition" : "transition"} />
        {showAll ? "Hide" : "See all twenty-four"}
      </button>

      {showAll && (
        <div className="space-y-3">
          {/* The two numbers, said ONCE, rather than repeated on twenty-four
              rows — a figure printed twenty-four times is a figure that will
              read twenty-four ways within a year. */}
          <p className="text-xs text-white/40">
            Every one is worth the same:{" "}
            <span className="text-emerald-300">+{data.base_spinaz} {SPINAZ}</span> for the
            first half and{" "}
            <span className="text-emerald-300">+{data.stretch_spinaz} {SPINAZ}</span> for
            the second. Your birthday picks WHICH two actions you're nudged at, never how
            much they're worth.
          </p>
          <AllGrid rows={data.all} field="sign" mineKey={mine?.sign}
                   title="Star signs — the month" />
          <AllGrid rows={data.all_animals} field="animal" mineKey={animal?.animal}
                   title="Animal years — the year" />
        </div>
      )}
    </div>
  );
}
