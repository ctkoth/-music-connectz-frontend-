import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Mic2, Star, Users2, Wallet } from "lucide-react";
import { api } from "./api.js";
import { track } from "./track.js";
import { WINDOWS_EXE } from "./downloadBuilds.js";

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

export default function Landing() {
  const stats = useCommunityStats();
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
          Train your voice or your bars.<br className="hidden sm:block" /> Get scored by a coach that actually listens.
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
