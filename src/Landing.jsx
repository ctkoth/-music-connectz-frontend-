import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Compass, Download, Dumbbell, Mic2, Music4, Sparkles, Star, Timer, Users2, Wallet } from "lucide-react";
import { api } from "./api.js";
import { track } from "./track.js";
import { WINDOWS_EXE } from "./downloadBuilds.js";
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
const FEATURES = [
  { Icon: Mic2, title: "An AI coach that actually listens",
    body: "Not a form-completeness score. It hears the take and scores pitch, timing and delivery — same rubric whether you're training in SingZ or RapZ." },
  { Icon: Star, title: "Ratings from real people, not bots",
    body: "Post a track or bars; the community scores it 1–10 once it's had 30 seconds of air. You can't rate your own — that's what makes the number worth anything." },
  { Icon: Users2, title: "Collab, battle, build a crew",
    body: "Find people by the instrument, persona and heritage they actually claim — then co-write, remix, or put your post up against theirs." },
  { Icon: Wallet, title: "Get paid for it",
    body: "Sell beats, book lessons, run label deals. The platform fee drops as your tier goes up, and it's shown before you ever spend." },
];

// Real counts or none — see CLAUDE.md on substance over decoration. A landing
// page showing a fabricated "1,200 members" would be exactly the kind of
// number that could look good without being good, and it's the first thing
// this codebase's own rules say not to ship.
function useCommunityStats() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let on = true;
    api("/api/auth/public-stats/", { auth: false }).then((s) => on && setStats(s)).catch(() => {});
    return () => { on = false; };
  }, []);
  return stats;
}

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
    <Link to={to} className={`re-card block text-left transition ${ring}`}>
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
        <Card to="/try/bodiez" Icon={Dumbbell} ring="hover:border-emerald-400/50" tint="text-emerald-300"
              title="Log a set — BodieZ"
              blurb="Pick a real exercise, log a set, get a real estimated 1RM and a preview of what Coach tells members. Sign up and it becomes a real routine — nothing you build here is lost."
              floor="Free · no account · keeps what you build if you sign up" />
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

// StatZ is the focal upgrade — flashing ring, biggest type on the page after
// the headline — because it's the one that answers the question every trial
// door above just raised: "does any of this survive?" BodieZ already keeps a
// picked exercise as a real routine on signup; SingZ/RapZ's claim token
// already carries a scored take into the account the same way. StatZ is what
// turns "one free take" into "every take, every routine, forever" — which is
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
          Keep everything you just tried — every routine, every take, permanently
        </p>
        <p className="relative mx-auto mt-1.5 max-w-md text-[12px] text-white/60">
          The exercise you logged in BodieZ becomes a real routine. Every scored take
          claims into your coach history. StatZ is the tier built for someone who's
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
  const stats = useCommunityStats();
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
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-5 py-10">
      <header className="mb-8 flex items-center gap-3">
        <img src="/mcz-logo-v5.jpg" alt="Music ConnectZ" className="h-11 w-11 rounded-xl shadow-neon" />
        <span className="font-display text-lg font-extrabold tracking-tight">Music ConnectZ</span>
        <Link to="/login" className="ml-auto text-sm text-white/60 hover:text-white">Log in</Link>
      </header>

      <div className="neon-frame p-6 text-center sm:p-10">
        {stats?.total_members > 0 && (
          <p className="mb-4 flex items-center justify-center gap-2 text-xs">
            <span className="pill">👥 {stats.total_members.toLocaleString()} members</span>
            {stats.online_now > 0 && (
              <span className="pill !border-emerald-400/40 !text-emerald-300">
                <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                {stats.online_now} online now
              </span>
            )}
          </p>
        )}
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Train your voice, body, or barZ.<br className="hidden sm:block" /> Get scored by a coach that actually listens.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/60 sm:text-base">
          Same AI coach real members use, same rubric, same score out of 10 — on pitch, timing and
          delivery. Then post your work, collaborate, and get paid.
        </p>

        <Link
          to="/try"
          className="neon-btn-primary mx-auto mt-6 !w-auto px-8 py-4 text-base"
        >
          🎤 Get one take scored — free, no account
        </Link>
        <p className="mt-2 text-[11px] text-white/40">
          One take a day. Score it, keep it, and sign up after — it saves straight to your account.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link to="/register" className="re-link">Create a free account</Link>
          <span className="text-white/20">·</span>
          <Link to="/login" className="text-white/55 hover:text-white">Already a member? Log in</Link>
        </div>
      </div>

      <TrialDoors coaches={coaches} />

      <UpgradeCTAs tiers={tiers} />

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

      {/* Ad placement for traffic exchange partnership */}
      <div className="mt-8 flex justify-center">
        <iframe src="https://ad-swap.web.app/frame.html?site=75veYPcDYKfignDb09N6" style={{border:0,width:"300px",height:"130px",maxWidth:"100%"}} loading="lazy" sandbox="allow-scripts allow-popups" title="Ad" />
      </div>

      {/* Free, no account needed — the desktop build loads the live site, so
          it's always whatever the web app is, never a version behind it. */}
      <a
        href={WINDOWS_EXE.href}
        target="_blank"
        rel="noreferrer"
        className="mt-6 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-sm transition hover:border-mcz-cyan/50"
      >
        <Download size={15} className="shrink-0 text-mcz-cyan" />
        <div>
          <span className="font-semibold text-white">{WINDOWS_EXE.emoji} Download for Windows (.exe)</span>
          <span className="ml-1.5 text-emerald-300">Free</span>
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
            {WINDOWS_EXE.note} Unsigned build — SmartScreen: More info → Run anyway.
          </p>
        </div>
      </a>
    </div>
  );
}
