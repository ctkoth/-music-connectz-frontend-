// The fields every popular music/social profile carries — pronouns, a
// one-line headline, genres, influences, gear, label, timezone, a pinned
// post and a cover. The server cleans them (economy/social.py
// clean_profile_field); this file only edits and renders what it sends.
import { useState } from "react";
import { Clock, Pin, Upload } from "lucide-react";
import { uploadWork } from "../uploadWork.js";

const LISTS = [
  ["genres", "Genres", "Trap, Lo-fi, Gospel…"],
  ["influences", "Influences", "Artists you sound like or learn from"],
  ["gear", "Gear", "Mic, DAW, interface, instrument…"],
];

const toList = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);

/** The device's own timezone — what a member almost always means. */
export const deviceTimezone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; }
};

export function ProfileFieldsEditor({ value, onChange }) {
  const v = value || {};
  const set = (k, x) => onChange({ ...v, [k]: x });
  const [drafts, setDrafts] = useState({});
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverErr, setCoverErr] = useState("");

  const pickCover = async (file) => {
    if (!file) return;
    setCoverBusy(true); setCoverErr("");
    try {
      const { work } = await uploadWork({ image_blob: file });
      set("cover_url", work.image_url || "");
    } catch (e) {
      setCoverErr(e.message || "The cover didn't upload.");
    } finally { setCoverBusy(false); }
  };

  const input = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30";
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 p-4" data-tour="profile-fields">
      <h3 className="font-display text-sm font-bold text-white/80">About your music</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-white/50">Pronouns
          <input className={input} maxLength={24} placeholder="she/her, they/them…"
                 value={v.pronouns || ""} onChange={(e) => set("pronouns", e.target.value)} />
        </label>
        <label className="block text-xs text-white/50">Label / management
          <input className={input} maxLength={100} placeholder="Independent"
                 value={v.label || ""} onChange={(e) => set("label", e.target.value)} />
        </label>
      </div>
      <label className="block text-xs text-white/50">Headline
        <input className={input} maxLength={100} placeholder="Producer & mix engineer · open to features"
               value={v.headline || ""} onChange={(e) => set("headline", e.target.value)} />
      </label>
      {LISTS.map(([k, label, ph]) => (
        <label key={k} className="block text-xs text-white/50">{label} <span className="text-white/30">(comma-separated)</span>
          <input className={input} placeholder={ph}
                 value={drafts[k] ?? (v[k] || []).join(", ")}
                 onChange={(e) => setDrafts({ ...drafts, [k]: e.target.value })}
                 onBlur={(e) => { set(k, toList(e.target.value)); setDrafts({ ...drafts, [k]: undefined }); }} />
        </label>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-white/50">Timezone <span className="text-white/30">(from your device)</span>
          <input className={input} maxLength={48} placeholder="America/Denver"
                 value={v.timezone || ""} onChange={(e) => set("timezone", e.target.value)} />
        </label>
        <label className="block text-xs text-white/50">Pinned post id <span className="text-white/30">(one of your public posts)</span>
          <input className={input} inputMode="numeric" placeholder="e.g. 47"
                 value={v.pinned_post_id ?? ""}
                 onChange={(e) => set("pinned_post_id", e.target.value.replace(/\D/g, "") || null)} />
        </label>
      </div>
      <div className="text-xs text-white/50">Cover image
        {v.cover_url && <img src={v.cover_url} alt="" className="mt-1 h-20 w-full rounded-lg object-cover" />}
        <div className="mt-1 flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-white/70">
            <Upload size={12} /> {coverBusy ? "Uploading…" : v.cover_url ? "Replace" : "Upload"}
            <input type="file" accept="image/*" className="hidden" disabled={coverBusy}
                   onChange={(e) => pickCover(e.target.files?.[0])} />
          </label>
          {v.cover_url && <button type="button" className="text-white/40 underline" onClick={() => set("cover_url", "")}>Remove</button>}
          <span className="text-white/30">Uses your FileZ storage.</span>
        </div>
        {coverErr && <p className="mt-1 text-mcz-ember">{coverErr}</p>}
      </div>
    </div>
  );
}

function localTime(tz) {
  try { return new Date().toLocaleTimeString([], { timeZone: tz, hour: "numeric", minute: "2-digit" }); }
  catch { return ""; }
}

/** Pills and lines for a profile card. Renders nothing for a member who set nothing. */
export function ProfileFields({ p, linkPost }) {
  if (!p) return null;
  const time = p.timezone ? localTime(p.timezone) : "";
  const pills = (label, xs) => xs?.length ? (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wide text-white/35">{label}</span>
      {xs.map((x) => <span key={x} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/75">{x}</span>)}
    </div>
  ) : null;
  return (
    <div className="space-y-2">
      {(p.headline || p.pronouns) && (
        <p className="text-sm text-white/80">
          {p.headline}{p.headline && p.pronouns ? " · " : ""}
          {p.pronouns && <span className="text-white/45">{p.pronouns}</span>}
        </p>
      )}
      {pills("Genres", p.genres)}
      {pills("Influences", p.influences)}
      {pills("Gear", p.gear)}
      {(p.label || time) && (
        <p className="flex flex-wrap items-center gap-3 text-xs text-white/50">
          {p.label && <span>Label: {p.label}</span>}
          {time && <span className="inline-flex items-center gap-1"><Clock size={12} /> {time} their time</span>}
        </p>
      )}
      {p.pinned_post && (
        <a href={linkPost ? linkPost(p.pinned_post.id) : `/p/${p.pinned_post.id}`}
           className="inline-flex items-center gap-1.5 text-sm text-mcz-cyan hover:underline">
          <Pin size={13} /> {p.pinned_post.title || "Pinned post"}
        </a>
      )}
    </div>
  );
}

export function CoverBanner({ url }) {
  if (!url) return null;
  return <img src={url} alt="" className="mb-3 h-28 w-full rounded-xl object-cover" />;
}
