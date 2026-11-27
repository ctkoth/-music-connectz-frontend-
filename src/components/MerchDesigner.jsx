import { useEffect, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { api } from "../api.js";
import { keepsRange, previewSplit, usd } from "../shopSplit.js";
import { COLORS, PRODUCTS, isLight, placeArt, productFor } from "../merchz.js";

const SIZE = 900;

// Simple silhouettes, drawn in the product colour. Good enough to judge placement; not a photo mockup.
function drawProduct(ctx, key, color) {
  const s = SIZE, line = isLight(color) ? "#333" : "#bbb";
  ctx.fillStyle = color; ctx.strokeStyle = line; ctx.lineWidth = 4;
  ctx.beginPath();
  if (key === "shirt") {
    ctx.moveTo(s * .35, s * .12); ctx.quadraticCurveTo(s * .5, s * .2, s * .65, s * .12);
    ctx.lineTo(s * .9, s * .25); ctx.lineTo(s * .8, s * .4); ctx.lineTo(s * .72, s * .35);
    ctx.lineTo(s * .72, s * .9); ctx.lineTo(s * .28, s * .9); ctx.lineTo(s * .28, s * .35);
    ctx.lineTo(s * .2, s * .4); ctx.lineTo(s * .1, s * .25); ctx.closePath();
  } else if (key === "hoodie") {
    ctx.moveTo(s * .38, s * .16); ctx.quadraticCurveTo(s * .5, s * .02, s * .62, s * .16);
    ctx.lineTo(s * .88, s * .3); ctx.lineTo(s * .9, s * .82); ctx.lineTo(s * .8, s * .82); ctx.lineTo(s * .74, s * .4);
    ctx.lineTo(s * .74, s * .92); ctx.lineTo(s * .26, s * .92); ctx.lineTo(s * .26, s * .4);
    ctx.lineTo(s * .2, s * .82); ctx.lineTo(s * .1, s * .82); ctx.lineTo(s * .12, s * .3); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.beginPath();
    ctx.roundRect(s * .34, s * .66, s * .32, s * .14, 10);   // front pocket
  } else if (key === "towel") {
    ctx.roundRect(s * .1, s * .15, s * .8, s * .7, 18);
  } else if (key === "bandana") {
    ctx.moveTo(s * .5, s * .08); ctx.lineTo(s * .92, s * .5); ctx.lineTo(s * .5, s * .92); ctx.lineTo(s * .08, s * .5); ctx.closePath();
  } else if (key === "wavecap") {
    ctx.ellipse(s * .5, s * .55, s * .3, s * .32, 0, Math.PI, 0); ctx.lineTo(s * .8, s * .7); ctx.lineTo(s * .2, s * .7); ctx.closePath();
  } else if (key === "mug") {
    ctx.roundRect(s * .2, s * .24, s * .46, s * .52, 16);
    ctx.fill(); ctx.stroke(); ctx.beginPath();
    ctx.lineWidth = s * .04; ctx.strokeStyle = color; ctx.arc(s * .7, s * .5, s * .1, -Math.PI / 2, Math.PI / 2);
    ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = line; ctx.beginPath();
  } else if (key === "phonecase") {
    ctx.roundRect(s * .33, s * .1, s * .34, s * .8, 36);
    ctx.fill(); ctx.stroke(); ctx.beginPath();
    ctx.fillStyle = "#222"; ctx.roundRect(s * .36, s * .13, s * .1, s * .1, 14);
  } else if (key === "sticker") {
    ctx.roundRect(s * .2, s * .2, s * .6, s * .6, 48);
  } else if (key === "poster") {
    ctx.rect(s * .24, s * .1, s * .52, s * .8);
  } else if (key === "tote") {
    ctx.rect(s * .24, s * .32, s * .52, s * .56);
    ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.lineWidth = s * .025; ctx.strokeStyle = color;
    ctx.moveTo(s * .36, s * .32); ctx.quadraticCurveTo(s * .36, s * .1, s * .5, s * .1); ctx.quadraticCurveTo(s * .64, s * .1, s * .64, s * .32);
    ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = line; ctx.beginPath();
  } else if (key === "buckethat") {
    ctx.moveTo(s * .32, s * .58); ctx.lineTo(s * .35, s * .3); ctx.quadraticCurveTo(s * .5, s * .22, s * .65, s * .3);
    ctx.lineTo(s * .68, s * .58); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath();
    ctx.ellipse(s * .5, s * .6, s * .32, s * .08, 0, 0, 2 * Math.PI);
  } else if (key === "beanie") {
    ctx.ellipse(s * .5, s * .55, s * .26, s * .32, 0, Math.PI, 0); ctx.lineTo(s * .76, s * .74); ctx.lineTo(s * .24, s * .74); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(s * .24, s * .56); ctx.lineTo(s * .76, s * .56);
  } else if (key === "baseballcap") {
    ctx.ellipse(s * .5, s * .52, s * .26, s * .28, 0, Math.PI, 0); ctx.lineTo(s * .24, s * .52); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.beginPath();
    ctx.ellipse(s * .5, s * .56, s * .36, s * .08, 0, 0, Math.PI); ctx.lineTo(s * .14, s * .53); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(s * .5, s * .24, s * .02, 0, 2 * Math.PI);
  } else {
    ctx.ellipse(s * .5, s * .5, s * .28, s * .3, 0, Math.PI, 0); ctx.lineTo(s * .78, s * .66); ctx.lineTo(s * .22, s * .66); ctx.closePath();
    ctx.moveTo(s * .7, s * .62); ctx.lineTo(s * .85, s * .95); ctx.lineTo(s * .78, s * .95); ctx.lineTo(s * .64, s * .64);
  }
  ctx.fill(); ctx.stroke();
}

export default function MerchDesigner({ onListed }) {
  const [product, setProduct] = useState("shirt");
  const [color, setColor] = useState(COLORS[0]);
  const [img, setImg] = useState(null);
  const [text, setText] = useState("");
  const [scale, setScale] = useState(1);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const canvas = useRef(null);
  const [meta, setMeta] = useState(null);
  const [shopTitle, setShopTitle] = useState("");
  const [ownArt, setOwnArt] = useState(false);
  const [listMsg, setListMsg] = useState("");
  useEffect(() => { api("/api/economy/merch/shop/?mine=1").then(setMeta).catch(() => {}); }, []);
  const markupCents = meta?.markup_cents ?? 0; // the same $10 on every design, whatever the plan
  const preview = meta ? previewSplit(meta, product, markupCents, meta.dev_tax?.free ?? 0) : null;
  const keeps = meta ? keepsRange(meta, product, markupCents) : null;
  const list = async () => {
    setListMsg(""); setBusy(true);
    try {
      const b = await new Promise((res) => canvas.current.toBlob(res, "image/png"));
      const form = new FormData();
      form.append("image", b, `design-${product}.png`); form.append("product", product); form.append("color", color);
      form.append("title", shopTitle.trim()); form.append("own_art", ownArt ? "1" : "");
      await api("/api/economy/merch/shop/", { method: "POST", body: form });
      setListMsg("In your shop. Buyers can see it now; checkout opens when a printer is connected.");
      onListed?.();
    } catch (e) { setListMsg(e.message || "Couldn't put it in your shop."); } finally { setBusy(false); }
  };

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#1a1025"; ctx.fillRect(0, 0, SIZE, SIZE);
    drawProduct(ctx, product, color);
    const a = productFor(product).area;
    ctx.setLineDash([8, 8]); ctx.strokeStyle = "rgba(0,229,255,.55)"; ctx.lineWidth = 2;
    ctx.strokeRect(a.x * SIZE, a.y * SIZE, a.w * SIZE, a.h * SIZE); ctx.setLineDash([]);
    if (img) { const r = placeArt(product, img.width, img.height, SIZE, scale, dx, dy); ctx.drawImage(img, r.x, r.y, r.w, r.h); }
    if (text.trim()) {
      const fs = Math.round(a.h * SIZE * 0.22 * scale);
      ctx.font = `bold ${fs}px Poppins, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = isLight(color) ? "#111" : "#fff";
      const cx = (a.x + a.w / 2) * SIZE + (a.w * SIZE / 3) * dx, cy = (a.y + a.h / 2) * SIZE + (a.h * SIZE / 3) * dy + (img ? a.h * SIZE * 0.35 : 0);
      ctx.fillText(text.trim().slice(0, 40), cx, Math.min(cy, (a.y + a.h) * SIZE - fs / 2), a.w * SIZE);
    }
  }, [product, color, img, text, scale, dx, dy]);

  const pick = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setMsg("That isn't a picture — pick a PNG or JPG."); return; }
    const url = URL.createObjectURL(f); const i = new Image();
    i.onload = () => { setImg(i); setMsg(""); }; i.onerror = () => setMsg("That picture couldn't be opened."); i.src = url;
  };
  const blob = () => new Promise((res) => canvas.current.toBlob(res, "image/png"));
  const download = async () => {
    const b = await blob(); const a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = `merchz-${product}.png`; a.click();
  };
  const save = async () => {
    setBusy(true); setMsg("");
    try {
      const b = await blob(); const form = new FormData();
      form.append("file", b, `merchz-${product}.png`);
      await api("/api/economy/uploads/", { method: "POST", body: form });
      setMsg(`Saved to FileZ (${(b.size / 1048576).toFixed(1)} MB).`);
    } catch (e) { setMsg(e.message || "Couldn't save to FileZ."); } finally { setBusy(false); }
  };

  return (
    <div className="re-card space-y-3" data-tour="merchz-designer">
      <div>
        <h2 className="text-lg font-semibold">👕 Design your own <span className="text-xs font-normal text-emerald-300">Free</span></h2>
        <p className="text-sm text-white/70">A towel, T-shirt, hoodie, bandana, wave cap, durag, baseball cap, mug, phone case, sticker, poster, tote bag, bucket hat or beanie. Free, on this device. <span className="text-mcz-gold">Ordering isn't open yet</span> — no printer is connected, so nothing here can be bought. Save your designs and they'll be ready when it is.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRODUCTS.map((p) => (
          <button key={p.key} type="button" onClick={() => setProduct(p.key)} className={`pill ${product === p.key ? "!border-mcz-cyan !text-mcz-cyan" : ""}`}>{p.emoji} {p.label}</button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <canvas ref={canvas} width={SIZE} height={SIZE} className="w-full max-w-[480px] rounded-xl border border-white/10" aria-label={`Mockup of your ${productFor(product).label}`} />
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5"><span className="text-sm text-white/70">Colour</span>
            {COLORS.map((c) => <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => setColor(c)} style={{ background: c }} className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-mcz-cyan" : "border-white/20"}`} />)}
          </div>
          <label className="re-btn !w-auto cursor-pointer px-3"><Upload size={14} /> Your art (PNG or JPG)
            <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {img ? <button type="button" className="pill text-xs" onClick={() => setImg(null)}>Remove art</button> : null}
          <input className="neon-input" maxLength={40} placeholder="Text (optional, 40 characters)" value={text} onChange={(e) => setText(e.target.value)} />
          <label className="block text-sm text-white/70">Size <input type="range" min={0.2} max={1} step={0.05} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full" /></label>
          <label className="block text-sm text-white/70">Left ↔ right <input type="range" min={-1} max={1} step={0.05} value={dx} onChange={(e) => setDx(Number(e.target.value))} className="w-full" /></label>
          <label className="block text-sm text-white/70">Up ↕ down <input type="range" min={-1} max={1} step={0.05} value={dy} onChange={(e) => setDy(Number(e.target.value))} className="w-full" /></label>
          {productFor(product).note ? <p className="text-xs text-mcz-gold">🧵 {productFor(product).note}</p> : null}
          <p className="text-xs text-white/50">The dashed box is the print area; art stays inside it. The shape is a guide, not a photo of the product.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="re-btn !w-auto px-3" onClick={download}><Download size={14} /> Download mockup · free</button>
            <button type="button" className="re-btn !w-auto px-3" disabled={busy} onClick={save}>Save to FileZ · uses your storage</button>
          </div>
          {msg ? <p className="text-sm text-white/80" role="status">{msg}</p> : null}
          {meta && preview ? (
            <div className="space-y-2 rounded-xl border border-white/10 p-3" data-tour="merchz-list">
              <h3 className="font-semibold">🛍️ Put it in your shop</h3>
              <input className="neon-input" maxLength={120} placeholder="Name it (what buyers see)" value={shopTitle} onChange={(e) => setShopTitle(e.target.value)} />
              <p className="text-sm text-white/70">Your markup is <span className="font-semibold">{usd(markupCents)}</span> on every design, whatever your plan.</p>
              <p className="text-sm">
                Buyer pays <span className="font-semibold">{usd(preview.price)}</span> = printer {usd(preview.printer)} + your markup {usd(markupCents)}.
                Dev tax comes out of your markup at the buyer's plan rate. <span className="text-emerald-300">You keep +{usd(keeps.min)}–{usd(keeps.max)} 💵</span> a sale.
              </p>
              <p className="text-xs text-white/50">{meta.estimate_note}</p>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={ownArt} onChange={(e) => setOwnArt(e.target.checked)} /> <span>This is my own art. {meta.own_art_rule}</span></label>
              <button type="button" className="re-btn !w-auto px-3" disabled={busy || !ownArt || !shopTitle.trim()} onClick={list}>Put it in my shop · free</button>
              {listMsg ? <p className="text-sm text-white/80" role="status">{listMsg}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
