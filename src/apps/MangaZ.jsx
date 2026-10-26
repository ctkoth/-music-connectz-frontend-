// MangaZ — AI pages from your CharacterZ and your idea.
//
// Two steps, each priced on its button: the SCRIPT (panels, shots, each character's
// lines written in their own voice), editable before anything is drawn; then the
// DRAWING, either panel by panel (each character's own look rides along, redraw any
// one) or the whole page as one image (one charge). Every page is AI-made and says so.
// Prices, styles, limits and the label are /api/economy/mangaz/.
import { useEffect, useState } from "react";
import { Loader2, PenLine, Brush } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { goToSpot } from "../goto.js";
import { PROMPTZ } from "../resources.js";
import { Price } from "../components/Price.jsx";
import AiEnergy from "../components/AiEnergy.jsx";
import LoadGate from "../components/LoadGate.jsx";
import Empty from "../components/Empty.jsx";
import Doors from "../components/Doors.jsx";

// A script is a text run, so a free daily prompt covers it; a drawing is an image run,
// which the daily allowance never covers (the server bills them that way).
function Cost({ s, drawing = false }) {
  return <span className="text-[11px]"><Price amount={s.cost_cents} emoji={PROMPTZ} freeToday={!drawing && s.free_today} /> <AiEnergy />{" "}
    <span className="text-white/40">{drawing ? "per image · " : ""}not charged if nothing comes back</span></span>;
}

function PageEditor({ s, page, chars, onChange }) {
  const [p, setP] = useState(page);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => setP(page), [page]);
  const editPanel = (i, patch) => setP((x) => ({ ...x, panels: x.panels.map((q, k) => (k === i ? { ...q, ...patch } : q)) }));
  async function saveScript() {
    setBusy("save"); setMsg("");
    try { onChange(await api(`/api/economy/mangaz/${p.id}/`, { method: "PATCH", body: { title: p.title, panels: p.panels } })); setMsg("Script saved."); }
    catch (e) { setMsg(e.message || "Couldn't save the script."); } finally { setBusy(""); }
  }
  async function draw(n) {
    setBusy(`d${n}`); setMsg("");
    try { await api(`/api/economy/mangaz/${p.id}/`, { method: "PATCH", body: { panels: p.panels } });
          onChange(await api(`/api/economy/mangaz/${p.id}/panel/${n}/draw/`, { method: "POST" })); }
    catch (e) { setMsg(e.message || "That didn't draw. Nothing was charged."); } finally { setBusy(""); }
  }
  const names = chars.map((c) => c.name);
  return (
    <div className="re-card space-y-3" data-tour="mangaz-page">
      <input className="neon-input !py-2 font-semibold" value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} aria-label="Page title" />
      <p className="text-[11px] text-mcz-gold">{s.ai_label}</p>
      {p.panels.map((q, i) => (
        <div key={q.n} className="space-y-1.5 rounded-lg bg-white/5 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">Panel {q.n} · {q.shot}</p>
          <input className="neon-input !py-1.5 text-sm" value={q.action} onChange={(e) => editPanel(i, { action: e.target.value })} aria-label={`Panel ${q.n} action`} />
          {q.dialogue.map((dl, j) => (
            <div key={j} className="flex items-center gap-1.5 text-sm">
              <select aria-label="Speaker" data-nomemo="true" className="neon-input !w-auto !py-1 text-xs" value={dl.who}
                      onChange={(e) => editPanel(i, { dialogue: q.dialogue.map((x, k) => (k === j ? { ...x, who: e.target.value } : x)) })}>
                {names.map((nm) => <option key={nm} value={nm}>{nm}</option>)}
              </select>
              <input className="neon-input !py-1 flex-1 text-sm" value={dl.line} aria-label="Line"
                     onChange={(e) => editPanel(i, { dialogue: q.dialogue.map((x, k) => (k === j ? { ...x, line: e.target.value } : x)) })} />
            </div>
          ))}
          {q.image && <img src={q.image} alt={`Panel ${q.n}`} className="w-full rounded-lg" />}
          <button className="re-btn !w-auto px-3 py-1 text-xs" disabled={!!busy} onClick={() => draw(q.n)}>
            {busy === `d${q.n}` ? <Loader2 size={12} className="animate-spin" /> : <Brush size={12} />} {q.image ? "Redraw" : "Draw"} panel {q.n}{" "}
            <Price amount={s.cost_cents} emoji={PROMPTZ} /> <AiEnergy />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button className="re-btn !w-auto px-4" disabled={!!busy} onClick={saveScript}>Save script <span className="text-emerald-300">Free</span></button>
        <button className="neon-btn-primary !w-auto px-4" disabled={!!busy} onClick={() => draw(0)}>
          {busy === "d0" ? <Loader2 size={14} className="animate-spin" /> : <Brush size={14} />} Draw the whole page as one image
        </button>
        <Cost s={s} drawing />
      </div>
      <p className="text-[11px] text-white/40">Panel by panel keeps your characters' looks consistent and lets you redraw one; the whole page is one charge but drifts more.</p>
      {p.page_image && (
        <>
          <img src={p.page_image} alt={p.title} className="w-full rounded-lg" />
          <Doors item={{ title: p.title, url: p.page_image, kind: "image", text: s.ai_label }} />
        </>
      )}
      {msg && <p role="status" className="text-xs text-white/70">{msg}</p>}
    </div>
  );
}

export default function MangaZ() {
  const [s, setS] = useState(null);
  const [chars, setChars] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [picked, setPicked] = useState([]);
  const [idea, setIdea] = useState("");
  const [panels, setPanels] = useState(4);
  const [style, setStyle] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(null);
  const load = () => Promise.all([api("/api/economy/mangaz/"), api("/api/economy/characterz/")])
    .then(([m, c]) => { setS(m); setChars(c.characters); setLoadErr(""); })
    .catch((e) => setLoadErr(e.message || "MangaZ didn't load."));
  useEffect(() => { load(); }, []);
  if (!s || !chars) return <LoadGate error={loadErr} what="MangaZ" onRetry={load} />;

  async function write() {
    setBusy(true); setMsg("");
    try {
      const page = await api("/api/economy/mangaz/", { method: "POST", body: { character_ids: picked, idea, panels, style } });
      setOpen(page); load();
    } catch (e) { setMsg(e.message || "Couldn't write the page. Nothing was charged."); }
    finally { setBusy(false); }
  }
  const pageChars = (pg) => chars.filter((c) => (pg.character_ids || []).includes(c.id));

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="re-card space-y-1">
        <h2 className="flex items-center gap-3 font-display text-xl font-extrabold">
          <IconImg icon="mangaz.png" alt="" className="h-11 w-11 rounded-xl" /> MangaZ
        </h2>
        <p className="text-sm text-white/60">Your characters and your idea, made into a manga page. You edit the script before anything is drawn.</p>
        <p className="text-[11px] text-mcz-gold">{s.ai_label}</p>
      </div>
      {chars.length === 0 ? (
        <Empty text="MangaZ needs at least one character." action="Make one in CharacterZ" onAction={() => goToSpot("characterz", "")} />
      ) : (
        <div className="re-card space-y-3" data-tour="mangaz-new">
          <div className="flex flex-wrap gap-1.5">
            {chars.map((c) => (
              <button key={c.id} type="button" className={`pill text-[12px] ${picked.includes(c.id) ? "!border-mcz-cyan !text-mcz-cyan" : ""}`}
                      onClick={() => setPicked((x) => (x.includes(c.id) ? x.filter((i) => i !== c.id) : [...x, c.id].slice(0, s.max_characters)))}>
                {c.name}
              </button>
            ))}
            <button className="re-link text-[12px]" onClick={() => goToSpot("characterz", "")}>+ character</button>
          </div>
          <textarea className="neon-input text-sm" rows={3} maxLength={s.idea_max} placeholder="What happens on this page?"
                    value={idea} onChange={(e) => setIdea(e.target.value)} aria-label="Idea" />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1">Panels
              <input type="number" min={s.panels_min} max={s.panels_max} className="neon-input !w-16 !py-1" value={panels}
                     onChange={(e) => setPanels(Number(e.target.value))} aria-label="Panels" />
            </label>
            <select aria-label="Style" className="neon-input !w-auto !py-1 text-xs" value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="">Any style</option>
              {s.styles.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="neon-btn-primary !w-auto px-5" disabled={busy || !picked.length || !idea.trim() || !s.configured} onClick={write}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />} Write the script
            </button>
            <Cost s={s} />
          </div>
          {!s.configured && <p className="text-xs text-mcz-ember">MangaZ isn't switched on yet.</p>}
          {msg && <p role="alert" className="text-xs text-mcz-ember">{msg}</p>}
        </div>
      )}
      {open && <PageEditor s={s} page={open} chars={pageChars(open)} onChange={(pg) => { setOpen(pg); load(); }} />}
      {s.pages.length > 0 && (
        <div className="space-y-1">
          <p className="re-label">Your pages</p>
          {s.pages.map((pg) => (
            <button key={pg.id} className="block w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10" onClick={() => setOpen(pg)}>
              {pg.title} <span className="text-[11px] text-white/40">· {pg.panels.length} panels{pg.page_image || pg.panels.some((q) => q.image) ? " · drawn" : ""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
