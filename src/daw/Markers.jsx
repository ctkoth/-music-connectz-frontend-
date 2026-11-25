// Markers: named, coloured, optionally emoji'd points on the timeline. They live on the SESSION (session.js), so every DAW
// has them and a session copied from one DAW to another keeps them. Click a marker to jump there; ✎ edits its name, emoji,
// colour and exact time, or deletes it. Double-click an empty stretch of the strip to add one there.
import { useState } from "react";
import { Flag, Pencil, Trash2 } from "lucide-react";
import { sortedMarkers } from "./session.js";
import { ColorPick, EmojiPick } from "./Looks.jsx";

export const STRIP_H = 24;

export function MarkerEditor({ marker, onChange, onRemove, onClose }) {
  return (
    <div className="absolute left-0 top-full z-40 mt-1 w-60 space-y-2 rounded-lg border border-white/15 bg-[#12121c] p-2 text-xs shadow-xl" role="dialog" aria-label={`Edit marker ${marker.name}`}>
      <label className="block text-white/60">Name
        <input className="mt-0.5 w-full rounded bg-white/10 px-1 py-0.5 text-white" value={marker.name} maxLength={40} aria-label="Marker name" autoFocus
               onChange={(e) => onChange({ name: e.target.value })} />
      </label>
      <EmojiPick value={marker.emoji} onChange={(emoji) => onChange({ emoji })} label="Marker emoji" />
      <ColorPick value={marker.color} onChange={(color) => onChange({ color })} label="Marker colour" />
      <label className="block text-white/60">Time (seconds)
        <input type="number" step="0.01" min="0" className="mt-0.5 w-24 rounded bg-white/10 px-1 py-0.5 text-white" value={Number(marker.t.toFixed(2))}
               aria-label="Marker time" onChange={(e) => onChange({ t: e.target.value })} />
      </label>
      <div className="flex items-center justify-between">
        <button type="button" className="flex items-center gap-1 text-white/50 hover:text-mcz-ember" onClick={onRemove}><Trash2 size={11} /> Delete</button>
        <button type="button" className="re-btn !w-auto px-2 py-0.5" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

export function MarkerStrip({ session, zoom, width, onSeek, onAdd, onChange, onRemove }) {
  const [open, setOpen] = useState(null);
  const list = sortedMarkers(session);
  return (
    <div className="relative border-b border-white/10 bg-black/30" style={{ width, height: STRIP_H }} data-tour="daw-markers"
         onDoubleClick={(e) => { if (e.target === e.currentTarget) onAdd((e.clientX - e.currentTarget.getBoundingClientRect().left) / zoom); }}
         title="Double-click to add a marker here">
      {list.map((m) => (
        <div key={m.id} className="absolute top-0 flex h-full items-center" style={{ left: m.t * zoom }}>
          <span className="absolute left-0 top-0 h-full w-px" style={{ background: m.color }} />
          <button type="button" className="ml-0.5 flex max-w-[9rem] items-center gap-0.5 truncate rounded-r px-1 text-[10px] font-semibold text-black"
                  style={{ background: m.color }} title={`${m.name} — click to jump here`} aria-label={`Marker ${m.name}`} onClick={() => onSeek(m.t)}>
            {m.emoji && <span>{m.emoji}</span>}<span className="truncate">{m.name}</span>
          </button>
          <button type="button" className="ml-0.5 text-white/40 hover:text-white" aria-label={`Edit marker ${m.name}`} onClick={() => setOpen(open === m.id ? null : m.id)}><Pencil size={9} /></button>
          {open === m.id && <MarkerEditor marker={m} onChange={(p) => onChange(m.id, p)} onRemove={() => { setOpen(null); onRemove(m.id); }} onClose={() => setOpen(null)} />}
        </div>
      ))}
    </div>
  );
}

export function MarkerHeader({ count, onAdd }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 px-2 text-[10px] uppercase tracking-wider text-white/55" style={{ height: STRIP_H }}>
      <span>Markers{count ? ` · ${count}` : ""}</span>
      <button type="button" className="flex items-center gap-0.5 rounded px-1 normal-case tracking-normal text-white/70 hover:text-white" onClick={() => onAdd()}
              title="Add a marker at the playhead" aria-label="Add a marker at the playhead"><Flag size={11} /> Add</button>
    </div>
  );
}
