import { useState } from "react";
import { Trash2, Link as LinkIcon, Loader2 } from "lucide-react";
import { api } from "./api.js";

// Render embedded media based on type
function EmbedDisplay({ embed, onRemove, canRemove, busy }) {
  const { type, url, title } = embed;

  if (type === "youtube") {
    return (
      <div className="space-y-2">
        <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={url}
            title={title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            disabled={busy}
            className="text-xs text-white/40 hover:text-mcz-ember flex items-center gap-1"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Remove
          </button>
        )}
      </div>
    );
  }

  if (type === "spotify") {
    const isTrack = url.includes("/track/");
    const isPlaylist = url.includes("/playlist/");
    const isAlbum = url.includes("/album/");

    let height = "152px";
    if (isPlaylist) height = "380px";
    else if (isAlbum) height = "380px";

    return (
      <div className="space-y-2">
        <div className="rounded-lg overflow-hidden bg-black">
          <iframe
            src={url.replace("open.spotify.com", "open.spotify.com").replace(/\/$/, "") + (isTrack ? "?utm_source=generator" : "")}
            width="100%"
            height={height}
            frameBorder="0"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            disabled={busy}
            className="text-xs text-white/40 hover:text-mcz-ember flex items-center gap-1"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Remove
          </button>
        )}
      </div>
    );
  }

  if (type === "soundcloud") {
    return (
      <div className="space-y-2">
        <div className="rounded-lg overflow-hidden bg-black">
          <iframe
            width="100%"
            height="166"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`}
          />
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            disabled={busy}
            className="text-xs text-white/40 hover:text-mcz-ember flex items-center gap-1"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Remove
          </button>
        )}
      </div>
    );
  }

  return null;
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
              onAdded={() => {
                setShowAdd(false);
                // Post embeds will be refreshed
              }}
              onCancel={() => setShowAdd(false)}
              currentCount={embeds.length}
            />
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs font-semibold text-white/60 hover:text-mcz-gold flex items-center gap-1 py-1"
            >
              <LinkIcon size={14} />
              Add YouTube/Spotify/SoundCloud
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Form to add a new embed
function AddEmbedForm({ postId, onAdded, onCancel, currentCount }) {
  const [type, setType] = useState("youtube");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleAdd = async () => {
    if (!url.trim()) {
      setErr("URL required");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      await api("/api/economy/postz/embeds/", {
        method: "POST",
        body: {
          post_id: postId,
          type,
          url: url.trim(),
          title: title.trim() || type.charAt(0).toUpperCase() + type.slice(1),
        },
      });
      onAdded();
    } catch (e) {
      setErr(e.message || "Failed to add embed");
    }
    setBusy(false);
  };

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
      <div className="flex gap-2">
        {["youtube", "spotify", "soundcloud"].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`text-xs px-2 py-1 rounded ${
              type === t
                ? "bg-mcz-gold text-black font-semibold"
                : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08]"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder={
          type === "youtube"
            ? "https://youtube.com/watch?v=..."
            : type === "spotify"
            ? "https://open.spotify.com/track/..."
            : "https://soundcloud.com/..."
        }
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="neon-input !py-1.5 text-xs w-full"
      />

      <input
        type="text"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="neon-input !py-1.5 text-xs w-full"
        maxLength={200}
      />

      {err && (
        <p className="text-xs text-mcz-ember">{err}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={busy}
          className="text-xs font-semibold px-3 py-1.5 rounded bg-mcz-gold text-black hover:brightness-110 disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin inline" /> : "Add"}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="text-xs font-semibold px-3 py-1.5 rounded bg-white/[0.08] text-white/60 hover:bg-white/[0.12]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
