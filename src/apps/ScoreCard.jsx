// /s/<token> — a shared score card. Somebody posted their score; this is
// where their followers land. It shows exactly what the coach said (the
// server's record, never a number from a URL) and offers the same thing free,
// with the sharer's handle carried as the referral code.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api } from "../api.js";
import { usePageTitle } from "../pageTitle.js";

export default function ScoreCard() {
  const { token } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [join, setJoin] = useState(null);   // referral amounts, the server's
  useEffect(() => {
    api("/api/economy/tiers/", { auth: false }).then((t) => setJoin(t?.join || null)).catch(() => {});
    api(`/api/economy/scores/${encodeURIComponent(token)}/`, { auth: false })
      .then(setD).catch(() => setErr("That score card isn't here any more."));
  }, [token]);
  const shown = d ? (d.shown || d.score) : "";
  usePageTitle(d ? (d.progress ? `${d.progress.label} ${d.progress.was} → ${d.progress.now} on ${d.label}` : `${shown}/10 on ${d.label}`) : "Score card", d?.verdict || "");

  const ref = d?.username ? `?ref=${encodeURIComponent(d.username)}` : "";
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png?v=2" alt="Music ConnectZ" className="h-9 w-9 rounded-xl shadow-neon" />
          <span className="font-display text-lg font-extrabold tracking-tight">Music ConnectZ</span>
        </Link>
        <Link to="/login" className="text-sm text-white/60 hover:text-white">Sign in</Link>
      </header>

      {err && <p className="text-mcz-ember">{err} <Link to="/try" className="re-link">Get your own take scored</Link></p>}
      {!d && !err && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>}

      {d && (
        <div className="space-y-5">
          <img src={d.image} alt={d.progress ? `${d.progress.label} ${d.progress.was} to ${d.progress.now} on ${d.label}` : `${shown}/10 on ${d.label}`} className="w-full rounded-2xl shadow-neon" />
          <div className="neon-frame space-y-2 p-5 text-center">
            <p className="text-sm text-white/60">
              {d.username ? <>@{d.username}'s</> : "A"} {d.progress ? `${d.label} glow-up` : `${d.label} take`}{d.genre ? ` · ${d.genre}` : ""}, {d.progress ? "measured" : "scored"} by the AI coach
            </p>
            {d.verdict && <p className="text-white/85">“{d.verdict}”</p>}
            {/* Credit to the person, and the reason behind the robot: who made it (as
                THEY declared), what the AI scored it, and the two reasons it gave — the
                same sentences the performer got. */}
            <p className="text-[12px] font-semibold text-white/80">
              {d.human && d.username
                ? `Human-made — declared by @${d.username}. The AI coach scored it.`
                : "Scored by the AI coach."}
            </p>
            {d.listeners?.count > 0 && (
              <p className="text-[12px] text-emerald-300">
                Real listeners rated it {d.listeners.median}/10 ({d.listeners.count} {d.listeners.count === 1 ? "person" : "people"}) — the AI's {shown} is the coach's read, theirs is the room's.
              </p>
            )}
            {d.why?.length > 0 && (
              <div className="space-y-1 text-left text-[12px]">
                <p className="text-center text-[11px] uppercase tracking-widest text-white/40">Why the coach said that</p>
                {d.why.map((w) => (
                  <p key={w.kind} className="text-white/70">
                    <b className={w.kind === "strengths" ? "text-emerald-300" : "text-mcz-ember"}>
                      {w.kind === "strengths" ? "Worked:" : "To fix:"}
                    </b> {w.text}
                  </p>
                ))}
              </div>
            )}
            <p className="text-[11px] text-white/40">The score and words are the coach's own — not editable by anyone.</p>
          </div>
          <div className="space-y-2 text-center">
            <Link to={`/try/${d.app_key}${ref}`} className="neon-btn-primary mx-auto !w-auto px-8 py-4 text-base">
              {d.progress ? "📈 Start your own climb — free, no account"
                : Number(shown) >= 5 ? `🎤 Beat ${d.username ? `@${d.username}'s ` : "this "}${shown} — free, no account`
                : "🎤 Get your take scored — free, no account"}
            </Link>
            <p className="text-[12px] text-white/45">
              Upload a clip or record one.{" "}
              {d.username && join?.joinee_spinaz
                ? <>Join after through @{d.username}'s link: <span className="text-emerald-300">+{join.joinee_spinaz} 🍥</span> for you, <span className="text-emerald-300">+{join.referrer_spinaz} 🍥</span> for them.</>
                : "Join after to keep it."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
