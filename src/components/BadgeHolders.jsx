// Everybody wearing one badge — what a medal opens.
//
// Corey: a badge shows its effect on the page with no click needed, and tapping
// it "shows other items with the same badge". So a medal is a door: this sheet
// says what the badge does and how it is earned, then lists who else wears it,
// each name a door to their profile. The list is the server's
// (/api/economy/badgez/holders/), already limited to badges their holders chose
// to show — a hidden badge, and every penalty until its holder shows it, is on
// nobody's list.
import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { api } from "../api.js";
import MemberName from "../MemberName.jsx";
import { Medal } from "../BadgeWear.jsx";

export default function BadgeHolders({ badgeKey, onClose }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api(`/api/economy/badgez/holders/?key=${encodeURIComponent(badgeKey)}`)
      .then(setD).catch((e) => setErr(e.message || "Couldn't load who wears it."));
  }, [badgeKey]);

  const b = d?.badge;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
         role="dialog" aria-modal="true" onClick={onClose}>
      <div className="neon-frame max-h-[85vh] w-full max-w-md overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-2">
          {b ? (
            <div className="flex items-center gap-3">
              <Medal badge={b} className="h-14 w-14" />
              <div>
                <p className="font-semibold">{b.name}</p>
                {b.temporary && <p className="text-[11px] text-mcz-gold">Held while it stays true — it can lapse</p>}
                {b.penalty && <p className="text-[11px] text-mcz-ember">A penalty — hidden unless its holder shows it</p>}
              </div>
            </div>
          ) : <span />}
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-white/50 hover:bg-white/10"><X size={16} /></button>
        </div>
        {err && <p className="text-xs text-white/60">{err}</p>}
        {!d && !err && <p className="flex items-center gap-2 text-xs text-white/50"><Loader2 size={12} className="animate-spin" /> Loading…</p>}
        {b && (
          <>
            <p className="text-sm text-emerald-300/90">{b.effect_note}</p>
            <p className="mt-1 text-xs text-white/60">{b.how}</p>
            <p className="mt-4 mb-1 text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Wearing it · {d.count}
            </p>
            {d.holders.length === 0
              ? <p className="text-xs text-white/40">Nobody is showing this one yet.</p>
              : (
                <ul className="flex flex-wrap gap-2 text-xs">
                  {d.holders.map((h) => (
                    <li key={h.username} className="rounded-lg bg-white/5 px-2 py-1">
                      <MemberName username={h.username} bare onOpen={onClose} />
                    </li>
                  ))}
                </ul>
              )}
            {d.mine?.held && !d.mine.visible && (
              <p className="mt-3 text-[11px] text-white/45">You hold it too, hidden — switch it on in BadgeZ to be listed.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
