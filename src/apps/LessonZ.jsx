import LoadGate from "../components/LoadGate.jsx";
import { goToSpot } from "../goto.js";
import Empty from "../components/Empty.jsx";
import { useCallback, useEffect, useState } from "react";
import { Clock, DollarSign, GraduationCap, Loader2, MapPin, Wifi, AlertCircle, Pencil, EyeOff, Eye } from "lucide-react";
import { api } from "../api.js";
import { useSay } from "../voice.js";
import { P } from "../phrases.js";
import SkillZPanel from "../skillz/SkillZPanel.jsx";
import OfferMap from "./OfferMap.jsx";
import RangeGates from "../RangeGates.jsx";
import { asList } from "../shape.js";
import MentionText from "../MentionParser.jsx";
import { seed, remember } from "../remember.js";

const SKILLS = ["mimez", "directz", "singz", "rapz", "dawz", "designz", "shotz", "writez",
  "guitar", "piano", "vocals", "drums", "bass", "violin", "saxophone", "dj"];

function validatePrice(price) {
  const p = parseFloat(price);
  if (!price || p <= 0) return "Price must be greater than $0";
  return null;
}

function validateHours(hours) {
  const h = parseFloat(hours);
  if (!hours || h <= 0) return "Hours must be greater than 0";
  if (h > 24) return "Hours must be 24 or less";
  return null;
}

function validateTitle(title) {
  if (!title || !title.trim()) return "Title is required";
  if (title.trim().length > 140) return "Title must be 140 characters or less";
  return null;
}

function validateSkill(skill) {
  if (!skill || !skill.trim()) return "Skill is required";
  return null;
}

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

      {/* Five tabs, 172px past the edge at 320px — the last two were simply
          unreachable on a small phone. */}
      <div className="flex flex-wrap gap-2">
        {[["posts", "Lesson posts"], ["browse", "Live lessons"], ["teach", "Teach"], ["bookings", "My bookings"], ["train", "SkillZ"]].map(
          ([k, label]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`pill !px-4 !py-2 !text-sm font-semibold transition ${
                view === k ? "pill-on" : "hover:text-white"
              }`}
            >
              {label}
            </button>
          )
        )}
      </div>

      {view === "posts" && <Posts />}
      {view === "browse" && <Browse setView={setView} />}
      {view === "teach" && (<div className="space-y-5"><MyListings /><Teach /><PostForm /></div>)}
      {view === "bookings" && <Bookings />}
      {view === "train" && <SkillZPanel basePath="/api/lessonz" accent="#ffcf3f" />}
    </div>
  );
}

/* ---------------------------------------------------------------- Browse */
function Browse({ setView }) {
  const [filters, setFilters] = useState({ skill: "", max_price: "", max_km: "", remote: false });
  const [coords, setCoords] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [gated, setGated] = useState(false);
  const [hours, setHours] = useState({});
  const [methods, setMethods] = useState({});
  const [showMap, setShowMap] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [tier, setTier] = useState("free");

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
      setOffers(asList(await api(`/api/lessonz/offers/?${p.toString()}`)));
    } catch (e) {
      if (e.status === 403) setGated(true);
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, coords]);

  useEffect(() => {
    search();
  }, []); // initial load

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const w = await api("/api/economy/wallet/");
        if (on) setWallet(w.wallet);
      } catch (e) {
        if (on) setMsg(`Couldn't load wallet balance: ${e.message}`);
      } finally {
        if (on) setWalletLoading(false);
      }
    })();
    return () => { on = false; };
  }, []);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const limits = await api("/api/economy/limits/");
        if (on) setTier(limits.tier || "free");
      } catch (e) {
        // tier fetch failed, default to free
        if (on) setTier("free");
      }
    })();
    return () => { on = false; };
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) return setMsg("Geolocation not available on this device.");
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) }),
      () => setMsg("Couldn't get your location — distance filter disabled.")
    );
  }

  async function book(offer) {
    setMsg("");
    const method = methods[offer.id] || (offer.in_person_ok ? "in_person" : offer.remote_ok ? "remote" : "callz");
    if (method === "callz" && tier !== "statz") {
      setMsg("CallZ lessons are StatZ-exclusive. Upgrade to StatZ to book over CallZ.");
      return;
    }
    if (offer.pricing_mode === "per_hour") {
      const hoursErr = validateHours(hours[offer.id] || "1");
      if (hoursErr) {
        setMsg(hoursErr);
        return;
      }
    }
    const cost = offer.pricing_mode === "per_hour"
      ? parseFloat(offer.price) * parseFloat(hours[offer.id] || "1")
      : parseFloat(offer.price);
    if (wallet && wallet.money_cents && parseFloat(wallet.money_cents) / 100 < cost) {
      setMsg(`Insufficient balance. You have 💵 $${(wallet.money_cents / 100).toFixed(2)}, need 💵 $${cost.toFixed(2)}.`);
      return;
    }
    try {
      const body = { offer: offer.id, pricing_mode: offer.pricing_mode };
      if (offer.pricing_mode === "per_hour") body.hours = hours[offer.id] || "1";
      body.method = methods[offer.id] || (offer.in_person_ok ? "in_person" : offer.remote_ok ? "remote" : "callz");
      const b = await api("/api/lessonz/bookings/", { method: "POST", body });
      const dur = offer.pricing_mode === "per_hour" ? `${b.hours || 1}h` : "1 lesson";
      setMsg(`Requested "${offer.title}" (${dur}) from @${offer.teacher_username}. −💵 $${b.agreed_total} held in escrow. Waiting on teacher to confirm.`);
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="neon-frame grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
        <select aria-label="Skill" className="neon-input" value={filters.skill} onChange={(e) => setFilters({ ...filters, skill: e.target.value })}>
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
      {gated && (
        <button className="neon-btn-primary !w-auto px-5" onClick={() => goToSpot("profilez", "verify-18")}>Verify I'm 18+ in ProfileZ →</button>
      )}
      {wallet && (
        <div className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70">
          Your balance: <span className="text-emerald-300">💵 ${(wallet.money_cents / 100).toFixed(2)}</span>
        </div>
      )}
      {!walletLoading && !wallet && <p className="text-sm text-white/45">Couldn't load wallet balance.</p>}
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
            {o.description && <p className="text-sm text-white/60"><MentionText text={o.description} /></p>}
            <p className="flex flex-wrap gap-2 text-xs text-white/45">
              {o.city && <span><MapPin size={11} className="mr-0.5 inline" />{o.city}</span>}
              {o.distance_km != null && <span>{o.distance_km} km away</span>}
              {o.remote_ok && <span><Wifi size={11} className="mr-0.5 inline" />Remote OK</span>}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <select aria-label="How the lesson happens" data-memo="own"
                className="neon-input !w-auto !py-2 text-xs"
                value={methods[o.id] || (o.in_person_ok ? "in_person" : o.remote_ok ? "remote" : "callz")}
                onChange={(e) => setMethods({ ...methods, [o.id]: e.target.value })}
              >
                {o.in_person_ok && <option value="in_person">In person</option>}
                {o.remote_ok && <option value="remote">Remote</option>}
                {o.callz_ok && (
                  <option value="callz" disabled={tier !== "statz"}>
                    CallZ {tier === "statz" ? "" : "(StatZ only)"}
                  </option>
                )}
              </select>
              {o.callz_ok && tier !== "statz" && (
                <span className="text-xs text-mcz-gold inline-flex items-center gap-1" title="Upgrade to StatZ to use CallZ">
                  ⭐ StatZ
                </span>
              )}
              {o.pricing_mode === "per_hour" && (
                <input className="neon-input !w-20 !py-2 text-center" inputMode="decimal"
                       value={hours[o.id] || "1"} onChange={(e) => setHours({ ...hours, [o.id]: e.target.value })} />
              )}
              <button className="neon-btn-primary !w-auto flex-1 px-4 py-2 text-xs" onClick={() => book(o)}>
                <GraduationCap size={14} /> −💵 ${o.pricing_mode === "per_hour" ? (o.price * (hours[o.id] || 1)).toFixed(2) : o.price}
              </button>
            </div>
          </div>
        ))}
        {!loading && !gated && offers.length === 0 && (
          <Empty text="No lessons match — widen the filters, or be the first to teach one." action="Teach a lesson" onAction={() => setView?.("teach")} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ MyListings */
// A teacher could publish an offer or a lesson post and never see it again
// — there was no detail route at all, so a price typo or wanting to stop
// teaching a skill meant nothing could be done short of asking for a
// database edit by hand. This is the first screen that shows what's
// actually published, live or unpublished, with a way to fix or pull it.
function MyListings() {
  const [offers, setOffers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, p] = await Promise.all([
        api("/api/lessonz/offers/?mine=1"),
        api("/api/lessonz/posts/?mine=1"),
      ]);
      setOffers(asList(o));
      setPosts(asList(p));
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading what you've published…</p>;
  if (!offers.length && !posts.length) return null;

  return (
    <div className="neon-frame space-y-4 p-5">
      <h3 className="font-semibold">What you've published</h3>
      {msg && <p className="text-sm text-mcz-pink">{msg}</p>}
      {offers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Live lesson offers</p>
          {offers.map((o) => <OfferRow key={o.id} offer={o} onChanged={load} />)}
        </div>
      )}
      {posts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Recorded lesson posts</p>
          {posts.map((p) => <PostRow key={p.id} post={p} onChanged={load} />)}
        </div>
      )}
    </div>
  );
}

// The listing's public link (/l/<id>). A published listing only; anybody can open it,
// it shows the city and never the exact location, and booking still needs an account.
// The server does not serve an under-18 teacher's listing publicly, so neither do we.
function ShareLesson({ id, title }) {
  const [said, setSaid] = useState("");
  async function share() {
    const url = `${window.location.origin}/l/${id}`;
    try {
      if (navigator.share) { await navigator.share({ title, url }); setSaid("Shared."); return; }
      await navigator.clipboard.writeText(url); setSaid("Link copied.");
    } catch (e) { if (e?.name !== "AbortError") setSaid(url); }
  }
  return (
    <button className="re-btn !w-auto px-2.5 py-1 text-[11px]" onClick={share}
            title="Anyone with the link can see this listing (city, never your exact location). Not available for teachers under 18.">
      {said || "Share"}
    </button>
  );
}

function OfferRow({ offer, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function startEdit() {
    setDraft({
      title: offer.title, description: offer.description, pricing_mode: offer.pricing_mode,
      price: String(offer.price), city: offer.city || "",
      remote_ok: offer.remote_ok, in_person_ok: offer.in_person_ok, callz_ok: offer.callz_ok,
    });
    setMsg("");
    setEditing(true);
  }

  async function save() {
    setBusy(true); setMsg("");
    try {
      await api(`/api/lessonz/offers/${offer.id}/`, { method: "PATCH", body: draft });
      setEditing(false);
      onChanged();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  async function toggleActive() {
    setBusy(true); setMsg("");
    try {
      if (offer.is_active) await api(`/api/lessonz/offers/${offer.id}/`, { method: "DELETE" });
      else await api(`/api/lessonz/offers/${offer.id}/`, { method: "PATCH", body: { is_active: true } });
      onChanged();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  return (
    <div className={`rounded-lg border border-white/10 bg-white/[0.03] p-3 ${!offer.is_active ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">
            {offer.title} {!offer.is_active && <span className="pill ml-1 !text-white/50">unpublished</span>}
          </p>
          <p className="text-xs text-white/55">
            <span className="uppercase">{offer.skill}</span> · ${offer.price} {offer.pricing_mode === "per_hour" ? "/hr" : "/lesson"}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button className="re-btn !w-auto px-2.5 py-1 text-[11px]" disabled={busy} onClick={startEdit}>
            <Pencil size={12} /> Edit
          </button>
          <button className="re-btn !w-auto px-2.5 py-1 text-[11px]" disabled={busy} onClick={toggleActive}>
            {offer.is_active ? <><EyeOff size={12} /> Unpublish</> : <><Eye size={12} /> Republish</>}
          </button>
          {offer.is_active && <ShareLesson id={offer.id} title={offer.title} />}
        </div>
      </div>
      {msg && <p className="mt-1 text-xs text-mcz-pink">{msg}</p>}
      {editing && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <input className="neon-input !py-2 text-xs" placeholder="Lesson title"
                 value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <textarea className="neon-input !py-2 text-xs" rows={2} placeholder="What you'll cover…"
                    value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Pricing mode" className="neon-input !py-2 text-xs" value={draft.pricing_mode}
                    onChange={(e) => setDraft({ ...draft, pricing_mode: e.target.value })}>
              <option value="per_hour">Per hour</option>
              <option value="per_lesson">Per lesson</option>
            </select>
            <input className="neon-input !py-2 text-xs" placeholder="Price (USD)" inputMode="decimal"
                   value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          </div>
          <input className="neon-input !py-2 text-xs" placeholder="City (for distance search)"
                 value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
          <div className="flex gap-4 text-xs text-white/70">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={draft.remote_ok}
                     onChange={(e) => setDraft({ ...draft, remote_ok: e.target.checked })} /> Remote OK
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={draft.in_person_ok}
                     onChange={(e) => setDraft({ ...draft, in_person_ok: e.target.checked })} /> In person OK
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={draft.callz_ok}
                     onChange={(e) => setDraft({ ...draft, callz_ok: e.target.checked })} /> CallZ (StatZ only)
            </label>
          </div>
          {/* Skill isn't offered here — the rating that let this publish was
              checked for THIS skill, and a booking already made froze its
              own total, so none of the above touches what a student
              already agreed to pay. */}
          <div className="flex gap-2">
            <button className="neon-btn-primary !w-auto px-4 py-1.5 text-xs" disabled={busy} onClick={save}>Save</button>
            <button className="re-btn !w-auto px-4 py-1.5 text-xs" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PostRow({ post, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function startEdit() {
    setDraft({
      title: post.title, description: post.description, price: String(post.price),
      visibility: post.visibility,
    });
    setMsg("");
    setEditing(true);
  }

  async function save() {
    setBusy(true); setMsg("");
    try {
      await api(`/api/lessonz/posts/${post.id}/`, { method: "PATCH", body: draft });
      setEditing(false);
      onChanged();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  async function toggleActive() {
    setBusy(true); setMsg("");
    try {
      if (post.is_active) await api(`/api/lessonz/posts/${post.id}/`, { method: "DELETE" });
      else await api(`/api/lessonz/posts/${post.id}/`, { method: "PATCH", body: { is_active: true } });
      onChanged();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  return (
    <div className={`rounded-lg border border-white/10 bg-white/[0.03] p-3 ${!post.is_active ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">
            {post.title} {!post.is_active && <span className="pill ml-1 !text-white/50">unpublished</span>}
          </p>
          <p className="text-xs text-white/55">
            <span className="uppercase">{post.skill}</span> · ${post.price} · {post.visibility || "public"}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button className="re-btn !w-auto px-2.5 py-1 text-[11px]" disabled={busy} onClick={startEdit}>
            <Pencil size={12} /> Edit
          </button>
          <button className="re-btn !w-auto px-2.5 py-1 text-[11px]" disabled={busy} onClick={toggleActive}>
            {post.is_active ? <><EyeOff size={12} /> Unpublish</> : <><Eye size={12} /> Republish</>}
          </button>
        </div>
      </div>
      {msg && <p className="mt-1 text-xs text-mcz-pink">{msg}</p>}
      {editing && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <input className="neon-input !py-2 text-xs" placeholder="Title"
                 value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <textarea className="neon-input !py-2 text-xs" rows={2} placeholder="What students will learn…"
                    value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="neon-input !py-2 text-xs" placeholder="Price (USD)" inputMode="decimal"
                   value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
            <select aria-label="Who can see this lesson" className="neon-input !py-2 text-xs" value={draft.visibility}
                    onChange={(e) => setDraft({ ...draft, visibility: e.target.value })}>
              <option value="public">Public — anyone</option>
              <option value="premium">Premium tier</option>
              <option value="statz">StatZ tier</option>
              <option value="private">Only me</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="neon-btn-primary !w-auto px-4 py-1.5 text-xs" disabled={busy} onClick={save}>Save</button>
            <button className="re-btn !w-auto px-4 py-1.5 text-xs" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Teach */
function Teach() {
  const talk = useSay();
  const [form, setForm] = useState(() => seed("lessonz", {
    skill: "guitar", title: "", description: "", pricing_mode: "per_hour",
    price: "25.00", city: "", remote_ok: true, in_person_ok: true, callz_ok: false,
  }, ["skill", "pricing_mode", "price", "city"]));
  const [elig, setElig] = useState(null);
  const [gates, setGates] = useState({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (["skill", "pricing_mode", "price", "city"].includes(k)) remember(`lessonz.${k}`, val);
    setForm({ ...form, [k]: val });
    setErrors({ ...errors, [k]: null });
  };

  useEffect(() => {
    let on = true;
    api(`/api/lessonz/eligibility/?skill=${form.skill}`)
      .then((d) => on && setElig(d))
      .catch(() => on && setElig(null));
    return () => { on = false; };
  }, [form.skill]);

  async function publish() {
    const errs = {};
    const skillErr = validateSkill(form.skill);
    if (skillErr) errs.skill = skillErr;
    const titleErr = validateTitle(form.title);
    if (titleErr) errs.title = titleErr;
    const priceErr = validatePrice(form.price);
    if (priceErr) errs.price = priceErr;

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setBusy(true);
    setMsg("");
    setErrors({});
    try {
      const body = { ...form, gates };
      if (navigator.geolocation) {
        await new Promise((res) =>
          navigator.geolocation.getCurrentPosition(
            (pos) => { body.latitude = pos.coords.latitude; body.longitude = pos.coords.longitude; res(); },
            () => res()
          )
        );
      }
      await api("/api/lessonz/offers/", { method: "POST", body });
      setMsg(talk(P.lesson_offer_published));
      setForm({ skill: "guitar", title: "", description: "", pricing_mode: "per_hour", price: "25.00", city: "", remote_ok: true, in_person_ok: true, callz_ok: false });
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="neon-frame space-y-3 p-5" data-tour="lessonz-teach">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Teach one of your skillz</h3>
        {elig && (
          <span className={`pill ${elig.can_teach ? "!text-emerald-300" : "!text-mcz-pink"}`}>
            {form.skill}: {elig.rating}★ {elig.can_teach ? "· eligible" : `· need ${elig.min_required}★`}
          </span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <input list="lessonz-skills" className={`neon-input ${errors.skill ? "border-mcz-pink" : ""}`} placeholder="Skill (e.g. guitar, mimez…)"
                 value={form.skill} onChange={set("skill")} />
          {errors.skill && <p className="text-xs text-mcz-pink mt-1"><AlertCircle size={12} className="inline mr-1" />{errors.skill}</p>}
          <datalist id="lessonz-skills">
            {SKILLS.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div>
          <input className={`neon-input ${errors.title ? "border-mcz-pink" : ""}`} placeholder="Lesson title" value={form.title} onChange={set("title")} />
          {errors.title && <p className="text-xs text-mcz-pink mt-1"><AlertCircle size={12} className="inline mr-1" />{errors.title}</p>}
        </div>
        <select aria-label="Pricing" data-memo="own" className="neon-input" value={form.pricing_mode} onChange={set("pricing_mode")}>
          <option value="per_hour">Per hour</option>
          <option value="per_lesson">Per lesson</option>
        </select>
        <div>
          <input className={`neon-input ${errors.price ? "border-mcz-pink" : ""}`} placeholder="Price (USD)" inputMode="decimal" value={form.price} onChange={set("price")} />
          {errors.price && <p className="text-xs text-mcz-pink mt-1"><AlertCircle size={12} className="inline mr-1" />{errors.price}</p>}
        </div>
        <input className="neon-input sm:col-span-2" placeholder="City (for distance search)" value={form.city} onChange={set("city")} />
        <textarea className="neon-input sm:col-span-2" rows={3} placeholder="What you'll cover…" value={form.description} onChange={set("description")} />
      </div>
      <div className="flex gap-4 text-sm text-white/70">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.remote_ok} onChange={set("remote_ok")} /> Remote OK</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.in_person_ok} onChange={set("in_person_ok")} /> In person OK</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.callz_ok} onChange={set("callz_ok")} /> CallZ (StatZ only)</label>
      </div>
      <RangeGates value={gates} onChange={setGates} title="Who can book this lesson" />
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

  const [loadErr, setLoadErr] = useState("");
  const load = useCallback(() => {
    api("/api/lessonz/bookings/").then((d) => { setData(d); setLoadErr(""); })
      .catch((e) => setLoadErr(e.message || "Your bookings didn't load."));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(id, action) {
    setMsg("");
    try {
      const b = await api(`/api/lessonz/bookings/${id}/${action}/`, { method: "POST", body: {} });
      if (action === "accept") {
        setMsg(`Accepted booking with @${b.student_username} for "${b.offer_title}". Mark complete when done.`);
      } else if (action === "complete") {
        setMsg(`Completed! +💵 $${b.agreed_total} charged to student and sent to you.`);
      } else if (action === "decline") {
        setMsg(`Declined — student will be notified and refunded.`);
      } else if (action === "cancel") {
        setMsg(`Cancelled — money refunded.`);
      }
      load();
    } catch (e) {
      setMsg(e.message);
    }
  }

  if (!data) return <LoadGate error={loadErr} what="your bookings" onRetry={() => { setLoadErr(""); load(); }} />;

  const Section = ({ title, rows, teacher }) => (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">{title}</h3>
      <div className="neon-frame divide-y divide-white/5">
        {rows.length === 0 && (
          <Empty className="p-4" text={teacher ? "Nobody has booked you yet." : "No bookings yet."}
                 action={teacher ? "Offer a lesson" : "Find a lesson"}
                 onAction={() => goToSpot("lessonz", teacher ? "lessonz-teach" : "")} />
        )}
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
  const [wallet, setWallet] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setMsg("");
    try {
      const p = new URLSearchParams();
      if (skill) p.set("skill", skill);
      setPosts(asList(await api(`/api/lessonz/posts/?${p.toString()}`)));
    } catch (e) { setMsg(e.message); } finally { setLoading(false); }
  }, [skill]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const w = await api("/api/economy/wallet/");
        if (on) setWallet(w.wallet);
      } catch (e) {
        // wallet fetch failed, silently continue
        if (on) setWallet(null);
      }
    })();
    return () => { on = false; };
  }, []);

  async function unlock(post) {
    setMsg("");
    if (wallet && wallet.money_cents && parseFloat(wallet.money_cents) / 100 < parseFloat(post.price)) {
      setMsg(`Insufficient balance. You have 💵 $${(wallet.money_cents / 100).toFixed(2)}, need 💵 $${parseFloat(post.price).toFixed(2)}.`);
      return;
    }
    try {
      const updated = await api(`/api/lessonz/posts/${post.id}/unlock/`, { method: "POST", body: {} });
      setPosts((ps) => ps.map((x) => (x.id === post.id ? updated : x)));
      setMsg(`Unlocked "${post.title}". −💵 $${post.price} from you, +💵 $${post.price} to @${post.teacher_username}.`);
    } catch (e) { setMsg(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="neon-frame flex gap-3 p-4">
        <select aria-label="Skill" className="neon-input" value={skill} onChange={(e) => setSkill(e.target.value)}>
          <option value="">All skillz</option>
          {SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="neon-btn-primary !w-auto px-5" onClick={load}>Refresh</button>
      </div>
      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">{msg}</p>}
      {wallet && (
        <div className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70">
          Your balance: <span className="text-emerald-300">💵 ${(wallet.money_cents / 100).toFixed(2)}</span>
        </div>
      )}
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
            {p.description && <p className="text-sm text-white/60"><MentionText text={p.description} /></p>}
            {p.unlocked ? (
              <p className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
                Unlocked · media: {p.media_ref || "(attach in upload pipeline)"}
              </p>
            ) : (
              <button className="neon-btn-primary !w-auto px-4 py-2 text-xs" onClick={() => unlock(p)}>
                <GraduationCap size={14} /> −💵 ${p.price}
              </button>
            )}
          </div>
        ))}
        {!loading && posts.length === 0 && <Empty text="No lesson posts visible to you yet." action="Post a recorded lesson" onAction={() => goToSpot("lessonz", "lessonz-teach")} />}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- PostForm */
function PostForm() {
  const talk = useSay();
  const [form, setForm] = useState(() => seed("lessonz.post", { skill: "mimez", title: "", description: "", price: "5.00", visibility: "public", media_ref: "", preview_ref: "" }, ["skill", "price"]));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => {
    if (k === "skill" || k === "price") remember(`lessonz.post.${k}`, e.target.value);
    setForm({ ...form, [k]: e.target.value });
    setErrors({ ...errors, [k]: null });
  };

  async function publish() {
    const errs = {};
    const titleErr = validateTitle(form.title);
    if (titleErr) errs.title = titleErr;
    const priceErr = validatePrice(form.price);
    if (priceErr) errs.price = priceErr;
    const mediaErr = !form.media_ref || !form.media_ref.trim() ? "Media ref (upload id) is required" : null;
    if (mediaErr) errs.media_ref = mediaErr;

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setBusy(true); setMsg(""); setErrors({});
    try {
      await api("/api/lessonz/posts/", { method: "POST", body: form });
      setMsg(talk(P.lesson_post_published));
      setForm({ skill: "mimez", title: "", description: "", price: "5.00", visibility: "public", media_ref: "", preview_ref: "" });
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="neon-frame space-y-3 p-5">
      <h3 className="font-semibold">Post a recorded lesson</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <select aria-label="Skill" className="neon-input" value={form.skill} onChange={set("skill")}>
          {SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div>
          <input className={`neon-input ${errors.title ? "border-mcz-pink" : ""}`} placeholder="Title" value={form.title} onChange={set("title")} />
          {errors.title && <p className="text-xs text-mcz-pink mt-1"><AlertCircle size={12} className="inline mr-1" />{errors.title}</p>}
        </div>
        <div>
          <input className={`neon-input ${errors.price ? "border-mcz-pink" : ""}`} placeholder="Price (USD)" inputMode="decimal" value={form.price} onChange={set("price")} />
          {errors.price && <p className="text-xs text-mcz-pink mt-1"><AlertCircle size={12} className="inline mr-1" />{errors.price}</p>}
        </div>
        <select aria-label="Who can see this lesson" className="neon-input" value={form.visibility} onChange={set("visibility")}>
          <option value="public">Public — anyone</option>
          <option value="premium">Premium tier</option>
          <option value="statz">StatZ tier</option>
          <option value="private">Only me</option>
        </select>
        <p className="text-xs text-white/40 sm:col-span-2">
          {{
            public: "Anyone who can open LessonZ can see this lesson.",
            premium: "Members on Premium or StatZ can see this lesson.",
            statz: "Only members on StatZ can see this lesson.",
            private: "Only you can see this lesson.",
          }[form.visibility] || ""}
          {" "}Whoever can see it pays your price to unlock.
        </p>
        <div>
          <input className={`neon-input ${errors.media_ref ? "border-mcz-pink" : ""}`} placeholder="Media ref (upload id)" value={form.media_ref} onChange={set("media_ref")} title="The media file ID from your upload (audio/video)" />
          {errors.media_ref && <p className="text-xs text-mcz-pink mt-1"><AlertCircle size={12} className="inline mr-1" />{errors.media_ref}</p>}
          {!errors.media_ref && <p className="text-xs text-white/40 mt-1">The uploaded audio or video file ID</p>}
        </div>
        <div>
          <input className="neon-input" placeholder="Preview ref (optional)" value={form.preview_ref} onChange={set("preview_ref")} title="The thumbnail/preview image ID from your upload" />
          <p className="text-xs text-white/40 mt-1">Thumbnail image to show before unlock</p>
        </div>
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
