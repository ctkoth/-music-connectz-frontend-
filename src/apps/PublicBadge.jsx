import { usePageTitle } from "../pageTitle.js";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AlertCircle, Loader2, Award } from "lucide-react";
import { api } from "../api.js";
import { Medal } from "../BadgeWear.jsx";

export default function PublicBadge() {
  const { username, badgeKey } = useParams();
  const [badge, setBadge] = useState(null);
  const [err, setErr] = useState("");

  usePageTitle(badge && badge.name, badge && `${badge.name} badge earned by ${username}`);

  useEffect(() => {
    api(`/api/economy/badgez/${badgeKey}/?username=${encodeURIComponent(username)}`, { auth: false })
      .then(setBadge)
      .catch((e) => setErr(e.message || "That badge isn't available."));
  }, [username, badgeKey]);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/mcz-logo-v5.jpg" alt="Music ConnectZ" className="h-9 w-9 rounded-xl shadow-neon" />
          <span className="font-display text-lg font-extrabold tracking-tight">Music ConnectZ</span>
        </Link>
        <Link to="/register" className="rounded-xl bg-mcz-ember px-4 py-2 text-sm font-bold text-white hover:brightness-110">
          Join free
        </Link>
      </header>

      {err && (
        <div className="neon-frame flex items-start gap-2 p-4 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-mcz-ember" />
          <div><p className="text-white/80">{err}</p><Link to="/" className="text-mcz-ember">Go home</Link></div>
        </div>
      )}

      {!badge && !err && (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      )}

      {badge && (
        <article className="neon-frame p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <Medal badge={badge} className="h-16 w-16" />
            </div>
            <div className="flex-1">
              <Link to={`/u/${username}`} className="text-sm font-bold text-white hover:text-mcz-cyan">
                @{username}
              </Link>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
                {badge.name}
              </h1>
              {badge.gifted && (
                <p className="text-xs text-white/45 mt-1">Gifted achievement</p>
              )}
              {badge.temporary && (
                <p className="text-xs text-mcz-gold mt-1">Temporary — held while conditions are met</p>
              )}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
            {badge.desc && (
              <div>
                <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Description</p>
                <p className="text-sm text-white/75 leading-relaxed">{badge.desc}</p>
              </div>
            )}

            {badge.effect_note && (
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Effect</p>
                <p className="text-sm text-emerald-300 leading-relaxed">{badge.effect_note}</p>
              </div>
            )}

            {badge.how && !badge.visible && (
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-white/60 uppercase tracking-wider mb-2">How to earn</p>
                <p className="text-sm text-white/45 leading-relaxed">{badge.how}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-white/40">
            <Award size={12} />
            {badge.visible ? "Shown on profile" : "Hidden from profile"}
          </div>

          <div className="text-xs text-white/40 text-center pt-2 border-t border-white/10">
            <Link to="/register" className="text-mcz-cyan hover:underline">Join Music ConnectZ</Link> to earn badges
          </div>
        </article>
      )}
    </div>
  );
}
