import { usePageTitle } from "../pageTitle.js";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AlertCircle, Loader2, Zap, TrendingUp } from "lucide-react";
import { api } from "../api.js";

export default function PublicPersona() {
  const { username, personaKey } = useParams();
  const [persona, setPersona] = useState(null);
  const [err, setErr] = useState("");

  usePageTitle(persona && persona.name, persona && `${persona.name} persona by ${username}`);

  useEffect(() => {
    api(`/api/economy/personas/${personaKey}/?username=${encodeURIComponent(username)}`, { auth: false })
      .then(setPersona)
      .catch((e) => setErr(e.message || "That persona isn't available."));
  }, [username, personaKey]);

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

      {!persona && !err && (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      )}

      {persona && (
        <article className="neon-frame p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{persona.emoji || "🎤"}</div>
            <div className="flex-1">
              <Link to={`/u/${username}`} className="text-sm font-bold text-white hover:text-mcz-cyan">
                @{username}
              </Link>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
                {persona.name}
              </h1>
            </div>
          </div>

          {persona.skills && persona.skills.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <p className="text-xs text-white/60 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Zap size={12} /> Skills
              </p>
              <div className="flex flex-wrap gap-2">
                {persona.skills.map((skill) => (
                  <span key={skill.key || skill.name} className="pill text-sm">
                    {skill.name || skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {persona.rate_per_hour != null && (
            <div className="bg-mcz-gold/10 border border-mcz-gold/20 rounded-lg p-4">
              <p className="text-xs text-white/60 mb-2">Rate per hour</p>
              <p className="font-bold text-mcz-gold text-lg flex items-center gap-2">
                <Zap size={16} /> {persona.rate_per_hour}/hr
              </p>
            </div>
          )}

          {persona.stats && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <p className="text-xs text-white/60 uppercase tracking-wider mb-3 flex items-center gap-1">
                <TrendingUp size={12} /> Stats
              </p>
              <div className="space-y-2 text-sm">
                {persona.stats.rating != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Rating</span>
                    <span className="font-bold text-mcz-gold">{persona.stats.rating}/10</span>
                  </div>
                )}
                {persona.stats.count != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Sessions</span>
                    <span className="font-bold text-white/80">{persona.stats.count}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-xs text-white/40 text-center pt-2 border-t border-white/10">
            <Link to="/register" className="text-mcz-cyan hover:underline">Join Music ConnectZ</Link> to book with this persona
          </div>
        </article>
      )}
    </div>
  );
}
