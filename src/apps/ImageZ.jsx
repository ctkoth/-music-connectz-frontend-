// ImageZ — a layered image editor in the Photoshop mould, on the member's own
// device. Image, text, paint, shape, gradient and fill layers; opacity, blend
// modes, hide, lock, reorder, duplicate, merge down, flip; layer masks; per-layer
// adjustments; move, brush, eraser, magic eraser, background eraser, shapes,
// eyedropper and crop; selections (marquee, lasso, magic wand; add, subtract, invert,
// feather; copy, cut, paste, fill, to a mask); Levels and Curves; clone, blur and smudge
// brushes; layer groups; layer styles (shadow, glow, stroke); free transform with
// handles; snapping guides; zoom and pan; a history panel; paint bucket; dodge, burn and
// sponge; a filters menu; image size and canvas rotation; healing brush; brush tips; text on a
// curve; 2× and WebP export; Actions; AI background removal and Edit with AI; gradient fades on masks; opacity graded down the stack; undo; keyboard
// shortcuts; and a project file that reopens with every layer intact. A pen tablet (Wacom and the like) draws with pressure, and the
// pen's eraser end erases.
//
// Tiers: the editor is free at every tier. How MANY layers a picture holds is the
// tier's (`imagez_layers`, served — Free 3, Premium 6, StatZ unlimited), so are the
// fonts (`imagez_fonts`, the same numbers — StatZ every one plus the device's own), and the
// magic and background erasers are StatZ's (or the free daily sample's). The plain
// eraser and masks stay free, so nobody loses a way to cut something out.
//
// The cost/gain line is the whole price: FREE, because nothing leaves the device
// until Save to FileZ, and Save says the MB it uses before it is pressed.
//
// The edits are layers.js's and the drawing is render.js's; this file is wiring and words.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown, ArrowUp, Brush, Copy, Crop, Download, Eraser, Eye, EyeOff, FolderOpen, ImagePlus, Layers, Lock,
  Blend, Contrast, FileDown, FileUp, FlipHorizontal, FlipVertical, Merge, Move, PaintBucket, Palette, Pipette, Plus,
  Redo2, Save, Shapes, Trash2, Type, Undo2, Unlock, Wand, WandSparkles,
  Bandage, Bot, Circle, CirclePlay, Droplets, Fingerprint, Lasso, PaintbrushVertical, RotateCcw, RotateCw, SunMoon, Folder, FolderOpen as FolderOpenIcon, History, Maximize, Sparkles, ZoomIn, ZoomOut, MousePointerSquareDashed, Stamp, BoxSelect,
} from "lucide-react";
import { api } from "../api.js";
import { onHandoff } from "../handoff.js";
import { handOff } from "../handoff.js";
import { IconImg } from "../App.jsx";
import Doors from "../components/Doors.jsx";
import {
  ADJ0, ADJ_RANGE, BLENDS, FONTS, GOOGLE_FONTS_URL, PRESETS, TIPS, canAdd, fontsFor, addLayer, addMaskStroke, addStroke, below, crop, cropRect,
  duplicateLayer, fitImage, fromProject, gradeOpacity, moveLayerTo, replaceLayer, layerOf, moveLayer, newDoc, pick, removeLayer, resizeCanvas,
  shapeFromDrag, toProject, uid, updateLayer, boxOf, scaleDoc, rotateDoc, effective, groupLayers, ungroup, updateGroup, snap,
} from "../imageedit/layers.js";
import ImageScore from "../components/ImageScore.jsx";
import { colourAt, dataUrlOf, exportDoc, loadImage, rasterize, renderDoc, selCanvas, selOverlay } from "../imageedit/render.js";
import {
  allSel, applyLUT, blurDab, bounds, clearSelected, cloneDab, combine, curveLUT, ellipseSel, feather, fillSelected,
  healDab, invert, isEmpty, keepSelected, levelsLUT, polygonSel, rectSel, smudgeDab, wandSel,
} from "../imageedit/selection.js";
import { useStatzTrial, StatzSample } from "../components/StatzSample.jsx";
import { loadLimits, TIER_LABEL } from "../limits.js";
import { goToSpot } from "../goto.js";
import { FILTERS, applyFilter, bucketFill, toneDab } from "../imageedit/filters.js";
import { describeStep, loadActions, replay, saveActions } from "../imageedit/actions.js";
import { backgroundDab, dabsAlong, magicErase, sample } from "../imageedit/pixels.js";

const HISTORY = 60;
// Corey's rule for every list in ImageZ: a tier may use as many entries as it may hold layers
// (Free 3, Premium 6, StatZ all), counted from the top of the list — so each list is ordered
// with the everyday entries first.
const firstN = (list, n) => (n == null ? list : list.slice(0, Math.max(0, n)));

/** A history row's words, worked out from what changed — so no edit needs to remember to name itself. */
function describe(a, b) {
  if (a.w !== b.w || a.h !== b.h) return `Canvas ${b.w}×${b.h}`;
  if (b.layers.length > a.layers.length) return `Add ${b.layers.find((l) => !a.layers.some((x) => x.id === l.id))?.name || "layer"}`;
  if (b.layers.length < a.layers.length) return `Delete ${a.layers.find((l) => !b.layers.some((x) => x.id === l.id))?.name || "layer"}`;
  if (JSON.stringify(a.groups || {}) !== JSON.stringify(b.groups || {})) return "Groups";
  if (a.layers.some((l, i) => l.id !== b.layers[i].id)) return "Reorder layers";
  for (let i = 0; i < b.layers.length; i++) {
    const x = a.layers[i], y = b.layers[i];
    if (x === y) continue;
    const key = Object.keys(y).find((k) => JSON.stringify(x[k]) !== JSON.stringify(y[k]));
    const words = { strokes: "paint", src: "pixels", x: "move", y: "move", adj: "adjust", style: "style", mask: "mask", opacity: "opacity", kind: "pixels" };
    return `${y.name}: ${words[key] || key || "edit"}`;
  }
  return "Edit";
}
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
  const [shape, setShape] = useState({ shape: "rect", filled: true, line: 8 });
  const [onMask, setOnMask] = useState(false);
  const [wand, setWand] = useState({ tolerance: 32, contiguous: true });
  const [dragRow, setDragRow] = useState(null);
  // The selection lives beside the document, not in it: like Photoshop, undo is for edits.
  const selRef = useRef(null);
  const overlay = useRef(null);
  const [selVer, setSelVer] = useState(0);
  const [selMode, setSelMode] = useState("new");
  const [marquee, setMarquee] = useState("rect");
  const [featherPx, setFeatherPx] = useState(8);
  const clip = useRef(null);
  const cloneFrom = useRef(null);
  const [cloneSet, setCloneSet] = useState(false);
  const [levels, setLevels] = useState({ inBlack: 0, inWhite: 255, gamma: 1, outBlack: 0, outWhite: 255 });
  const [curve, setCurve] = useState({ s: 64, m: 128, h: 192 });
  const [retouch, setRetouch] = useState(50);
  const [tone, setTone] = useState("dodge");
  const [filt, setFilt] = useState({ key: "sharpen", amount: 100, radius: 1 });
  const [sizePct, setSizePct] = useState(50);
  const [tip, setTip] = useState("round");
  const [scaleOut, setScaleOut] = useState(1);
  // Actions (StatZ): a recording in progress, and the saved ones on this device.
  const [recording, setRecording] = useState(null);
  const [actions, setActions] = useState(() => loadActions());
  const [actName, setActName] = useState("");
  // AI: background removal (StatZ) and Edit with AI (priced per run, every tier).
  const [cutState, setCutState] = useState(null);
  const [imgState, setImgState] = useState(null);
  const [edit, setEdit] = useState({ prompt: "", kind: "", ref: "", refName: "", own: false });
  useEffect(() => {
    api("/api/economy/imagez/cutout/").then(setCutState).catch(() => setCutState(null));
    api("/api/economy/gemini/image/").then(setImgState).catch(() => setImgState(null));
  }, []);
  const { s: statz } = useStatzTrial();
  const erasersAllowed = !!(statz?.is_statz || statz?.active);
  // The tier's layer ceiling. `undefined` until /limits/ answers: nothing is blocked while
  // it loads (it all runs on the device and spends nothing of ours), and no number is guessed.
  const [lim, setLim] = useState(null);
  useEffect(() => { loadLimits().then(setLim).catch(() => {}); }, []);
  const cap = lim && "imagez_layers" in lim ? lim.imagez_layers : undefined;
  const nextCap = lim?.tier === "free" ? lim?.tiers?.premium?.imagez_layers : null;
  // Fonts ladder the same way (`imagez_fonts`): the first N of the list, every one on StatZ,
  // where a font installed on the device can be typed by name too. Unknown until /limits/ answers.
  const fontCap = lim && "imagez_fonts" in lim ? lim.imagez_fonts : undefined;
  const fonts = fontCap === undefined ? FONTS : fontsFor(fontCap);
  const [customFont, setCustomFont] = useState("");
  const [grade, setGrade] = useState({ top: 100, bottom: 20 });
  const [lib, setLib] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [fmt, setFmt] = useState("image/png");
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(null);
  const canvas = useRef(null);
  const images = useRef(new Map());
  const drag = useRef(null);
  const handlesRef = useRef(null);
  const docRef = useRef(doc);
  docRef.current = doc;

  const commit = useCallback((fn) => {
    setDoc((d) => {
      let next = fn(d);
      if (next === d) return d;
      next = { ...next, _label: describe(d, next) };
      setPast((p) => [...p.slice(-HISTORY + 1), d]);
      setFuture([]);
      setResult(null); setSaved(null);
      return next;
    });
  }, []);
  const undo = () => past.length && (setFuture((f) => [doc, ...f]), setDoc(past.at(-1)), setPast((p) => p.slice(0, -1)));
  const redo = () => future.length && (setPast((p) => [...p, doc]), setDoc(future[0]), setFuture((f) => f.slice(1)));
  // History panel: jump to any earlier (or undone) state; everything after it stays redoable.
  const jumpTo = (i) => {
    const list = [...past, doc, ...future];
    if (i < 0 || i >= list.length) return;
    setPast(list.slice(0, i)); setDoc(list[i]); setFuture(list.slice(i + 1));
  };
  const [picked, setPicked] = useState([]);
  const [zoom, setZoom] = useState(null);   // null = fit the screen
  const scroller = useRef(null);
  const space = useRef(false);

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
      renderDoc(ctx, addStroke(d, live.id, live.stroke), images.current, { checker: true });
    } else if (live?.kind === "maskpaint") {
      renderDoc(ctx, addMaskStroke(d, live.id, live.stroke), images.current, { checker: true });
    } else if (live?.kind === "bg") {
      renderDoc(ctx, replaceLayer(d, live.id, { ...live.layer, kind: "image", src: live.key, x: 0, y: 0, scale: 1, rotate: 0, flipX: false, flipY: false, adj: null, w: d.w, h: d.h }), images.current, { checker: true });
    } else if (live?.kind === "shape") {
      renderDoc(ctx, addLayer(d, { kind: "shape", ...live.spec, ...shapeFromDrag(live.a, live.b, live.spec.shape) }, live.above), images.current, { checker: true });
    }
    if (live?.kind === "pix") {
      renderDoc(ctx, replaceLayer(d, live.id, { ...live.layer, kind: "image", src: live.key, x: 0, y: 0, scale: 1, rotate: 0, flipX: false, flipY: false, adj: null, w: d.w, h: d.h }), images.current, { checker: true });
    }
    if (overlay.current && overlay.current.width === d.w && overlay.current.height === d.h) ctx.drawImage(overlay.current, 0, 0);
    if (live?.guides) {
      ctx.save(); ctx.strokeStyle = "#ff2fb4"; ctx.lineWidth = Math.max(1, d.w / 800);
      for (const x of live.guides.v) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, d.h); ctx.stroke(); }
      for (const y of live.guides.h) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(d.w, y); ctx.stroke(); }
      ctx.restore();
    }
    const tl = handlesRef.current?.();
    if (tl) {
      ctx.save();
      ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = tl.hs / 5; ctx.setLineDash([tl.hs / 2, tl.hs / 3]);
      ctx.strokeRect(tl.b.x, tl.b.y, tl.b.w, tl.b.h);
      ctx.setLineDash([]); ctx.fillStyle = "#0b0b14";
      for (const [hx, hy] of tl.corners) { ctx.fillRect(hx - tl.hs / 2, hy - tl.hs / 2, tl.hs, tl.hs); ctx.strokeRect(hx - tl.hs / 2, hy - tl.hs / 2, tl.hs, tl.hs); }
      ctx.beginPath(); ctx.moveTo(tl.b.x + tl.b.w / 2, tl.b.y); ctx.lineTo(...tl.rot); ctx.stroke();
      ctx.beginPath(); ctx.arc(...tl.rot, tl.hs / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    if (live?.kind === "marquee" || live?.kind === "lasso") {
      ctx.save();
      ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = Math.max(1.5, d.w / 600); ctx.setLineDash([8, 6]);
      ctx.beginPath();
      if (live.kind === "lasso") { ctx.moveTo(...live.pts[0]); for (const q of live.pts) ctx.lineTo(...q); ctx.closePath(); }
      else {
        const r = { x: Math.min(live.a[0], live.b[0]), y: Math.min(live.a[1], live.b[1]), w: Math.abs(live.b[0] - live.a[0]), h: Math.abs(live.b[1] - live.a[1]) };
        if (live.shape === "ellipse") ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2); else ctx.rect(r.x, r.y, r.w, r.h);
      }
      ctx.stroke(); ctx.restore();
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
  }, [cropBox, selVer]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { draw(doc); }, [doc, draw]);

  // Set (or clear) the selection, combining with the old one per the mode or the held keys.
  const setSelection = (next, mode = "new") => {
    const d = docRef.current;
    let s2 = next ? combine(selRef.current && selRef.current.w === d.w && selRef.current.h === d.h ? selRef.current : null, next, mode) : null;
    if (s2 && isEmpty(s2)) s2 = null;
    selRef.current = s2;
    overlay.current = s2 ? selOverlay(s2) : null;
    setSelVer((v) => v + 1);
  };
  const modeOf = (e) => (e.shiftKey && e.altKey ? "intersect" : e.shiftKey ? "add" : e.altKey ? "subtract" : selMode);
  // A selection made on one canvas size means nothing on another.
  useEffect(() => { if (selRef.current && (selRef.current.w !== doc.w || selRef.current.h !== doc.h)) setSelection(null); }, [doc.w, doc.h]); // eslint-disable-line react-hooks/exhaustive-deps
  const liveSel = () => (selRef.current && selRef.current.w === doc.w && selRef.current.h === doc.h ? selRef.current : null);
  // The Google Fonts, once per page: a canvas draws a font only after it has loaded, so the
  // picture is redrawn as each one arrives rather than staying in the fallback font.
  useEffect(() => {
    if (!document.getElementById("imagez-fonts")) {
      const link = document.createElement("link");
      link.id = "imagez-fonts"; link.rel = "stylesheet"; link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    }
    const again = () => draw();
    document.fonts?.addEventListener?.("loadingdone", again);
    return () => document.fonts?.removeEventListener?.("loadingdone", again);
  }, [draw]);
  useEffect(() => {
    // A text layer's font is fetched when it is used, then drawn.
    for (const l of doc.layers) if (l.kind === "text") document.fonts?.load?.(`${l.size}px ${l.font}`).then(() => draw()).catch(() => {});
  }, [doc, draw]);

  const addImageFrom = useCallback(async (src, name) => {
    setErr("");
    if (!roomFor()) return;
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
  }, [commit, past.length, sel, cap]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Every path that makes a layer asks this first, and a refusal says the ceiling and what lifts it.
  const roomFor = (d = docRef.current) => {
    if (cap === undefined || canAdd(d, cap)) return true;
    setErr(`${TIER_LABEL[lim?.tier] || "Your tier"} holds ${cap} layers in a picture — merge some down, or upgrade for more${nextCap ? ` (Premium holds ${nextCap}; StatZ is unlimited)` : " (StatZ is unlimited)"}.`);
    return false;
  };

  const layer = sel ? layerOf(doc, sel) : null;
  // Free transform: the selected layer's box, four corner handles (scale) and one above (rotate).
  const handles = () => {
    const c = canvas.current;
    if (tool !== "move" || !layer || layer.locked || layer.kind === "fill" || layer.kind === "gradient" || !c) return null;
    const b = boxOf(layer, doc);
    if (!b) return null;
    const hs = Math.max(8, (doc.w / Math.max(1, c.getBoundingClientRect().width)) * 12);
    return { b, hs, corners: [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]], rot: [b.x + b.w / 2, b.y - hs * 3] };
  };
  handlesRef.current = handles;
  const patch = (p) => sel && commit((d) => updateLayer(d, sel, p));
  const add = (spec) => {
    if (!roomFor()) return;
    const id = uid();
    commit((d) => addLayer(d, { ...spec, id }, sel));
    setSel(id);
  };

  // ── pointer: move, brush, eraser, crop. Pen pressure comes from Pointer Events. ──
  const at = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * doc.w, ((e.clientY - r.top) / r.height) * doc.h];
  };
  // Pen pressure is Premium's (Corey asked; Premium is the pick — see CLAUDE.md). A pen still draws
  // and still erases with its eraser end at every tier; Free draws at full size, like a mouse.
  // Premium's part of ImageZ: pen pressure, layer styles and the creative filters — decoration and
  // finesse. Fixing a picture (sharpen, blur, levels, dodge and burn, the bucket) is every tier's.
  const premiumOn = ["premium", "statz", "debug"].includes(lim?.tier) || !!statz?.active;
  const pressureOn = premiumOn;
  // How many entries of each list (filters, blend modes, presets) — the same served number as layers.
  // Unknown until /limits/ answers, which offers everything rather than guessing a number.
  const listCap = cap === undefined ? null : cap;
  const okFilters = new Set(firstN(Object.keys(FILTERS), listCap));
  const okBlends = new Set(firstN(BLENDS.map(([k]) => k), listCap));
  const okPresets = new Set(firstN(Object.keys(PRESETS), listCap));
  const okTips = new Set(firstN(TIPS.map(([k]) => k), listCap));
  const okKinds = new Set(firstN((imgState?.kinds || []).map((k) => k.key), listCap));
  const actionsOn = !!(statz?.is_statz || statz?.active);
  const upsell = (what) => (
    <p className="text-mcz-gold">{what} — {TIER_LABEL[lim?.tier] || "your tier"} has the first {listCap}.{" "}
      <button className="re-link" onClick={() => goToSpot("membershipz", "")}>{nextCap ? `Premium has ${nextCap}, StatZ all` : "StatZ has all"}</button></p>
  );
  const pressureOf = (e) => (e.pointerType === "pen" && pressureOn ? (e.pressure || 0.01) : undefined);
  // The pixel erasers turn the layer into a picture of itself (opacity, blend and mask kept), then edit pixels.
  const pixelTarget = () => {
    const doc = docRef.current, layer = sel ? layerOf(doc, sel) : null;
    if (!layer) { setErr("Pick a layer first — that tool works on one layer at a time."); return null; }
    if (layer.locked) { setErr("That layer is locked."); return null; }
    if (layer.kind === "fill") { setErr("A fill layer is one colour all over — delete or hide it instead."); return null; }
    const c = rasterize(doc, layer, images.current);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    return { c, ctx, img: ctx.getImageData(0, 0, c.width, c.height), id: sel, layer };
  };
  const finishPixels = async ({ c, id, layer: l }) => {
    const blob = await new Promise((res) => c.toBlob(res, "image/png"));
    if (!blob) { setErr("The browser couldn't keep that edit."); return; }
    const src = URL.createObjectURL(blob);
    images.current.set(src, await loadImage(src));
    commit((d) => replaceLayer(d, id, {
      kind: "image", src, w: d.w, h: d.h, x: 0, y: 0, name: l.name, visible: l.visible, locked: l.locked,
      opacity: l.opacity, blend: l.blend, mask: l.mask, style: l.style, group: l.group,
    }));
  };

  // One dab of a retouching brush; pen pressure scales the size.
  const dab = (g, [x, y], pr) => {
    const size = brush.size * (pr ?? 1), k = retouch / 100;
    if (g.tool === "clone") cloneDab(g.img, g.src, x, y, g.dx, g.dy, size, g.sel);
    else if (g.tool === "heal") healDab(g.img, g.src, x, y, g.dx, g.dy, size, g.sel);
    else if (g.tool === "blur") blurDab(g.img, x, y, size, k, g.sel);
    else if (g.tool === "tone") toneDab(g.img, x, y, size, g.mode, k * 0.6, g.sel);
    else smudgeDab(g.img, g.carry, x, y, size, k, g.sel);
  };

  const down = (e) => {
    if (e.button > 0 && e.button !== 5) return;
    canvas.current.setPointerCapture(e.pointerId);
    if (e.pointerType === "pen" && !penSeen) setPenSeen(true);
    const p = at(e);
    // A Wacom's eraser end reports button 5 / buttons bit 32: it erases whatever tool is picked.
    const penEraser = e.pointerType === "pen" && (e.button === 5 || (e.buttons & 32));
    if ((tool === "magic" || tool === "bgerase") && !erasersAllowed) {
      setErr("The magic and background erasers are StatZ features — try them free below, or use the plain eraser or a mask.");
      return;
    }
    if (tool === "magic") {
      const t = pixelTarget();
      if (!t) return;
      const n = magicErase(t.img, p[0], p[1], wand);
      if (!n) { setErr("Nothing to erase there on this layer — click a coloured part of the selected layer."); return; }
      t.ctx.putImageData(t.img, 0, 0);
      setErr("");
      finishPixels(t).catch((x) => setErr(x.message));
      return;
    }
    if (tool === "bgerase") {
      const t = pixelTarget();
      if (!t) return;
      const colour = sample(t.img, p[0], p[1]);
      if (!colour) { setErr("Start the stroke on the background colour you want gone."); return; }
      const key = `work:${t.id}`;
      images.current.set(key, t.c);
      backgroundDab(t.img, p[0], p[1], brush.size, colour, wand);
      t.ctx.putImageData(t.img, 0, 0);
      drag.current = { kind: "bg", ...t, key, colour, last: p };
      setErr(""); draw(); return;
    }
    if (space.current && scroller.current) {
      drag.current = { kind: "pan", sx: e.clientX, sy: e.clientY, left: scroller.current.scrollLeft, top: scroller.current.scrollTop };
      return;
    }
    const h = handles();
    if (h) {
      const near = (q) => Math.hypot(q[0] - p[0], q[1] - p[1]) <= h.hs;
      const cx = h.b.x + h.b.w / 2, cy = h.b.y + h.b.h / 2;
      if (near(h.rot)) {
        drag.current = { kind: "rotate", id: sel, cx, cy, a0: Math.atan2(p[1] - cy, p[0] - cx), r0: layer.rotate, moved: false };
        return;
      }
      const ci = h.corners.findIndex(near);
      if (ci >= 0) {
        // Scale from the opposite corner, proportionally — so the image never stretches.
        const opp = h.corners[3 - ci];
        drag.current = { kind: "scale", id: sel, opp, d0: Math.hypot(p[0] - opp[0], p[1] - opp[1]) || 1, s0: layer.scale, x0: layer.x, y0: layer.y, moved: false };
        return;
      }
    }
    if (tool === "marquee") { drag.current = { kind: "marquee", a: p, b: p, shape: marquee, mode: modeOf(e) }; draw(); return; }
    if (tool === "lasso") { drag.current = { kind: "lasso", pts: [p], mode: modeOf(e) }; draw(); return; }
    if (tool === "wand") {
      const src = layer && layer.kind !== "fill" ? rasterize(doc, layer, images.current) : (() => {
        const c = document.createElement("canvas"); c.width = doc.w; c.height = doc.h;
        renderDoc(c.getContext("2d"), doc, images.current); return c;
      })();
      const im = src.getContext("2d").getImageData(0, 0, doc.w, doc.h);
      setSelection(wandSel(im, p[0], p[1], wand), modeOf(e));
      return;
    }
    if (tool === "bucket" && !premiumOn) { setErr("The paint bucket is Premium. Fill inside a selection is free (Selection → Fill)."); return; }
    if (tool === "bucket") {
      // On a fill layer with no selection, the bucket simply recolours it.
      if (layer?.kind === "fill" && !liveSel() && !layer.locked) { patch({ color: brush.color }); setErr(""); return; }
      const t = pixelTarget();
      if (!t) return;
      const hex = brush.color.replace("#", "");
      const n = bucketFill(t.img, p[0], p[1], [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)), { ...wand, sel: liveSel() });
      if (!n) { setErr("Nothing to fill there."); return; }
      t.ctx.putImageData(t.img, 0, 0); setErr(""); finishPixels(t).catch((x) => setErr(x.message));
      return;
    }
    if (tool === "heal" && !premiumOn) { setErr("The healing brush is Premium. The clone stamp is free."); return; }
    if (tool === "clone" || tool === "heal" || tool === "blur" || tool === "smudge" || tool === "tone") {
      if ((tool === "clone" || tool === "heal") && e.altKey) { cloneFrom.current = p; setCloneSet(true); setErr(""); return; }
      if ((tool === "clone" || tool === "heal") && !cloneFrom.current) { setErr("Alt-click (Option-click on a Mac) where to copy from first."); return; }
      const t = pixelTarget();
      if (!t) return;
      const key = `work:${t.id}`;
      images.current.set(key, t.c);
      const g = { kind: "pix", ...t, key, last: p, sel: liveSel(), carry: new Map(), tool, mode: tone };
      if (tool === "clone" || tool === "heal") { g.src = new ImageData(new Uint8ClampedArray(t.img.data), t.img.width, t.img.height); g.dx = cloneFrom.current[0] - p[0]; g.dy = cloneFrom.current[1] - p[1]; }
      drag.current = g;
      dab(g, p, pressureOf(e));
      g.ctx.putImageData(g.img, 0, 0);
      setErr(""); draw(); return;
    }
    if (tool === "eyedropper") {
      setBrush((b) => ({ ...b, color: colourAt(canvas.current, p[0], p[1]) }));
      return;
    }
    if (onMask && layer?.mask && (tool === "brush" || tool === "eraser" || penEraser)) {
      // On a mask, the brush brings the layer back and the eraser (or the pen's eraser end) hides it.
      if (layer.locked) { setErr("That layer is locked."); return; }
      drag.current = { kind: "maskpaint", id: sel, stroke: { size: brush.size, hide: penEraser || tool === "eraser", points: [[...p, pressureOf(e)].filter((v) => v !== undefined)] } };
      draw(); return;
    }
    if (tool === "shape") {
      if (!roomFor()) return;
      drag.current = { kind: "shape", a: p, b: p, above: sel, spec: { ...shape, color: brush.color } };
      draw(); return;
    }
    if (tool === "brush" || tool === "eraser" || penEraser) {
      let id = sel;
      if (!layer || layer.kind !== "paint") {
        if (penEraser || tool === "eraser") { setErr("Pick a paint layer to erase on — the eraser only takes back brush work."); return; }
        if (!roomFor()) return;
        id = uid();
        commit((d) => addLayer(d, { kind: "paint", id }, sel));
        setSel(id);
      } else if (layer.locked) { setErr("That layer is locked."); return; }
      drag.current = { kind: "paint", id, stroke: { ...brush, tip: okTips.has(tip) ? tip : "round", seed: Math.floor(Math.random() * 99999), erase: penEraser || tool === "eraser", points: [[...p, pressureOf(e)].filter((v) => v !== undefined)] } };
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
    if (g.kind === "pan") {
      scroller.current.scrollLeft = g.left - (e.clientX - g.sx);
      scroller.current.scrollTop = g.top - (e.clientY - g.sy);
      return;
    }
    if (g.kind === "rotate" || g.kind === "scale") {
      const p = at(e);
      if (!g.moved) { g.moved = true; setPast((h) => [...h.slice(-HISTORY + 1), docRef.current]); setFuture([]); }
      if (g.kind === "rotate") {
        let r = g.r0 + ((Math.atan2(p[1] - g.cy, p[0] - g.cx) - g.a0) * 180) / Math.PI;
        if (e.shiftKey) r = Math.round(r / 15) * 15;   // Shift snaps to 15°, as in Photoshop
        r = ((r + 540) % 360) - 180;
        setDoc((d) => updateLayer(d, g.id, { rotate: Math.round(r) }));
      } else {
        const k = Math.max(0.02, Math.hypot(p[0] - g.opp[0], p[1] - g.opp[1]) / g.d0);
        const scale = g.s0 * k;
        // The opposite corner stays put: the layer's origin moves toward or away from it.
        setDoc((d) => updateLayer(d, g.id, { scale, x: Math.round(g.opp[0] + (g.x0 - g.opp[0]) * k), y: Math.round(g.opp[1] + (g.y0 - g.opp[1]) * k) }));
      }
      return;
    }
    if (g.kind === "paint" || g.kind === "maskpaint") {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of evs.length ? evs : [e]) g.stroke.points.push([...at(ev), pressureOf(ev)].filter((v) => v !== undefined));
    } else if (g.kind === "bg") {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of evs.length ? evs : [e]) {
        const pt = at(ev);
        for (const [x, y] of dabsAlong(g.last, pt, brush.size)) backgroundDab(g.img, x, y, brush.size, g.colour, wand);
        g.last = pt;
      }
      g.ctx.putImageData(g.img, 0, 0);
    } else if (g.kind === "pix") {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of evs.length ? evs : [e]) {
        const pt = at(ev);
        for (const q of dabsAlong(g.last, pt, brush.size)) dab(g, q, pressureOf(ev));
        g.last = pt;
      }
      g.ctx.putImageData(g.img, 0, 0);
    } else if (g.kind === "lasso") {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of evs.length ? evs : [e]) g.pts.push(at(ev));
    } else if (g.kind === "crop" || g.kind === "shape" || g.kind === "marquee") g.b = at(e);
    else {
      const p = at(e);
      let dx = Math.round(p[0] - g.from[0]), dy = Math.round(p[1] - g.from[1]);
      if (!g.moved) { g.moved = true; setPast((h) => [...h.slice(-HISTORY + 1), docRef.current]); setFuture([]); }
      const cur = docRef.current, l = layerOf(cur, g.id);
      if (l && !e.ctrlKey && !e.metaKey) {
        // Smart guides: snap to the canvas edges and centre and to other layers. Hold Ctrl to place freely.
        const b = boxOf({ ...l, x: g.x + dx, y: g.y + dy }, cur);
        if (b) {
          const c = canvas.current.getBoundingClientRect();
          const sn = snap(cur, g.id, b, (cur.w / Math.max(1, c.width)) * 8);
          dx += Math.round(sn.dx); dy += Math.round(sn.dy); g.guides = sn.guides;
        }
      } else g.guides = null;
      setDoc((d) => updateLayer(d, g.id, { x: g.x + dx, y: g.y + dy }));
      return;
    }
    draw();
  };
  const up = () => {
    const g = drag.current;
    drag.current = null;
    if (!g) return;
    if (g.kind === "pan") return;
    if (g.kind === "rotate" || g.kind === "scale") { if (g.moved) { setResult(null); setSaved(null); } draw(); return; }
    if (g.kind === "paint") commit((d) => addStroke(d, g.id, g.stroke));
    else if (g.kind === "bg") { finishPixels(g).catch((x) => setErr(x.message)).finally(() => images.current.delete(g.key)); }
    else if (g.kind === "pix") { finishPixels(g).catch((x) => setErr(x.message)).finally(() => images.current.delete(g.key)); }
    else if (g.kind === "marquee") {
      const r = { x: Math.min(g.a[0], g.b[0]), y: Math.min(g.a[1], g.b[1]), w: Math.abs(g.b[0] - g.a[0]), h: Math.abs(g.b[1] - g.a[1]) };
      if (r.w < 2 && r.h < 2) { if (g.mode === "new") setSelection(null); }
      else setSelection((g.shape === "ellipse" ? ellipseSel : rectSel)(doc.w, doc.h, r), g.mode);
    }
    else if (g.kind === "lasso") setSelection(g.pts.length > 2 ? polygonSel(doc.w, doc.h, g.pts) : null, g.mode);
    else if (g.kind === "maskpaint") commit((d) => addMaskStroke(d, g.id, g.stroke));
    else if (g.kind === "shape") {
      const box = shapeFromDrag(g.a, g.b, g.spec.shape);
      if (Math.abs(box.w) > 2 || Math.abs(box.h) > 2) {
        const id = uid();
        commit((d) => addLayer(d, { kind: "shape", id, ...g.spec, ...box }, g.above));
        setSel(id);
      }
    }
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

  const saveProject = async () => {
    setBusy("Packing the project…"); setErr("");
    try {
      const text = await toProject(doc, dataUrlOf);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      a.download = "project.imagez";
      a.click();
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };
  const openProject = async (file) => {
    if (!file) return;
    setBusy("Opening the project…"); setErr("");
    try {
      const d = fromProject(await file.text());
      for (const l of d.layers) if (l.kind === "image") images.current.set(l.src, await loadImage(l.src));
      setPast((p) => [...p.slice(-HISTORY + 1), doc]); setFuture([]);
      setDoc(d); setSel(null); setCropBox(null); setResult(null); setSaved(null);
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };

  // ── Selection actions: Edit → Copy / Cut / Paste / Fill / Clear, Layer via copy, to mask ──
  const needSel = () => { const s2 = liveSel(); if (!s2) setErr("Make a selection first (marquee M, lasso L or magic wand W)."); return s2; };
  const copySel = (cut = false) => {
    const s2 = needSel(); if (!s2) return null;
    const t = pixelTarget(); if (!t) return null;
    const piece = new ImageData(new Uint8ClampedArray(t.img.data), t.img.width, t.img.height);
    keepSelected(piece, s2);
    const c = document.createElement("canvas"); c.width = doc.w; c.height = doc.h;
    c.getContext("2d").putImageData(piece, 0, 0);
    clip.current = { c, box: bounds(s2) };
    if (cut) { clearSelected(t.img, s2); t.ctx.putImageData(t.img, 0, 0); finishPixels(t).catch((x) => setErr(x.message)); }
    setErr("");
    return c;
  };
  const pasteClip = async (c = clip.current?.c) => {
    if (!c) { setErr("Nothing copied yet."); return; }
    if (!roomFor()) return;
    const blob = await new Promise((res) => c.toBlob(res, "image/png"));
    const src = URL.createObjectURL(blob);
    images.current.set(src, await loadImage(src));
    const id = uid();
    commit((d) => addLayer(d, { kind: "image", id, name: "Pasted", src, w: c.width, h: c.height }, sel));
    setSel(id);
  };
  const viaCopy = () => { const c = copySel(false); if (c) pasteClip(c); };
  const clearSel = () => { const s2 = needSel(); if (!s2) return; const t = pixelTarget(); if (!t) return; clearSelected(t.img, s2); t.ctx.putImageData(t.img, 0, 0); finishPixels(t).catch((x) => setErr(x.message)); };
  const fillSel = () => {
    const s2 = needSel(); if (!s2) return;
    const t = pixelTarget(); if (!t) return;
    const hex = brush.color.replace("#", "");
    fillSelected(t.img, s2, [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)));
    t.ctx.putImageData(t.img, 0, 0); finishPixels(t).catch((x) => setErr(x.message));
  };
  const selToMask = async () => {
    const s2 = needSel(); if (!s2 || !layer) return;
    const blob = await new Promise((res) => selCanvas(s2).toBlob(res, "image/png"));
    const src = URL.createObjectURL(blob);
    images.current.set(src, await loadImage(src));
    patch({ mask: { strokes: [], on: true, fade: null, src } });
    setSelection(null); setOnMask(true);
  };
  const adjustPixels = (lut) => {
    const t = pixelTarget(); if (!t) return;
    applyLUT(t.img, lut, liveSel());
    t.ctx.putImageData(t.img, 0, 0); finishPixels(t).catch((x) => setErr(x.message));
  };
  const curvePts = [[0, 0], [64, curve.s], [128, curve.m], [192, curve.h], [255, 255]];

  // ── Steps: every whole-picture edit goes through here so Actions can record and replay it ──
  const tick = () => new Promise((res) => setTimeout(res, 60));
  const runStep = async (st) => {
    if (st.kind === "rotate") { setSelection(null); commit((d) => rotateDoc(d, st.dir)); await tick(); return; }
    if (st.kind === "size") { setSelection(null); commit((d) => scaleDoc(d, st.k)); await tick(); return; }
    const t = pixelTarget();
    if (!t) throw new Error("pick a layer first");
    if (st.kind === "filter") applyFilter(t.img, st.key, st.opts || {}, liveSel());
    else if (st.kind === "levels") applyLUT(t.img, levelsLUT(st.levels), liveSel());
    else if (st.kind === "curves") applyLUT(t.img, curveLUT([[0, 0], [64, st.c.s], [128, st.c.m], [192, st.c.h], [255, 255]]), liveSel());
    else throw new Error("this step isn't available here");
    t.ctx.putImageData(t.img, 0, 0);
    await finishPixels(t);
    await tick();
  };
  const doStep = (st) => {
    if (recording) setRecording((r) => ({ ...r, steps: [...r.steps, st] }));
    runStep(st).catch((x) => setErr(x.message));
  };
  const saveRecording = () => {
    if (!recording?.steps.length) { setRecording(null); return; }
    const next = [...actions, { name: (actName.trim() || `Action ${actions.length + 1}`).slice(0, 60), steps: recording.steps }];
    setActions(next); saveActions(next); setRecording(null); setActName("");
  };
  const playAction = async (a) => {
    if (!actionsOn) { setErr("Actions are StatZ — try them in today's free StatZ minutes."); return; }
    setBusy(`Playing ${a.name}…`); setErr("");
    const r = await replay(a, runStep);
    setBusy("");
    if (r.failed) setErr(`${a.name} stopped at "${r.failed}": ${r.error}. ${r.done} step${r.done === 1 ? "" : "s"} ran.`);
  };

  // ── AI ──
  const canvasToData = (c, max = 1536, type = "image/jpeg") => {
    const k = Math.min(1, max / Math.max(c.width, c.height));
    const t = document.createElement("canvas");
    t.width = Math.round(c.width * k); t.height = Math.round(c.height * k);
    const x = t.getContext("2d");
    if (type === "image/jpeg") { x.fillStyle = "#fff"; x.fillRect(0, 0, t.width, t.height); }
    x.drawImage(c, 0, 0, t.width, t.height);
    return t.toDataURL(type, 0.9);
  };
  const cutout = async () => {
    const d = docRef.current, l = sel ? layerOf(d, sel) : null;
    if (!l || l.kind === "fill" || l.kind === "gradient") { setErr("Pick the layer with the subject on it — a picture or paint layer."); return; }
    setBusy("Finding the subject…"); setErr("");
    try {
      const res = await api("/api/economy/imagez/cutout/", { method: "POST", body: { image: canvasToData(rasterize(d, l, images.current)) }, timeoutMs: 120_000 });
      if (!res.masks?.length) { setErr(res.detail || "No clear subject found — nothing was charged."); return; }
      const m = document.createElement("canvas"); m.width = d.w; m.height = d.h;
      const mx = m.getContext("2d");
      for (const it of res.masks) {
        const pic = await loadImage(it.mask);
        const [y0, x0, y1, x1] = it.box;
        const bx = Math.round((x0 / 1000) * d.w), by = Math.round((y0 / 1000) * d.h);
        const bw = Math.max(1, Math.round(((x1 - x0) / 1000) * d.w)), bh = Math.max(1, Math.round(((y1 - y0) / 1000) * d.h));
        const t = document.createElement("canvas"); t.width = bw; t.height = bh;
        const tx = t.getContext("2d"); tx.drawImage(pic, 0, 0, bw, bh);
        // The model's mask is a grey picture; brighter than half is the subject.
        const im = tx.getImageData(0, 0, bw, bh);
        for (let i = 0; i < im.data.length; i += 4) { const on = im.data[i] > 127; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = on ? 255 : 0; }
        tx.putImageData(im, 0, 0);
        mx.drawImage(t, bx, by);
      }
      const blob = await new Promise((res2) => m.toBlob(res2, "image/png"));
      const src = URL.createObjectURL(blob);
      images.current.set(src, await loadImage(src));
      commit((dd) => updateLayer(dd, l.id, { mask: { strokes: [], on: true, fade: null, src } }));
      setOnMask(true);
      setErr("");
      setBusy(`Cut out ${res.masks.map((x) => x.label).join(", ")} — ${res.cost_cents ? `${res.cost_cents} 🏷️` : "a free daily prompt"}. Paint the mask to fix any edge.`);
      setTimeout(() => setBusy(""), 6000);
    } catch (e) { setErr(e.message); setBusy(""); }
  };
  const pickRef = async (file) => {
    if (!file) return;
    try {
      if (file.type.startsWith("video/")) {
        // A frame from the video, grabbed on the device: a second in, or the middle of a short clip.
        const v = document.createElement("video");
        v.muted = true; v.src = URL.createObjectURL(file);
        await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error("That video can't be opened here.")); });
        v.currentTime = Math.min(1, (v.duration || 2) / 2);
        await new Promise((res) => { v.onseeked = res; });
        const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext("2d").drawImage(v, 0, 0);
        setEdit((x) => ({ ...x, ref: canvasToData(c), refName: `${file.name} (a frame)` }));
      } else if (file.type.startsWith("image/")) {
        const img = await loadImage(URL.createObjectURL(file));
        const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        setEdit((x) => ({ ...x, ref: canvasToData(c), refName: file.name }));
      } else setErr("A reference is a picture or a video.");
    } catch (e) { setErr(e.message); }
  };
  const aiEdit = async () => {
    if (!edit.prompt.trim()) { setErr("Say what to change."); return; }
    if (!edit.own) { setErr("Tick that the picture is yours to edit."); return; }
    if (!roomFor()) return;
    setBusy("Editing with AI…"); setErr("");
    try {
      const flat = document.createElement("canvas"); const d = docRef.current;
      flat.width = d.w; flat.height = d.h;
      renderDoc(flat.getContext("2d"), d, images.current);
      const res = await api("/api/economy/gemini/image/", { method: "POST", timeoutMs: 150_000, body: {
        edit: 1, prompt: edit.prompt.trim(), kind: okKinds.has(edit.kind) ? edit.kind : "", reference: canvasToData(flat, 1536, "image/png"),
        reference2: edit.ref || undefined, confirm_own: 1,
      } });
      if (!res.image) { setErr(res.detail || "No picture came back — nothing was charged."); return; }
      const img = await loadImage(res.image);
      images.current.set(res.image, img);
      const id = uid();
      commit((dd) => addLayer(dd, { kind: "image", id, name: `AI: ${edit.prompt.trim()}`.slice(0, 60), src: res.image, w: img.naturalWidth, h: img.naturalHeight, ...fitImage(dd, img.naturalWidth, img.naturalHeight), scale: Math.min(dd.w / img.naturalWidth, dd.h / img.naturalHeight) }));
      setSel(id);
      setBusy(`Edited — ${res.cost_cents ? `${res.cost_cents} 🏷️` : "free"}. It's a new layer on top; hide it to compare.`);
      setTimeout(() => setBusy(""), 6000);
    } catch (e) { setErr(e.message); setBusy(""); }
  };

  // Photoshop's single-key tools, plus undo/redo and delete. Never while typing in a field.
  const keys = useRef({});
  const groupNow = () => {
    const ids = picked.length ? picked : sel ? [sel] : [];
    if (!ids.length) { setErr("Pick the layers to group — Ctrl-click (Cmd on a Mac) rows to pick several."); return; }
    commit((d) => groupLayers(d, ids, `Group ${Object.keys(d.groups || {}).length + 1}`));
    setPicked([]);
  };
  keys.current = { groupNow, undo, redo, sel, commit, liveSel, setSelection, clearSel, copySel, pasteClip, viaCopy, doc };
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const k = keys.current;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); (e.shiftKey ? k.redo : k.undo)(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); k.redo(); return; }
      if (mod && (e.key === "=" || e.key === "+")) { e.preventDefault(); setZoom((z) => Math.min(8, (z || 1) * 1.25)); return; }
      if (mod && e.key === "-") { e.preventDefault(); setZoom((z) => Math.max(0.05, (z || 1) / 1.25)); return; }
      if (mod && e.key === "0") { e.preventDefault(); setZoom(null); return; }
      if (mod && e.key === "1") { e.preventDefault(); setZoom(1); return; }
      if (mod && e.key.toLowerCase() === "g") { e.preventDefault(); k.groupNow(); return; }
      if (mod) {
        const key = e.key.toLowerCase();
        if (key === "a") { e.preventDefault(); k.setSelection(allSel(k.doc.w, k.doc.h)); }
        else if (key === "d") { e.preventDefault(); k.setSelection(null); }
        else if (key === "i" && e.shiftKey) { e.preventDefault(); const s2 = k.liveSel(); if (s2) k.setSelection(invert(s2)); }
        else if (key === "c" && k.liveSel()) { e.preventDefault(); k.copySel(false); }
        else if (key === "x" && k.liveSel()) { e.preventDefault(); k.copySel(true); }
        else if (key === "v") { e.preventDefault(); k.pasteClip(); }
        else if (key === "j" && k.liveSel()) { e.preventDefault(); k.viaCopy(); }
        return;
      }
      const tools = { v: "move", b: "brush", e: "eraser", c: "crop", i: "eyedropper", u: "shape", y: "magic", g: "bgerase",
        m: "marquee", l: "lasso", w: "wand", s: "clone", r: "blur", n: "smudge", k: "bucket", o: "tone", j: "heal" };
      if (tools[e.key.toLowerCase()]) { setTool(tools[e.key.toLowerCase()]); return; }
      if (e.key === " ") { space.current = true; e.preventDefault(); return; }
      if (e.key === "[") setBrush((b) => ({ ...b, size: Math.max(1, Math.round(b.size / 1.25)) }));
      if (e.key === "]") setBrush((b) => ({ ...b, size: Math.min(300, Math.round(b.size * 1.25)) }));
      if ((e.key === "Delete" || e.key === "Backspace") && k.sel) {
        e.preventDefault();
        // With a selection, Delete clears inside it (Photoshop); without one, it removes the layer.
        if (k.liveSel()) k.clearSel(); else { k.commit((d) => removeLayer(d, k.sel)); setSel(null); }
      }
    };
    const onUp = (e) => { if (e.key === " ") space.current = false; };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onUp); };
  }, []);

  const doExport = async () => {
    setBusy("Exporting…"); setErr("");
    try {
      const blob = await exportDoc(doc, images.current, fmt, 0.92, null, scaleOut);
      setResult({ blob, url: URL.createObjectURL(blob), ext: { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[fmt] });
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

  const tools = [["move", Move, "Move (V)"], ["brush", Brush, "Brush (B)"], ["eraser", Eraser, "Eraser (E)"], ["marquee", BoxSelect, "Marquee select (M)"], ["lasso", Lasso, "Lasso select (L)"], ["wand", MousePointerSquareDashed, "Magic wand select (W)"],
    ["magic", Wand, "Magic eraser (Y)"], ["bgerase", WandSparkles, "Background eraser (G)"], ["shape", Shapes, "Shapes (U)"],
    ["eyedropper", Pipette, "Eyedropper (I)"], ["clone", Stamp, "Clone stamp (S)"], ["heal", Bandage, "Healing brush (J)"], ["bucket", PaintbrushVertical, "Paint bucket (K)"], ["tone", SunMoon, "Dodge / burn / sponge (O)"], ["blur", Droplets, "Blur brush (R)"], ["smudge", Fingerprint, "Smudge (N)"], ["crop", Crop, "Crop (C)"]];
  const icon = { image: ImagePlus, text: Type, paint: Brush, fill: PaintBucket, shape: Shapes, gradient: Palette };

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
        A pen tablet (Wacom and similar) works at every tier and its eraser end erases; pressure is Premium.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="re-btn !w-auto cursor-pointer px-3"><ImagePlus size={14} /> Open image
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { openFiles(e.target.files); e.target.value = ""; }} />
        </label>
        <button className="re-btn !w-auto px-3" onClick={() => setLib(true)}><FolderOpen size={14} /> From FileZ</button>
        <label className="re-btn !w-auto cursor-pointer px-3" title="Reopen a .imagez project with every layer"><FileUp size={14} /> Open project
          <input type="file" accept=".imagez,application/json" className="hidden" onChange={(e) => { openProject(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <button className="re-btn !w-auto px-3" onClick={saveProject} title="Download every layer as a .imagez file you can open again"><FileDown size={14} /> Save project</button>
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
        <div className="flex flex-row flex-wrap gap-1 lg:flex-col" data-tour="imagez-erasers">
          {tools.map(([k, I, label]) => (
            <button key={k} title={(k === "magic" || k === "bgerase") && !erasersAllowed ? `${label} — StatZ` : label} onClick={() => { setTool(k); if (k !== "crop") setCropBox(null); }}
              className={`re-btn !w-auto px-2 ${tool === k ? "!border-mcz-cyan text-mcz-cyan" : ""}`}><I size={16} /></button>
          ))}
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <button className="re-btn !w-auto px-2" title="Zoom out (Ctrl −)" onClick={() => setZoom((z) => Math.max(0.05, (z || 1) / 1.25))}><ZoomOut size={14} /></button>
            <span className="w-14 text-center">{zoom ? `${Math.round(zoom * 100)}%` : "Fit"}</span>
            <button className="re-btn !w-auto px-2" title="Zoom in (Ctrl +)" onClick={() => setZoom((z) => Math.min(8, (z || 1) * 1.25))}><ZoomIn size={14} /></button>
            <button className="re-btn !w-auto px-2" title="Fit (Ctrl 0)" onClick={() => setZoom(null)}><Maximize size={14} /></button>
            <button className="re-btn !w-auto px-2" title="Actual pixels (Ctrl 1)" onClick={() => setZoom(1)}>100%</button>
            <span className="text-white/55">Hold Space and drag to pan · Ctrl while moving turns snapping off</span>
          </div>
          <div ref={scroller} className={`rounded-xl border border-white/10 bg-black/40 p-2 ${zoom ? "max-h-[75vh] overflow-auto" : "flex justify-center"}`}
            onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom((z) => Math.min(8, Math.max(0.05, (z || 1) * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))); } }}>
            <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              className={zoom ? "" : "max-h-[70vh] max-w-full"}
              style={{ touchAction: "none", cursor: space.current ? "grab" : tool === "move" ? "move" : "crosshair", aspectRatio: `${doc.w} / ${doc.h}`, ...(zoom ? { width: doc.w * zoom, maxWidth: "none" } : {}) }} />
          </div>
          {(tool === "marquee" || tool === "lasso" || tool === "wand") && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {tool === "marquee" && (
                <select className="neon-input !w-auto" data-nomemo="true" value={marquee} onChange={(e) => setMarquee(e.target.value)}>
                  <option value="rect">Rectangle</option><option value="ellipse">Ellipse</option>
                </select>
              )}
              {[["new", "New"], ["add", "Add (Shift)"], ["subtract", "Subtract (Alt)"], ["intersect", "Intersect"]].map(([k, label]) => (
                <button key={k} className={`re-btn !w-auto px-2 ${selMode === k ? "!border-mcz-cyan text-mcz-cyan" : ""}`} onClick={() => setSelMode(k)}>{label}</button>
              ))}
              {tool === "wand" && <>
                <label className="flex items-center gap-1">Tolerance <input type="range" min="0" max="100" value={wand.tolerance} onChange={(e) => setWand({ ...wand, tolerance: +e.target.value })} /> {wand.tolerance}%</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={wand.contiguous} onChange={(e) => setWand({ ...wand, contiguous: e.target.checked })} /> Connected only</label>
                <span className="text-white/50">Samples the selected layer, or the whole picture when none is picked.</span>
              </>}
            </div>
          )}
          {tool === "bucket" && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-1">Colour <input type="color" value={brush.color} onChange={(e) => setBrush({ ...brush, color: e.target.value })} /></label>
              <label className="flex items-center gap-1">Tolerance <input type="range" min="0" max="100" value={wand.tolerance} onChange={(e) => setWand({ ...wand, tolerance: +e.target.value })} /> {wand.tolerance}%</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={wand.contiguous} onChange={(e) => setWand({ ...wand, contiguous: e.target.checked })} /> Connected only</label>
              <span className="text-white/50">Click to fill the area like that spot on the selected layer.</span>
              {!premiumOn && <span className="text-mcz-gold">The bucket is Premium. <button className="re-link" onClick={() => goToSpot("membershipz", "")}>See Premium</button></span>}
            </div>
          )}
          {tool === "tone" && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {[["dodge", "Dodge — lighten"], ["burn", "Burn — darken"], ["sponge", "Sponge — desaturate"]].map(([k, label]) => (
                <button key={k} className={`re-btn !w-auto px-2 ${tone === k ? "!border-mcz-cyan text-mcz-cyan" : ""}`} onClick={() => setTone(k)}>{label}</button>
              ))}
              <label className="flex items-center gap-1">Size <input type="range" min="2" max="300" value={brush.size} onChange={(e) => setBrush({ ...brush, size: +e.target.value })} /> {brush.size}px</label>
              <label className="flex items-center gap-1">Strength <input type="range" min="5" max="100" value={retouch} onChange={(e) => setRetouch(+e.target.value)} /> {retouch}%</label>
            </div>
          )}
          {tool === "heal" && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-1">Size <input type="range" min="2" max="300" value={brush.size} onChange={(e) => setBrush({ ...brush, size: +e.target.value })} /> {brush.size}px</label>
              <span className="text-white/50">{cloneSet ? "Source set — paint over the blemish; the patch takes the colour around it." : "Alt-click clean skin or texture to copy from, then paint."}</span>
              {!premiumOn && <span className="text-mcz-gold">The healing brush is Premium. <button className="re-link" onClick={() => goToSpot("membershipz", "")}>See Premium</button></span>}
            </div>
          )}
          {(tool === "clone" || tool === "blur" || tool === "smudge") && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-1">Size <input type="range" min="2" max="300" value={brush.size} onChange={(e) => setBrush({ ...brush, size: +e.target.value })} /> {brush.size}px</label>
              {tool !== "clone" && <label className="flex items-center gap-1">Strength <input type="range" min="5" max="100" value={retouch} onChange={(e) => setRetouch(+e.target.value)} /> {retouch}%</label>}
              <span className="text-white/50">
                {tool === "clone" ? (cloneSet ? "Source set — paint to copy from it. Alt-click again to move it." : "Alt-click (Option-click on a Mac) where to copy from, then paint.") : tool === "blur" ? "Paint to soften." : "Drag to push colour along."}
                {" "}Works on the selected layer, inside the selection if there is one.
              </span>
            </div>
          )}
          {tool === "shape" && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <select className="neon-input !w-auto" data-nomemo="true" value={shape.shape} onChange={(e) => setShape({ ...shape, shape: e.target.value })}>
                <option value="rect">Rectangle</option><option value="ellipse">Ellipse</option><option value="line">Line</option>
              </select>
              {shape.shape !== "line" && <label className="flex items-center gap-1"><input type="checkbox" checked={shape.filled} onChange={(e) => setShape({ ...shape, filled: e.target.checked })} /> Filled</label>}
              <label className="flex items-center gap-1">Line <input type="range" min="1" max="100" value={shape.line} onChange={(e) => setShape({ ...shape, line: +e.target.value })} /> {shape.line}px</label>
              <label className="flex items-center gap-1">Colour <input type="color" value={brush.color} onChange={(e) => setBrush({ ...brush, color: e.target.value })} /></label>
              <span className="text-white/50">Drag on the picture — each shape is its own layer.</span>
            </div>
          )}
          {(tool === "magic" || tool === "bgerase") && !erasersAllowed && (
            <div className="space-y-1 text-xs">
              <p className="text-white/60">{tool === "magic" ? "The magic eraser clears everything like the colour you click" : "The background eraser clears the background around your subject as you paint"}. The plain eraser and masks are free at every tier.</p>
              <StatzSample what={tool === "magic" ? "The magic eraser" : "The background eraser"} />
            </div>
          )}
          {(tool === "magic" || tool === "bgerase") && erasersAllowed && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-1">Tolerance <input type="range" min="0" max="100" value={wand.tolerance} onChange={(e) => setWand({ ...wand, tolerance: +e.target.value })} /> {wand.tolerance}%</label>
              {tool === "magic" && <label className="flex items-center gap-1"><input type="checkbox" checked={wand.contiguous} onChange={(e) => setWand({ ...wand, contiguous: e.target.checked })} /> Connected only</label>}
              {tool === "bgerase" && <label className="flex items-center gap-1">Size <input type="range" min="2" max="300" value={brush.size} onChange={(e) => setBrush({ ...brush, size: +e.target.value })} /> {brush.size}px</label>}
              <span className="text-white/50">
                {tool === "magic" ? "Click a colour on the selected layer to clear everything like it." : "Start on the background and paint around your subject — only colours like where you started are erased."}
                {" "}Works on the selected layer, which becomes a picture layer. Undo brings it back.
              </span>
            </div>
          )}
          {tool === "eyedropper" && (
            <p className="flex items-center gap-2 text-xs text-white/60">Click the picture to pick up a colour.
              <span className="inline-block h-4 w-4 rounded border border-white/30" style={{ background: brush.color }} /> {brush.color}</p>
          )}
          {(tool === "brush" || tool === "eraser") && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {onMask && layer?.mask && <span className="text-mcz-cyan">Painting the mask: brush shows the layer, eraser hides it.</span>}
              {tool === "brush" && (
                <select className="neon-input !w-auto" data-nomemo="true" value={tip} onChange={(e) => setTip(e.target.value)}>
                  {TIPS.map(([k, label]) => <option key={k} value={k} disabled={!okTips.has(k)}>{label}{okTips.has(k) ? "" : " — upgrade"}</option>)}
                </select>
              )}
              {tool === "brush" && <label className="flex items-center gap-1">Colour <input type="color" value={brush.color} onChange={(e) => setBrush({ ...brush, color: e.target.value })} /></label>}
              <label className="flex items-center gap-1">Size <input type="range" min="1" max="300" value={brush.size} onChange={(e) => setBrush({ ...brush, size: +e.target.value })} /> {brush.size}px</label>
              <span className="text-white/50">[ and ] change the size. {pressureOn
                ? (penSeen ? "Pen detected — pressure sets the width." : "With a pen tablet (Wacom and similar), pressure sets the width.")
                : <>Your pen draws at full size on {TIER_LABEL[lim?.tier] || "Free"}. <button className="re-link" onClick={() => goToSpot("membershipz", "")}>Pen pressure is Premium</button>.</>}</span>
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
              <h3 className="flex items-center gap-1 font-semibold"><Layers size={14} /> Layers <span className="text-xs text-white/55">{cap === undefined ? doc.layers.length : cap === null ? `${doc.layers.length} · unlimited` : `${doc.layers.length}/${cap}`}</span></h3>
              <div className="flex gap-1">
                <button className="re-btn !w-auto px-2" title="Paint layer" onClick={() => add({ kind: "paint" })}><Plus size={14} /></button>
                <button className="re-btn !w-auto px-2" title="Text layer" onClick={() => add({ kind: "text", x: Math.round(doc.w * 0.1), y: Math.round(doc.h * 0.1), size: Math.round(doc.h / 10) })}><Type size={14} /></button>
                <button className="re-btn !w-auto px-2" title="Fill layer" onClick={() => add({ kind: "fill", color: brush.color, opacity: 50 })}><PaintBucket size={14} /></button>
                <button className="re-btn !w-auto px-2" title="Gradient layer" onClick={() => add({ kind: "gradient", from: brush.color, to: "#000000" })}><Palette size={14} /></button>
              </div>
            </div>
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {doc.layers.map((l, i) => {
                const I = icon[l.kind];
                const g = l.group && doc.groups?.[l.group];
                const head = g && doc.layers[i - 1]?.group !== l.group ? (
                  <li key={`h${l.group}`} className="flex items-center gap-2 rounded-lg border border-mcz-magenta/40 bg-mcz-magenta/10 px-2 py-1 text-sm">
                    <button title={g.open ? "Fold" : "Unfold"} onClick={() => commit((d) => updateGroup(d, l.group, { open: !g.open }))}>{g.open ? <FolderOpenIcon size={14} /> : <Folder size={14} />}</button>
                    <button title={g.visible ? "Hide group" : "Show group"} onClick={() => commit((d) => updateGroup(d, l.group, { visible: !g.visible }))}>
                      {g.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-white/55" />}
                    </button>
                    <input className="min-w-0 flex-1 bg-transparent" value={g.name} onChange={(e) => commit((d) => updateGroup(d, l.group, { name: e.target.value }))} />
                    <input type="number" min="0" max="100" value={g.opacity} title="Group opacity — multiplies each layer's" className="w-11 rounded bg-black/40 px-1 text-right text-xs"
                      onChange={(e) => commit((d) => updateGroup(d, l.group, { opacity: +e.target.value }))} />%
                    <button className="text-xs text-white/60" title="Ungroup — the layers stay" onClick={() => commit((d) => ungroup(d, l.group))}>Ungroup</button>
                  </li>
                ) : null;
                if (g && !g.open) return head;
                const eff = effective(doc, l);
                return [head, (
                  <li key={l.id} onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) { setPicked((pk) => (pk.includes(l.id) ? pk.filter((x) => x !== l.id) : [...pk, l.id])); return; }
                    setSel(l.id); setPicked([]);
                  }} draggable
                    onDragStart={(e) => { setDragRow(l.id); e.dataTransfer.effectAllowed = "move"; }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); if (dragRow) commit((d) => moveLayerTo(d, dragRow, i)); setDragRow(null); }}
                    onDragEnd={() => setDragRow(null)}
                    title="Drag to reorder — top of the list is the front"
                    className={`flex cursor-grab items-center gap-2 rounded-lg border px-2 py-1 text-sm ${g ? "ml-4" : ""} ${sel === l.id ? "border-mcz-cyan bg-mcz-cyan/10" : picked.includes(l.id) ? "border-mcz-magenta bg-mcz-magenta/10" : "border-white/10"} ${eff.visible ? "" : "opacity-60"}`}>
                    <button title={l.visible ? "Hide" : "Show"} onClick={(e) => { e.stopPropagation(); commit((d) => updateLayer(d, l.id, { visible: !l.visible })); }}>
                      {l.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-white/55" />}
                    </button>
                    <I size={14} className="text-white/50" />
                    <span className={`flex-1 truncate ${l.visible ? "" : "text-white/55"}`}>{l.name}</span>
                    <input type="number" min="0" max="100" value={l.opacity} title="Opacity %" aria-label={`${l.name} opacity`}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => commit((d) => updateLayer(d, l.id, { opacity: +e.target.value }))}
                      className="w-11 rounded bg-black/40 px-1 text-right text-xs" />%
                    {l.mask && <Contrast size={12} className={l.mask.on ? "text-mcz-cyan" : "text-white/30"} title="Has a mask" />}
                    {l.style && !l.style.none && <Sparkles size={12} className="text-mcz-gold" title="Has layer styles" />}
                    <button title={l.locked ? "Unlock" : "Lock"} onClick={(e) => { e.stopPropagation(); commit((d) => updateLayer(d, l.id, { locked: !l.locked })); }}>
                      {l.locked ? <Lock size={12} /> : <Unlock size={12} className="text-white/30" />}
                    </button>
                  </li>
                )];
              })}
            </ul>
            <div className="flex flex-wrap items-center gap-1 text-xs text-white/60">
              <button className="re-btn !w-auto px-2" title="Ctrl+G" onClick={groupNow}><Folder size={12} /> Group{picked.length ? ` (${picked.length})` : ""}</button>
              <span>Ctrl-click rows to pick several.</span>
            </div>
            {cap != null && !canAdd(doc, cap) && (
              <p className="text-xs text-mcz-gold">Full — {cap} layers on {TIER_LABEL[lim?.tier] || "your tier"}.{" "}
                <button className="re-link" onClick={() => goToSpot("membershipz", "")}>{nextCap ? `Premium holds ${nextCap}, StatZ unlimited` : "StatZ is unlimited"}</button></p>
            )}
            <div className="flex flex-wrap items-center gap-1 text-xs text-white/70">
              <Blend size={12} /> Opacity down the stack
              <input type="number" className="neon-input !w-14 !py-0.5" min="0" max="100" value={grade.top} onChange={(e) => setGrade({ ...grade, top: +e.target.value })} />% →
              <input type="number" className="neon-input !w-14 !py-0.5" min="0" max="100" value={grade.bottom} onChange={(e) => setGrade({ ...grade, bottom: +e.target.value })} />%
              <button className="re-btn !w-auto px-2" title="Top layer at the first number, bottom at the second, evenly between; the background is left alone"
                onClick={() => commit((d) => gradeOpacity(d, grade.top, grade.bottom))}>Apply</button>
            </div>
            {layer && (
              <div className="flex flex-wrap gap-1">
                <button className="re-btn !w-auto px-2" title="Up" onClick={() => commit((d) => moveLayer(d, sel, -1))}><ArrowUp size={14} /></button>
                <button className="re-btn !w-auto px-2" title="Down" onClick={() => commit((d) => moveLayer(d, sel, 1))}><ArrowDown size={14} /></button>
                <button className="re-btn !w-auto px-2" title="Duplicate" onClick={() => roomFor() && commit((d) => duplicateLayer(d, sel))}><Copy size={14} /></button>
                <button className="re-btn !w-auto px-2" title="Flip horizontal" onClick={() => patch({ flipX: !layer.flipX })}><FlipHorizontal size={14} /></button>
                <button className="re-btn !w-auto px-2" title="Flip vertical" onClick={() => patch({ flipY: !layer.flipY })}><FlipVertical size={14} /></button>
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
                  {BLENDS.map(([k, label]) => <option key={k} value={k} disabled={!okBlends.has(k) && k !== layer.blend}>{label}{okBlends.has(k) ? "" : " — upgrade"}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Contrast size={14} />
                {!layer.mask ? (
                  <button className="re-btn !w-auto px-2" onClick={() => { patch({ mask: { strokes: [] } }); setOnMask(true); setTool("eraser"); }}>Add mask</button>
                ) : <>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={onMask} onChange={(e) => setOnMask(e.target.checked)} /> Paint on mask</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={layer.mask.on} onChange={(e) => patch({ mask: { ...layer.mask, on: e.target.checked } })} /> On</label>
                  <button className="re-btn !w-auto px-2" onClick={() => { patch({ mask: null }); setOnMask(false); }}>Delete mask</button>
                </>}
              </div>
              {layer.mask && (
                <div className="space-y-1 rounded-lg border border-white/10 p-2">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={!!layer.mask.fade}
                    onChange={(e) => patch({ mask: { ...layer.mask, fade: e.target.checked ? { from: 100, to: 0, angle: 90 } : null } })} /> Gradient fade — the layer melts from one opacity to another</label>
                  {layer.mask.fade && <>
                    <label className="flex items-center gap-2">From <input type="range" min="0" max="100" value={layer.mask.fade.from} onChange={(e) => patch({ mask: { ...layer.mask, fade: { ...layer.mask.fade, from: +e.target.value } } })} className="flex-1" /> {layer.mask.fade.from}%</label>
                    <label className="flex items-center gap-2">To <input type="range" min="0" max="100" value={layer.mask.fade.to} onChange={(e) => patch({ mask: { ...layer.mask, fade: { ...layer.mask.fade, to: +e.target.value } } })} className="flex-1" /> {layer.mask.fade.to}%</label>
                    <select className="neon-input" data-nomemo="true" value={layer.mask.fade.style} onChange={(e) => patch({ mask: { ...layer.mask, fade: { ...layer.mask.fade, style: e.target.value } } })}>
                      <option value="linear">Linear</option><option value="radial">Radial — from the centre out</option>
                    </select>
                    {layer.mask.fade.style === "linear" && <label className="flex items-center gap-2">Angle <input type="range" min="-180" max="180" value={layer.mask.fade.angle} onChange={(e) => patch({ mask: { ...layer.mask, fade: { ...layer.mask.fade, angle: +e.target.value } } })} className="flex-1" /> {layer.mask.fade.angle}°</label>}
                  </>}
                </div>
              )}
              {layer.kind === "gradient" && <>
                <label className="flex items-center gap-2">From <input type="color" value={layer.from} onChange={(e) => patch({ from: e.target.value })} /> to <input type="color" value={layer.to} onChange={(e) => patch({ to: e.target.value })} /></label>
                <select className="neon-input" data-nomemo="true" value={layer.style} onChange={(e) => patch({ style: e.target.value })}>
                  <option value="linear">Linear</option><option value="radial">Radial</option>
                </select>
                {layer.style === "linear" && <label className="flex items-center gap-2">Angle <input type="range" min="-180" max="180" value={layer.angle} onChange={(e) => patch({ angle: +e.target.value })} className="flex-1" /> {layer.angle}°</label>}
              </>}
              {layer.kind === "shape" && <>
                <label className="flex items-center gap-2">Colour <input type="color" value={layer.color} onChange={(e) => patch({ color: e.target.value })} /></label>
                {layer.shape !== "line" && <label className="flex items-center gap-1"><input type="checkbox" checked={layer.filled} onChange={(e) => patch({ filled: e.target.checked })} /> Filled</label>}
                <label className="flex items-center gap-2">Line <input type="range" min="1" max="100" value={layer.line} onChange={(e) => patch({ line: +e.target.value })} className="flex-1" /> {layer.line}px</label>
              </>}
              {layer.kind !== "fill" && (
                <details>
                  <summary className="cursor-pointer text-white/70"><Sparkles size={12} className="inline" /> Layer styles{premiumOn ? "" : " — Premium"}</summary>
                  {!premiumOn ? (
                    <p className="mt-1 text-mcz-gold">Drop shadow, glow and stroke are Premium. A style already on a layer keeps showing.{" "}
                      <button className="re-link" onClick={() => goToSpot("membershipz", "")}>See Premium</button></p>
                  ) : <div className="mt-1 space-y-2">
                    {(() => {
                      const st = layer.style || {};
                      const set = (k, v) => patch({ style: { ...st, [k]: { ...(st[k] || {}), ...v } } });
                      const sh = st.shadow || {}, gl = st.glow || {}, sk = st.stroke || {};
                      return <>
                        <div className="space-y-1">
                          <label className="flex items-center gap-2"><input type="checkbox" checked={!!sh.on} onChange={(e) => set("shadow", { on: e.target.checked })} /> Drop shadow <input type="color" value={sh.color || "#000000"} onChange={(e) => set("shadow", { color: e.target.value, on: true })} /></label>
                          {sh.on && <>
                            <label className="flex items-center gap-2">Blur <input type="range" min="0" max="100" value={sh.blur} onChange={(e) => set("shadow", { blur: +e.target.value })} className="flex-1" /> {sh.blur}</label>
                            <label className="flex items-center gap-2">Offset <input type="range" min="-100" max="100" value={sh.x} onChange={(e) => set("shadow", { x: +e.target.value })} className="flex-1" />
                              <input type="range" min="-100" max="100" value={sh.y} onChange={(e) => set("shadow", { y: +e.target.value })} className="flex-1" /></label>
                            <label className="flex items-center gap-2">Opacity <input type="range" min="0" max="100" value={sh.opacity} onChange={(e) => set("shadow", { opacity: +e.target.value })} className="flex-1" /> {sh.opacity}%</label>
                          </>}
                        </div>
                        <div className="space-y-1">
                          <label className="flex items-center gap-2"><input type="checkbox" checked={!!gl.on} onChange={(e) => set("glow", { on: e.target.checked })} /> Outer glow <input type="color" value={gl.color || "#22d3ee"} onChange={(e) => set("glow", { color: e.target.value, on: true })} /></label>
                          {gl.on && <>
                            <label className="flex items-center gap-2">Size <input type="range" min="0" max="120" value={gl.blur} onChange={(e) => set("glow", { blur: +e.target.value })} className="flex-1" /> {gl.blur}</label>
                            <label className="flex items-center gap-2">Opacity <input type="range" min="0" max="100" value={gl.opacity} onChange={(e) => set("glow", { opacity: +e.target.value })} className="flex-1" /> {gl.opacity}%</label>
                          </>}
                        </div>
                        <div className="space-y-1">
                          <label className="flex items-center gap-2"><input type="checkbox" checked={!!sk.on} onChange={(e) => set("stroke", { on: e.target.checked })} /> Stroke <input type="color" value={sk.color || "#ffffff"} onChange={(e) => set("stroke", { color: e.target.value, on: true })} /></label>
                          {sk.on && <label className="flex items-center gap-2">Width <input type="range" min="1" max="40" value={sk.width} onChange={(e) => set("stroke", { width: +e.target.value })} className="flex-1" /> {sk.width}px</label>}
                        </div>
                      </>;
                    })()}
                  </div>}
                </details>
              )}
              {layer.kind !== "fill" && layer.kind !== "gradient" && <>
                <label className="flex items-center gap-2">Scale <input type="range" min="1" max="400" value={Math.round(layer.scale * 100)} onChange={(e) => patch({ scale: +e.target.value / 100 })} className="flex-1" /> {Math.round(layer.scale * 100)}%</label>
                <label className="flex items-center gap-2">Rotate <input type="range" min="-180" max="180" value={layer.rotate} onChange={(e) => patch({ rotate: +e.target.value })} className="flex-1" /> {layer.rotate}°</label>
              </>}
              {(layer.kind === "fill" || layer.kind === "text") && <label className="flex items-center gap-2">Colour <input type="color" value={layer.color} onChange={(e) => patch({ color: e.target.value })} /></label>}
              {layer.kind === "text" && <>
                <textarea className="neon-input" rows={2} value={layer.text} onChange={(e) => patch({ text: e.target.value })} />
                <select className="neon-input" data-nomemo="true" value={layer.font} onChange={(e) => patch({ font: e.target.value })}>
                  {FONTS.map(([k, label]) => {
                    const ok = fonts.some(([f]) => f === k) || k === layer.font;
                    return <option key={k} value={k} disabled={!ok} style={{ fontFamily: k }}>{label}{ok ? "" : " — upgrade"}</option>;
                  })}
                  {!FONTS.some(([k]) => k === layer.font) && <option value={layer.font}>{layer.font.split(",")[0]}</option>}
                </select>
                {fontCap != null && fontCap < FONTS.length && (
                  <p className="text-white/50">{fonts.length} of {FONTS.length} fonts on {TIER_LABEL[lim?.tier] || "your tier"}.{" "}
                    <button className="re-link" onClick={() => goToSpot("membershipz", "")}>
                      {lim?.tier === "free" && lim?.tiers?.premium?.imagez_fonts ? `Premium has ${lim.tiers.premium.imagez_fonts}; ` : ""}StatZ has every font, and your device's own
                    </button></p>
                )}
                {fontCap === null && (
                  <div className="flex gap-1">
                    <input className="neon-input" placeholder="Any font on your device, by name" value={customFont} onChange={(e) => setCustomFont(e.target.value)} />
                    <button className="re-btn !w-auto px-2" disabled={!customFont.trim()} onClick={() => patch({ font: customFont.trim() })}>Use</button>
                  </div>
                )}
                <label className="flex items-center gap-2">Size <input type="number" className="neon-input !w-24" value={layer.size} onChange={(e) => patch({ size: +e.target.value })} /> px</label>
                <div className="flex flex-wrap gap-1">
                  {[["bold", "B", "font-bold"], ["italic", "I", "italic"], ["underline", "U", "underline"]].map(([k, t, cls]) => (
                    <button key={k} className={`re-btn !w-auto px-2 ${cls} ${layer[k] ? "!border-mcz-cyan text-mcz-cyan" : ""}`} onClick={() => patch({ [k]: !layer[k] })}>{t}</button>
                  ))}
                  {["left", "center", "right"].map((a) => (
                    <button key={a} className={`re-btn !w-auto px-2 ${layer.align === a ? "!border-mcz-cyan text-mcz-cyan" : ""}`} onClick={() => patch({ align: a })}>{a[0].toUpperCase() + a.slice(1)}</button>
                  ))}
                </div>
                <label className="flex items-center gap-2">Letter spacing <input type="range" min="-20" max="100" value={layer.spacing} onChange={(e) => patch({ spacing: +e.target.value })} className="flex-1" /> {layer.spacing}px</label>
                <label className="flex items-center gap-2">Line height <input type="range" min="60" max="300" value={Math.round(layer.lineHeight * 100)} onChange={(e) => patch({ lineHeight: +e.target.value / 100 })} className="flex-1" /> {layer.lineHeight.toFixed(2)}</label>
                <label className="flex items-center gap-2">Outline <input type="color" value={layer.outline} onChange={(e) => patch({ outline: e.target.value })} />
                  <input type="range" min="0" max="40" value={layer.outlineW} onChange={(e) => patch({ outlineW: +e.target.value })} className="flex-1" /> {layer.outlineW}px</label>
                <label className="flex items-center gap-2">Shadow <input type="color" value={layer.shadow} onChange={(e) => patch({ shadow: e.target.value })} />
                  <input type="range" min="0" max="60" value={layer.shadowBlur} onChange={(e) => patch({ shadowBlur: +e.target.value })} className="flex-1" title="Blur" /> blur {layer.shadowBlur}</label>
                <label className="flex items-center gap-2">Curve {premiumOn ? "" : <span className="text-mcz-gold">Premium</span>}
                  <input type="range" min="-100" max="100" value={layer.arc} disabled={!premiumOn} onChange={(e) => patch({ arc: +e.target.value })} className="flex-1" /> {layer.arc}</label>
                <label className="flex items-center gap-2">Shadow offset
                  <input type="range" min="-60" max="60" value={layer.shadowX} onChange={(e) => patch({ shadowX: +e.target.value })} className="flex-1" title="Across" />
                  <input type="range" min="-60" max="60" value={layer.shadowY} onChange={(e) => patch({ shadowY: +e.target.value })} className="flex-1" title="Down" /></label>
              </>}
              <details>
                <summary className="cursor-pointer text-white/70">Adjustments</summary>
                <div className="mt-2 space-y-1">
                  <select className="neon-input" data-nomemo="true" value="" onChange={(e) => e.target.value && patch({ adj: PRESETS[e.target.value] })}>
                    <option value="">Preset…</option>
                    {Object.keys(PRESETS).map((k) => <option key={k} value={k} disabled={!okPresets.has(k)}>{k}{okPresets.has(k) ? "" : " — upgrade"}</option>)}
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

          <details className="glass-card p-3 text-xs">
            <summary className="flex cursor-pointer items-center gap-1 font-semibold"><History size={14} /> History <span className="text-white/55">{past.length + 1 + future.length}</span></summary>
            <ol className="mt-2 max-h-48 space-y-0.5 overflow-y-auto">
              {[...past, doc, ...future].map((d, i) => (
                <li key={i}>
                  <button onClick={() => jumpTo(i)}
                    className={`w-full truncate rounded px-2 py-0.5 text-left ${i === past.length ? "bg-mcz-cyan/20 text-mcz-cyan" : i > past.length ? "text-white/50" : "hover:bg-white/5"}`}>
                    {i === 0 && !d._label ? "Start" : d._label || "Edit"}
                  </button>
                </li>
              ))}
            </ol>
            <p className="mt-1 text-white/55">Click a step to go back to it; the steps after it stay until you make a new edit.</p>
          </details>

          <div className="glass-card space-y-2 p-3 text-xs">
            <h3 className="flex items-center gap-1 font-semibold"><BoxSelect size={14} /> Selection {liveSel() ? <span className="text-mcz-cyan">· active</span> : <span className="text-white/55">· none</span>}</h3>
            <div className="flex flex-wrap gap-1">
              <button className="re-btn !w-auto px-2" title="Ctrl+A" onClick={() => setSelection(allSel(doc.w, doc.h))}>All</button>
              <button className="re-btn !w-auto px-2" title="Ctrl+D" disabled={!liveSel()} onClick={() => setSelection(null)}>Deselect</button>
              <button className="re-btn !w-auto px-2" title="Shift+Ctrl+I" disabled={!liveSel()} onClick={() => setSelection(invert(liveSel()))}>Invert</button>
              <span className="flex items-center gap-1">
                <button className="re-btn !w-auto px-2" disabled={!liveSel()} onClick={() => { const s2 = liveSel(); selRef.current = null; setSelection(feather(s2, featherPx)); }}>Feather</button>
                <input type="number" min="1" max="200" value={featherPx} onChange={(e) => setFeatherPx(+e.target.value)} className="neon-input !w-14 !py-0.5" />px
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              <button className="re-btn !w-auto px-2" title="Ctrl+C" disabled={!liveSel()} onClick={() => copySel(false)}>Copy</button>
              <button className="re-btn !w-auto px-2" title="Ctrl+X" disabled={!liveSel()} onClick={() => copySel(true)}>Cut</button>
              <button className="re-btn !w-auto px-2" title="Ctrl+V — as a new layer" onClick={() => pasteClip()}>Paste</button>
              <button className="re-btn !w-auto px-2" title="Ctrl+J" disabled={!liveSel()} onClick={viaCopy}>Layer via copy</button>
              <button className="re-btn !w-auto px-2" title="Delete" disabled={!liveSel()} onClick={clearSel}>Clear</button>
              <button className="re-btn !w-auto px-2" disabled={!liveSel()} onClick={fillSel}>Fill <span className="ml-1 inline-block h-3 w-3 rounded" style={{ background: brush.color }} /></button>
              <button className="re-btn !w-auto px-2" disabled={!liveSel() || !layer} onClick={selToMask}>To mask</button>
            </div>
          </div>

          <div className="glass-card space-y-2 p-3 text-xs" data-tour="imagez-cutout">
            <h3 className="flex items-center gap-1 font-semibold"><Bot size={14} /> AI</h3>
            <div className="space-y-1 rounded-lg border border-white/10 p-2">
              <p className="font-semibold">Remove background</p>
              <p className="text-white/50">{cutState?.what_it_does || "Finds the subject and puts it on a layer mask."}</p>
              {cutState && !cutState.allowed ? <StatzSample what="AI background removal" /> : cutState && (
                <button className="re-btn" disabled={!!busy || !cutState.configured} onClick={cutout}>
                  Remove background <span className="text-mcz-ember">−{cutState.cost_min_cents}–{cutState.cost_cents} 🏷️ or a free prompt · −{cutState.energy_cost} ⚡</span>
                </button>
              )}
              {cutState && !cutState.configured && <p className="text-white/50">The AI isn&apos;t switched on yet.</p>}
              <p className="text-white/55">{cutState?.cost_note} Not charged when no subject is found. StatZ.</p>
            </div>
            <ImageScore busy={!!busy} getImage={() => {
              const d = docRef.current, c = document.createElement("canvas"); c.width = d.w; c.height = d.h;
              renderDoc(c.getContext("2d"), d, images.current);
              return canvasToData(c);
            }} />
            <div className="space-y-1 rounded-lg border border-white/10 p-2">
              <p className="font-semibold">Edit with AI</p>
              <textarea className="neon-input" rows={2} placeholder="What to change — e.g. make the sky purple, add rain, turn it into a painting" value={edit.prompt} onChange={(e) => setEdit({ ...edit, prompt: e.target.value })} />
              <select className="neon-input" data-nomemo="true" value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value })}>
                <option value="">Picture type: keep as it is</option>
                {(imgState?.kinds || []).map((k) => <option key={k.key} value={k.key} disabled={!okKinds.has(k.key)}>{k.label}{okKinds.has(k.key) ? "" : " — upgrade"}</option>)}
              </select>
              <label className="flex cursor-pointer items-center gap-1 text-white/70"><CirclePlay size={12} /> Reference (optional): a picture, or a video — a frame is taken on your device
                <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { pickRef(e.target.files?.[0]); e.target.value = ""; }} /></label>
              {edit.ref && <p className="flex items-center gap-2"><img src={edit.ref} alt="" className="h-8 w-8 rounded object-cover" /> {edit.refName} <button className="re-link" onClick={() => setEdit({ ...edit, ref: "", refName: "" })}>remove</button></p>}
              <label className="flex items-center gap-1"><input type="checkbox" checked={edit.own} onChange={(e) => setEdit({ ...edit, own: e.target.checked })} /> This picture is mine, or I have the rights to edit it</label>
              <button className="re-btn" disabled={!!busy || !imgState?.configured} onClick={aiEdit}>
                Edit with AI <span className="text-mcz-ember">−{imgState?.cost_cents ?? "?"} 🏷️</span>
              </button>
              <p className="text-white/55">{imgState?.cost_note} {imgState?.edit_note} The result lands as a new layer.</p>
            </div>
          </div>

          <div className="glass-card space-y-2 p-3 text-xs" data-tour="imagez-actions">
            <h3 className="flex items-center gap-1 font-semibold"><Circle size={12} className={recording ? "fill-red-500 text-red-500" : ""} /> Actions</h3>
            <p className="text-white/50">Record filters, Levels, Curves, image size and rotation, then replay them on another picture. Saved on this device.</p>
            {!actionsOn ? <StatzSample what="Actions" /> : !recording ? (
              <button className="re-btn" onClick={() => setRecording({ steps: [] })}><Circle size={12} /> Record</button>
            ) : <>
              <p className="text-mcz-cyan">Recording — {recording.steps.length} step{recording.steps.length === 1 ? "" : "s"}{recording.steps.length ? `: ${recording.steps.map(describeStep).join(", ")}` : ""}</p>
              <div className="flex gap-1">
                <input className="neon-input" placeholder="Name it" value={actName} onChange={(e) => setActName(e.target.value)} />
                <button className="re-btn !w-auto px-2" onClick={saveRecording}>Stop &amp; save</button>
              </div>
            </>}
            {actions.map((a, i) => (
              <div key={i} className="flex items-center gap-1">
                <button className="re-btn !w-auto flex-1 px-2 text-left" disabled={!actionsOn || !!busy} onClick={() => playAction(a)} title={a.steps.map(describeStep).join(" → ")}>▶ {a.name} <span className="text-white/55">· {a.steps.length}</span></button>
                <button className="text-white/55" title="Delete" onClick={() => { const n = actions.filter((_, j) => j !== i); setActions(n); saveActions(n); }}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>

          <div className="glass-card space-y-2 p-3 text-xs">
            <h3 className="font-semibold">Filters</h3>
            <select className="neon-input" data-nomemo="true" value={filt.key} onChange={(e) => {
              const f = FILTERS[e.target.value];
              setFilt({ key: e.target.value, amount: f.amount?.[2] ?? 50, radius: f.radius?.[2] ?? 4 });
            }}>
              {Object.entries(FILTERS).map(([k, f]) => <option key={k} value={k}>{f.label}{okFilters.has(k) ? "" : " — upgrade"}</option>)}
            </select>
            {FILTERS[filt.key].amount && <label className="flex items-center gap-2">Amount <input type="range" min={FILTERS[filt.key].amount[0]} max={FILTERS[filt.key].amount[1]} value={filt.amount} onChange={(e) => setFilt({ ...filt, amount: +e.target.value })} className="flex-1" /> {filt.amount}</label>}
            {FILTERS[filt.key].radius && <label className="flex items-center gap-2">Radius <input type="range" min={FILTERS[filt.key].radius[0]} max={FILTERS[filt.key].radius[1]} value={filt.radius} onChange={(e) => setFilt({ ...filt, radius: +e.target.value })} className="flex-1" /> {filt.radius}px</label>}
            {okFilters.has(filt.key) ? (
              <button className="re-btn" onClick={() => {
                doStep({ kind: "filter", key: filt.key, opts: { amount: filt.amount, radius: filt.radius } });
              }}>Apply {FILTERS[filt.key].label}{liveSel() ? " inside the selection" : ""}</button>
            ) : (
              upsell(`${FILTERS[filt.key].label} isn't in your filters`)
            )}
          </div>

          <div className="glass-card space-y-2 p-3 text-xs">
            <h3 className="font-semibold">Image</h3>
            <div className="flex flex-wrap items-center gap-1">
              <button className="re-btn !w-auto px-2" title="Rotate the canvas 90° anticlockwise" onClick={() => doStep({ kind: "rotate", dir: -1 })}><RotateCcw size={14} /></button>
              <button className="re-btn !w-auto px-2" title="Rotate the canvas 90° clockwise" onClick={() => doStep({ kind: "rotate", dir: 1 })}><RotateCw size={14} /></button>
              <span className="ml-2">Image size</span>
              <input type="number" min="1" max="400" value={sizePct} onChange={(e) => setSizePct(+e.target.value)} className="neon-input !w-16 !py-0.5" />%
              <button className="re-btn !w-auto px-2" onClick={() => doStep({ kind: "size", k: sizePct / 100 })}>
                → {Math.round(doc.w * sizePct / 100)}×{Math.round(doc.h * sizePct / 100)}
              </button>
            </div>
          </div>

          <div className="glass-card space-y-2 p-3 text-xs">
            <h3 className="font-semibold">Levels &amp; Curves</h3>
            <p className="text-white/50">On the selected layer{liveSel() ? ", inside the selection" : ""}. Undo takes it back.</p>
            <details>
              <summary className="cursor-pointer text-white/70">Levels</summary>
              <div className="mt-1 space-y-1">
                {[["inBlack", "Input black", 0, 254], ["inWhite", "Input white", 1, 255], ["gamma", "Midtones", 0.1, 4, 0.05], ["outBlack", "Output black", 0, 255], ["outWhite", "Output white", 0, 255]].map(([k, label, lo, hi, st]) => (
                  <label key={k} className="flex items-center gap-2"><span className="w-24">{label}</span>
                    <input type="range" min={lo} max={hi} step={st || 1} value={levels[k]} onChange={(e) => setLevels({ ...levels, [k]: +e.target.value })} className="flex-1" /> {levels[k]}</label>
                ))}
                <button className="re-btn" onClick={() => doStep({ kind: "levels", levels })}>Apply Levels</button>
              </div>
            </details>
            <details>
              <summary className="cursor-pointer text-white/70">Curves</summary>
              <div className="mt-1 space-y-1">
                <svg viewBox="0 0 256 256" className="h-32 w-32 rounded border border-white/10 bg-black/40">
                  <polyline fill="none" stroke="#22d3ee" strokeWidth="3" points={Array.from(curveLUT(curvePts)).map((v, i) => `${i},${255 - v}`).join(" ")} />
                  <line x1="0" y1="255" x2="255" y2="0" stroke="rgba(255,255,255,0.15)" />
                </svg>
                {[["s", "Shadows"], ["m", "Midtones"], ["h", "Highlights"]].map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2"><span className="w-20">{label}</span>
                    <input type="range" min="0" max="255" value={curve[k]} onChange={(e) => setCurve({ ...curve, [k]: +e.target.value })} className="flex-1" /> {curve[k]}</label>
                ))}
                <button className="re-btn" onClick={() => doStep({ kind: "curves", c: curve })}>Apply Curves</button>
              </div>
            </details>
          </div>

          <div className="glass-card space-y-2 p-3 text-xs">
            <h3 className="font-semibold">Export</h3>
            <select className="neon-input" data-nomemo="true" value={fmt} onChange={(e) => { setFmt(e.target.value); setResult(null); }}>
              <option value="image/png">PNG — keeps transparency</option>
              <option value="image/jpeg">JPG — smaller, white where transparent</option>
              <option value="image/webp">WebP — smallest, keeps transparency</option>
            </select>
            <select className="neon-input" data-nomemo="true" value={scaleOut} onChange={(e) => { setScaleOut(+e.target.value); setResult(null); }}>
              <option value={1}>1× — {doc.w}×{doc.h}</option>
              <option value={2}>2× — {doc.w * 2}×{doc.h * 2}</option>
            </select>
            <button className="neon-btn-primary" disabled={!!busy} onClick={doExport}><Download size={14} /> Export {doc.w * scaleOut}×{doc.h * scaleOut} <span className="text-emerald-300">· free</span></button>
            {result && <>
              <a className="re-btn" href={result.url} download={`imagez.${result.ext}`}><Download size={14} /> Download</a>
              <button className="re-btn" disabled={!!busy} title="Saves the picture to FileZ (uses storage) and opens CharacterZ with it as the look — a drawing you made, so it can be a character's face"
                onClick={async () => {
                  setBusy("Saving for CharacterZ…"); setErr("");
                  try {
                    const form = new FormData();
                    form.append("file", result.blob, `character-${Date.now()}.${result.ext}`);
                    const res = await api("/api/economy/uploads/", { method: "POST", body: form });
                    if (res?.upload?.id) handOff("characterz", "", { upload_id: res.upload.id });
                  } catch (e) { setErr(e.message); } finally { setBusy(""); }
                }}>Make a character from it <span className="text-white/60">· uses {(result.blob.size / 1048576).toFixed(1)} MB</span></button>
              <button className="re-btn" title="Put this picture on the VideoZ timeline — free"
                onClick={() => handOff("videoz", "", { url: result.url, name: "ImageZ picture", kind: "image" })}>Use in VideoZ</button>
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
