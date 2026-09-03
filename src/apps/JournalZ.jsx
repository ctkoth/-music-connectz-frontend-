// JournalZ 📔 — the diary, and the only tab here that says nothing by default.
//
// Everything else in this app publishes the moment you press the button. This
// one does not, and the screen has to make that obvious rather than merely
// true: the visibility control sits in the composer with "Just me" already
// chosen, the people you tag carry a line saying they haven't been told, and
// the one control that changes any of that — Publish — quotes what it costs
// AND names who it is about to notify before it does either.
//
// Everything numeric on this screen comes from the server: the tier's room
// (`/journalz/cost/`), the character limit (`limits.js`), the QuestZ reward,
// and every price on a destination row. Nothing here is retyped, which is the
// rule that stopped "20 free prompts" drifting into nine places.
import { useEffect, useState } from "react";
import {
  Calendar, Clock, Download, Loader2, Lock, MapPin, Plus, RefreshCw, Search,
  Send, Tag, Trash2, Users, X as XIcon,
} from "lucide-react";
import { api } from "../api.js";
import { asList, asDict } from "../shape.js";
import { useCharLimit } from "../limits.js";
import CharLimit from "../CharLimit.jsx";
import MediaFields from "../MediaFields.jsx";
import LinkPicker from "../LinkPicker.jsx";
import EmbedLink from "../EmbedLink.jsx";
import { hasBlobs, mediaItems, storageNote, uploadWork } from "../uploadWork.js";
import { ENERGY } from "../resources.js";
import { goToSpot } from "../goto.js";
import { handOff, onHandoff } from "../handoff.js";
import { IconImg } from "../App.jsx";

const today = () => new Date().toISOString().slice(0, 10);

/** A cost the way the paradigm wants it: what leaves, in red, with its mark.
 *  `null` means the destination quotes its own price on its own button — a
 *  second copy of a number that moves during a session is a stale quote, and a
 *  stale quote is the same lie as no quote. */
function Price({ cost }) {
  if (cost === null || cost === undefined) return <span className="text-white/40">priced there</span>;
  if (!cost.amount) return <span className="text-emerald-300">Free</span>;
  return (
    <span className={cost.affordable ? "text-mcz-ember" : "text-mcz-ember/60"}>
      −{cost.amount} {ENERGY}
      {!cost.affordable && <span className="text-white/35"> · we'll take what's there</span>}
    </span>
  );
}

/** A tier gate, rendered as an offer instead of a wall.
 *
 * The 403 body carries what is behind the door for THIS member — how many
 * entries are waiting, what the feature is — so the lock can say what
 * upgrading opens rather than just naming a price. A gate that only says no is
 * a dead end, and this app doesn't do those. */
function Gate({ gate, children = null }) {
  if (!gate) return children;
  const d = asDict(gate);
  return (
    <div className="rounded-lg border border-mcz-gold/25 bg-mcz-gold/[0.06] p-3">
      <p className="flex items-center gap-2 text-[13px] font-bold text-mcz-gold">
        <Lock size={13} /> {d.detail}
      </p>
      {d.blurb && <p className="mt-1 text-[11px] text-white/55">{d.blurb}</p>}
      {(d.preview?.what || d.what) && (
        <p className="mt-1 text-[11px] text-white/45">{d.preview?.what || d.what}</p>
      )}
      {d.always_free && <p className="mt-1 text-[11px] text-emerald-300/80">{d.always_free}</p>}
      <button className="neon-btn-primary mt-2 !w-auto px-4 text-[12px]"
              onClick={() => goToSpot("membershipz", "")}>
        See MembershipZ
      </button>
    </div>
  );
}

/** Where an entry can go next. Same contract as the PostZ door list: the
 *  server decides which apps can do something with it and what each still
 *  needs, and a door that can't go is greyed WITH the reason rather than
 *  dropped — "the coach wants a recording" is an answer, a missing button is
 *  a member concluding SingZ is broken. */
function OpenIn({ entry, busy, onGo }) {
  const dests = asList(entry.destinations);
  if (!dests.length) return null;
  return (
    <div className="mt-2 space-y-1.5 rounded-lg border border-white/[0.06] bg-black/20 p-2.5"
         data-tour="journalz-open-in">
      <p className="text-[10px] uppercase tracking-widest text-white/40">Take this entry to</p>
      {dests.map((d) => (
        <div key={d.app + d.label} className="rounded-lg border border-white/[0.06] p-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button onClick={() => onGo(d)} disabled={!d.available}
                    className={`text-[12px] font-semibold ${d.available
                      ? "text-white hover:text-mcz-gold" : "cursor-not-allowed text-white/35"}`}>
              {d.label}
            </button>
            <span className="text-[11px]"><Price cost={d.cost} /></span>
            {d.gain?.what && <span className="text-[11px] text-emerald-300/70">→ {d.gain.what}</span>}
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{d.what}</p>
          {d.warn && <p className="mt-0.5 text-[11px] text-mcz-ember/80">{d.warn}</p>}
          {!d.available && (
            <p className="mt-1 text-[11px] text-mcz-ember/80">Needs {asList(d.needs).join("; ")}.</p>
          )}
        </div>
      ))}
      {busy && <p className="flex items-center gap-2 text-[11px] text-white/45">
        <Loader2 className="animate-spin" size={12} /> Handing it over…</p>}
    </div>
  );
}

/** Chips you type into. Used for tags and for the people on an entry.
 *
 * Deliberately not an autocomplete against the member list: the people on a
 * diary entry are often not on this platform at all, and a picker that only
 * accepts members would quietly refuse half of somebody's life. The server
 * answers with which names resolved and which didn't, and the composer shows
 * that answer — see `dropped` below. */
function Chips({ value, onChange, placeholder, prefix = "", max, icon: Icon }) {
  const [draft, setDraft] = useState("");
  const list = asList(value);
  const add = () => {
    const v = draft.trim().replace(/^[#@]/, "");
    if (!v || list.includes(v)) return setDraft("");
    onChange([...list, v]);
    setDraft("");
  };
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {Icon && <Icon size={13} className="text-white/35" />}
        {list.map((v) => (
          <span key={v} className="pill !py-0.5 text-[11px]">
            {prefix}{v}
            <button className="ml-1 text-white/40 hover:text-mcz-ember"
                    onClick={() => onChange(list.filter((x) => x !== v))}>
              <XIcon size={10} className="inline" />
            </button>
          </span>
        ))}
        <input className="neon-input !w-40 !py-1 text-[11px]" value={draft}
               placeholder={placeholder}
               onChange={(e) => setDraft(e.target.value)}
               onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
               onBlur={add} />
      </div>
      {max != null && (
        <p className="text-[10px] text-white/30">
          {list.length}/{max} — your tier's room. More on Premium.
        </p>
      )}
    </div>
  );
}

export default function JournalZ() {
  const [data, setData] = useState(null);
  const [cost, setCost] = useState(null);
  const [view, setView] = useState("mine");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [mood, setMood] = useState("");
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState("");

  // The composer.
  const [day, setDay] = useState(today);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [entryMood, setEntryMood] = useState("");
  const [weather, setWeather] = useState("");
  const [tags, setTags] = useState([]);
  const [people, setPeople] = useState([]);
  const [placeName, setPlaceName] = useState("");
  const [coords, setCoords] = useState(null);       // {lat, lng} once located
  const [placeExact, setPlaceExact] = useState(false);
  const [visibility, setVisibility] = useState("private");
  const [work, setWork] = useState({});
  const [entryLinks, setEntryLinks] = useState([]); // LinkPicker's shape; only the first rides in
  const [storage, setStorage] = useState(null);
  const [dropped, setDropped] = useState(null);
  const [saving, setSaving] = useState(false);

  // Share, On This Day, export.
  const [quote, setQuote] = useState(null);         // {entry, ...server quote}
  const [look, setLook] = useState(null);
  const [lookGate, setLookGate] = useState(null);
  const [exportGate, setExportGate] = useState(null);

  const cl = useCharLimit();
  const limits = asDict(cost?.limits);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 3600); };

  const load = () => {
    setBusy(true);
    const p = new URLSearchParams({ view });
    if (q.trim()) p.set("q", q.trim());
    if (tag) p.set("tag", tag);
    if (mood) p.set("mood", mood);
    api(`/api/economy/journalz/?${p}`)
      .then((d) => { setData(d); setErr(""); })
      .catch((e) => setErr(e.message || "Couldn't load your journal."))
      .finally(() => setBusy(false));
  };
  useEffect(() => { load(); }, [view, tag, mood]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api(`/api/economy/journalz/cost/?day=${day}`).then(setCost).catch(() => {}); }, [day]);

  // A post handed over from PostZ arrives here as the start of today's entry.
  // Cross-pollination runs both ways or it isn't a loop.
  useEffect(() => onHandoff("journalz", (p) => {
    setTitle(String(p.title || "").slice(0, 160));
    setBody([p.description, p.lyrics].filter(Boolean).join("\n\n"));
    if (p.author) setPeople((cur) => (cur.includes(p.author) ? cur : [...cur, p.author]));
    if (p.place) setPlaceName(p.place);
    flash(`"${p.title}" is in today's entry — it stays private until you share it.`);
  }), []);

  async function save() {
    if (saving) return;
    if (!title.trim() && !body.trim() && !Object.keys(work).length && !entryLinks.length) {
      return flash("An entry needs something in it — a title, some words, an attachment, or a linked track.");
    }
    setSaving(true);
    try {
      if (hasBlobs(work)) flash("Uploading…");
      const { work: hosted, storage: st } = await uploadWork(work);
      if (st) setStorage(st);
      const d = await api("/api/economy/journalz/", {
        method: "POST",
        body: {
          day, title: title.trim(), body, mood: entryMood, weather, tags, people,
          place_name: placeName, place_exact: placeExact,
          place_lat: coords?.lat ?? null, place_lng: coords?.lng ?? null,
          visibility, items: mediaItems(hosted, title.trim() || day),
          link: entryLinks[0] || {},
        },
      });
      setDropped(asDict(d.dropped));
      setTitle(""); setBody(""); setWork({}); setEntryLinks([]); setEntryMood(""); setWeather("");
      setTags([]); setPeople([]); setPlaceName(""); setCoords(null); setPlaceExact(false);
      setVisibility("private");
      flash(asList(d.notified).length
        ? `Kept. ${asList(d.notified).map((n) => `@${n}`).join(", ")} told they're in it.`
        : "Kept. Nobody was told — that's what private means.");
      load();
      api(`/api/economy/journalz/cost/?day=${day}`).then(setCost).catch(() => {});
    } catch (e) {
      // The real error, never a cheerful "saved". This has shipped twice.
      flash(e.message || "Couldn't save that entry.");
    } finally { setSaving(false); }
  }

  function locate() {
    if (!navigator.geolocation) return flash("This browser won't share a location.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) });
        flash("Pin saved to this entry. It stays in your diary unless you tick exact.");
      },
      () => flash("Couldn't get a location — type the place instead."),
    );
  }

  async function remove(e) {
    if (!window.confirm(`Delete the entry for ${e.day}? This can't be undone.`)) return;
    try {
      const r = await api(`/api/economy/journalz/${e.id}/`, { method: "DELETE" });
      flash(r.note || "Entry deleted.");
      load();
    } catch (x) { flash(x.message); }
  }

  async function askToShare(e) {
    try {
      const qz = await api(`/api/economy/journalz/${e.id}/share/`);
      setQuote({ ...qz, entry: e });
    } catch (x) { flash(x.message); }
  }

  async function doShare(vis) {
    if (!quote) return;
    try {
      const r = await api(`/api/economy/journalz/${quote.entry.id}/share/`,
                          { method: "POST", body: { visibility: vis } });
      setQuote(null);
      flash(asList(r.notified).length
        ? `Published. ${asList(r.notified).map((n) => `@${n}`).join(", ")} told.`
        : "Published to PostZ.");
      load();
    } catch (x) { flash(x.message); }
  }

  async function openIn(e, d) {
    if (!d.available || opening) return;
    setOpening(d.app);
    try {
      if (d.action === "share") return await askToShare(e);
      if (d.action === "open") { goToSpot(d.app, d.target); return; }
      await handOff(d.app, d.target, {
        kind: "journal", action: d.action, coach_kind: d.coach_kind || "",
        ...(d.carry || {}),
      });
      flash(`Waiting for you in ${d.app.toUpperCase()}.`);
    } catch (x) { flash(x.message); } finally { setOpening(""); }
  }

  async function lookback() {
    setLook(null); setLookGate(null);
    try { setLook(await api("/api/economy/journalz/lookback/")); }
    catch (e) { setLookGate(e.data || { detail: e.message }); }
  }

  async function exportJournal() {
    setExportGate(null);
    try {
      const d = await api("/api/economy/journalz/export/?format=md");
      const url = URL.createObjectURL(new Blob([d.markdown], { type: "text/markdown" }));
      const a = document.createElement("a");
      a.href = url; a.download = d.filename || "journalz.md";
      a.click();
      URL.revokeObjectURL(url);
      flash(`${d.count} entries saved to your device.`);
    } catch (e) { setExportGate(e.data || { detail: e.message }); }
  }

  const entries = asList(data?.entries);
  const moods = asList(cost?.moods || data?.moods);

  if (!data && !err) {
    return <p className="flex items-center gap-2 text-white/50">
      <Loader2 className="animate-spin" size={16} /> Loading JournalZ…</p>;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="journalz.png" alt="JournalZ" className="h-11 w-11 rounded-xl" />
        <div className="flex-1">
          <h2 className="font-display text-xl font-extrabold">JournalZ</h2>
          <p className="text-xs text-white/45">
            Your diary. Private until you say otherwise — tagging somebody here tells them nothing.
          </p>
        </div>
        <button className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white"
                onClick={load} title="Refresh">
          <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
        </button>
      </header>

      {err && <p className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[12px] text-mcz-ember">{err}</p>}
      {toast && <p className="rounded-lg border border-mcz-cyan/30 bg-mcz-cyan/10 px-3 py-2 text-[12px] text-mcz-cyan">{toast}</p>}

      {/* Days kept, entries kept, tags used. Counts of things that happened —
          nothing on this screen scores the writing, and the note says so. */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="pill !text-mcz-gold">🔥 {data?.streak || 0}-day streak</span>
        <span className="pill">{data?.days_kept || 0} days kept</span>
        <span className="pill">{data?.entries_kept || 0} entries</span>
        <span className="text-white/30">{data?.streak_note}</span>
      </div>

      {/* ---- the composer -------------------------------------------------- */}
      <div className="re-card space-y-3" data-tour="journalz-composer">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="re-label">Keep the day</div>
          {/* Free to write, and what it EARNS said before a word is typed —
              a free action that pays has to state the gain, same as a paid one
              states the price. */}
          <p className="text-[11px]">
            <span className="text-emerald-300">Free</span>
            {cost?.gain?.amount > 0 && (
              <>
                {" · "}
                <button className="text-emerald-300 underline hover:brightness-125"
                        onClick={() => goToSpot(cost.gain.app, cost.gain.target)}>
                  +{cost.gain.amount} {ENERGY} on your first entry today
                </button>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-white/45">
            <Calendar size={13} />
            <input type="date" max={today()} value={day} onChange={(e) => setDay(e.target.value)}
                   className="rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-[12px] text-white outline-none focus:border-mcz-ember/60" />
          </label>
          {cost && (
            <span className="text-[10px] text-white/30">
              {cost.used_today}/{limits.per_day} entries kept for this day
            </span>
          )}
        </div>

        <input className="w-full rounded-lg border border-white/[0.08] bg-black/40 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60"
               placeholder="What the day was — a line, or nothing at all"
               maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea rows={5}
                  className="w-full resize-none rounded-lg border border-white/[0.08] bg-black/40 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60"
                  placeholder="Write it down…"
                  maxLength={cl.unlimited ? undefined : cl.limit}
                  value={body} onChange={(e) => setBody(cl.clamp(e.target.value))} />
        <CharLimit cl={cl} value={body} />

        {/* Mood and weather are FACTS about the day the member recorded, not
            scores. Nothing here rates an entry and nothing should. */}
        <div className="flex flex-wrap items-center gap-1.5">
          {moods.map((m) => (
            <button key={m.key} onClick={() => setEntryMood(entryMood === m.key ? "" : m.key)}
                    className={`pill text-[11px] ${entryMood === m.key ? "!border-mcz-cyan/70 !text-white" : ""}`}>
              {m.label}
            </button>
          ))}
          <input className="neon-input !w-36 !py-1 text-[11px]" placeholder="Weather"
                 maxLength={40} value={weather} onChange={(e) => setWeather(e.target.value)} />
        </div>

        <Chips value={tags} onChange={setTags} placeholder="tag + Enter" prefix="#"
               max={limits.tags} icon={Tag} />

        <div data-tour="journalz-people" className="space-y-1">
          <Chips value={people} onChange={setPeople} placeholder="@member + Enter" prefix="@"
                 max={limits.people} icon={Users} />
          {/* The whole reason tagging is safe to offer on a diary, said where
              somebody is actually doing it. */}
          <p className="text-[10px] leading-relaxed text-white/35">
            {visibility === "private"
              ? "Nobody is told. On a private entry a tag is a note to yourself — they can't see it and they get no notification."
              : "These members will be told, once, when you save this."}
          </p>
        </div>

        <div data-tour="journalz-place" className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <MapPin size={13} className="text-white/35" />
            <input className="neon-input !w-56 !py-1 text-[11px]" placeholder="Where were you?"
                   maxLength={120} value={placeName} onChange={(e) => setPlaceName(e.target.value)} />
            <button className="pill text-[11px]" onClick={locate}>Use my location</button>
            {coords && (
              <label className="flex items-center gap-1.5 text-[11px] text-white/50">
                <input type="checkbox" checked={placeExact}
                       onChange={(e) => setPlaceExact(e.target.checked)} />
                Share the exact pin if I publish this
              </label>
            )}
          </div>
          {coords && (
            <p className="text-[10px] leading-relaxed text-white/35">
              {coords.lat}, {coords.lng} —{" "}
              {placeExact
                ? "the coordinates will travel with a shared entry."
                : "only the place name travels. The pin stays in your diary."}
            </p>
          )}
        </div>

        <MediaFields value={work} onChange={setWork} label="Attach a photo, a voice note, a take" />
        {storage && <p className="text-[10px] text-white/35">{storageNote(storage)}</p>}
        <LinkPicker value={entryLinks} onChange={(v) => setEntryLinks(v.slice(-1))} label="What was playing" />

        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-mcz-ember/60"
                  value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="private">🔒 Just me</option>
            <option value="restricted">👥 Members only</option>
            <option value="public">🌍 Public</option>
          </select>
          <button className="re-btn !w-auto px-6" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {saving ? " Saving…" : " Keep it"}
            <span className="ml-1 text-emerald-300">Free</span>
          </button>
        </div>

        {/* Never a silent loss. What didn't make it, and why. */}
        {dropped && (asList(dropped.tags).length || asList(dropped.people).length || dropped.attachments > 0) ? (
          <p className="text-[11px] leading-relaxed text-mcz-ember/80">
            {asList(dropped.tags).length > 0 && <>Tags not kept: {dropped.tags.join(", ")} — over your tier's {limits.tags}. </>}
            {asList(dropped.people).map((p) => <span key={p.name}>@{p.name} wasn't tagged — {p.why}. </span>)}
            {dropped.attachments > 0 && <>{dropped.attachments} attachment(s) over your tier's {limits.attachments}.</>}
          </p>
        ) : null}
      </div>

      {/* ---- the two Premium doors, as offers rather than walls ----------- */}
      <div className="flex flex-wrap gap-2">
        <button className="pill text-[11px]" onClick={lookback} data-tour="journalz-lookback">
          <Clock size={11} className="mr-1 inline" /> On This Day
        </button>
        <button className="pill text-[11px]" onClick={exportJournal} data-tour="journalz-export">
          <Download size={11} className="mr-1 inline" /> Export the journal
        </button>
      </div>
      {lookGate && <Gate gate={lookGate} />}
      {exportGate && <Gate gate={exportGate} />}
      {look && (
        <div className="neon-frame space-y-2 p-3">
          <p className="text-[11px] uppercase tracking-widest text-white/45">
            On this day · {look.count} {look.count === 1 ? "year" : "years"}
          </p>
          {look.count === 0 && <p className="text-[12px] text-white/45">
            Nothing on this date in another year yet — this one grows as you keep it.</p>}
          {asList(look.years).map((e) => (
            <div key={e.id} className="rounded-lg border border-white/[0.06] p-2">
              <p className="text-[11px] text-mcz-gold">{e.day}</p>
              <p className="text-[12px] text-white/70">{e.title || e.body?.slice(0, 120)}</p>
            </div>
          ))}
        </div>
      )}

      {/* ---- filters ------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2">
        {[["mine", "My diary"], ["tagged", "I'm tagged in"]].map(([k, label]) => (
          <button key={k} onClick={() => setView(k)}
                  className={`pill text-[11px] ${view === k ? "!border-mcz-cyan/70 !text-white" : ""}`}>
            {label}
          </button>
        ))}
        <span className="flex items-center gap-1">
          <Search size={12} className="text-white/35" />
          <input className="neon-input !w-44 !py-1 text-[11px]" placeholder="Search your words"
                 value={q} onChange={(e) => setQ(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && load()} />
        </span>
        <select className="rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1 text-[11px] text-white"
                value={mood} onChange={(e) => setMood(e.target.value)}>
          <option value="">Any mood</option>
          {moods.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        {tag && <button className="pill !text-mcz-ember text-[11px]" onClick={() => setTag("")}>#{tag} ✕</button>}
      </div>

      {asList(data?.tags).length > 0 && view === "mine" && (
        <div className="flex flex-wrap gap-1.5">
          {asList(data.tags).slice(0, 14).map((t) => (
            <button key={t.tag} onClick={() => setTag(t.tag)} className="pill !py-0.5 text-[10px]">
              #{t.tag} · {t.count}
            </button>
          ))}
        </div>
      )}

      {/* ---- the entries -------------------------------------------------- */}
      <div className="space-y-3" data-tour="journalz-entries">
        {entries.length === 0 && (
          <p className="text-sm text-white/45">
            {view === "tagged"
              ? "Nobody has shared an entry you're in yet."
              : "Nothing kept yet. Today is as good a day as any."}
          </p>
        )}
        {entries.map((e) => (
          <article key={e.id} className="neon-frame space-y-2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-bold text-mcz-gold">{e.day}</span>
              {!e.mine && <span className="pill !py-0 text-[10px]">@{e.author}</span>}
              <span className={`pill !py-0 text-[10px] ${e.private ? "!text-white/60" : "!text-mcz-cyan"}`}>
                {e.private ? "🔒 Just me" : e.visibility === "public" ? "🌍 Public" : "👥 Members only"}
              </span>
              {e.mood_label && <span className="text-[11px] text-white/50">{e.mood_label}</span>}
              {e.weather && <span className="text-[11px] text-white/40">{e.weather}</span>}
              {e.mine && (
                <button className="ml-auto text-white/30 hover:text-mcz-ember" title="Delete"
                        onClick={() => remove(e)}><Trash2 size={13} /></button>
              )}
            </div>
            {e.title && <h3 className="text-sm font-bold text-white">{e.title}</h3>}
            {e.body && <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/75">{e.body}</p>}

            <div className="flex flex-wrap items-center gap-1.5">
              {asList(e.tags).map((t) => (
                <button key={t} onClick={() => setTag(t)} className="pill !py-0 text-[10px]">#{t}</button>
              ))}
              {asList(e.people).map((p) => (
                <span key={p} className="pill !py-0 text-[10px] !text-mcz-cyan">@{p}</span>
              ))}
              {e.place?.name && (
                <span className="pill !py-0 text-[10px]"><MapPin size={9} className="inline" /> {e.place.name}</span>
              )}
            </div>
            {e.place?.note && <p className="text-[10px] text-white/30">{e.place.note}</p>}
            {e.mine && asList(e.people).length > 0 && (
              <p className="text-[10px] text-white/30">
                {e.mentions_sent > 0
                  ? `${e.mentions_sent} of ${e.people.length} told they're in this.`
                  : "Nobody has been told they're in this."}
              </p>
            )}

            {e.media?.image && <img src={e.media.image} alt="" className="max-h-72 rounded-lg" />}
            {e.media?.audio && <audio src={e.media.audio} controls className="w-full" />}
            {e.media?.video && <video src={e.media.video} controls className="max-h-72 w-full rounded-lg" />}
            {e.link?.url && <EmbedLink link={e.link} owner={e.author} />}

            {e.mine && (
              <div className="flex flex-wrap items-center gap-2">
                <button data-tour="journalz-share" className="re-btn !w-auto px-4 text-[12px]"
                        onClick={() => askToShare(e)} disabled={!!e.shared_post_id}>
                  <Send size={13} /> {e.shared_post_id ? " Published" : " Publish as a post"}
                </button>
                {e.shared_post_id && (
                  <button className="text-[11px] text-mcz-cyan underline"
                          onClick={() => goToSpot("postz", "feed")}>See it in PostZ</button>
                )}
              </div>
            )}
            <OpenIn entry={e} busy={!!opening} onGo={(d) => openIn(e, d)} />
          </article>
        ))}
      </div>

      {/* ---- the share quote: the price and the people, before either ----- */}
      {quote && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
             onClick={() => setQuote(null)}>
          <div className="neon-frame w-full max-w-md space-y-3 p-4" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold">Publish this entry</h3>
              <button onClick={() => setQuote(null)} className="text-white/40 hover:text-white"><XIcon size={16} /></button>
            </div>
            {quote.warn && <p className="text-[12px] text-mcz-ember">{quote.warn}</p>}
            <p className="text-[12px] text-white/60">
              Costs <Price cost={quote.cost} /> · gets you {quote.gain?.what}.
            </p>
            {asList(quote.will_notify).length > 0 ? (
              <p className="text-[12px] text-white/60">
                These members will be told, once:{" "}
                <span className="text-mcz-cyan">{quote.will_notify.map((n) => `@${n}`).join(", ")}</span>
              </p>
            ) : (
              <p className="text-[12px] text-white/45">Nobody new will be notified.</p>
            )}
            {quote.place_shared && (
              <p className="text-[12px] text-white/50">
                📍 {quote.place_shared} travels with it
                {quote.coordinates_shared
                  ? <span className="text-mcz-ember"> — including the exact coordinates.</span>
                  : " — the name only, not the pin."}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button className="re-btn !w-auto px-4 text-[12px]" onClick={() => doShare("public")}>
                🌍 Publish public
              </button>
              <button className="pill text-[12px]" onClick={() => doShare("restricted")}>
                👥 Members only
              </button>
              <button className="pill text-[12px]" onClick={() => setQuote(null)}>Keep it private</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
