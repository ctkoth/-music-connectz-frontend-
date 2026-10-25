// The AI coach, read aloud. Shared by every screen that has AI coach words to speak
// (a scored take, a BodieZ workout read) so "the coach's voice" is one control with one
// rule: the house voice is free; Premium can sample any voice; StatZ can save one. The
// server decides all of it (/api/economy/coachvoice/) and refuses what a tier may not do.
import { useEffect, useRef, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";

export default function CoachVoice({ text }) {
  const [voices, setVoices] = useState(null);
  const [chosen, setChosen] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const audioRef = useRef(null);

  useEffect(() => {
    api("/api/economy/coachvoice/").then(setVoices).catch(() => {});
  }, []);

  async function play(voiceId) {
    setBusy(true); setErr("");
    try {
      const d = await api("/api/economy/coachvoice/speak/", {
        method: "POST", body: voiceId ? { text, voice: voiceId } : { text },
      });
      const audio = new Audio(`data:${d.mime};base64,${d.audio_b64}`);
      audioRef.current = audio;
      audio.play();
      setVoices((v) => v && { ...v, speak_used_today: d.speak_used_today, speak_remaining: d.speak_remaining });
    } catch (e) {
      setErr(e.message || "Couldn't play that.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDefault() {
    if (!chosen) return;
    try {
      const d = await api("/api/economy/coachvoice/", { method: "PATCH", body: { voice: chosen } });
      setVoices(d);
      setChosen("");
    } catch (e) {
      setErr(e.message || "Couldn't save that.");
    }
  }

  if (!voices || !text) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <button onClick={() => play(chosen || undefined)} disabled={busy}
              className="neon-btn-ghost !w-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
        Hear it — {(voices.voices.find((v) => v.id === (chosen || voices.voice)) || {}).label || "Coach Corey"}
      </button>
      {voices.can_sample && (
        <select aria-label="Coach voice to hear" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-white/70"
                value={chosen} onChange={(e) => setChosen(e.target.value)}>
          <option value="">{voices.voices.find((v) => v.id === voices.voice)?.label} (yours)</option>
          {voices.voices.filter((v) => v.id !== voices.voice).map((v) => (
            <option key={v.id} value={v.id}>{v.label} — sample</option>
          ))}
        </select>
      )}
      {!voices.can_sample && (
        <span className="text-white/35">
          Premium can sample other voices; StatZ can save one —{" "}
          <button className="re-link" onClick={() => goToSpot("membershipz")}>upgrade</button>
        </span>
      )}
      {voices.can_choose && chosen && chosen !== voices.voice && (
        <button className="re-link text-[10px]" onClick={saveDefault}>
          save as my coach's voice
        </button>
      )}
      {err && <span className="text-mcz-ember">{err}</span>}
    </div>
  );
}
