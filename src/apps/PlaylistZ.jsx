// PlaylistZ — one running order across Music ConnectZ and every distributor.
//
// A member's catalogue is scattered. Some of it is a post here; the rest is on
// Spotify, YouTube, SoundCloud, Bandcamp. Every other way to share "the set"
// makes you pick one platform and abandon the rest. This mixes them.
//
// Nothing in a list is a dead end: a post row opens the post (and its /p/ link
// works with no account), an outside row opens the distributor and tallies
// through the same counter a ProfileZ link does.
import { useEffect, useState } from "react";
import {
  ArrowDown, ArrowUp, Check, Copy, ExternalLink, Eye, EyeOff, Link2, Loader2,
  LogOut, Music, Plus, Trash2, UserPlus, Users, X,
} from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { goToSpot } from "../goto.js";
import { IconImg } from "../App.jsx";

const PROVIDER_LABEL = {
  spotify: "Spotify", youtube: "YouTube", apple: "Apple Music",
  soundcloud: "SoundCloud", bandcamp: "Bandcamp", tidal: "TIDAL",
  deezer: "Deezer", audiomack: "Audiomack", amazon: "Amazon Music",
  pandora: "Pandora", audius: "Audius", mixcloud: "Mixcloud",
  bandlab: "BandLab", distrokid: "DistroKid", tiktok: "TikTok",
  instagram: "Instagram",
};

const VISIBILITIES = [
  ["public", "Public — anyone with the link"],
  ["restricted", "Members only"],
  ["private", "Just me"],
];

function Row({ item, onUp, onDown, onRemove, canReorder, shared }) {
  const isPost = item.kind === "post";
  const open = () => {
    if (isPost) return goToSpot("social", "social-feed");
    window.open(item.url, "_blank", "noopener,noreferrer");
  };
  return (
    <li className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="w-5 shrink-0 text-[11px] tabular-nums text-white/30">{item.position}</span>
      <button
        className="min-w-0 flex-1 text-left disabled:opacity-50"
        onClick={open}
        disabled={!item.available}
        title={item.available ? "Open" : "This post was deleted"}
      >
        <span className="flex items-center gap-1.5">
          {isPost
            ? <Music size={12} className="shrink-0 text-mcz-cyan" />
            : <Link2 size={12} className="shrink-0 text-mcz-gold" />}
          <span className="truncate text-[13px] text-white/85">
            {item.title || item.url || "Untitled"}
          </span>
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-white/35">
          {item.artist && <span className="truncate">{item.artist}</span>}
          {isPost
            ? <span className="pill !px-1.5 !py-0 !text-[9px]">Music ConnectZ</span>
            : item.provider
              ? <span className="pill !px-1.5 !py-0 !text-[9px]">{PROVIDER_LABEL[item.provider] || item.provider}</span>
              : null}
          {!isPost && item.clicks > 0 && <span>{item.clicks} clicks</span>}
          {item.rating != null && <span className="text-mcz-ember">{item.rating}/10</span>}
          {/* On a shared list, "who put this here" is the first question. */}
          {shared && item.added_by && <span>added by @{item.added_by}</span>}
          {!item.available && <span className="text-mcz-ember">post deleted</span>}
        </span>
      </button>
      {!isPost && (
        <a href={item.url} target="_blank" rel="noreferrer noopener"
           className="shrink-0 text-white/25 hover:text-mcz-gold" title="Open">
          <ExternalLink size={13} />
        </a>
      )}
      <span className="flex shrink-0 items-center gap-1">
        {canReorder && (
          <>
            <button onClick={onUp} className="text-white/25 hover:text-white" title="Move up"><ArrowUp size={13} /></button>
            <button onClick={onDown} className="text-white/25 hover:text-white" title="Move down"><ArrowDown size={13} /></button>
          </>
        )}
        {/* The server decides this, not the client: the owner may remove
            anything, a collaborator only what they put in. */}
        {item.can_remove && (
          <button onClick={onRemove} className="text-white/25 hover:text-red-300" title="Remove"><Trash2 size={13} /></button>
        )}
      </span>
    </li>
  );
}

function AddTrack({ playlistId, onAdded }) {
  const [mode, setMode] = useState("link");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [posts, setPosts] = useState([]);
  const [postId, setPostId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (mode !== "post" || posts.length) return;
    api("/api/economy/postz/")
      .then((d) => setPosts(asList(d?.posts).filter((p) => p.mine)))
      .catch(() => setPosts([]));
  }, [mode, posts.length]);

  async function add() {
    setBusy(true); setMsg("");
    try {
      const body = mode === "post"
        ? { kind: "post", post_id: Number(postId) }
        : { kind: "link", url: url.trim(), title: title.trim() };
      await api(`/api/economy/playlistz/${playlistId}/items/`, { method: "POST", body });
      setUrl(""); setTitle(""); setPostId("");
      onAdded();
    } catch (e) {
      setMsg(e.message || "Couldn't add that one.");
    } finally { setBusy(false); }
  }

  const ready = mode === "post" ? !!postId : /^https?:\/\//.test(url.trim());

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex gap-2">
        <button className={`pill ${mode === "link" ? "!text-mcz-gold" : ""}`} onClick={() => setMode("link")}>
          <Link2 size={11} className="inline" /> Outside link
        </button>
        <button className={`pill ${mode === "post" ? "!text-mcz-cyan" : ""}`} onClick={() => setMode("post")}>
          <Music size={11} className="inline" /> One of my posts
        </button>
      </div>

      {mode === "link" ? (
        <>
          <input className="neon-input !py-2 text-xs" placeholder="https://open.spotify.com/track/…"
                 value={url} onChange={(e) => setUrl(e.target.value)} />
          <input className="neon-input !py-2 text-xs" placeholder="Track name (optional)"
                 value={title} onChange={(e) => setTitle(e.target.value)} />
          <p className="text-[10px] text-white/30">
            Spotify, YouTube, Apple Music, SoundCloud, Bandcamp, TIDAL, Audius and the rest —
            paste any of them. Clicks count toward your reach the same as a ProfileZ link.
          </p>
        </>
      ) : (
        <select className="neon-input !py-2 text-xs" value={postId} onChange={(e) => setPostId(e.target.value)}>
          <option value="">Pick a post…</option>
          {posts.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      )}

      <button className="neon-btn-primary !w-auto px-4" onClick={add} disabled={!ready || busy}>
        {busy ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Add to the set
      </button>
      {msg && <p className="text-[11px] text-mcz-ember">{msg}</p>}
    </div>
  );
}

function Collaborators({ pl, onChanged }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const path = `/api/economy/playlistz/${pl.id}/collaborators/`;
  const mates = asList(pl.collaborators);

  async function invite() {
    if (!name.trim()) return;
    setBusy(true); setMsg("");
    try {
      await api(path, { method: "POST", body: { username: name.trim() } });
      setName("");
      onChanged();
    } catch (e) { setMsg(e.message || "Couldn't add them."); }
    finally { setBusy(false); }
  }

  async function remove(username) {
    await api(`${path}${username ? `?username=${encodeURIComponent(username)}` : ""}`,
              { method: "DELETE" }).catch(() => {});
    onChanged();
  }

  // A collaborator sees who else is on it and a way off. Being stuck on
  // somebody else's list with no exit is not a feature.
  if (!pl.mine) {
    if (!pl.can_add) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/45">
        <Users size={12} /> You're a collaborator here — add tracks, and @{pl.owner} sets the order.
        <button className="pill !text-red-300" onClick={() => remove("")}>
          <LogOut size={11} className="inline" /> Leave
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/45">
        <Users size={12} /> Collaborators
      </p>
      {mates.length === 0 ? (
        <p className="text-[11px] text-white/35">
          Just you. Invite someone and they can add tracks — you still set the running order.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {mates.map((u) => (
            <li key={u} className="pill flex items-center gap-1">
              @{u}
              <button onClick={() => remove(u)} className="text-white/30 hover:text-red-300" title="Remove collaborator">
                <X size={10} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input className="neon-input !w-auto flex-1 !py-1.5 text-[11px]" placeholder="Username to invite"
               value={name} onChange={(e) => setName(e.target.value)}
               onKeyDown={(e) => e.key === "Enter" && invite()} />
        <button className="re-btn !w-auto px-3 text-xs" onClick={invite} disabled={busy || !name.trim()}>
          {busy ? <Loader2 className="animate-spin" size={13} /> : <UserPlus size={13} />} Invite
        </button>
      </div>
      {msg && <p className="text-[11px] text-mcz-ember">{msg}</p>}
    </div>
  );
}

function Detail({ id, onBack, onChanged }) {
  const [pl, setPl] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = () => api(`/api/economy/playlistz/${id}/`).then(setPl).catch(() => setPl(null));
  useEffect(() => { load(); }, [id]);

  if (!pl) return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>;

  const items = asList(pl.items);

  async function move(index, delta) {
    const next = [...items];
    const to = index + delta;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    setPl({ ...pl, items: next.map((it, i) => ({ ...it, position: i + 1 })) });
    await api(`/api/economy/playlistz/${id}/reorder/`, {
      method: "POST", body: { order: next.map((i) => i.id) },
    }).catch(() => {});
    load();
  }

  async function remove(itemId) {
    await api(`/api/economy/playlistz/${id}/items/${itemId}/`, { method: "DELETE" }).catch(() => {});
    load(); onChanged?.();
  }

  async function setVisibility(v) {
    await api(`/api/economy/playlistz/${id}/`, { method: "PATCH", body: { visibility: v } }).catch(() => {});
    load(); onChanged?.();
  }

  function share() {
    const url = `${window.location.origin}/pl/${id}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }, () => {});
  }

  return (
    <div className="space-y-4">
      <button className="re-btn !w-auto px-3 text-xs" onClick={onBack}>← All playlists</button>

      <div>
        <h3 className="font-display text-lg font-extrabold">{pl.title}</h3>
        <p className="text-[11px] text-white/40">
          by @{pl.owner} · {pl.post_count} from Music ConnectZ · {pl.link_count} outside
          {pl.collaborators?.length > 0 && <> · {pl.collaborators.length} collaborator{pl.collaborators.length === 1 ? "" : "s"}</>}
          {pl.rating != null && <> · <span className="text-mcz-ember">{pl.rating}/10</span></>}
        </p>
        {pl.description && <p className="mt-1 text-[12px] text-white/60">{pl.description}</p>}
      </div>

      {pl.mine && (
        <div className="flex flex-wrap items-center gap-2">
          <select className="neon-input !w-auto !py-1.5 text-[11px]" value={pl.visibility}
                  onChange={(e) => setVisibility(e.target.value)}>
            {VISIBILITIES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
          {pl.visibility === "public" && (
            <button className="re-btn !w-auto px-3 text-xs" onClick={share}>
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Link copied" : "Copy share link"}
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-[12px] text-white/40">Nothing in the set yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {items.map((it, i) => (
            <Row key={it.id} item={it} canReorder={pl.can_reorder}
                 shared={pl.collaborators?.length > 0}
                 onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => remove(it.id)} />
          ))}
        </ol>
      )}

      <Collaborators pl={pl} onChanged={() => { load(); onChanged?.(); }} />

      {/* can_add, not `mine` — a collaborator contributes to a list they don't own. */}
      {pl.can_add && <AddTrack playlistId={id} onAdded={() => { load(); onChanged?.(); }} />}
    </div>
  );
}

// Where my own work has been picked up by other people.
//
// The consent model here is opt-out, not an approval queue: a public post is
// already public, anyone refused could paste its /p/ link back in as an outside
// link anyway, and a pending-approval inbox nobody drains just leaves holes in
// other people's running orders. So the author gets levers instead of a
// gatekeeper — and this panel is where they're aimed.
function Appearances({ onOpen }) {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState("");

  const load = () => api("/api/economy/playlistz/appearances/")
    .then((d) => setRows(asList(d?.appearances)))
    .catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  async function pull(row) {
    setBusy(`i${row.item_id}`);
    await api(`/api/economy/playlistz/${row.playlist_id}/items/${row.item_id}/`,
              { method: "DELETE" }).catch(() => {});
    setBusy(""); load();
  }

  async function setAllowed(row, allowed) {
    setBusy(`p${row.post_id}`);
    await api("/api/economy/postz/", {
      method: "POST", body: { edit_id: row.post_id, allow_in_playlists: allowed },
    }).catch(() => {});
    setBusy(""); load();
  }

  if (rows === null) {
    return <p className="flex items-center gap-2 text-[11px] text-white/40">
      <Loader2 className="animate-spin" size={12} /> Checking…
    </p>;
  }
  if (!rows.length) {
    return <p className="text-[11px] text-white/35">
      None of your work is in anyone else's set yet. When it is, it shows up here —
      with a way to pull it back out.
    </p>;
  }

  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.item_id}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] text-white/85">{r.post}</span>
            <span className="block truncate text-[10px] text-white/35">
              in “{r.playlist}” by @{r.owner}
              {r.added_by && r.added_by !== r.owner && <> · added by @{r.added_by}</>}
              {" · "}{r.visibility}
            </span>
          </span>
          <button
            className={`pill !px-2 !py-0.5 !text-[10px] ${r.allow_in_playlists ? "" : "!text-mcz-ember"}`}
            onClick={() => setAllowed(r, !r.allow_in_playlists)}
            disabled={busy === `p${r.post_id}`}
            title={r.allow_in_playlists
              ? "Others may add this track — click to stop future adds"
              : "Others can't add this track — click to allow again"}
          >
            {r.allow_in_playlists ? <Eye size={10} className="inline" /> : <EyeOff size={10} className="inline" />}
            {r.allow_in_playlists ? " open" : " closed"}
          </button>
          <button className="shrink-0 text-white/25 hover:text-red-300"
                  onClick={() => pull(r)} disabled={busy === `i${r.item_id}`}
                  title="Take it out of this playlist">
            {busy === `i${r.item_id}` ? <Loader2 className="animate-spin" size={13} /> : <Trash2 size={13} />}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function PlaylistZ() {
  const [lists, setLists] = useState(null);
  const [open, setOpen] = useState(null);
  const [view, setView] = useState("lists");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api("/api/economy/playlistz/")
    .then((d) => setLists(asList(d?.playlists)))
    .catch(() => setLists([]));
  useEffect(() => { load(); }, []);

  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const pl = await api("/api/economy/playlistz/", { method: "POST", body: { title: title.trim() } });
      setTitle("");
      await load();
      setOpen(pl.id);
    } catch { /* the message surfaces on the next load */ }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="playlistz.png" alt="PlaylistZ" className="h-11 w-11 rounded-xl" />
        <div>
          <h2 className="font-display text-xl font-extrabold">PlaylistZ</h2>
          <p className="text-xs text-white/45">
            Your posts and your Spotify, YouTube, SoundCloud and Bandcamp links — one running order.
          </p>
        </div>
      </header>

      {!open && (
        <div className="flex gap-2">
          <button className={`pill ${view === "lists" ? "!text-mcz-ember" : ""}`} onClick={() => setView("lists")}>
            Playlists
          </button>
          <button className={`pill ${view === "appearances" ? "!text-mcz-ember" : ""}`} onClick={() => setView("appearances")}>
            My work in other sets
          </button>
        </div>
      )}

      {open ? (
        <Detail id={open} onBack={() => { setOpen(null); load(); }} onChanged={load} />
      ) : view === "appearances" ? (
        <Appearances onOpen={setOpen} />
      ) : (
        <>
          <div className="re-card flex flex-wrap items-center gap-2">
            <input className="neon-input !w-auto flex-1 !py-2 text-xs" placeholder="Name a new playlist"
                   value={title} onChange={(e) => setTitle(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && create()} />
            <button className="neon-btn-primary !w-auto px-4" onClick={create} disabled={busy || !title.trim()}>
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Create
            </button>
          </div>

          {lists === null ? (
            <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
          ) : lists.length === 0 ? (
            <p className="text-[12px] text-white/40">No playlists yet. Name one above and start dropping tracks in.</p>
          ) : (
            <ul className="space-y-1.5">
              {lists.map((pl) => (
                <li key={pl.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-mcz-ember/40"
                    onClick={() => setOpen(pl.id)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-white/85">{pl.title}</span>
                      <span className="block text-[10px] text-white/35">
                        @{pl.owner} · {pl.count} track{pl.count === 1 ? "" : "s"}
                        {pl.collaborators?.length > 0 && <> · shared with {pl.collaborators.length}</>}
                        {!pl.mine && pl.can_add && <span className="text-mcz-cyan"> · you can add</span>}
                        {pl.rating != null && <span className="text-mcz-ember"> · {pl.rating}/10</span>}
                      </span>
                    </span>
                    <span className="pill !px-2 !py-0.5 !text-[10px]">{pl.visibility}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
