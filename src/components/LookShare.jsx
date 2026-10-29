// LookZMaxZ invites and shares. Nobody is scored from a photo somebody else uploads: you send an
// invite, the other person gets THEIR OWN reading, and only they can choose to show it to you.
// Every word of the rules is the server's (/api/economy/lookmaxz/invite/, /share/); a share is made
// from the server-signed reading the coach answered with, never from anything typed here.
import { useEffect, useState } from "react";
import { Copy, Loader2, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { RatingRow } from "./Rating.jsx";

export function InviteRate({ username }) {
  const [d, setD] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (username) api(`/api/economy/lookmaxz/invite/${encodeURIComponent(username)}/`).then(setD).catch(() => setD(null));
  }, [username]);
  if (!d) return null;
  const link = `${window.location.origin}${d.link}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${d.share_text} ${link}`); setCopied(true); } catch { setCopied(false); }
  };
  return (
    <section className="neon-frame space-y-2 p-4" data-tour="lookmax-invite">
      <h3 className="text-sm font-bold text-white">💌 Invite someone to get their own reading</h3>
      <p className="text-[12px] leading-snug text-white/65">{d.rule}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-white/5 px-2 py-1 text-[11px] text-white/70">{link}</code>
        <button type="button" className="re-btn !w-auto px-3 text-[12px]" onClick={copy}><Copy size={12} /> {copied ? "Copied" : "Copy invite"}</button>
      </div>
      <p className="text-[11px] text-white/40">Free to send. They pay for their own reading, and if they join from it you get the usual invite credit.</p>
    </section>
  );
}

export function ShareReading({ reading, note, prefillTo = "", photoKept = false, onShared }) {
  const [to, setTo] = useState(prefillTo);
  const [showPhoto, setShowPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);
  async function share() {
    setBusy(true); setErr("");
    try {
      const s = await api("/api/economy/lookmaxz/share/", { method: "POST", body: { reading, to: to.trim(), show_photo: photoKept && showPhoto } });
      setDone(s); onShared?.(s);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  if (done) {
    return (
      <section className="neon-frame space-y-1 p-4" role="status">
        <p className="text-sm text-emerald-300">Shared{done.to ? ` with @${done.to} — they've been notified` : ""}.</p>
        {!done.to && <p className="text-[12px] text-white/60">Link for any verified adult: <code>{`${window.location.origin}/lookmaxz?look=${done.token}`}</code></p>}
        <p className="text-[11px] text-white/40">Take it down any time under "Your shared readings".</p>
      </section>
    );
  }
  return (
    <section className="neon-frame space-y-2 p-4" data-tour="lookmax-share">
      <h3 className="text-sm font-bold text-white">Share this reading?</h3>
      <p className="text-[12px] leading-snug text-white/60">{note}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input className="neon-input !w-48 text-sm" placeholder="@who (blank = link)" aria-label="Who to show it to"
          value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" className="re-btn !w-auto px-3 text-[12px]" disabled={busy} onClick={share}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : null} Share my reading
        </button>
        <span className="text-[11px] text-emerald-300">Free</span>
      </div>
      {photoKept && (
        <label className="flex items-center gap-2 text-[12px] text-white/70">
          <input type="checkbox" checked={showPhoto} onChange={(e) => setShowPhoto(e.target.checked)} /> Show my photo with it
        </label>
      )}
      {err && <p role="alert" className="text-[12px] text-mcz-ember">{err}</p>}
    </section>
  );
}

function PostIt({ token, hasPhoto }) {
  const [vis, setVis] = useState("public");
  const [photo, setPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [err, setErr] = useState("");
  if (done) return <p className="text-[12px] text-emerald-300">Posted to PostZ{done.visibility !== "public" ? ` (${done.visibility})` : ""}.</p>;
  async function post() {
    setBusy(true); setErr("");
    try { setDone(await api(`/api/economy/lookmaxz/share/${token}/post/`, { method: "POST", body: { visibility: vis, photo: hasPhoto && photo } })); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px]">
      <select className="neon-input !w-auto !py-1 text-[12px]" aria-label="Who sees the post" data-nomemo="true" value={vis} onChange={(e) => setVis(e.target.value)}>
        <option value="public">Everyone</option><option value="restricted">Members</option><option value="private">Only me</option>
      </select>
      {hasPhoto && (
        <label className="flex items-center gap-1 text-white/70">
          <input type="checkbox" checked={photo} onChange={(e) => setPhoto(e.target.checked)} /> with my photo
        </label>
      )}
      <button type="button" className="re-btn !w-auto px-3 text-[12px]" disabled={busy} onClick={post}>Post my results</button>
      <span className="text-white/40">Free · the numbers and the coach's words{hasPhoto ? ", and the photo if ticked" : ""}</span>
      {err && <span role="alert" className="text-mcz-ember">{err}</span>}
    </div>
  );
}

export function SharedLook({ s, onDelete }) {
  return (
    <section className="neon-frame space-y-2 p-4">
      <p className="text-[11px] uppercase tracking-widest text-white/45">
        {s.mine ? (s.to ? `You shared this with @${s.to}` : "You shared this by link") : `@${s.username} shared their reading`}
      </p>
      {s.photo_url && <img src={s.photo_url} alt={`The photo @${s.username} had read`} className="max-h-72 rounded-lg" />}
      <RatingRow value={s.overall} outOf size="lg" label="Overall — plain average of the sectors read" detail={s.verdict} />
      <div className="grid gap-2 sm:grid-cols-2">
        {Object.entries(s.sectors || {}).map(([k, sec]) => (
          <RatingRow key={k} value={sec.score} outOf label={`${sec.emoji} ${sec.label}`}
            detail={Object.values(sec.factors || {}).filter((f) => f.score != null).map((f) => `${f.label} ${f.score}`).join(" · ")} />
        ))}
      </div>
      {s.working?.length > 0 && <ul className="list-disc pl-5 text-[12px] text-emerald-200/90">{s.working.map((w, i) => <li key={i}>{w}</li>)}</ul>}
      <p className="text-[11px] leading-snug text-white/40">{s.caveat} Their own photo, their own choice to share — the photo shows only when they chose to show it.</p>
      {s.mine && <PostIt token={s.token} hasPhoto={!!s.photo_url} />}
      {s.mine && onDelete && (
        <button type="button" className="re-link inline-flex items-center gap-1 text-[12px] text-mcz-ember" onClick={() => onDelete(s.token)}>
          <Trash2 size={12} /> Take it down
        </button>
      )}
    </section>
  );
}

export function SharesPanel({ look }) {
  const [d, setD] = useState(null);
  const [one, setOne] = useState(null);
  const [err, setErr] = useState("");
  const load = () => api("/api/economy/lookmaxz/share/").then(setD).catch(() => setD(null));
  useEffect(() => {
    load();
    window.addEventListener("mcz-lookshares-refresh", load);
    return () => window.removeEventListener("mcz-lookshares-refresh", load);
  }, []);
  useEffect(() => {
    if (!look) return;
    api(`/api/economy/lookmaxz/share/${encodeURIComponent(look)}/`).then(setOne).catch((e) => setErr(e.message));
  }, [look]);
  async function remove(token) {
    try { await api(`/api/economy/lookmaxz/share/${token}/`, { method: "DELETE" }); setOne(null); load(); }
    catch (e) { setErr(e.message); }
  }
  const toMe = d?.to_me || [];
  const mine = d?.mine || [];
  if (!one && !err && !toMe.length && !mine.length) return null;
  return (
    <div className="space-y-3" data-tour="lookmax-shares">
      {err && <p role="alert" className="text-sm text-mcz-ember">{err}</p>}
      {one && <SharedLook s={one} onDelete={remove} />}
      {toMe.filter((s) => s.token !== one?.token).length > 0 && <h3 className="text-sm font-bold text-white">Shared with you</h3>}
      {toMe.filter((s) => s.token !== one?.token).map((s) => <SharedLook key={s.token} s={s} />)}
      {mine.length > 0 && (
        <details className="neon-frame p-4">
          <summary className="cursor-pointer text-sm font-bold text-white">Your shared readings ({mine.length})</summary>
          <div className="mt-2 space-y-2">{mine.map((s) => <SharedLook key={s.token} s={s} onDelete={remove} />)}</div>
        </details>
      )}
    </div>
  );
}
