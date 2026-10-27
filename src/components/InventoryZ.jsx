// InventoryZ 🎒 — the profile inventory, rated piece by piece and in total
// (Corey's ask; 🎒 is a placeholder until his icon lands).
//
// The pieces are the member's own `inventory` profile field — instruments,
// equipment, clothes — edited in ProfileZ's profile fields. This only shows
// them with their ratings. It decides nothing: every rating, the total and the
// sentence saying what the rating IS come from /api/economy/inventoryz/. A
// rating here is members' taste in the kit; it never moves a skill, a price or a
// royalty, and the screen says so beside the numbers. Rating goes through the one
// rating path posts use (`social/rate/`), so the scale, the edit window and the
// rater's own reward are the platform's — and the reward is stated BEFORE.
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { RatingRow } from "./Rating.jsx";
import { ENERGY } from "../resources.js";
import { KIND_EMOJI } from "./ProfileFieldz.jsx";

export default function InventoryZ({ username = "", refreshKey = 0 }) {
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    const q = username ? `?username=${encodeURIComponent(username)}` : "";
    api(`/api/economy/inventoryz/${q}`).then(setD).catch(() => setD(false));
  }, [username]);
  useEffect(() => { load(); }, [load, refreshKey]);

  // A failed fetch renders nothing: the pieces themselves are still on the
  // profile; only their ratings are missing.
  if (d === false) return null;
  if (!d) return <p className="flex items-center gap-2 text-xs text-white/50"><Loader2 size={12} className="animate-spin" /> Loading inventory…</p>;
  const items = d.items || [];
  if (!items.length && !d.mine) return null;

  async function rate(it, score) {
    setMsg("");
    try {
      await api("/api/economy/social/rate/", { method: "POST", body: { item: it.item_id, score } });
      load();
    } catch (e) { setMsg(e.message || "Couldn't rate that."); }
  }

  const reward = d.rating_reward;
  const total = d.total || {};

  return (
    <section data-tour="inventoryz" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-lg" aria-hidden>{d.icon || "🎒"}</span>
          InventoryZ <span className="text-xs font-normal text-white/45">instruments, equipment, clothes</span>
        </h3>
        {!d.mine && reward && (
          <span className="text-[11px] text-emerald-300">
            {reward.amount > 0 ? `+${reward.amount} ${ENERGY} for your first rating of each piece (${reward.left_today} left today)`
              : "Today's paid ratings are used — ratings still count"}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-white/45">
          Nothing listed yet.{" "}
          <button className="underline hover:text-white" onClick={() => goToSpot(d.edit_in?.tab || "profilez", d.edit_in?.target || "profile-fields")}>
            Add your gear and clothes in your profile fields
          </button>{" "}— free.
        </p>
      ) : (
        <>
          <RatingRow value={total.rating} label="Total"
                     detail={total.rating == null
                       ? `Not rated yet — ${total.count} of ${total.min_ratings} ratings. ${total.how}`
                       : `${total.count} ratings across ${total.pieces_rated} pieces. ${total.how}`} />
          <p className="text-[11px] text-white/45">{d.rating_note}{d.mine && d.rename_note ? ` ${d.rename_note}` : ""}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((it) => (
              <li key={it.item_id} className="rounded-xl bg-black/25 p-3">
                <div className="flex gap-3">
                  {it.photo
                    ? <img src={it.photo} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/5 text-2xl" aria-hidden>{KIND_EMOJI[it.kind] || "📦"}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{it.name}</p>
                    <p className="text-[11px] text-white/50">{it.kind}{it.where ? ` · ${it.where}` : ""}</p>
                    {it.note && <p className="mt-0.5 text-[11px] text-white/60">{it.note}</p>}
                    <p className="mt-1 text-[11px] text-white/60">
                      <b className="text-white/85">{it.rating == null ? "Not rated yet" : `${it.rating}/10`}</b>
                      {" · "}{it.rating_count} {it.rating_count === 1 ? "rating" : "ratings"}
                      {it.my_rating != null && ` · you gave ${it.my_rating}`}
                    </p>
                  </div>
                </div>
                {it.can_rate && (
                  <div className="mt-2 flex flex-wrap gap-1" aria-label={`Rate ${it.name}`}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button key={n} onClick={() => rate(it, n)}
                              className={`h-6 w-6 rounded text-[11px] ${it.my_rating === n ? "bg-mcz-cyan/40 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {msg && <p className="text-xs text-mcz-ember">{msg}</p>}
    </section>
  );
}
