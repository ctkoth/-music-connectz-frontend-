import { useEffect, useState } from "react";
import { Download, Loader2, UserRound, Upload, Wand2 } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { PROMPTZ } from "../resources.js";
import { Price } from "../components/Price.jsx";
import Doors from "../components/Doors.jsx";

// Image ConnectZ — pictures made by AI for a USE. A member picks what it's for
// (profile picture, song cover, phone wallpaper…) and the server frames the
// picture for that job: its shape, where the detail goes, whether words belong in
// it. Style, mood, colours and a title are options on top; the description is
// theirs. Nothing about a kind is typed here — the kinds, shapes, uses, styles and
// moods are /api/economy/gemini/image/.
//
// Two pictures can ride along, and they are different things:
//   * Inspiration — a picture to borrow the STYLE of, never its people or logos.
//   * Your photo — keeps your own face, only on a kind that is about you, only
//     after you say it is you. Anyone else's look goes through Inspiration.
//
// The price is on the button before it is pressed; a picture is never covered by
// the daily free prompts and the screen says so. A failed run is not charged.
const MAX_BYTES = 5 * 1024 * 1024;

const toDataUrl = (file) => new Promise((ok, no) => {
  const r = new FileReader();
  r.onload = () => ok(r.result);
  r.onerror = () => no(new Error("Couldn't read that picture."));
  r.readAsDataURL(file);
});

const ASPECT_CLASS = { "1:1": "aspect-square", "16:9": "aspect-video", "9:16": "aspect-[9/16]",
                       "21:9": "aspect-[21/9]", "4:5": "aspect-[4/5]", "3:4": "aspect-[3/4]" };

function Chips({ items, value, onPick, label }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      <button type="button" className={`pill text-[11px] ${!value ? "!border-mcz-cyan !text-mcz-cyan" : ""}`} onClick={() => onPick("")}>Any</button>
      {items.map((x) => (
        <button key={x.key} type="button" onClick={() => onPick(value === x.key ? "" : x.key)}
                className={`pill text-[11px] ${value === x.key ? "!border-mcz-cyan !text-mcz-cyan" : ""}`}>{x.label}</button>
      ))}
    </div>
  );
}

function UseIt({ work, kinds, src }) {
  const [msg, setMsg] = useState("");
  const kind = kinds.find((k) => k.key === work?.kind);
  async function setAvatar() {
    setMsg("");
    try { await api("/api/economy/profile/avatar/", { method: "POST", body: { upload_id: work.upload_id } }); setMsg("It's your profile picture now."); }
    catch (e) { setMsg(e.message || "Couldn't set it as your profile picture."); }
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {kind?.door === "avatar" && work?.upload_id && (
          <button className="neon-btn-primary !w-auto px-4 inline-flex items-center gap-1" onClick={setAvatar}>
            <UserRound size={13} /> Use as my profile picture <span className="text-emerald-300">Free</span>
          </button>
        )}
        <a className="neon-btn-ghost !w-auto px-3 py-1.5 inline-flex items-center gap-1" href={src}
           download={`${work?.kind || "image"}-${work?.id || "new"}.png`}>
          <Download size={13} /> Download <span className="text-emerald-300">Free</span>
        </a>
        {msg && <span className="text-white/70">{msg}</span>}
      </div>
      {work?.url && <Doors item={{ title: kind?.label || "Image", url: work.url, kind: "image" }} />}
    </div>
  );
}

export default function ImageConnectZ() {
  const [info, setInfo] = useState(null);
  const [kind, setKind] = useState("");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [mood, setMood] = useState("");
  const [colours, setColours] = useState("");
  const [text, setText] = useState("");
  const [refMode, setRefMode] = useState("");        // "" | "inspiration" | "me"
  const [ref, setRef] = useState(null);
  const [confirmSelf, setConfirmSelf] = useState(false);
  const [faceId, setFaceId] = useState(null);       // a saved FaceZ photo, instead of an upload
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [made, setMade] = useState(null);
  const [filter, setFilter] = useState("");

  const load = () => api("/api/economy/gemini/image/").then(setInfo).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const kinds = info?.kinds || [];
  const k = kinds.find((x) => x.key === kind);
  // A kind that is not about the member cannot carry their photo; drop it rather
  // than send something the server will refuse.
  useEffect(() => { if (refMode === "me" && !k?.likeness) { setRefMode(""); setRef(null); } }, [kind]);  // eslint-disable-line

  const pick = (f) => {
    if (f && (!f.type.startsWith("image/") || f.size > MAX_BYTES)) { setErr("Use a picture under 5MB."); return; }
    setErr(""); setRef(f);
  };

  const hasRef = refMode === "me" ? !!(ref || faceId) : !!ref;
  const ready = (prompt.trim() || kind) && (!refMode || hasRef) && (refMode !== "me" || confirmSelf);

  const make = async () => {
    if (!ready || busy) return;
    setBusy(true); setErr(""); setMade(null);
    try {
      const body = { prompt, kind, style, mood, colours, text };
      if (refMode === "me" && faceId && !ref) {
        body.reference_mode = "me"; body.confirm_self = true; body.face_id = faceId;
      } else if (refMode && ref) {
        body.reference = await toDataUrl(ref);
        if (refMode === "inspiration") body.inspiration = true;
        if (refMode === "me") { body.reference_mode = "me"; body.confirm_self = true; }
      }
      const d = await api("/api/economy/gemini/image/", { method: "POST", body, timeoutMs: 200000 });
      setMade(d); load();
    } catch (e) { setErr(`${e.message}`); } finally { setBusy(false); }
  };

  const kept = (info?.images || []).filter((i) => i.url && (!filter || i.kind === filter));

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <header className="flex items-center gap-3">
        <IconImg icon="imageconnectz.png" alt="Image ConnectZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">Image ConnectZ</h2>
          <p className="text-sm text-white/60">Pick what the picture is for and AI makes it the right shape for that job.</p>
        </div>
      </header>

      <div className="neon-frame space-y-4 p-4" data-tour="imagez-make">
        <div className="space-y-2">
          <p className="re-label">1 · What's it for?</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {kinds.map((x) => (
              <button key={x.key} type="button" onClick={() => setKind(kind === x.key ? "" : x.key)}
                      className={`rounded-xl border p-2.5 text-left transition ${kind === x.key ? "border-mcz-cyan bg-mcz-cyan/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                <span className="block text-sm font-semibold">{x.emoji} {x.label}</span>
                <span className="block text-[10px] text-white/45">{x.aspect}</span>
              </button>
            ))}
          </div>
          {k && <p className="text-[12px] text-white/60">{k.use}</p>}
        </div>

        <div className="space-y-2">
          <p className="re-label">2 · What should it show?</p>
          <textarea className="neon-input w-full" rows={3} maxLength={1000} value={prompt}
                    placeholder={k ? `Describe your ${k.label.toLowerCase()} (optional — subject, scene, feeling…)` : "Describe the picture (subject, scene, feeling…)"}
                    onChange={(e) => setPrompt(e.target.value)} />
        </div>

        <details className="space-y-2" open={!!(style || mood || colours || text)}>
          <summary className="cursor-pointer text-[12px] font-semibold text-white/75">3 · Style, mood, colours{k?.words ? ", words" : ""} (optional)</summary>
          <div className="space-y-3 pt-2">
            <div className="space-y-1"><p className="text-[11px] text-white/50">Style</p>
              <Chips items={info?.styles || []} value={style} onPick={setStyle} label="Style" /></div>
            <div className="space-y-1"><p className="text-[11px] text-white/50">Mood</p>
              <Chips items={info?.moods || []} value={mood} onPick={setMood} label="Mood" /></div>
            <input className="neon-input text-sm" maxLength={info?.colours_max || 80} value={colours}
                   placeholder="Colours, e.g. deep purple and gold" onChange={(e) => setColours(e.target.value)} aria-label="Colours" />
            {k?.words && (
              <div className="space-y-1">
                <input className="neon-input text-sm" maxLength={info?.text_max || 60} value={text}
                       placeholder="Words on it, e.g. your name and the title (optional)" onChange={(e) => setText(e.target.value)} aria-label="Words on the picture" />
                <p className="text-[11px] text-mcz-gold">{info?.words_note}</p>
              </div>
            )}
          </div>
        </details>

        <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-white/75">
          <p className="font-semibold text-white">4 · Start from a picture (optional)</p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={`pill text-[11px] ${!refMode ? "!border-mcz-cyan !text-mcz-cyan" : ""}`} onClick={() => { setRefMode(""); setRef(null); }}>None</button>
            <button type="button" className={`pill text-[11px] ${refMode === "inspiration" ? "!border-mcz-cyan !text-mcz-cyan" : ""}`} onClick={() => setRefMode("inspiration")}>✨ Inspiration</button>
            {k?.likeness && (
              <button type="button" className={`pill text-[11px] ${refMode === "me" ? "!border-mcz-cyan !text-mcz-cyan" : ""}`} onClick={() => setRefMode("me")}>🙂 My photo</button>
            )}
          </div>
          {refMode === "inspiration" && <p>{info?.inspiration_note}</p>}
          {refMode === "me" && <p>{info?.likeness_note}</p>}
          {refMode === "me" && (info?.faces || []).length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Your FaceZ photos">
              {info.faces.map((f) => (
                <button key={f.id} type="button" onClick={() => { setFaceId(faceId === f.id ? null : f.id); setRef(null); }}
                        className={`h-14 w-14 overflow-hidden rounded-lg ring-2 ${faceId === f.id ? "ring-mcz-cyan" : "ring-transparent"}`}
                        title={f.name || "FaceZ photo"}>
                  <img src={f.url} alt={f.name || "Your FaceZ photo"} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {refMode && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3 py-2">
              <Upload size={14} /><span className="min-w-0 flex-1 truncate">{ref ? ref.name : refMode === "me" ? (faceId ? "Using your FaceZ photo — or upload another" : "Upload a photo of you") : "Pick a picture for style"}</span>
              <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => { pick(e.target.files?.[0] || null); setFaceId(null); }} />
            </label>
          )}
          {refMode === "me" && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={confirmSelf} onChange={(e) => setConfirmSelf(e.target.checked)} /> This photo is of me.
            </label>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button type="button" className="neon-btn-primary !w-auto px-5 inline-flex items-center gap-1.5"
                  disabled={busy || !ready || info?.configured === false} onClick={make}>
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={15} />} Make {k ? `my ${k.label.toLowerCase()}` : "it"}
          </button>
          {info && <Price amount={info.cost_cents} emoji={PROMPTZ} />}
          <span className="text-white/40">{info?.cost_note || "Not charged if it fails"}</span>
        </div>
        {busy && <p className="text-[11px] text-white/50">Drawing — usually under a minute.</p>}
        {info?.configured === false && <p className="text-[11px] text-mcz-gold">Image ConnectZ isn't switched on yet.</p>}
        {err && <p role="alert" className="text-sm text-mcz-ember">{err}</p>}
        {made?.image && (
          <div className="space-y-2">
            <img src={made.image} alt={k?.label || "Generated"} className="w-full max-w-md rounded-xl" />
            <p className="text-[11px] text-white/45">AI-generated. Kept in Your pictures below and in FileZ.</p>
            <UseIt work={made.work || {}} kinds={kinds} src={made.image} />
          </div>
        )}
      </div>

      {(info?.images || []).length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="re-label">Your pictures</p>
            <select aria-label="Show" data-nomemo="true" className="neon-input !w-auto !py-1 text-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All kinds</option>
              {kinds.filter((x) => (info.images || []).some((i) => i.kind === x.key)).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {kept.map((i) => {
              const ik = kinds.find((x) => x.key === i.kind);
              return (
                <a key={i.id} href={i.url} target="_blank" rel="noreferrer" className="block space-y-1">
                  <img src={i.url} alt={i.prompt} title={i.prompt}
                       className={`w-full rounded-lg object-cover ${ASPECT_CLASS[ik?.aspect] || "aspect-square"}`} />
                  <span className="block truncate text-[10px] text-white/45">{ik ? `${ik.emoji} ${ik.label}` : "Free-form"} · {i.prompt}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
