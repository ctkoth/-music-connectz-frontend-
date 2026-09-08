import { useState, useEffect } from "react";
import { Loader2, Music, AlertCircle } from "lucide-react";
import { api } from "./api.js";

export default function SoundCloudEngagement() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [kind, setKind] = useState("like");
  const [trackUrl, setTrackUrl] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [trackId, setTrackId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    setLoading(true);
    try {
      const res = await api("/api/economy/soundcloud/engagement/");
      setState(res);
      setErr("");
    } catch (e) {
      setErr(e.message || "Failed to load engagement state");
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!trackUrl.trim() || !trackId.trim()) {
      setErr("Track URL and ID required");
      return;
    }

    if (!trackUrl.includes("soundcloud.com")) {
      setErr("Must be a SoundCloud track URL");
      return;
    }

    setSubmitting(true);
    setErr("");
    try {
      const res = await api("/api/economy/soundcloud/engagement/", {
        method: "POST",
        body: {
          kind,
          track_url: trackUrl.trim(),
          track_title: trackTitle.trim(),
          track_id: trackId.trim(),
        },
      });

      setTrackUrl("");
      setTrackId("");
      setTrackTitle("");
      await loadState();

      // Show toast for reward
      if (res.reward.energy || res.reward.spinaz) {
        console.log(
          `+${res.reward.energy}⚡ +${res.reward.spinaz}🍥 for ${kind}!`
        );
      }
    } catch (e) {
      const msg = e.message || "Failed to record engagement";
      if (msg.includes("already rewarded")) {
        setErr(`Already rewarded for ${kind} on this track`);
      } else if (msg.includes("limit")) {
        setErr(`Daily ${kind} limit reached`);
      } else {
        setErr(msg);
      }
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/50">
        <Loader2 className="animate-spin" size={16} />
        Loading engagement state…
      </div>
    );
  }

  if (!state) return null;

  const remaining = state.caps_remaining || {};
  const rewards = state.rewards || {};

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Music size={16} className="text-mcz-gold" />
          <h3 className="font-display text-sm font-semibold text-white/90">
            🎵 SoundCloud Engagement Rewards
          </h3>
        </div>

        <p className="text-xs text-white/50 mb-3">
          Your SoundCloud audience is your audience here too. Earn{" "}
          <span className="text-emerald-300">⚡</span> and{" "}
          <span className="text-emerald-300">🍥</span> for engagement on your
          tracks.
        </p>

        {/* Daily Caps */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {["like", "repost", "comment"].map((k) => (
            <div key={k} className="rounded bg-white/[0.03] p-2 text-center">
              <p className="text-[11px] uppercase tracking-widest text-white/40">
                {k === "like"
                  ? "👍"
                  : k === "repost"
                  ? "🔁"
                  : "💬"}{" "}
                {k}
              </p>
              <p className="text-sm font-bold text-emerald-300">
                {remaining[k] ?? 0}
              </p>
              <p className="text-[10px] text-white/30">left today</p>
            </div>
          ))}
        </div>

        {err && (
          <div className="mb-3 flex items-start gap-2 rounded bg-mcz-ember/10 p-2 text-xs text-mcz-ember">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            <p>{err}</p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-2">
          <div className="flex gap-1">
            {["like", "repost", "comment"].map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`flex-1 text-xs py-1 rounded font-semibold ${
                  kind === k
                    ? "bg-mcz-gold text-black"
                    : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08]"
                }`}
              >
                {k === "like"
                  ? "👍 Like"
                  : k === "repost"
                  ? "🔁 Repost"
                  : "💬 Comment"}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="https://soundcloud.com/artist/track-name"
            value={trackUrl}
            onChange={(e) => setTrackUrl(e.target.value)}
            className="neon-input !py-2 text-xs w-full"
          />

          <input
            type="text"
            placeholder="Track ID (from URL or API)"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            className="neon-input !py-2 text-xs w-full"
          />

          <input
            type="text"
            placeholder="Track title (optional)"
            value={trackTitle}
            onChange={(e) => setTrackTitle(e.target.value)}
            className="neon-input !py-2 text-xs w-full"
          />

          <button
            onClick={handleSubmit}
            disabled={submitting || remaining[kind] <= 0}
            className="w-full rounded bg-mcz-gold px-3 py-2 text-xs font-semibold text-black hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={12} className="animate-spin inline mr-1" />
            ) : null}
            Record {kind}
          </button>

          {remaining[kind] <= 0 && (
            <p className="text-[11px] text-mcz-ember">
              {kind === "like"
                ? "20"
                : kind === "repost"
                ? "2"
                : "5"}{" "}
              daily {kind} limit reached
            </p>
          )}
        </div>

        {/* Reward display */}
        <div className="mt-3 rounded bg-white/[0.03] p-2">
          <p className="text-[11px] uppercase tracking-widest text-white/40 mb-1">
            Rewards for {kind}
          </p>
          <div className="flex gap-2 text-sm font-bold">
            <span className="text-emerald-300">
              +{rewards[kind]?.energy || 0} ⚡
            </span>
            <span className="text-emerald-300">
              +{rewards[kind]?.spinaz || 0} 🍥
            </span>
          </div>
        </div>
      </div>

      {/* Recent Engagements */}
      {state.recent_engagements?.length > 0 && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-2">
            Recent Engagements
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {state.recent_engagements.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] py-1">
                <span className="text-white/60">
                  {e.kind === "like"
                    ? "👍"
                    : e.kind === "repost"
                    ? "🔁"
                    : "💬"}
                </span>
                <span className="flex-1 truncate text-white/50">
                  {e.track_title || e.track_url}
                </span>
                <span className="text-white/30">
                  {new Date(e.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
