// PersonalitieZ — four declared axes, set here, filtered everywhere.
//
// The axes, their labels and which letter sits in which slot all come from
// `GET /api/economy/personalityz/`. Nothing about them is typed into a screen,
// for the reason CLAUDE.md gives about tier numbers: a list stated in three
// places reads three ways within a year, and this list is read by the profile
// toggles, by every member search filter, and by VybeZ.
//
// **It is a declaration, never a score.** Neither side of an axis is better,
// nothing here moves a rating or a skill level, and an axis a member has not
// answered stays unanswered rather than defaulting to a side — which is why
// every control below has three states and not two.
import { useEffect, useState } from "react";
import { api } from "./api.js";

/** The four axes, or [] until they arrive. A failed fetch renders nothing —
 *  an empty axis row reads as a broken feature; absent, it reads as one that
 *  isn't switched on, which is what a 500 there actually means. */
export function usePersonalityAxes() {
  const [axes, setAxes] = useState([]);
  useEffect(() => {
    let on = true;
    api("/api/economy/personalityz/", { auth: false })
      .then((d) => on && Array.isArray(d?.axes) && setAxes(d.axes))
      .catch(() => {});
    return () => { on = false; };
  }, []);
  return axes;
}

/** {axis_key: letter} → the 4-slot code the server stores. Order comes from
 *  the server's own list, so the slot order lives in exactly one place. */
export function codeFrom(axes, picked) {
  const code = axes.map((a) => picked[a.key] || "-").join("");
  return /^-*$/.test(code) ? "" : code;
}

/** The stored code back as {axis_key: letter}, skipping what wasn't said. */
export function axesFrom(axes, code) {
  const out = {};
  axes.forEach((a, i) => {
    const letter = (code || "")[i];
    if (letter && letter !== "-") out[a.key] = letter;
  });
  return out;
}

/** One axis as a three-state control: left, right, or neither.
 *
 * Pressing the side you are already on clears it. That is the whole reason
 * this isn't a two-way switch: "hasn't said" has to be reachable, and a
 * member who taps the wrong one and cannot get back to blank has been given a
 * personality by the interface. */
function Axis({ axis, value, onChange, size = "md" }) {
  const pad = size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-4 py-2 text-sm";
  return (
    <div>
      <p className={`mb-1 ${size === "sm" ? "text-[10px]" : "text-[11px]"} text-white/40`}>
        {axis.question}
      </p>
      <div className="flex gap-2">
        {["left", "right"].map((side) => {
          const s = axis[side];
          const on = value === s.code;
          return (
            <button key={s.code} type="button"
              onClick={() => onChange(on ? "" : s.code)}
              title={s.blurb}
              className={`flex-1 rounded-full border transition ${pad} ${
                on ? "border-mcz-cyan/70 bg-mcz-cyan/10 text-white shadow-neon"
                   : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"}`}>
              <span className="mr-1.5 font-bold">{s.code}</span>{s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The profile control: four axes, three states each.
 *
 * `value` is the stored code ("INFP", "IN--", ""); `onChange` gets the code
 * back, so the caller stores exactly what the server stores. */
export default function PersonalitieZ({ value, onChange, axes: given }) {
  const fetched = usePersonalityAxes();
  const axes = given?.length ? given : fetched;
  if (!axes.length) return null;
  const picked = axesFrom(axes, value);
  const answered = Object.keys(picked).length;

  return (
    <div>
      <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
        🧭 PersonalitieZ ({answered} of {axes.length} answered)
      </p>
      <p className="mb-3 text-[11px] leading-relaxed text-white/40">
        Four axes, and neither side of any of them is better — this is something you say
        about yourself, not a score, and it never moves a rating or a skill level. It becomes
        a filter people can find you with. Leave any of them blank; blank stays blank.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {axes.map((a) => (
          <Axis key={a.key} axis={a} value={picked[a.key] || ""}
                onChange={(letter) => onChange(codeFrom(axes,
                  letter ? { ...picked, [a.key]: letter }
                         : Object.fromEntries(Object.entries(picked).filter(([k]) => k !== a.key))))} />
        ))}
      </div>
    </div>
  );
}

/** The search control: the same four axes as a filter.
 *
 * `value` is {axis_key: letter}; `onChange` gets the same. It returns the
 * querystring fragment too, so a caller never builds `?ie=I&tf=F` by hand.
 */
export function PersonalityFilter({ value = {}, onChange, note }) {
  const axes = usePersonalityAxes();
  if (!axes.length) return null;
  const on = Object.keys(value).length;
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
        🧭 PersonalitieZ {on ? `· ${on} axis${on === 1 ? "" : "es"} on` : ""}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {axes.map((a) => (
          <Axis key={a.key} size="sm" axis={a} value={value[a.key] || ""}
                onChange={(letter) => onChange(letter
                  ? { ...value, [a.key]: letter }
                  : Object.fromEntries(Object.entries(value).filter(([k]) => k !== a.key)))} />
        ))}
      </div>
      {/* The server's line, not ours. An empty result has two completely
          different causes — nobody matches, or nobody has said — and letting
          somebody conclude the first from the second is the emptiest kind of
          wrong on a field this new. */}
      {note && <p className="text-[11px] text-white/40">{note}</p>}
    </div>
  );
}

/** {axis_key: letter} → "ie=I&tf=F". One place builds it. */
export function personalityQuery(value = {}) {
  return Object.entries(value).map(([k, v]) => `${k}=${v}`).join("&");
}
