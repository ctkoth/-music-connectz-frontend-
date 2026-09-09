import { useState, useEffect } from "react";
import { Loader2, Send, Briefcase, Users } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";

/**
 * OpportunitieZ — feed of what other musicians are seeking,
 * so collaborators and promoters can find matches.
 */
export default function OpportunitieZ() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [offset, setOffset] = useState(0);

  const loadMore = () => setOffset(o => o + 50);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMsg("");
      try {
        const data = await api(`/api/economy/opportunitiez/?offset=${offset}&limit=50`);
        setOpportunities((prev) =>
          offset === 0 ? data.results : [...prev, ...data.results]
        );
        if (!data.results?.length) {
          setMsg(offset === 0 ? "No opportunities yet." : "No more opportunities.");
        }
      } catch (e) {
        setMsg(e.message || "Couldn't load opportunities.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [offset]);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Briefcase size={40} className="text-mcz-cyan" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">OpportunitieZ</h2>
          <p className="text-sm text-white/60">What musicians are seeking — find your next collab</p>
        </div>
      </header>

      {msg && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center text-sm text-white/60">
          {msg}
        </div>
      )}

      {!opportunities.length && loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-white/50" size={24} />
        </div>
      ) : opportunities.length === 0 ? (
        <div className="neon-frame space-y-3 p-6 text-center">
          <Briefcase size={24} className="mx-auto text-white/40" />
          <p className="text-white/60">Musicians will appear here once they fill out "What I Need" on their ProfileZ.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {opportunities.map((opp) => (
            <div key={opp.id} className="neon-frame space-y-3 p-4">
              <div className="flex items-start gap-3">
                {opp.avatar ? (
                  <img src={opp.avatar} alt={opp.username} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <IconImg icon="personaz.png" alt="" className="h-12 w-12 rounded-full" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-white">
                    @{opp.username}
                    <span className="ml-2 text-[11px] font-normal text-white/40 uppercase tracking-wider">
                      {opp.tier}
                    </span>
                  </p>
                  <p className="text-[11px] text-white/50">Updated {new Date(opp.updated_at).toLocaleDateString()}</p>
                </div>
                <button className="re-btn !w-auto px-3 py-1.5 !text-xs">
                  <Send size={12} /> Message
                </button>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-3">
                {opp.help_needed && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-mcz-cyan">Needs</p>
                    <p className="text-white">{opp.help_needed}</p>
                  </div>
                )}
                {opp.status && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/40">Building</p>
                    <p className="text-white/80">{opp.status}</p>
                  </div>
                )}
                {opp.current_reach && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/40">Reach</p>
                    <p className="text-white/70">{opp.current_reach}</p>
                  </div>
                )}
                {opp.rate && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-mcz-gold">Rate</p>
                    <p className="text-mcz-gold">{opp.rate}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {opportunities.length > 0 && !msg && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="neon-btn-primary !w-full disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin inline mr-2" size={16} /> : "Load more"}
        </button>
      )}
    </div>
  );
}
