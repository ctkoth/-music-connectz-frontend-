import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { IN_SHELL } from "../standalone.js";
import { PROMPTZ } from "../resources.js";
import { IconImg } from "../App.jsx";
import PersonalitieZ from "../PersonalitieZ.jsx";
import VoiceCard from "../components/VoiceCard.jsx";
import { blankForm, countAgainst, dialOption, formProblems, fromVoice, surfaceResult, toBody } from "../voicez.js";

// VoiceZ — the library of voices and which one each surface speaks in. Every
// number, cap, option and result sentence is the server's (/api/economy/voicez/).

function Chips({ dial, value, onChange, disabled }) {
  const opt = dialOption([dial], dial.key, value);
  return (
    <div>
      <p className="mb-1 text-[11px] text-white/50">{dial.label} — {dial.question}</p>
      <div className="flex flex-wrap gap-2">
        {dial.options.map((o) => (
          <button key={String(o.key)} type="button" disabled={disabled} aria-pressed={value === o.key}
            onClick={() => onChange(o.key)}
            className={`rounded-full border px-3 py-1 text-xs ${value === o.key ? "border-mcz-cyan bg-mcz-cyan/15 text-white" : "border-white/15 text-white/60"}`}>
            {o.label}
          </button>
        ))}
      </div>
      {opt && <p className="mt-1 text-[11px] text-white/40">{opt.result}</p>}
    </div>
  );
}

function Count({ text, cap }) {
  const c = countAgainst(text, cap);
  return <span className={`text-[11px] ${c.over ? "text-mcz-ember" : "text-white/35"}`}>{c.label}</span>;
}

export default function VoiceZ() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState(null);      // {id?, ...fields}
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState(null);  // {for, text}

  const load = () => api("/api/economy/voicez/").then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  if (!d) return <p className="text-sm text-white/50">{err || "Loading VoiceZ…"}</p>;
  const can = d.limits.can_use_custom;
  const readOnly = !can;

  async function pick(surface, choice) {
    setMsg("");
    try { setD(await api("/api/economy/voicez/", { method: "PATCH", body: { surface_voices: { [surface]: choice } } })); }
    catch (e) { setMsg(e.message); }
  }
  async function save() {
    const problems = formProblems(form, d.caps);
    if (problems.length) { setMsg(problems[0]); return; }
    setBusy(true); setMsg("");
    try {
      const body = toBody(form);
      if (form.id) await api(`/api/economy/voicez/voices/${form.id}/`, { method: "PATCH", body });
      else await api("/api/economy/voicez/voices/", { method: "POST", body });
      setForm(null); await load();
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  }
  async function remove(v) {
    if (!window.confirm(`Delete the voice “${v.name || "this voice"}”? It can't be undone.`)) return;
    setMsg("");
    try { const r = await api(`/api/economy/voicez/voices/${v.id}/`, { method: "DELETE" }); setMsg(r.detail); await load(); }
    catch (e) { setMsg(e.message); }
  }
  async function test(voice, key) {
    setBusy(true); setMsg(""); setSample(null);
    try { const r = await api("/api/economy/voicez/preview/", { method: "POST", body: { voice }, timeoutMs: 45000 }); setSample({ for: key, ...r }); load(); }
    catch (e) { setMsg(e.message); }
    setBusy(false);
  }
  const price = (
    <span className="text-[11px]">
      {d.free_today
        ? <span className="text-emerald-300">Free today <span className="text-white/45">— uses 1 of your {d.daily_remaining} free prompts left</span></span>
        : <span className="text-mcz-ember">−{d.preview_cost_cents} {PROMPTZ}</span>}
      <span className="text-white/40"> · A reply that fails isn't charged.</span>
    </span>
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSpec = (k, v) => setForm((f) => ({ ...f, spec: { ...f.spec, [k]: v } }));

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="voicez.png" alt="VoiceZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">VoiceZ</h2>
          <p className="text-sm text-white/60">A voice changes how things are worded. It never changes a score, a price or a rule.</p>
        </div>
      </header>
      {msg && <p role="alert" className="text-sm text-mcz-ember">{msg}</p>}

      <section className="neon-frame space-y-4 p-4" data-tour="voicez-surfaces">
        <h3 className="font-semibold">Where each voice speaks</h3>
        {d.surfaces.map((s) => (
          <div key={s.key} className="space-y-1">
            <label className="text-sm font-semibold text-white/80" htmlFor={`vz-${s.key}`}>{s.label}</label>
            <p className="text-[11px] text-white/45">{s.desc}</p>
            <select data-nomemo="true" id={`vz-${s.key}`} className="neon-input w-full" value={s.choice} onChange={(e) => pick(s.key, e.target.value)}>
              {s.options.map((o) => <option key={o.choice} value={o.choice}>{o.label}</option>)}
            </select>
            <p className="text-xs text-white/60">{surfaceResult(s, s.choice) || s.result}</p>
            {s.paused && <p className="text-[11px] text-mcz-gold">Your chosen voice is paused, so this follows your style.</p>}
          </div>
        ))}
      </section>

      <section className="neon-frame space-y-3 p-4">
        <h3 className="font-semibold">Your voices ({d.limits.used} / {d.limits.voices})</h3>
        {d.custom_paused && <p className="text-sm text-mcz-gold">Your {d.voices.length} voice{d.voices.length === 1 ? " is" : "s are"} paused, not deleted.</p>}
        {!d.voices.length && <p className="text-xs text-white/50">None yet.</p>}
        {d.voices.map((v) => (
          <div key={v.id} className="rounded-lg border border-white/10 p-3">
            <p className="font-semibold">{v.name} <span className="text-[11px] font-normal text-white/45">{v.summary}</span></p>
            {v.used_by.length > 0 && <p className="text-[11px] text-white/45">Speaking on: {v.used_by.join(", ")}. Deleting it sends those back to your style.</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {can && <button className="re-btn !w-auto px-3" onClick={() => setForm({ id: v.id, ...fromVoice(v) })}>Edit</button>}
              <button className="re-btn !w-auto px-3" onClick={() => remove(v)}>Delete</button>
              {can && <><button className="re-btn !w-auto px-3" disabled={busy} onClick={() => test(`custom:${v.id}`, v.id)}>Test it</button>{price}</>}
            </div>
            {sample?.for === v.id && <SampleBox s={sample} />}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-white/55">Built-in voices — test one:</span>
          {d.presets.map((p) => <button key={p.key} className="re-btn !w-auto px-3" disabled={busy} onClick={() => test(`preset:${p.key}`, p.key)}>{p.label}</button>)}
          {price}
        </div>
        {d.presets.map((p) => sample?.for === p.key && <SampleBox key={p.key} s={sample} />)}
      </section>

      <section className="neon-frame space-y-4 p-4">
        <h3 className="font-semibold">Make a voice</h3>
        {readOnly && (
          <p className="text-sm text-white/70">
            Making your own voices is StatZ's: describe who is talking, set the dials, paste something you wrote, then point the coach, the writer or OCC at it (up to {d.limits.statz_voices}).{" "}
            {!IN_SHELL && <button className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>See StatZ</button>}
          </p>
        )}
        {!form && !readOnly && <button className="re-btn !w-auto px-4" disabled={!d.limits.can_make}
          onClick={() => setForm({ ...blankForm(d.dials) })}>{d.limits.can_make ? "New voice" : `You hold ${d.limits.used} — delete one to make room`}</button>}
        {(form || readOnly) && (() => {
          const f = form || blankForm(d.dials);
          return (
            <fieldset disabled={readOnly} className="space-y-3">
              <label className="block text-sm">Name <Count text={f.name} cap={d.caps.name} />
                <input className="neon-input mt-1 w-full" value={f.name} onChange={(e) => set("name", e.target.value)} /></label>
              <label className="block text-sm">Who is talking? <Count text={f.bio} cap={d.caps.bio} />
                <span className="block text-[11px] text-white/45">A character, or you. Never a real person you aren't.</span>
                <textarea className="neon-input mt-1 min-h-20 w-full" value={f.bio} onChange={(e) => set("bio", e.target.value)} /></label>
              <PersonalitieZ value={f.personality} onChange={(c) => set("personality", c)} />
              {d.dials.map((dl) => <Chips key={dl.key} dial={dl} value={f.spec[dl.key] ?? dl.default} onChange={(v) => setSpec(dl.key, v)} disabled={readOnly} />)}
              <label className="block text-sm">Signature phrases (one per line, up to {d.caps.phrases})
                <span className="block text-[11px] text-white/45">Used at most once per reply, never forced.</span>
                <textarea className="neon-input mt-1 w-full" value={f.phrases} onChange={(e) => set("phrases", e.target.value)} /></label>
              <label className="block text-sm">Words to avoid (one per line, up to {d.caps.avoid})
                <textarea className="neon-input mt-1 w-full" value={f.avoid} onChange={(e) => set("avoid", e.target.value)} /></label>
              <label className="block text-sm">Paste something you wrote <Count text={f.sample} cap={d.caps.sample} />
                <span className="block text-[11px] text-white/45">Used only to match tone. Private to you, and deleted with the voice.</span>
                <textarea className="neon-input mt-1 min-h-24 w-full" value={f.sample} onChange={(e) => set("sample", e.target.value)} /></label>
              {!readOnly && (
                <div className="flex flex-wrap items-center gap-3">
                  <button className="neon-btn-primary !w-auto px-5" disabled={busy} onClick={save}>{busy ? <Loader2 className="animate-spin" size={16} /> : null} Save</button>
                  <button className="re-btn !w-auto px-4" disabled={busy} onClick={() => test(toBody(f), "draft")}>Test it</button>{price}
                  <button className="text-xs text-white/50" onClick={() => setForm(null)}>Cancel</button>
                </div>
              )}
              {sample?.for === "draft" && <SampleBox s={sample} />}
            </fieldset>
          );
        })()}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">How the app talks to you on screen</h3>
        <p className="text-xs text-white/50">Slang, emoji and explicit wording in the app's own screens. Separate from the voices above, which shape what the AI writes.</p>
        <VoiceCard />
      </section>
    </div>
  );
}

function SampleBox({ s }) {
  return (
    <div className="mt-2 rounded-lg bg-white/5 p-3 text-sm text-white/80">
      <p>{s.text}</p>
      <p className="mt-1 text-[11px] text-white/40">{s.note} {s.free_prompt ? "Used a free prompt." : `Charged ${s.charged_cents} ${PROMPTZ}.`}</p>
    </div>
  );
}
