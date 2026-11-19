// Browse without an account (Corey's call): public posts, newest first, each opening its own public page.
// It decides nothing: which posts a visitor may see is `GET /api/economy/public/browse/` (public only,
// never a minor's, no member search). Every card opens /p/<id>, which already decides what a stranger
// sees of a post, and the page ends in the two doors a visitor can use: the free take and joining.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { usePageTitle } from "../pageTitle.js";

const KIND = { audio: "🎧", video: "🎬", image: "🖼️" };

export default function Explore() {
  usePageTitle("Browse music from members", "Public tracks, videos and art posted by Music ConnectZ members. No account needed to look.");
  const [posts, setPosts] = useState([]);
  const [next, setNext] = useState(undefined);   // undefined = not loaded, null = no more
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async (before) => {
    setBusy(true); setErr("");
    try {
      const d = await api(`/api/economy/public/browse/${before ? `?before=${before}` : ""}`, { auth: false });
      setPosts((p) => (before ? [...p, ...(d.posts || [])] : d.posts || []));
      setNext(d.next ?? null); setNote(d.note || "");
    } catch {
      setErr("Couldn't load posts. Check your connection and try again.");
      if (next === undefined) setNext(null);
    } finally { setBusy(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-extrabold text-mcz-cyan">Browse</h1>
        <p className="text-sm text-white/60">{note || "Public posts from members. No account needed to look."}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/try" className="neon-btn-primary !w-auto px-4">🎤 Get a free scored take</Link>
          <Link to="/register" className="re-btn !w-auto px-4">Join free</Link>
        </div>
      </header>
      {err && <p role="alert" className="text-sm text-mcz-ember">{err} <button type="button" className="underline" onClick={() => load()}>Try again</button></p>}
      {next !== undefined && !posts.length && !err && <p className="text-sm text-white/50">Nothing public here yet.</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {posts.map((p) => (
          <li key={p.id}>
            <Link to={p.open} className="block h-full rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:border-mcz-cyan/50">
              <p className="font-semibold text-white">{KIND[p.media_type] || "📝"} {p.title || "Untitled"}</p>
              <p className="text-[11px] text-white/45">@{p.author}{p.genre ? ` · ${p.genre}` : ""} · {new Date(p.created_at).toLocaleDateString()}</p>
              {p.snippet && <p className="mt-1 text-[12px] text-white/65" data-ugc="true">{p.snippet}</p>}
            </Link>
          </li>
        ))}
      </ul>
      {next && <button type="button" className="re-btn !w-auto px-4" disabled={busy} onClick={() => load(next)}>{busy ? "Loading…" : "Show more"}</button>}
    </main>
  );
}
