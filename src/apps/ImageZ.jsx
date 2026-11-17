// ImageZ — a layered image editor in the Photoshop mould, on the member's own
// device. Image, text, paint and fill layers; opacity, blend modes, hide, lock,
// reorder, duplicate, merge down; per-layer adjustments; move, brush, eraser and
// crop; undo. A pen tablet (Wacom and the like) draws with pressure, and the
// pen's eraser end erases.
//
// The cost/gain line is the whole price: FREE, because nothing leaves the device
// until Save to FileZ, and Save says the MB it uses before it is pressed.
//
// The edits are layers.js's and the drawing is render.js's; this file is wiring and words.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown, ArrowUp, Brush, Copy, Crop, Download, Eraser, Eye, EyeOff, FolderOpen, ImagePlus, Layers, Lock,
  Merge, Move, PaintBucket, Plus, Redo2, Save, Trash2, Type, Undo2, Unlock,
} from "lucide-react";
import { api } from "../api.js";
import { onHandoff } from "../handoff.js";
import { IconImg } from "../App.jsx";
import Doors from "../components/Doors.jsx";
import {
  ADJ0, ADJ_RANGE, BLENDS, MAX_LAYERS, PRESETS, addLayer, addStroke, below, crop, cropRect, duplicateLayer,
  fitImage, layerOf, moveLayer, newDoc, pick, removeLayer, resizeCanvas, uid, updateLayer,
} from "../imageedit/layers.js";
import { exportDoc, loadImage, renderDoc } from "../imageedit/render.js";

const HISTORY = 60;
const SIZES = [["1080×1080 · square post", 1080, 1080], ["1080×1920 · story", 1080, 1920], ["1920×1080 · cover", 1920, 1080], ["3000×3000 · album art", 3000, 3000]];
const ADJ_LABEL = { brightness: "Brightness", contrast: "Contrast", saturate: "Saturation", hue: "Hue", blur: "Blur", grayscale: "Grayscale", sepia: "Sepia", invert: "Invert" };

function Library({ onAdd, onClose }) {
  const [files, setFiles] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api("/api/economy/uploads/")
      .then((d) => setFiles((d.uploads || []).filter((u) => (u.content_type || "").startsWith("image/") && u.url && !u.missing)))
      .catch((e) => setErr(e.message));
  }, []);
  return (
    <div className="glass-card space-y-2 p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Your images in FileZ</h3>
        <button className="text-xs text-white/60" onClick={onClose}>Close</button>
      </div>
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
      {files && !files.length && <p className="text-xs text-white/50">No images in FileZ yet.</p>}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {(files || []).map((u) => (
          <button key={u.id} className="overflow-hidden rounded-lg border border-white/10 hover:border-mcz-cyan" onClick={() => onAdd(u)} title={u.name}>
            <img src={u.url} alt={u.name} className="aspect-square w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ImageZ() {
  const [doc, setDoc] = useState(() => newDoc(1080, 1080));
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [sel, setSel] = useState(null);
  const [tool, setTool] = useState("move");
  const [brush, setBrush] = useState({ color: "#ff2fb4", size: 24 });
  const [penSeen, setPenSeen] = useState(false);
  const [cropBox, setCropBox] = useState(null);
  const [lib, setLib] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [fmt, setFmt] = useState("image/png");
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(null);
  const canvas = useRef(null);
  const images = useRef(new Map());
  const drag = useRef(null);
  const docRef = useRef(doc);
  docRef.current = doc;

  const commit = useCallback((fn) => {
    setDoc((d) => {
      const next = fn(d);
      if (next === d) return d;
      setPast((p) => [...p.slice(-HISTORY + 1), d]);
      setFuture([]);
      setResult(null); setSaved(null);
      return next;
    });
  }, []);
  const undo = () => past.length && (setFuture((f) => [doc, ...f]), setDoc(past.at(-1)), setPast((p) => p.slice(0, -1)));
  const redo = () => future.length && (setPast((p) => [...p, doc]), setDoc(future[0]), setFuture((f) => f.slice(1)));

  const draw = useCallback((d = docRef.current) => {
    const c = canvas.current;
    if (!c) return;
    if (c.width !== d.w) c.width = d.w;
    if (c.height !== d.h) c.height = d.h;
    const ctx = c.getContext("2d");
    renderDoc(ctx, d, images.current, { checker: true });
    const live = drag.current;
    if (live?.kind === "paint") {
      // The stroke in progress, drawn over the top until it is committed on release.
      const tmp = addStroke(d, live.id, live.stroke);
      renderDoc(ctx, tmp, images.current, { checker: true });
    }
    const box = live?.kind === "crop" ? cropRect(d, live.a, live.b) : cropBox;
    if (box) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, d.w, box.y); ctx.fillRect(0, box.y + box.h, d.w, d.h - box.y - box.h);
      ctx.fillRect(0, box.y, box.x, box.h); ctx.fillRect(box.x + box.w, box.y, d.w - box.x - box.w, box.h);
      ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = Math.max(2, d.w / 400);
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.restore();
    }
  }, [cropBox]);
  useEffect(() => { draw(doc); }, [doc, draw]);

  const addImageFrom = useCallback(async (src, name) => {
    setErr("");
    const img = await loadImage(src);
    images.current.set(src, img);
    commit((d) => {
      // The first picture on an untouched canvas sets the canvas to its size.
      let base = d;
      const fresh = d.layers.length === 1 && d.layers[0].kind === "fill" && !past.length;
      if (fresh) base = resizeCanvas(d, Math.min(img.naturalWidth, 4096), Math.min(img.naturalHeight, 4096), "topleft");
      const fit = fitImage(base, img.naturalWidth, img.naturalHeight);
      const id = uid();
      setSel(id);
      return addLayer(base, { kind: "image", id, name: (name || "Image").slice(0, 60), src, w: img.naturalWidth, h: img.naturalHeight, ...fit }, sel);
    });
  }, [commit, past.length, sel]);

  const openFiles = async (list) => {
    for (const f of Array.from(list || [])) {
      if (!f.type.startsWith("image/")) { setErr(`${f.name} isn't an image.`); continue; }
      try { await addImageFrom(URL.createObjectURL(f), f.name); } catch (e) { setErr(e.message); }
    }
  };
  const fromLibrary = async (u) => {
    setLib(false); setBusy("Opening…");
    try {
      // Fetched into the tab: a canvas that draws a cross-origin picture can't be exported.
      const r = await fetch(u.url);
      if (!r.ok) throw new Error(r.status === 404 || r.status === 410 ? "That file isn't on the server any more." : `Couldn't fetch it (${r.status}).`);
      await addImageFrom(URL.createObjectURL(await r.blob()), u.name);
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };
  useEffect(() => onHandoff("imagez", (p) => {
    if (p?.url) fromLibrary({ url: p.url, name: p.name || p.title || "Image" });
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const layer = sel ? layerOf(doc, sel) : null;
  const patch = (p) => sel && commit((d) => updateLayer(d, sel, p));
  const add = (spec) => {
    if (doc.layers.length >= MAX_LAYERS) { setErr(`A picture holds up to ${MAX_LAYERS} layers — merge some down first.`); return; }
    const id = uid();
    commit((d) => addLayer(d, { ...spec, id }, sel));
    setSel(id);
  };

  // ── pointer: move, brush, eraser, crop. Pen pressure comes from Pointer Events. ──
  const at = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * doc.w, ((e.clientY - r.top) / r.height) * doc.h];
  };
  const pressureOf = (e) => (e.pointerType === "pen" ? (e.pressure || 0.01) : undefined);
  const down = (e) => {
    if (e.button > 0 && e.button !== 5) return;
    canvas.current.setPointerCapture(e.pointerId);
    if (e.pointerType === "pen" && !penSeen) setPenSeen(true);
    const p = at(e);
    // A Wacom's eraser end reports button 5 / buttons bit 32: it erases whatever tool is picked.
    const penEraser = e.pointerType === "pen" && (e.button === 5 || (e.buttons & 32));
    if (tool === "brush" || tool === "eraser" || penEraser) {
      let id = sel;
      if (!layer || layer.kind !== "paint") {
        if (penEraser || tool === "eraser") { setErr("Pick a paint layer to erase on — the eraser only takes back brush work."); return; }
        id = uid();
        commit((d) => addLayer(d, { kind: "paint", id }, sel));
        setSel(id);
      } else if (layer.locked) { setErr("That layer is locked."); return; }
      drag.current = { kind: "paint", id, stroke: { ...brush, erase: penEraser || tool === "eraser", points: [[...p, pressureOf(e)].filter((v) => v !== undefined)] } };
    } else if (tool === "crop") {
      drag.current = { kind: "crop", a: p, b: p };
      setCropBox(null);
    } else {
      const id = pick(doc, p[0], p[1]) || (layer && !layer.locked && layer.kind !== "fill" ? sel : null);
      if (!id) return;
      setSel(id);
      const l = layerOf(doc, id);
      drag.current = { kind: "move", id, from: p, x: l.x, y: l.y, moved: false };
    }
    draw();
  };
  const move = (e) => {
    const g = drag.current;
    if (!g) return;
    if (g.kind === "paint") {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of evs.length ? evs : [e]) g.stroke.points.push([...at(ev), pressureOf(ev)].filter((v) => v !== undefined));
    } else if (g.kind === "crop") g.b = at(e);
    else {
      const p = at(e);
      const dx = Math.round(p[0] - g.from[0]), dy = Math.round(p[1] - g.from[1]);
      if (!g.moved) { g.moved = true; setPast((h) => [...h.slice(-HISTORY + 1), docRef.current]); setFuture([]); }
      setDoc((d) => updateLayer(d, g.id, { x: g.x + dx, y: g.y + dy }));
      return;
    }
    draw();
  };
  const up = () => {
    const g = drag.current;
    drag.current = null;
    if (!g) return;
    if (g.kind === "paint") commit((d) => addStroke(d, g.id, g.stroke));
    else if (g.kind === "crop") setCropBox(cropRect(doc, g.a, g.b));
    else if (g.moved) { setResult(null); setSaved(null); }
    draw();
  };

  const mergeDown = async () => {
    const low = below(doc, sel);
    if (!layer || !low) return;
    setBusy("Merging…");
    try {
      const blob = await exportDoc(doc, images.current, "image/png", 1, new Set([sel, low.id]));
      const src = URL.createObjectURL(blob);
      images.current.set(src, await loadImage(src));
      const id = uid();
      commit((d) => {
        // The merged layer takes the pair's place in the stack, not the top.
        const at = d.layers.findIndex((l) => l.id === sel);
        const rest = removeLayer(removeLayer(d, sel), low.id);
        const merged = addLayer({ ...rest, layers: [] }, { kind: "image", id, name: low.name, src, w: d.w, h: d.h }).layers[0];
        const layers = [...rest.layers];
        layers.splice(at, 0, merged);
        return { ...rest, layers };
      });
      setSel(id);
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };

  const doExport = async () => {
    setBusy("Exporting…"); setErr("");
    try {
      const blob = await exportDoc(doc, images.current, fmt);
      setResult({ blob, url: URL.createObjectURL(blob), ext: fmt === "image/png" ? "png" : "jpg" });
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };
  const save = async () => {
    if (!result) return;
    setBusy("Saving to FileZ…"); setErr("");
    try {
      const form = new FormData();
      form.append("file", result.blob, `imagez-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}.${result.ext}`);
      const res = await api("/api/economy/uploads/", { method: "POST", body: form });
      setSaved(res?.upload || null);
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };

  const tools = [["move", Move, "Move"], ["brush", Brush, "Brush"], ["eraser", Eraser, "Eraser"], ["crop", Crop, "Crop"]];
  const icon = { image: ImagePlus, text: Type, paint: Brush, fill: PaintBucket };

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-4">
        <IconImg icon="imagez.png" alt="ImageZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">ImageZ</h2>
          <p className="text-sm text-white/60">A layered image editor on your device — pictures, text and paint on as many layers as you need, with blend modes and adjustments.</p>
        </div>
      </header>
      <p className="text-xs text-white/60">
        <span className="text-emerald-300">Free.</span> Everything runs on your device and nothing is uploaded until you press Save to FileZ.
        A pen tablet (Wacom and similar) draws with pressure, and the pen&apos;s eraser end erases.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="re-btn !w-auto cursor-pointer px-3"><ImagePlus size={14} /> Open image
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { openFiles(e.target.files); e.target.value = ""; }} />
        </label>
        <button className="re-btn !w-auto px-3" onClick={() => setLib(true)}><FolderOpen size={14} /> From FileZ</button>
        <select className="neon-input !w-auto" data-nomemo="true" value="" onChange={(e) => {
          const s = SIZES[+e.target.value]; if (!s) return;
          setSel(null); setPast((p) => [...p, doc]); setFuture([]); setDoc(newDoc(s[1], s[2])); setCropBox(null);
        }}>
          <option value="">New canvas…</option>
          {SIZES.map(([label], i) => <option key={label} value={i}>{label}</option>)}
        </select>
        <span className="text-xs text-white/50">{doc.w}×{doc.h}</span>
        <button className="re-btn !w-auto px-2" disabled={!past.length} onClick={undo} title="Undo"><Undo2 size={14} /></button>
        <button className="re-btn !w-auto px-2" disabled={!future.length} onClick={redo} title="Redo"><Redo2 size={14} /></button>
        {busy && <span className="text-xs text-white/60">{busy}</span>}
      </div>
      {lib && <Library onAdd={fromLibrary} onClose={() => setLib(false)} />}
      {err && <p className="text-sm text-mcz-ember">{err}</p>}

      <div className="grid gap-4 lg:grid-cols-[auto_1fr_18rem]">
        <div className="flex flex-row gap-1 lg:flex-col">
          {tools.map(([k, I, label]) => (
            <button key={k} title={label} onClick={() => { setTool(k); if (k !== "crop") setCropBox(null); }}
              className={`re-btn !w-auto px-2 ${tool === k ? "!border-mcz-cyan text-mcz-cyan" : ""}`}><I size={16} /></button>
          ))}
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex justify-center rounded-xl border border-white/10 bg-black/40 p-2">
            <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              className="max-h-[70vh] max-w-full" style={{ touchAction: "none", cursor: tool === "move" ? "move" : "crosshair", aspectRatio: `${doc.w} / ${doc.h}` }} />
          </div>
          {(tool === "brush" || tool === "eraser") && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {tool === "brush" && <label className="flex items-center gap-1">Colour <input type="color" value={brush.color} onChange={(e) => setBrush({ ...brush, color: e.target.value })} /></label>}
              <label className="flex items-center gap-1">Size <input type="range" min="1" max="300" value={brush.size} onChange={(e) => setBrush({ ...brush, size: +e.target.value })} /> {brush.size}px</label>
              <span className="text-white/50">{penSeen ? "Pen detected — pressure sets the width." : "With a pen tablet, pressure sets the width; a mouse draws at full size."}</span>
            </div>
          )}
          {tool === "crop" && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white/60">{cropBox ? `${cropBox.w}×${cropBox.h}` : "Drag on the picture to choose what to keep."}</span>
              <button className="neon-btn-primary !w-auto px-3" disabled={!cropBox} onClick={() => { commit((d) => crop(d, cropBox)); setCropBox(null); }}>Crop</button>
              {cropBox && <button className="re-btn !w-auto px-3" onClick={() => setCropBox(null)}>Cancel</button>}
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="glass-card space-y-2 p-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1 font-semibold"><Layers size={14} /> Layers <span className="text-xs text-white/40">{doc.layers.length}/{MAX_LAYERS}</span></h3>
              <div className="flex gap-1">
                <button className="re-btn !w-auto px-2" title="Paint layer" onClick={() => add({ kind: "paint" })}><Plus size={14} /></button>
                <button className="re-btn !w-auto px-2" title="Text layer" onClick={() => add({ kind: "text", x: Math.round(doc.w * 0.1), y: Math.round(doc.h * 0.1), size: Math.round(doc.h / 10) })}><Type size={14} /></button>
                <button className="re-btn !w-auto px-2" title="Fill layer" onClick={() => add({ kind: "fill", color: brush.color, opacity: 50 })}><PaintBucket size={14} /></button>
              </div>
            </div>
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {doc.layers.map((l) => {
                const I = icon[l.kind];
                return (
                  <li key={l.id} onClick={() => setSel(l.id)}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1 text-sm ${sel === l.id ? "border-mcz-cyan bg-mcz-cyan/10" : "border-white/10"}`}>
                    <button title={l.visible ? "Hide" : "Show"} onClick={(e) => { e.stopPropagation(); commit((d) => updateLayer(d, l.id, { visible: !l.visible })); }}>
                      {l.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-white/40" />}
                    </button>
                    <I size={14} className="text-white/50" />
                    <span className={`flex-1 truncate ${l.visible ? "" : "text-white/40"}`}>{l.name}</span>
                    <button title={l.locked ? "Unlock" : "Lock"} onClick={(e) => { e.stopPropagation(); commit((d) => updateLayer(d, l.id, { locked: !l.locked })); }}>
                      {l.locked ? <Lock size={12} /> : <Unlock size={12} className="text-white/30" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {layer && (
              <div className="flex flex-wrap gap-1">
                <button className="re-btn !w-auto px-2" title="Up" onClick={() => commit((d) => moveLayer(d, sel, -1))}><ArrowUp size={14} /></button>
                <button className="re-btn !w-auto px-2" title="Down" onClick={() => commit((d) => moveLayer(d, sel, 1))}><ArrowDown size={14} /></button>
                <button className="re-btn !w-auto px-2" title="Duplicate" onClick={() => commit((d) => duplicateLayer(d, sel))}><Copy size={14} /></button>
                <button className="re-btn !w-auto px-2" title="Merge down" disabled={!below(doc, sel)} onClick={mergeDown}><Merge size={14} /></button>
                <button className="re-btn !w-auto px-2" title="Delete layer" onClick={() => { commit((d) => removeLayer(d, sel)); setSel(null); }}><Trash2 size={14} /></button>
              </div>
            )}
          </div>

          {layer && (
            <div className="glass-card space-y-2 p-3 text-xs">
              <input className="neon-input" value={layer.name} onChange={(e) => patch({ name: e.target.value })} />
              <label className="flex items-center gap-2">Opacity <input type="range" min="0" max="100" value={layer.opacity} onChange={(e) => patch({ opacity: +e.target.value })} className="flex-1" /> {layer.opacity}%</label>
              <label className="flex items-center gap-2">Blend
                <select className="neon-input" data-nomemo="true" value={layer.blend} onChange={(e) => patch({ blend: e.target.value })}>
                  {BLENDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </label>
              {layer.kind !== "fill" && <>
                <label className="flex items-center gap-2">Scale <input type="range" min="1" max="400" value={Math.round(layer.scale * 100)} onChange={(e) => patch({ scale: +e.target.value / 100 })} className="flex-1" /> {Math.round(layer.scale * 100)}%</label>
                <label className="flex items-center gap-2">Rotate <input type="range" min="-180" max="180" value={layer.rotate} onChange={(e) => patch({ rotate: +e.target.value })} className="flex-1" /> {layer.rotate}°</label>
              </>}
              {(layer.kind === "fill" || layer.kind === "text") && <label className="flex items-center gap-2">Colour <input type="color" value={layer.color} onChange={(e) => patch({ color: e.target.value })} /></label>}
              {layer.kind === "text" && <>
                <textarea className="neon-input" rows={2} value={layer.text} onChange={(e) => patch({ text: e.target.value })} />
                <label className="flex items-center gap-2">Size <input type="number" className="neon-input !w-24" value={layer.size} onChange={(e) => patch({ size: +e.target.value })} /> px</label>
              </>}
              <details>
                <summary className="cursor-pointer text-white/70">Adjustments</summary>
                <div className="mt-2 space-y-1">
                  <select className="neon-input" data-nomemo="true" value="" onChange={(e) => e.target.value && patch({ adj: PRESETS[e.target.value] })}>
                    <option value="">Preset…</option>
                    {Object.keys(PRESETS).map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                  {Object.keys(ADJ0).map((k) => (
                    <label key={k} className="flex items-center gap-2">
                      <span className="w-20">{ADJ_LABEL[k]}</span>
                      <input type="range" min={ADJ_RANGE[k][0]} max={ADJ_RANGE[k][1]} value={layer.adj[k]} onChange={(e) => patch({ adj: { ...layer.adj, [k]: +e.target.value } })} className="flex-1" />
                      <span className="w-8 text-right">{layer.adj[k]}</span>
                    </label>
                  ))}
                </div>
              </details>
            </div>
          )}

          <div className="glass-card space-y-2 p-3 text-xs">
            <h3 className="font-semibold">Export</h3>
            <select className="neon-input" data-nomemo="true" value={fmt} onChange={(e) => { setFmt(e.target.value); setResult(null); }}>
              <option value="image/png">PNG — keeps transparency</option>
              <option value="image/jpeg">JPG — smaller, white where transparent</option>
            </select>
            <button className="neon-btn-primary" disabled={!!busy} onClick={doExport}><Download size={14} /> Export {doc.w}×{doc.h} <span className="text-emerald-300">· free</span></button>
            {result && <>
              <a className="re-btn" href={result.url} download={`imagez.${result.ext}`}><Download size={14} /> Download</a>
              {!saved ? (
                <button className="re-btn" disabled={!!busy} onClick={save}><Save size={14} /> Save to FileZ <span className="text-white/60">· uses {(result.blob.size / 1048576).toFixed(1)} MB of your storage</span></button>
              ) : <>
                <p className="text-emerald-300">Saved to FileZ.</p>
                <Doors item={{ title: "My image", url: saved.url, kind: "image", uploadId: saved.id }} />
              </>}
            </>}
          </div>
        </aside>
      </div>
    </div>
  );
}
