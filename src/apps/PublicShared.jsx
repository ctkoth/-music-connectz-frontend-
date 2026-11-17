// A shared piece — where /x/:token lands. Anything a maker made (a picture, video, manga
// page, written piece or FileZ file) that its maker chose to share. Readable with no
// account; signed-in members get the whole social bar under it (karma, reactions, ratings,
// comments, share, open in another app). The server decides what is shared; this renders it.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import JoinLink from "../components/JoinLink.jsx";
import SocialBar from "../components/SocialBar.jsx";
import { api, tokenStore } from "../api.js";

export default function PublicShared() {
  const { token } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const signedIn = !!tokenStore.get();
  useEffect(() => {
    api(`/api/economy/sharez/${token}/`, { auth: false }).then(setD).catch((e) => setErr(e.message || "This link isn't shared any more."));
  }, [token]);
  return (
    <div className="mx-auto min-h-screen max-w-2xl space-y-4 px-4 py-8">
      <header className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png?v=2" alt="Music ConnectZ" className="h-9 w-9 rounded-xl shadow-neon" />
          <span className="font-display font-extrabold">Music ConnectZ</span>
        </Link>
        {!signedIn && <JoinLink owner={d?.owner} className="rounded-xl bg-mcz-ember px-4 py-2 text-sm font-bold text-white">Join free</JoinLink>}
      </header>
      {err && <p className="text-mcz-ember">{err}</p>}
      {d && (
        <article className="re-card space-y-3">
          <h1 className="font-display text-2xl font-extrabold">{d.title}</h1>
          <p className="text-xs text-white/50">A {d.label} by @{d.owner}{d.ai_made ? " · AI-made" : ""}</p>
          {d.media && d.media_kind === "image" && <img src={d.media} alt={d.title} className="w-full rounded-xl" />}
          {d.media && d.media_kind === "video" && <video src={d.media} controls className="w-full rounded-xl" />}
          {d.media && d.media_kind === "audio" && <audio src={d.media} controls className="w-full" />}
          {d.text && <pre className="whitespace-pre-wrap font-sans text-sm text-white/85">{d.text}</pre>}
          {signedIn ? <SocialBar item={d.item} /> : (
            <p className="text-sm text-white/60">Sign in to react, rate, comment or open it in your own apps. <Link className="re-link" to="/login">Sign in</Link></p>
          )}
        </article>
      )}
    </div>
  );
}
