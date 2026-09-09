import { useState, useEffect } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { api } from "../api.js";

/**
 * StatsZSummary — quick card showing top instrument score for ProfileZ
 */
export default function StatsZSummary() {
  const [topInstrument, setTopInstrument] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const uploads = await api("/api/economy/uploads/?limit=100");
        const stats = {};

        (uploads.results || []).forEach((u) => {
          const appKey = u.app_key || "singz";
          if (!stats[appKey]) stats[appKey] = [];
          if (u.analysis?.overall_pitch_accuracy) {
            stats[appKey].push(u.analysis.overall_pitch_accuracy);
          }
        });

        let best = null;
        Object.entries(stats).forEach(([appKey, scores]) => {
          if (scores.length > 0) {
            const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            if (!best || avg > best.score) {
              best = { appKey, score: avg, count: scores.length };
            }
          }
        });

        setTopInstrument(best);
      } catch (e) {
        // Silent fail — this is optional
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !topInstrument) return null;

  const labels = {
    singz: "🎤 SingZ",
    rapz: "🎙️ RapZ",
    guitarz: "🎸 GuitarZ",
    bassz: "🅱️ BassZ",
    keyz: "⌨️ KeyZ",
    drumz: "🥁 DrumZ",
    violinz: "🎻 ViolinZ",
  };

  return (
    <div className="neon-frame space-y-3 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
        <TrendingUp size={13} className="text-emerald-400" /> Your top instrument
      </p>
      <div className="flex items-end gap-4">
        <div>
          <p className="text-2xl font-bold text-emerald-400">{topInstrument.score}%</p>
          <p className="text-xs text-white/60">{labels[topInstrument.appKey]} average</p>
        </div>
        <p className="text-[11px] text-white/40">{topInstrument.count} take{topInstrument.count !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
