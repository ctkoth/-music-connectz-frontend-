import { useCallback, useEffect, useState } from "react";
import { Handshake, Loader2, MapPin } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import OfferMap from "./OfferMap.jsx";

const KINDS = [["", "All"], ["original", "OriginalZ ✍️"], ["cover", "CoverZ 🎵"], ["remix", "RemixeZ 🎛️"]];
const ROLES = ["indieartist","producer","mixengineer","ghostwriter","videographer","designer","director","manager","arscout"];

export default function CollabZ() {
  const [kind, setKind] = useState("");
  const [posts, setPosts] = useState([]);
  const [coords, setCoords] = useState(null);
  const [maxKm, setMaxKm] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ kind: "original", title: "", description: "", skill: "", city: "", remote_ok: true, roles: [] });

  const load = useCallback(async () => {
    setLoading(true); setMsg("");
    try {
      const p = new URLSearchParams();
      if (kind) p.set("kind", kind);
      if (coords && maxKm) { p.set("lat", coords.lat); p.set("lng", coords.lng); p.set("max_km", maxKm); }
      setPosts(await api(`/api/collabz/?${p.toString()}`));
    } catch (e) { setMsg(e.message); } finally { setLoading(false); }
  }, [kind, coords, maxKm]);
  useEffect(() => { load(); }, [load]);

  function nearMe() {
    if (!navigator.geolocation) return setMsg("No geolocation on this device.");
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) }),
      () => setMsg("Couldn't get location."));
  }
  async function interest(p) {
    try {
      const u = await api(`/api/collabz/${p.id}/interest/`, { method: "POST", body: {} });
      setPosts((ps) => ps.map((x) => (x.id === p.id ? u : x)));
    } catch (e) { setMsg(e.message); }
  }
  async function publish() {
    setMsg("");
    try {
      const body = { ...form, roles_needed: form.roles };
      if (navigator.geolocation) {
        await new Promise((res) => navigator.geolocation.getCurrentPosition(
          (pos) => { body.latitude = pos.coords.latitude; body.longitude = pos.coords.longitude; res(); }, () => res()));
      }
      await api("/api/collabz/", { method: "POST", body });
      setForm({ ...form, title: "", description: "" });
      setMsg("Collab posted — the map has it now."); load();
    } catch (e) { setMsg(e.message); }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="collabz.png" alt="CollabZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#facc15" }}>CollabZ</h2>
          <p className="text-sm text-white/60">Collaborate locally / globally — OriginalZ, CoverZ, RemixeZ.</p>
        </div>
      </header>

      <div className="neon-frame flex flex-wrap items-center gap-2 p-4">
        {KINDS.map(([k, label]) => (
          <button key={k} onClick={() => setKind(k)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${kind === k ? "bg-white/10 shadow-neon" : "text-white/55 hover:bg-white/5"}`}>
            {label}
          </button>
        ))}
        <input className="neon-input !w-24 !py-2" placeholder="km" inputMode="numeric" value={maxKm} onChange={(e) => setMaxKm(e.target.value)} />
        <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs" onClick={nearMe}><MapPin size={14} /> {coords ? "Located ✓" : "Near me"}</button>
        <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs" onClick={() => setShowMap(!showMap)}>{showMap ? "List" : "🗺️ Map"}</button>
      </div>

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">{msg}</p>}
      {showMap && <OfferMap offers={posts} center={coords ? [Number(coords.lat), Number(coords.lng)] : null} />}
      {loading && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {posts.map((p) => (
          <div key={p.id} className="neon-frame space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="text-xs text-white/55">{p.author} · {p.kind}{p.skill && <> · <span className="uppercase">{p.skill}</span></>}</p>
              </div>
              {p.distance_km != null && <span className="pill">{p.distance_km} km</span>}
            </div>
            {p.description && <p className="text-sm text-white/60">{p.description}</p>}
            {p.roles_needed?.length > 0 && (
              <p className="flex flex-wrap gap-1">{p.roles_needed.map((r) => <span key={r} className="pill text-[10px]">{r}</span>)}</p>
            )}
            <button className={`neon-btn-primary !w-auto px-4 py-2 text-xs ${p.i_am_interested ? "opacity-60" : ""}`} onClick={() => interest(p)}>
              <Handshake size={14} /> {p.i_am_interested ? `Interested ✓ (${p.interested_count})` : `I'm in (${p.interested_count})`}
            </button>
          </div>
        ))}
        {!loading && posts.length === 0 && <p className="text-sm text-white/45">No collabs match — post the first one below.</p>}
      </div>

      <div className="neon-frame space-y-3 p-5">
        <h3 className="font-semibold">Post a collab</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="neon-input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            <option value="original">OriginalZ ✍️</option><option value="cover">CoverZ 🎵</option><option value="remix">RemixeZ 🎛️</option>
          </select>
          <input className="neon-input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="neon-input" placeholder="Skill (optional)" value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} />
          <input className="neon-input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <textarea className="neon-input sm:col-span-2" rows={2} placeholder="What are we making?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <p className="flex flex-wrap gap-1">
          {ROLES.map((r) => (
            <button key={r} onClick={() => setForm({ ...form, roles: form.roles.includes(r) ? form.roles.filter((x) => x !== r) : [...form.roles, r] })}
              className={`pill text-[10px] ${form.roles.includes(r) ? "!border-mcz-gold/60 !text-mcz-gold" : ""}`}>{r}</button>
          ))}
        </p>
        <button className="neon-btn-primary !w-auto px-6" onClick={publish}>Post collab</button>
      </div>
    </div>
  );
}
