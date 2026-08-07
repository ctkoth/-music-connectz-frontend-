// The PostZ format, wherever work is attached.
//
// A post, a CollabZ deal and a BattleZ challenge all carry the same thing, and
// they carry ONE OF EACH: an audio track, a video, an image, and the lyrics or
// script — together. Audio and video used to share a slot and overwrite each
// other, so a track and its video could never post as the one piece of work
// they are.
//
// Repeating this per app is how three composers end up accepting three
// different shapes; this is one, so they can't drift.
//
// Recording is offered first because it's the thing people actually do on a
// phone, and falls back to attaching a file when the browser can't record.
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Film, Image as ImageIcon, Mic, Square, Trash2, Upload } from "lucide-react";

// One of each — the order they preview in. The tag is how each renders.
const SLOTS = [["audio", "audio"], ["video", "video"], ["image", "img"]];

export default function MediaFields({ value, onChange, label = "The work" }) {
  const v = value || {};
  const set = (patch) => onChange({ ...v, ...patch });

  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [msg, setMsg] = useState("");
  const [localUrls, setLocalUrls] = useState({});
  const rec = useRef(null);
  const chunks = useRef([]);
  const audioInput = useRef(null);
  const videoInput = useRef(null);
  const imageInput = useRef(null);

  // Every object URL this component minted gets revoked on unmount — one per
  // slot now, so they're tracked by slot rather than singly.
  useEffect(() => () => Object.values(localUrls).forEach((u) => u && URL.revokeObjectURL(u)),
            [localUrls]);
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  // The blob lives here as an object URL until the caller uploads it — this
  // component doesn't own an upload endpoint and shouldn't pretend to.
  //
  // `slot` is one of audio | video | image. Replacing what's in a slot revokes
  // only that slot's URL, so attaching a video no longer silently discards the
  // audio the member just recorded.
  function attach(blob, slot) {
    setLocalUrls((cur) => {
      if (cur[slot]) URL.revokeObjectURL(cur[slot]);
      return { ...cur, [slot]: URL.createObjectURL(blob) };
    });
    const url = URL.createObjectURL(blob);
    set({ [`${slot}_url`]: url, [`${slot}_blob`]: blob });
  }

  function discardSlot(slot) {
    setLocalUrls((cur) => {
      if (cur[slot]) URL.revokeObjectURL(cur[slot]);
      const next = { ...cur }; delete next[slot]; return next;
    });
    set({ [`${slot}_url`]: "", [`${slot}_blob`]: null });
    if (slot === "audio") setSecs(0);
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

  const mmss = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">{label}</p>

      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <button type="button" className="re-btn !w-auto px-3 text-xs" onClick={startRec}>
            <Mic size={13} /> {v.audio_url ? "Record again" : "Record"}
          </button>
        ) : (
          <button type="button" className="neon-btn-primary !w-auto px-3 text-xs" onClick={stopRec}>
            <Square size={12} /> Stop · {mmss}
          </button>
        )}
        <input ref={audioInput} type="file" accept="audio/*" className="hidden"
               onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; f && attach(f, "audio"); }} />
        <button type="button" className="re-btn !w-auto px-3 text-xs"
                onClick={() => audioInput.current?.click()} disabled={recording}>
          <Upload size={13} /> Audio
        </button>
        <input ref={videoInput} type="file" accept="video/*" className="hidden"
               onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; f && attach(f, "video"); }} />
        <button type="button" className="re-btn !w-auto px-3 text-xs"
                onClick={() => videoInput.current?.click()} disabled={recording}>
          <Film size={13} /> Video
        </button>
        <input ref={imageInput} type="file" accept="image/*" className="hidden"
               onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; f && attach(f, "image"); }} />
        <button type="button" className="re-btn !w-auto px-3 text-xs"
                onClick={() => imageInput.current?.click()}>
          <ImageIcon size={13} /> Image
        </button>
      </div>

      {recording && (
        <p className="flex items-center gap-2 text-[11px] text-mcz-ember">
          <span className="h-2 w-2 animate-pulse rounded-full bg-mcz-ember" /> Recording — {mmss}
        </p>
      )}

      {/* Each slot previews with its own remove control, so clearing the
          video can't take the audio with it. */}
      {SLOTS.map(([slot, Tag]) => v[`${slot}_url`] && !recording && (
        <div key={slot} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-white/35">{slot}</span>
            <button type="button" className="text-white/30 hover:text-red-300"
                    onClick={() => discardSlot(slot)} title={`Remove the ${slot}`}>
              <Trash2 size={12} />
            </button>
          </div>
          <Tag src={v[`${slot}_url`]} controls={slot !== "image"} alt=""
               className={slot === "audio" ? "w-full" : "w-full rounded-lg"} />
        </div>
      ))}

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
