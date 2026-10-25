// A word with a definition one tap away. The definition opens INLINE under the word and
// stays on screen — a hover tooltip does not exist on a phone, and a definition nobody can
// reach is no definition. An unknown key renders the word plain rather than a dead control.
import { useState } from "react";
import { byKey } from "../glossary.js";

export default function Term({ k, children }) {
  const [open, setOpen] = useState(false);
  const g = byKey(k);
  if (!g) return <>{children}</>;
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
              className="cursor-help border-b border-dotted border-mcz-cyan/70 text-inherit hover:text-white">
        {children ?? g.word}
      </button>
      {open && (
        <span role="note" className="my-1 block rounded-lg border border-mcz-cyan/30 bg-black/40 p-2 text-[12px] font-normal leading-relaxed text-white/80">
          <strong className="text-white">{g.word}:</strong> {g.means}
        </span>
      )}
    </>
  );
}
