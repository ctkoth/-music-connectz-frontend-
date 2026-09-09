import { useState, useEffect } from "react";
import { Loader2, BarChart3 } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";

/**
 * StatsZ — cross-instrument dashboard showing your takes and scores
 * across all apps (SingZ, RapZ, GuitarZ, etc.)
 */
export default function StatsZ() {
  const [instruments, setInstruments] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const INSTRUMENTS = [
    ["singz", "🎤 SingZ", "singing"],
    ["rapz", "🎙️ RapZ", "rapping"],
    ["guitarz", "🎸 GuitarZ", "guitar"],
    ["bassz", "🅱️ BassZ", "bass"],
    ["keyz", "⌨️ KeyZ", "keyboards"],
    ["drumz", "🥁 DrumZ", "drums"],
    ["violinz", "🎻 ViolinZ", "violin"],
  ];

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMsg("");
      try {
        const uploads = await api("/api/economy/uploads/?limit=100");
        const stats = {};

        // Group uploads by app_key (instrument)
        (uploads.results || []).forEach((u) => {
          const appKey = u.app_key || "singz";
          if (!stats[appKey]) {
            stats[appKey] = { takes: [], best_score: null, avg_score: null };
          }
          stats[appKey].takes.push(u);
          
          // Track best score (if analysis exists)
          if (u.analysis?.overall_pitch_accuracy) {
            if (!stats[appKey].best_score || u.analysis.overall_pitch_accuracy > stats[appKey].best_score) {
              stats[appKey].best_score = u.analysis.overall_pitch_accuracy;
            }
          }
        });

        // Calculate averages
        Object.keys(stats).forEach((k) => {
          const scores = stats[k].takes
            .filter((t) => t.analysis?.overall_pitch_accuracy)
            .map((t) => t.analysis.overall_pitch_accuracy);
          if (scores.length > 0) {
            stats[k].avg_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
          }
        });

        setInstruments(stats);
      } catch (e) {
        setMsg(e.message || "Couldn't load stats.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  const hasData = Object.keys(instruments).length > 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="statsz.png" alt="StatsZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">StatsZ</h2>
          <p className="text-sm text-white/60">Your cross-instrument progress dashboard</p>
        </div>
      </header>

      {msg && (
        <div className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 p-3 text-sm text-mcz-ember">
          {msg}
        </div>
      )}

      {!hasData ? (
        <div className="neon-frame space-y-3 p-6 text-center">
          <BarChart3 size={24} className="mx-auto text-white/40" />
          <p className="text-white/60">No takes yet. Post a take in any instrument to see stats here.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["singz", "🎤 SingZ", "singing"],
            ["rapz", "🎙️ RapZ", "rapping"],
            ["guitarz", "🎸 GuitarZ", "guitar"],
            ["bassz", "🅱️ BassZ", "bass"],
            ["keyz", "⌨️ KeyZ", "keyboards"],
            ["drumz", "🥁 DrumZ", "drums"],
            ["violinz", "🎻 ViolinZ", "violin"],
          ].map(([key, label, description]) => {
            const stats = instruments[key];
            if (!stats) return null;

            return (
              <div key={key} className="neon-frame space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">{label}</p>
                  <span className="text-[11px] text-white/40">{stats.takes.length} take{stats.takes.length !== 1 ? "s" : ""}</span>
                </div>

                <div className="space-y-2">
                  {stats.best_score !== null && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/40">Best pitch accuracy</p>
                      <p className="text-2xl font-bold text-mcz-cyan">{stats.best_score}%</p>
                    </div>
                  )}
                  {stats.avg_score !== null && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/40">Average</p>
                      <p className="text-lg text-white/80">{stats.avg_score}%</p>
                    </div>
                  )}
                  {!stats.best_score && (
                    <p className="text-xs text-white/50">Takes not yet analyzed</p>
                  )}
                </div>

                <button className="w-full rounded-lg border border-mcz-cyan/30 py-2 text-xs font-semibold text-mcz-cyan hover:bg-mcz-cyan/10 transition">
                  View takes →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
