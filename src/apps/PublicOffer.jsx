import { usePageTitle } from "../pageTitle.js";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AlertCircle, Loader2, Zap } from "lucide-react";
import { api } from "../api.js";
import MentionText from "../MentionParser.jsx";

export default function PublicOffer() {
  const { id } = useParams();
  const [offer, setOffer] = useState(null);
  const [err, setErr] = useState("");

  usePageTitle(offer && offer.title, offer && `Opportunity from ${offer.from_username}`);

  useEffect(() => {
    api(`/api/labelz/contracts/${id}/`, { auth: false })
      .then(setOffer)
      .catch((e) => setErr(e.message || "That offer isn't available."));
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

      {!offer && !err && (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      )}

      {offer && (
        <article className="neon-frame p-6 space-y-4">
          <div>
            <Link to={`/u/${offer.from_username}`} className="text-sm font-bold text-white hover:text-mcz-cyan">
              @{offer.from_username}
            </Link>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
              {offer.title}
            </h1>
          </div>

          {offer.description && (
            <div className="text-sm text-white/75 leading-relaxed">
              <MentionText text={offer.description} />
            </div>
          )}

          {offer.terms && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Terms</p>
              <div className="text-sm text-white/75 leading-relaxed">
                <MentionText text={offer.terms} />
              </div>
            </div>
          )}

          {offer.advance != null && (
            <div className="bg-mcz-gold/10 border border-mcz-gold/20 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-mcz-gold" />
                <div>
                  <p className="text-xs text-white/60">Advance</p>
                  <p className="font-bold text-mcz-gold">{offer.advance} SpinaZ</p>
                </div>
              </div>
            </div>
          )}

          {offer.status && (
            <div className="text-xs text-white/40 text-center pt-2 border-t border-white/10">
              Status: <span className="capitalize">{offer.status}</span>
            </div>
          )}

          <div className="text-xs text-white/40 text-center pt-2">
            <Link to="/register" className="text-mcz-cyan hover:underline">Join Music ConnectZ</Link> to respond to offers
          </div>
        </article>
      )}
    </div>
  );
}
