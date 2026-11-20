// Colour and emoji pickers for tracks and markers. A colour is a native colour input (the OS picker, every device) plus
// the session's own eight swatches; an emoji is a short list of music and mixing marks plus a box that takes any emoji the
// keyboard can type. What is kept is the model's call (session.js cleanColor / cleanEmoji), never this file's.
import { useState } from "react";
import { COLORS } from "./session.js";

export const EMOJI_CHOICES = ["🎤", "🎧", "🎹", "🎸", "🎻", "🥁", "🎺", "🎷", "🎼", "🎵", "🔥", "⭐", "💎", "👑", "⚡", "🌊", "☁️", "🌙", "❤️", "💯", "🚀", "🎯", "🔊", "🪄", "🧪", "📍", "🏁", "🎬"];

export function ColorPick({ value, onChange, label = "Colour" }) {
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label={label}>
      {COLORS.map((c) => (
        <button key={c} type="button" aria-label={`${label} ${c}`} aria-pressed={value === c} onClick={() => onChange(c)}
                className={`h-4 w-4 rounded-full border ${value === c ? "border-white" : "border-transparent"}`} style={{ background: c }} />
      ))}
      <input type="color" aria-label={`${label}, any colour`} value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#22d3ee"}
             onChange={(e) => onChange(e.target.value)} className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0" />
    </div>
  );
}

export function EmojiPick({ value, onChange, label = "Emoji" }) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-1" role="group" aria-label={label}>
      <div className="flex flex-wrap gap-0.5">
        <button type="button" aria-label="No emoji" aria-pressed={!value} onClick={() => onChange("")}
                className={`rounded px-1 text-[10px] ${!value ? "bg-white/20 text-white" : "text-white/50"}`}>none</button>
        {EMOJI_CHOICES.map((e) => (
          <button key={e} type="button" aria-label={`${label} ${e}`} aria-pressed={value === e} onClick={() => onChange(e)}
                  className={`rounded px-0.5 text-sm ${value === e ? "bg-white/25" : "hover:bg-white/10"}`}>{e}</button>
        ))}
      </div>
      <input className="w-full rounded bg-white/10 px-1 py-0.5 text-xs text-white" placeholder="…or type any emoji" aria-label={`${label}, type your own`}
             value={text} onChange={(e) => { setText(e.target.value); onChange(e.target.value); }} />
    </div>
  );
}
