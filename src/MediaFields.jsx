// The PostZ format, wherever work is attached.
//
// A post, a CollabZ deal and a BattleZ challenge all carry the same thing:
// audio or video (recorded here or uploaded), an image, and the lyrics or
// script. Repeating that per app is how three composers end up accepting three
// different shapes; this is one, so they can't drift.
//
// Recording is offered first because it's the thing people actually do on a
// phone, and falls back to attaching a file when the browser can't record.
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Image as ImageIcon, Mic, Square, Trash2, Upload } from "lucide-react";

export default function MediaFields({ value, onChange, label = "The work" }) {
  const v = value || {};
  const set = (patch) => onChange({ ...v, ...patch });

  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [msg, setMsg] = useState("");
  const [localUrl, setLocalUrl] = useState("");
  const rec = useRef(null);
  const chunks = useRef([]);
  const fileInput = useRef(null);
  const imageInput = useRef(null);

  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  // The blob lives here as an object URL until the caller uploads it — this
  // component doesn't own an upload endpoint and shouldn't pretend to.
  function attach(blob, type) {
    if (localUrl) URL.revokeObjectURL(localUrl);
    const url = URL.createObjectURL(blob);
    setLocalUrl(url);
    set({ media_type: type, media_url: url, media_blob: blob });
  }

  async function startRec() {
    setMsg("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return setMsg("This browser can't record. Attach a file instead.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        attach(new Blob(chunks.current, { type: mr.mimeType || "audio/webm" }), "audio");
      };
      rec.current = mr;
      mr.start();
      setSecs(0);
      setRecording(true);
    } catch {
      setMsg("Microphone access was refused. Attach a file instead.");
    }
  }

  function stopRec() {
    rec.current?.state === "recording" && rec.current.stop();
    setRecording(false);
  }

  function discard() {
    if (localUrl) URL.revokeObjectURL(localUrl);
    setLocalUrl("");
    set({ media_type: "", media_url: "", media_blob: null });
    setSecs(0);
  }

  const mmss = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">{label}</p>

      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <button type="button" className="re-btn !w-auto px-3 text-xs" onClick={startRec}>
            <Mic size={13} /> {v.media_url ? "Record again" : "Record"}
          </button>
        ) : (
          <button type="button" className="neon-btn-primary !w-auto px-3 text-xs" onClick={stopRec}>
            <Square size={12} /> Stop · {mmss}
          </button>
        )}
        <input ref={fileInput} type="file" accept="audio/*,video/*" className="hidden"
               onChange={(e) => {
                 const f = e.target.files?.[0]; e.target.value = "";
                 if (f) attach(f, f.type.startsWith("video/") ? "video" : "audio");
               }} />
        <button type="button" className="re-btn !w-auto px-3 text-xs"
                onClick={() => fileInput.current?.click()} disabled={recording}>
          <Upload size={13} /> Audio / video
        </button>
        <input ref={imageInput} type="file" accept="image/*" className="hidden"
               onChange={(e) => {
                 const f = e.target.files?.[0]; e.target.value = "";
                 if (f) set({ image_url: URL.createObjectURL(f), image_blob: f });
               }} />
        <button type="button" className="re-btn !w-auto px-3 text-xs"
                onClick={() => imageInput.current?.click()}>
          <ImageIcon size={13} /> Image
        </button>
        {v.media_url && (
          <button type="button" className="re-btn !w-auto px-2 text-xs !text-red-300" onClick={discard}>
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {recording && (
        <p className="flex items-center gap-2 text-[11px] text-mcz-ember">
          <span className="h-2 w-2 animate-pulse rounded-full bg-mcz-ember" /> Recording — {mmss}
        </p>
      )}

      {v.media_url && !recording && (
        v.media_type === "video"
          ? <video src={v.media_url} controls className="w-full rounded-lg" />
          : <audio src={v.media_url} controls className="w-full" />
      )}
      {v.image_url && <img src={v.image_url} alt="" className="w-full rounded-lg" />}

      <textarea className="neon-input !py-2 text-xs" rows={3}
                placeholder="Lyrics or script (optional)"
                value={v.lyrics || ""} onChange={(e) => set({ lyrics: e.target.value })} />

      {msg && (
        <p className="flex items-start gap-1.5 text-[11px] text-mcz-ember">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {msg}
        </p>
      )}
    </div>
  );
}
