// A battle as a stranger sees it, from a shared /b/<id> link. Everything here is the
// server's public read (/api/economy/battlez/<id>/public/), which leaves an under-18
// member out entirely — their entry, their name as host, their win. Battles stay open to
// every age inside the app; this page only decides what the open internet is shown.
// Read-only: rating and entering live inside, and the page says so rather than offering
// a control that cannot work logged out.
import { usePageTitle } from "../pageTitle.js";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import JoinLink from "../components/JoinLink.jsx";
import TryLink from "../components/TryLink.jsx";
import { AlertCircle, Loader2, Swords, Trophy } from "lucide-react";
import { api } from "../api.js";

const KIND = { "1v1": "1v1 battle", freestyle: "Freestyle battle", cypher: "Cypher" };
const STATUS = { pending: "Waiting on the challenge to be accepted", open: "Live — entries and ratings open",
                 closed: "Closed — being judged", settled: "Settled", declined: "The challenge was declined" };

function Media({ type, url, image }) {
  if (!url) return null;
  if (String(type || "").startsWith("video")) {
    return <video src={url} poster={image || undefined} controls preload="metadata" className="w-full rounded-lg" />;
  }
  return <audio src={url} controls preload="metadata" className="w-full" />;
}

export default function PublicBattle() {
  const { id } = useParams();
  const [b, setB] = useState(null);
  const [err, setErr] = useState("");

  usePageTitle(b && b.title, b && `${KIND[b.kind] || "Battle"} on Music ConnectZ${b.host ? ` — hosted by @${b.host}` : ""}`);

  useEffect(() => {
    api(`/api/economy/battlez/${id}/public/`, { auth: false })
      .then(setB)
      .catch((e) => setErr(e.message || "That battle isn't available."));
  }, [id]);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png?v=2" alt="Music ConnectZ" className="h-9 w-9 rounded-xl shadow-neon" />
          <span className="font-display text-lg font-extrabold tracking-tight">Music ConnectZ</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-semibold text-white/70 hover:text-white">Sign in</Link>
          <JoinLink owner={b?.host} className="rounded-xl bg-mcz-ember px-4 py-2 text-sm font-bold text-white hover:brightness-110">Join free</JoinLink>
        </div>
      </header>

      {err && (
        <div className="neon-frame flex items-start gap-2 p-4 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-mcz-ember" />
          <div><p className="text-white/80">{err}</p><Link to="/" className="text-mcz-ember">Go home</Link></div>
        </div>
      )}

      {!b && !err && (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      )}

      {b && (
        <div className="neon-frame space-y-4 p-5">
          <div>
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/50">
              <Swords size={13} /> {KIND[b.kind] || "Battle"}{b.genre ? ` · ${b.genre}` : ""}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-white">{b.title}</h1>
            {b.host && (
              <p className="text-sm text-white/60">hosted by <Link to={`/u/${b.host}`} className="font-semibold text-white hover:text-mcz-cyan">@{b.host}</Link></p>
            )}
            <p className="mt-1 text-[12px] text-white/45">{STATUS[b.status] || b.status}</p>
          </div>

          {b.description && <p className="text-sm text-white/75">{b.description}</p>}
          <Media type={b.media_type} url={b.media_url} image={b.image_url} />

          {b.winner && (
            <div className="rounded-lg border border-mcz-gold/25 bg-mcz-gold/10 p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-xs text-white/60"><Trophy size={13} /> Winner</p>
              <Link to={`/u/${b.winner}`} className="font-display text-lg font-extrabold text-mcz-gold">@{b.winner}</Link>
            </div>
          )}

          {b.entries?.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-white/50">Entries</p>
              {b.entries.map((e, i) => (
                <div key={i} className="space-y-1.5 rounded-lg bg-white/5 p-3">
                  <p className="text-sm">
                    <Link to={`/u/${e.username}`} className="font-semibold text-white hover:text-mcz-cyan">@{e.username}</Link>
                    {e.title && <span className="text-white/55"> — {e.title}</span>}
                  </p>
                  <Media type={e.media_type} url={e.media_url} image={e.image_url} />
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-white/35">Rating the entries and entering happen inside, with an account.</p>

          {/* A dare a stranger can answer at the free door. Said plainly that the free take
              is their score, not a battle entry — entering needs an account. Freestyle and
              cypher battles are rap, so they open RapZ; anything else lets them pick. */}
          <div className="space-y-2 rounded-xl border border-mcz-ember/30 bg-mcz-ember/10 p-4 text-center text-sm">
            <TryLink owner={b.host} app={["freestyle", "cypher"].includes(b.kind) ? "rapz" : ""}
                     className="inline-block rounded-xl bg-mcz-ember px-5 py-2 font-bold text-white hover:brightness-110">
              ⚔️ Think you'd beat them? Get a take scored — free, no account
            </TryLink>
            <p className="text-[12px] text-white/55">
              That's your score, not an entry. Entering a battle needs an account:{" "}
              <JoinLink owner={b.host} className="text-mcz-cyan hover:underline">join Music ConnectZ</JoinLink>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
