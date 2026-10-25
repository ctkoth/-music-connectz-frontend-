import { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { PROMPTZ } from "../resources.js";

// Image ConnectZ — covers and promo pictures. Inspiration: a picture to borrow
// the STYLE of (palette, light, mood), never its people, text or logos; the
// server wraps the prompt and says so. The price is shown before Make is pressed
// and a failed run is not charged. The inspiration picture is used once, not kept.
const MAX_BYTES = 5 * 1024 * 1024;

const toDataUrl = (file) => new Promise((ok, no) => {
  const r = new FileReader();
  r.onload = () => ok(r.result);
  r.onerror = () => no(new Error("Couldn't read that picture."));
  r.readAsDataURL(file);
});

export default function ImageConnectZ() {
  const [info, setInfo] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [insp, setInsp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [made, setMade] = useState(null);

  const load = () => api("/api/economy/gemini/image/").then(setInfo).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const pick = (f) => {
    if (f && (!f.type.startsWith("image/") || f.size > MAX_BYTES)) { setErr("Use a picture under 5MB."); return; }
    setErr(""); setInsp(f);
  };

  const make = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true); setErr(""); setMade(null);
    try {
      const body = { prompt };
      if (insp) { body.reference = await toDataUrl(insp); body.inspiration = true; }
      const d = await api("/api/economy/gemini/image/", { method: "POST", body, timeoutMs: 120000 });
      setMade(d.image); load();
    } catch (e) { setErr(`${e.message}`); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <header className="flex items-center gap-3">
        <IconImg icon="imageconnectz.png" alt="Image ConnectZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">Image ConnectZ</h2>
          <p className="text-sm text-white/60">Covers and promo pictures from a description.</p>
        </div>
      </header>
      <div className="neon-frame space-y-3 p-4">
        <textarea className="neon-input w-full" rows={3} maxLength={1000} value={prompt}
                  placeholder="Describe the cover (mood, colours, subject…)" onChange={(e) => setPrompt(e.target.value)} />
        <div className="rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.05] p-3 text-xs text-white/75">
          <p className="font-semibold text-white">✨ Inspiration — make a cover like one you love</p>
          {info?.inspiration_note && <p className="mt-1">{info.inspiration_note}</p>}
          <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3 py-2">
            <Upload size={14} /><span className="min-w-0 flex-1 truncate">{insp ? insp.name : "Pick a cover for style"}</span>
            <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => pick(e.target.files?.[0] || null)} />
          </label>
          {insp && <button type="button" className="mt-1 text-white/50 underline" onClick={() => setInsp(null)}>Remove</button>}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button type="button" className="neon-btn-primary !w-auto px-5" disabled={busy || !prompt.trim()} onClick={make}>
            {busy ? <Loader2 className="animate-spin" size={16} /> : "Make it"}
          </button>
          {info && <span className="text-mcz-ember">−{info.cost_cents} {PROMPTZ}</span>}
          <span className="text-white/40">Not charged if it fails</span>
        </div>
        {err && <p className="text-sm text-red-300">{err}</p>}
        {made && <img src={made} alt="Generated" className="w-full max-w-md rounded-xl" />}
      </div>
      {info?.images?.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {info.images.filter((i) => i.url).map((i) => (
            <img key={i.id} src={i.url} alt={i.prompt} title={i.prompt} className="aspect-square w-full rounded-lg object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}
