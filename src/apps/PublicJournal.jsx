import { usePageTitle } from "../pageTitle.js";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AlertCircle, Loader2, Calendar, MapPin } from "lucide-react";
import { api } from "../api.js";
import MentionText from "../MentionParser.jsx";

export default function PublicJournal() {
  const { id } = useParams();
  const [entry, setEntry] = useState(null);
  const [err, setErr] = useState("");

  usePageTitle(entry && entry.title, entry && `Journal entry from ${entry.author}`);

  useEffect(() => {
    api(`/api/economy/journalz/${id}/`, { auth: false })
      .then(setEntry)
      .catch((e) => setErr(e.message || "That entry isn't available."));
  }, [id]);

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

      {!entry && !err && (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      )}

      {entry && (
        <article className="neon-frame p-6 space-y-4">
          <div>
            <Link to={`/u/${entry.author}`} className="text-sm font-bold text-white hover:text-mcz-cyan">
              @{entry.author}
            </Link>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
              {entry.title || `Entry from ${entry.day}`}
            </h1>
            <p className="flex items-center gap-2 text-xs text-white/50 mt-1">
              <Calendar size={12} /> {entry.day}
              {entry.mood && <span>· Mood: {entry.mood}</span>}
            </p>
          </div>

          {entry.place_name && (
            <p className="flex items-center gap-2 text-sm text-white/60">
              <MapPin size={14} className="text-mcz-cyan" /> {entry.place_name}
            </p>
          )}

          {entry.body && (
            <div className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">
              <MentionText text={entry.body} />
            </div>
          )}

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span key={tag} className="pill text-xs">{tag}</span>
              ))}
            </div>
          )}

          {entry.items && entry.items.length > 0 && (
            <div className="space-y-2">
              {entry.items.map((item, i) => (
                <div key={i}>
                  {item.kind === "audio" && (
                    <audio src={item.url} controls className="w-full" />
                  )}
                  {item.kind === "video" && (
                    <video src={item.url} controls className="w-full rounded-lg" />
                  )}
                  {item.kind === "image" && (
                    <img src={item.url} alt="" className="w-full rounded-lg" />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-white/40 text-center pt-2 border-t border-white/10">
            <Link to="/register" className="text-mcz-cyan hover:underline">Join Music ConnectZ</Link> to write your own journal
          </div>
        </article>
      )}
    </div>
  );
}
