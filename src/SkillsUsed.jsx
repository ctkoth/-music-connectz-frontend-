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
import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, ChevronRight, Loader2, X } from "lucide-react";
import { api } from "./api.js";
import { goToSpot } from "./goto.js";
import { RatingNumber } from "./components/Rating.jsx";
import { PERSONA_SKILLS, PERSONA_LABELS, labelForSkill } from "./personaSkills.js";
import { flatSkills, ratingDetail, workLine, workShown } from "./skillsUsed.js";

const isAny = (key) => key.startsWith("any_") || key === "any";

// Which skills are on offer is decided by `source`:
//   "profile"   (default) — ONLY the skills the member has learned, i.e. declared on their
//               profile in PersonaZ, each with its rating median and the work behind it.
//               A post's skills are rated for its author, so offering skills they never
//               claimed let a rating land on a claim nobody had made.
//   "catalogue" — the whole tree, for the one place where the member is NOT naming their
//               own skills (a venue host listing what they want visitors to bring).
export default function SkillsUsed({ source = "profile", ...props }) {
  return source === "catalogue" ? <CatalogueSkills {...props} /> : <ProfileSkills {...props} />;
}

function ProfileSkills({ value = [], onChange, label = "Skills used" }) {
  const [data, setData] = useState(null);       // null = loading
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    setErr("");
    api("/api/economy/ratez/skills/").then(setData).catch((e) => setErr(e.message || "Couldn't load your skills."));
  }, []);
  useEffect(() => { load(); }, [load]);

  const chosen = new Set(value);
  const toggle = (key) => {
    const next = new Set(chosen);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange([...next]);
  };
  const open = data?.open_in;

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3" data-tour="skills-used">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">{label}</p>

      {chosen.size > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {[...chosen].map((k) => (
            <li key={k} className="pill flex items-center gap-1 !text-mcz-cyan">
              {labelForSkill(k)}
              <button onClick={() => toggle(k)} className="text-white/30 hover:text-red-300"
                      title="Remove" type="button"><X size={10} /></button>
            </li>
          ))}
        </ul>
      )}

      {data === null && !err && (
        <p className="flex items-center gap-2 text-[11px] text-white/50">
          <Loader2 className="animate-spin" size={12} /> Loading your skills…
        </p>
      )}

      {err && (
        <p className="text-[11px] text-mcz-ember">
          {err}{" "}
          <button type="button" className="underline" onClick={load}>Try again</button>
        </p>
      )}

      {data && flatSkills(data).length === 0 && (
        <div className="space-y-1.5 text-[11px] text-white/60">
          <p>You haven't added any skills to your profile yet. Only skills you've learned can be listed on your work.</p>
          <button type="button" className="re-link font-semibold"
                  onClick={() => goToSpot(open?.tab || "personaz", open?.target || "")}>
            {open?.label || "Add skills in PersonaZ"}
          </button>
        </div>
      )}

      {data && flatSkills(data).length > 0 && (
        <>
          <p className="text-[10px] leading-relaxed text-white/40">{data.note}</p>
          {(data.personas || []).map((persona) => (
            <div key={persona.key}>
              <p className="py-1 text-[10px] uppercase tracking-widest text-white/30">
                {PERSONA_LABELS[persona.key] || persona.name}
              </p>
              <ul className="space-y-1.5">
                {persona.skills.map((s) => (
                  <SkillRow key={s.skill} s={s} picked={chosen.has(s.skill)} onToggle={() => toggle(s.skill)} />
                ))}
              </ul>
            </div>
          ))}
          {open && (
            <button type="button" className="re-link text-[11px]"
                    onClick={() => goToSpot(open.tab, open.target || "")}>
              {open.label}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// One learned skill: the toggle, its median beside it, and the work that gave the median.
function SkillRow({ s, picked, onToggle }) {
  const { shown, more } = workShown(s);
  return (
    <li className={`rounded-lg border px-2.5 py-2 ${picked ? "border-mcz-cyan/60 bg-mcz-cyan/[0.06]" : "border-white/10"}`}>
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={onToggle} aria-pressed={picked}
                className={`flex min-w-0 flex-1 items-center gap-2 text-left text-[12px] ${picked ? "text-mcz-cyan" : "text-white/80"}`}>
          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${picked ? "border-mcz-cyan bg-mcz-cyan/20" : "border-white/25"}`}>
            {picked && <Check size={10} />}
          </span>
          <span className="truncate">{labelForSkill(s.skill)}</span>
        </button>
        <span className="flex shrink-0 items-center gap-1.5 text-right">
          <RatingNumber value={s.rating} size="sm" />
          <span className="max-w-[9rem] text-[10px] leading-tight text-white/50">{ratingDetail(s)}</span>
        </span>
      </div>
      {shown.length > 0 && (
        <p className="mt-1 pl-6 text-[10px] leading-relaxed text-white/45">
          Rated on:{" "}
          {shown.map((w, i) => (
            <span key={w.id}>
              {i > 0 && " · "}
              {/* New tab: a half-written post must survive checking the evidence. */}
              <a href={w.url} target="_blank" rel="noreferrer" className="re-link">{workLine(w)}</a>
            </span>
          ))}
          {more > 0 && <span> · +{more} more</span>}
        </p>
      )}
    </li>
  );
}

function CatalogueSkills({ value = [], onChange, label = "Skills used" }) {
  const [openPersona, setOpenPersona] = useState("");
  const [openCat, setOpenCat] = useState("");

  const chosen = new Set(value);
  const toggle = (key) => {
    const next = new Set(chosen);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange([...next]);
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
              {labelForSkill(k)}
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
