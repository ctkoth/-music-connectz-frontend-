import { useEffect, useState } from "react";

export default function TakeAnalysisDisplay({ uploadId }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uploadId) return;

    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/economy/takes/${uploadId}/analysis/`);
        if (response.ok) {
          const data = await response.json();
          setAnalysis(data);
        }
      } catch (err) {
        console.error("Failed to fetch take analysis:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [uploadId]);

  if (!analysis || analysis.analysis_status === "pending") return null;
  if (analysis.analysis_status === "failed") {
    return (
      <div className="mt-3 text-xs text-slate-400">
        Analysis unavailable: {analysis.error_message}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg bg-slate-800/30 p-4 text-sm">
      {/* Pitch Accuracy */}
      <div className="mb-3">
        <div className="text-slate-300 font-semibold mb-1">Pitch Accuracy</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-700 rounded overflow-hidden">
            <div
              className={`h-full ${analysis.overall_pitch_accuracy >= 80 ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${analysis.overall_pitch_accuracy}%` }}
            />
          </div>
          <span className={analysis.overall_pitch_accuracy >= 80 ? "text-emerald-400" : "text-amber-400"}>
            {analysis.overall_pitch_accuracy}%
          </span>
        </div>
      </div>

      {/* Weak Notes */}
      {analysis.weak_notes && analysis.weak_notes.length > 0 && (
        <div className="mb-3">
          <div className="text-slate-300 font-semibold mb-2">Weak Notes</div>
          <div className="space-y-2">
            {analysis.weak_notes.map((note, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-slate-700/50 p-2 rounded text-xs"
              >
                <div>
                  <span className="text-cyan-400 font-bold">{note.note}</span>
                  <span className="text-slate-400 ml-2">{note.freq.toFixed(0)} Hz</span>
                </div>
                <a
                  href={`/tools/tunerz?note=${encodeURIComponent(note.note)}&freq=${note.freq.toFixed(1)}&cents=${note.cents_off}`}
                  className="text-emerald-400 hover:text-emerald-300 underline"
                >
                  Practice
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timing Issues */}
      {analysis.timing_issues && (
        analysis.timing_issues.rushing_count > 0 || analysis.timing_issues.dragging_count > 0
      ) && (
        <div className="text-xs text-slate-400">
          {analysis.timing_issues.rushing_count > 0 && (
            <div>⚡ Rushing: {analysis.timing_issues.rushing_count} moments</div>
          )}
          {analysis.timing_issues.dragging_count > 0 && (
            <div>🐢 Dragging: {analysis.timing_issues.dragging_count} moments</div>
          )}
        </div>
      )}
    </div>
  );
}
