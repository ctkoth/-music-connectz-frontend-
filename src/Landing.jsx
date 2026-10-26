import { useEffect, useState } from "react";
import { GLOSSARY } from "./glossary.js";
import { Link } from "react-router-dom";
import { Compass, Download, Mic2, Music4, Sparkles, Star, Timer, Users2 } from "lucide-react";
import { api } from "./api.js";
import { track } from "./track.js";
import { recommendedBuild, alternateBuild } from "./downloadBuilds.js";
import { MONEY } from "./resources.js";

const usd = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

// Real tier prices, read the same way Register.jsx and the BodieZ trial
// result screen already do — never typed into this page. The signup screen
// was the tenth place a tier number lived once; a landing page is the
// eleventh, and the fix is the same one: fetch it, or render nothing.
function useTiers() {
  const [tiers, setTiers] = useState(null);
  useEffect(() => {
    let on = true;
    api("/api/economy/tiers/", { auth: false }).then((d) => on && setTiers(d)).catch(() => {});
    return () => { on = false; };
  }, []);
  return tiers;
}

// The logged-out homepage.
//
// Before this existed, "/" sent anyone without a session straight to /login —
// "Welcome back, log in with your username, email, or phone." — which is a
// screen for a RETURNING member, shown first to everybody who has never heard
// of this place. The SEO meta on index.html promises "Free scored take, no
// account needed"; nothing on the page anyone actually landed on delivered
// it. /try (a real scored take, no account) already existed and already
// worked — it just wasn't linked from the one URL that gets shared, indexed,
// and clicked. This page's only job is to make that promise true on arrival
// and hand the visitor the one link that keeps it.
// Focus mode (src/focus.js): the coach is the product, so these sell the
// coach. Collabs, payouts and the marketplaces are still in the app, but a
// stranger arriving to an empty two-sided room learns nobody's here.
const FEATURES = [
  { Icon: Mic2, title: "An AI coach that actually listens",
    body: "Not a form-completeness score. It hears the take and scores pitch, timing and delivery — the same rubric every time, so the number means something." },
  { Icon: Star, title: "Watch the number move",
    body: "Every take is kept. Send the same one again next week and see which part got better — that's the whole point of a coach." },
  { Icon: Music4, title: "Every instrument on its own terms",
    body: "Each coach scores what that instrument actually asks of you — a drummer isn't marked on breath. Pick yours above to see its scores." },
  { Icon: Users2, title: "Challenge a friend",
    body: "Share your score card and dare them to beat it. Same take, same rubric, no arguing about who's better." },
];


/** Every door a stranger can walk through, in order of how much it asks.
 *
 * The funnel's own numbers set this order: 103 arrived, 13 opened the
 * recorder, 1 got a score. The 87% did not decline a coaching session — they
 * declined a microphone, from a site they had never heard of, usually on a
 * phone, before being given anything. One door with a high floor is not a
 * funnel, it is a filter.
 *
 * So the test goes first (nothing to allow, ~90 seconds, ends knowing
 * something about YOU, which is the part that actually converts), the coaches
 * sit in the middle as the payoff, and the two pure-client tools are last —
 * free forever, useful to a stranger, and cheap to us because they never
 * touch the server.
 */
function TrialDoors({ coaches }) {
  // Whole class strings, never `text-${accent}`. Tailwind's JIT scans source
  // for complete names, so an interpolated one is never emitted and the icon
  // silently renders in the inherited colour — a build that "passes" and a
  // design that quietly doesn't.
  const Card = ({ to, Icon, title, blurb, floor, ring, tint }) => (
    <Link to={to} className={`re-card block text-left transition ${ring}`}
          onClick={to === "/try" ? () => track("landing_cta", { at: "doors" }) : undefined}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={`mt-0.5 shrink-0 ${tint}`} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-white/55">{blurb}</p>
          {/* What it asks of you, before you press it. */}
          <p className="mt-1.5 text-[11px] text-emerald-300">{floor}</p>
        </div>
      </div>
    </Link>
  );
  return (
    <div className="mt-8">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-white/45">
        Try it without an account
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card to="/test" Icon={Compass} ring="hover:border-mcz-cyan/50" tint="text-mcz-cyan"
              title="What kind of collaborator are you?"
              blurb="Sixteen statements about how you actually work. Four letters back, and people can find you by them."
              floor="Free · no account · ~90 seconds · nothing to allow" />
        <Card to="/try" Icon={Mic2} ring="hover:border-mcz-pink/50" tint="text-mcz-pink"
              title="Get one take scored"
              blurb={coaches.length > 2
                ? `A real AI coach marks it out of 10 and tells you what cost you the rest. Record it or upload a clip. ${coaches.map((c) => c.label).join(", ")}.`
                : "A real AI coach marks it out of 10 and tells you what cost you the rest. Record it or upload a clip."}
              floor="Free · no account · needs a mic, or upload a clip" />
        <Card to="/tool/metz" Icon={Timer} ring="hover:border-mcz-gold/50" tint="text-mcz-gold"
              title="MetZ — metronome"
              blurb="Tempo, time signature, subdivisions. Runs in the browser and never phones home."
              floor="Free forever · no account" />
        <Card to="/tool/chordz" Icon={Music4} ring="hover:border-mcz-purple/50" tint="text-mcz-purple"
              title="ChordZ — chords and progressions"
              blurb="Voicings and progressions you can hear. Also entirely in the browser."
              floor="Free forever · no account" />
      </div>
    </div>
  );
}

/** What a musician already does, beside what this does that none of it can.
 *
 * Corey's read of the funnel: of 103 who landed, 90 left before trying anything — not
 * because the trial was hard, but because nothing on the page named a use their
 * routine (record on the phone, post it, ask a friend) does not already cover. So the
 * comparison is the first thing under the headline, and its left column is the
 * routine they have, in their words, not a straw man.
 *
 * Every right-hand claim is what the coach actually returns: a score with a reason per
 * dimension, the fix and a drill, the same dimensions on every take. The dimensions
 * are the server's (`/trialdoorz/`, per instrument), picked by tapping an instrument,
 * so a drummer reads drum words. The button lands on that instrument's own door.
 */
function Compare({ coaches }) {
  const [pick, setPick] = useState("");
  const door = coaches.find((c) => c.app_key === pick) || coaches[0] || null;
  const dims = (door?.scores || []).slice(0, 5);
  const rows = [
    ["Post it and hope someone says something useful",
     <>A score out of 10 in about a minute{dims.length > 0 && <> — on <span className="text-white">{dims.join(", ")}</span></>}, each with the reason</>],
    ["“Sounds fire 🔥” from friends",
     "The one thing to fix next, and a drill for it"],
    ["No way to tell if you're actually getting better",
     "The same scores on every take, so you watch them move (a free account keeps them)"],
    ["Book a lesson, pay for it, wait for the slot",
     "Your first take is free, with no account"],
  ];
  return (
    <div className="mt-6 text-left" data-tour="landing-compare">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-white/45">
        What you do now → what this does
      </p>
      {coaches.length > 1 && (
        <div className="mb-3 flex flex-wrap justify-center gap-1.5" role="group" aria-label="Your instrument">
          {coaches.map((c) => (
            <button key={c.app_key} type="button" onClick={() => setPick(c.app_key)}
                    aria-pressed={door?.app_key === c.app_key}
                    className={`pill text-[11px] ${door?.app_key === c.app_key ? "!border-mcz-cyan !text-mcz-cyan" : ""}`}>
              {c.label}
            </button>
          ))}
        </div>
      )}
      <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10">
        {rows.map(([now, here], i) => (
          <div key={i} className="grid gap-1 p-3 sm:grid-cols-2 sm:gap-4">
            <p className="text-[13px] text-white/45"><span className="sm:hidden text-white/30">Now: </span>{now}</p>
            <p className="text-[13px] text-emerald-200"><span className="sm:hidden text-emerald-300/70">Here: </span>{here}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <Link to={door ? `/try/${door.app_key}` : "/try"} onClick={() => track("landing_cta", { at: "compare" })}
              className="neon-btn-primary !w-auto px-8 py-4 text-base">
          🎤 Score my {door ? door.label : ""} take <span className="ml-1 text-emerald-300">Free · no account</span>
        </Link>
      </div>
    </div>
  );
}

// StatZ is the focal upgrade — flashing ring, biggest type on the page after
// the headline — because it's the one that answers the question every trial
// door above just raised: "does any of this survive?" The coaches' claim
// token already carries a scored take into the account. StatZ is what turns
// "one free take" into "every take, forever" — which is
// the actual gain, stated up front, per the cost/gain rule.
//
// Free/Premium sits BELOW it, deliberately smaller and unstyled — plain
// links, no card, no color. Not because they don't matter (a free account is
// still the thing that claims a trial), but because a page that flashes two
// things at once teaches a visitor to ignore the flashing. One focal point.
function UpgradeCTAs({ tiers }) {
  if (!tiers) return null;
  const statz = tiers.tiers?.find((t) => t.key === "statz");
  if (!statz) return null;
  const founding = statz.founding;

  return (
    <div className="mt-8 space-y-3">
      <Link
        to="/register?tier=statz"
        className="group relative block overflow-hidden rounded-2xl border-2 border-mcz-cyan/60 bg-gradient-to-br from-mcz-cyan/15 via-fuchsia-500/10 to-transparent p-5 text-center shadow-neon transition hover:border-mcz-cyan"
      >
        {/* The flashing cue — a pulsing ring behind the card, never on the
            price itself, so the number stays readable while the attention
            cue moves. */}
        <span className="pointer-events-none absolute inset-0 animate-pulse rounded-2xl ring-2 ring-mcz-cyan/40" />
        <span className="relative mb-2 inline-flex items-center gap-1.5 rounded-full bg-mcz-cyan/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-mcz-cyan">
          <Sparkles size={12} className="animate-pulse" /> StatZ
        </span>
        <p className="relative font-display text-lg font-extrabold text-white sm:text-xl">
          Keep everything you just tried — every take, permanently
        </p>
        <p className="relative mx-auto mt-1.5 max-w-md text-[12px] text-white/60">
          Every scored take claims into your coach history, so you can see it move. StatZ is the tier built for someone who's
          already building something here.
        </p>
        <p className="relative mt-3 text-2xl font-extrabold text-mcz-cyan">
          {usd(statz.price_cents)} {MONEY}<span className="text-sm text-white/50">/mo</span>
        </p>
        {founding && !founding.sold_out && (
          <p className="relative mt-1 text-xs font-semibold text-mcz-ember">
            or {usd(founding.lifetime_cents)} {MONEY} lifetime — {founding.remaining} founding seats left
          </p>
        )}
      </Link>

      <p className="text-center text-xs text-white/40">
        Prefer to start free? <Link to="/register" className="text-white/55 underline hover:text-white">Create a free account</Link>
        {" "}— <Link to="/register?tier=premium" className="text-white/55 underline hover:text-white">or Premium</Link>, upgrade whenever.
      </p>
    </div>
  );
}

export default function Landing() {
  const tiers = useTiers();
  // The coaches come from the server, so a new instrument reaches the front
  // door without anybody editing this page — the same list /try renders.
  const [coaches, setCoaches] = useState([]);
  useEffect(() => {
    let on = true;
    api("/api/economy/trialdoorz/", { auth: false })
      .then((d) => on && Array.isArray(d?.doors) && setCoaches(d.doors))
      .catch(() => {});
    return () => { on = false; };
  }, []);
  useEffect(() => { track("landing_view"); }, []);
  const build = recommendedBuild();
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-5 py-10">
      <header className="mb-8 flex items-center gap-3">
        <img src="/logo.png?v=2" alt="Music ConnectZ" className="h-11 w-11 rounded-xl shadow-neon" />
        <span className="font-display text-lg font-extrabold tracking-tight">MusicConnectZ.Net</span>
        <Link to="/login" className="ml-auto text-sm text-white/60 hover:text-white">Log in</Link>
      </header>
      <p className="-mt-4 mb-6 text-sm text-white/70">🎶 AI Coaching & Gamified👾 way to make professional portfolio📑 of your music related work</p>

      <div className="neon-frame p-6 text-center sm:p-10">
        {/* No member count here. Corey's call: visitors are never shown it —
            a small true number reads as an empty room to somebody deciding
            whether to join. Members see it in the app header. The endpoint is
            members-only too (PublicStatsView). */}
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Get your take scored out of 10.<br className="hidden sm:block" /> Free, in about a minute.
        </h1>
        {/* No instrument line here: the comparison's instrument buttons are the
            server's list and the choice at once. A typed line said seven for as long
            as eleven coaches existed. */}
        {/* The comparison carries what the old sub-paragraph said, per instrument. */}
        {coaches.length > 0 && <Compare coaches={coaches} />}

        {/* The comparison carries the main button (to the chosen instrument's door).
            This plain one is only for when the instrument list failed to load. */}
        {coaches.length === 0 && (
        <Link
          to="/try" onClick={() => track("landing_cta", { at: "hero" })}
          className="neon-btn-primary mx-auto mt-6 !w-auto px-8 py-4 text-base"
        >
          🎤 Score my take — free, no account
        </Link>
        )}
        <p className="mt-2 text-[11px] text-white/40">
          📤 Upload a clip you already have, or record one. Sign up after and it saves to your account.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link to="/register" className="re-link">Create a free account</Link>
          <span className="text-white/20">·</span>
          <Link to="/login" className="text-white/55 hover:text-white">Already a member? Log in</Link>
        </div>
      </div>

      <TrialDoors coaches={coaches} />

      <UpgradeCTAs tiers={tiers} />

      {/* Words a newcomer will not know, defined where they first arrive — escrow first, because
          "escrowed, so a stranger can take the first deal" is the sentence that sells CollabZ and
          means nothing to someone who has never heard the word. The list is glossary.js. */}
      <section aria-labelledby="words-we-use" className="mt-8 re-card">
        <h2 id="words-we-use" className="font-display text-lg font-extrabold text-white">Words we use</h2>
        <dl className="mt-3 space-y-3">
          {GLOSSARY.map((g) => (
            <div key={g.key}>
              <dt className="text-sm font-bold text-white">{g.word}</dt>
              <dd className="mt-0.5 text-[12px] leading-relaxed text-white/60">{g.means}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {FEATURES.map(({ Icon, title, body }) => (
          <div key={title} className="re-card">
            <div className="flex items-start gap-3">
              <Icon size={18} className="mt-0.5 shrink-0 text-mcz-cyan" />
              <div>
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-white/55">{body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Free, no account needed — both builds load the live site, so they're
          always whatever the web app is, never a version behind it. Picks
          Android on an Android visitor rather than defaulting to Windows for
          everyone; SpecZ (inside the app) still lists every option. */}
      {build && (
      <a
        href={build.href}
        target="_blank"
        rel="noreferrer"
        className="mt-6 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-sm transition hover:border-mcz-cyan/50"
      >
        <Download size={15} className="shrink-0 text-mcz-cyan" />
        <div>
          <span className="font-semibold text-white">
            {build.emoji} Download for {build.key === "android" ? "Android (.apk)" : "Windows (.exe)"}
          </span>
          <span className="ml-1.5 text-emerald-300">Free</span>
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
            {build.note} {build.key === "android"
              ? "You'll need to allow installs from this source."
              : "Unsigned build — SmartScreen: More info → Run anyway."}
          </p>
        </div>
      </a>
      )}
      {alternateBuild() && (
        <a href={alternateBuild().href} target="_blank" rel="noreferrer"
           className="mt-1.5 block text-center text-[11px] text-mcz-cyan hover:underline">
          {alternateBuild().emoji} On Android? Get the {alternateBuild().label} instead
        </a>
      )}
    </div>
  );
}
