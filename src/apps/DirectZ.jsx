// DirectZ — collaborative video works, and the composer they never had.
//
// The backend has been complete since it was written: `DirectZWorksView`
// accepts a format, a video type, a genre, a duration and contributors, seeds
// an AI craft rating, and enforces a length band per format. This screen was
// twenty-six lines of header and never called it, so `genre` and `video_type`
// had never once been filled. Same shape as BugZ's 404'ing bounty and GameZ's
// empty tab: the endpoint was finished and the screen didn't use it.
//
// The vocabulary is all SERVED — formats, genres, video types and the length
// bands come from GET /api/economy/directz/. Nothing here is a second copy, so
// the picker and the validator cannot come apart.
//
// The one piece of real design: **the length band is stated in the option, and
// checked against the file before it is sent.** The server already answers "that
// doesn't fit MovieZ, it fits ReelZ" — but only after the upload, which is the
// right answer at the wrong moment when the thing uploaded is a three-hour film.
// The same answer arrives here first.
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Clapperboard, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import MediaFields from "../MediaFields.jsx";
import SkillZPanel from "../skillz/SkillZPanel.jsx";

const mmss = (s) =>
  s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`
            : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export default function DirectZ() {
  const [spec, setSpec] = useState(null);
  // The craft rating is OFF by default. It sends the video to a model that
  // watches it, which costs real money — so posting must not quietly become a
  // paid action. The member asks for it, having read the price first.
  const [form, setForm] = useState({ fmt: "reelz", genre: "", video_type: "",
                                     title: "", description: "",
                                     craft_rating: false });
  const [work, setWork] = useState({});
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const probe = useRef(null);

  const load = () => api("/api/economy/directz/").then(setSpec).catch(() => {});
  useEffect(() => { load(); }, []);

  // Read the real duration off the file the member picked, so the band check
  // below is about their actual video rather than something they typed.
  useEffect(() => {
    const src = work.video;
    if (!src) return setSeconds(0);
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      setSeconds(Number.isFinite(el.duration) ? el.duration : 0);
      el.removeAttribute("src");
    };
    el.onerror = () => setSeconds(0);
    el.src = src;
    probe.current = el;
    return () => { if (probe.current) probe.current.onloadedmetadata = null; };
  }, [work.video]);

  const formats = asList(spec?.formats);
  const chosen = formats.find((f) => f.key === form.fmt);
  // Only a complaint when we actually know the length. A video whose metadata
  // wouldn't load is not a video we get to refuse.
  const fits = !chosen || !seconds ||
    (seconds >= chosen.min_sec && seconds <= chosen.max_sec);
  const shouldBe = seconds
    ? formats.find((f) => seconds >= f.min_sec && seconds <= f.max_sec)
    : null;

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setMsg("Give it a title.");
    setBusy(true); setMsg("");
    try {
      await api("/api/economy/directz/", {
        method: "POST",
        body: {
          ...form,
          duration_sec: Math.round(seconds),
          media_url: work.video || "",
          media_type: work.video ? "video" : "",
        },
      });
      setForm({ fmt: form.fmt, genre: "", video_type: "", title: "",
                description: "", craft_rating: false });
      setWork({}); setSeconds(0);
      setMsg("Posted to DirectZ.");
      load();
    } catch (err) {
      setMsg(err.message || "Couldn't post that one.");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <img src="/icons/directz.png" alt="DirectZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div className="flex-1">
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan drop-shadow-[0_0_12px_rgba(34,230,255,0.5)]">
            DirectZ
          </h2>
          <p className="text-sm text-white/60">
            Dynamic Scene Creation · Audio-Visual Harmony · Creative Collaborations.
          </p>
          <span className="pill mt-1 inline-block">Age-gated</span>
        </div>
        <img
          src="/icons/personaz_director.webp"
          alt="Director PersonaZ"
          className="hidden h-16 w-16 rounded-full border border-mcz-cyan/40 object-cover shadow-neon sm:block"
        />
      </header>

      <form onSubmit={submit} className="neon-frame space-y-3 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
          <Clapperboard size={14} /> Post a video
        </p>

        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-[11px] text-white/50">
            Format
            <select className="neon-input !py-2 text-xs" value={form.fmt}
                    onChange={(e) => setForm({ ...form, fmt: e.target.value })}>
              {/* The band is IN the option, so the rule is readable while
                  choosing rather than after uploading a three-hour film. */}
              {formats.map((f) => (
                <option key={f.key} value={f.key}>{f.name} · {f.length}</option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-white/50">
            Genre
            <select className="neon-input !py-2 text-xs" value={form.genre}
                    onChange={(e) => setForm({ ...form, genre: e.target.value })}>
              <option value="">— pick a genre —</option>
              {asList(spec?.genres).map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-white/50">
            What it's for
            <select className="neon-input !py-2 text-xs" value={form.video_type}
                    onChange={(e) => setForm({ ...form, video_type: e.target.value })}>
              <option value="">— optional —</option>
              {asList(spec?.video_types).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>

        <input className="neon-input" placeholder="Title" value={form.title}
               onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <textarea className="neon-input" rows={2} placeholder="What is it?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />

        <MediaFields value={work} onChange={setWork} label="The video" />

        {seconds > 0 && (
          <p className={`text-[11px] ${fits ? "text-white/45" : "text-mcz-ember"}`}>
            {fits
              ? `${mmss(seconds)} — fits ${chosen?.name}.`
              : `${mmss(seconds)} doesn't fit ${chosen?.name} (${chosen?.length}). `
                + (shouldBe ? `It fits ${shouldBe.name}.`
                            : "It's outside every DirectZ length band.")}
          </p>
        )}

        {/* The price, on the control that spends it. This shipped free and
            silent, which is unbounded spend on the platform's Gemini key and
            the cost/gain rule broken by the app that enforces it. */}
        {spec?.craft?.configured && (
          <label className="flex items-start gap-2 text-[11px] text-white/60">
            <input type="checkbox" className="mt-0.5" checked={form.craft_rating}
                   disabled={!spec.craft.affordable}
                   onChange={(e) => setForm({ ...form, craft_rating: e.target.checked })} />
            <span>
              Get a craft rating{" "}
              {spec.craft.free_today
                ? <span className="text-emerald-300">
                    +1 🏷️ free today · {spec.craft.daily_prompts_left} left
                  </span>
                : <span className="text-mcz-ember">−{spec.craft.cost_cents} 🏷️</span>}
              <span className="block text-white/35">
                {spec.craft.note}
                {!spec.craft.affordable && " You're out of prompts and balance for today."}
              </span>
            </span>
          </label>
        )}

        {msg && (
          <p className="flex items-start gap-2 text-[11px] text-mcz-gold">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {msg}
          </p>
        )}

        <button className="neon-btn-primary" disabled={busy || !fits}>
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Clapperboard size={16} />}
          Post to DirectZ
        </button>
      </form>

      <SkillZPanel basePath="/api/directz" accent="#22e6ff" />
    </div>
  );
}
