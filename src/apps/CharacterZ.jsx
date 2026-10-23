// CharacterZ — FaceZ with PersonalitieZ, and a voice. The cast MangaZ draws and writes.
//
// Decides nothing: the limit, the dials, the axes and the likeness rule are all
// /api/economy/characterz/. A look is a drawing or your own face, never another real
// person's, and the screen says so before anything is picked.
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import LoadGate from "../components/LoadGate.jsx";
import Empty from "../components/Empty.jsx";
import PersonalitieZ from "../PersonalitieZ.jsx";

const blank = { name: "", looks: "", bio: "", personality: "", spec: {}, sample: "", upload_id: null, look_attested: false };

function Editor({ d, start, onSaved, onCancel }) {
  const [f, setF] = useState(start || blank);
  const [images, setImages] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    api("/api/economy/uploads/").then((r) => setImages((r.uploads || []).filter((u) => String(u.content_type).startsWith("image"))))
      .catch(() => setImages([]));
  }, []);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  async function save() {
    setBusy(true); setErr("");
    try {
      const body = { name: f.name, looks: f.looks, bio: f.bio, personality: f.personality, spec: f.spec, sample: f.sample,
                     upload_id: f.upload_id || null, look_attested: f.look_attested };
      const r = start?.id ? await api(`/api/economy/characterz/${start.id}/`, { method: "PATCH", body })
                          : await api("/api/economy/characterz/", { method: "POST", body });
      onSaved(r);
    } catch (e) { setErr(e.message || "Couldn't save that character."); }
    finally { setBusy(false); }
  }
  return (
    <div className="re-card space-y-3">
      <input className="neon-input !py-2" placeholder="Name" maxLength={60} value={f.name} onChange={(e) => set("name", e.target.value)} aria-label="Name" />
      <div className="space-y-1">
        <p className="re-label">Look</p>
        <p className="text-[11px] text-mcz-gold">{d.likeness}</p>
        <div className="flex flex-wrap gap-2">
          {(images || []).slice(0, 24).map((u) => (
            <button key={u.id} type="button" onClick={() => set("upload_id", f.upload_id === u.id ? null : u.id)}
                    className={`h-16 w-16 overflow-hidden rounded-lg ring-2 ${f.upload_id === u.id ? "ring-mcz-cyan" : "ring-transparent"}`}>
              <img src={u.url} alt={u.name} className="h-full w-full object-cover" />
            </button>
          ))}
          {images && images.length === 0 && <Empty className="text-xs" text="No images in FileZ yet." action="Add one" onAction={() => goToSpot("filez", "filez-list")} />}
        </div>
        {f.upload_id && (
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input type="checkbox" checked={f.look_attested} onChange={(e) => set("look_attested", e.target.checked)} />
            This is a drawing, or my own face.
          </label>
        )}
        <input className="neon-input !py-2 text-sm" placeholder="Their look in words (helps keep them consistent)" maxLength={300}
               value={f.looks} onChange={(e) => set("looks", e.target.value)} aria-label="Looks" />
      </div>
      <div className="space-y-1">
        <p className="re-label">Personality</p>
        <PersonalitieZ value={f.personality} onChange={(v) => set("personality", v)} />
      </div>
      <div className="space-y-2">
        <p className="re-label">Voice</p>
        <textarea className="neon-input text-sm" rows={2} placeholder="Who they are, how they talk" maxLength={1200}
                  value={f.bio} onChange={(e) => set("bio", e.target.value)} aria-label="Who they are" />
        {d.dials.filter((x) => x.type === "choice").map((dl) => (
          <div key={dl.key} className="flex flex-wrap items-center gap-1.5">
            <span className="w-28 text-[11px] text-white/50">{dl.label}</span>
            {dl.options.map((o) => (
              <button key={o.key} type="button" title={o.result}
                      onClick={() => set("spec", { ...f.spec, [dl.key]: o.key })}
                      className={`pill text-[11px] ${(f.spec?.[dl.key] ?? dl.default) === o.key ? "!border-mcz-cyan !text-mcz-cyan" : ""}`}>{o.label}</button>
            ))}
          </div>
        ))}
        <textarea className="neon-input text-sm" rows={2} placeholder="A few lines in their voice (optional)" maxLength={2000}
                  value={f.sample} onChange={(e) => set("sample", e.target.value)} aria-label="Sample" />
      </div>
      <div className="flex gap-2">
        <button className="neon-btn-primary !w-auto px-5" disabled={busy || !f.name.trim() || (f.upload_id && !f.look_attested)} onClick={save}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : null} Save character <span className="text-emerald-300">Free</span>
        </button>
        <button className="text-sm text-white/50" onClick={onCancel}>Cancel</button>
      </div>
      {err && <p role="alert" className="text-xs text-mcz-ember">{err}</p>}
    </div>
  );
}

export default function CharacterZ() {
  const [d, setD] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [edit, setEdit] = useState(null);
  const load = () => api("/api/economy/characterz/").then((r) => { setD(r); setLoadErr(""); })
    .catch((e) => setLoadErr(e.message || "CharacterZ didn't load."));
  useEffect(() => { load(); }, []);
  if (!d) return <LoadGate error={loadErr} what="your characters" onRetry={load} />;
  const full = d.characters.length >= d.limit;

  async function remove(c) {
    if (!window.confirm(`Delete ${c.name}? Pages already made keep their drawings.`)) return;
    try { await api(`/api/economy/characterz/${c.id}/`, { method: "DELETE" }); load(); } catch (e) { setLoadErr(e.message); }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="re-card space-y-1">
        <h2 className="font-display text-xl font-extrabold">CharacterZ</h2>
        <p className="text-sm text-white/60">A face, a personality and a voice. MangaZ draws them and writes their lines in that voice.</p>
        <p className="text-[11px] text-white/40">{d.characters.length} / {d.limit} on your plan
          {d.tiers?.statz > d.limit ? ` · StatZ holds ${d.tiers.statz}` : ""}</p>
      </div>
      {edit ? (
        <Editor d={d} start={edit === "new" ? null : edit} onCancel={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button className="neon-btn-primary !w-auto px-4" disabled={full} onClick={() => setEdit("new")}><Plus size={14} /> New character</button>
          {d.characters.length > 0 && (
            <button className="re-btn !w-auto px-4" onClick={() => goToSpot("mangaz", "mangaz-new")}>Make a page in MangaZ →</button>
          )}
          {full && <span className="text-xs text-mcz-ember">Your plan holds {d.limit}. Remove one, or upgrade for more.</span>}
        </div>
      )}
      {d.characters.length === 0 && !edit && <Empty text="No characters yet. Make the first one above." />}
      <div className="grid gap-3 sm:grid-cols-2">
        {d.characters.map((c) => (
          <div key={c.id} className="re-card flex gap-3">
            {c.image ? <img src={c.image} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                     : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-white/5 text-2xl">🎭</div>}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-semibold">{c.name} {c.personality && <span className="text-[11px] text-white/40">{c.personality.replace(/-/g, "·")}</span>}</p>
              <p className="text-[12px] text-white/55">{c.voice_summary}</p>
              {c.bio && <p className="line-clamp-2 text-[12px] text-white/45">{c.bio}</p>}
              <div className="flex gap-3 text-xs">
                <button className="re-link" onClick={() => setEdit(c)}>Edit</button>
                <button className="text-white/40 hover:text-mcz-ember" onClick={() => remove(c)} aria-label={`Delete ${c.name}`}><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
