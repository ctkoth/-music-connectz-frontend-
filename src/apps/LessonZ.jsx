import { useCallback, useEffect, useState } from "react";
import { Clock, DollarSign, GraduationCap, Loader2, MapPin, Wifi } from "lucide-react";
import { api } from "../api.js";
import SkillZPanel from "../skillz/SkillZPanel.jsx";
import OfferMap from "./OfferMap.jsx";

const SKILLS = ["mimez", "directz", "singz", "rapz", "dawz", "designz", "shotz", "writez",
  "guitar", "piano", "vocals", "drums", "bass", "violin", "saxophone", "dj"];

export default function LessonZ() {
  const [view, setView] = useState("browse"); // browse | teach | bookings | train

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <img src="/icons/lessonz.png" alt="LessonZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div className="flex-1">
          <h2 className="font-display text-3xl font-extrabold text-mcz-gold drop-shadow-[0_0_12px_rgba(255,207,63,0.5)]">
            LessonZ
          </h2>
          <p className="text-sm text-white/60">
            Learn from 6★+ creators — platform skillz or instruments (guitar, piano, vocals…). Unlock recorded posts (all ages) or book live in person, remote, or over CallZ if you're StatZ (adults).
          </p>
          <span className="pill mt-1 inline-block">Teaching &amp; live 1:1 — adults only · Lesson posts — all ages</span>
        </div>
      </header>

      <div className="flex gap-2">
        {[["posts", "Lesson posts"], ["browse", "Live lessons"], ["teach", "Teach"], ["bookings", "My bookings"], ["train", "SkillZ"]].map(
          ([k, label]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                view === k ? "bg-white/10 text-white shadow-neon" : "text-white/55 hover:bg-white/5"
              }`}
            >
              {label}
            </button>
          )
        )}
      </div>

      {view === "posts" && <Posts />}
      {view === "browse" && <Browse />}
      {view === "teach" && (<div className="space-y-5"><Teach /><PostForm /></div>)}
      {view === "bookings" && <Bookings />}
      {view === "train" && <SkillZPanel basePath="/api/lessonz" accent="#ffcf3f" />}
    </div>
  );
}

/* ---------------------------------------------------------------- Browse */
function Browse() {
  const [filters, setFilters] = useState({ skill: "", max_price: "", max_km: "", remote: false });
  const [coords, setCoords] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [hours, setHours] = useState({});
  const [methods, setMethods] = useState({});
  const [showMap, setShowMap] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const p = new URLSearchParams();
      if (filters.skill) p.set("skill", filters.skill);
      if (filters.max_price) p.set("max_price", filters.max_price);
      if (filters.remote) p.set("remote", "1");
      if (coords && filters.max_km) {
        p.set("lat", coords.lat);
        p.set("lng", coords.lng);
        p.set("max_km", filters.max_km);
      }
      setOffers(await api(`/api/lessonz/offers/?${p.toString()}`));
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, coords]);

  useEffect(() => {
    search();
  }, []); // initial load

  function useMyLocation() {
    if (!navigator.geolocation) return setMsg("Geolocation not available on this device.");
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) }),
      () => setMsg("Couldn't get your location — distance filter disabled.")
    );
  }

  async function book(offer) {
    setMsg("");
    try {
      const body = { offer: offer.id, pricing_mode: offer.pricing_mode };
      if (offer.pricing_mode === "per_hour") body.hours = hours[offer.id] || "1";
      body.method = methods[offer.id] || (offer.in_person_ok ? "in_person" : offer.remote_ok ? "remote" : "callz");
      const b = await api("/api/lessonz/bookings/", { method: "POST", body });
      setMsg(`Requested "${offer.title}" — total $${b.agreed_total}. Waiting on the teacher.`);
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="neon-frame grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
        <select className="neon-input" value={filters.skill} onChange={(e) => setFilters({ ...filters, skill: e.target.value })}>
          <option value="">All skillz</option>
          {SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="neon-input" placeholder="Max $" inputMode="decimal" value={filters.max_price}
               onChange={(e) => setFilters({ ...filters, max_price: e.target.value })} />
        <input className="neon-input" placeholder="Within km" inputMode="numeric" value={filters.max_km}
               onChange={(e) => setFilters({ ...filters, max_km: e.target.value })} />
        <button className="neon-btn-ghost" onClick={useMyLocation}>
          <MapPin size={16} /> {coords ? "Located ✓" : "Near me"}
        </button>
        <button className="neon-btn-primary" onClick={search}>Search</button>
        <button className="neon-btn-ghost" onClick={() => setShowMap(!showMap)}>
          {showMap ? "List view" : "🗺️ Map view"}
        </button>
      </div>

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">{msg}</p>}
      {showMap && <OfferMap offers={offers} center={coords ? [Number(coords.lat), Number(coords.lng)] : null} />}
      {loading && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Searching…</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {offers.map((o) => (
          <div key={o.id} className="neon-frame space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{o.title}</p>
                <p className="text-xs text-white/55">
                  {o.teacher_username} · <span className="uppercase">{o.skill}</span> · {o.rating_snapshot}★
                </p>
              </div>
              <span className="pill whitespace-nowrap">
                <DollarSign size={11} className="mr-0.5 inline" />
                {o.price} {o.pricing_mode === "per_hour" ? "/hr" : "/lesson"}
              </span>
            </div>
            {o.description && <p className="text-sm text-white/60">{o.description}</p>}
            <p className="flex flex-wrap gap-2 text-xs text-white/45">
              {o.city && <span><MapPin size={11} className="mr-0.5 inline" />{o.city}</span>}
              {o.distance_km != null && <span>{o.distance_km} km away</span>}
              {o.remote_ok && <span><Wifi size={11} className="mr-0.5 inline" />Remote OK</span>}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <select
                className="neon-input !w-auto !py-2 text-xs"
                value={methods[o.id] || (o.in_person_ok ? "in_person" : o.remote_ok ? "remote" : "callz")}
                onChange={(e) => setMethods({ ...methods, [o.id]: e.target.value })}
              >
                {o.in_person_ok && <option value="in_person">In person</option>}
                {o.remote_ok && <option value="remote">Remote</option>}
                {o.callz_ok && <option value="callz">CallZ (StatZ)</option>}
              </select>
              {o.pricing_mode === "per_hour" && (
                <input className="neon-input !w-20 !py-2 text-center" inputMode="decimal"
                       value={hours[o.id] || "1"} onChange={(e) => setHours({ ...hours, [o.id]: e.target.value })} />
              )}
              <button className="neon-btn-primary !w-auto flex-1 px-4 py-2 text-xs" onClick={() => book(o)}>
                <GraduationCap size={14} /> Book {o.pricing_mode === "per_hour" ? `${hours[o.id] || 1}h` : "lesson"}
              </button>
            </div>
          </div>
        ))}
        {!loading && offers.length === 0 && (
          <p className="text-sm text-white/45">No lessons match — widen the filters or be the first to teach.</p>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Teach */
function Teach() {
  const [form, setForm] = useState({
    skill: "guitar", title: "", description: "", pricing_mode: "per_hour",
    price: "25.00", city: "", remote_ok: true, in_person_ok: true, callz_ok: false,
  });
  const [elig, setElig] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  useEffect(() => {
    let on = true;
    api(`/api/lessonz/eligibility/?skill=${form.skill}`)
      .then((d) => on && setElig(d))
      .catch(() => on && setElig(null));
    return () => { on = false; };
  }, [form.skill]);

  async function publish() {
    setBusy(true);
    setMsg("");
    try {
      const body = { ...form };
      if (navigator.geolocation) {
        await new Promise((res) =>
          navigator.geolocation.getCurrentPosition(
            (pos) => { body.latitude = pos.coords.latitude; body.longitude = pos.coords.longitude; res(); },
            () => res()
          )
        );
      }
      await api("/api/lessonz/offers/", { method: "POST", body });
      setMsg("Offer published! Students can now find and book you.");
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="neon-frame space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Teach one of your skillz</h3>
        {elig && (
          <span className={`pill ${elig.can_teach ? "!text-emerald-300" : "!text-mcz-pink"}`}>
            {form.skill}: {elig.rating}★ {elig.can_teach ? "· eligible" : `· need ${elig.min_required}★`}
          </span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input list="lessonz-skills" className="neon-input" placeholder="Skill (e.g. guitar, mimez…)"
               value={form.skill} onChange={set("skill")} />
        <datalist id="lessonz-skills">
          {SKILLS.map((s) => <option key={s} value={s} />)}
        </datalist>
        <input className="neon-input" placeholder="Lesson title" value={form.title} onChange={set("title")} />
        <select className="neon-input" value={form.pricing_mode} onChange={set("pricing_mode")}>
          <option value="per_hour">Per hour</option>
          <option value="per_lesson">Per lesson</option>
        </select>
        <input className="neon-input" placeholder="Price (USD)" inputMode="decimal" value={form.price} onChange={set("price")} />
        <input className="neon-input sm:col-span-2" placeholder="City (for distance search)" value={form.city} onChange={set("city")} />
        <textarea className="neon-input sm:col-span-2" rows={3} placeholder="What you'll cover…" value={form.description} onChange={set("description")} />
      </div>
      <div className="flex gap-4 text-sm text-white/70">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.remote_ok} onChange={set("remote_ok")} /> Remote OK</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.in_person_ok} onChange={set("in_person_ok")} /> In person OK</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.callz_ok} onChange={set("callz_ok")} /> CallZ (StatZ only)</label>
      </div>
      {msg && <p className="text-sm text-mcz-gold">{msg}</p>}
      <button className="neon-btn-primary" disabled={busy || (elig && !elig.can_teach)} onClick={publish}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : null} Publish offer
      </button>
      <p className="text-xs text-white/40">
        You set the price; students pay it. You never pay a student. Rating 6★+ required per skill.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- Bookings */
function Bookings() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api("/api/lessonz/bookings/").then(setData).catch((e) => setMsg(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(id, action) {
    setMsg("");
    try {
      await api(`/api/lessonz/bookings/${id}/${action}/`, { method: "POST", body: {} });
      load();
    } catch (e) {
      setMsg(e.message);
    }
  }

  if (!data) return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>;

  const Section = ({ title, rows, teacher }) => (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">{title}</h3>
      <div className="neon-frame divide-y divide-white/5">
        {rows.length === 0 && <p className="p-4 text-sm text-white/45">Nothing here yet.</p>}
        {rows.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{b.offer_title}</p>
              <p className="text-xs text-white/50">
                {teacher ? `Student: ${b.student_username}` : `Teacher: ${b.teacher_username}`} ·{" "}
                <Clock size={11} className="inline" /> {b.pricing_mode === "per_hour" ? `${b.hours}h` : "1 lesson"} ·{" "}
                ${b.agreed_total} · <span className="uppercase">{b.status}</span>
              </p>
            </div>
            <div className="flex gap-2">
              {teacher && b.status === "requested" && (
                <>
                  <button className="neon-btn-primary !w-auto px-3 py-1.5 text-xs" onClick={() => act(b.id, "accept")}>Accept</button>
                  <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs" onClick={() => act(b.id, "decline")}>Decline</button>
                </>
              )}
              {teacher && b.status === "accepted" && (
                <button className="neon-btn-primary !w-auto px-3 py-1.5 text-xs" onClick={() => act(b.id, "complete")}>Complete & charge</button>
              )}
              {!teacher && ["requested", "accepted"].includes(b.status) && (
                <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs" onClick={() => act(b.id, "cancel")}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {msg && <p className="text-sm text-mcz-pink">{msg}</p>}
      <Section title="Teaching (you get paid)" rows={data.as_teacher} teacher />
      <Section title="Learning (you pay)" rows={data.as_student} />
    </div>
  );
}


/* ----------------------------------------------------------------- Posts */
function Posts() {
  const [skill, setSkill] = useState("");
  const [posts, setPosts] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setMsg("");
    try {
      const p = new URLSearchParams();
      if (skill) p.set("skill", skill);
      setPosts(await api(`/api/lessonz/posts/?${p.toString()}`));
    } catch (e) { setMsg(e.message); } finally { setLoading(false); }
  }, [skill]);
  useEffect(() => { load(); }, [load]);

  async function unlock(post) {
    setMsg("");
    try {
      const updated = await api(`/api/lessonz/posts/${post.id}/unlock/`, { method: "POST", body: {} });
      setPosts((ps) => ps.map((x) => (x.id === post.id ? updated : x)));
      setMsg(`Unlocked "${post.title}" — $${post.price} to ${post.teacher_username}.`);
    } catch (e) { setMsg(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="neon-frame flex gap-3 p-4">
        <select className="neon-input" value={skill} onChange={(e) => setSkill(e.target.value)}>
          <option value="">All skillz</option>
          {SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="neon-btn-primary !w-auto px-5" onClick={load}>Refresh</button>
      </div>
      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">{msg}</p>}
      {showMap && <OfferMap offers={offers} center={coords ? [Number(coords.lat), Number(coords.lng)] : null} />}
      {loading && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {posts.map((p) => (
          <div key={p.id} className="neon-frame space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="text-xs text-white/55">{p.teacher_username} · <span className="uppercase">{p.skill}</span> · {p.rating_snapshot}★ · {p.visibility}</p>
              </div>
              <span className="pill whitespace-nowrap"><DollarSign size={11} className="mr-0.5 inline" />{p.price}</span>
            </div>
            {p.description && <p className="text-sm text-white/60">{p.description}</p>}
            {p.unlocked ? (
              <p className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
                Unlocked · media: {p.media_ref || "(attach in upload pipeline)"}
              </p>
            ) : (
              <button className="neon-btn-primary !w-auto px-4 py-2 text-xs" onClick={() => unlock(p)}>
                <GraduationCap size={14} /> Unlock for ${p.price}
              </button>
            )}
          </div>
        ))}
        {!loading && posts.length === 0 && <p className="text-sm text-white/45">No lesson posts visible to you yet.</p>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- PostForm */
function PostForm() {
  const [form, setForm] = useState({ skill: "mimez", title: "", description: "", price: "5.00", visibility: "public", media_ref: "", preview_ref: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function publish() {
    setBusy(true); setMsg("");
    try {
      await api("/api/lessonz/posts/", { method: "POST", body: form });
      setMsg("Lesson post published!");
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="neon-frame space-y-3 p-5">
      <h3 className="font-semibold">Post a recorded lesson</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <select className="neon-input" value={form.skill} onChange={set("skill")}>
          {SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="neon-input" placeholder="Title" value={form.title} onChange={set("title")} />
        <input className="neon-input" placeholder="Price (USD)" inputMode="decimal" value={form.price} onChange={set("price")} />
        <select className="neon-input" value={form.visibility} onChange={set("visibility")}>
          <option value="public">Public — anyone</option>
          <option value="premium">Premium tier</option>
          <option value="statz">StatZ tier</option>
          <option value="private">Only me</option>
        </select>
        <input className="neon-input" placeholder="Media ref (upload id)" value={form.media_ref} onChange={set("media_ref")} />
        <input className="neon-input" placeholder="Preview ref (optional)" value={form.preview_ref} onChange={set("preview_ref")} />
        <textarea className="neon-input sm:col-span-2" rows={2} placeholder="What students will learn…" value={form.description} onChange={set("description")} />
      </div>
      {msg && <p className="text-sm text-mcz-gold">{msg}</p>}
      <button className="neon-btn-primary" disabled={busy} onClick={publish}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : null} Publish lesson post
      </button>
      <p className="text-xs text-white/40">Visible to whoever your visibility allows; they pay your price to unlock. All ages can learn — only verified adults with 6★+ can teach.</p>
    </div>
  );
}
