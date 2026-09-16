// LanguageZ — declared languages spoken AND how well, grouped by region,
// set here, filtered in VybeZ.
//
// The regions, their languages, the levels and the note above them all come
// from `GET /api/economy/languagez/`. Nothing about them is typed into a
// screen, for the same reason ReligionZ's families aren't: a list stated in
// two places reads two ways within a year, and this one is read by the
// profile picker AND by every member search filter.
//
// **It is a declaration, never a score.** No language and no level outranks
// another, nothing here moves a rating or a skill level, and a language not
// picked stays "hasn't said" rather than defaulting to anything.
//
// The level toggle mirrors SubstanceZ's own pattern exactly — tap once for
// the first level, again for the next, again to clear — because it is the
// same shape: "I do this" is not one fact but several, and a bare
// yes/no would flatten a beginner and a fluent speaker into the same claim.
import { useEffect, useState } from "react";
import { api } from "./api.js";

/** The eight {key, label, options} regions, the level list, and the cap, or
 *  sensible empty defaults until they arrive. A failed fetch renders
 *  nothing on the controls below — the same rule ReligionZ's groups
 *  follow, so a 500 reads as "not switched on" rather than "broken". */
export function useLanguageCatalog() {
  const [groups, setGroups] = useState([]);
  const [levels, setLevels] = useState([]);
  const [max, setMax] = useState(10);
  useEffect(() => {
    let on = true;
    api("/api/economy/languagez/", { auth: false })
      .then((d) => {
        if (!on) return;
        if (Array.isArray(d?.groups)) setGroups(d.groups);
        if (Array.isArray(d?.levels)) setLevels(d.levels);
        if (d?.max) setMax(d.max);
      })
      .catch(() => {});
    return () => { on = false; };
  }, []);
  return { groups, levels, max };
}

function flatten(groups) {
  return groups.flatMap((g) => g.options.map((o) => ({ ...o, group: g.key, groupLabel: g.label })));
}

const LEVEL_STYLE = {
  beginner: "border-mcz-cyan/50 bg-mcz-cyan/10 text-white shadow-neon",
  intermediate: "border-mcz-cyan/70 bg-mcz-cyan/20 text-white shadow-neon",
  fluent: "border-mcz-ember/80 bg-mcz-ember/15 text-white shadow-neon",
};

/** The profile control: pick languages, and how well, from fifty grouped by
 *  region. `value` is `{lang_key: level}`; `onChange` gets the same shape
 *  back — what this screen holds is exactly what the column holds. */
export default function LanguageZ({ value = {}, onChange }) {
  const { groups, levels, max } = useLanguageCatalog();
  if (!groups.length || !levels.length) return null;
  const declared = Object.keys(value).length;

  function cycle(key) {
    const cur = value[key];
    const i = cur ? levels.indexOf(cur) : -1;
    const next = { ...value };
    if (i === -1) {
      // Fresh pick. A cap exists so a profile row cannot be made
      // arbitrarily large — the same reason PersonaZ and LinkZ cap out.
      if (declared >= max) return;
      next[key] = levels[0];
    } else if (i === levels.length - 1) {
      delete next[key];
    } else {
      next[key] = levels[i + 1];
    }
    onChange(next);
  }

  return (
    <div>
      <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
        🗣️ LanguageZ ({declared} of {max} declared)
      </p>
      <p className="mb-2 text-[11px] leading-relaxed text-white/40">
        The languages you speak, and how well — a declaration, not a score, and it never moves
        a rating or a skill level. Tap once for {levels[0]}, again for each level up, again to
        clear. Leave a language untapped and it stays "hasn't said".
      </p>
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.key}>
            <p className="mb-1 text-[10px] uppercase tracking-widest text-white/30">{g.label}</p>
            <div className="flex flex-wrap gap-2">
              {g.options.map((o) => {
                const level = value[o.key];
                return (
                  <button key={o.key} type="button" onClick={() => cycle(o.key)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      level ? LEVEL_STYLE[level]
                            : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"}`}>
                    {o.label}
                    {level && <span className="ml-1.5 text-[10px] opacity-80">· {level}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The search control: the same regions and languages as a multi-select
 *  filter, narrowed by a text box — the same shape ReligionFilter uses.
 *  Matches on PRESENCE, not level: "can we talk at all" is the search
 *  question, and the level is for the card to show, not to gate on.
 *
 * `value` is an array of language keys; `onChange` gets the same back. */
export function LanguageFilter({ value = [], onChange }) {
  const { groups } = useLanguageCatalog();
  const [q, setQ] = useState("");
  const shownGroups = (() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((g) => ({ ...g, options: g.options.filter((o) => o.label.toLowerCase().includes(needle)) }))
      .filter((g) => g.options.length);
  })();
  if (!groups.length) return null;
  const toggle = (key) =>
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
        🗣️ LanguageZ {value.length ? `· ${value.length} on` : ""}
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

/** string[] of keys → "languages=en,es". One place builds it. */
export function languageQuery(value = []) {
  return value.length ? `languages=${value.join(",")}` : "";
}

/** {key, label} for every language, flattened, for a card that wants the
 *  flat lookup without groups — same shape ReligionZ's `useReligions`
 *  exports for the same reason. */
export function useLanguages() {
  const { groups } = useLanguageCatalog();
  return flatten(groups);
}
