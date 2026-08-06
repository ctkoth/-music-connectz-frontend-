// A shared playlist, readable with no account — where /pl/:id lands.
//
// This is the page a member actually sends people: one link that carries the
// whole set, whichever platform each track lives on. Sending someone to a
// Spotify link loses the four tracks that aren't on Spotify.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ExternalLink, Link2, Loader2, Music } from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";

const PROVIDER_LABEL = {
  spotify: "Spotify", youtube: "YouTube", apple: "Apple Music",
  soundcloud: "SoundCloud", bandcamp: "Bandcamp", tidal: "TIDAL",
  deezer: "Deezer", audiomack: "Audiomack", amazon: "Amazon Music",
  pandora: "Pandora", audius: "Audius", mixcloud: "Mixcloud",
  bandlab: "BandLab", distrokid: "DistroKid", tiktok: "TikTok",
  instagram: "Instagram",
};

export default function PublicPlaylist() {
  const { id } = useParams();
  const [pl, setPl] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api(`/api/playlistz/${id}/`, { auth: false })
      .then(setPl)
      .catch((e) => setErr(e.message || "That playlist isn't available."));
  }, [id]);

  const items = asList(pl?.items);

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

      {!pl && !err && (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      )}

      {pl && (
        <div className="neon-frame space-y-4 p-5">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">{pl.title}</h1>
            <p className="text-sm text-white/45">
              by <Link to={`/u/${pl.owner}`} className="hover:text-mcz-ember">@{pl.owner}</Link>
              {" · "}{pl.count} track{pl.count === 1 ? "" : "s"}
              {pl.rating != null && <span className="text-mcz-ember"> · {pl.rating}/10</span>}
            </p>
            {pl.description && (
              <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-white/80">{pl.description}</p>
            )}
          </div>

          <ol className="space-y-1.5">
            {items.map((it) => {
              const isPost = it.kind === "post";
              const href = isPost ? it.url : it.url;   // a public post's /p/ link, or the distributor
              const body = (
                <>
                  <span className="w-5 shrink-0 text-[11px] tabular-nums text-white/30">{it.position}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      {isPost
                        ? <Music size={12} className="shrink-0 text-mcz-cyan" />
                        : <Link2 size={12} className="shrink-0 text-mcz-gold" />}
                      <span className="truncate text-[13px] text-white/85">{it.title || it.url}</span>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-white/35">
                      {it.artist && <span className="truncate">{it.artist}</span>}
                      {isPost
                        ? <span className="pill !px-1.5 !py-0 !text-[9px]">Music ConnectZ</span>
                        : it.provider
                          ? <span className="pill !px-1.5 !py-0 !text-[9px]">{PROVIDER_LABEL[it.provider] || it.provider}</span>
                          : null}
                    </span>
                  </span>
                  {href && <ExternalLink size={13} className="shrink-0 text-white/25" />}
                </>
              );
              return (
                <li key={it.id}>
                  {href ? (
                    <a href={href} target={isPost ? "_self" : "_blank"} rel="noreferrer noopener"
                       className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 hover:border-mcz-ember/40">
                      {body}
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 opacity-50">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="rounded-xl border border-mcz-ember/30 bg-mcz-ember/10 p-4 text-center text-sm">
            <p className="mb-2 text-white/80">Rate this set, comment, and build your own — free.</p>
            <Link to="/register" className="inline-block rounded-xl bg-mcz-ember px-5 py-2 font-bold text-white hover:brightness-110">
              Create your account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
