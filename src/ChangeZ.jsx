// ChangeZ — what shipped, behind the wordmark.
//
// Work landed and nothing on the platform said so. A member who noticed a
// screen was different had nowhere to confirm it; a member who didn't notice
// never learned the app had grown. The one place everybody's eye already
// goes — the name at the top — is where that belongs.
//
// Written like the commit messages are written: what was WRONG first, then
// what it does now. "ViewZ ships" tells nobody anything. "You had no way to
// find out if anyone saw your track" is a sentence somebody recognises,
// because they lived it.
import { useEffect } from "react";
import { CHANGELOG, markSeen } from "./changelog.js";
import { useSwipeAway } from "./swipe.js";

/** **bold** → <strong>. The only markup an entry gets: a changelog that needs
 *  a parser is a changelog nobody will keep writing. */
function line(text, key) {
  return (
    <p key={key} className="text-[13px] leading-relaxed text-white/75">
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>
        ) : (
          part
        ),
      )}
    </p>
  );
}

export default function ChangeZ({ onClose }) {
  const sheet = useSwipeAway(onClose);

  // Opening it IS reading it — the dot clears here rather than on a "mark as
  // read" button, which is a control that exists to be ignored.
  useEffect(() => { markSeen(); }, []);

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="What's new in Music ConnectZ"
    >
      <div
        ref={sheet}
        className="neon-frame my-8 w-full max-w-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <img src="/mcz-logo-v5.jpg" alt="" className="h-11 w-11 rounded-xl shadow-neon" />
          <div className="flex-1">
            <h2 className="font-display text-xl font-extrabold">What's new</h2>
            <p className="text-[11px] text-white/45">Every change, and what was wrong before it.</p>
          </div>
          <button onClick={onClose} className="re-link text-xs" aria-label="Close what's new">
            Close
          </button>
        </div>

        <div className="space-y-6">
          {CHANGELOG.map((rel) => (
            <section key={rel.id}>
              <h3 className="font-display text-base font-extrabold text-mcz-cyan">{rel.title}</h3>
              <p className="mb-2 text-[11px] text-white/35">
                {new Date(rel.date).toLocaleDateString(undefined, {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </p>
              <div className="space-y-2">{rel.lines.map((l, i) => line(l, i))}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
