import { useEffect, useState } from "react";
import { Trash2, Link as LinkIcon, Loader2 } from "lucide-react";
import { api } from "./api.js";
import { asList } from "./shape.js";

// One frame, sized by what the server said it is.
//
// This file used to hold three near-identical copies of the same iframe —
// YouTube, Spotify, SoundCloud — each with its own hardcoded height and its own
// remove button, and **none of them sandboxed**. `widgetz.py` was written days
// later around exactly that risk, and the older path never got it: same app,
// same third-party iframes, two different postures.
//
// Both halves are fixed here. The frame is sandboxed like a page widget, and
// the provider list is the server's (`views._parse_embed_url` now resolves
// through `widgetz.PLAYERS`), so a portfolio embed and a profile widget can
// never disagree about what a link is again.
import { EMBED_SANDBOX } from "./widgetz.js";

function EmbedDisplay({ embed, onRemove, canRemove, busy }) {
  const { url, title, aspect, height } = embed;
  if (!url) return null;

  // The server sends one or the other: an aspect for a frame that scales with
  // its column, a fixed height for a player that is a bar and looks wrong
  // stretched. Falling back to 16/9 rather than a guess per provider.
  const style = aspect
    ? { aspectRatio: aspect.replace("/", " / ") }
    : height
      ? { height }
      : { aspectRatio: "16 / 9" };

  return (
    <div className="space-y-2">
      <div className="w-full overflow-hidden rounded-lg bg-black" style={style}>
        <iframe
          className="h-full w-full border-0"
          src={url}
          title={title || "Embedded player"}
          loading="lazy"
          // allow-scripts + allow-same-origin together lets a frame lift its
          // own sandbox, so the pair is never granted. Same string the widget
          // board uses — one posture, not two.
          sandbox={EMBED_SANDBOX}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      {canRemove && (
        <button
          onClick={onRemove}
          disabled={busy}
          className="flex items-center gap-1 text-xs text-white/40 hover:text-mcz-ember"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Remove
        </button>
      )}
    </div>
  );
}

// Display all embeds for a post
export default function PostEmbeds({ post, canEdit }) {
  const embeds = post.embeds || [];
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  if (!embeds.length && !canEdit) return null;

  const handleRemove = async (index) => {
    if (!canEdit) return;
    setBusy(true);
    try {
      await api("/api/economy/postz/embeds/", {
        method: "DELETE",
        body: { post_id: post.id, index },
      });
      post.embeds.splice(index, 1);
    } catch (e) {
      console.error(e);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-3 mt-4">
      <div className="font-display text-sm font-semibold text-white/80">
        🎬 Portfolio Showcase
      </div>

      <div className="space-y-3">
        {embeds.map((embed, i) => (
          <EmbedDisplay
            key={i}
            embed={embed}
            canRemove={canEdit}
            onRemove={() => handleRemove(i)}
            busy={busy}
          />
        ))}
      </div>

      {canEdit && (
        <div>
          {showAdd ? (
            <AddEmbedForm
              postId={post.id}
              onAdded={() => setShowAdd(false)}
              onCancel={() => setShowAdd(false)}
            />
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs font-semibold text-white/60 hover:text-mcz-gold flex items-center gap-1 py-1"
            >
              <LinkIcon size={14} />
              Add a track or video
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Form to add a new embed
function AddEmbedForm({ postId, onAdded, onCancel }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [players, setPlayers] = useState([]);

  // What can actually be embedded, from the server, so this list and the one
  // that resolves the link are the same list. It used to be three radio
  // buttons hardcoded here — and picking the wrong one refused a link the
  // server would have taken, because the button decided the type instead of
  // the URL.
  useEffect(() => {
    api("/api/economy/widgetz/")
      .then((d) => setPlayers(asList(d?.players)))
      .catch(() => setPlayers([]));
  }, []);

  const handleAdd = async () => {
    if (!url.trim()) {
      setErr("Paste the link first.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api("/api/economy/postz/embeds/", {
        method: "POST",
        body: { post_id: postId, url: url.trim(), title: title.trim() },
      });
      onAdded();
    } catch (e) {
      // The server's own refusal, which names what IS playable. A generic
      // "invalid URL" here would be the one error message this screen must
      // not have — the member cannot tell what to paste instead.
      setErr(e.message || "That link couldn't be added.");
    }
    setBusy(false);
  };

  return (
    <div className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <input
        type="text"
        placeholder="Paste a track, video or playlist link"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="neon-input !py-1.5 w-full text-xs"
      />
      {players.length > 0 && (
        <p className="text-[10px] text-white/35">Plays here: {players.join(" · ")}</p>
      )}

      <input
        type="text"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="neon-input !py-1.5 w-full text-xs"
        maxLength={200}
      />

      {err && <p className="text-xs text-mcz-ember">{err}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={busy}
          className="rounded bg-mcz-gold px-3 py-1.5 text-xs font-semibold text-black hover:brightness-110 disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="inline animate-spin" /> : "Add"}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="rounded bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/[0.12]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
