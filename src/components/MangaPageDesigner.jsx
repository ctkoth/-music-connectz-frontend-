// MangaZ page designer: lay the drawn panels out on a page, drag and resize them, place each
// character's lines in speech bubbles, hear the page read aloud in a voice per character, and
// export the finished page as a picture.
//
// Free, and on the device: arranging, bubbles, reading aloud and exporting cost nothing. The
// layouts ladder by Corey's numbers (Free 3, Premium 6, StatZ all — the served `imagez_layers`).
// What is saved to the page is only each panel's box and bubble positions (PATCH, free); the
// picture is saved to FileZ only when the member presses Save, which states the MB first.
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, LayoutTemplate, Save, Volume2 } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { loadLimits, TIER_LABEL } from "../limits.js";
import { LAYOUTS, defaultBubble, layoutFor, moveBox, resizeBox } from "../mangaLayouts.js";

const W = 1200, H = 1800;   // the exported page, 2:3
const VOICE_KEY = "mcz_manga_voices";

function readVoices() {
  try { return JSON.parse(localStorage.getItem(VOICE_KEY) || "{}") || {}; } catch { return {}; }
}

/** Wrap text to a width on a canvas; returns the lines. */
function wrap(ctx, text, max) {
  const words = String(text).split(/\s+/), out = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > max && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

async function localImage(url) {
  // Fetched into the tab so the export canvas can be read back (a cross-origin picture taints it).
  const r = await fetch(url);
  if (!r.ok) throw new Error("A drawn panel couldn't be fetched for the export.");
  const src = URL.createObjectURL(await r.blob());
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("A panel picture couldn't be read.")); i.src = src; });
}

export default function MangaPageDesigner({ page, chars, onSaved }) {
  const n = page.panels.length;
  const [layout, setLayout] = useState("grid");
  const [panels, setPanels] = useState(() => page.panels.map((q, i) => ({
    ...q, box: q.box || layoutFor("grid", n)[i],
    bubbles: q.bubbles?.length ? q.bubbles : q.dialogue.map((_, j) => defaultBubble(j, q.dialogue.length)),
  })));
  const [lim, setLim] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [out, setOut] = useState(null);
  const [voices, setVoices] = useState([]);
  const [castVoice, setCastVoice] = useState(readVoices);
  const pageRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => { loadLimits().then(setLim).catch(() => {}); }, []);
  useEffect(() => {
    const sync = () => setVoices(window.speechSynthesis?.getVoices?.() || []);
    sync();
    window.speechSynthesis?.addEventListener?.("voiceschanged", sync);
    return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", sync);
  }, []);

  const cap = lim && "imagez_layers" in lim ? lim.imagez_layers : null;
  const okLayouts = useMemo(() => new Set((cap == null ? LAYOUTS : LAYOUTS.slice(0, cap)).map(([k]) => k)), [cap]);

  const applyLayout = (key) => {
    if (!okLayouts.has(key)) return;
    setLayout(key);
    const boxes = layoutFor(key, n);
    setPanels((ps) => ps.map((q, i) => ({ ...q, box: boxes[i] })));
    setOut(null);
  };

  // ── dragging: a panel moves, its corner resizes it, a bubble slides inside its panel ──
  const frac = (e) => {
    const r = pageRef.current.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  const start = (e, kind, i, j) => {
    e.stopPropagation(); e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { kind, i, j, from: frac(e), box: panels[i].box, bub: j != null ? panels[i].bubbles[j] : null };
  };
  const moveDrag = (e) => {
    const g = drag.current;
    if (!g) return;
    const [fx, fy] = frac(e), dx = fx - g.from[0], dy = fy - g.from[1];
    setPanels((ps) => ps.map((q, i) => {
      if (i !== g.i) return q;
      if (g.kind === "move") return { ...q, box: moveBox(g.box, dx, dy) };
      if (g.kind === "size") return { ...q, box: resizeBox(g.box, dx, dy) };
      const [, , bw, bh] = q.box;
      return { ...q, bubbles: q.bubbles.map((b, k) => (k === g.j ? { ...b, x: Math.max(0, Math.min(1, g.bub.x + dx / bw)), y: Math.max(0, Math.min(1, g.bub.y + dy / bh)) } : b)) };
    }));
    setOut(null);
  };
  const endDrag = () => { drag.current = null; };

  const saveLayout = async () => {
    setBusy("save"); setMsg("");
    try {
      const saved = await api(`/api/economy/mangaz/${page.id}/`, { method: "PATCH", body: { panels: panels.map(({ box, bubbles, ...q }) => ({ ...q, box, bubbles })) } });
      onSaved?.(saved); setMsg("Layout saved.");
    } catch (e) { setMsg(e.message); } finally { setBusy(""); }
  };

  // ── reading aloud: each character in the device voice picked for them ──
  const voiceFor = (who) => voices.find((v) => v.voiceURI === castVoice[who]) || null;
  const pitchFor = (who) => 0.8 + ((Array.from(who).reduce((a, c) => a + c.charCodeAt(0), 0) % 7) / 10);
  const read = () => {
    const sp = window.speechSynthesis;
    if (!sp) { setMsg("This browser can't read aloud."); return; }
    sp.cancel();
    const order = panels.map((q, i) => ({ q, i })).sort((a, b) => a.q.box[1] - b.q.box[1] || a.q.box[0] - b.q.box[0]);
    for (const { q } of order) for (const d of q.dialogue) {
      const u = new SpeechSynthesisUtterance(d.line);
      const v = voiceFor(d.who);
      if (v) u.voice = v;
      u.pitch = pitchFor(d.who);
      sp.speak(u);
    }
  };
  const setCast = (who, uri) => {
    const next = { ...castVoice, [who]: uri };
    setCastVoice(next);
    try { localStorage.setItem(VOICE_KEY, JSON.stringify(next)); } catch { /* a preference, not a save */ }
  };

  // ── export: panels, borders and bubbles on one page picture ──
  const exportPage = async () => {
    setBusy("export"); setMsg("");
    try {
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      for (const q of panels) {
        const [x, y, w, h] = q.box.map((v, k) => v * (k % 2 ? H : W));
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        if (q.image) {
          const img = await localImage(q.image);
          const k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
          ctx.drawImage(img, x + (w - img.naturalWidth * k) / 2, y + (h - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
        } else {
          ctx.fillStyle = "#eee"; ctx.fillRect(x, y, w, h);
          ctx.fillStyle = "#888"; ctx.font = "28px sans-serif";
          wrap(ctx, q.action || `Panel ${q.n}`, w - 40).slice(0, 6).forEach((ln, i) => ctx.fillText(ln, x + 20, y + 50 + i * 34));
        }
        ctx.font = "bold 26px 'Comic Sans MS', 'Comic Neue', sans-serif";
        q.bubbles.forEach((b) => {
          const d = q.dialogue[b.i];
          if (!d) return;
          const lines = wrap(ctx, d.line, Math.min(320, w * 0.7));
          const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 40, bh = lines.length * 32 + 26;
          const bx = Math.min(x + w - bw - 6, Math.max(x + 6, x + b.x * w - bw / 2)), by = Math.min(y + h - bh - 6, Math.max(y + 6, y + b.y * h));
          ctx.fillStyle = "#fff"; ctx.strokeStyle = "#111"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(bx + bw / 2, by + bh / 2, bw / 2 + 6, bh / 2 + 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx + bw / 2 - 12, by + bh); ctx.lineTo(bx + bw / 2, by + bh + 28); ctx.lineTo(bx + bw / 2 + 12, by + bh - 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#111"; ctx.textAlign = "center";
          lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + 34 + i * 32));
          ctx.textAlign = "left";
        });
        ctx.restore();
        ctx.strokeStyle = "#111"; ctx.lineWidth = 6; ctx.strokeRect(x, y, w, h);
      }
      ctx.fillStyle = "#666"; ctx.font = "18px sans-serif";
      ctx.fillText(page.ai_label || "AI-made", 20, H - 12);
      const blob = await new Promise((res) => c.toBlob(res, "image/png"));
      setOut({ blob, url: URL.createObjectURL(blob) });
    } catch (e) { setMsg(e.message); } finally { setBusy(""); }
  };
  const saveToFileZ = async () => {
    setBusy("filez");
    try {
      const form = new FormData();
      form.append("file", out.blob, `manga-${page.id}.png`);
      await api("/api/economy/uploads/", { method: "POST", body: form });
      setMsg("Saved to FileZ.");
    } catch (e) { setMsg(e.message); } finally { setBusy(""); }
  };

  const speakers = [...new Set(panels.flatMap((q) => q.dialogue.map((d) => d.who)))];

  return (
    <div className="re-card space-y-3" data-tour="mangaz-designer">
      <h3 className="flex items-center gap-2 font-semibold"><LayoutTemplate size={16} /> Design the page <span className="text-xs font-normal text-emerald-300">Free</span></h3>
      <div className="flex flex-wrap gap-1.5">
        {LAYOUTS.map(([k, label]) => (
          <button key={k} type="button" disabled={!okLayouts.has(k)} onClick={() => applyLayout(k)}
            className={`pill text-[11px] ${layout === k ? "!border-mcz-cyan !text-mcz-cyan" : ""} ${okLayouts.has(k) ? "" : "opacity-50"}`}>
            {label}{okLayouts.has(k) ? "" : " — upgrade"}
          </button>
        ))}
      </div>
      {cap != null && cap < LAYOUTS.length && (
        <p className="text-[11px] text-white/50">{cap} of {LAYOUTS.length} layouts on {TIER_LABEL[lim?.tier] || "your tier"}.{" "}
          <button className="re-link" onClick={() => goToSpot("membershipz", "")}>Premium has 6; StatZ has all</button></p>
      )}
      <p className="text-[11px] text-white/45">Drag a panel to move it, its corner to resize it, and a bubble to place the line.</p>

      <div ref={pageRef} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
        className="relative mx-auto w-full max-w-md select-none overflow-hidden rounded bg-white" style={{ aspectRatio: "2 / 3", touchAction: "none" }}>
        {panels.map((q, i) => {
          const [x, y, w, h] = q.box;
          return (
            <div key={q.n} onPointerDown={(e) => start(e, "move", i)}
              className="absolute cursor-move overflow-hidden border-[3px] border-black bg-neutral-200"
              style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}>
              {q.image
                ? <img src={q.image} alt={`Panel ${q.n}`} draggable={false} className="pointer-events-none h-full w-full object-cover" />
                : <p className="p-1 text-[9px] leading-tight text-neutral-600">{q.action || `Panel ${q.n}`} — not drawn yet</p>}
              {q.bubbles.map((b, j) => q.dialogue[b.i] && (
                <div key={j} onPointerDown={(e) => start(e, "bubble", i, j)}
                  className="absolute max-w-[70%] -translate-x-1/2 cursor-grab rounded-[50%] border-2 border-black bg-white px-2 py-1 text-center text-[9px] font-bold leading-tight text-black"
                  style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, fontFamily: "'Comic Sans MS', 'Comic Neue', sans-serif" }}>
                  {q.dialogue[b.i].line}
                </div>
              ))}
              <div onPointerDown={(e) => start(e, "size", i)} title="Resize"
                className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize bg-mcz-cyan" />
            </div>
          );
        })}
      </div>

      {speakers.length > 0 && (
        <div className="space-y-1 text-xs">
          <p className="text-white/60">Voices for reading aloud (this device&apos;s voices — free):</p>
          {speakers.map((who) => (
            <label key={who} className="flex items-center gap-2"><span className="w-24 truncate">{who}</span>
              <select className="neon-input !w-auto !py-1 text-xs" data-nomemo="true" value={castVoice[who] || ""} onChange={(e) => setCast(who, e.target.value)}>
                <option value="">Default voice</option>
                {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
              </select>
            </label>
          ))}
          {chars.length > 0 && <p className="text-white/40">Each character&apos;s lines were written in their CharacterZ voice; their FaceZ look rides into every drawn panel.</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button className="re-btn !w-auto px-3" disabled={!!busy} onClick={saveLayout}><Save size={14} /> Save layout <span className="text-emerald-300">Free</span></button>
        <button className="re-btn !w-auto px-3" onClick={read}><Volume2 size={14} /> Read the page aloud</button>
        <button className="neon-btn-primary !w-auto px-3" disabled={!!busy} onClick={exportPage}><Download size={14} /> Export the page <span className="text-emerald-300">Free</span></button>
      </div>
      {out && (
        <div className="space-y-2">
          <img src={out.url} alt="Your page" className="w-full rounded" />
          <div className="flex flex-wrap gap-2">
            <a className="re-btn !w-auto px-3" href={out.url} download={`manga-${page.id}.png`}><Download size={14} /> Download</a>
            <button className="re-btn !w-auto px-3" disabled={!!busy} onClick={saveToFileZ}><Save size={14} /> Save to FileZ <span className="text-white/60">· uses {(out.blob.size / 1048576).toFixed(1)} MB of your storage</span></button>
          </div>
        </div>
      )}
      {msg && <p role="status" className="text-xs text-white/70">{msg}</p>}
    </div>
  );
}
