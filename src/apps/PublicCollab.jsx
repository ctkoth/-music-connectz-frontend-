import { usePageTitle } from "../pageTitle.js";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AlertCircle, Loader2, DollarSign, Users } from "lucide-react";
import { api } from "../api.js";
import MentionText from "../MentionParser.jsx";

const STATUS_LABEL = {
  draft: "Draft",
  funded: "Funded",
  delivered: "Delivered",
  released: "Released",
  disputed: "Disputed",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export default function PublicCollab() {
  const { id } = useParams();
  const [collab, setCollab] = useState(null);
  const [err, setErr] = useState("");

  usePageTitle(collab && collab.title, collab && `Collaboration by ${collab.initiator}`);

  useEffect(() => {
    api(`/api/economy/collab/${id}/`, { auth: false })
      .then(setCollab)
      .catch((e) => setErr(e.message || "That collaboration isn't available."));
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

      {!collab && !err && (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      )}

      {collab && (
        <article className="neon-frame p-6 space-y-4">
          <div>
            <Link to={`/u/${collab.initiator}`} className="text-sm font-bold text-white hover:text-mcz-cyan">
              @{collab.initiator}
            </Link>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
              {collab.title || "Untitled collaboration"}
            </h1>
            <p className="text-xs text-white/50 mt-1">
              {STATUS_LABEL[collab.status] || collab.status}
            </p>
          </div>

          {collab.description && (
            <div className="text-sm text-white/75 leading-relaxed">
              <MentionText text={collab.description} />
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
            {collab.participants && collab.participants.length > 0 && (
              <div>
                <p className="text-xs text-white/60 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Users size={12} /> Participants
                </p>
                <div className="space-y-1">
                  {collab.participants.map((p) => (
                    <Link
                      key={p.username}
                      to={`/u/${p.username}`}
                      className="block text-sm text-white/75 hover:text-mcz-cyan"
                    >
                      @{p.username}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(collab.held_cents != null || collab.held_spinaz != null) && (
              <div className="flex items-center gap-2 text-sm text-emerald-300">
                <DollarSign size={14} />
                {collab.held_cents != null && (
                  <span>${(collab.held_cents / 100).toFixed(2)} held in escrow</span>
                )}
                {collab.held_spinaz != null && (
                  <span>{collab.held_spinaz} 🍥 held in escrow</span>
                )}
              </div>
            )}
          </div>

          {collab.media_url && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              {collab.media_type === "video" ? (
                <video src={collab.media_url} controls className="w-full rounded-lg" />
              ) : (
                <audio src={collab.media_url} controls className="w-full" />
              )}
            </div>
          )}

          {collab.image_url && (
            <img src={collab.image_url} alt="" className="w-full rounded-lg" />
          )}

          <div className="text-xs text-white/40 text-center pt-2 border-t border-white/10">
            <Link to="/register" className="text-mcz-cyan hover:underline">Join Music ConnectZ</Link> to collaborate
          </div>
        </article>
      )}
    </div>
  );
}
