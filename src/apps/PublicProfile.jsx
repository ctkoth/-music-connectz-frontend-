// A member's public card, readable without an account.
//
// It exists so the author line on a shared post goes somewhere. A name that
// isn't a link is a dead end, and a dead end is the one thing this app is not
// allowed to have.
//
// It shows the WORK — skills, what they charge, bio, links. Not the person:
// birthday, location, gender, attractiveness and substances stay behind the
// login, because those exist for matching inside the app and are nobody's
// business from outside it. The server enforces that; this page just renders
// what it sends.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { BadgeWear, BadgeWearList } from "../BadgeWear.jsx";

const money = (cents) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

export default function PublicProfile() {
  const { username } = useParams();
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api(`/api/economy/public/members/${encodeURIComponent(username)}/`, { auth: false })
      .then(setP)
      .catch((e) => setErr(e.message || "That member isn't available."));
  }, [username]);

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

      {!p && !err && (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      )}

      {p && (
        <div className="neon-frame space-y-4 p-5">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">{p.display_name}</h1>
            <p className="text-sm text-white/45">@{p.username}</p>
            {/* A shared profile is somebody's proof they are worth hiring.
                The badge travels with it; what it pays does not — the server
                leaves the effect off a card a stranger can read. */}
            <BadgeWear badges={p.badges} title={p.badge_title} size="h-6 w-6"
                       className="pt-1.5" />
          </div>

          {p.bio && (
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-white/80">{p.bio}</p>
          )}

          {p.personas?.map((persona, i) => (
            <div key={i}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
                {persona.name || persona.key}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {(persona.skills || []).map((s, j) => (
                  <span key={j} className="pill">
                    {s.name}
                    {s.rate_cents ? (
                      <span className="ml-1 text-mcz-gold">{money(s.rate_cents)}/hr</span>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          ))}

          <BadgeWearList badges={p.badges} />

          {p.links?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {p.links.map((l, i) => (
                <a key={i} href={typeof l === "string" ? l : l.url} target="_blank" rel="noreferrer noopener"
                   className="pill hover:text-mcz-ember">
                  {typeof l === "string" ? l : l.label || l.url}
                </a>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-mcz-ember/30 bg-mcz-ember/10 p-4 text-center text-sm">
            <p className="mb-2 text-white/80">
              Message {p.display_name}, rate their work, or book a CallZ — that all lives inside.
            </p>
            <Link to="/register" className="inline-block rounded-xl bg-mcz-ember px-5 py-2 font-bold text-white hover:brightness-110">
              Create your account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
