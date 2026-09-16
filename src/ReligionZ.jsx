// ReligionZ — a declared religion, grouped into families, set here, filtered
// everywhere.
//
// The families, their branches, labels and the note above them all come from
// `GET /api/economy/religionz/` as `groups: [{key, label, options: [{key,
// label}]}]` — Christianity → Catholic, Lutheran, ...; Islam → Sunni, Shia,
// ...; and the same shape for every family with more than one common branch.
// Nothing about them is typed into a screen, for the same reason
// PersonalitieZ's axes aren't: a list stated in two places reads two ways
// within a year, and this one is read by the profile picker AND by every
// member search filter.
//
// **It is a declaration, never a score.** No family and no branch outranks
// another — the grouping and the order are a picker convenience, not a
// ranking — nothing here moves a rating or a skill level, and "hasn't said"
// is a real third state: the picker's first row, not a default that fills
// itself in for somebody who left it alone.
//
// What is STORED and MATCHED on is always the leaf branch — "catholic", not
// "christianity" — the same granularity gender and sign already store at.
import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

/** The sixteen {key, label, options} groups, or [] until they arrive. A
 *  failed fetch renders nothing — the same rule PersonalitieZ's axes follow,
 *  so a 500 reads as "not switched on" rather than "broken". */
export function useReligionGroups() {
  const [groups, setGroups] = useState([]);
  useEffect(() => {
    let on = true;
    api("/api/economy/religionz/", { auth: false })
      .then((d) => on && Array.isArray(d?.groups) && setGroups(d.groups))
      .catch(() => {});
    return () => { on = false; };
  }, []);
  return groups;
}

/** Every branch across every family, flattened — for a filter's search box,
 *  which cares about the leaf labels and not which family they sit under. */
function flatten(groups) {
  return groups.flatMap((g) => g.options.map((o) => ({ ...o, group: g.key, groupLabel: g.label })));
}

/** The profile control: one declared branch out of fifty, or "hasn't said".
 *
 * A single `<select>` with a native `<optgroup>` per family — the browser's
 * own grouped-picker widget, so "Christianity" reads as a heading over
 * Catholic, Lutheran and the rest rather than a wall of fifty flat rows. */
export default function ReligionZ({ value, onChange }) {
  const groups = useReligionGroups();
  if (!groups.length) return null;
  return (
    <div>
      <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
        🕊️ ReligionZ
      </p>
      <p className="mb-2 text-[11px] leading-relaxed text-white/40">
        A declaration, not a score — no family or branch on this list is ranked above another,
        and picking one never moves a rating or a skill level. It becomes a filter people can
        find you with. Leave it blank and it stays "hasn't said", not a default.
      </p>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)}
              className="neon-input !py-2 text-sm">
        <option value="">Hasn't said</option>
        {groups.map((g) => (
          <optgroup key={g.key} label={g.label}>
            {g.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

/** The search control: the same families and branches as a multi-select
 *  filter, narrowed by a text box — fifty checkboxes with no way to jump to
 *  one is a scroll nobody finishes. Grouped so a searcher who wants "any
 *  kind of Christian" can see the family as a unit rather than hunting.
 *
 * `value` is an array of leaf keys; `onChange` gets the same shape back,
 * mirroring how the genders filter next to it in VybeZ already works. */
export function ReligionFilter({ value = [], onChange }) {
  const groups = useReligionGroups();
  const [q, setQ] = useState("");
  const shownGroups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((g) => ({ ...g, options: g.options.filter((o) => o.label.toLowerCase().includes(needle)) }))
      .filter((g) => g.options.length);
  }, [groups, q]);
  if (!groups.length) return null;
  const toggle = (key) =>
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
        🕊️ ReligionZ {value.length ? `· ${value.length} on` : ""}
      </p>
      <input type="text" value={q} onChange={(e) => setQ(e.target.value)}
             placeholder="Search the list…" className="neon-input !py-1.5 text-xs" />
      <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2">
        {shownGroups.map((g) => (
          <div key={g.key}>
            <p className="mb-1 text-[10px] uppercase tracking-widest text-white/30">{g.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.options.map((o) => (
                <button key={o.key} type="button" onClick={() => toggle(o.key)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    value.includes(o.key)
                      ? "border-mcz-pink/70 bg-mcz-pink/10 text-white shadow-neon"
                      : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!shownGroups.length && <p className="text-[11px] text-white/35">No match for that.</p>}
      </div>
    </div>
  );
}

/** string[] of leaf keys → "religions=catholic,sunni". One place builds it,
 *  same shape as `personalityQuery` beside it. */
export function religionQuery(value = []) {
  return value.length ? `religions=${value.join(",")}` : "";
}

/** {key, label} for every branch, flattened — exported for any caller that
 *  wants the flat list without groups (a card rendering `m.religion` as a
 *  label, say) rather than re-implementing the flatten. */
export function useReligions() {
  return flatten(useReligionGroups());
}
