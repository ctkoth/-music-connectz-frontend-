// SkillRegistry.jsx — registry-only skill UI for MCZ.
// Exports: SkillProfileList (profile), SkillPicker + AddKnownSkill (uploads: known skills only), GateEditor (gates/filters: ANY skill, by experience and median rating).
import { useEffect, useState } from "react";

const BASE = import.meta.env.VITE_API_BASE || "";
const api = async (path, method = "GET", body) => {
  const token = localStorage.getItem("mcz_access");
  const res = await fetch(`${BASE}/api/skillreg/${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* never render raw HTML 404 pages */ }
  if (!res.ok) throw new Error(data?.detail || `Request failed (${res.status})`);
  return data;
};

const TIERS = ["Novice", "Developing", "Proficient", "Advanced", "Expert"];

export function SkillProfileList({ username }) {
  const [skills, setSkills] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api(`profile/${encodeURIComponent(username)}/`).then((d) => setSkills(d.skills)).catch((e) => setErr(e.message));
  }, [username]);
  if (err) return <p className="text-sm text-red-500">{err}</p>;
  if (!skills) return <p className="text-sm opacity-60">Loading skills…</p>;
  return (
    <ul className="space-y-3">
      {skills.map((s) => (
        <li key={s.skill.id} className="rounded-xl border border-white/10 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold">{s.skill.name}</span>
            <span className="text-xs opacity-70">{s.gauge.label}</span>
          </div>
          <div className="mt-1 text-sm opacity-80">
            {s.experience.label} · median {s.median ?? "—"} ({s.ratings} rating{s.ratings === 1 ? "" : "s"}
            {s.provisional ? ", provisional" : ""})
          </div>
          {s.works.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer opacity-70">{s.works.length} work{s.works.length === 1 ? "" : "s"}</summary>
              <ul className="mt-1 space-y-1 pl-3">
                {s.works.map((w) => (
                  <li key={w.tag_id}>{w.title || `${w.work_type} #${w.work_id}`} — {w.median ?? "unrated"} ({w.ratings})</li>
                ))}
              </ul>
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

// CTA: add a skill I know. Pick from the catalog, or create it if it isn't listed.
export function AddKnownSkill({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [mine, setMine] = useState([]);
  const [pick, setPick] = useState("");
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");
  const [learned, setLearned] = useState("");
  const [msg, setMsg] = useState("");
  const q = query.trim().toLowerCase();
  const matches = catalog.filter((c) => !mine.includes(c.id) && c.name.toLowerCase().includes(q)).slice(0, 8);
  const exact = catalog.some((c) => c.name.toLowerCase() === q);
  useEffect(() => {
    if (!open) return;
    api("catalog/").then(setCatalog).catch(() => {});
    api("choices/").then((c) => setMine(c.map((x) => x.id))).catch(() => {});
  }, [open]);
  const save = async () => {
    try {
      let id = Number(pick);
      if (!id && newName.trim()) id = (await api("catalog/", "POST", { name: newName })).id;
      if (!id) return setMsg("Choose a skill or type a new one");
      if (!learned) return setMsg("When did you learn it?");
      await api("mine/", "POST", { skill_id: id, learned_at: learned });
      setOpen(false); setPick(""); setNewName(""); setQuery(""); setLearned(""); setMsg("");
      onAdded?.(id);
    } catch (e) { setMsg(e.message); }
  };
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-dashed px-3 py-2 text-sm">
        + Add a skill I know
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border border-white/10 p-3 text-sm">
      <input value={query} onChange={(e) => { setQuery(e.target.value); setPick(""); }}
        placeholder="Search skills, or type a new specific skill" className="w-full rounded bg-white/10 px-2 py-2" />
      {query.trim().length > 0 && (
        <ul className="max-h-40 overflow-auto rounded bg-white/5">
          {matches.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => { setPick(String(c.id)); setQuery(c.name); }}
                className={`w-full px-2 py-2 text-left ${String(c.id) === pick ? "bg-white/20" : ""}`}>{c.name}</button>
            </li>
          ))}
          {!exact && (
            <li><button type="button" onClick={() => { setPick(""); setNewName(query.trim()); }}
              className={`w-full px-2 py-2 text-left ${newName ? "bg-white/20" : ""}`}>+ Add “{query.trim()}” as a new skill</button></li>
          )}
        </ul>
      )}
      <label className="block">Learned since
        <input type="date" value={learned} max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setLearned(e.target.value)} className="ml-2 rounded bg-white/10 px-2 py-1" />
      </label>
      {msg && <p className="text-red-400">{msg}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} className="rounded-lg bg-white/20 px-3 py-2">Add to my skills</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 opacity-70">Cancel</button>
      </div>
    </div>
  );
}

// Registry-only picker: only the member's own known skills can be chosen; CTA adds missing ones.
export function SkillPicker({ value, onChange, onCost }) {
  const [choices, setChoices] = useState([]);
  const load = () => api("choices/").then(setChoices).catch(() => setChoices([]));
  useEffect(() => { load(); }, []);
  const apply = (next, list = choices) => {
    onChange(next);
    onCost?.(list.filter((c) => next.includes(c.id)).reduce((a, c) => a + c.price_cents, 0));
  };
  const toggle = (id) => apply(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const added = async (id) => {
    const list = await api("choices/");
    setChoices(list);
    apply([...new Set([...value, id])], list);
  };
  return (
    <div className="space-y-2">
      {choices.length === 0 && (
        <p className="text-sm opacity-70">Uploads can only use skills you know. Add one to continue.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {choices.map((c) => (
          <button key={c.id} type="button" onClick={() => toggle(c.id)}
            className={`rounded-full border px-3 py-1 text-sm ${value.includes(c.id) ? "bg-white/20" : "opacity-70"}`}>
            {c.name}
          </button>
        ))}
      </div>
      <AddKnownSkill onAdded={added} />
    </div>
  );
}

// Any catalog skill can be required — found by type-ahead, never a giant list.
function SkillSearch({ onPick, exclude }) {
  const [catalog, setCatalog] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => { api("catalog/").then(setCatalog).catch(() => setCatalog([])); }, []);
  const t = q.trim().toLowerCase();
  const fams = catalog ? [...new Set(catalog.map((c) => c.family).filter(Boolean))] : [];
  const famHits = t ? fams.filter((f) => !exclude.includes(`f:${f}`) && f.toLowerCase().includes(t)).slice(0, 4) : [];
  const hits = t && catalog ? catalog.filter((c) => !exclude.includes(c.id) && c.name.toLowerCase().includes(t)).slice(0, 8) : [];
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any skill to require…"
        className="w-full rounded bg-white/10 px-2 py-2 text-sm" />
      {(hits.length > 0 || famHits.length > 0) && (
        <ul className="mt-1 rounded bg-white/5 text-sm">
          {famHits.map((f) => (
            <li key={`f:${f}`}><button type="button" className="w-full px-2 py-2 text-left"
              onClick={() => { onPick({ family: f }); setQ(""); }}>Any {f} <span className="opacity-60">(whole skill family)</span></button></li>
          ))}
          {hits.map((c) => (
            <li key={c.id}><button type="button" className="w-full px-2 py-2 text-left"
              onClick={() => { onPick(c); setQ(""); }}>{c.name}</button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Every bound is a RANGE: fill both ends, only a cap (to), only a floor (from), or leave blank for no limit.
function Range({ label, lo, hi, vals, onChange, unit }) {
  const box = "w-20 rounded bg-white/10 px-2 py-1";
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="w-40 shrink-0">{label}{unit ? ` (${unit})` : ""}</span>
      <span className="opacity-60">from</span>
      <input className={box} inputMode="decimal" placeholder="any" value={vals[lo] ?? ""} onChange={(e) => onChange(lo, e.target.value)} />
      <span className="opacity-60">to</span>
      <input className={box} inputMode="decimal" placeholder="any" value={vals[hi] ?? ""} onChange={(e) => onChange(hi, e.target.value)} />
    </div>
  );
}

const SKILL_FIELDS = [
  ["Median rating", "rating_min", "rating_max", "0–10"],
  ["Experience", "exp_min_months", "exp_max_months", "years"],   // typed in years, sent as months
  ["Gauge", "gauge_min", "gauge_max", "0 Novice–4 Expert"],
];
const GENERAL = [
  ["Skill price", "price_min", "price_max", "cents"],
  ["Attractiveness", "attr_min", "attr_max", "0–10, adults opt-in"],
  ["Age", "age_min", "age_max", "years"],
  ["Distance", "distance_min_km", "distance_max_km", "km"],
];

const MODES = {
  gate: { label: "Save gates", run: (b, p) => api(`gates/${p.type}/${p.id}/`, "PUT", b) },      // post owner preferences
  members: { label: "Find members", run: (b) => api("search/", "POST", b) },                     // poster looking for others
  posts: { label: "Find posts", run: (b) => api("posts/", "POST", b) },                          // members looking for posts
  works: { label: "Find content", run: (b) => api("works/", "POST", b) },                        // content by skill + creator level
};

// mode: "gate" (needs postRef {type,id}) | "members" | "posts" | "works"
export function GateEditor({ mode = "members", postRef, onResults }) {
  const [reqs, setReqs] = useState([]);   // [{skill_id, name, ...bounds}]
  const [r, setR] = useState({});
  const [any, setAny] = useState(true);
  const [msg, setMsg] = useState("");
  const set = (setter, k, v) => setter((o) => ({ ...o, [k]: v }));
  const num = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null));
  const body = () => ({
    ...num(r),
    skill_match: any ? "any" : "all",
    skill_ids: reqs.filter((x) => x.skill_id).map((x) => x.skill_id),
    skill_reqs: reqs.map(({ name, ...rest }) => Object.fromEntries(Object.entries(rest).map(([k, v]) => [
      k, v === "" ? null : k.startsWith("exp_") ? Math.round(Number(v) * 12) : v])),
    ),
  });
  const submit = async () => {
    try {
      const out = await MODES[mode].run(body(), postRef);
      if (mode === "gate") setMsg("Gates saved"); else onResults?.(out);
    } catch (e) { setMsg(e.message); }
  };
  const box = "w-20 rounded bg-white/10 px-2 py-1";
  return (
    <div className="space-y-3">
      <SkillSearch exclude={reqs.map((x) => x.family ? `f:${x.family}` : x.skill_id)}
        onPick={(c) => setReqs((l) => [...l, c.family && !c.id ? { family: c.family, name: `Any ${c.family}` } : { skill_id: c.id, name: c.name }])} />
      {reqs.map((x, i) => (
        <div key={x.family ? `f:${x.family}` : x.skill_id} className="space-y-1 rounded-xl border border-white/10 p-2 text-sm">
          <div className="flex justify-between"><b>{x.name}</b>
            <button type="button" className="opacity-60" onClick={() => setReqs((l) => l.filter((_, j) => j !== i))}>remove</button></div>
          {SKILL_FIELDS.map(([label, lo, hi, unit]) => (
            <Range key={lo} label={label} lo={lo} hi={hi} unit={unit} vals={x}
              onChange={(k, v) => setReqs((l) => l.map((y, j) => (j === i ? { ...y, [k]: v } : y)))} />
          ))}
        </div>
      ))}
      {reqs.length > 1 && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={any} onChange={(e) => setAny(e.target.checked)} />
          Any one of these skills (uncheck to require all)
        </label>
      )}
      {GENERAL.map(([label, lo, hi, unit]) => (
        <Range key={lo} label={label} lo={lo} hi={hi} unit={unit} vals={r} onChange={(k, v) => set(setR, k, v)} />
      ))}
      <p className="text-xs opacity-60">Every limit is a range you control: set a floor, a cap, both, or neither. Anyone outside a range you set is filtered out. Per-skill and per-family limits override the general ones.</p>
      <button type="button" onClick={submit} className="rounded-lg bg-white/20 px-4 py-2 text-sm">{MODES[mode].label}</button>
      {msg && <p className="text-sm opacity-80">{msg}</p>}
    </div>
  );
}

export { TIERS };
