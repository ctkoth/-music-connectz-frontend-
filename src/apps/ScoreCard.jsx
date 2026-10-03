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
  usePageTitle(d ? `${d.score}/10 on ${d.label}` : "Score card", d?.verdict || "");

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
          <img src={d.image} alt={`${d.score}/10 on ${d.label}`} className="w-full rounded-2xl shadow-neon" />
          <div className="neon-frame space-y-2 p-5 text-center">
            <p className="text-sm text-white/60">
              {d.username ? <>@{d.username}'s</> : "A"} {d.label} take{d.genre ? ` · ${d.genre}` : ""}, scored by the AI coach
            </p>
            {d.verdict && <p className="text-white/85">“{d.verdict}”</p>}
            <p className="text-[11px] text-white/40">The score and words are the coach's own — not editable by anyone.</p>
          </div>
          <div className="space-y-2 text-center">
            <Link to={`/try/${d.app_key}${ref}`} className="neon-btn-primary mx-auto !w-auto px-8 py-4 text-base">
              🎤 Get your take scored — free, no account
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
