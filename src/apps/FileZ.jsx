// FileZ — every file a member has uploaded, and somewhere to take each one.
//
// The uploads existed (GET /api/economy/uploads/) and the storage they count against
// was shown under a composer, but no screen ever listed them: a file was reachable
// only through the post it had been attached to, and one that never made it into a
// post was a quota charge with no door. This is the door.
//
// It deliberately runs NO social layer of its own. Likes, dislikes, ratings, comments,
// shares, visibility and "open in other apps" are a post's, so "Post it" hands the
// file to PostZ (where the visibility is picked and the price sits on the button) and
// a file already in a post links to that post. Two places that can be rated would be
// two medians that disagree. The server says which post a file lives in (`post`).
//
// The gallery is the Images filter, and an image becomes the profile picture from here
// in one press — the server copies it, so deleting the file later does not blank the
// avatar.
import Doors from "../components/Doors.jsx";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileAudio, FileVideo, Image as ImageIcon, File as FileIcon, Loader2, Send, Trash2, UserCircle2 } from "lucide-react";
import { api } from "../api.js";
import { handOff } from "../handoff.js";
import { goToSpot } from "../goto.js";
import { storageNote } from "../uploadWork.js";
import { ENERGY } from "../resources.js";
import { sizeLabel } from "../recorder.js";

const KINDS = [
  ["all", "All"], ["audio", "Audio"], ["video", "Video"], ["image", "Images"], ["other", "Other"],
];

export function kindOf(u) {
  const t = String(u?.content_type || "");
  if (t.startsWith("audio/")) return "audio";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("image/")) return "image";
  return "other";
}

const VIS = { public: "Public", members: "Members only", private: "Private", restricted: "Members who join" };
const ICON = { audio: FileAudio, video: FileVideo, image: ImageIcon, other: FileIcon };

function Preview({ u }) {
  const k = kindOf(u);
  if (!u.url) return null;
  if (k === "image") return <img src={u.url} alt={u.name} loading="lazy" className="max-h-56 w-full rounded-lg object-contain bg-black/30" />;
  if (k === "video") return <video src={u.url} controls preload="metadata" className="w-full rounded-lg" />;
  if (k === "audio") return <audio src={u.url} controls preload="none" className="w-full" />;
  return null;
}

export default function FileZ() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [kind, setKind] = useState("all");
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState("");

  const load = () => api("/api/economy/uploads/")
    .then((d) => { setData(d); setErr(""); })
    .catch((e) => setErr(e.message || "Couldn't load your files."));
  useEffect(() => { load(); }, []);
  // The plain post price (no skills picked), quoted on "Post it" before it is pressed.
  // PostZ re-quotes on its own button once skills are added.
  const [cost, setCost] = useState(null);
  useEffect(() => { api("/api/economy/postz/cost/").then(setCost).catch(() => setCost(null)); }, []);
  const amount = cost?.cost?.amount;

  const files = data?.uploads || [];
  const counts = useMemo(() => {
    const c = { all: files.length };
    files.forEach((u) => { const k = kindOf(u); c[k] = (c[k] || 0) + 1; });
    return c;
  }, [files]);
  const shown = kind === "all" ? files : files.filter((u) => kindOf(u) === kind);

  async function makeAvatar(u) {
    setBusy(u.id); setMsg("");
    try {
      await api("/api/economy/profile/avatar/", { method: "POST", body: { upload_id: u.id } });
      setMsg(`“${u.name}” is your profile picture now.`);
    } catch (e) { setMsg(e.message || "Couldn't set that as your picture."); }
    finally { setBusy(null); }
  }

  function postIt(u) {
    const k = kindOf(u);
    const title = String(u.name || "").replace(/\.[a-z0-9]+$/i, "").slice(0, 160);
    handOff("postz", "post-compose", { title, [`${k}_url`]: u.url });
  }

  async function remove(u) {
    const warn = u.post
      ? `“${u.name}” is in one of your posts. Deleting it leaves that post with nothing to play or show. Delete anyway?`
      : `Delete “${u.name}”? This frees ${sizeLabel(u.size_bytes)} and can't be undone.`;
    if (!window.confirm(warn)) return;
    setBusy(u.id); setMsg("");
    try {
      const s = await api(`/api/economy/uploads/${u.id}/`, { method: "DELETE" });
      setData((d) => ({ ...d, ...s, uploads: (d?.uploads || []).filter((x) => x.id !== u.id) }));
      setMsg(`Deleted “${u.name}”.`);
    } catch (e) { setMsg(e.message || "Couldn't delete that file."); }
    finally { setBusy(null); }
  }

  const used = data?.storage_used_mb || 0;
  const cap = data?.storage_mb || 0;
  const pct = cap ? Math.min(100, (used / cap) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="re-card space-y-2">
        <h2 className="font-display text-xl font-extrabold">FileZ</h2>
        <p className="text-sm text-white/60">
          Everything you've uploaded. Post a file to get likes, ratings, comments and shares on it —
          you pick who can see it in PostZ — or make an image your profile picture.
        </p>
        {data && cap > 0 && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full ${pct > 90 ? "bg-mcz-ember" : "bg-mcz-cyan"}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-white/45">
              {used.toFixed(1)}MB used. {storageNote(data)} Up to {data.upload_mb}MB a file.
            </p>
          </div>
        )}
      </div>

      {err && <p role="alert" className="text-sm text-mcz-ember">{err}</p>}
      {!data && !err && <p className="flex items-center gap-2 text-white/50"><Loader2 size={15} className="animate-spin" /> Loading…</p>}
      {msg && <p className="text-sm text-white/75" role="status">{msg}</p>}

      {data && (
        <div className="flex flex-wrap gap-2" data-tour="filez-filter">
          {KINDS.map(([k, label]) => (
            <button key={k} onClick={() => setKind(k)}
                    className={`rounded-full px-3 py-1 text-xs ${kind === k ? "bg-mcz-cyan/25 text-white" : "bg-white/5 text-white/60"}`}>
              {label} {counts[k] ? `(${counts[k]})` : ""}
            </button>
          ))}
        </div>
      )}

      {data && files.length === 0 && (
        <div className="re-card text-sm text-white/65">
          Nothing uploaded yet. Files arrive here when you attach them to a post, a battle or a deal.{" "}
          <button className="re-link" onClick={() => goToSpot("postz", "post-compose")}>Post something</button>
        </div>
      )}
      {data && files.length > 0 && shown.length === 0 && (
        <p className="text-sm text-white/50">No {KINDS.find(([k]) => k === kind)?.[1].toLowerCase()} here.</p>
      )}

      <div className={kind === "image" ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-3"} data-tour="filez-list">
        {shown.map((u) => {
          const k = kindOf(u);
          const Icon = ICON[k];
          return (
            <div key={u.id} className="re-card space-y-2">
              <p className="flex items-center gap-2 text-sm">
                <Icon size={15} className="shrink-0 text-white/50" />
                <span className="truncate font-semibold text-white" title={u.name}>{u.name}</span>
                <span className="ml-auto shrink-0 text-[11px] text-white/40">{sizeLabel(u.size_bytes)}</span>
              </p>
              <Preview u={u} />
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {u.post ? (
                  <Link to={`/p/${u.post.id}`} className="re-link">
                    In a post · {VIS[u.post.visibility] || u.post.visibility} — likes, ratings, comments →
                  </Link>
                ) : k !== "other" && u.url && (
                  <button className="re-btn !w-auto px-3 py-1 text-xs" onClick={() => postIt(u)}>
                    <Send size={12} /> Post it{" "}
                    {amount > 0 ? <span className="text-mcz-ember">−{amount} {ENERGY}</span>
                      : amount === 0 ? <span className="text-emerald-300">Free</span>
                      : <span className="text-white/55">(price on the Post button)</span>}
                  </button>
                )}
                {k === "image" && (
                  <button className="re-btn !w-auto px-3 py-1 text-xs" disabled={busy === u.id} onClick={() => makeAvatar(u)}>
                    <UserCircle2 size={12} /> Use as profile picture <span className="text-emerald-300">Free</span>
                  </button>
                )}
                <button className="ml-auto text-white/45 hover:text-mcz-ember" disabled={busy === u.id}
                        onClick={() => remove(u)} title="Delete this file" aria-label={`Delete ${u.name}`}>
                  <Trash2 size={14} />
                </button>
              </div>
              {/* Send it anywhere, or to a coach — the same bar every app uses. Post it is
                  the priced button above, so the bar leaves it out. */}
              {k !== "other" && u.url && (
                <Doors noPost item={{ title: String(u.name || "").replace(/\.[a-z0-9]+$/i, ""), url: u.url,
                                      kind: k, uploadId: u.id, postId: u.post?.id }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
