// The work going back and forth on a deal.
//
// A collab IS a file exchange. The starter puts up v1; the collaborator
// downloads it, does their part, and puts up v2. Before this a deal carried one
// media URL and no way to hand anything back, so the real work happened in DMs
// and the deal only held the money — half a collaboration tool.
//
// Everyone on the deal can open every version and add the next: the person
// doing the work is usually the one who didn't start it. And versions stack
// rather than replace, because an escrowed deal exists so it can be shown what
// was delivered and when.
import { useEffect, useState } from "react";
import { Download, Loader2, Trash2, Upload } from "lucide-react";
import { api } from "./api.js";
import { asList } from "./shape.js";
import { hasBlobs, uploadWork } from "./uploadWork.js";
import MediaFields from "./MediaFields.jsx";

export default function CollabFiles({ dealId, onFlash }) {
  const [files, setFiles] = useState(null);
  const [next, setNext] = useState(1);
  const [work, setWork] = useState({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const load = () => api(`/api/economy/collab/${dealId}/files/`)
    .then((d) => { setFiles(asList(d?.files)); setNext(d?.next_version || 1); })
    .catch(() => setFiles([]));

  useEffect(() => { if (open && files === null) load(); }, [open]);

  async function send() {
    const has = work.audio_url || work.video_url || work.image_url;
    if (!has || busy) return;
    setBusy(true);
    try {
      if (hasBlobs(work)) onFlash?.("Uploading…");
      const { work: hosted } = await uploadWork(work);
      const url = hosted.audio_url || hosted.video_url || hosted.image_url;
      const media_type = hosted.audio_url ? "audio" : hosted.video_url ? "video" : "image";
      await api(`/api/economy/collab/${dealId}/files/`, {
        method: "POST", body: { url, media_type, note: note.trim() },
      });
      setWork({}); setNote("");
      onFlash?.(`Sent as v${next}.`);
      load();
    } catch (e) { onFlash?.(e.message || "That didn't go through."); }
    finally { setBusy(false); }
  }

  async function remove(f) {
    try {
      await api(`/api/economy/collab/${dealId}/files/${f.id}/`, { method: "DELETE" });
      load();
    } catch (e) { onFlash?.(e.message || "Couldn't take that back."); }
  }

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <button className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-white/45"
              onClick={() => setOpen(!open)}>
        <span>The work {files?.length ? `· ${files.length} version${files.length === 1 ? "" : "s"}` : ""}</span>
        <span className="text-white/30">{open ? "hide" : "show"}</span>
      </button>

      {open && (files === null ? (
        <p className="flex items-center gap-2 text-[11px] text-white/40">
          <Loader2 className="animate-spin" size={12} /> Loading…
        </p>
      ) : (
        <>
          {files.length === 0 ? (
            <p className="text-[12px] text-white/40">Nothing yet — put the first file up.</p>
          ) : (
            <ul className="space-y-1.5">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-2 rounded border border-white/10 bg-black/20 p-2">
                  <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/70">
                    v{f.version}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-white/60">
                    {f.name || f.media_type || "file"}
                    <span className="text-white/30"> · @{f.uploader}</span>
                    {f.note && <span className="text-white/40"> — {f.note}</span>}
                  </span>
                  {/* Everyone on the deal can open every version. A file you
                      can see the name of but not open is not a handoff. */}
                  <a href={f.url} download target="_blank" rel="noreferrer"
                     className="shrink-0 text-white/40 hover:text-mcz-cyan" title="Download this version">
                    <Download size={13} />
                  </a>
                  {f.mine && (
                    <button className="shrink-0 text-white/30 hover:text-red-300"
                            onClick={() => remove(f)} title="Take this version back">
                      <Trash2 size={12} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <MediaFields value={work} onChange={setWork} label={`Send version ${next}`} />
          <input className="neon-input !py-1.5 text-xs" placeholder="What changed? (optional)"
                 value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="re-btn !w-auto px-3 text-xs" onClick={send}
                  disabled={busy || !(work.audio_url || work.video_url || work.image_url)}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {" "}Send v{next} <span className="text-emerald-300">Free</span>
          </button>
        </>
      ))}
    </div>
  );
}
