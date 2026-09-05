// Reasons to write today, drawn from the day you actually had.
//
// Every diary app can ask "how was your day?". A generic prompt is a blank
// page with a question mark on it, and it is why diaries get abandoned in
// February — opening one costs you the work of remembering what happened.
//
// Music ConnectZ already knows. The ledger records every resource that moved
// and, since `Transaction.open_in`, where it moved. So these are the member's
// own day: the take they recorded, the posts they rated, the battle they
// entered, the 🍥 that arrived and why — each one with the words to start and
// the door back to the thing it is about.
//
// Two rules, both enforced server-side and both worth restating here because
// this is the screen they are visible on:
//
//   NEVER INVENT A DAY. A member who did nothing gets the plain opener, not a
//   fabricated highlight. A prompt about something that did not happen is
//   worse than a blank page: now the app is wrong as well as empty.
//
//   A PROMPT IS A SUGGESTION, NOT A GHOSTWRITER. It hands over a first line
//   and a link. Anything more would be the app keeping the diary, which is not
//   a feature, it is a different product.
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { goToSpot } from "../goto.js";

export default function JournalPrompts({ day, onUse }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let on = true;
    api(`/api/economy/journalz/prompts/${day ? `?day=${day}` : ""}`)
      .then((d) => on && setData(d))
      .catch(() => {});
    return () => { on = false; };
  }, [day]);

  const prompts = asList(data?.prompts);
  if (!data) return null;

  return (
    <div className="rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.05] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-mcz-cyan">
        <Sparkles size={12} /> From your day
      </p>

      {prompts.length === 0 ? (
        <p className="text-[12px] text-white/50">{data.fallback}</p>
      ) : (
        <div className="space-y-1.5">
          {prompts.map((p, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onUse?.(p.opener)}
                title="Start the entry with this — you write the rest"
                className="flex-1 rounded px-2 py-1 text-left text-[12px] text-white/75 transition hover:bg-white/[0.06] hover:text-white"
              >
                {p.opener}
              </button>
              {/* Nothing is a dead end, including a prompt: the row that
                  suggested writing about a battle opens the battle. */}
              {p.open_in && (
                <button
                  onClick={() => goToSpot(p.open_in, "")}
                  title={`Open ${p.open_in}`}
                  className="pill shrink-0 text-[10px]"
                >
                  {p.open_in} ↗
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-2 text-[10px] leading-relaxed text-white/30">{data.note}</p>
    </div>
  );
}
