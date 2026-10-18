import { useState } from "react";

// The post a past take wrote about itself, in a box a member can copy from.
//
// The server builds the brief from what it stored when the coach answered and runs
// the same writer Sentence ConnectZ does, so the price, the daily allowance and
// "a failed run is not charged" are the writer's own — this only shows the answer.
// The text is editable because it is theirs to post; the link inside it is the
// public card, and only says "human-made" if they declared it.
//
// `copy` is injectable so the pure bits run under plain node.
export async function copyText(text, nav = typeof navigator !== "undefined" ? navigator : null) {
  try {
    if (nav?.clipboard?.writeText) { await nav.clipboard.writeText(text); return true; }
  } catch { /* fall through to the manual path */ }
  return false;
}

export default function PromoPost({ promo, onClose }) {
  const [text, setText] = useState(promo.text || "");
  const [msg, setMsg] = useState("");
  async function copy() {
    const ok = await copyText(text);
    setMsg(ok ? "Copied — paste it anywhere." : "Select the text and copy it — this browser wouldn't let us.");
  }
  return (
    <div className="basis-full space-y-1.5 rounded-lg border border-mcz-cyan/25 bg-black/30 p-2" data-promo-window>
      <p className="text-[10px] uppercase tracking-widest text-mcz-cyan/80">{promo.kind === "caption" ? "Your caption" : "Your post"} — edit it, then copy</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8}
                className="neon-input w-full text-[12px]" aria-label="Promo post" />
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <button type="button" onClick={copy}
                className="rounded-md bg-mcz-cyan/15 px-2 py-1 text-mcz-cyan hover:bg-mcz-cyan/25">Copy</button>
        <a href={promo.share_url} target="_blank" rel="noreferrer" className="text-white/55 underline">See the card it links to</a>
        <button type="button" onClick={onClose} className="text-white/45 hover:text-white/70">Close</button>
        {msg && <span className="text-emerald-300">{msg}</span>}
      </div>
      <p className="text-[11px] text-white/40">
        Written from your score and the coach's read only — nothing invented. It's saved in Sentence ConnectZ,
        so if you use it in a release, battle or deal, K-Oth's royalty applies to the part you keep.
      </p>
    </div>
  );
}
