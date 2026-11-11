// The doors out of a post — shared by every surface that holds one.
//
// PostZ's card and the SoundCloud library both offer a post's options (coach it,
// CollabZ, playlist, battle…). The list, what each door needs and what it costs
// are the server's (`destinations_for`); this file only renders the list and
// walks the member through the one they pick. It used to live inside PostZ.jsx,
// which is why the library could not have it: two copies of "how a post leaves
// the app" is two places a door can be added to and forgotten in.
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { PROMPTZ } from "../resources.js";
import { goToSpot } from "../goto.js";
import { handOff } from "../handoff.js";
import { useSay } from "../voice.js";
import { P } from "../phrases.js";

// What a destination costs, said BEFORE the button that spends it. The server
// decides the number and whether today's free prompts already cover it — this
// only renders what it was told, so the price on the button and the price the
// coach charges cannot drift.
export function Price({ cost }) {
  if (!cost || !cost.amount) return <span className="text-emerald-300">Free</span>;
  if (cost.free_today) {
    return (
      <span className="text-emerald-300">
        Free today · {cost.daily_remaining} left
      </span>
    );
  }
  return (
    <span className={cost.affordable ? "text-mcz-ember" : "text-mcz-ember/60"}>
      −{cost.amount} {PROMPTZ}
      {!cost.affordable && <span className="text-white/35"> · not enough</span>}
    </span>
  );
}

/** Where this post can go, and what happens to it there.
 *
 * The list is the SERVER's — one place decides which apps can do something
 * with a post, what each still needs, and what it costs. A door that can't do
 * anything with this post is shown greyed with the reason on it rather than
 * dropped: a member whose post is lyrics-only should read that the coach wants
 * a recording, not conclude SingZ went missing.
 */
export function OpenIn({ post, busy, onGo }) {
  const dests = asList(post.destinations);
  if (!dests.length) return null;
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-white/[0.06] bg-black/20 p-3"
         data-tour="postz-open-in">
      <p className="text-[11px] uppercase tracking-widest text-white/45">
        Open this post in
      </p>
      <p className="text-[11px] leading-relaxed text-white/40">
        The track, the words and the cover travel with it — nothing gets
        attached twice.
      </p>
      {dests.map((d) => (
        <div key={d.app + d.label}
             className={`rounded-lg border p-2.5 ${d.available
               ? "border-white/[0.08] bg-white/[0.03]"
               : "border-white/[0.05] bg-white/[0.01]"}`}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button
              onClick={() => onGo(d)}
              disabled={!d.available
                        || !!(d.cost?.amount && !d.cost.affordable && !d.cost.free_today)}
              className={`text-[13px] font-semibold ${d.available
                ? "text-white hover:text-mcz-gold"
                : "cursor-not-allowed text-white/35"}`}>
              {d.label}
            </button>
            <span className="text-[11px]"><Price cost={d.cost} /></span>
            {d.gain?.what && (
              <span className="text-[11px] text-emerald-300/70">→ {d.gain.what}</span>
            )}
            {d.count > 0 && (
              <span className="text-[10px] text-white/35">· {d.count} so far</span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{d.what}</p>
          {/* Why it can't go yet — on the row, not hidden behind the attempt. */}
          {!d.available && (
            <p className="mt-1 text-[11px] text-mcz-ember/80">Needs {d.needs.join("; ")}.</p>
          )}
        </div>
      ))}
      {busy && (
        <p className="flex items-center gap-2 text-[11px] text-white/45">
          <Loader2 className="animate-spin" size={12} /> Handing it over…
        </p>
      )}
    </div>
  );
}

/** `{ opening, openIn }` for one post. `onFlash` is where its sentences go. */
export function usePostDoors(post, onFlash) {
  const talk = useSay();
  // Which door is being walked through, so two taps can't send the same post
  // to two apps at once.
  const [opening, setOpening] = useState("");

  // PostZ is for show; CollabZ is for collaboration. This is the seam: the
  // post seeds the deal's title and puts its author in the room, so nobody has
  // to retype the thing they were just looking at.
  // A post already carries the four assets a distributor asks for — the song,
  // the music video, the cover and the lyrics — so this fills a release from
  // them rather than making anyone retype it. The GET answers first so the
  // button can say what's still missing before creating anything.
  async function distribute(target) {
    try {
      const r = await api(`/api/economy/postz/${post.id}/distribute/`, { method: "POST", body: {} });
      // Deliberately does NOT navigate on its own. There is no DistributeZ tab
      // to land on, and switching tabs would take this message with it — the
      // result of pressing a button has to survive pressing it. When the
      // destination row names an anchor in DirectZ, that jump is the caller's.
      // DistributeZ lists the release with what it still needs, by name.
      goToSpot("distributez", target || "distributez-releases");
      onFlash(r.ready
        ? `Release ready — "${r.title}" by ${r.artist_name}, with the song, video, cover and lyrics filled in.`
        : `Release started. It still needs ${r.missing.join(", ")}.`);
    } catch (e) { onFlash(e.message || "Couldn't start that release."); }
  }

  async function takeToCollabZ(target) {
    try {
      await api("/api/economy/collab/", {
        method: "POST", body: { from_post: post.id, currency: "money" },
      });
      onFlash(`Draft deal started on "${post.title}" — open CollabZ to set the worth.`);
      goToSpot("collabz", target || "");
    } catch (e) { onFlash(e.message || "Couldn't start that collab."); }
  }

  // The one place a post leaves PostZ. Which apps are offered, what each one
  // needs and what it costs are all the server's answer (`post.destinations`);
  // this decides only HOW the post travels — an API call for the doors that
  // create something server-side, and a handoff for the ones that fill a form
  // in the destination.
  async function openIn(d) {
    if (!d.available || opening) return;
    setOpening(d.app);
    try {
      if (d.action === "deal") return await takeToCollabZ(d.target);
      if (d.action === "distribute") return await distribute(d.target);
      if (d.action === "open") {
        // Nothing to carry: a SoundCloud post is a player and has no file. The coach
        // opens on its recorder and the member attaches their own copy there.
        goToSpot(d.app, d.target);
        onFlash(d.own_copy
          ? `SoundCloud gives us a player, not the file — attach your own copy of "${post.title}" in ${d.app.toUpperCase()} to have it scored.`
          : `Opened ${d.app.toUpperCase()}.`);
        return;
      }
      // "coach" and "seed" both carry the post over and land on the control.
      // The destination states the price again ON the button that spends it —
      // the row here is the quote, the button there is the commitment.
      await handOff(d.app, d.target, {
        kind: "post", action: d.action, coach_kind: d.coach_kind || "", radar: !!d.radar,
        // The coach's ceiling travels with the post, so the destination can
        // hold the same line the row just held rather than letting the button
        // find it out.
        take_bytes: d.take_bytes || 0, max_bytes: d.max_bytes || 0,
        ...(d.carry || {}),
      });
      onFlash(talk(P.postz_handed_over(post.title, d.app.toUpperCase())));
    } catch (e) {
      onFlash(e.message || `Couldn't open that in ${d.app}.`);
    } finally { setOpening(""); }
  }

  return { opening, openIn };
}
