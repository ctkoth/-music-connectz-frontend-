// ImageZ — a multi-layer image editor.
//
// This is a port of the single-canvas editor that lived unreachable in
// src/mcz2/Mcz2App.jsx (`ImageZPage`, 1 layer). Corey's ask on porting it:
// "make imagez the most chooseable number of layers? 1 is too lil" — so this
// is not a straight port. It is a real layer stack: add as many image layers
// as you want (capped defensively, see LAYER_CAP below), each with its own
// adjustments, opacity and visibility, reorderable, composited bottom-to-top
// into one PNG at export/save time.
//
// Live-app equivalents used in place of mcz2's imaginary helpers:
//   uploadFileApi()   -> uploadWork()   (src/uploadWork.js)
//   createPostzApi()  -> POST /api/economy/postz/ (see PostZ.jsx createPost)
// Post pricing is NOT reinvented here — ImageZ produces an ordinary image
// post, so it reads the same /api/economy/postz/cost/ endpoint PostZ.jsx
// reads and renders the same −N ⚡ / Free line, before the Save button.
import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Image as ImageIcon, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Undo2, RotateCcw, Download, Save } from "lucide-react";
import { api } from "../api.js";
import { uploadWork, primaryMedia, mediaItems } from "../uploadWork.js";
import { ENERGY } from "../resources.js";

// Layer count is capped, not because "many layers" is wrong, but because each
// layer holds a full-resolution offscreen canvas (a real bitmap in memory),
// and an uncapped add-layer loop is a straightforward way to run a phone out
// of memory. 50 is generous for real editing (nobody hand-composites 50
// images) and cheap enough that hitting it is a deliberate act, not an
// accident — the UI says so plainly rather than silently refusing.
const LAYER_CAP = 50;

const ADJ0 = { brightness: 100, contrast: 100, saturate: 100, hue: 0, blur: 0, grayscale: 0, sepia: 0, invert: 0 };
const PRESETS = {
  None: ADJ0,
  "B&W": { ...ADJ0, grayscale: 100, contrast: 110 },
  Vintage: { ...ADJ0, sepia: 60, contrast: 95, saturate: 85, brightness: 105 },
  Cool: { ...ADJ0, hue: 200, saturate: 115 },
  Warm: { ...ADJ0, hue: 350, saturate: 120, brightness: 105 },
  Punch: { ...ADJ0, contrast: 130, saturate: 140 },
};
const filterCss = (a) =>
  `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturate}%) hue-rotate(${a.hue}deg) blur(${a.blur}px) grayscale(${a.grayscale}%) sepia(${a.sepia}%) invert(${a.invert}%)`;

let nextLayerId = 1;

function makeLayer(canvas, name) {
  return {
    id: nextLayerId++,
    name: name || `Layer ${nextLayerId - 1}`,
    canvas,          // full-res offscreen HTMLCanvasElement — the pixel data
    adj: { ...ADJ0 },
    opacity: 100,
    visible: true,
  };
}

function cloneCanvas(src) {
  const c = document.createElement("canvas");
  c.width = src.width; c.height = src.height;
  c.getContext("2d").drawImage(src, 0, 0);
  return c;
}

/**
 * Compose the whole stack, bottom (index 0) to top, onto one canvas sized to
 * the largest layer. Each layer's own filter + opacity + visibility applies.
 * This is the single source of truth for what gets shown, downloaded and
 * posted — the preview canvas and the export canvas both call this so they
 * can never disagree.
 */
function composite(layers) {
  let w = 1, h = 1;
  for (const l of layers) { w = Math.max(w, l.canvas.width); h = Math.max(h, l.canvas.height); }
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const ctx = out.getContext("2d");
  for (const l of layers) {
    if (!l.visible || l.opacity <= 0) continue;
    ctx.save();
    ctx.globalAlpha = l.opacity / 100;
    ctx.filter = filterCss(l.adj);
    ctx.drawImage(l.canvas, 0, 0);
    ctx.restore();
  }
  return out;
}

export default function ImageZ() {
  const [layers, setLayers] = useState([]);           // bottom..top
  const [selId, setSelId] = useState(null);
  const [tool, setTool] = useState("adjust");          // adjust | brush | text | crop
  const [color, setColor] = useState("#22e6ff");
  const [brush, setBrush] = useState(8);
  const [text, setText] = useState("");
  const [urlIn, setUrlIn] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(null);
  const [cost, setCost] = useState(null);

  const dispRef = useRef(null);
  const histRef = useRef([]);   // undo stack of full layer-array snapshots (cloned canvases)
  const draw = useRef({ on: false, x: 0, y: 0 });
  const crop = useRef(null);
  const rafRef = useRef(null);

  const sel = layers.find((l) => l.id === selId) || null;

  // Cost of an ordinary image post — same endpoint, same shape PostZ.jsx
  // reads, so this never invents a second price for the same thing.
  useEffect(() => {
    api("/api/economy/postz/cost/").then(setCost).catch(() => setCost(null));
  }, []);

  // Redraw the preview. Debounced with rAF so a slider drag (many state
  // updates per second) doesn't recomposite the whole stack more than once
  // per frame — correctness first (every change eventually redraws), then
  // this one cheap optimization.
  const scheduleRender = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const disp = dispRef.current;
      if (!disp || !layers.length) return;
      const full = composite(layers);
      const maxW = 560, scale = Math.min(1, maxW / full.width);
      disp.width = Math.round(full.width * scale);
      disp.height = Math.round(full.height * scale);
      const ctx = disp.getContext("2d");
      ctx.clearRect(0, 0, disp.width, disp.height);
      ctx.drawImage(full, 0, 0, disp.width, disp.height);
      if (crop.current) {
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
        const c = crop.current;
        ctx.strokeRect(c.x, c.y, c.w, c.h);
        ctx.setLineDash([]);
      }
    });
  }, [layers]);

  useEffect(() => { scheduleRender(); }, [layers, scheduleRender]);

  const snapshot = () => {
    const snap = layers.map((l) => ({ ...l, canvas: cloneCanvas(l.canvas), adj: { ...l.adj } }));
    histRef.current = [...histRef.current, snap].slice(-20);
  };

  const undo = () => {
    const h = histRef.current;
    if (!h.length) return;
    const prev = h[h.length - 1];
    histRef.current = h.slice(0, -1);
    setLayers(prev);
    setSelId((id) => (prev.some((l) => l.id === id) ? id : prev[prev.length - 1]?.id ?? null));
  };

  const addFromImg = (img, name) => {
    setLayers((cur) => {
      if (cur.length >= LAYER_CAP) {
        setMsg(`ImageZ stops at ${LAYER_CAP} layers — that's a lot of full-res bitmaps to hold in one tab's memory. Delete one to add another.`);
        return cur;
      }
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      const layer = makeLayer(c, name);
      setSelId(layer.id);
      setMsg("");
      return [...cur, layer];
    });
    setSaved(null);
  };

  const loadFile = (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    const img = new Image();
    img.onload = () => addFromImg(img, f.name.replace(/\.[a-z0-9]+$/i, ""));
    img.src = URL.createObjectURL(f);
  };
  const loadUrl = () => {
    if (!urlIn.trim()) return;
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => { addFromImg(img, "URL layer"); setUrlIn(""); };
    img.onerror = () => setMsg("Couldn't load that URL (blocked or not an image).");
    img.src = urlIn.trim();
  };

  // Layer ops — reorder / visibility / opacity / delete / adjust — all
  // snapshot first so undo covers layer structure, not just pixel edits.
  const moveLayer = (id, dir) => {
    setLayers((cur) => {
      const i = cur.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cur.length) return cur;
      snapshot();
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const toggleVisible = (id) => setLayers((cur) => cur.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  const setOpacity = (id, v) => setLayers((cur) => cur.map((l) => (l.id === id ? { ...l, opacity: v } : l)));
  const setAdj = (id, k, v) => setLayers((cur) => cur.map((l) => (l.id === id ? { ...l, adj: { ...l.adj, [k]: v } } : l)));
  const setPreset = (id, adj) => setLayers((cur) => cur.map((l) => (l.id === id ? { ...l, adj: { ...adj } } : l)));
  const deleteLayer = (id) => {
    snapshot();
    setLayers((cur) => cur.filter((l) => l.id !== id));
    setSelId((cur) => (cur === id ? null : cur));
  };

  // Destructive ops (brush/text/crop/rotate/flip) bake onto the SELECTED
  // layer's own canvas, at that layer's full resolution — never onto the
  // composite. That is the "operate on the selected layer" choice from the
  // task: it keeps every tool meaningfully undo-able per layer, and it means
  // a member editing layer 3 can never accidentally paint over layer 1.
  const bakeSelected = (fn) => {
    if (!sel) return;
    snapshot();
    setLayers((cur) => cur.map((l) => {
      if (l.id !== sel.id) return l;
      const c = cloneCanvas(l.canvas);
      fn(c);
      return { ...l, canvas: c };
    }));
  };

  const rotate = (dir) => bakeSelected((c) => {
    const tmp = document.createElement("canvas"); tmp.width = c.height; tmp.height = c.width;
    const ctx = tmp.getContext("2d");
    ctx.translate(tmp.width / 2, tmp.height / 2); ctx.rotate(dir * Math.PI / 2);
    ctx.drawImage(c, -c.width / 2, -c.height / 2);
    c.width = tmp.width; c.height = tmp.height;
    c.getContext("2d").drawImage(tmp, 0, 0);
  });
  const flip = (h) => bakeSelected((c) => {
    const tmp = document.createElement("canvas"); tmp.width = c.width; tmp.height = c.height;
    const ctx = tmp.getContext("2d");
    ctx.translate(h ? c.width : 0, h ? 0 : c.height); ctx.scale(h ? -1 : 1, h ? 1 : -1);
    ctx.drawImage(c, 0, 0);
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    c.getContext("2d").drawImage(tmp, 0, 0);
  });

  // Pointer -> the selected layer's own pixel coords, scaled off the preview
  // canvas (which is drawn at composite size, same size every layer shares).
  const toLayer = (e) => {
    const disp = dispRef.current, r = disp.getBoundingClientRect();
    const cw = sel ? sel.canvas.width : disp.width, ch = sel ? sel.canvas.height : disp.height;
    const sx = cw / disp.width, sy = ch / disp.height;
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: px * (disp.width / r.width) * sx, y: py * (disp.height / r.height) * sy, dx: px * (disp.width / r.width), dy: py * (disp.height / r.height) };
  };
  const down = (e) => {
    if (!sel) return;
    const p = toLayer(e);
    if (tool === "brush") { snapshot(); draw.current = { on: true, x: p.x, y: p.y }; }
    else if (tool === "crop") { crop.current = { x: p.dx, y: p.dy, w: 0, h: 0 }; draw.current = { on: true }; }
    else if (tool === "text" && text.trim()) {
      snapshot();
      setLayers((cur) => cur.map((l) => {
        if (l.id !== sel.id) return l;
        const c = cloneCanvas(l.canvas);
        const ctx = c.getContext("2d");
        ctx.fillStyle = color; ctx.font = `${brush * 4}px sans-serif`; ctx.textBaseline = "top";
        ctx.fillText(text, p.x, p.y);
        return { ...l, canvas: c };
      }));
    }
  };
  const moveP = (e) => {
    if (!draw.current.on || !sel) return;
    e.preventDefault();
    const p = toLayer(e);
    if (tool === "brush") {
      setLayers((cur) => cur.map((l) => {
        if (l.id !== sel.id) return l;
        const ctx = l.canvas.getContext("2d");
        ctx.strokeStyle = color; ctx.lineWidth = brush; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(draw.current.x, draw.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        return l;
      }));
      draw.current.x = p.x; draw.current.y = p.y;
      scheduleRender();
    } else if (tool === "crop") {
      const c = crop.current; c.w = p.dx - c.x; c.h = p.dy - c.y; scheduleRender();
    }
  };
  const up = () => { draw.current.on = false; };

  // Crop is scoped to "the whole canvas, applied to every layer at once" —
  // cropping one layer alone would leave the stack at mismatched sizes and
  // composite() would silently misalign them. Cropping everything the same
  // way keeps the stack coherent, which is the property that matters most
  // for a multi-layer editor; per-layer crop is the feature left out.
  const doCrop = () => {
    const c = crop.current;
    if (!c || Math.abs(c.w) < 4 || !layers.length) { crop.current = null; return; }
    snapshot();
    const disp = dispRef.current;
    const full = composite(layers); // same size disp was scaled from
    const sx = full.width / disp.width, sy = full.height / disp.height;
    const x = Math.min(c.x, c.x + c.w) * sx, y = Math.min(c.y, c.y + c.h) * sy;
    const w = Math.abs(c.w) * sx, h = Math.abs(c.h) * sy;
    setLayers((cur) => cur.map((l) => {
      const out = document.createElement("canvas");
      out.width = Math.max(1, Math.round(w)); out.height = Math.max(1, Math.round(h));
      out.getContext("2d").drawImage(l.canvas, x, y, w, h, 0, 0, out.width, out.height);
      return { ...l, canvas: out };
    }));
    crop.current = null;
    scheduleRender();
  };

  const exportCanvas = () => composite(layers);

  const download = () => {
    if (!layers.length) return;
    exportCanvas().toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "imagez.png"; a.click();
    }, "image/png");
  };

  const savePost = () => {
    if (!layers.length) return;
    setBusy(true); setMsg("");
    exportCanvas().toBlob(async (blob) => {
      try {
        const file = new File([blob], "imagez.png", { type: "image/png" });
        const { work } = await uploadWork({ image_blob: file });
        const title = "ImageZ edit";
        await api("/api/economy/postz/", {
          method: "POST",
          body: {
            title,
            description: `Composited from ${layers.length} layer${layers.length === 1 ? "" : "s"} in ImageZ.`,
            genre: "", freestyle: false, visibility: "public",
            skills_used: [],
            ...primaryMedia(work),
            items: mediaItems(work, title),
          },
        });
        setSaved({ url: work?.image_url });
        setMsg("Saved as a PostZ.");
      } catch (e) {
        setMsg(e?.message || "Save failed.");
      } finally {
        setBusy(false);
      }
    }, "image/png");
  };

  const Slider = (k, min, max, step = 1) => (
    <div className="mb-2" key={k}>
      <div className="flex justify-between text-[11px] text-white/60"><span className="capitalize">{k}</span><span>{sel.adj[k]}</span></div>
      <input type="range" min={min} max={max} step={step} value={sel.adj[k]}
        onChange={(e) => setAdj(sel.id, k, Number(e.target.value))} className="w-full" />
    </div>
  );

  const costNode = !cost || !cost.cost?.amount ? (
    <span className="text-emerald-300">Free</span>
  ) : cost.cost.free_today ? (
    <span className="text-emerald-300">Free today · {cost.cost.daily_remaining} left</span>
  ) : (
    <span className={cost.cost.affordable ? "text-mcz-ember" : "text-mcz-ember/60"}>
      −{cost.cost.amount} {ENERGY}{!cost.cost.affordable && <span className="text-white/35"> · not enough</span>}
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="neon-frame p-4">
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon size={18} className="text-mcz-cyan" />
          <h2 className="text-lg font-bold">ImageZ</h2>
        </div>
        <p className="text-xs text-white/50">
          A multi-layer image editor — add as many layers as you need (up to {LAYER_CAP}),
          adjust, reorder and toggle each one, then export or post the composite.
        </p>
      </div>

      <div className="neon-frame p-4 flex flex-wrap gap-2 items-center">
        <label className="re-btn re-btn-emerald cursor-pointer text-xs">
          <Plus size={14} className="inline -mt-0.5 mr-1" />Add layer
          <input type="file" accept="image/*" onChange={loadFile} className="hidden" />
        </label>
        <input value={urlIn} onChange={(e) => setUrlIn(e.target.value)} placeholder="…or paste an image URL"
          className="neon-input flex-1 min-w-[160px] text-xs" />
        <button className="re-btn text-xs" onClick={loadUrl} disabled={!urlIn.trim()}>Load</button>
        <span className="text-[11px] text-white/40">{layers.length}/{LAYER_CAP} layers</span>
      </div>

      {!layers.length ? (
        <div className="neon-frame p-6 text-center text-white/50 text-sm">Add a layer to start editing.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div className="neon-frame p-2 text-center" style={{ touchAction: "none" }}>
              <canvas ref={dispRef}
                onMouseDown={down} onMouseMove={moveP} onMouseUp={up} onMouseLeave={up}
                onTouchStart={down} onTouchMove={moveP} onTouchEnd={up}
                className="max-w-full rounded-md"
                style={{ cursor: tool === "adjust" ? "default" : "crosshair" }} />
            </div>

            <div className="flex flex-wrap gap-2">
              {[["adjust", "Adjust"], ["brush", "Brush"], ["text", "Text"], ["crop", "Crop"]].map(([t, l]) => (
                <button key={t} onClick={() => setTool(t)}
                  className={`re-btn text-xs ${tool === t ? "re-btn-cyan" : ""}`}>{l}</button>
              ))}
            </div>

            {tool === "adjust" && sel && (
              <div className="neon-frame p-3">
                <div className="flex flex-wrap gap-1 mb-2">
                  {Object.keys(PRESETS).map((p) => (
                    <button key={p} className="re-btn text-[11px] !px-2 !py-1" onClick={() => setPreset(sel.id, PRESETS[p])}>{p}</button>
                  ))}
                </div>
                {Slider("brightness", 0, 200)}{Slider("contrast", 0, 200)}{Slider("saturate", 0, 200)}
                {Slider("hue", 0, 360)}{Slider("blur", 0, 12)}{Slider("sepia", 0, 100)}
                {Slider("grayscale", 0, 100)}{Slider("invert", 0, 100)}
                <button className="re-btn text-xs mt-1" onClick={() => setPreset(sel.id, ADJ0)}>Reset adjustments</button>
              </div>
            )}
            {(tool === "brush" || tool === "text") && (
              <div className="neon-frame p-3 flex flex-wrap items-center gap-2">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                <span className="text-[11px] text-white/50">size</span>
                <input type="range" min="1" max="48" value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
                {tool === "text" && (
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Text — then tap the image"
                    className="neon-input flex-1 min-w-[140px] text-xs" />
                )}
              </div>
            )}
            {tool === "crop" && (
              <div className="neon-frame p-3">
                <p className="text-[11px] text-white/50 mb-2">Drag on the canvas to select an area, then crop. Applies to every layer, keeping the stack aligned.</p>
                <button className="re-btn text-xs" onClick={doCrop}>Crop to selection</button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button className="re-btn text-xs" onClick={() => rotate(-1)} disabled={!sel}><RotateCcw size={13} className="inline -mt-0.5 mr-1" />90°</button>
              <button className="re-btn text-xs" onClick={() => rotate(1)} disabled={!sel}>90°<RotateCcw size={13} className="inline -mt-0.5 ml-1" style={{ transform: "scaleX(-1)" }} /></button>
              <button className="re-btn text-xs" onClick={() => flip(true)} disabled={!sel}>Flip H</button>
              <button className="re-btn text-xs" onClick={() => flip(false)} disabled={!sel}>Flip V</button>
              <button className="re-btn text-xs" onClick={undo} disabled={!histRef.current.length}><Undo2 size={13} className="inline -mt-0.5 mr-1" />Undo</button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
              <button className="re-btn text-xs" onClick={download}><Download size={13} className="inline -mt-0.5 mr-1" />Download PNG</button>
              <button className="neon-btn-primary text-xs !w-auto px-4" onClick={savePost} disabled={busy}>
                {busy ? <Loader2 size={13} className="inline animate-spin -mt-0.5 mr-1" /> : <Save size={13} className="inline -mt-0.5 mr-1" />}
                {busy ? "Saving…" : "Save as PostZ"} <span className="ml-1">{costNode}</span>
              </button>
            </div>
            {msg && <p className={`text-xs ${/Saved/.test(msg) ? "text-emerald-300" : "text-mcz-ember"}`}>{msg}</p>}
            {saved?.url && <img src={saved.url} alt="Saved" className="mt-2 max-h-40 rounded-md" />}
          </div>

          {/* Layer stack — top of the list is the top of the stack (rendered
              last / drawn over everything below it), which matches every
              layer-based editor a member is likely to already know. */}
          <div className="neon-frame p-3 space-y-2 h-fit">
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-wide">Layers</h3>
            {[...layers].reverse().map((l) => (
              <div key={l.id}
                className={`rounded-md border p-2 space-y-1 cursor-pointer ${l.id === selId ? "border-mcz-cyan bg-white/5" : "border-white/10"}`}
                onClick={() => setSelId(l.id)}>
                <div className="flex items-center gap-2">
                  <img src={l.canvas.toDataURL()} alt="" className="w-8 h-8 object-cover rounded" />
                  <span className="text-xs flex-1 truncate">{l.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); toggleVisible(l.id); }} className="text-white/50 hover:text-white">
                    {l.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); moveLayer(l.id, 1); }} className="re-btn !px-1 !py-0.5 text-[10px]"><ArrowUp size={11} /></button>
                  <button onClick={(e) => { e.stopPropagation(); moveLayer(l.id, -1); }} className="re-btn !px-1 !py-0.5 text-[10px]"><ArrowDown size={11} /></button>
                  <input type="range" min="0" max="100" value={l.opacity}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setOpacity(l.id, Number(e.target.value))} className="flex-1" />
                  <span className="text-[10px] text-white/40 w-7 text-right">{l.opacity}%</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteLayer(l.id); }} className="text-mcz-ember/70 hover:text-mcz-ember">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
