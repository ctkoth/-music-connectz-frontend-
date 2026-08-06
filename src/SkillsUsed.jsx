// "Skills used on this" — the 2.2 paradigm, wherever work is posted.
//
// 2.2 required this on every example and it is the thing that makes the whole
// economy legible: a post that says which skills went into it can be matched
// to the people who have them, priced against their rates, and searched on.
// Without it a post is a file with a caption.
//
// The paradigm, carried over exactly:
//   * persona → category → skill, three levels;
//   * every skill carries an emoji;
//   * every category opens with an "Any …" wildcard, and 2.2's own instruction
//     was «Click "Any" skill to see SPECIFIC options from that category» — so
//     "Any" both claims the category AND opens it. A member who knows they used
//     a DAW but not which one is telling the truth; forcing them to pick a
//     specific one would make them lie.
import { useState } from "react";
import { Check, ChevronDown, ChevronRight, X } from "lucide-react";
import { PERSONA_SKILLS, PERSONA_LABELS } from "./personaSkills.js";

const isAny = (key) => key.startsWith("any_") || key === "any";

export default function SkillsUsed({ value = [], onChange, label = "Skills used" }) {
  const [openPersona, setOpenPersona] = useState("");
  const [openCat, setOpenCat] = useState("");

  const chosen = new Set(value);
  const toggle = (key) => {
    const next = new Set(chosen);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange([...next]);
  };

  // A flat lookup so a chosen key can render its label without walking the tree.
  const labelOf = (key) => {
    for (const cats of Object.values(PERSONA_SKILLS)) {
      for (const skills of Object.values(cats)) {
        if (skills[key]) return skills[key];
      }
    }
    return key;
  };

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
        {label}
      </p>

      {chosen.size > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {[...chosen].map((k) => (
            <li key={k} className="pill flex items-center gap-1 !text-mcz-cyan">
              {labelOf(k)}
              <button onClick={() => toggle(k)} className="text-white/30 hover:text-red-300"
                      title="Remove" type="button">
                <X size={10} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {Object.entries(PERSONA_SKILLS).map(([persona, cats]) => (
        <div key={persona}>
          <button type="button"
                  className="flex w-full items-center gap-1.5 py-1 text-left text-[12px] text-white/70 hover:text-white"
                  onClick={() => setOpenPersona(openPersona === persona ? "" : persona)}>
            {openPersona === persona ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {PERSONA_LABELS[persona] || persona}
          </button>

          {openPersona === persona && Object.entries(cats).map(([cat, skills]) => {
            const entries = Object.entries(skills);
            const anyEntry = entries.find(([k]) => isAny(k));
            const specifics = entries.filter(([k]) => !isAny(k));
            const catOpen = openCat === `${persona}:${cat}`;
            return (
              <div key={cat} className="ml-4 border-l border-white/10 pl-3">
                <p className="py-1 text-[10px] uppercase tracking-widest text-white/30">{cat}</p>
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {anyEntry && (
                    // 2.2's rule: the wildcard claims the category and opens it.
                    <button type="button"
                            className={`pill !text-[10px] ${chosen.has(anyEntry[0]) ? "!border-mcz-gold/60 !text-mcz-gold" : ""}`}
                            onClick={() => {
                              toggle(anyEntry[0]);
                              setOpenCat(catOpen ? "" : `${persona}:${cat}`);
                            }}
                            title="Claims the whole category — tap to see the specific options too">
                      {chosen.has(anyEntry[0]) && <Check size={9} className="mr-0.5 inline" />}
                      {anyEntry[1]} 🔄
                    </button>
                  )}
                  {(catOpen ? specifics : []).map(([k, lbl]) => (
                    <button key={k} type="button"
                            className={`pill !text-[10px] ${chosen.has(k) ? "!border-mcz-cyan/60 !text-mcz-cyan" : ""}`}
                            onClick={() => toggle(k)}>
                      {chosen.has(k) && <Check size={9} className="mr-0.5 inline" />}{lbl}
                    </button>
                  ))}
                  {!catOpen && specifics.length > 0 && (
                    <button type="button" className="pill !text-[10px] !text-white/35"
                            onClick={() => setOpenCat(`${persona}:${cat}`)}>
                      +{specifics.length} specific
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
