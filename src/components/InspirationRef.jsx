// A sound or a picture to start from — the makers' Inspiration input. One component for every
// maker that writes from a prompt (Sentence ConnectZ, Instrumental, Video, Direct, MangaZ).
// What may be picked, the ceiling and the rule ("feel only, never kept, same price") are the
// server's (/api/economy/priorities/ → reference), said before a file is chosen. The file goes up
// once, inside the request it inspires, as a data URL; nothing here stores it.
import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { usePriorityInfo } from "./PriorityDials.jsx";

const read = (file) => new Promise((ok, no) => {
  const r = new FileReader();
  r.onload = () => ok(r.result);
  r.onerror = () => no(new Error("Couldn't read that file."));
  r.readAsDataURL(file);
});

/** `value` is {name, url} or null; send `value?.url` as `reference`. */
export default function InspirationRef({ value, onChange, disabled, what = "a sound or a picture" }) {
  const info = usePriorityInfo()?.reference;
  const input = useRef(null);
  const [err, setErr] = useState("");
  if (!info) return null;                              // a failed fetch renders nothing; the maker still works
  const accept = (info.accept || []).join(",");

  async function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    setErr("");
    if (!f) return;
    if (!(info.accept || []).includes(f.type)) { setErr("That kind of file can't be used as inspiration."); return; }
    if (f.size > info.max_mb * 1024 * 1024) { setErr(`That file is over ${info.max_mb}MB — use a shorter clip or a smaller picture.`); return; }
    try { onChange({ name: f.name, url: await read(f) }); } catch (x) { setErr(x.message); }
  }

  return (
    <div className="space-y-1 rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/60" data-tour="inspiration">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-white/75">Inspiration <span className="text-white/35">(optional)</span></span>
        {value ? (
          <span className="flex items-center gap-1 rounded-full border border-mcz-cyan/40 px-2 py-0.5 text-white/80">
            {value.name}
            <button type="button" aria-label="Remove the inspiration" disabled={disabled}
              onClick={() => onChange(null)} className="text-white/40 hover:text-white"><X size={11} /></button>
          </span>
        ) : (
          <button type="button" className="re-link inline-flex items-center gap-1" disabled={disabled}
            onClick={() => input.current?.click()}>
            <ImagePlus size={12} /> Add {what} (up to {info.max_mb}MB)
          </button>
        )}
        <input ref={input} type="file" accept={accept} className="hidden" onChange={pick} />
      </div>
      {info.note && <p className="text-white/40">{info.note}</p>}
      {err && <p role="alert" className="text-mcz-ember">{err}</p>}
    </div>
  );
}
