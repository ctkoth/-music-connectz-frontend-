// VenueZ 🏛️ — real venues at real locations, and the two ways an artist gets
// on stage: a HOST posts a place (a bar, a theater, a studio, or just their
// own party) and picks one of two shapes for it —
//
//   * performance: visitors PAY the host to attend/perform, agreed and shown
//     up front, per work or per set;
//   * collaborative: the host PAYS visitors their skill rate to show up and
//     play, like a paid session — visitors may also owe a small cover.
//
// Distance is measured from the VENUE's own address when the host gives one
// — a real club's location, not wherever its host's account happens to sit —
// so an artist can actually find a room near them. An informal party with no
// address just doesn't carry a distance; nothing is guessed.
//
// Same five exclusive ranges as CollabZ/BattleZ gate who may join, from the
// same spec (`RangeGates`), so what a listing advertises and what the door
// enforces can't diverge.
import { useEffect, useMemo, useState } from "react";
import {
  Handshake, Loader2, Lock, MapPin, Mic2, Plus, Sparkles, Ticket, Users,
} from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { IconImg } from "../App.jsx";
import { MONEY } from "../resources.js";
import { useAuth } from "../auth/AuthContext.jsx";
import RangeGates from "../RangeGates.jsx";

const money = (cents) => `$${((Number(cents) || 0) / 100).toFixed(2)}`;

const VENUE_TYPES = [
  { id: "party", label: "Party", emoji: "🎉" },
  { id: "openmic", label: "Open mic", emoji: "🎙️" },
  { id: "theater", label: "Theater", emoji: "🎭" },
  { id: "show", label: "Show", emoji: "🎪" },
  { id: "club", label: "Club / bar", emoji: "🍸" },
  { id: "studio", label: "Studio session", emoji: "🎹" },
  { id: "festival", label: "Festival", emoji: "🎡" },
  { id: "custom", label: "Custom", emoji: "❓" },
];
const typeInfo = (id) => VENUE_TYPES.find((t) => t.id === id) || VENUE_TYPES[VENUE_TYPES.length - 1];

// Every priced skill on this member's own ProfileZ — the one real number
// available to suggest a price from. No skills priced, no chips: a made-up
// "typical door price" would be decoration, not a suggestion.
function mySkills(user) {
  const out = [];
  for (const persona of user?.personas || []) {
    for (const s of persona?.skills || []) {
      if (s?.name && s.rate_cents) out.push({ name: s.name, rate_cents: s.rate_cents });
    }
  }
  return out;
}

/** Quick-fill chips for a money field: Free, plus one per priced skill. */
function PriceChips({ skills, onPick }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] text-white/30">quick-fill:</span>
      <button type="button" className="pill !px-2 !py-0.5 !text-[10px]" onClick={() => onPick(0)}>Free</button>
      {skills.map((s) => (
        <button key={s.name} type="button" className="pill !px-2 !py-0.5 !text-[10px]"
                title={`Use your ${s.name} rate`} onClick={() => onPick(s.rate_cents / 100)}>
          {s.name} · {money(s.rate_cents)}
        </button>
      ))}
    </div>
  );
}

function ModeBadge({ mode }) {
  return mode === "collaborative" ? (
    <span className="pill !text-emerald-300 !border-emerald-400/30"><Handshake size={11} /> Collaborative</span>
  ) : (
    <span className="pill !text-mcz-cyan"><Ticket size={11} /> Performance</span>
  );
}

function VenueRow({ v, onJoin, busy }) {
  const t = typeInfo(v.vtype);
  const label = v.vtype === "custom" && v.custom_name ? v.custom_name : t.label;
  return (
    <li className="neon-frame space-y-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-white/90">
            {t.emoji} {v.title}
          </p>
          <p className="text-[10px] text-white/40">
            hosted by @{v.host} · {label}
            {v.address && <> · <MapPin size={9} className="inline" /> {v.address}</>}
            {v.distance_km != null && <> · {v.distance_km} km away</>}
          </p>
        </div>
        <ModeBadge mode={v.mode} />
      </div>

      {Object.keys(v.gates || {}).length > 0 && (
        <p className="flex items-center gap-1 text-[10px] text-white/35">
          <Lock size={10} /> Gated entry — ranges are exclusive
        </p>
      )}

      {/* Cost/gain, stated before the button that moves it. */}
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        {v.host_price_cents > 0 ? (
          <span className="font-semibold text-mcz-ember">−{money(v.host_price_cents)} {MONEY}</span>
        ) : (
          <span className="font-semibold text-emerald-300">Free to join</span>
        )}
        {v.mode === "collaborative" && v.visitor_pay_cents > 0 && (
          <span className="font-semibold text-emerald-300">+{money(v.visitor_pay_cents)} {MONEY}</span>
        )}
      </div>
      {v.mode === "collaborative" && v.visitor_pay_cents > 0 && (
        <p className="text-[10px] text-white/30">
          The payout only lands if @{v.host} has it in their wallet when you join — the cover (if any)
          leaves yours either way.
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        {v.mine ? (
          <span className="text-[11px] text-white/35">You're hosting this.</span>
        ) : v.attending ? (
          <span className="text-[11px] text-emerald-300">You're in ✓</span>
        ) : (
          <button className="re-btn !w-auto px-3 text-xs" disabled={busy} onClick={() => onJoin(v)}>
            {busy ? <Loader2 className="animate-spin" size={13} /> : <Users size={13} />} Join
          </button>
        )}
      </div>
    </li>
  );
}

export default function VenueZ() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState(null);
  const [locating, setLocating] = useState(false);
  const [gates, setGates] = useState({});
  const [form, setForm] = useState({
    title: "", mode: "performance", vtype: "party", custom_name: "",
    address: "", lat: null, lng: null, host_price: "", visitor_pay: "",
  });

  const skills = useMemo(() => mySkills(user), [user]);

  const load = () => api("/api/economy/venues/")
    .then((d) => setList(asList(d?.venues)))
    .catch((e) => { setMsg(e.message || "Couldn't load VenueZ."); setList([]); });
  useEffect(() => { load(); }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3200); };

  function locate() {
    if (!navigator.geolocation) return flash("This browser won't share a location.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: +pos.coords.latitude.toFixed(5),
          lng: +pos.coords.longitude.toFixed(5),
        }));
        setLocating(false);
        flash("Pinned — this venue can now be found by distance.");
      },
      () => { setLocating(false); flash("Couldn't get a location — the address alone still helps people find you."); },
    );
  }

  async function join(v) {
    setJoining(v.id);
    try {
      const r = await api(`/api/economy/venues/${v.id}/join/`, { method: "POST" });
      flash(r.earned_cents
        ? `You're in — +${money(r.earned_cents)} ${MONEY} landed in your wallet.`
        : "You're in.");
      load();
    } catch (e) { flash(e.message || "Couldn't join that."); }
    finally { setJoining(null); }
  }

  async function create() {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      const cents = (v) => Math.max(0, Math.round(Number(v || 0) * 100));
      const v = await api("/api/economy/venues/", {
        method: "POST",
        body: {
          title: form.title.trim(),
          mode: form.mode,
          vtype: form.vtype,
          custom_name: form.vtype === "custom" ? form.custom_name.trim() : "",
          address: form.address.trim(),
          lat: form.lat, lng: form.lng,
          host_price_cents: cents(form.host_price),
          visitor_pay_cents: form.mode === "collaborative" ? cents(form.visitor_pay) : 0,
          gates,
        },
      });
      setForm({ ...form, title: "", custom_name: "", address: "", lat: null, lng: null, host_price: "", visitor_pay: "" });
      setGates({});
      flash(`"${v.venue.title}" is live on VenueZ.`);
      load();
    } catch (e) { flash(e.message || "Couldn't publish that."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3" data-tour="venuez-list">
        <IconImg icon="venuez.png" alt="VenueZ" className="h-11 w-11 rounded-xl" />
        <div>
          <h2 className="font-display text-xl font-extrabold">VenueZ</h2>
          <p className="text-xs text-white/45">
            Real venues, real locations. Perform there and get paid to attend, or collaborate there and get paid to play.
          </p>
        </div>
      </header>

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">{msg}</p>}

      {list === null ? (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-white/45">No venues yet — post the first one below.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((v) => (
            <VenueRow key={v.id} v={v} onJoin={join} busy={joining === v.id} />
          ))}
        </ul>
      )}

      <div className="neon-frame space-y-3 p-4" data-tour="venuez-host">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/45">
          <Sparkles size={12} /> Post a venue
        </p>

        <input className="neon-input !py-2 text-xs" placeholder="Venue or event name"
               value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

        <div>
          <p className="mb-1 text-[10px] text-white/35">
            {form.mode === "performance"
              ? "Performance — visitors pay YOU to attend or take the stage."
              : "Collaborative — YOU pay visitors their rate to come play; they may still owe a cover."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`heritage-chip${form.mode === "performance" ? " sel" : ""}`}
                    onClick={() => setForm({ ...form, mode: "performance" })}>
              <Ticket size={12} /> Performance
            </button>
            <button type="button" className={`heritage-chip${form.mode === "collaborative" ? " sel" : ""}`}
                    onClick={() => setForm({ ...form, mode: "collaborative" })}>
              <Handshake size={12} /> Collaborative
            </button>
          </div>
        </div>

        <div>
          <p className="mb-1 text-[10px] text-white/35">Type</p>
          <div className="flex flex-wrap gap-2">
            {VENUE_TYPES.map((t) => (
              <button key={t.id} type="button" className={`heritage-chip${form.vtype === t.id ? " sel" : ""}`}
                      onClick={() => setForm({ ...form, vtype: t.id })}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>
        {form.vtype === "custom" && (
          <input className="neon-input !py-2 text-xs" placeholder="Name your venue type"
                 value={form.custom_name} onChange={(e) => setForm({ ...form, custom_name: e.target.value })} />
        )}

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <input className="neon-input !flex-1 !py-2 text-xs" placeholder="Address (e.g., 123 Main St, Springfield) — optional"
                   value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <button type="button" className="re-btn !w-auto px-3 text-xs" disabled={locating} onClick={locate}>
              {locating ? <Loader2 className="animate-spin" size={12} /> : <MapPin size={12} />} Pin my location
            </button>
          </div>
          <p className="text-[10px] text-white/30">
            {form.lat != null
              ? "Pinned — this venue sorts by distance for nearby artists."
              : "A real venue's address is what lets an artist find it by distance. A party at your place can skip this."}
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-white/55">
            {form.mode === "performance" ? "Price to attend / perform" : "Cover (optional — 0 is fine)"}
          </label>
          <input className="neon-input !w-32 !py-2 text-xs" inputMode="decimal" placeholder="0.00"
                 value={form.host_price} onChange={(e) => setForm({ ...form, host_price: e.target.value })} />
          <PriceChips skills={skills} onPick={(v) => setForm({ ...form, host_price: v })} />
        </div>

        {form.mode === "collaborative" && (
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-[11px] text-white/55">
              <Mic2 size={11} /> What you pay a visitor to play
            </label>
            <input className="neon-input !w-32 !py-2 text-xs" inputMode="decimal" placeholder="0.00"
                   value={form.visitor_pay} onChange={(e) => setForm({ ...form, visitor_pay: e.target.value })} />
            <PriceChips skills={skills} onPick={(v) => setForm({ ...form, visitor_pay: v })} />
          </div>
        )}

        <RangeGates value={gates} onChange={setGates} title="Who can join" />

        <button className="neon-btn-primary !w-auto px-5" onClick={create} disabled={busy || !form.title.trim()}>
          {busy ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Publish venue
        </button>
        <p className="text-[10px] text-white/35">Free to post. Nothing moves until someone joins.</p>
      </div>
    </div>
  );
}
