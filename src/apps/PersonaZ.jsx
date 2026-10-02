import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Save, UserRound, Users } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import MemberName from "../MemberName.jsx";
import VoiceCard from "../components/VoiceCard.jsx";
import { PERSONAS, PERSONA_READ } from "../personaVoice.js";
import { PERSONA_SKILLS, labelForSkill, periodsOf, skillDuration } from "../personaSkills.js";
import { say, useVoice } from "../voice.js";

// PersonaZ — every persona, every skill, Corey's read on each in YOUR voice
// (VoiceZ: slang, emoji and explicit, the switches right here at the top),
// and two ways to use it:
//
//   * Mine — say which personas you are and which skills you have, with the
//     date you started each. Experience is shown in the unit that reads
//     naturally (days → weeks → months → years) and is the SAME number the
//     server derives experience from (profile_max_experience sums stints).
//   * Members — everybody else who holds a persona, with how long they've
//     had each skill, through the one member search every screen uses.
//
// It writes through PATCH /api/auth/me/ {personas}, the same writer ProfileZ
// uses, so the two screens edit one list and cannot disagree.

const today = () => new Date().toISOString().slice(0, 10);

function Skill({ k, have, onToggle, onDate }) {
  const start = have ? periodsOf(have)[0]?.start || "" : "";
  const dur = have ? skillDuration(have) : null;
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1 text-xs ${have ? "border-mcz-cyan/40 bg-mcz-cyan/[0.06]" : "border-white/10"}`}>
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
        <input type="checkbox" checked={!!have} onChange={onToggle} />
        <span className="truncate">{labelForSkill(k)}</span>
      </label>
      {have && (
        <>
          <input type="date" max={today()} value={start} onChange={(e) => onDate(e.target.value)}
            className="neon-input !w-auto !py-0.5 text-[11px]" aria-label={`Started ${labelForSkill(k)}`} />
          <span className="w-24 text-right text-[11px] text-mcz-gold">{dur || "add a start date"}</span>
        </>
      )}
    </div>
  );
}

export default function PersonaZ() {
  const voice = useVoice();
  const [sel, setSel] = useState(null);
  const [open, setOpen] = useState(null);
  const [mode, setMode] = useState("mine");
  const [members, setMembers] = useState({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/api/auth/me/").then((d) => setSel((d.personas || []).map((x) => (typeof x === "string"
      ? { key: x, name: x, skills: [] } : { ...x, key: x.key || x.name, skills: x.skills || [] })))).catch((e) => setMsg(e.message));
  }, []);

  useEffect(() => {
    if (mode !== "members" || !open || members[open]) return;
    api(`/api/economy/members/?personas=${open}`)
      .then((r) => setMembers((m) => ({ ...m, [open]: r.members || [] }))).catch(() => setMembers((m) => ({ ...m, [open]: [] })));
  }, [mode, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const mineOf = (key) => sel?.find((p) => p.key === key);
  const edit = (fn) => { setSel((cur) => fn(cur || [])); setDirty(true); setMsg(""); };
  const togglePersona = (key, label) => edit((cur) => (cur.some((p) => p.key === key)
    ? cur.filter((p) => p.key !== key) : [...cur, { key, name: label, skills: [] }]));
  const toggleSkill = (key, sk) => edit((cur) => cur.map((p) => (p.key !== key ? p : {
    ...p, skills: p.skills.some((s) => s.name === sk) ? p.skills.filter((s) => s.name !== sk) : [...p.skills, { name: sk }],
  })));
  const setStart = (key, sk, date) => edit((cur) => cur.map((p) => (p.key !== key ? p : {
    ...p, skills: p.skills.map((s) => {
      if (s.name !== sk) return s;
      const periods = periodsOf(s);
      const rest = periods.slice(1);
      return { name: s.name, periods: date ? [{ ...(periods[0] || {}), start: date }, ...rest] : rest };
    }),
  })));

  async function save() {
    setBusy(true); setMsg("");
    try {
      await api("/api/auth/me/", { method: "PATCH", body: { personas: sel } });
      setDirty(false); setMsg("Saved — your PersonaZ and skill dates are live on your profile.");
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="personaz.png" alt="PersonaZ" className="h-16 w-16 rounded-2xl object-cover shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">PersonaZ</h2>
          <p className="text-sm text-white/60">Every persona and every skill. Say which are yours and since when — or find who else has them.</p>
        </div>
      </header>

      <details className="rounded-xl border border-white/10 bg-black/20 p-2">
        <summary className="cursor-pointer text-xs text-white/60">
          Read in your voice — slang {voice.slang ? "on" : "off"} · emoji {voice.emoji ? "on" : "off"} · explicit {voice.explicit ? "on" : "off"}
        </summary>
        <div className="mt-2"><VoiceCard /></div>
      </details>

      <div className="flex gap-2" role="tablist">
        {[["mine", "Mine", UserRound], ["members", "Members", Users]].map(([k, l, Icon]) => (
          <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm ${mode === k ? "border-mcz-cyan bg-mcz-cyan/15" : "border-white/15 text-white/60"}`}>
            <Icon size={14} /> {l}
          </button>
        ))}
        {mode === "mine" && dirty && (
          <button className="neon-btn-primary ml-auto !w-auto px-4 py-1.5 text-sm" disabled={busy} onClick={save}>
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save
          </button>
        )}
      </div>
      {msg && <p className={`text-sm ${/Saved/.test(msg) ? "text-emerald-300" : "text-mcz-ember"}`}>{msg}</p>}
      {!sel && !msg && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>}

      {sel && (
        <div className="space-y-2">
          {PERSONAS.map(([key, label, icon, emoji]) => {
            const mine = mineOf(key);
            const tree = PERSONA_SKILLS[key] || {};
            const total = Object.values(tree).reduce((n, cat) => n + Object.keys(cat).length, 0);
            const isOpen = open === key;
            return (
              <section key={key} className={`neon-frame p-3 ${mine ? "border-mcz-cyan/40" : ""}`}>
                <div className="flex items-start gap-3">
                  <IconImg icon={icon} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    fallback={<span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/5 text-2xl">{emoji}</span>} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{label}</h3>
                      {mine && <span className="pill !border-mcz-cyan/50 !text-mcz-cyan text-[10px]">yours · {mine.skills.length} skill{mine.skills.length === 1 ? "" : "s"}</span>}
                      <span className="text-[11px] text-white/40">{total} skills</span>
                    </div>
                    {PERSONA_READ[key] && <p className="mt-0.5 text-[13px] leading-relaxed text-white/75">{say(PERSONA_READ[key], voice)}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {mode === "mine" && (
                        <button className={`rounded-full border px-3 py-1 text-xs ${mine ? "border-mcz-ember/50 text-mcz-ember" : "border-mcz-cyan/50 text-mcz-cyan"}`}
                          onClick={() => togglePersona(key, label)}>{mine ? "Remove" : "This is me"}</button>
                      )}
                      <button className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-xs text-white/70"
                        onClick={() => setOpen(isOpen ? null : key)}>
                        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        {mode === "mine" ? "Skills" : `Members who are ${label}s`}
                      </button>
                    </div>
                  </div>
                </div>

                {isOpen && mode === "mine" && (
                  <div className="mt-3 space-y-3">
                    {!mine && <p className="text-xs text-white/50">Press “This is me” to add skills and their start dates.</p>}
                    {Object.entries(tree).map(([cat, skills]) => (
                      <div key={cat}>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/45">{cat}</p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {Object.keys(skills).map((sk) => (
                            mine ? (
                              <Skill key={sk} k={sk} have={mine.skills.find((s) => s.name === sk)}
                                onToggle={() => toggleSkill(key, sk)} onDate={(d) => setStart(key, sk, d)} />
                            ) : (
                              <span key={sk} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/60">{labelForSkill(sk)}</span>
                            )
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isOpen && mode === "members" && (
                  <div className="mt-3">
                    {members[key] === undefined && <p className="flex items-center gap-2 text-xs text-white/50"><Loader2 className="animate-spin" size={12} /> Finding {label}s…</p>}
                    {members[key]?.length === 0 && <p className="text-xs text-white/55">Nobody else has said they're a {label} yet.</p>}
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(members[key] || []).map((m) => {
                        const theirs = (m.personas || []).find((p) => p.key === key);
                        return (
                          <div key={m.username} className="re-card space-y-1.5 p-2.5">
                            <MemberName username={m.username} />
                            <div className="flex flex-wrap gap-1">
                              {(theirs?.skills || []).slice(0, 8).map((s) => (
                                <span key={s.name} className="pill text-[10px]">
                                  {labelForSkill(s.name)}{skillDuration(s) ? ` · ${skillDuration(s)}` : ""}
                                </span>
                              ))}
                              {!theirs?.skills?.length && <span className="text-[11px] text-white/40">No skills listed yet.</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
