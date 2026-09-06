import { usePageTitle } from "../pageTitle.js";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AlertCircle, Loader2, Zap } from "lucide-react";
import { api } from "../api.js";

export default function PublicBattle() {
  const { id } = useParams();
  const [battle, setBattle] = useState(null);
  const [err, setErr] = useState("");

  usePageTitle(battle && `${battle.challenger} vs ${battle.respondent}`,
               battle && `Battle result: ${battle.status}`);

  useEffect(() => {
    api(`/api/economy/battlez/${id}/`, { auth: false })
      .then(setBattle)
      .catch((e) => setErr(e.message || "That battle isn't available."));
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

      {!battle && !err && (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      )}

      {battle && (
        <div className="neon-frame p-6 space-y-4">
          <div className="text-center">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Battle</p>
            <div className="flex items-center justify-center gap-4">
              <Link to={`/u/${battle.challenger}`} className="text-sm font-bold text-white hover:text-mcz-cyan">
                @{battle.challenger}
              </Link>
              <span className="text-white/40">vs</span>
              <Link to={`/u/${battle.respondent}`} className="text-sm font-bold text-white hover:text-mcz-cyan">
                @{battle.respondent}
              </Link>
            </div>
          </div>

          {battle.status === "settled" && battle.winner && (
            <div className="bg-mcz-gold/10 border border-mcz-gold/20 rounded-lg p-4 text-center">
              <p className="text-xs text-white/60 mb-1">Winner</p>
              <Link to={`/u/${battle.winner}`} className="font-display text-lg font-extrabold text-mcz-gold hover:brightness-110">
                @{battle.winner}
              </Link>
              {battle.wager != null && (
                <p className="text-sm text-white/70 mt-2">
                  Won <Zap className="inline" size={14} /> {battle.wager}
                </p>
              )}
            </div>
          )}

          {battle.status !== "settled" && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
              <p className="text-sm text-white/60">Battle: {battle.status}</p>
            </div>
          )}

          <div className="text-xs text-white/40 text-center pt-2">
            <Link to="/register" className="text-mcz-cyan hover:underline">Join Music ConnectZ</Link> to participate in battles
          </div>
        </div>
      )}
    </div>
  );
}
