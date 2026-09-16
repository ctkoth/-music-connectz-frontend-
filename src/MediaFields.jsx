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
import { playSound } from "./sound.js";
import { useUploadLimit } from "./limits.js";
import { mediaError, bestMime, sizeLabel } from "./recorder.js";

// One of each — the order they preview in. The tag is how each renders.
const SLOTS = [["audio", "audio"], ["video", "video"], ["image", "img"]];

export default function MediaFields({ value, onChange, label = "The work" }) {
  const v = value || {};
  const set = (patch) => onChange({ ...v, ...patch });

  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [msg, setMsg] = useState("");
  // The member's own per-upload cap, from the server. This composer had no
  // size check at all: a 500MB video attached silently, the member waited
  // out the upload, and the server refused it with a 413 at the end.
  const upload = useUploadLimit();
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
    // ONE object URL, not two. This used to make a second one on the next
    // line and hand that to the caller, so every attach leaked a blob URL for
    // the life of the page — invisible, and it pins the whole file in memory.
    // Only the tracked one is revoked, so only the tracked one may exist.
    const url = URL.createObjectURL(blob);
    setLocalUrls((cur) => {
      if (cur[slot]) URL.revokeObjectURL(cur[slot]);
      return { ...cur, [slot]: url };
    });
    set({ [`${slot}_url`]: url, [`${slot}_blob`]: blob });
  }

  /** A picked file, checked before it is attached. Returns whether it landed.
   *
   *  Refusing here rather than at upload is the cost/gain rule applied to
   *  somebody's time: a file that cannot be sent should say so while they are
   *  still choosing one, not after they have watched a progress bar.
   */
  function pickFile(file, slot) {
    const why = upload.check(file);
    if (why) { setMsg(why); playSound("error"); return false; }
    setMsg("");
    // `secs` is only the duration of a browser RECORDING — an attached file's
    // own length isn't measured here. Clear it so a stale count from an
    // earlier take doesn't get printed under a file that has nothing to do
    // with it.
    if (slot === "audio") setSecs(0);
    attach(file, slot);
    return true;
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
      // Same ordered mime list BossTake's coach recorder uses, not the bare
      // browser default — see recorder.js for why the order is load-bearing.
      const mimeType = bestMime(false);
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      // A recorder that dies mid-take used to say nothing at all.
      mr.onerror = (e) => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setMsg(`The recorder stopped with an error (${e?.error?.name || "unknown"}). `
          + "Attach a file instead.");
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const total = chunks.current.reduce((n, c) => n + c.size, 0);
        // A recording that captured nothing used to become a take anyway —
        // onstop attached whatever it had, including an empty Blob, and the
        // member's next step (posting, entering a battle, attaching to a
        // deal) spent on zero bytes. Refuse it here, where the reason is
        // still knowable, the same rule BossTake's recorder already follows.
        if (!total) {
          return setMsg("That recording didn't capture anything — hold the button for a "
            + "few seconds and try again, or attach a file instead.");
        }
        attach(new Blob(chunks.current, { type: mr.mimeType || "audio/webm" }), "audio");
      };
      rec.current = mr;
      mr.start();
      setSecs(0);
      setRecording(true);
      playSound("record_start");
    } catch (err) {
      // Every failure used to be reported as "access was refused" — wrong for
      // most of them, and actively misleading for a camera or mic another
      // app is holding, or a device with none at all. See recorder.js.
      setMsg(mediaError(err, false).msg);
    }
  }

  function stopRec() {
    rec.current?.state === "recording" && rec.current.stop();
    setRecording(false);
    playSound("record_stop");
  }

  const mmss = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">{label}</p>

      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <button type="button" className="re-btn re-btn-red !w-auto px-3 text-xs" onClick={startRec}>
            <Mic size={13} /> {v.audio_url ? "Record again" : "Record"}
          </button>
        ) : (
          <button type="button" className="neon-btn-primary !w-auto px-3 text-xs" onClick={stopRec}>
            <Square size={12} /> Stop · {mmss}
          </button>
        )}
        <input ref={audioInput} type="file" accept="audio/*" className="hidden"
               onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f && pickFile(f, "audio")) playSound("upload_audio"); }} />
        <button type="button" className="re-btn re-btn-cyan !w-auto px-3 text-xs"
                onClick={() => audioInput.current?.click()} disabled={recording}>
          <Upload size={13} /> Audio
        </button>
        <input ref={videoInput} type="file" accept="video/*" className="hidden"
               onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f && pickFile(f, "video")) playSound("upload_video"); }} />
        <button type="button" className="re-btn re-btn-purple !w-auto px-3 text-xs"
                onClick={() => videoInput.current?.click()} disabled={recording}>
          <Film size={13} /> Video
        </button>
        <input ref={imageInput} type="file" accept="image/*" className="hidden"
               onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f && pickFile(f, "image")) playSound("upload_image"); }} />
        <button type="button" className="re-btn re-btn-gold !w-auto px-3 text-xs"
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
          {/* A MediaRecorder WebM carries no Duration in its header, so a
              recorded clip plays as 0:00 / 0:00 even when it's fine — the
              same confusion BossTake's recorder audit fixed there. What we
              actually counted on the way in is the only honest signal. */}
          {slot === "audio" && v.audio_blob && (
            <p className="text-[11px] text-white/45">
              {secs > 0 && <>{mmss} · </>}{sizeLabel(v.audio_blob.size)}
              <span className="text-white/30">
                {" "}— the player may show 0:00 for a browser recording; that's the file's
                header, not your take.
              </span>
            </p>
          )}
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
