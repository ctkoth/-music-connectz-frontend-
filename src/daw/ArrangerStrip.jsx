// Studio Dragon's arranger track: the song as named, coloured sections above the timeline. Drag a section onto another to
// reorder the song (the music inside it goes with it); a section's ✎ opens its name, colour, a copy, and the two ways to take
// it out — just the label, or the label AND its music. All of the arranging is arranger.js's; this draws it and says what a
// press will do BEFORE it is pressed (a cut deletes music, and the button says so).
import { useState } from "react";
import { Copy, Layers, Pencil, Scissors, Tag } from "lucide-react";
import { ColorPick } from "./Looks.jsx";
import { sortedSections } from "./arranger.js";
import { STRIP_H } from "./Markers.jsx";

export function ArrangerHeader({ count, onAdd, onFromLoop, canLoop }) {
  return (
    <div className="flex items-center justify-between gap-1 border-b border-white/10 px-2 text-[10px] uppercase tracking-wider text-white/55" style={{ height: STRIP_H }}>
      <span className="truncate">Sections{count ? ` · ${count}` : ""}</span>
      <span className="flex shrink-0 items-center gap-1 normal-case tracking-normal">
        {canLoop && <button type="button" className="rounded px-1 text-white/70 hover:text-white" onClick={onFromLoop} title="Make a section from the loop region" aria-label="Section from the loop region">⟲</button>}
        <button type="button" className="flex items-center gap-0.5 rounded px-1 text-white/70 hover:text-white" onClick={onAdd} title="Add a section (8 bars) after the last one" aria-label="Add a section"><Layers size={11} /> Add</button>
      </span>
    </div>
  );
}

function Editor({ sec, a, onClose }) {
  return (
    <div className="absolute left-0 top-full z-40 mt-1 w-64 space-y-2 rounded-lg border border-white/15 bg-[#12121c] p-2 text-xs shadow-xl" role="dialog" aria-label={`Edit section ${sec.name}`} onClick={(e) => e.stopPropagation()}>
      <label className="block text-white/60">Name
        <input className="mt-0.5 w-full rounded bg-white/10 px-1 py-0.5 text-white" value={sec.name} maxLength={40} aria-label="Section name" autoFocus onChange={(e) => a.update(sec.id, { name: e.target.value })} />
      </label>
      <ColorPick value={sec.color} onChange={(color) => a.update(sec.id, { color })} label="Section colour" />
      <div className="flex flex-wrap gap-1">
        <button type="button" className="re-btn !w-auto px-2 py-0.5" onClick={() => { a.duplicate(sec.id); onClose(); }} title="A copy straight after it; everything after moves along"><Copy size={11} /> Duplicate</button>
        <button type="button" className="re-btn !w-auto px-2 py-0.5" onClick={() => { a.unlabel(sec.id); onClose(); }} title="Takes the name off; the music stays exactly where it is"><Tag size={11} /> Remove label</button>
        <button type="button" className="re-btn !w-auto px-2 py-0.5 !text-mcz-ember" onClick={() => { if (window.confirm(`Cut "${sec.name}" and its music? What follows moves up to close the gap. Undo brings it back.`)) { a.cut(sec.id); onClose(); } }}
                title="Deletes this section's music (every track) and closes the gap. Undo brings it back."><Scissors size={11} /> Cut with its music</button>
      </div>
      <div className="flex justify-end"><button type="button" className="re-btn !w-auto px-2 py-0.5" onClick={onClose}>Done</button></div>
    </div>
  );
}

export function ArrangerStrip({ session, zoom, width, arranger: a, onSeek }) {
  const [open, setOpen] = useState(null);
  const [drag, setDrag] = useState(null);         // id being dragged
  const [over, setOver] = useState(null);         // { id, after } the drop slot under the pointer
  const list = sortedSections(session);
  const drop = (e, targetId) => {
    e.preventDefault();
    const from = drag || e.dataTransfer.getData("text/mcz-section");
    setDrag(null); setOver(null);
    if (!from || from === targetId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const after = e.clientX > rect.left + rect.width / 2;
    const ids = list.map((x) => x.id).filter((x) => x !== from);
    let at = ids.indexOf(targetId) + (after ? 1 : 0);
    a.move(from, at);
  };
  return (
    <div className="relative border-b border-white/10 bg-black/25" style={{ width, height: STRIP_H }} data-tour="dragon-arranger" onClick={() => setOpen(null)}>
      {list.length === 0 && <span className="absolute left-2 top-0 flex h-full items-center text-[10px] text-white/40">No sections yet — press Add to start the song map (Intro, Verse, Chorus…)</span>}
      {list.map((x) => (
        <div key={x.id} draggable onDragStart={(e) => { setDrag(x.id); e.dataTransfer.setData("text/mcz-section", x.id); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDrag(null); setOver(null); }}
             onDragOver={(e) => { if (drag || [...(e.dataTransfer.types || [])].includes("text/mcz-section")) { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setOver({ id: x.id, after: e.clientX > r.left + r.width / 2 }); } }}
             onDragLeave={() => setOver((o) => (o?.id === x.id ? null : o))} onDrop={(e) => drop(e, x.id)}
             className={`absolute top-0.5 flex h-[calc(100%-4px)] cursor-grab items-center gap-1 overflow-visible rounded-md px-1.5 text-[10px] font-semibold text-black active:cursor-grabbing ${drag === x.id ? "opacity-40" : ""}`}
             style={{ left: x.start * zoom, width: Math.max(18, (x.end - x.start) * zoom - 2), background: x.color,
                      boxShadow: over?.id === x.id ? (over.after ? "inset -3px 0 0 #fff" : "inset 3px 0 0 #fff") : "none" }}
             title={`${x.name} — drag onto another section to move it, click to jump to it`} onClick={(e) => { e.stopPropagation(); onSeek(x.start); }}>
          <span className="min-w-0 flex-1 truncate">{x.name}</span>
          <button type="button" className="shrink-0 rounded p-0.5 text-black/60 hover:bg-black/15 hover:text-black" aria-label={`Edit section ${x.name}`} onClick={(e) => { e.stopPropagation(); setOpen(open === x.id ? null : x.id); }}><Pencil size={10} /></button>
          {open === x.id && <Editor sec={x} a={a} onClose={() => setOpen(null)} />}
        </div>
      ))}
    </div>
  );
}
