// InVenTorieZ — a member's gear, equipment and wardrobe (Corey's name and art):
// what each piece is worth, how members rate it, and — if the owner asks — how
// an AI rates it from its photo, piece by piece and all together.
//
// It decides nothing. The pieces are the member's own `inventory` profile field,
// edited in ProfileZ's profile fields; every rating, the totals, the worth and
// who may see it, the AI's price and the sentence saying what each number IS
// come from /api/economy/inventoryz/. Member ratings go through the one rating
// path posts use (`social/rate/`), so their reward is stated BEFORE. The AI's
// price is on the button, a run that rates nothing is not charged, and a reading
// stays hidden until the owner shows it.
import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { IconImg } from "../App.jsx";
import { RatingRow } from "./Rating.jsx";
import { ENERGY, PROMPTZ } from "../resources.js";
import { KIND_EMOJI } from "./ProfileFieldz.jsx";
import { totalLine, worthOf } from "../inventoriez.js";

function AiPrice({ ai }) {
  if (!ai) return null;
  if (!ai.configured) return <span className="text-[11px] text-white/45">The AI isn't switched on yet.</span>;
  return (
    <span className="text-[11px]">
      {ai.free_today
        ? <span className="text-emerald-300">Free today <span className="text-white/45">— uses 1 of your {ai.daily_prompts_left} free prompts</span></span>
        : <span className="font-semibold text-mcz-ember">−{ai.cost_cents} {PROMPTZ}</span>}
      <span className="text-white/45"> · {ai.cost_note}</span>
    </span>
  );
}

function AiLine({ r, mine, onShow }) {
  if (!r) return null;
  return (
    <p className="mt-1 text-[11px] text-white/70">
      <Sparkles size={11} className="mr-1 inline text-mcz-gold" />
      <b className="text-white/90">AI {r.score}/10</b> — {r.why}
      {r.older_photo && <span className="text-mcz-gold"> (read from an earlier photo)</span>}
      {mine && (
        <button className="ml-2 inline-flex items-center gap-1 text-mcz-cyan hover:underline" onClick={onShow}>
          {r.shown ? <><EyeOff size={11} /> Hide</> : <><Eye size={11} /> Show on my InVenTorieZ</>}
        </button>
      )}
    </p>
  );
}

export default function InventoryZ({ username = "", refreshKey = 0 }) {
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState("");
  const [pick, setPick] = useState([]);
  const [together, setTogether] = useState(true);
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState(null);

  const load = useCallback(() => {
    const q = username ? `?username=${encodeURIComponent(username)}` : "";
    api(`/api/economy/inventoryz/${q}`).then(setD).catch(() => setD(false));
  }, [username]);
  useEffect(() => { load(); }, [load, refreshKey]);

  // A failed fetch renders nothing: the pieces themselves are still on the
  // profile; only their ratings are missing.
  if (d === false) return null;
  if (!d) return <p className="flex items-center gap-2 text-xs text-white/50"><Loader2 size={12} className="animate-spin" /> Loading InVenTorieZ…</p>;
  const items = d.items || [];
  if (!items.length && !d.mine) return null;

  async function rate(it, score) {
    setMsg("");
    try {
      await api("/api/economy/social/rate/", { method: "POST", body: { item: it.item_id, score } });
      load();
    } catch (e) { setMsg(e.message || "Couldn't rate that."); }
  }

  const photographed = items.filter((x) => x.photo);
  const chosen = pick.length ? pick : photographed.map((x) => x.name);
  async function runAi() {
    setBusy(true); setMsg(""); setRun(null);
    try {
      const r = await api("/api/economy/inventoryz/ai/", { method: "POST", body: { names: chosen, together } });
      setRun(r);
      load();
    } catch (e) { setMsg(`${e.message || "The AI couldn't rate those."}${/nothing was charged/i.test(e.message || "") ? "" : " Nothing was charged."}`); }
    finally { setBusy(false); }
  }
  async function show(item, shown) {
    try {
      await api("/api/economy/inventoryz/ai/", { method: "PATCH", body: { item, shown } });
      load();
    } catch (e) { setMsg(e.message); }
  }

  const reward = d.rating_reward;
  const total = d.total || {};
  const worth = totalLine(d.value);
  const tooMany = chosen.length > (d.ai?.max_pieces || 8);

  return (
    <section data-tour="inventoryz" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <IconImg icon="inventoriez.png" alt="" className="h-9 w-9 rounded-lg" />
          {d.name || "InVenTorieZ"} <span className="text-xs font-normal text-white/45">gear, equipment &amp; wardrobe</span>
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
            Add your gear, equipment and clothes in your profile fields
          </button>{" "}— free. Give each an exact price or $ to $$$$$$$$$$.
        </p>
      ) : (
        <>
          <RatingRow value={total.rating} label="Members' total"
                     detail={total.rating == null
                       ? `Not rated yet — ${total.count} of ${total.min_ratings} ratings. ${total.how}`
                       : `${total.count} ratings across ${total.pieces_rated} pieces. ${total.how}`} />
          {d.ai_set && (
            <div className="rounded-lg bg-mcz-gold/10 px-3 py-2">
              <AiLine r={{ ...d.ai_set, why: `the whole kit together — ${d.ai_set.why}` }} mine={d.mine} onShow={() => show("*", !d.ai_set.shown)} />
            </div>
          )}
          {worth && <p className="text-xs text-white/75"><span className="text-white/45">Worth:</span> {worth}</p>}
          <p className="text-[11px] text-white/45">{d.rating_note}{d.mine && d.rename_note ? ` ${d.rename_note}` : ""}</p>
          {d.mine && d.value_privacy && <p className="text-[11px] text-white/40">{d.value_privacy}</p>}

          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((it) => (
              <li key={it.item_id} className="rounded-xl bg-black/25 p-3">
                <div className="flex gap-3">
                  {it.photo
                    ? <img src={it.photo} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/5 text-2xl" aria-hidden>{KIND_EMOJI[it.kind] || "📦"}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold">
                      {d.mine && d.ai && it.photo && (
                        <input type="checkbox" aria-label={`Include ${it.name} in the AI rating`} checked={chosen.includes(it.name)}
                          onChange={(e) => setPick((p) => {
                            const base = p.length ? p : photographed.map((x) => x.name);
                            return e.target.checked ? [...base, it.name] : base.filter((n) => n !== it.name);
                          })} />
                      )}
                      <span className="truncate">{it.name}</span>
                      {worthOf(it) && <span className="shrink-0 text-xs font-normal text-emerald-300">{worthOf(it)}</span>}
                    </p>
                    <p className="text-[11px] text-white/50">{it.kind}{it.where ? ` · ${it.where}` : ""}</p>
                    {it.note && <p className="mt-0.5 text-[11px] text-white/60">{it.note}</p>}
                    <p className="mt-1 text-[11px] text-white/60">
                      <b className="text-white/85">{it.rating == null ? "Not rated yet" : `${it.rating}/10`}</b>
                      {" · "}{it.rating_count} {it.rating_count === 1 ? "member rating" : "member ratings"}
                      {it.my_rating != null && ` · you gave ${it.my_rating}`}
                    </p>
                    <AiLine r={it.ai} mine={d.mine} onShow={() => show(it.name, !it.ai.shown)} />
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

          {d.mine && d.ai && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3" data-tour="inventoryz-ai">
              <p className="text-sm font-semibold"><Sparkles size={14} className="mr-1 inline text-mcz-gold" />Get an AI rating</p>
              <p className="text-[11px] text-white/55">{d.ai.note}</p>
              {photographed.length === 0 ? (
                <p className="text-xs text-mcz-gold">Add a photo to a piece first — the AI rates what it can see, never a name.</p>
              ) : (
                <>
                  <label className="flex items-center gap-2 text-xs text-white/70">
                    <input type="checkbox" checked={together} onChange={(e) => setTogether(e.target.checked)} />
                    Also rate them all together, as one kit
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button className="neon-btn-primary !w-auto px-4" disabled={busy || !chosen.length || tooMany || !d.ai.configured || !d.ai.affordable}
                            onClick={runAi}>
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      Rate {chosen.length === 1 ? "this piece" : `${chosen.length} pieces`}
                    </button>
                    <AiPrice ai={d.ai} />
                  </div>
                  {tooMany && <p className="text-xs text-mcz-gold">Up to {d.ai.max_pieces} pieces in one run — untick some.</p>}
                  {!d.ai.affordable && d.ai.configured && <p className="text-xs text-mcz-ember">Today's free prompts are spent and you don't have the {PROMPTZ} for a run.</p>}
                  <p className="text-[11px] text-white/40">{d.ai.show_note}</p>
                </>
              )}
              {run && (
                <p role="status" className="text-xs text-white/70">
                  {run.charged
                    ? `Rated ${run.rated.length} ${run.rated.length === 1 ? "piece" : "pieces"}${run.set ? " and the kit together" : ""} — they're hidden until you press Show.`
                    : run.detail}
                  {run.skipped?.length > 0 && <span className="text-white/50"> Not rated: {run.skipped.map((s) => `${s.name} (${s.why})`).join(", ")}.</span>}
                </p>
              )}
            </div>
          )}
        </>
      )}
      {msg && <p className="text-xs text-mcz-ember">{msg}</p>}
    </section>
  );
}
