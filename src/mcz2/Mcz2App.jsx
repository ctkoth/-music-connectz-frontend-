import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { AppStateProvider, useAppState, dataThemeFor } from "./AppState.jsx";
import { CATALOG, APPS_BY_KEY } from "./catalog.js";
import { accentStyle, accentOptionsFor } from "./colors.js";
import { REGIONS } from "./heritage.js";
import { MUSCLE_GROUPS, EQUIPMENT, LOCATIONS, EXERCISES, isAvailable, availableEquipment } from "./bodiez.js";
import { SIGNS, zodiacFor, dailyReading } from "./zodiac.js";
import { GAME_GENRES, SEED_GAMES, subgenresFor, genreEmoji, langsForTier } from "./gamez.js";
import { AI_MODELS, CALLABLE_USERS, AI_UNIT_SECONDS, USER_UNIT_SECONDS, callCost, fmtDuration } from "./callz.js";
import { DAWS } from "./dawz.js";
import { devTaxFor, splitTransaction, money, mbLabel, TIER_PRICING } from "./economy.js";
import { LimitsProvider, useLimits } from "./LimitsContext.jsx";
import {
  isSignedIn, getWallet, addFundsApi, setTierApi,
  getSpecZApi, buySpecZApi, getRoyaltiesApi, cashoutRoyaltiesApi,
  getUploadsApi, uploadFileApi, deleteUploadApi,
  getCheckoutConfig, createStripeCheckout, createPaypalOrder, capturePaypalOrder,
  getVenuesApi, createVenueApi, joinVenueApi,
  getAttractivenessApi, setAttractivenessOptInApi,
  getFacezApi, createFaceApi, rateFaceApi, deleteFaceApi,
  saveProfileApi, searchMembersApi, getMemberApi,
  getMerchApi, createMerchApi, buyMerchApi, deleteMerchApi,
} from "./economyApi.js";
import { IMAGE_TYPES, VIDEO_TYPES, MIX_MODES, MIX_TARGETS, MIX_EXTRAS, INSTR_GENRES, INSTR_INSTRUMENTS, KEYS, occTierFor, DOC_TYPES, INTEL_APPS } from "./intelligence.js";
import "./mcz2.css";

// Transparent transaction breakdown — RepostExchange-style: plain numbers,
// the developer-tax cut always shown, and the bold total the user pays.
function CostBreakdown({ amount, tier, recipient = "Recipient", payLabel = "You pay" }) {
  const { gross, dev, net, rate, label } = splitTransaction(amount, tier);
  if (!gross) return null;
  return (
    <div className="txn">
      <div className="txn-row"><span>Amount</span><span>{money(gross)}</span></div>
      <div className="txn-row txn-tax"><span>Developer tax · {label} {Math.round(rate * 100)}%</span><span>−{money(dev)}</span></div>
      <div className="txn-row"><span>{recipient} receives</span><span>{money(net)}</span></div>
      <div className="txn-total"><span>{payLabel}</span><span>{money(gross)}</span></div>
    </div>
  );
}

// Textarea that enforces the active tier's character cap and shows a live
// counter. The cap comes from LimitsContext (backend /api/economy/limits/ when
// live, local TIER_LIMITS otherwise) — the same limit the server enforces.
function CappedTextarea({ value, onChange, ...rest }) {
  const { char_limit, tier } = useLimits();
  const len = (value || "").length;
  const near = char_limit && len >= char_limit * 0.9;
  const atLimit = char_limit && len >= char_limit;
  const canUpgrade = (tier || "free") !== "statz";
  return (
    <>
      <textarea value={value} onChange={onChange} maxLength={char_limit || undefined} {...rest} />
      {char_limit ? (
        <div className="char-count" style={{ fontSize: 10, display: "flex", justifyContent: "space-between", color: near ? "var(--gold, #ffcf3f)" : "var(--text-light)", marginTop: 2 }}>
          <span>{atLimit && canUpgrade ? "🔒 Limit reached — upgrade for more" : near && canUpgrade ? "Almost at your limit" : ""}</span>
          <span>{len.toLocaleString()} / {char_limit.toLocaleString()}</span>
        </div>
      ) : null}
    </>
  );
}

// Readout of the active tier's caps, sourced from LimitsContext.
function TierLimitsCard() {
  const { char_limit, upload_mb, storage_mb, storage_used_mb, tier, live } = useLimits();
  return (
    <div className="card">
      <div className="card-header">
        <span>📦 Tier Limits</span>
        <span className="tag" style={live ? { color: "var(--success)" } : undefined}>{tier || "free"} · {live ? "● live" : "offline"}</span>
      </div>
      <div className="skill-item"><span className="skill-item-name">✍️ Text / prompt length</span><span className="skill-item-exp">{Number(char_limit).toLocaleString()} chars</span></div>
      <div className="skill-item"><span className="skill-item-name">⬆️ Max upload size</span><span className="skill-item-exp">{mbLabel(upload_mb)}</span></div>
      <div className="skill-item"><span className="skill-item-name">💾 Storage</span><span className="skill-item-exp">{storage_used_mb != null ? `${mbLabel(storage_used_mb)} / ` : ""}{mbLabel(storage_mb)}</span></div>
      <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>Caps are enforced server-side; text inputs cut off at your character limit. Upgrade for higher limits.</p>
    </div>
  );
}

// Derive the public, searchable profile payload from local AppState.
function buildProfilePayload(state) {
  const u = state.user || {};
  const nats = u.nationalities || [];
  const regions = REGIONS.filter((r) => nats.includes(r.any) || (r.countries || []).some((c) => nats.includes(c))).map((r) => r.name);
  const subs = u.substances || {};
  const declared = Object.values(subs).filter(Boolean);
  const sober = declared.length > 0 && !Object.values(subs).includes("use");
  const z = zodiacFor(u.birthday);
  const pref = u.preferences || {};
  return {
    display_name: u.name || "",
    bio: u.bio || "",
    location: u.location || "",
    gender: u.gender || "",
    birthday: u.birthday || "",
    sign: z ? z.name : "",
    nationalities: nats,
    regions,
    substances: subs,
    sober,
    attracted_to: pref.partnerGenders || (pref.partnerGender ? [pref.partnerGender] : []),
    asexual: !!pref.asexual,
    traits: pref.traits || [],
    personas: (state.personas || []).map((p) => ({ name: p.name, emoji: p.emoji, skills: p.skills || [] })),
  };
}

// Flashes a "✓ Saved" confirmation when auto-saving edits (metrics pages).
function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  const ping = () => { setSaved(true); setTimeout(() => setSaved(false), 1400); };
  return [saved, ping];
}
function SavedFlash({ saved }) {
  return <span className="tag" style={{ color: saved ? "var(--success)" : "var(--text-light)", transition: "color .2s" }}>{saved ? "✓ Saved" : "Auto-saves"}</span>;
}

// Shared gate: business personas (Manager / A&R Scout / Label) unlock legal
// tooling like contracts and royalty agreements.
function isBizPersona(personas) {
  return (personas || []).some((p) => /manager|a&r|scout|label/i.test(p.name || ""));
}

// Upgrade call-to-action button — drops the member straight into MembershipZ
// from any locked feature. Every upgrade prompt should pair its 🔒 copy with this.
function UpgradeCTA({ onOpen, label = "👑 Upgrade", to = "membership", style }) {
  return (
    <button className="btn" style={{ marginTop: 8, ...style }} onClick={() => onOpen?.(to)}>{label}</button>
  );
}

// Disclaimer shown on any AI-generated or platform legal document.
function LegalDisclaimer() {
  return (
    <p style={{ fontSize: 10, color: "var(--gold, #ffcf3f)", marginTop: 8, lineHeight: 1.4 }}>
      ⚖️ Draft for convenience only — not legal advice. AI/template documents can miss
      jurisdiction-specific terms. Have a qualified attorney review before anyone signs.
    </p>
  );
}

// Self-declared, filterable matching metrics (NationalitieZ / SubstanceZ / PreferenceZ).
const SUBSTANCES = [
  { key: "cigarettes", name: "Cigarettes", emoji: "🚬" },
  { key: "caffeine", name: "Caffeine", emoji: "☕" },
  { key: "alcohol", name: "Alcohol", emoji: "🍺" },
  { key: "thc", name: "THC", emoji: "🌿" },
  { key: "heroin", name: "Heroin", emoji: "💉" },
  { key: "crack", name: "Crack", emoji: "🪨" },
  { key: "meth", name: "Meth", emoji: "💎" },
  { key: "dxm", name: "DXM", emoji: "🧪" },
  { key: "adderall", name: "Adderall", emoji: "💊" },
  { key: "opioids", name: "Opioids", emoji: "⚕️" },
  { key: "benzos", name: "Benzos", emoji: "😴" },
];
const STANCES = [
  { id: "use", label: "Use", dot: "🟢" },
  { id: "sometimes", label: "Sometimes", dot: "🟡" },
  { id: "sober", label: "Sober", dot: "🔴" },
  { id: "avoid", label: "Prefer sober", dot: "🚫" },
];
const PARTNER_GENDERS = [
  { id: "male", label: "Male", emoji: "♂️" },
  { id: "female", label: "Female", emoji: "♀️" },
  { id: "neutral", label: "Non-Binary", emoji: "⚧️" },
];
const TRAITS = ["Honesty", "Trust", "Communication", "Energy", "Connection", "Creativity", "Ambition", "Humor"];

// Notification preferences by app-group. `rec` marks Corey's recommended-on set
// (marketing, posts, collabs, battles) so a member can one-tap the sensible baseline.
const NOTIF_GROUPS = [
  { key: "notif_connect", label: "🤝 ConnectZ — collabs, messages, follows", rec: true },
  { key: "notif_compete", label: "⚔️ CompeteZ — BattleZ & RateZ results", rec: true },
  { key: "notif_posts", label: "🎵 PostZ — shares, ratings, comments", rec: true },
  { key: "notif_marketing", label: "📣 Marketing — drops, tips & offers", rec: true },
  { key: "notif_money", label: "💰 MoneyZ — payments, royalties, cashouts", rec: false },
  { key: "notif_intel", label: "🧠 IntelligenceZ — AI jobs & exports", rec: false },
];

const SETTING_TOGGLES = [
  { key: "notifications", label: "🔔 Push Notifications" },
  { key: "collabAlerts", label: "🤝 Collab Alerts" },
  { key: "paymentAlerts", label: "💰 Payment Alerts" },
  { key: "emailDigest", label: "📧 Email Digest" },
  { key: "shareLocation", label: "📍 Share Location" },
  { key: "privateMode", label: "🔒 Private Mode" },
  { key: "soundEffects", label: "🔊 Sound Effects" },
  { key: "vibration", label: "📳 Vibration" },
];

// ---- PickConnectZ usage + pins (localStorage, shared convention) ----
const USAGE_KEY = "mcz_app_usage";
const PINS_KEY = "mcz_pinned_apps";
const AI_PICK_COUNT = 5;
const readStore = (k) => {
  try { return JSON.parse(localStorage.getItem(k)); } catch { return null; }
};
const writeStore = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
};
// PickConnectZ pin allowance (blueprint): Free pins 2, the rest AI-populated;
// Premium and StatZ pin unlimited.
function tierInfo(tier) {
  const t = (tier || "").toLowerCase();
  if (t.includes("statz") || t.includes("stats")) return { label: "StatZ", limit: Infinity };
  if (t.includes("premium") || t.includes("pro")) return { label: "Premium", limit: Infinity };
  return { label: "Free", limit: 2 };
}

const TOP_APPS = CATALOG.flatMap((g) => g.apps);

// ---- Functional pages ----
function SetupPage() {
  const { state, updateUser } = useAppState();
  const [form, setForm] = useState(state.user);
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setSaved(false); };
  const zsign = zodiacFor(form.birthday);
  const save = () => { updateUser(form); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  return (
    <div className="card">
      <div className="card-header">👤 Your Profile</div>
      <div className="form-group"><label>Username</label><input value={form.name} onChange={set("name")} placeholder="Your name" /></div>
      <div className="grid-2">
        <div className="form-group"><label>📧 Email</label><input type="email" value={form.email} onChange={set("email")} /></div>
        <div className="form-group"><label>📱 Phone</label><input value={form.phone} onChange={set("phone")} /></div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label>🎂 Birthday {zsign && <span style={{ color: "var(--accent, #22e6ff)" }}>· {zsign.emoji} {zsign.name}</span>}</label>
          <input type="date" value={form.birthday} onChange={set("birthday")} />
        </div>
        <div className="form-group"><label>⚧️ Gender</label>
          <select value={form.gender} onChange={set("gender")}>
            <option value="">Select</option>
            <option value="Male">🚹 Male ♂️</option>
            <option value="Female">🚺 Female ♀️</option>
            <option value="Non-Binary">⚧️ Non-Binary</option>
          </select>
        </div>
      </div>
      <div className="form-group"><label>📍 Location</label><input value={form.location} onChange={set("location")} placeholder="City, State or Zip" /></div>
      <div className="form-group"><label>📝 Bio</label><CappedTextarea value={form.bio} onChange={set("bio")} style={{ height: 60 }} /></div>
      <button className="btn btn-success" style={{ width: "100%" }} onClick={save}>{saved ? "✅ Profile saved!" : "💾 Save Profile"}</button>
      {saved && <p style={{ fontSize: 11, color: "var(--success)", textAlign: "center", marginTop: 6 }}>Your profile &amp; filters are saved.</p>}
    </div>
  );
}

const PERSONA_CHOICES = [
  { name: "Independent Artist", emoji: "🎤", icon: "personaz_indieartist.png" },
  { name: "Beat Producer", emoji: "🎚️", icon: "personaz_producer.png" },
  { name: "Mix Engineer", emoji: "🎛️", icon: "personaz_mixengineer.png" },
  { name: "Designer", emoji: "🎨", icon: "personaz_designer.png" },
  { name: "Videographer", emoji: "🎬", icon: "personaz_videographer.png" },
  { name: "Manager", emoji: "🕴🏼", icon: "personaz_manager.png" },
  { name: "A&R Scout", emoji: "🔎", icon: "personaz_arscout.png" },
  { name: "Ghostwriter", emoji: "👻", icon: "personaz_ghostwriter.png" },
  { name: "Developer", emoji: "👾", icon: "personaz_developer.png" },
  { name: "Mime", emoji: "🤹", icon: "mimez.png" },
];

// Available skills per persona — the user picks which they've got.
const PERSONA_SKILLS = {
  "Independent Artist": ["Songwriting", "Vocals", "Stage Presence", "Freestyle", "Melody", "Performance", "Branding"],
  "Beat Producer": ["Drum Programming", "Sound Design", "Sampling", "Arrangement", "Melody", "Genre Range"],
  "Mix Engineer": ["EQ", "Compression", "Vocal Tuning", "Mastering", "Stereo Imaging", "Noise Reduction"],
  "Designer": ["Composition & Layout", "Color Theory", "Typography", "Brand Identity", "Software Mastery", "UI/UX Prototyping", "Visual Storytelling", "Asset Production"],
  "Videographer": ["Cinematography", "Camera Operation", "Lighting Techniques", "Audio Capture", "Video Editing", "Motion Graphics", "Storyboarding", "Social Optimization", "Music Video Production"],
  "Manager": ["Strategic Planning", "Team Leadership", "Communication", "Conflict Resolution", "Project Management", "Decision-Making", "Performance Tracking", "Resource Management"],
  "A&R Scout": ["Talent Spotting", "Market Trends", "Networking", "Deal Structuring", "Genre Expertise", "Analytics"],
  "Ghostwriter": ["Lyricism", "Storytelling", "Rhyme Schemes", "Hook Writing", "Tone Matching", "Multi-Genre"],
  "Developer": ["Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Swift", "Kotlin"],
  "Mime": ["Lipsync", "Selfie", "Dance", "Drama", "Comedy"],
};
function PersonasPage() {
  const { state, addTo, removeFrom, setList } = useAppState();
  const has = (name) => state.personas.some((p) => p.name === name);
  const toggleSkill = (i, skill) => setList("personas", state.personas.map((p, idx) =>
    idx === i ? { ...p, skills: (p.skills || []).includes(skill) ? p.skills.filter((s) => s !== skill) : [...(p.skills || []), skill] } : p));
  return (
    <>
      <div className="card">
        <div className="card-header">🎭 Select Your PersonaZ</div>
        <div className="grid-3">
          {PERSONA_CHOICES.map((p) => (
            <button key={p.name} className="persona-btn" disabled={has(p.name)} style={{ opacity: has(p.name) ? 0.4 : 1 }}
              onClick={() => addTo("personas", { name: p.name, emoji: p.emoji, icon: p.icon, skills: [] })}>
              {p.emoji} {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-header">🎭 Your Personas & SkillZ</div>
        {state.personas.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No personas yet — pick some above.</p>
        ) : state.personas.map((p, i) => {
          const pool = PERSONA_SKILLS[p.name] || [];
          const mine = p.skills || [];
          return (
            <div key={i} className="persona-card" style={{ marginBottom: 10 }}>
              <div className="persona-header">
                <span className="persona-name">{p.emoji} {p.name} <span style={{ fontSize: 11, color: "var(--text-light)" }}>· {mine.length}/{pool.length} skillZ</span></span>
                <button className="btn btn-danger btn-small" onClick={() => removeFrom("personas", i)}>Remove</button>
              </div>
              {pool.length > 0 && (
                <div className="chip-wrap" style={{ marginTop: 8 }}>
                  {pool.map((sk) => (
                    <button key={sk} className={`heritage-chip${mine.includes(sk) ? " sel" : ""}`} style={{ padding: "2px 8px" }} onClick={() => toggleSkill(i, sk)}>
                      {mine.includes(sk) ? "✓ " : ""}{sk}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function PostZPage() {
  const { state, addTo, removeFrom } = useAppState();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const add = () => {
    if (!title.trim()) return;
    addTo("examples", { title: title.trim(), desc: desc.trim(), at: Date.now() });
    setTitle(""); setDesc("");
  };
  return (
    <>
      <div className="card">
        <div className="card-header">🎵 Upload Work Example</div>
        <div className="form-group"><label>🎯 Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., My Latest Beat" /></div>
        <div className="form-group"><label>📝 Description</label><CappedTextarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ height: 50 }} /></div>
        <button className="btn btn-success" style={{ width: "100%" }} onClick={add}>📤 Post</button>
      </div>
      <div className="card">
        <div className="card-header">🎵 Your Work Examples</div>
        {state.examples.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No examples yet.</p>
        ) : state.examples.map((ex, i) => (
          <div key={i} className="post-card">
            <div className="post-user">{ex.title}</div>
            <div className="post-content">{ex.desc}</div>
            <button className="btn btn-danger btn-small" onClick={() => removeFrom("examples", i)}>Delete</button>
          </div>
        ))}
      </div>
    </>
  );
}

function ProfilePage({ onOpen }) {
  const { state } = useAppState();
  const u = state.user;
  const skills = state.personas.flatMap((p) => p.skills || []);
  const zsign = zodiacFor(u.birthday);
  return (
    <div className="card">
      <div className="card-header">👤 Your Public Profile</div>
      <div style={{ textAlign: "center", padding: 14 }}>
        <div className="profile-pic" style={{ width: 64, height: 64, margin: "0 auto 8px", fontSize: 26 }}>
          {(u.name || "?").charAt(0).toUpperCase()}
        </div>
        {/* Tapping name/sign opens the user's ZodiacZ daily horoscope. */}
        <div style={{ fontWeight: 800, fontSize: 15, cursor: "pointer" }} onClick={() => onOpen?.("zodiacz")}>{u.name || "Not set"}</div>
        <div style={{ fontSize: 11, color: "var(--text-light)" }}>
          {[u.location, u.gender].filter(Boolean).join(" · ")}
          {zsign && <> {(u.location || u.gender) ? "· " : ""}<span style={{ color: "var(--accent, #22e6ff)", cursor: "pointer" }} onClick={() => onOpen?.("zodiacz")}>{zsign.emoji} {zsign.name}</span></>}
        </div>
      </div>
      <div className="form-group"><label>📝 Bio</label><div style={{ fontSize: 12 }}>{u.bio || "No bio"}</div></div>
      <div className="form-group"><label>📧 Email</label><div style={{ fontSize: 12 }}>{u.email || "No email"}</div></div>
      <div className="form-group"><label>🎭 Personas</label>
        <div>{state.personas.length ? state.personas.map((p, i) => <span key={i} className="tag">{p.emoji} {p.name}</span>) : "None yet"}</div>
      </div>
      <div className="form-group"><label>🎯 Skills</label>
        <div>{skills.length ? skills.map((s, i) => <span key={i} className="tag">{s}</span>) : "None yet"}</div>
      </div>
      <div className="form-group"><label>🌐 NationalitieZ (heritage)</label>
        <div>{(u.nationalities || []).length ? u.nationalities.map((n, i) => <span key={i} className="tag">{n}</span>) : "Not set"}</div>
      </div>
      <div className="form-group"><label>🧠 SubstanceZ</label>
        <div>{Object.entries(u.substances || {}).filter(([, v]) => v).length
          ? Object.entries(u.substances).filter(([, v]) => v).map(([k, v]) => <span key={k} className="tag">{k}: {v}</span>)
          : "Not set"}</div>
      </div>
      <div className="form-group"><label>💞 PreferenceZ (attracted to)</label>
        <div>{(() => {
          const g = u.preferences?.partnerGenders || (u.preferences?.partnerGender ? [u.preferences.partnerGender] : []);
          const labels = g.map((id) => PARTNER_GENDERS.find((x) => x.id === id)?.label || id);
          return labels.length ? labels.map((l) => <span key={l} className="tag">{l}</span>) : "Not set";
        })()}
          {(u.preferences?.traits || []).map((t) => <span key={t} className="tag">{t}</span>)}
        </div>
      </div>
    </div>
  );
}

function MoneyPage({ tier, serverOk, syncEconomy }) {
  const { state, update, updateWallet, addTo } = useAppState();
  const [amt, setAmt] = useState("");
  const [checkout, setCheckout] = useState(null); // { stripe_enabled, paypal_enabled, min_cents, max_cents }
  const [payBusy, setPayBusy] = useState("");     // "stripe" | "paypal" while redirecting
  const [notice, setNotice] = useState("");

  // Load which checkout providers are live.
  useEffect(() => {
    if (!serverOk) return;
    getCheckoutConfig().then(setCheckout).catch(() => setCheckout(null));
  }, [serverOk]);

  // Handle the return from a hosted checkout (Stripe/PayPal redirect back here).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("checkout");
    if (!result) return;
    const provider = params.get("provider");
    const cleanUrl = () => window.history.replaceState({}, "", window.location.pathname);
    if (result === "cancel") {
      setNotice("Checkout canceled — no charge was made.");
      cleanUrl();
      return;
    }
    if (result === "success") {
      (async () => {
        // PayPal must be captured on return; Stripe credits via webhook.
        if (provider === "paypal") {
          const token = params.get("token");
          if (token) { try { await capturePaypalOrder(token); } catch { /* may already be captured */ } }
        }
        setNotice("Payment received — your balance will update momentarily.");
        syncEconomy?.();
        setTimeout(() => syncEconomy?.(), 3000); // webhook may lag a beat
        cleanUrl();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payCents = () => Math.round((parseFloat(amt) || 0) * 100);

  const payStripe = async () => {
    const cents = payCents();
    if (cents <= 0) return;
    setPayBusy("stripe"); setNotice("");
    try {
      const r = await createStripeCheckout(cents);
      window.location.href = r.url; // hosted Stripe Checkout
    } catch (e) {
      setNotice(e.message || "Could not start Stripe checkout");
      setPayBusy("");
    }
  };

  const payPaypal = async () => {
    const cents = payCents();
    if (cents <= 0) return;
    setPayBusy("paypal"); setNotice("");
    try {
      const r = await createPaypalOrder(cents);
      if (r.approve_url) window.location.href = r.approve_url;
      else throw new Error("No approval URL returned");
    } catch (e) {
      setNotice(e.message || "Could not start PayPal checkout");
      setPayBusy("");
    }
  };

  const add = async () => {
    const v = parseFloat(amt);
    if (!v || v <= 0) return;
    if (serverOk) {
      try {
        const r = await addFundsApi(Math.round(v * 100)); // server enforces dev tax
        updateWallet({ balance: r.wallet.money, earned: Number((state.wallet.earned + (r.breakdown.net_cents / 100)).toFixed(2)) });
        update({ energy: r.wallet.energy, spinaz: r.wallet.spinaz });
        addTo("paymentHistory", { amount: r.breakdown.net_cents / 100, gross: v, dev: r.breakdown.dev_tax_cents / 100, at: Date.now(), note: "Add funds" });
        setAmt("");
        syncEconomy?.();
        return;
      } catch { /* fall through to local */ }
    }
    const { net, dev } = splitTransaction(v, tier); // local developer tax
    updateWallet({ balance: Number((state.wallet.balance + net).toFixed(2)), earned: Number((state.wallet.earned + net).toFixed(2)) });
    addTo("paymentHistory", { amount: net, gross: v, dev, at: Date.now(), note: "Add funds" });
    setAmt("");
  };
  const { rate, label } = devTaxFor(tier);
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">💳 Wallet {serverOk ? <span className="tag" style={{ color: "var(--success)" }}>● live</span> : <span className="tag">offline</span>}</div>
        <div className="balance-info">
          Balance: <strong>${Number(state.wallet.balance).toFixed(2)}</strong> &nbsp;·&nbsp; Lifetime earned: <strong>${Number(state.wallet.earned).toFixed(2)}</strong>
        </div>
        <div className="form-group"><label>Amount — {label} developer tax {Math.round(rate * 100)}%</label>
          <input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" /></div>
        <CostBreakdown amount={amt} tier={tier} recipient="Your wallet" />
        {notice && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>{notice}</p>}

        {/* Real checkout — buttons appear only for providers the backend has configured. */}
        {(checkout?.stripe_enabled || checkout?.paypal_enabled) && (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {checkout.stripe_enabled && (
              <button className="btn" style={{ flex: 1 }} disabled={!!payBusy || payCents() <= 0} onClick={payStripe}>
                {payBusy === "stripe" ? "…" : "💳 Card"}
              </button>
            )}
            {checkout.paypal_enabled && (
              <button className="btn" style={{ flex: 1, background: "#ffc439", color: "#003087" }} disabled={!!payBusy || payCents() <= 0} onClick={payPaypal}>
                {payBusy === "paypal" ? "…" : "PayPal"}
              </button>
            )}
          </div>
        )}

        <button className="btn btn-secondary btn-small" style={{ width: "100%", marginTop: 10 }} onClick={add}>➕ Dev top-up (no charge)</button>
        <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>
          {checkout?.stripe_enabled || checkout?.paypal_enabled
            ? "Card & PayPal run through hosted checkout. Every transaction shows the developer tax up front."
            : "Card/PayPal checkout activates once the payment providers are configured on the backend. Dev top-up credits instantly for testing."}
        </p>
      </div>
      <div className="card">
        <div className="card-header">🧾 Payment History</div>
        {state.paymentHistory.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No transactions yet.</p>
        ) : [...state.paymentHistory].reverse().map((p, i) => (
          <div key={i} className="skill-item">
            <span className="skill-item-name">{p.amount >= 0 ? "+" : ""}{money(p.amount)} {p.note ? `· ${p.note}` : ""}</span>
            <span className="skill-item-exp">{p.dev ? `tax ${money(p.dev)} · ` : ""}{new Date(p.at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </>
  );
}

const MEMBERSHIP_TIERS = [
  {
    id: "free", name: "Free", emoji: "🆓", icon: null, color: "var(--text-light)",
    tag: "The on-ramp",
    perks: [
      "400-character limit on bios, messages & AI prompts",
      "PickConnectZ: 2 pinned apps (rest AI-picked)",
      "OCC builds basic browser games (JS/HTML5, Python)",
      "1 custom GroupZ · standard glow color",
      "Developer tax 10% on every transaction",
      "Full access to CollabZ, BattleZ, RateZ, VenueZ, FaceZ",
    ],
  },
  {
    id: "premium", name: "Premium", emoji: "👑", icon: "tier_premium.png", color: "var(--gold, #ffcf3f)",
    tag: "For serious professionals",
    perks: [
      "1,500-character limit — say more everywhere",
      "Unlimited PickConnectZ pins",
      "OCC builds medium 2D/3D games (any engine but Unreal)",
      "5 custom GroupZ + custom group icons · 8 glow colors",
      "400MB uploads · 5GB storage",
      "LabelZ + contracts/royalty agreements",
      "Developer tax drops to 5%",
    ],
  },
  {
    id: "statz", name: "StatZ", emoji: "📈", icon: "tier_statz.png", color: "var(--cyan, #22e6ff)",
    tag: "Highest tier — for serious professionals",
    perks: [
      "5,000-character limit — the whole essay",
      "Everything in Premium, plus:",
      "SpecZ analytics marketplace + CallZ live calls",
      "Image/Video lipsync from FaceZ · Instrumental key-by-mood",
      "OCC builds advanced games in any language (incl. C++/Unreal)",
      "20 custom GroupZ · 32 glow colors · 4GB uploads · 100GB storage",
      "Lowest developer tax: 2%",
    ],
  },
];

function MembershipZPage({ tier, serverOk, onTierChange, syncEconomy, isOwner, onOpen }) {
  const cur = (tier || "").toLowerCase() === "debug" ? "debug" : devTaxFor(tier).label.toLowerCase();
  const [cycle, setCycle] = useState("monthly");
  const [msg, setMsg] = useState("");
  const choose = async (id) => {
    setMsg("");
    // Dev/preview: flip the membership live against the backend. Real recurring
    // billing wires in with Stripe subscription price IDs.
    try { const r = await setTierApi(id); onTierChange?.(r.tier); syncEconomy?.(); setMsg(`You're on ${id.toUpperCase()} now (dev preview).`); }
    catch { onTierChange?.(id); setMsg(`Switched to ${id.toUpperCase()} locally.`); }
  };
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">👑 MembershipZ</div>
        <div className="balance-info">You're on <strong>{cur.toUpperCase()}</strong>. Here's every tier, straight up — pick the one that matches your grind.</div>
        <div className="chip-wrap" style={{ marginTop: 8 }}>
          <button className={`heritage-chip${cycle === "monthly" ? " sel" : ""}`} onClick={() => setCycle("monthly")}>Monthly</button>
          <button className={`heritage-chip${cycle === "yearly" ? " sel" : ""}`} onClick={() => setCycle("yearly")}>Yearly · save ~2 months</button>
        </div>
        {msg && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>{msg}</p>}
      </div>
      {MEMBERSHIP_TIERS.map((t) => {
        const price = TIER_PRICING[t.id]?.[cycle];
        const isCur = cur === t.id;
        return (
          <div key={t.id} className="card" style={{ border: isCur ? `1px solid ${t.color}` : undefined }}>
            <div className="card-header">
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {t.icon ? <IconImg icon={t.icon} alt={t.name} style={{ width: 28, height: 28, borderRadius: 7 }} /> : <span>{t.emoji}</span>}
                <span style={{ color: t.color }}>{t.name}</span>
              </span>
              <span className="tag">{price ? `${money(price)}/${cycle === "monthly" ? "mo" : "yr"}` : "Free"}</span>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>{t.tag}</p>
            {t.perks.map((p, i) => (
              <div key={i} className="skill-item"><span className="skill-item-name" style={{ fontSize: 12 }}>✓ {p}</span></div>
            ))}
            <div style={{ marginTop: 10 }}>
              {isCur ? (
                <span className="tag" style={{ color: t.color }}>● Your current tier</span>
              ) : (
                <button className="btn" style={{ width: "100%" }} onClick={() => choose(t.id)}>
                  {t.id === "free" ? "Switch to Free" : `Upgrade to ${t.name} — ${money(price)}/${cycle === "monthly" ? "mo" : "yr"}`}
                </button>
              )}
            </div>
          </div>
        );
      })}
      <div className="card">
        <div className="card-header">🧾 All upgrade options</div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Everything you can upgrade or top up, in one place.</p>
        {[
          { emoji: "⭐", name: "Premium", price: "$10/mo · $90/yr", unlocks: "1,500-char limit · 400MB uploads / 5GB storage · LabelZ + contracts · 8 glow colors · dev tax drops to 5% · games in any language except C++", cta: "Upgrade to Premium", to: "membership" },
          { emoji: "📊", name: "StatZ", price: "$15/mo · $150/yr", unlocks: "5,000-char limit · 4GB uploads / 100GB storage · SpecZ marketplace · CallZ live calls · C++/Unreal games · dev tax drops to 2%", cta: "Upgrade to StatZ", to: "membership" },
          { emoji: "🍥", name: "SpinAZ top-up", price: "buy at 80% ($80 = 100)", unlocks: "Subscription currency — spend on spins, boosts and premium features.", cta: "Buy SpinAZ", to: "spinaz" },
          { emoji: "⚡", name: "Energy top-up", price: "buy at 80% ($80 = 100)", unlocks: "Powers ratings, comments and daily activity when you're tapped out.", cta: "Buy Energy", to: "energy" },
          { emoji: "✴️", name: "SpecZ (StatZ only)", price: "per-item", unlocks: "Audience analytics, engagement heatmaps, genre intelligence, UGC packs.", cta: "Open SpecZ", to: "specz" },
        ].map((o) => (
          <div key={o.name} className="post-card">
            <div className="post-user">{o.emoji} {o.name} <span className="tag">{o.price}</span></div>
            <div className="post-content" style={{ fontSize: 12 }}>{o.unlocks}</div>
            <button className="btn btn-small" style={{ marginTop: 6 }} onClick={() => onOpen?.(o.to)}>👑 {o.cta}</button>
          </div>
        ))}
      </div>
      {isOwner && (
        <div className="card" style={{ border: "1px solid var(--gold, #ffcf3f)" }}>
          <div className="card-header"><span style={{ color: "var(--gold, #ffcf3f)" }}>🛠️ Debug (owner)</span>{cur === "debug" ? <span className="tag" style={{ color: "var(--gold, #ffcf3f)" }}>● active</span> : <span className="tag">owner-only</span>}</div>
          <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>God-mode for the owner: 0% developer tax, unlimited character/upload/storage limits, every gate unlocked. Only your account can switch into it.</p>
          {cur === "debug"
            ? <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => choose("statz")}>Drop back to StatZ</button>
            : <button className="btn" style={{ width: "100%" }} onClick={() => choose("debug")}>🛠️ Switch to Debug</button>}
        </div>
      )}
      <div className="card">
        <div className="card-header">🧾 Refunds &amp; disputes</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          Straight up: <strong>membership and upgrades aren't refundable</strong> — they unlock features instantly, so there's nothing to give back. Wallet funds you spend on other members (CollabZ, MerchZ, VenueZ, CallZ) are real money between users; disputes and refunds on those are handled member-to-member inside CollabZ. Hit a broken feature? Don't ask for a refund — <button className="btn-link" style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0, textDecoration: "underline", font: "inherit" }} onClick={() => onOpen?.("bugz")}>submit a BugZ report</button> and we fix it (squashed bugs pay you 200 SpinAZ).
        </p>
      </div>
      <p style={{ fontSize: 10, color: "var(--text-light)", padding: "0 4px" }}>
        Upgrades flip your tier instantly for dev/preview. Recurring card billing wires in with Stripe subscriptions (needs price IDs configured on the backend).
      </p>
    </>
  );
}

function SettingsPage({ tier, serverOk, onTierChange, syncEconomy }) {
  const { state, updateSettings, toggleSetting } = useAppState();
  const { settings } = state;
  const { tier: tierLabel, colors, locked } = accentOptionsFor(tier);
  const switchTier = async (t) => {
    try { const r = await setTierApi(t); onTierChange?.(r.tier); syncEconomy?.(); } catch { /* offline */ }
  };
  return (
    <>
      {serverOk && (
        <div className="card">
          <div className="card-header"><span>🧪 Membership (dev)</span><span className="tag">live</span></div>
          <div className="chip-wrap">
            {["free", "premium", "statz"].map((t) => (
              <button key={t} className={`heritage-chip${/stat/.test(tier) && t === "statz" || /prem|pro/.test(tier) && t === "premium" || (!/stat|prem|pro/.test(tier) && t === "free") ? " sel" : ""}`} onClick={() => switchTier(t)}>{t}</button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 8 }}>Preview tier gating live against the backend. Real upgrades go through billing.</p>
        </div>
      )}
      <div className="card">
        <div className="card-header">
          <span>🎨 Tab Highlight Glow</span>
          <span className="tag">{tierLabel} · {locked ? "locked" : `${colors.length} colors`}</span>
        </div>
        {locked ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>
            🔒 Glow color customization is a <strong>Premium</strong> perk — 8 colors on Premium, 32 on StatZ.
            Upgrade to recolor your tab highlight.
          </p>
        ) : (
          <>
            <div className="swatch-grid">
              {colors.map((c) => (
                <button key={c} onClick={() => updateSettings({ accent: c })}
                  className={`swatch${settings.accent === c ? " active" : ""}`}
                  style={{ background: c, boxShadow: `0 0 10px ${c}` }} title={c} aria-label={c} />
              ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 10 }}>
              {tierLabel} unlocks {colors.length} glow colors. Toggle 🌙 / ☀️ in the header for panel depth.
            </p>
          </>
        )}
      </div>
      <TierLimitsCard />
      <div className="card">
        <div className="card-header">🔔 Preferences</div>
        {SETTING_TOGGLES.map((row) => (
          <div key={row.key} className="settings-toggle">
            <label>{row.label}</label>
            <div role="switch" aria-checked={!!settings[row.key]} onClick={() => toggleSetting(row.key)}
              className={`toggle-switch${settings[row.key] ? " active" : ""}`} />
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><span>🔔 Notifications by app group</span>
          <button className="btn btn-small btn-secondary" onClick={() => updateSettings(Object.fromEntries(NOTIF_GROUPS.map((g) => [g.key, g.rec])))}>✨ Use recommended</button>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Pick which kinds of activity ping you. My recommended set (marketing, postz, collabz, battlez) keeps you in the loop without the noise.</p>
        {NOTIF_GROUPS.map((g) => {
          const on = settings[g.key] ?? g.rec;
          return (
            <div key={g.key} className="settings-toggle">
              <label>{g.label}{g.rec && <span className="tag" style={{ marginLeft: 6 }}>recommended</span>}</label>
              <div role="switch" aria-checked={on} onClick={() => updateSettings({ [g.key]: !on })}
                className={`toggle-switch${on ? " active" : ""}`} />
            </div>
          );
        })}
      </div>
    </>
  );
}

const SKILL_KEYS = ["mimez", "directz", "lessonz", "singz", "rapz", "drumz", "violinz", "guitarz", "bassz", "keyz", "producez", "designz", "shotz", "developz", "managez", "bodiez"];

function OnboardZPage({ onOpen }) {
  const { state, update } = useAppState();
  const usage = readStore(USAGE_KEY) || {};
  const explored = Object.keys(usage).some((k) => SKILL_KEYS.includes(k));
  const steps = [
    { emoji: "👤", label: "Set up your profile", hint: "Name, contact, location, bio.", done: !!state.user.name, go: "setup" },
    { emoji: "🎭", label: "Pick a PersonaZ", hint: "Artist, Producer, Engineer, Designer…", done: state.personas.length > 0, go: "personas" },
    { emoji: "🎵", label: "Post your first work", hint: "Audio, image, or lyrics.", done: state.examples.length > 0, go: "examples" },
    { emoji: "🎓", label: "Explore a SkillZ app", hint: "Open any training app.", done: explored, go: "lessonz" },
  ];
  const done = steps.filter((s) => s.done).length;
  return (
    <div className="card">
      <div className="card-header"><span>👋 Welcome to Music ConnectZ</span><span className="tag">{done}/{steps.length}</span></div>
      <div className="ob-bar"><div className="ob-fill" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      {steps.map((s, i) => (
        <div key={i} className={`ob-step${s.done ? " done" : ""}`}>
          <span className="ob-check">{s.done ? "✓" : s.emoji}</span>
          <div style={{ flex: 1 }}>
            <div className="ob-label">{s.label}</div>
            <div className="ob-hint">{s.hint}</div>
          </div>
          {!s.done && <button className="btn btn-small" onClick={() => onOpen(s.go)}>Do it →</button>}
        </div>
      ))}
      {done === steps.length && <p style={{ fontSize: 12, color: "var(--success)", marginTop: 10 }}>🎉 You're all set — welcome aboard!</p>}
      <button className="btn btn-secondary btn-small" style={{ marginTop: 12 }} onClick={() => update({ onboardDismissed: true })}>Dismiss onboarding</button>
    </div>
  );
}

const SPECZ_ITEMS = [
  { id: "demographics", name: "Audience Demographics", emoji: "📊", price: 9.99, desc: "Age, region, and platform breakdown of a creator's audience." },
  { id: "engagement", name: "Engagement Heatmap", emoji: "🔥", price: 7.99, desc: "When and how a creator's fans interact — your best post windows." },
  { id: "genre-intel", name: "Genre Intelligence", emoji: "🎼", price: 6.99, desc: "Verified genre tags, sub-genre trends, and playlist fit." },
  { id: "collab-score", name: "Collab Compatibility", emoji: "🤝", price: 4.99, desc: "Predictive score for how well two creators' audiences overlap." },
  { id: "ugc-covers", name: "UGC: Cover Art Pack", emoji: "🖼️", price: 12.99, desc: "Licensed community cover-art bundle for your releases." },
  { id: "trending", name: "Trending Metadata Report", emoji: "📈", price: 8.99, desc: "This week's rising tags, sounds, and metadata across the platform." },
];

function SpecZPage({ tier, serverOk, syncEconomy, onOpen }) {
  const { state, updateWallet, addTo, update } = useAppState();
  const [err, setErr] = useState("");
  const isStatz = /stat[sz]/i.test(tier || "");

  // When live, pull the authoritative owned-list from the backend.
  useEffect(() => {
    if (!serverOk || !isStatz) return;
    getSpecZApi()
      .then((r) => update({ speczOwned: r.items.filter((i) => i.owned).map((i) => i.id) }))
      .catch(() => {});
  }, [serverOk, isStatz]);

  if (!isStatz) {
    return (
      <div className="card">
        <div className="card-header">✴️ SpecZ — StatZ Marketplace</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          🔒 SpecZ is a <strong>StatZ</strong>-only marketplace for purchasable user metadata &amp; UGC. Upgrade to StatZ to buy
          audience analytics, engagement data, genre intelligence, and creator content packs.
        </p>
        <UpgradeCTA onOpen={onOpen} label="👑 Upgrade to StatZ" />
      </div>
    );
  }
  const owned = state.speczOwned || [];
  const buy = async (item) => {
    if (owned.includes(item.id)) return;
    setErr("");
    if (serverOk) {
      try {
        const r = await buySpecZApi(item.id); // server deducts, records dev tax, enforces StatZ gate
        updateWallet({ balance: r.wallet.money });
        addTo("speczOwned", item.id);
        addTo("paymentHistory", { amount: -item.price, dev: r.dev_tax_cents / 100, at: Date.now(), note: `SpecZ: ${item.name}` });
        syncEconomy?.();
        return;
      } catch (e) {
        setErr(e.message || "Purchase failed");
        return; // don't silently grant the item on a server rejection
      }
    }
    if (state.wallet.balance < item.price) return;
    const { dev } = splitTransaction(item.price, tier); // local developer tax
    updateWallet({ balance: Number((state.wallet.balance - item.price).toFixed(2)) });
    addTo("speczOwned", item.id);
    addTo("paymentHistory", { amount: -item.price, dev, at: Date.now(), note: `SpecZ: ${item.name}` });
  };
  const { rate, label } = devTaxFor(tier);
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">✴️ SpecZ Marketplace {serverOk ? <span className="tag" style={{ color: "var(--success)" }}>● live</span> : <span className="tag">offline</span>}</div>
        <div className="balance-info">Purchase user metadata &amp; UGC with your wallet · Balance: <strong>${Number(state.wallet.balance).toFixed(2)}</strong> · {label} developer tax {Math.round(rate * 100)}% on every buy</div>
      </div>
      {err && <div className="card" style={{ color: "var(--danger)", fontSize: 12 }}>⚠️ {err}</div>}
      {SPECZ_ITEMS.map((item) => {
        const have = owned.includes(item.id);
        const canAfford = state.wallet.balance >= item.price;
        return (
          <div key={item.id} className="post-card">
            <div className="post-user">{item.emoji} {item.name}</div>
            <div className="post-content">{item.desc}</div>
            {!have && <CostBreakdown amount={item.price} tier={tier} recipient="Seller" payLabel="You pay" />}
            <div className="post-actions" style={{ marginTop: 8 }}>
              {have ? (
                <span className="tag" style={{ color: "var(--success)" }}>✓ Owned</span>
              ) : (
                <button className="btn btn-small" disabled={!canAfford} style={{ opacity: canAfford ? 1 : 0.5 }} onClick={() => buy(item)}>
                  {canAfford ? `Buy ${money(item.price)}` : `Need ${money(item.price)} — add funds`}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

function NationalitieZPage() {
  const { state, updateUser } = useAppState();
  const [saved, ping] = useSavedFlash();
  const picked = state.user.nationalities || [];
  const toggle = (v) => {
    const next = picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v];
    updateUser({ nationalities: next }); ping();
  };
  return (
    <>
      <div className="card">
        <div className="card-header"><span>🌐 Your Heritage</span><span style={{ display: "flex", gap: 6 }}><span className="tag">{picked.length} selected</span><SavedFlash saved={saved} /></span></div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 12 }}>
          Pick a whole continent/region if you don't know your specific country, or choose exact countries. Multi-select.
        </p>
        {REGIONS.map((r) => (
          <div key={r.name} style={{ marginBottom: 14 }}>
            <div className="modal-sub-title" style={{ marginBottom: 6 }}>{r.emoji} {r.name}</div>
            <div className="chip-wrap">
              <button className={`heritage-chip any${picked.includes(r.any) ? " sel" : ""}`} onClick={() => toggle(r.any)}>
                {r.emoji} {r.name} (anywhere)
              </button>
              {r.countries.map((c) => (
                <button key={c} className={`heritage-chip${picked.includes(c) ? " sel" : ""}`} onClick={() => toggle(c)}>{c}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SubstanceZPage() {
  const { state, updateUser } = useAppState();
  const [saved, ping] = useSavedFlash();
  const subs = state.user.substances || {};
  const setStance = (key, id) => { updateUser({ substances: { ...subs, [key]: subs[key] === id ? "" : id } }); ping(); };
  return (
    <div className="card">
      <div className="card-header"><span>🧠 SubstanceZ — Your Stance</span><SavedFlash saved={saved} /></div>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 12 }}>
        Declare your relationship with each — powers sober-friendly matching and healthy spaces.
      </p>
      {SUBSTANCES.map((s) => (
        <div key={s.key} className="settings-toggle" style={{ flexWrap: "wrap" }}>
          <label style={{ minWidth: 110 }}>{s.emoji} {s.name}</label>
          <div className="chip-wrap" style={{ justifyContent: "flex-end" }}>
            {STANCES.map((st) => (
              <button key={st.id} className={`heritage-chip${subs[s.key] === st.id ? " sel" : ""}`} onClick={() => setStance(s.key, st.id)}>
                {st.dot} {st.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PreferenceZPage() {
  const { state, updateUser } = useAppState();
  const [saved, ping] = useSavedFlash();
  const pref = state.user.preferences || {};
  // Multi-select: attracted to male / female / non-binary — any one, both, or all.
  const genders = pref.partnerGenders || (pref.partnerGender ? [pref.partnerGender] : []);
  const asexual = !!pref.asexual;
  const save = (partial) => { updateUser({ preferences: { ...pref, ...partial } }); ping(); };
  const toggleGender = (id) => {
    if (asexual) return;
    const next = genders.includes(id) ? genders.filter((x) => x !== id) : [...genders, id];
    save({ partnerGenders: next });
  };
  const toggleAsexual = () => save({ asexual: !asexual, ...(!asexual ? { partnerGenders: [] } : {}) });
  const toggleTrait = (t) => {
    const traits = pref.traits || [];
    save({ traits: traits.includes(t) ? traits.filter((x) => x !== t) : [...traits, t] });
  };
  const orientation = asexual ? "Asexual" : genders.length === 3 ? "Pansexual" : genders.length === 2 ? "Bi" : genders.length === 1 ? "" : "";
  return (
    <>
      <div className="card">
        <div className="card-header"><span>💞 Attracted To</span><SavedFlash saved={saved} /></div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 12 }}>Pick the gender(s) you're attracted to — one, both, or all. Filterable across CollabZ, VenueZ, and Social ConnectZ.</p>
        <div className="grid-3">
          {PARTNER_GENDERS.map((g) => {
            const on = genders.includes(g.id) && !asexual;
            return (
              <button key={g.id} className={`persona-btn${on ? " sel-pref" : ""}`} disabled={asexual} style={{ ...(on ? { borderColor: "var(--primary)", boxShadow: "var(--glow)" } : undefined), opacity: asexual ? 0.4 : 1 }} onClick={() => toggleGender(g.id)}>
                {on ? "✓ " : ""}{g.emoji} {g.label}
              </button>
            );
          })}
        </div>
        <button className={`persona-btn${asexual ? " sel-pref" : ""}`} style={{ width: "100%", marginTop: 8, ...(asexual ? { borderColor: "var(--primary)", boxShadow: "var(--glow)" } : {}) }} onClick={toggleAsexual}>
          {asexual ? "✓ " : ""}🤍 Asexual — not sexually attracted to any gender
        </button>
        {orientation && <p style={{ fontSize: 11, color: "var(--accent, #22e6ff)", marginTop: 8 }}>💫 Reads as <strong>{orientation}</strong>{orientation === "Pansexual" ? " — attracted to all." : orientation === "Asexual" ? "." : "."}</p>}
      </div>
      <div className="card">
        <div className="card-header"><span>✨ Traits That Matter</span><SavedFlash saved={saved} /></div>
        <div className="chip-wrap">
          {TRAITS.map((t) => (
            <button key={t} className={`heritage-chip${(pref.traits || []).includes(t) ? " sel" : ""}`} onClick={() => toggleTrait(t)}>{t}</button>
          ))}
        </div>
      </div>
    </>
  );
}

// Demo roster so the filterable metrics are visibly working in Social ConnectZ.
const DEMO_MEMBERS = [
  { name: "Kaya", gender: "female", region: "Africa", country: "Nigeria", sober: true, lookingFor: "collab", sign: "Leo" },
  { name: "Diego", gender: "male", region: "South America", country: "Colombia", sober: false, lookingFor: "romance", sign: "Scorpio" },
  { name: "Mei", gender: "female", region: "Asia", country: "Japan", sober: true, lookingFor: "collab", sign: "Virgo" },
  { name: "Luka", gender: "male", region: "Europe", country: "Croatia", sober: false, lookingFor: "collab", sign: "Aries" },
  { name: "Amara", gender: "neutral", region: "Africa", country: "Ghana", sober: true, lookingFor: "romance", sign: "Pisces" },
  { name: "Sam", gender: "male", region: "North America", country: "United States", sober: false, lookingFor: "collab", sign: "Gemini" },
];

// Toggle a value in/out of a filter array (multi-select).
function inArr(arr, v) { return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]; }

function DiscoverTab({ serverOk }) {
  const [regions, setRegions] = useState([]);
  const [genders, setGenders] = useState([]);
  const [signs, setSigns] = useState([]);
  const [subs, setSubs] = useState([]); // SubstanceZ keys wanted sober-friendly
  const [soberOnly, setSoberOnly] = useState(false);
  const [live, setLive] = useState(null); // server results, or null when offline
  const [viewing, setViewing] = useState(null); // a member profile being viewed

  // Live member search server-side when reachable; debounced on filter change.
  useEffect(() => {
    if (!serverOk) { setLive(null); return undefined; }
    const t = setTimeout(() => {
      searchMembersApi({ regions, genders, signs, substances: subs, sober: soberOnly })
        .then((r) => setLive(r.members)).catch(() => setLive(null));
    }, 300);
    return () => clearTimeout(t);
  }, [serverOk, regions, genders, signs, subs, soberOnly]);

  // Offline fallback: filter the demo roster locally.
  const demoFiltered = DEMO_MEMBERS.filter((m) =>
    (!regions.length || regions.includes(m.region)) &&
    (!genders.length || genders.includes(m.gender)) &&
    (!signs.length || signs.includes(m.sign)) &&
    (!subs.length || m.sober) &&
    (!soberOnly || m.sober),
  );
  const filtered = live !== null ? live : demoFiltered;
  const active = regions.length + genders.length + signs.length + subs.length + (soberOnly ? 1 : 0);
  const openMember = (username) => { if (username) getMemberApi(username).then(setViewing).catch(() => {}); };
  const clear = () => { setRegions([]); setGenders([]); setSigns([]); setSubs([]); setSoberOnly(false); };

  return (
    <>
      <div className="card">
        <div className="card-header"><span>🔍 Filters {active > 0 && <span className="tag">{active}</span>}</span>{active > 0 && <button className="btn btn-small btn-secondary" onClick={clear}>Clear</button>}</div>
        <p style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 8 }}>Pick as many as you want in each — combine metrics to narrow the room.</p>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>🌐 NationalitieZ (heritage)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
          {REGIONS.map((r) => <button key={r.name} className={`heritage-chip${regions.includes(r.name) ? " sel" : ""}`} onClick={() => setRegions((a) => inArr(a, r.name))}>{r.emoji} {r.name}</button>)}
        </div>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>💞 PreferenceZ (gender)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
          {PARTNER_GENDERS.map((g) => <button key={g.id} className={`heritage-chip${genders.includes(g.id) ? " sel" : ""}`} onClick={() => setGenders((a) => inArr(a, g.id))}>{g.emoji} {g.label}</button>)}
        </div>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>♌ ZodiacZ (sign)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
          {SIGNS.map((s) => <button key={s.name} className={`heritage-chip${signs.includes(s.name) ? " sel" : ""}`} onClick={() => setSigns((a) => inArr(a, s.name))}>{s.emoji} {s.name}</button>)}
        </div>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>🧠 SubstanceZ (show members sober-friendly on…)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
          {SUBSTANCES.map((s) => <button key={s.key} className={`heritage-chip${subs.includes(s.key) ? " sel" : ""}`} onClick={() => setSubs((a) => inArr(a, s.key))}>{s.emoji} {s.name}</button>)}
        </div>
        <div className="settings-toggle">
          <label>🧠 SubstanceZ — sober-friendly only (all)</label>
          <div role="switch" aria-checked={soberOnly} onClick={() => setSoberOnly((v) => !v)} className={`toggle-switch${soberOnly ? " active" : ""}`} />
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span>💼 Members {live !== null ? <span className="tag" style={{ color: "var(--success)" }}>● live</span> : <span className="tag">demo</span>}</span><span className="filter-badge">{filtered.length}</span></div>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No members match these filters.</p>
        ) : filtered.map((m) => {
          // Server members use username/display_name/regions; demo uses name/country.
          const name = m.display_name || m.name;
          const uname = m.username;
          const heritage = m.nationalities?.length ? m.nationalities.join(", ") : (m.country || (m.regions || []).join(", "));
          return (
            <div key={uname || name} className="post-card" style={uname ? { cursor: "pointer" } : undefined} onClick={() => openMember(uname)}>
              <div className="post-user">{name} {m.gender && `· ${PARTNER_GENDERS.find((g) => g.id === m.gender)?.emoji || ""}`} {m.median != null && <span className="tag" style={{ color: "var(--gold, #ffcf3f)" }}>💯 {m.median}</span>}</div>
              <div className="post-meta">🌐 {heritage || "—"} · {SIGNS.find((s) => s.name === m.sign)?.emoji} {m.sign} · {m.sober ? "🟢 sober" : "🍺 social"}{m.lookingFor ? ` · looking for ${m.lookingFor}` : ""}{uname ? " · tap to view" : ""}</div>
            </div>
          );
        })}
        <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>
          {live !== null ? "Live members — filtered server-side by their real metrics. Tap anyone to view their profile." : "Demo roster — sign-in + backend brings up real members here, filtered by their metrics."}
        </p>
      </div>

      {viewing && (
        <div className="modal" onClick={() => setViewing(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><h2>👤 {viewing.display_name || viewing.username}</h2></div>
              <button className="close-btn" onClick={() => setViewing(null)}>×</button>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 8 }}>
              @{viewing.username} {viewing.gender && `· ${PARTNER_GENDERS.find((g) => g.id === viewing.gender)?.emoji || viewing.gender}`} {viewing.sign && `· ${SIGNS.find((s) => s.name === viewing.sign)?.emoji || ""} ${viewing.sign}`} {viewing.median != null && `· 💯 ${viewing.median}`}
            </div>
            {viewing.bio && <p style={{ fontSize: 13, marginBottom: 8 }}>{viewing.bio}</p>}
            {viewing.location && <div className="skill-item"><span className="skill-item-name">📍 {viewing.location}</span></div>}
            {(viewing.nationalities || []).length > 0 && <div style={{ margin: "6px 0" }}>🌐 {viewing.nationalities.map((n) => <span key={n} className="tag">{n}</span>)}</div>}
            {(viewing.attracted_to || []).length > 0 && <div style={{ margin: "6px 0" }}>💞 Into: {viewing.attracted_to.map((a) => <span key={a} className="tag">{PARTNER_GENDERS.find((g) => g.id === a)?.label || a}</span>)}</div>}
            {viewing.asexual && <div style={{ margin: "6px 0" }}><span className="tag">🤍 Asexual</span></div>}
            {(viewing.traits || []).length > 0 && <div style={{ margin: "6px 0" }}>✨ {viewing.traits.map((t) => <span key={t} className="tag">{t}</span>)}</div>}
            {(viewing.personas || []).map((p) => (
              <div key={p.name} style={{ marginTop: 8 }}>
                <div className="modal-sub-title">{p.emoji} {p.name}</div>
                <div className="chip-wrap">{(p.skills || []).map((s) => <span key={s} className="tag">{s}</span>)}</div>
              </div>
            ))}
            <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 8 }}>Sober-friendly: {viewing.sober ? "🟢 yes" : "🍺 social"}</p>
          </div>
        </div>
      )}
    </>
  );
}

// Reusable cross-user member finder: multi-select NationalitieZ / PreferenceZ /
// ZodiacZ / SubstanceZ filters (OR within a metric, AND across metrics), live
// server search with a demo fallback. Used by CollabZ, MessageZ, and anywhere
// members pick other members. onPick(member) fires when a result is tapped.
function MemberFinder({ serverOk, onPick, actionLabel = "Select", note }) {
  const [regions, setRegions] = useState([]);
  const [genders, setGenders] = useState([]);
  const [signs, setSigns] = useState([]);
  const [subs, setSubs] = useState([]); // substance keys wanted sober-friendly
  const [live, setLive] = useState(null);

  useEffect(() => {
    if (!serverOk) { setLive(null); return undefined; }
    const t = setTimeout(() => {
      searchMembersApi({ regions, genders, signs, substances: subs })
        .then((r) => setLive(r.members)).catch(() => setLive(null));
    }, 300);
    return () => clearTimeout(t);
  }, [serverOk, regions, genders, signs, subs]);

  const demoFiltered = DEMO_MEMBERS.filter((m) =>
    (!regions.length || regions.includes(m.region)) &&
    (!genders.length || genders.includes(m.gender)) &&
    (!signs.length || signs.includes(m.sign)) &&
    (!subs.length || m.sober),
  );
  const filtered = live !== null ? live : demoFiltered;
  const active = regions.length + genders.length + signs.length + subs.length;
  const clear = () => { setRegions([]); setGenders([]); setSigns([]); setSubs([]); };

  return (
    <>
      <div className="card">
        <div className="card-header"><span>🔍 Filters {active > 0 && <span className="tag">{active}</span>}</span>{active > 0 && <button className="btn btn-small btn-secondary" onClick={clear}>Clear</button>}</div>
        {note && <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>{note}</p>}
        <p style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 8 }}>Pick as many as you want in each — combine metrics to narrow it down.</p>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>🌐 NationalitieZ (heritage)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
          {REGIONS.map((r) => <button key={r.name} className={`heritage-chip${regions.includes(r.name) ? " sel" : ""}`} onClick={() => setRegions((a) => inArr(a, r.name))}>{r.emoji} {r.name}</button>)}
        </div>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>💞 PreferenceZ (gender)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
          {PARTNER_GENDERS.map((g) => <button key={g.id} className={`heritage-chip${genders.includes(g.id) ? " sel" : ""}`} onClick={() => setGenders((a) => inArr(a, g.id))}>{g.emoji} {g.label}</button>)}
        </div>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>♌ ZodiacZ (sign)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
          {SIGNS.map((s) => <button key={s.name} className={`heritage-chip${signs.includes(s.name) ? " sel" : ""}`} onClick={() => setSigns((a) => inArr(a, s.name))}>{s.emoji} {s.name}</button>)}
        </div>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>🧠 SubstanceZ (show members sober-friendly on…)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 2px" }}>
          {SUBSTANCES.map((s) => <button key={s.key} className={`heritage-chip${subs.includes(s.key) ? " sel" : ""}`} onClick={() => setSubs((a) => inArr(a, s.key))}>{s.emoji} {s.name}</button>)}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span>💼 Members {live !== null ? <span className="tag" style={{ color: "var(--success)" }}>● live</span> : <span className="tag">demo</span>}</span><span className="filter-badge">{filtered.length}</span></div>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No members match these filters.</p>
        ) : filtered.map((m) => {
          const name = m.display_name || m.name;
          const uname = m.username;
          const heritage = m.nationalities?.length ? m.nationalities.join(", ") : (m.country || (m.regions || []).join(", "));
          return (
            <div key={uname || name} className="post-card">
              <div className="post-user">{name} {m.gender && `· ${PARTNER_GENDERS.find((g) => g.id === m.gender)?.emoji || ""}`} {m.median != null && <span className="tag" style={{ color: "var(--gold, #ffcf3f)" }}>💯 {m.median}</span>}</div>
              <div className="post-meta">🌐 {heritage || "—"} · {SIGNS.find((s) => s.name === m.sign)?.emoji} {m.sign} · {m.sober ? "🟢 sober" : "🍺 social"}</div>
              <button className="btn btn-small" style={{ marginTop: 6 }} onClick={() => onPick?.(m)}>{actionLabel}{uname ? ` · @${uname}` : name ? ` · ${name}` : ""}</button>
            </div>
          );
        })}
        <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>
          {live !== null ? "Live members — filtered server-side by their real metrics." : "Demo roster — sign-in + backend brings up real members, filtered by their metrics."}
        </p>
      </div>
    </>
  );
}

const DATE_POOL = [
  { name: "Kaya", sign: "Leo", looking: "Collab", bio: "R&B vocalist chasing a moody hook." },
  { name: "Diego", sign: "Scorpio", looking: "Romance", bio: "Reggaeton producer, night owl." },
  { name: "Mei", sign: "Virgo", looking: "Collab", bio: "Mix engineer, clean masters only." },
  { name: "Luka", sign: "Aries", looking: "Quick collab", bio: "Drill beats, fast turnarounds." },
  { name: "Amara", sign: "Pisces", looking: "Romance", bio: "Singer-songwriter, soft-focus feels." },
  { name: "Sam", sign: "Gemini", looking: "Collab", bio: "Multi-instrumentalist, two moods." },
];
function Avatar({ name }) {
  return <div className="post-avatar">{name.charAt(0).toUpperCase()}</div>;
}

function VibeZTab() {
  const [acted, setActed] = useState({});
  return (
    <div className="card">
      <div className="card-header">♥️ VibeZ <span className="tag">what they're looking for</span></div>
      {DATE_POOL.map((p) => {
        const a = acted[p.name];
        return (
          <div key={p.name} className="post-card">
            <div className="post-header"><Avatar name={p.name} /><div className="post-info">
              <div className="post-user">{p.name} · {SIGNS.find((s) => s.name === p.sign)?.emoji}</div>
              <div className="post-meta">💌 Looking for: {p.looking}</div></div></div>
            <div className="post-content">{p.bio}</div>
            <div className="post-actions">
              {a ? <span className="tag" style={{ color: a === "like" ? "var(--primary)" : "var(--text-light)" }}>{a === "like" ? "💚 Liked" : "Passed"}</span> : (
                <>
                  <button className="btn btn-small" onClick={() => setActed((s) => ({ ...s, [p.name]: "like" }))}>💚 Vibe</button>
                  <button className="btn btn-small btn-secondary" onClick={() => setActed((s) => ({ ...s, [p.name]: "pass" }))}>Pass</button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfernoTab() {
  const [i, setI] = useState(0);
  const [last, setLast] = useState(null);
  const p = DATE_POOL[i];
  const act = (kind) => { setLast(`${kind === "fire" ? "🔥 liked" : "👎 passed"} ${p.name}`); setI((n) => n + 1); };
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div className="card-header" style={{ justifyContent: "center", borderBottom: "none" }}>❤️‍🔥 Inferno</div>
      {p ? (
        <>
          <div className="post-avatar" style={{ width: 72, height: 72, margin: "0 auto 10px", fontSize: 30 }}>{p.name.charAt(0)}</div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{p.name} · {SIGNS.find((s) => s.name === p.sign)?.emoji}</div>
          <div className="post-meta" style={{ marginBottom: 6 }}>💌 {p.looking}</div>
          <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 12 }}>{p.bio}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn btn-secondary" onClick={() => act("pass")}>👎 Pass</button>
            <button className="btn" onClick={() => act("fire")}>🔥 Like</button>
          </div>
        </>
      ) : <p style={{ fontSize: 12, color: "var(--text-light)" }}>🔥 You're all caught up — check back for new profiles.</p>}
      {last && <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 10 }}>{last}</p>}
    </div>
  );
}

const BOARDS = ["General", "Collabs", "Beats", "Bars", "Feedback"];
const DEMO_BOARD = [
  { id: "b1", board: "Collabs", who: "Mei", body: "Need a vocalist for a lo-fi flip.", at: Date.now() - 2 * 3600e3 },
  { id: "b2", board: "Beats", who: "Luka", body: "Free drill loop pack, link in bio.", at: Date.now() - 5 * 3600e3 },
];
function BoardZTab() {
  const { state, addTo } = useAppState();
  const [board, setBoard] = useState("General");
  const [body, setBody] = useState("");
  const posts = [...DEMO_BOARD, ...(state.boardPosts || [])].filter((p) => p.board === board).sort((a, b) => b.at - a.at);
  const post = () => { if (!body.trim()) return; addTo("boardPosts", { id: Date.now(), board, who: "You", body: body.trim(), at: Date.now() }); setBody(""); };
  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 12 }}>
        {BOARDS.map((b) => <button key={b} className={`heritage-chip${board === b ? " sel" : ""}`} onClick={() => setBoard(b)}>🪧 {b}</button>)}
      </div>
      <div className="card">
        <div style={{ display: "flex", gap: 8 }}>
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder={`Post to ${board}…`} onKeyDown={(e) => e.key === "Enter" && post()} style={{ flex: 1 }} />
          <button className="btn" onClick={post}>Post</button>
        </div>
      </div>
      <div className="card">
        <div className="card-header">🪧 {board}</div>
        {posts.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No posts yet — start one.</p>
          : posts.map((p) => (
            <div key={p.id} className="post-card">
              <div className="post-user">{p.who}</div>
              <div className="post-content">{p.body}</div>
              <div className="post-meta">{new Date(p.at).toLocaleString()}</div>
            </div>
          ))}
      </div>
    </>
  );
}

const MBTI_Q = [
  { q: "At a session, you…", a: ["Bring the energy, feed off the room", "E"], b: ["Lock in quietly, headphones on", "I"] },
  { q: "Writing a track, you start from…", a: ["Concrete refs and what works", "S"], b: ["A feeling or abstract concept", "N"] },
  { q: "Giving feedback, you lead with…", a: ["The honest technical truth", "T"], b: ["How it makes people feel", "F"] },
  { q: "Your release plan is…", a: ["Scheduled, roadmapped, on time", "J"], b: ["Drop it when it feels right", "P"] },
];
const MBTI_BLURB = {
  E: "outgoing", I: "reflective", S: "grounded", N: "visionary", T: "analytical", F: "empathic", J: "structured", P: "spontaneous",
};
function PersonalitieZTab() {
  const { state, updateUser } = useAppState();
  const [ans, setAns] = useState({});
  const done = Object.keys(ans).length === MBTI_Q.length;
  const type = MBTI_Q.map((_, i) => ans[i]).join("");
  const save = () => updateUser({ mbti: type });
  return (
    <div className="card">
      <div className="card-header">😶 PersonalitieZ <span className="tag">MBTI</span></div>
      {state.user.mbti && <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 10 }}>Saved type: <strong style={{ color: "var(--primary)" }}>{state.user.mbti}</strong></p>}
      {MBTI_Q.map((item, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{item.q}</div>
          <div className="chip-wrap">
            <button className={`heritage-chip${ans[i] === item.a[1] ? " sel" : ""}`} onClick={() => setAns((s) => ({ ...s, [i]: item.a[1] }))}>{item.a[0]}</button>
            <button className={`heritage-chip${ans[i] === item.b[1] ? " sel" : ""}`} onClick={() => setAns((s) => ({ ...s, [i]: item.b[1] }))}>{item.b[0]}</button>
          </div>
        </div>
      ))}
      {done && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 800 }}>Your type: {type}</p>
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>{MBTI_Q.map((_, i) => MBTI_BLURB[ans[i]]).join(" · ")}</p>
          <button className="btn" style={{ marginTop: 8 }} onClick={save}>Save to profile</button>
        </div>
      )}
    </div>
  );
}

function SocialConnectZPage({ serverOk }) {
  const [sub, setSub] = useState("discover");
  const SUBS = [["discover", "🔎 Discover"], ["vibez", "♥️ VibeZ"], ["inferno", "❤️‍🔥 Inferno"], ["boardz", "🪧 BoardZ"], ["personalitiez", "😶 PersonalitieZ"]];
  const Body = { discover: DiscoverTab, vibez: VibeZTab, inferno: InfernoTab, boardz: BoardZTab, personalitiez: PersonalitieZTab }[sub];
  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 14 }}>
        {SUBS.map(([id, label]) => <button key={id} className={`heritage-chip${sub === id ? " sel" : ""}`} onClick={() => setSub(id)}>{label}</button>)}
      </div>
      <Body serverOk={serverOk} />
    </>
  );
}

const GROUP_BUILTIN = [
  { name: "Friends", icon: "groupz_friendz.png", note: "Mutually beneficial" },
  { name: "Fans", icon: "groupz_fanz.png", note: "Less beneficial" },
  { name: "Partners", icon: "groupz.png", note: "Work with frequently" },
  { name: "Blocked", icon: "groupz_blocked.png", note: "Cannot contact you" },
];
const VISIBILITIES = [
  { id: "public", icon: "vis_public.png", label: "Public" },
  { id: "private", icon: "vis_private.png", label: "Private" },
  { id: "group", icon: "vis_group.png", label: "Group-only" },
  { id: "restricted", icon: "vis_restricted.png", label: "Restricted" },
];
const GROUP_ICON_CHOICES = ["groupz_custom.png", "groupz_friendz.png", "groupz_fanz.png", "groupz_blocked.png", "groupz.png", "crewz.png", "personaz.png", "collabz.png", "battlez.png", "labelz.png", "spinaz.png", "witchcraft.png"];
function groupLimitFor(tier) {
  const t = (tier || "").toLowerCase();
  if (t.includes("statz") || t.includes("stats")) return 20;
  if (t.includes("premium") || t.includes("pro")) return 5;
  return 1;
}

function GroupZPage({ tier }) {
  const { state, addTo, removeFrom, setList } = useAppState();
  const groups = state.groups || [];
  const limit = groupLimitFor(tier);
  const canCustomIcon = /premium|pro|stat[sz]/i.test(tier || "");
  const atLimit = groups.length >= limit;
  const update = (i, patch) => setList("groups", groups.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  const create = () => { if (!atLimit) addTo("groups", { id: Date.now(), name: "New Group", icon: "groupz_custom.png", visibility: "group" }); };

  return (
    <>
      <div className="card">
        <div className="card-header">👥 Built-in Groups</div>
        <div className="grid-2">
          {GROUP_BUILTIN.map((g) => (
            <div key={g.name} className="modal-sub-row">
              <IconImg icon={g.icon} alt={g.name} />
              <div><div className="s-name">{g.name}</div><div className="s-desc">{g.note}</div></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span>✏️ Your Custom Groups</span>
          <span className="tag">{groups.length}/{limit === 20 ? "20" : limit}</span>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 12 }}>
          {groupLimitFor(tier) === 20 ? "StatZ" : groupLimitFor(tier) === 5 ? "Premium" : "Free"} tier —
          {" "}{limit} renamable custom group{limit === 1 ? "" : "s"}.
          {!canCustomIcon && " Premium+ can also set custom group icons."}
        </p>

        {groups.length === 0 && <p style={{ fontSize: 12, color: "var(--text-light)" }}>No custom groups yet.</p>}

        {groups.map((g, i) => (
          <div key={g.id} className="card" style={{ background: "var(--surface-2)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <span className="grp-thumb"><IconImg icon={g.icon} alt="" /></span>
              <input value={g.name} onChange={(e) => update(i, { name: e.target.value })} style={{ flex: 1 }} />
              <button className="btn btn-danger btn-small" onClick={() => removeFrom("groups", i)}>✕</button>
            </div>

            <label style={{ fontSize: 11, color: "var(--text-light)", display: "block", marginBottom: 6 }}>Visibility</label>
            <div className="chip-wrap" style={{ marginBottom: 10 }}>
              {VISIBILITIES.map((v) => (
                <button key={v.id} onClick={() => update(i, { visibility: v.id })}
                  className={`vis-btn${g.visibility === v.id ? " sel" : ""}`} title={v.label}>
                  <IconImg icon={v.icon} alt={v.label} /> <span>{v.label}</span>
                </button>
              ))}
            </div>

            <label style={{ fontSize: 11, color: "var(--text-light)", display: "block", marginBottom: 6 }}>
              Icon {canCustomIcon ? "" : "🔒 (Premium+)"}
            </label>
            {canCustomIcon ? (
              <div className="pin-grid">
                {GROUP_ICON_CHOICES.map((ic) => (
                  <div key={ic} className={`pin-cell${g.icon === ic ? " pinned" : ""}`} onClick={() => update(i, { icon: ic })}>
                    <IconImg icon={ic} alt="" />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: "var(--text-light)" }}>Upgrade to Premium to choose a custom group icon.</p>
            )}
          </div>
        ))}

        <button className="btn" style={{ width: "100%", marginTop: 6 }} disabled={atLimit} onClick={create}>
          {atLimit ? `Limit reached (${limit}) — upgrade for more` : "➕ Create custom group"}
        </button>
      </div>
    </>
  );
}

function BodieZPage({ tier }) {
  const { state, update } = useAppState();
  const bodiez = state.bodiez || { location: "Gym", customEquipment: ["Bodyweight"], routines: [] };
  const setBodiez = (patch) => update({ bodiez: { ...bodiez, ...patch } });
  const isStatz = /stat[sz]/i.test(tier || "");
  const isPremium = /premium|pro|stat[sz]/i.test(tier || "");

  const [section, setSection] = useState("routines");
  const [muscle, setMuscle] = useState("Chest");
  const [editingId, setEditingId] = useState(null);

  const avail = availableEquipment(bodiez);
  const routines = bodiez.routines || [];
  const editing = routines.find((r) => r.id === editingId);

  const setRoutines = (list) => setBodiez({ routines: list });
  const patchRoutine = (id, patch) => setRoutines(routines.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addExercise = (ex) => {
    if (!editing) return;
    if (editing.exercises.some((e) => e.name === ex.name)) return;
    patchRoutine(editing.id, { exercises: [...editing.exercises, { ...ex, sets: 3, reps: 10, weight: 0, rest: 90, superset: false }] });
  };
  const patchEx = (i, patch) => patchRoutine(editing.id, { exercises: editing.exercises.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });

  const shown = EXERCISES.filter((e) => e.muscle === muscle && isAvailable(e, avail));

  const SECTIONS = [["routines", "🧩 Routines"], ["exercises", "📚 Exercises"], ["location", "📍 Location"], ["coach", "🤖 Coach"]];

  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 14 }}>
        {SECTIONS.map(([id, label]) => (
          <button key={id} className={`heritage-chip${section === id ? " sel" : ""}`} onClick={() => setSection(id)}>{label}</button>
        ))}
      </div>

      {section === "location" && (
        <div className="card">
          <div className="card-header"><span>📍 Training Location</span>{!isPremium && <span className="tag">🔒 Premium</span>}</div>
          <div className="chip-wrap" style={{ marginBottom: 12 }}>
            {Object.keys(LOCATIONS).map((loc) => (
              <button key={loc} className={`heritage-chip${bodiez.location === loc ? " sel" : ""}`}
                disabled={!isPremium && loc !== "Gym"}
                style={!isPremium && loc !== "Gym" ? { opacity: 0.4 } : undefined}
                onClick={() => isPremium || loc === "Gym" ? setBodiez({ location: loc }) : null}>{loc}</button>
            ))}
          </div>
          {!isPremium && <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 10 }}>Premium unlocks Home / Travel / Custom locations — routines adapt to whatever gear you have.</p>}
          <label style={{ fontSize: 11, color: "var(--text-light)", display: "block", marginBottom: 6 }}>Available equipment{bodiez.location === "Custom" ? " (toggle)" : ` at ${bodiez.location}`}</label>
          <div className="chip-wrap">
            {EQUIPMENT.map((eq) => {
              const on = avail.includes(eq);
              const editable = bodiez.location === "Custom" && isPremium;
              return (
                <button key={eq} className={`heritage-chip${on ? " sel" : ""}`}
                  style={editable ? undefined : { cursor: "default" }}
                  onClick={() => {
                    if (!editable) return;
                    const ce = bodiez.customEquipment || [];
                    setBodiez({ customEquipment: ce.includes(eq) ? ce.filter((x) => x !== eq) : [...ce, eq] });
                  }}>{eq}</button>
              );
            })}
          </div>
        </div>
      )}

      {section === "exercises" && (
        <div className="card">
          <div className="card-header">📚 Exercise Library</div>
          <div className="form-group"><label>Muscle group (Jefit)</label>
            <select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
              {MUSCLE_GROUPS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 10 }}>Showing only exercises you can do at <strong>{bodiez.location}</strong>.</p>
          {shown.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No {muscle} exercises with your current equipment.</p>
            : shown.map((ex) => (
              <div key={ex.name} className="skill-item">
                <span className="skill-item-name">{ex.name}</span>
                <span className="skill-item-exp">{ex.equipment.join(", ")}</span>
              </div>
            ))}
        </div>
      )}

      {section === "routines" && !editing && (
        <div className="card">
          <div className="card-header">🧩 Your Routines</div>
          {routines.length === 0 && <p style={{ fontSize: 12, color: "var(--text-light)" }}>No routines yet.</p>}
          {routines.map((r) => (
            <div key={r.id} className="skill-item">
              <span className="skill-item-name">{r.name}</span>
              <span className="skill-item-exp">{r.exercises.length} exercises</span>
              <div className="skill-item-actions">
                <button className="btn btn-small" onClick={() => setEditingId(r.id)}>Edit</button>
                <button className="btn btn-danger btn-small" onClick={() => setRoutines(routines.filter((x) => x.id !== r.id))}>✕</button>
              </div>
            </div>
          ))}
          <button className="btn" style={{ width: "100%", marginTop: 8 }}
            onClick={() => { const id = Date.now(); setRoutines([...routines, { id, name: "New Routine", exercises: [] }]); setEditingId(id); setSection("routines"); }}>
            ➕ Create routine
          </button>
        </div>
      )}

      {section === "routines" && editing && (
        <>
          <div className="card">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn btn-secondary btn-small" onClick={() => setEditingId(null)}>‹ Back</button>
              <input value={editing.name} onChange={(e) => patchRoutine(editing.id, { name: e.target.value })} style={{ flex: 1 }} />
            </div>
          </div>
          <div className="card">
            <div className="card-header">➕ Add exercises ({muscle})</div>
            <div className="form-group"><label>Muscle group</label>
              <select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
                {MUSCLE_GROUPS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            {shown.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>None available at {bodiez.location}.</p>
              : shown.map((ex) => (
                <div key={ex.name} className="skill-item">
                  <span className="skill-item-name">{ex.name}</span>
                  <button className="btn btn-small" disabled={editing.exercises.some((e) => e.name === ex.name)} onClick={() => addExercise(ex)}>Add</button>
                </div>
              ))}
          </div>
          <div className="card">
            <div className="card-header">🏋️ {editing.name} — {editing.exercises.length} exercises</div>
            {editing.exercises.length === 0 && <p style={{ fontSize: 12, color: "var(--text-light)" }}>Add exercises above.</p>}
            {editing.exercises.map((ex, i) => (
              <div key={ex.name} className="card" style={{ background: "var(--surface-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: 13 }}>{ex.name}</strong>
                  <button className="btn btn-danger btn-small" onClick={() => patchRoutine(editing.id, { exercises: editing.exercises.filter((_, idx) => idx !== i) })}>✕</button>
                </div>
                <div className="grid-3">
                  <div className="form-group" style={{ margin: 0 }}><label>Sets</label><input type="number" value={ex.sets} onChange={(e) => patchEx(i, { sets: +e.target.value })} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label>Reps</label><input type="number" value={ex.reps} onChange={(e) => patchEx(i, { reps: +e.target.value })} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label>Weight</label><input type="number" value={ex.weight} onChange={(e) => patchEx(i, { weight: +e.target.value })} /></div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
                  <div className="form-group" style={{ margin: 0, flex: 1 }}><label>Rest (sec)</label><input type="number" value={ex.rest} onChange={(e) => patchEx(i, { rest: +e.target.value })} /></div>
                  <button className={`heritage-chip${ex.superset ? " sel" : ""}`} style={{ alignSelf: "flex-end" }} onClick={() => patchEx(i, { superset: !ex.superset })}>⛓ Superset</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {section === "coach" && (
        <div className="card">
          <div className="card-header"><span>🤖 AI Coach</span>{!isStatz && <span className="tag">🔒 StatZ</span>}</div>
          {isStatz ? (
            <p style={{ fontSize: 12, color: "var(--text-light)" }}>
              StatZ personal trainer: progressive-overload suggestions, routine generation, and access to other users' routines.
              Coach reads your logged sessions to recommend when to add weight, repeat, deload, or rest.
            </p>
          ) : (
            <p style={{ fontSize: 12, color: "var(--text-light)" }}>🔒 The AI Coach — personal-trainer routine creator, progression logic, and shared user routines — is a <strong>StatZ</strong> feature.</p>
          )}
        </div>
      )}
    </>
  );
}

function ZodiacZPage() {
  const { state } = useAppState();
  const sign = zodiacFor(state.user.birthday);
  const reading = dailyReading(sign);
  return (
    <>
      <div className="card">
        <div className="card-header">♌ Your Sign</div>
        {sign ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 40 }}>{sign.emoji}</span>
              <div><div style={{ fontWeight: 800, fontSize: 18 }}>{sign.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-light)" }}>Auto-detected from your birthday</div></div>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-light)", lineHeight: 1.5 }}>{sign.desc}</p>
          </>
        ) : (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>Set your birthday in <strong>Setup</strong> to auto-detect your sign.</p>
        )}
      </div>
      {reading && (
        <div className="stripe-section">
          <div className="stripe-title">🔮 Today's Reading {sign.emoji}</div>
          <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>{reading.date} · your daily cosmic guide, straight from K-Oth</div>
          <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>{reading.vibe}</p>
          <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}><strong>🎯 Today:</strong> {reading.focus}</p>
          <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}><strong>⚠️ Watch:</strong> {reading.caution}</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="tag">🔢 Lucky number {reading.luckyNumber}</span>
            <span className="tag">🎨 Lucky color {reading.luckyColor}</span>
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-header">✨ All 12 Signs</div>
        {SIGNS.map((s) => (
          <div key={s.name} className="modal-sub-row" style={sign?.name === s.name ? { borderColor: "var(--primary)", boxShadow: "var(--glow)" } : undefined}>
            <span style={{ fontSize: 26, width: 40, textAlign: "center" }}>{s.emoji}</span>
            <div><div className="s-name">{s.name}</div><div className="s-desc">{s.desc}</div></div>
          </div>
        ))}
      </div>
    </>
  );
}

// RepostExchange-style anonymous 1–10 rating (👎 → 🔥).
function RatingScale({ myRating, onRate, onSkip }) {
  return (
    <div className="rate-wrap">
      <div className="rate-title">Rate this track</div>
      <div className="rate-sub">Ratings are anonymous and help curate the charts.</div>
      <div className="rate-row">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} className={`rate-btn${myRating === n ? " picked" : ""}`} onClick={() => onRate(n)}>{n}</button>
        ))}
      </div>
      <div className="rate-legend"><span>👎</span><span>🔥</span></div>
      {myRating == null && <button className="rate-skip" onClick={onSkip}>Skip</button>}
    </div>
  );
}

const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const BATTLE_MODES = [
  { id: "1v1", label: "1️⃣ 1v1" },
  { id: "freestyle", label: "🆓 Freestyle" },
  { id: "cypher", label: "🧑‍🤝‍🧑 Cypher" },
];
const HOUR = 3600e3;
const BATTLE_WINDOW = 24 * HOUR; // battles close 24h after the post
// postedAt seeded relative to load: 1v1 open (~22h left), freestyle already
// closed (shows a decided winner), cypher open. `seed` are community votes —
// participants' own votes never count.
const DEMO_BATTLES = {
  "1v1": { postedAt: Date.now() - 2 * HOUR, viewerIsParticipant: false, a: { name: "Kaya", track: "Midnight Bloom", seed: [8, 9, 7] }, b: { name: "Diego", track: "Calle Fuego", seed: [7, 6, 8] } },
  freestyle: { postedAt: Date.now() - 25 * HOUR, viewerIsParticipant: false, a: { name: "Luka", track: "Off the Dome #14", seed: [6, 7, 6] }, b: { name: "Mei", track: "No Pen Freestyle", seed: [9, 8, 9] } },
  cypher: { postedAt: Date.now() - 12 * HOUR, viewerIsParticipant: true, a: { name: "Team North", track: "Cypher Round 1", seed: [7, 8, 7] }, b: { name: "Team South", track: "Cypher Round 2", seed: [8, 6, 7] } },
};
const fmtLeft = (ms) => {
  if (ms <= 0) return "closed";
  const h = Math.floor(ms / HOUR); const m = Math.floor((ms % HOUR) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

function BattleZPage() {
  const [mode, setMode] = useState("1v1");
  // ratings + my pick per contestant, seeded from demo; reset when mode changes.
  const [ratings, setRatings] = useState({});
  const battle = DEMO_BATTLES[mode];
  const key = (side) => `${mode}:${side}`;
  const listFor = (side) => ratings[key(side)] ?? battle[side].seed;
  const mineFor = (side) => ratings[`${key(side)}:mine`] ?? null;

  const rate = (side, n) => setRatings((r) => ({ ...r, [key(side)]: [...(r[key(side)] ?? battle[side].seed), n], [`${key(side)}:mine`]: n }));
  const skip = (side) => setRatings((r) => ({ ...r, [`${key(side)}:mine`]: 0 }));

  const left = battle.postedAt + BATTLE_WINDOW - Date.now();
  const closed = left <= 0;
  const isParticipant = battle.viewerIsParticipant;

  const stat = (side) => {
    const list = listFor(side); // community votes only — participants never count
    return { med: median(list), count: list.length, qualified: list.length >= 3 };
  };
  const A = stat("a"), B = stat("b");
  // Winner requires the 24h window closed AND both sides with 3+ votes.
  const bothQualified = A.qualified && B.qualified;
  const decided = closed && bothQualified;
  const winner = !decided ? null : A.med === B.med ? "tie" : A.med > B.med ? "a" : "b";

  const Contestant = ({ side }) => {
    const c = battle[side]; const s = stat(side); const mine = mineFor(side);
    const win = winner === side;
    return (
      <div className="card" style={win ? { borderColor: "var(--primary)", boxShadow: "var(--glow)" } : undefined}>
        <div className="card-header">
          <span>{win ? "🏆 " : ""}{c.name}</span>
          <span className="tag">{s.qualified ? `${s.med.toFixed(1)}/10` : `${s.count}/3 votes`}</span>
        </div>
        <div className="post-meta" style={{ marginBottom: 10 }}>🎵 {c.track} · {s.count} vote{s.count === 1 ? "" : "s"}</div>
        {closed ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>🔒 Voting closed · community median <strong>{s.med.toFixed(1)}/10</strong>{s.qualified ? "" : " (didn't reach 3 votes)"}.</p>
        ) : isParticipant ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>🚫 You're a participant in this battle — contestants can't vote on their own battle.</p>
        ) : mine == null ? (
          <RatingScale myRating={null} onRate={(n) => rate(side, n)} onSkip={() => skip(side)} />
        ) : (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>
            {mine ? <>You rated <strong style={{ color: "var(--primary)" }}>{mine}/10</strong>. </> : "You skipped. "}
            Community median: <strong>{s.med.toFixed(1)}/10</strong>.
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 14 }}>
        {BATTLE_MODES.map((m) => (
          <button key={m.id} className={`heritage-chip${mode === m.id ? " sel" : ""}`} onClick={() => setMode(m.id)}>{m.label}</button>
        ))}
      </div>
      <div className="card" style={{ textAlign: "center" }}>
        <div className="card-header" style={{ justifyContent: "center", borderBottom: "none" }}>🪖 {battle.a.name} vs {battle.b.name}</div>
        {decided ? (
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
            {winner === "tie" ? "🤝 It's a tie!" : `🏆 ${battle[winner].name} wins ${stat(winner).med.toFixed(1)}–${stat(winner === "a" ? "b" : "a").med.toFixed(1)}`}
          </p>
        ) : closed ? (
          <p style={{ fontSize: 12, color: "var(--accent)" }}>Voting closed — no winner: both sides need 3+ votes to qualify.</p>
        ) : (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>⏳ Voting closes in <strong>{fmtLeft(left)}</strong> · winner is the higher community median once 3+ votes are in on each side.</p>
        )}
      </div>
      <Contestant side="a" />
      <Contestant side="b" />
      <div className="card">
        <p style={{ fontSize: 11, color: "var(--text-light)" }}>
          🏁 A battle is won by the higher score (community median) once voting closes <strong>24h after posting</strong>, needing at least <strong>3 votes</strong> per side. Participants can't vote on their own battle.
          <br />💰 Verified 18+ contestants can bet money on themselves; everyone else bets 🍥 SpinAZ. Betting settles at close — wired with the payments backend.
        </p>
      </div>
    </>
  );
}

function LedgerPage({ emoji, title, balance, log, note }) {
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">{emoji} {title}</div>
        <div className="balance-info">Balance: <strong>{balance}</strong>{note ? <> · {note}</> : null}</div>
      </div>
      <div className="card">
        <div className="card-header">🧾 Log</div>
        {(!log || log.length === 0) ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No activity yet.</p>
        ) : [...log].reverse().map((e, i) => (
          <div key={i} className="skill-item">
            <span className="skill-item-name" style={{ color: e.amount >= 0 ? "var(--success)" : "var(--danger)" }}>{e.amount >= 0 ? "+" : ""}{e.amount} · {e.note}</span>
            <span className="skill-item-exp">{new Date(e.at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </>
  );
}
function SpinaZPage() {
  const { state } = useAppState();
  return <LedgerPage emoji="🍥" title="SpinAZ" balance={state.spinaz || 0} log={state.spinazLog} note="Buy at 80% ($80 = 100). Earn by streaming media (sec played − 30)." />;
}
function EnergyPage() {
  const { state } = useAppState();
  return <LedgerPage emoji="⚡" title="Energy" balance={state.energy || 0} log={state.energyLog} note="Earn from ratings, comments, and daily activity." />;
}

const RATE_TYPES = [
  { id: "image", label: "🖼 Image", item: "Cover: Neon Skyline", criteria: ["Artistic value", "Attractiveness"] },
  { id: "text", label: "📝 Text", item: "Verse: 16 bars", criteria: ["Wit"] },
  { id: "audio", label: "🎧 Audio", item: "Track: Midnight Bloom", criteria: ["Mix quality", "Performance"] },
  { id: "video", label: "📹 Video", item: "Video: Calle Fuego", criteria: ["Performance", "Artist quality"] },
];
function RateConnectZPage() {
  const { state, update, addTo, toggleSetting } = useAppState();
  const [type, setType] = useState("image");
  const attractOn = state.settings?.ratezAttractiveness !== false;
  const toggleAttract = () => {
    toggleSetting("ratezAttractiveness");
    if (isSignedIn()) setAttractivenessOptInApi(!attractOn).catch(() => {}); // sync opt-in to backend
  };
  const [rated, setRated] = useState({});
  const t = RATE_TYPES.find((x) => x.id === type);
  const award = (k, n) => {
    if (rated[k] != null) return;
    setRated((r) => ({ ...r, [k]: n }));
    update({ energy: (state.energy || 0) + 1 }); // raters earn 1 Energy per rating
    addTo("energyLog", { amount: 1, note: `Rated ${t.item}`, at: Date.now() });
  };
  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 14 }}>
        {RATE_TYPES.map((x) => (
          <button key={x.id} className={`heritage-chip${type === x.id ? " sel" : ""}`} onClick={() => setType(x.id)}>{x.label}</button>
        ))}
      </div>
      <div className="card">
        <div className="card-header">{t.label} · {t.item}</div>
        {t.criteria.map((cr) => {
          const k = `${type}:${cr}`;
          return (
            <div key={cr} style={{ marginBottom: 12 }}>
              <div className="rate-sub" style={{ textAlign: "left", marginBottom: 6 }}>{cr}</div>
              {rated[k] != null ? (
                <p style={{ fontSize: 12, color: "var(--text-light)" }}>You rated <strong style={{ color: "var(--primary)" }}>{rated[k]}/10</strong> · earned +1 ⚡</p>
              ) : (
                <RatingScale myRating={null} onRate={(n) => award(k, n)} onSkip={() => setRated((r) => ({ ...r, [k]: 0 }))} />
              )}
            </div>
          );
        })}
      </div>
      <div className="card">
        <div className="settings-toggle">
          <label>💯 Let RateZ move my attractiveness median</label>
          <div role="switch" aria-checked={attractOn} onClick={toggleAttract}
            className={`toggle-switch${attractOn ? " active" : ""}`} />
        </div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 6 }}>
          When on, the attractiveness ratings others give you adjust your median — the score used as a scalable filter on CollabZ, BattleZ, and VenueZ. Turn it off to keep your attractiveness private and unfiltered.
        </p>
      </div>
      <div className="card"><p style={{ fontSize: 11, color: "var(--text-light)" }}>Ratings are anonymous and curate the charts. Raters earn 1 ⚡ Energy per rating; 6+ ratings shape a media's median score, which feeds its price.</p></div>
    </>
  );
}

const DIST_TYPES = [
  { id: "audio", label: "🎧 Audio → Track" },
  { id: "image", label: "🖼 Image → Cover" },
  { id: "text", label: "📝 Text → Lyrics" },
  { id: "album", label: "💿 Album" },
];
function DistributeZPage({ tier }) {
  const { state, addTo, removeFrom } = useAppState();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("audio");
  const [licensing, setLicensing] = useState(false);
  const isStatz = /stat[sz]/i.test(tier || "");
  const isPremium = /premium|pro|stat[sz]/i.test(tier || "");
  const releases = state.releases || [];
  const now = new Date();
  const thisMonth = releases.filter((r) => { const d = new Date(r.at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
  const atFreeLimit = !isPremium && thisMonth >= 1;
  const submit = () => {
    if (!title.trim() || atFreeLimit) return;
    addTo("releases", { id: Date.now(), title: title.trim(), type, licensing: isStatz && licensing, at: Date.now() });
    setTitle("");
  };
  return (
    <>
      <div className="card">
        <div className="card-header"><span>🎶 New Submission</span><span className="tag">{isPremium ? "Unlimited" : `${thisMonth}/1 this month`}</span></div>
        <div className="form-group"><label>Media type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>{DIST_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        </div>
        <div className="form-group"><label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Release title" /></div>
        {isStatz && (
          <div className="settings-toggle"><label>⚖️ Submit for licensing (StatZ)</label>
            <div role="switch" aria-checked={licensing} onClick={() => setLicensing((v) => !v)} className={`toggle-switch${licensing ? " active" : ""}`} /></div>
        )}
        {atFreeLimit && <p style={{ fontSize: 12, color: "var(--gold, #ffcf3f)", marginBottom: 8 }}>🔒 Free tier allows 1 submission/month — upgrade for unlimited.</p>}
        <button className="btn btn-success" style={{ width: "100%" }} disabled={atFreeLimit || !title.trim()} onClick={submit}>📤 Submit for distribution</button>
      </div>
      <div className="card">
        <div className="card-header">📀 Your Submissions</div>
        {releases.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No submissions yet.</p>
          : [...releases].reverse().map((r, i) => (
            <div key={r.id} className="skill-item">
              <span className="skill-item-name">{DIST_TYPES.find((t) => t.id === r.type)?.label.split(" ")[0]} {r.title}{r.licensing ? " · ⚖️ licensing" : ""}</span>
              <span className="skill-item-actions"><button className="btn btn-danger btn-small" onClick={() => removeFrom("releases", releases.length - 1 - i)}>✕</button></span>
            </div>
          ))}
      </div>
    </>
  );
}

const CASHOUT_PLANS = [
  { id: "instant", label: "⚡ Instant", tax: "15% tax" },
  { id: "weekly", label: "📅 Weekly", tax: "your dev-tax rate" },
  { id: "monthly", label: "🗓️ Monthly", tax: "1% tax" },
  { id: "quarterly", label: "📆 3-month", tax: "0% tax" },
];
function RoyaltieZPage({ tier, serverOk, syncEconomy }) {
  const { state, update, updateWallet, addTo } = useAppState();
  const [royalties, setRoyalties] = useState(state.royalties || 0);
  const [entries, setEntries] = useState(null);
  const [plan, setPlan] = useState("weekly");
  const [msg, setMsg] = useState("");

  const load = () => {
    if (!serverOk) return;
    getRoyaltiesApi()
      .then((r) => {
        setRoyalties(r.royalties);
        setEntries(r.entries);
        update({ royalties: r.royalties });
      })
      .catch(() => {});
  };
  useEffect(load, [serverOk]);

  const cashout = async () => {
    setMsg("");
    if (!serverOk) { setMsg("Cashout requires a live connection to the economy backend."); return; }
    try {
      const r = await cashoutRoyaltiesApi(plan); // server applies plan tax, moves net to wallet
      const b = r.breakdown;
      updateWallet({ balance: r.wallet.money, earned: Number((state.wallet.earned + b.net_cents / 100).toFixed(2)) });
      addTo("paymentHistory", { amount: b.net_cents / 100, dev: b.tax_cents / 100, at: Date.now(), note: `Royalty cashout (${b.plan})` });
      setMsg(`Cashed out ${money(b.gross_cents / 100)} → ${money(b.net_cents / 100)} to wallet (tax ${money(b.tax_cents / 100)}).`);
      load();
      syncEconomy?.();
    } catch (e) {
      setMsg(e.message || "Cashout failed");
    }
  };

  const log = entries
    ? entries.map((e) => ({ amount: e.amount_cents / 100, note: e.kind === "cashout" ? `Cashout · tax ${money(e.tax_cents / 100)}` : (e.source || "Accrual"), at: new Date(e.created_at).getTime() }))
    : state.royaltyLog;

  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">👑 RoyaltieZ {serverOk ? <span className="tag" style={{ color: "var(--success)" }}>● live</span> : <span className="tag">offline</span>}</div>
        <div className="balance-info">Royalty balance: <strong>{money(royalties)}</strong> · Every source is timestamped. Instant 15% · weekly tiered · monthly 1% · 3-month 0%.</div>
        <div className="form-group" style={{ marginTop: 8 }}>
          <label>Cashout plan</label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)}>
            {CASHOUT_PLANS.map((p) => <option key={p.id} value={p.id}>{p.label} — {p.tax}</option>)}
          </select>
        </div>
        <button className="btn" style={{ width: "100%", marginTop: 8 }} disabled={!serverOk || royalties <= 0} onClick={cashout}>
          💸 Cash out {money(royalties)} to wallet
        </button>
        {msg && <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 8 }}>{msg}</p>}
      </div>
      <div className="card">
        <div className="card-header">🧾 Royalty Log</div>
        {(!log || log.length === 0) ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No royalty activity yet.</p>
        ) : [...log].reverse().map((e, i) => (
          <div key={i} className="skill-item">
            <span className="skill-item-name" style={{ color: e.amount >= 0 ? "var(--success)" : "var(--danger)" }}>{e.amount >= 0 ? "+" : ""}{money(e.amount)} · {e.note}</span>
            <span className="skill-item-exp">{new Date(e.at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </>
  );
}

const DEMO_INBOX = [
  { id: "i1", who: "Kaya", body: "Loved your last drop — collab on a hook?", at: Date.now() - 3 * 3600e3 },
  { id: "i2", who: "LabelZ · Azrael Records", body: "We'd like to send you an advance offer.", at: Date.now() - 26 * 3600e3 },
];
function MessageZPage({ serverOk }) {
  const { state, addTo } = useAppState();
  const [box, setBox] = useState("inbox");
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [finding, setFinding] = useState(false);
  const sent = (state.messages || []).filter((m) => m.dir === "out");
  const send = () => {
    if (!to.trim() || !body.trim()) return;
    addTo("messages", { id: Date.now(), dir: "out", who: to.trim(), body: body.trim(), at: Date.now() });
    setTo(""); setBody(""); setBox("outbox");
  };
  const pick = (m) => { setTo(m.username || m.display_name || m.name || ""); setFinding(false); };
  const list = box === "inbox" ? DEMO_INBOX : [...sent].reverse();
  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 14 }}>
        <button className={`heritage-chip${box === "inbox" ? " sel" : ""}`} onClick={() => setBox("inbox")}>📥 Inbox</button>
        <button className={`heritage-chip${box === "outbox" ? " sel" : ""}`} onClick={() => setBox("outbox")}>📤 Outbox</button>
        <button className={`heritage-chip${box === "compose" ? " sel" : ""}`} onClick={() => setBox("compose")}>✍️ Compose</button>
      </div>
      {box === "compose" ? (
        <>
          <div className="card">
            <div className="card-header">✍️ New Message</div>
            <div className="form-group">
              <label>To</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="username" style={{ flex: 1 }} />
                <button className="btn btn-small btn-secondary" onClick={() => setFinding((v) => !v)}>{finding ? "✕ Close" : "🔍 Find"}</button>
              </div>
            </div>
            <div className="form-group"><label>Message</label><CappedTextarea value={body} onChange={(e) => setBody(e.target.value)} style={{ height: 70 }} /></div>
            <button className="btn btn-success" style={{ width: "100%" }} onClick={send}>📤 Send</button>
          </div>
          {finding && <MemberFinder serverOk={serverOk} onPick={pick} actionLabel="✉️ Message" note="Filter members by NationalitieZ, PreferenceZ, ZodiacZ and SubstanceZ — tap one to address your message." />}
        </>
      ) : (
        <div className="card">
          <div className="card-header">{box === "inbox" ? "📥 Inbox" : "📤 Outbox"}</div>
          {list.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>Nothing here yet.</p>
            : list.map((m) => (
              <div key={m.id} className="post-card">
                <div className="post-user">{box === "inbox" ? m.who : `To: ${m.who}`}</div>
                <div className="post-content">{m.body}</div>
                <div className="post-meta">{new Date(m.at).toLocaleString()}</div>
              </div>
            ))}
        </div>
      )}
    </>
  );
}

// CollabZ — user-based collaboration. Find collaborators by their real metrics,
// send a paid collab offer (real money between members), and settle any dispute
// or refund member-to-member right here. Membership/upgrades are never refundable.
function CollabZPage({ tier, serverOk, onOpen }) {
  const { state, addTo } = useAppState();
  const [target, setTarget] = useState(null);
  const [offer, setOffer] = useState("");
  const [terms, setTerms] = useState("");
  const requests = state.collabRequests || [];
  const submit = () => {
    if (!target || !(Number(offer) > 0)) return;
    addTo("collabRequests", {
      id: Date.now(),
      who: target.username || target.display_name || target.name,
      amount: Number(offer),
      terms: terms.trim(),
      status: "sent",
      at: Date.now(),
    });
    setTarget(null); setOffer(""); setTerms("");
  };
  return (
    <>
      <div className="card">
        <div className="card-header">🤝 CollabZ — user-based</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          Every CollabZ is member-to-member. You put up <strong>real wallet money</strong>, the developer tax applies to your tier, and the rest goes to your collaborator. Filter the room by their real metrics — NationalitieZ, PreferenceZ, ZodiacZ, SubstanceZ — then send an offer.
        </p>
        <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 6 }}>
          🧾 Disputes &amp; refunds on a collab are settled between the two members here. <strong>Membership and upgrades are not refundable.</strong> Broken feature? <button className="btn-link" style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0, textDecoration: "underline", font: "inherit" }} onClick={() => onOpen?.("bugz")}>Submit a BugZ report.</button>
        </p>
      </div>

      {target ? (
        <div className="card" style={{ border: "1px solid var(--primary)" }}>
          <div className="card-header"><span>🤝 Offer to {target.username ? `@${target.username}` : (target.display_name || target.name)}</span><button className="btn btn-small btn-secondary" onClick={() => setTarget(null)}>Change</button></div>
          <div className="form-group"><label>💵 Offer ($)</label><input type="number" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="0.00" /></div>
          <div className="form-group"><label>Terms</label><CappedTextarea value={terms} onChange={(e) => setTerms(e.target.value)} style={{ height: 56 }} placeholder="What are you collaborating on? Deliverables, splits, deadline…" /></div>
          {Number(offer) > 0 && (() => { const s = splitTransaction(Number(offer), tier); return (
            <p style={{ fontSize: 11, color: "var(--text-light)" }}>Developer tax ({s.label} {Math.round(s.rate * 100)}%): {money(s.dev)} · your collaborator receives {money(s.net)}.</p>
          ); })()}
          <button className="btn btn-success" style={{ width: "100%" }} disabled={!(Number(offer) > 0)} onClick={submit}>📤 Send collab offer</button>
        </div>
      ) : (
        <MemberFinder serverOk={serverOk} onPick={setTarget} actionLabel="🤝 Collab with" note="Multi-select filters — combine NationalitieZ, PreferenceZ, ZodiacZ and SubstanceZ to find the right collaborator." />
      )}

      {requests.length > 0 && (
        <div className="card">
          <div className="card-header">📤 Your collab offers</div>
          {[...requests].reverse().map((r) => (
            <div key={r.id} className="post-card">
              <div className="post-user">To: {r.who} · {money(r.amount)} <span className="tag">{r.status}</span></div>
              {r.terms && <div className="post-content">{r.terms}</div>}
              <div className="post-meta">{new Date(r.at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// LegalZ — the site-side coverage: terms, refund/dispute policy, entity + liability
// disclaimers. The owner drops their real LLC name in via the OWNER_ENTITY constant.
const OWNER_ENTITY = "Music ConnectZ (operating entity — set your LLC name here)";
function LegalZPage() {
  return (
    <>
      <div className="card">
        <div className="card-header">⚖️ Terms &amp; Policies</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          Music ConnectZ is operated by <strong>{OWNER_ENTITY}</strong>. Using the platform means you agree to everything below. Plain English, no fine-print games.
        </p>
      </div>
      <div className="card">
        <div className="card-header">🧾 Refunds</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          <strong>Membership and upgrades are non-refundable.</strong> They unlock features the instant you buy them, so there's nothing to return. SpinAZ and Energy purchases are also final. If something's broken, that's a bug — file a <strong>BugZ</strong> report and we fix it (squashed bugs pay you 200 SpinAZ). We don't issue refunds for buyer's remorse.
        </p>
      </div>
      <div className="card">
        <div className="card-header">🤝 Member-to-member disputes</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          Money you spend on other members — CollabZ offers, MerchZ, VenueZ, CallZ — is a transaction <em>between you and them</em>. Disputes and refunds on those are settled member-to-member inside CollabZ. {OWNER_ENTITY} takes the developer tax as a platform fee and provides the rails, but is not a party to your deal and isn't liable for another member's delivery, quality, or conduct.
        </p>
      </div>
      <div className="card">
        <div className="card-header">🛡️ Liability</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          The platform is provided "as is," without warranties. To the fullest extent the law allows, {OWNER_ENTITY} is not liable for lost profits, lost data, or indirect/consequential damages arising from your use of Music ConnectZ, member transactions, or AI-generated output. AI documents and tools are drafts for convenience, not legal advice.
        </p>
      </div>
      <div className="card">
        <div className="card-header">📇 Contact &amp; entity</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          Legal notices go to the operating entity above. <strong>Set your registered LLC name, state of formation, and a contact address</strong> in the <code>OWNER_ENTITY</code> field (and your lawyer should review this page before you rely on it).
        </p>
      </div>
      <LegalDisclaimer />
    </>
  );
}

function LabelZPage({ tier, onOpen }) {
  const { state, addTo, updateSettings } = useAppState();
  const isPremium = /premium|pro|stat[sz]/i.test(tier || "");
  const canCreate = isPremium || isBizPersona(state.personas);
  const [form, setForm] = useState({ artist: "", advance: "", royalty: "", terms: "" });
  const [sign, setSign] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const contracts = state.labelContracts || [];
  const submit = () => {
    if (!canCreate || !form.artist.trim() || !sign.trim()) return;
    addTo("labelContracts", { id: Date.now(), ...form, advance: Number(form.advance) || 0, royalty: Number(form.royalty) || 0, signedBy: sign.trim(), at: Date.now() });
    setForm({ artist: "", advance: "", royalty: "", terms: "" }); setSign("");
  };
  if (!canCreate) {
    return (
      <div className="card">
        <div className="card-header">🏷️ LabelZ</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          🔒 Creating a label requires <strong>Premium</strong>, or an <strong>A&amp;R Scout</strong> / <strong>Manager</strong> persona. Add one in PersonaZ, or upgrade.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <UpgradeCTA onOpen={onOpen} label="👑 Upgrade to Premium" />
          <UpgradeCTA onOpen={onOpen} label="🎭 Add a persona" to="personas" style={{ background: "transparent", border: "1px solid var(--primary)" }} />
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="card">
        <div className="card-header">🏷️ New Signing — Advance Offer</div>
        <div className="form-group"><label>Artist</label><input value={form.artist} onChange={set("artist")} placeholder="Who are you signing?" /></div>
        <div className="grid-2">
          <div className="form-group"><label>💵 Advance ($)</label><input type="number" value={form.advance} onChange={set("advance")} /></div>
          <div className="form-group"><label>👑 Artist royalty (%)</label><input type="number" value={form.royalty} onChange={set("royalty")} /></div>
        </div>
        <div className="form-group"><label>Terms</label><CappedTextarea value={form.terms} onChange={set("terms")} style={{ height: 56 }} placeholder="Deliverables, length, recoupment…" /></div>
        <div className="form-group"><label>✍️ E-signature (type your legal name)</label><input value={sign} onChange={(e) => setSign(e.target.value)} placeholder="Your name" /></div>
        <LegalDisclaimer />
        <button className="btn btn-success" style={{ width: "100%" }} disabled={!form.artist.trim() || !sign.trim()} onClick={submit}>✒️ Sign & issue contract</button>
      </div>
      <div className="card">
        <div className="card-header">📜 Signed Contracts</div>
        {contracts.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No contracts yet.</p>
          : [...contracts].reverse().map((c) => (
            <div key={c.id} className="post-card">
              <div className="post-user">🏷️ {c.artist} — {money(c.advance)} advance · {c.royalty}% royalty</div>
              {c.terms && <div className="post-content">{c.terms}</div>}
              <div className="post-meta">✍️ Signed by {c.signedBy} · {new Date(c.at).toLocaleString()} · hash #{(c.id % 100000).toString(16)}</div>
            </div>
          ))}
      </div>
    </>
  );
}

const LILITH_LISTS = [
  { id: "inbox", label: "📥 Inbox" },
  { id: "today", label: "‼️ Today" },
  { id: "upcoming", label: "📅 Upcoming" },
  { id: "anytime", label: "👐🏼 Anytime" },
  { id: "someday", label: "🧠 Someday" },
  { id: "logbook", label: "🧾 Logbook" },
  { id: "trash", label: "🚮 Trash" },
];
function LilithPage() {
  const { state, setList, update } = useAppState();
  const [list, setActiveList] = useState("today");
  const [title, setTitle] = useState("");
  const tasks = state.lilithTasks || [];
  const shown = tasks.filter((t) => t.list === list);
  const patch = (id, p) => setList("lilithTasks", tasks.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const add = () => {
    if (!title.trim()) return;
    setList("lilithTasks", [...tasks, { id: Date.now(), title: title.trim(), list, xp: 10 }]);
    setTitle("");
  };
  const complete = (t) => { patch(t.id, { list: "logbook", done: true }); update({ energy: (state.energy || 0) + 1 }); };
  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 14 }}>
        {LILITH_LISTS.map((l) => (
          <button key={l.id} className={`heritage-chip${list === l.id ? " sel" : ""}`} onClick={() => setActiveList(l.id)}>
            {l.label} {tasks.filter((t) => t.list === l.id).length || ""}
          </button>
        ))}
      </div>
      {!["logbook", "trash"].includes(list) && (
        <div className="card">
          <div style={{ display: "flex", gap: 8 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Add to ${list}…`} onKeyDown={(e) => e.key === "Enter" && add()} style={{ flex: 1 }} />
            <button className="btn" onClick={add}>＋</button>
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-header">{LILITH_LISTS.find((l) => l.id === list).label}</div>
        {shown.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>Nothing here.</p>
          : shown.map((t) => (
            <div key={t.id} className="skill-item">
              <span className="skill-item-name" style={t.done ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>{t.title}</span>
              <span className="skill-item-exp">+{t.xp} XP</span>
              <span className="skill-item-actions">
                {!t.done && list !== "trash" && <button className="btn btn-success btn-small" onClick={() => complete(t)}>✓</button>}
                {list !== "trash" ? <button className="btn btn-danger btn-small" onClick={() => patch(t.id, { list: "trash" })}>🚮</button>
                  : <button className="btn btn-secondary btn-small" onClick={() => patch(t.id, { list: "inbox", done: false })}>↩</button>}
              </span>
            </div>
          ))}
        {list === "logbook" && shown.length > 0 && <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 8 }}>Completed missions earn ⚡ Energy. Clear your Today list for a daily bonus.</p>}
      </div>
    </>
  );
}

// Shared attribution/royalty footer for anything Intelligence creates.
function IntelNote({ role, reusable }) {
  return (
    <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 4 }}>
      🏷️ Attributed to Corey Knap ({role}) · low-gradient MCZ watermark applied · can't be exported/downloaded outside posts.
      {reusable ? " ♻️ Reusable: 10% K-Oth royalty when used on DistributeZ / CollabZ / BattleZ, split transparently to contributors. Edit the output and the royalty scales to how much stays original — change 50% of the words, K-Oth is paid on the other 50% (so 5%)." : ""}
    </p>
  );
}
function Pill({ active, onClick, children }) {
  return <button className={`heritage-chip${active ? " sel" : ""}`} onClick={onClick}>{children}</button>;
}

function ImageConnectZ() {
  const [type, setType] = useState(IMAGE_TYPES[0].name);
  const [prompt, setPrompt] = useState("");
  const t = IMAGE_TYPES.find((x) => x.name === type);
  return (
    <div className="card">
      <div className="card-header">🖼️ Image ConnectZ <span className="tag">{t.ratio}</span></div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Image type</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>
        {IMAGE_TYPES.map((x) => <Pill key={x.name} active={type === x.name} onClick={() => setType(x.name)}>{x.name}</Pill>)}
      </div>
      <div className="form-group"><label>Describe it</label><CappedTextarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ height: 56 }} placeholder={`e.g., neon skyline for a ${type.toLowerCase()}`} /></div>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>🙂 Uses your saved FaceZ for likeness. StatZ can lipsync the result to an audio/video track and drop it into VideoZ.</p>
      <button className="btn" style={{ width: "100%" }} disabled={!prompt.trim()}>✨ Generate {type} ({t.ratio})</button>
      <IntelNote role="Designer" />
    </div>
  );
}

function InstrumentalConnectZ({ tier }) {
  const isStatz = /stat[sz]/i.test(tier || "");
  const [genre, setGenre] = useState(INSTR_GENRES[0]);
  const [inst, setInst] = useState(["808 / Bass", "Drums"]);
  const [bpm, setBpm] = useState(140);
  const [keyIdx, setKeyIdx] = useState(0);
  const [moodQ, setMoodQ] = useState("");
  const toggle = (i) => setInst((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  const keyList = isStatz && moodQ ? KEYS.filter((k) => (k.mood + k.key).toLowerCase().includes(moodQ.toLowerCase())) : KEYS;
  const chosen = keyList[keyIdx] || KEYS[0];
  return (
    <div className="card">
      <div className="card-header">🎹 Instrumental ConnectZ <span className="tag">MIDI</span></div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Genre</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{INSTR_GENRES.map((g) => <Pill key={g} active={genre === g} onClick={() => setGenre(g)}>{g}</Pill>)}</div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Instruments</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{INSTR_INSTRUMENTS.map((i) => <Pill key={i} active={inst.includes(i)} onClick={() => toggle(i)}>{i}</Pill>)}</div>
      <div className="form-group"><label>BPM: {bpm}</label><input type="range" min="60" max="200" value={bpm} onChange={(e) => setBpm(+e.target.value)} /></div>
      {isStatz && (
        <div className="form-group"><label>🔎 StatZ — search key by mood</label><input value={moodQ} onChange={(e) => { setMoodQ(e.target.value); setKeyIdx(0); }} placeholder="e.g., dark, triumphant, midnight" /></div>
      )}
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Key</label>
      <div className="chip-wrap" style={{ margin: "6px 0 8px" }}>{keyList.map((k, i) => <Pill key={k.key} active={keyIdx === i} onClick={() => setKeyIdx(i)}>{k.key}</Pill>)}</div>
      <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 10 }}><strong>{chosen.key}</strong> — {chosen.mood}</p>
      <button className="btn" style={{ width: "100%" }}>🎼 Generate MIDI · {genre} · {bpm} BPM · {chosen.key}</button>
      <IntelNote role="Beat Producer" reusable />
    </div>
  );
}

function MixConnectZ() {
  const [mode, setMode] = useState(MIX_MODES[2]);
  const [target, setTarget] = useState(MIX_TARGETS[0].name);
  const [extras, setExtras] = useState(["Vocal tuning"]);
  const tg = MIX_TARGETS.find((x) => x.name === target);
  const toggle = (e) => setExtras((s) => (s.includes(e) ? s.filter((x) => x !== e) : [...s, e]));
  return (
    <div className="card">
      <div className="card-header">🎚️ Mix ConnectZ</div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Mode</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{MIX_MODES.map((m) => <Pill key={m} active={mode === m} onClick={() => setMode(m)}>{m}</Pill>)}</div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Loudness target</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{MIX_TARGETS.map((x) => <Pill key={x.name} active={target === x.name} onClick={() => setTarget(x.name)}>{x.name} · {x.lufs}</Pill>)}</div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Enhancements</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{MIX_EXTRAS.map((e) => <Pill key={e} active={extras.includes(e)} onClick={() => toggle(e)}>{e}</Pill>)}</div>
      <button className="btn" style={{ width: "100%" }}>🎛️ {mode} → {tg.lufs}</button>
      <IntelNote role="Mix Engineer" />
    </div>
  );
}

function VideoConnectZ() {
  const [type, setType] = useState(VIDEO_TYPES[0].name);
  const [prompt, setPrompt] = useState("");
  const t = VIDEO_TYPES.find((x) => x.name === type);
  return (
    <div className="card">
      <div className="card-header">📺 Video ConnectZ <span className="tag">{t.ratio}</span></div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Video type</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{VIDEO_TYPES.map((x) => <Pill key={x.name} active={type === x.name} onClick={() => setType(x.name)}>{x.name}</Pill>)}</div>
      <div className="form-group"><label>Concept</label><CappedTextarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ height: 56 }} placeholder={`Concept for your ${type.toLowerCase()}`} /></div>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>🙂 Built from your saved FaceZ. StatZ can lipsync it to a supplied audio track and finish it in VideoZ.</p>
      <button className="btn" style={{ width: "100%" }} disabled={!prompt.trim()}>🎬 Generate {type} ({t.ratio})</button>
      <IntelNote role="Videographer" reusable />
    </div>
  );
}

function SentenceConnectZ() {
  const { state } = useAppState();
  // Contracts & royalty agreements are gated to Manager / A&R Scout personas.
  const isBiz = isBizPersona(state.personas);
  const [doc, setDoc] = useState(DOC_TYPES[0].name);
  const [rhyme, setRhyme] = useState(2);
  const [genre, setGenre] = useState(INSTR_GENRES[0]);
  const [prompt, setPrompt] = useState("");
  const isLyrics = doc === "Lyrics";
  const isLegal = DOC_TYPES.find((d) => d.name === doc)?.gated;
  return (
    <div className="card">
      <div className="card-header">📃 Sentence ConnectZ <span className="tag">Corey voice</span></div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Document type</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>
        {DOC_TYPES.map((d) => {
          const locked = d.gated && !isBiz;
          return (
            <Pill key={d.name} active={doc === d.name} onClick={() => !locked && setDoc(d.name)}>
              {locked ? "🔒 " : ""}{d.name}
            </Pill>
          );
        })}
      </div>
      {DOC_TYPES.find((d) => d.name === doc)?.gated && !isBiz && (
        <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginBottom: 8 }}>🔒 Contracts &amp; royalty agreements need a Manager or A&amp;R Scout persona.</p>
      )}
      <div className="form-group"><label>Describe the topic (text or paste media link)</label>
        <CappedTextarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ height: 52 }} placeholder={isLyrics ? "What's the song about?" : `Brief for your ${doc.toLowerCase()}`} /></div>
      {isLyrics && (
        <>
          <label style={{ fontSize: 11, color: "var(--text-light)" }}>Genre</label>
          <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{INSTR_GENRES.map((g) => <Pill key={g} active={genre === g} onClick={() => setGenre(g)}>{g}</Pill>)}</div>
          <div className="form-group"><label>Rhyme scheme: last {rhyme} syllable{rhyme === 1 ? "" : "s"} of each line must rhyme</label>
            <input type="range" min="1" max="6" value={rhyme} onChange={(e) => setRhyme(+e.target.value)} /></div>
        </>
      )}
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 10 }}>Written in Corey voice · toggles for language, Explicit / Slang / Emoji.</p>
      {isLegal && <LegalDisclaimer />}
      <button className="btn" style={{ width: "100%" }} disabled={!prompt.trim()}>✍️ Generate {doc}</button>
      <IntelNote role="Ghostwriter" reusable />
    </div>
  );
}

// OCC's Corey-voice replies — keyword-aware, Claude Code-style: acknowledge,
// lay out the plan, offer the next move. Returns { text, action? }.
function occReply(text, t) {
  const q = text.toLowerCase();
  const plan = (steps) => steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  if (/game|arcade|platformer|shooter|puzzle|rpg/.test(q)) {
    return {
      text: `Say less — a ${t.complexity.toLowerCase()} game is right in my lane on the ${t.label} tier (${t.languages[0]}).\n\nHere's the play:\n${plan(["Lock the core loop — one mechanic that's actually fun", "Build the scene + controls", "Add scoring, juice, and a win/lose state", "Ship it straight to GameZ so people can play"])}\n\nWant me to spin it up and drop it on GameZ?`,
      action: { kind: "game", label: "🎮 Publish it to GameZ" },
    };
  }
  if (/bug|error|broken|fix|crash|not work/.test(q)) {
    return { text: `Aight, let's squash it. Paste me the error and the file it's screaming about. I'll:\n${plan(["Read the stack trace top-down — the real cause is usually near the top", "Reproduce it in my head, then in code", "Patch the smallest thing that fixes it — no shotgun edits", "Re-run and prove it's dead"])}\n\nDrop the error when you're ready.` };
  }
  if (/site|website|landing|page|html|css/.test(q)) {
    return { text: `Bet. A clean site's a quick W. My move:\n${plan(["Nail the one message above the fold", "Mobile-first layout — most of your traffic is on a phone", "Neon it up to match your brand", "Wire the CTA to something real"])}\n\nTell me what it's for and who's landing on it.` };
  }
  if (/api|backend|server|database|endpoint/.test(q)) {
    return { text: `Backend work — my favorite kind of quiet. Plan:\n${plan(["Define the data shape first, everything hangs off that", "Endpoints that do one thing each", "Validate every input server-side — never trust the client", "Enforce the dev tax on any money path"])}\n\nWhat's it gotta do?` };
  }
  return { text: `I got you. Give me the goal in one line and I'll break it down like this:\n${plan(["What we're actually building", "The simplest version that works", "Ship it, then make it nice"])}\n\nOn the ${t.label} tier I can go ${t.complexity.toLowerCase()} — ${t.desc}` };
}

// OCC tab set — the Claude-Code-style workspace. Each is name + emoji + panel.
const OCC_TABS = [
  { key: "editor", label: "Editor", emoji: "👁️‍🗨️" },
  { key: "gitz", label: "GitZ", emoji: "🐙" },
  { key: "taskz", label: "TaskZ", emoji: "📑" },
  { key: "codez", label: "CodeZ", emoji: "🧩" },
  { key: "pathz", label: "PathZ", emoji: "🛤️" },
  { key: "mistakez", label: "MistakeZ", emoji: "😢" },
  { key: "habitz", label: "HabitZ", emoji: "🫠" },
  { key: "console", label: "Console", emoji: "🖥️" },
  { key: "tellz", label: "TellZ", emoji: "🗣️" },
  { key: "logz", label: "LogZ", emoji: "🪵" },
  { key: "search", label: "Search", emoji: "🔍" },
  { key: "settings", label: "Settings", emoji: "⚙️" },
];

const OCC_TASK_STATUS = {
  queued: { label: "Queued", emoji: "🕒" },
  running: { label: "In progress", emoji: "⚙️" },
  done: { label: "Done", emoji: "✅" },
};
const UNDO_WINDOW_MS = 60000; // members can undo an OCC edit within a minute.

// OCC's AI voice/model. "Corey GPT" is the default house voice; members can
// switch OCC's language/model here.
const OCC_MODELS = [
  { id: "corey-gpt", label: "Corey GPT", emoji: "🎤", note: "Straight-up K-Oth voice — how all MCZ talks." },
  { id: "standard", label: "Standard", emoji: "🤖", note: "Plain, neutral assistant voice." },
  { id: "technical", label: "Technical", emoji: "📐", note: "Terse, code-first, minimal chatter." },
];
const occModel = (id) => OCC_MODELS.find((m) => m.id === id) || OCC_MODELS[0];

function OccWorkspace({ tier, onOpen }) {
  const t = occTierFor(tier);
  const { state, update } = useAppState();
  const author = state.user?.name || "you";
  const occ = state.occ || { tasks: [], codez: [], paths: [], mistakes: [], habits: [], tell: [], log: [], settings: { automated: false, suggestions: true } };
  const [tab, setTab] = useState("editor");

  // Persist a partial patch into state.occ.
  const patch = (p) => update({ occ: { ...occ, ...p } });
  const now = () => Date.now();
  const logAction = (kind, text) => patch({ log: [{ id: now(), kind, text, at: now() }, ...(occ.log || [])].slice(0, 300) });

  return (
    <div className="card">
      <div className="card-header">
        <span>👁️‍🗨️ Ocular Code ConnectZ <span className="tag">{t.label} · {t.complexity}</span></span>
        <span style={{ display: "flex", gap: 6 }}>
          <span className="tag">{occModel(occ.settings?.model).emoji} {occModel(occ.settings?.model).label}</span>
          {occ.settings?.automated && <span className="tag" style={{ color: "var(--gold, #ffcf3f)" }}>🤖 auto</span>}
          {occ.settings?.suggestions && <span className="tag">💭 tips</span>}
        </span>
      </div>

      {/* Tab bar */}
      <div className="chip-wrap" style={{ marginBottom: 12 }}>
        {OCC_TABS.map((x) => (
          <button key={x.key} className={`heritage-chip${tab === x.key ? " sel" : ""}`} onClick={() => setTab(x.key)}>{x.emoji} {x.label}</button>
        ))}
        <button className="heritage-chip" onClick={() => onOpen?.("callz")}>📞 CallZ</button>
        <button className="heritage-chip" onClick={() => onOpen?.("filez")}>📁 FileZ</button>
      </div>

      {tab === "editor" && <OccEditor t={t} author={author} occ={occ} patch={patch} logAction={logAction} onOpen={onOpen} />}
      {tab === "gitz" && <OccGitZ occ={occ} patch={patch} logAction={logAction} />}
      {tab === "taskz" && <OccTaskZ occ={occ} patch={patch} logAction={logAction} />}
      {tab === "codez" && <OccCodeZ occ={occ} patch={patch} />}
      {tab === "pathz" && <OccPathZ occ={occ} patch={patch} />}
      {tab === "mistakez" && <OccNotes occ={occ} patch={patch} field="mistakes" title="😢 MistakeZ" hint="Errors OCC made — logged so it doesn't repeat them." />}
      {tab === "habitz" && <OccNotes occ={occ} patch={patch} field="habits" title="🫠 HabitZ" hint="Things you repeat — OCC notes the pattern and adapts." />}
      {tab === "console" && <OccLog rows={occ.log} title="🖥️ Output / Console" empty="No output yet — OCC logs every action it takes here." />}
      {tab === "tellz" && <OccTellZ occ={occ} patch={patch} />}
      {tab === "logz" && <OccLogZ rows={occ.log} />}
      {tab === "search" && <OccSearch occ={occ} />}
      {tab === "settings" && <OccSettings occ={occ} patch={patch} logAction={logAction} tier={tier} />}

      <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 10 }}>🔐 Any attempt to access Music ConnectZ repos is flagged, prevented, and alerts the owner — unless it's the owner. Media requests route to the matching Intelligence app.</p>
      <IntelNote role="Developer" />
    </div>
  );
}

// --- Editor tab: the chat + game publish + git-as-a-task ---
function OccEditor({ t, author, occ, patch, logAction, onOpen }) {
  const { addTo } = useAppState();
  const model = occModel(occ.settings?.model);
  const greeting = model.id === "corey-gpt"
    ? `Yo — I'm OCC, your code hand. Tell me what you're building and I'll break it down, write it, and ship it. On the ${t.label} tier we're going ${t.complexity.toLowerCase()}.`
    : model.id === "technical"
      ? `OCC ready. ${t.label} tier · ${t.complexity} complexity. State the goal; I'll return a plan and code.`
      : `Hi, I'm OCC. Tell me what you'd like to build and I'll plan it, write it, and ship it. You're on the ${t.label} tier (${t.complexity.toLowerCase()}).`;
  const [msgs, setMsgs] = useState([{ role: "occ", text: greeting }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, thinking]);

  const addTask = (text, eta) => patch({ tasks: [{ id: Date.now(), text, status: "queued", eta, at: Date.now() }, ...(occ.tasks || [])] });

  const send = () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    // Every prompt is remembered in TellZ.
    patch({ tell: [{ id: Date.now(), tab: "OCC Editor", text, at: Date.now() }, ...(occ.tell || [])].slice(0, 200) });
    setThinking(true);
    setTimeout(() => {
      const r = occReply(text, t);
      setMsgs((m) => [...m, { role: "occ", text: r.text, action: r.action }]);
      // SuggestionZ: OCC proposes the work as a task. Automated: it also logs a start.
      if (occ.settings?.suggestions) addTask(`OCC: ${text.slice(0, 60)}`, "~5 min");
      if (occ.settings?.automated) logAction("auto", `Auto-started work on: ${text.slice(0, 60)}`);
      setThinking(false);
    }, 550);
  };

  const publishGame = () => {
    const name = `OCC Build ${Math.floor(Math.random() * 900 + 100)}`;
    addTo("games", {
      id: `g-${Date.now()}`, title: name, author, genre: "Casual / Idle", subgenre: "Hyper-Casual", lang: t.languages[0],
      plays: 0, rating: null, mine: true, desc: `A ${t.complexity.toLowerCase()} game built in ${t.languages[0]} via Ocular Code ConnectZ.`,
    });
    logAction("ship", `Published "${name}" to GameZ`);
    onOpen?.("gamez");
  };

  const commitGit = () => {
    // Git integration is itself a task — surfaced with why/what/how.
    const def = (occ.repos || []).find((r) => r.id === occ.defaultRepo);
    const target = def ? `${def.owner}/${def.name} (${def.branch})` : "the default repo — set one in GitZ";
    addTask(`Git: commit + push to ${target}`, "~1 min");
    logAction("git", `Queued git commit + push → ${target}`);
  };

  return (
    <>
      <div style={{ background: "#0c0a16", borderRadius: 12, padding: 10, maxHeight: 340, overflowY: "auto", marginBottom: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
            <div style={{
              maxWidth: "85%", padding: "8px 11px", borderRadius: 12, fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap",
              background: m.role === "user" ? "var(--accent, #22e6ff)" : "rgba(255,255,255,0.06)",
              color: m.role === "user" ? "#04121a" : "var(--text, #eee)",
              border: m.role === "user" ? "none" : "1px solid var(--border)",
            }}>
              {m.role === "occ" && <div style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 2 }}>👁️‍🗨️ OCC</div>}
              {m.text}
              {m.action?.kind === "game" && (
                <div style={{ marginTop: 8 }}><button className="btn btn-small" onClick={publishGame}>{m.action.label}</button></div>
              )}
            </div>
          </div>
        ))}
        {thinking && <div style={{ fontSize: 11, color: "var(--text-light)", padding: "2px 4px" }}>👁️‍🗨️ OCC is thinking…</div>}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Tell OCC what to build…" style={{ flex: 1 }} />
        <button className="btn btn-small" onClick={send} disabled={!input.trim() || thinking}>Send</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button className="btn btn-small btn-secondary" onClick={commitGit}>🔀 Git commit (as task)</button>
        <button className="btn btn-small btn-secondary" onClick={() => onOpen?.("gamez")}>👾 Open GameZ</button>
      </div>
      <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>
        💻 On {t.label} you can build in: {t.languages.join(", ")}.
        {" "}{/statz|stat|debug/i.test(t.label) ? "C++ / Unreal is unlocked." : "C++ / Unreal is StatZ-only (Unreal is reserved for StatZ)."}
      </p>
      <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 4 }}>OCC plans and ships in Corey voice. Git integration runs as a task in TaskZ. Live code-writing/running turns on when the AI backend key is set.</p>
    </>
  );
}

// --- GitZ: the GitHub repos OCC commits to, with a default target ---
const OCC_SUGGESTED_REPOS = [
  { owner: "ctkoth", name: "-music-connectz-frontend-", branch: "main" },
  { owner: "ctkoth", name: "music-connectz-backend", branch: "main" },
];
function OccGitZ({ occ, patch, logAction }) {
  const repos = occ.repos || [];
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("main");
  const addRepo = (o, n, b) => {
    const owner2 = (o ?? owner).trim(); const name2 = (n ?? name).trim(); const branch2 = (b ?? branch).trim() || "main";
    if (!owner2 || !name2) return;
    if (repos.some((r) => r.owner === owner2 && r.name === name2)) return;
    const id = Date.now();
    const next = [{ id, owner: owner2, name: name2, branch: branch2 }, ...repos];
    patch({ repos: next, defaultRepo: occ.defaultRepo || id });
    logAction("git", `Connected repo ${owner2}/${name2}`);
    setOwner(""); setName(""); setBranch("main");
  };
  const setDefault = (id) => { patch({ defaultRepo: id }); logAction("git", `Default commit target set to ${id}`); };
  const remove = (id) => patch({ repos: repos.filter((r) => r.id !== id), defaultRepo: occ.defaultRepo === id ? null : occ.defaultRepo });
  const def = repos.find((r) => r.id === occ.defaultRepo);
  return (
    <>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>🐙 The GitHub repositories OCC commits to. Set a default and every 🔀 git task ships there.</p>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="card-header">🎯 Default commit target</div>
        {def ? <p style={{ fontSize: 13 }}>{def.owner}/<strong>{def.name}</strong> <span className="tag">{def.branch}</span></p>
          : <p style={{ fontSize: 12, color: "var(--text-light)" }}>No default yet — add a repo and pin it.</p>}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="owner" style={{ flex: 1, minWidth: 90 }} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="repo" style={{ flex: 1.3, minWidth: 110 }} />
        <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="branch" style={{ width: 90 }} />
        <button className="btn btn-small" onClick={() => addRepo()} disabled={!owner.trim() || !name.trim()}>+ Add</button>
      </div>
      {OCC_SUGGESTED_REPOS.filter((s) => !repos.some((r) => r.owner === s.owner && r.name === s.name)).length > 0 && (
        <div className="chip-wrap" style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 10, color: "var(--text-light)", alignSelf: "center" }}>Quick add:</span>
          {OCC_SUGGESTED_REPOS.filter((s) => !repos.some((r) => r.owner === s.owner && r.name === s.name)).map((s) => (
            <button key={s.name} className="heritage-chip" onClick={() => addRepo(s.owner, s.name, s.branch)}>➕ {s.name}</button>
          ))}
        </div>
      )}
      {repos.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No repos connected yet.</p>
        : repos.map((r) => (
          <div key={r.id} className="post-card">
            <div className="post-user">🐙 {r.owner}/{r.name} <span className="tag">{r.branch}</span> {occ.defaultRepo === r.id && <span className="tag" style={{ color: "var(--success)" }}>● default</span>}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {occ.defaultRepo !== r.id && <button className="btn btn-small" onClick={() => setDefault(r.id)}>🎯 Make default</button>}
              <button className="btn btn-small btn-secondary" onClick={() => remove(r.id)}>🗑 Remove</button>
            </div>
          </div>
        ))}
      <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>Connecting here tells OCC where to commit. Live push runs through the platform's GitHub integration once your account's authorized.</p>
    </>
  );
}

// --- TaskZ: OCC's task queue with status, ETA and a 60s undo window ---
function OccTaskZ({ occ, patch, logAction }) {
  const [text, setText] = useState("");
  const tasks = occ.tasks || [];
  const add = () => { if (!text.trim()) return; patch({ tasks: [{ id: Date.now(), text: text.trim(), status: "queued", eta: "~5 min", at: Date.now() }, ...tasks] }); setText(""); };
  const setStatus = (id, status) => {
    patch({ tasks: tasks.map((x) => (x.id === id ? { ...x, status, undoUntil: status === "done" ? Date.now() + UNDO_WINDOW_MS : x.undoUntil } : x)) });
    if (status === "done") logAction("task", `Completed task ${id}`);
  };
  const undo = (id) => { patch({ tasks: tasks.map((x) => (x.id === id ? { ...x, status: "queued", undoUntil: null } : x)) }); logAction("undo", `Undid task ${id}`); };
  const remove = (id) => patch({ tasks: tasks.filter((x) => x.id !== id) });
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add a task for OCC…" style={{ flex: 1 }} />
        <button className="btn btn-small" onClick={add} disabled={!text.trim()}>Add</button>
      </div>
      {tasks.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No tasks yet. Ask OCC in the Editor and it queues the work here with live status + ETA.</p>
        : tasks.map((x) => {
          const s = OCC_TASK_STATUS[x.status] || OCC_TASK_STATUS.queued;
          const canUndo = x.status === "done" && x.undoUntil && x.undoUntil > Date.now();
          return (
            <div key={x.id} className="post-card">
              <div className="post-user">{s.emoji} {x.text} <span className="tag">{s.label}</span> {x.eta && x.status !== "done" && <span className="tag">ETA {x.eta}</span>}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {x.status === "queued" && <button className="btn btn-small" onClick={() => setStatus(x.id, "running")}>▶ Start</button>}
                {x.status === "running" && <button className="btn btn-small btn-success" onClick={() => setStatus(x.id, "done")}>✅ Done</button>}
                {canUndo && <button className="btn btn-small btn-secondary" onClick={() => undo(x.id)}>↩ Undo (60s)</button>}
                <button className="btn btn-small btn-secondary" onClick={() => remove(x.id)}>🗑 Remove</button>
              </div>
            </div>
          );
        })}
    </>
  );
}

// --- CodeZ: acronyms/typos/slang the user types, with tallies + sort ---
function OccCodeZ({ occ, patch }) {
  const [term, setTerm] = useState("");
  const [means, setMeans] = useState("");
  const [desc, setDesc] = useState(true); // sort by count descending
  const rows = [...(occ.codez || [])].sort((a, b) => (desc ? b.count - a.count : a.count - b.count));
  const add = () => {
    if (!term.trim()) return;
    const existing = (occ.codez || []).find((x) => x.term.toLowerCase() === term.trim().toLowerCase());
    if (existing) patch({ codez: occ.codez.map((x) => (x.id === existing.id ? { ...x, count: x.count + 1, means: means.trim() || x.means } : x)) });
    else patch({ codez: [{ id: Date.now(), term: term.trim(), means: means.trim(), count: 1 }, ...(occ.codez || [])] });
    setTerm(""); setMeans("");
  };
  return (
    <>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Acronyms, typos and slang you type that mean something else — OCC tallies each so it learns your shorthand.</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="term (e.g. 'occ')" style={{ flex: 1 }} />
        <input value={means} onChange={(e) => setMeans(e.target.value)} placeholder="means…" style={{ flex: 1.4 }} />
        <button className="btn btn-small" onClick={add} disabled={!term.trim()}>+ / tally</button>
      </div>
      <div className="chip-wrap" style={{ marginBottom: 8 }}>
        <button className={`heritage-chip${desc ? " sel" : ""}`} onClick={() => setDesc(true)}>▼ Most used</button>
        <button className={`heritage-chip${!desc ? " sel" : ""}`} onClick={() => setDesc(false)}>▲ Least used</button>
      </div>
      {rows.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>Nothing tracked yet.</p>
        : rows.map((x) => (
          <div key={x.id} className="settings-toggle">
            <label>{x.term}{x.means && <span style={{ color: "var(--text-light)" }}> → {x.means}</span>}</label>
            <span className="tag">×{x.count}</span>
          </div>
        ))}
    </>
  );
}

// --- PathZ: cross-device user paths, full CRUD ---
function OccPathZ({ occ, patch }) {
  const [device, setDevice] = useState("");
  const [path, setPath] = useState("");
  const paths = occ.paths || [];
  const add = () => { if (!device.trim() || !path.trim()) return; patch({ paths: [{ id: Date.now(), device: device.trim(), path: path.trim() }, ...paths] }); setDevice(""); setPath(""); };
  const remove = (id) => patch({ paths: paths.filter((x) => x.id !== id) });
  return (
    <>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Your working paths across devices — OCC keeps them in sync so a build picks up where you left off.</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input value={device} onChange={(e) => setDevice(e.target.value)} placeholder="device (Phone / Laptop)" style={{ flex: 1 }} />
        <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/path/to/project" style={{ flex: 1.6 }} />
        <button className="btn btn-small" onClick={add} disabled={!device.trim() || !path.trim()}>Add</button>
      </div>
      {paths.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No paths yet.</p>
        : paths.map((x) => (
          <div key={x.id} className="post-card">
            <div className="post-user">🛤️ {x.device}</div>
            <div className="post-meta" style={{ wordBreak: "break-all" }}>{x.path}</div>
            <button className="btn btn-small btn-secondary" style={{ marginTop: 6 }} onClick={() => remove(x.id)}>🗑 Remove</button>
          </div>
        ))}
    </>
  );
}

// --- Generic notes tab (MistakeZ / HabitZ) ---
function OccNotes({ occ, patch, field, title, hint }) {
  const [text, setText] = useState("");
  const rows = occ[field] || [];
  const add = () => { if (!text.trim()) return; patch({ [field]: [{ id: Date.now(), text: text.trim(), at: Date.now() }, ...rows] }); setText(""); };
  const remove = (id) => patch({ [field]: rows.filter((x) => x.id !== id) });
  return (
    <>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>{hint}</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={`Add to ${title.replace(/^\S+\s/, "")}…`} style={{ flex: 1 }} />
        <button className="btn btn-small" onClick={add} disabled={!text.trim()}>Add</button>
      </div>
      {rows.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>Nothing noted yet.</p>
        : rows.map((x) => (
          <div key={x.id} className="post-card">
            <div className="post-content">{x.text}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span className="post-meta">{new Date(x.at).toLocaleString()}</span>
              <button className="btn btn-small btn-secondary" onClick={() => remove(x.id)}>🗑</button>
            </div>
          </div>
        ))}
    </>
  );
}

// --- TellZ: prompts/posts log ---
function OccTellZ({ occ }) {
  const rows = occ.tell || [];
  return (
    <>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>🗣️ Everything you've prompted OCC — a running record across the workspace.</p>
      {rows.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>Nothing logged yet.</p>
        : rows.map((x) => (
          <div key={x.id} className="post-card">
            <div className="post-user">{x.tab}</div>
            <div className="post-content">{x.text}</div>
            <div className="post-meta">{new Date(x.at).toLocaleString()}</div>
          </div>
        ))}
    </>
  );
}

// --- Console / raw action log ---
function OccLog({ rows, title, empty }) {
  const list = rows || [];
  return (
    <>
      {title && <div className="modal-sub-title" style={{ marginBottom: 8 }}>{title}</div>}
      {list.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>{empty || "Nothing logged yet."}</p>
        : <div style={{ background: "#0c0a16", borderRadius: 10, padding: 10, fontFamily: "monospace", fontSize: 12, maxHeight: 340, overflowY: "auto" }}>
          {list.map((x) => (
            <div key={x.id} style={{ color: "var(--text-light)", marginBottom: 4 }}>
              <span style={{ color: "var(--accent, #22e6ff)" }}>[{new Date(x.at).toLocaleTimeString()}]</span> {x.kind ? `${x.kind}: ` : ""}{x.text}
            </div>
          ))}
        </div>}
    </>
  );
}

// --- LogZ: filter the action log by range ---
function OccLogZ({ rows }) {
  const [range, setRange] = useState("day");
  const spans = { day: 864e5, week: 6048e5, month: 2592e6 };
  const cutoff = range === "all" ? 0 : Date.now() - (spans[range] || 864e5);
  const list = (rows || []).filter((x) => x.at >= cutoff);
  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 8 }}>
        {[["day", "Today"], ["week", "This week"], ["month", "This month"], ["all", "All time"]].map(([k, l]) => (
          <button key={k} className={`heritage-chip${range === k ? " sel" : ""}`} onClick={() => setRange(k)}>{l}</button>
        ))}
      </div>
      <OccLog rows={list} title={`🪵 ${list.length} entr${list.length === 1 ? "y" : "ies"}`} empty="Nothing in this range." />
    </>
  );
}

// --- Search across every OCC tab ---
function OccSearch({ occ }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const hits = !query ? [] : [
    ...(occ.tasks || []).map((x) => ({ where: "TaskZ", text: x.text })),
    ...(occ.codez || []).map((x) => ({ where: "CodeZ", text: `${x.term} → ${x.means}` })),
    ...(occ.paths || []).map((x) => ({ where: "PathZ", text: `${x.device}: ${x.path}` })),
    ...(occ.mistakes || []).map((x) => ({ where: "MistakeZ", text: x.text })),
    ...(occ.habits || []).map((x) => ({ where: "HabitZ", text: x.text })),
    ...(occ.tell || []).map((x) => ({ where: "TellZ", text: x.text })),
    ...(occ.log || []).map((x) => ({ where: "Log", text: x.text })),
  ].filter((r) => r.text.toLowerCase().includes(query));
  return (
    <>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search across TaskZ, CodeZ, PathZ, logs…" style={{ marginBottom: 10 }} />
      {!query ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>Type to search everything OCC knows.</p>
        : hits.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No matches.</p>
          : hits.map((r, i) => (
            <div key={i} className="post-card"><div className="post-user">{r.where}</div><div className="post-content">{r.text}</div></div>
          ))}
    </>
  );
}

// --- Settings: Automated + SuggestionZ toggles ---
function OccSettings({ occ, patch, logAction, tier }) {
  const s = occ.settings || {};
  const toggle = (k) => { const next = { ...s, [k]: !s[k] }; patch({ settings: next }); logAction("settings", `${k} → ${next[k] ? "on" : "off"}`); };
  const setModel = (id) => { patch({ settings: { ...s, model: id } }); logAction("settings", `voice → ${id}`); };
  const setLang = (lang) => { patch({ settings: { ...s, language: lang } }); logAction("settings", `default language → ${lang}`); };
  return (
    <>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="card-header">🎙️ OCC voice / language</div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>How OCC talks to you. Corey GPT is the house voice — how all MCZ speaks.</p>
        <div className="chip-wrap">
          {OCC_MODELS.map((m) => (
            <button key={m.id} className={`heritage-chip${(s.model || "corey-gpt") === m.id ? " sel" : ""}`} onClick={() => setModel(m.id)} title={m.note}>{m.emoji} {m.label}</button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--accent, #22e6ff)", marginTop: 6 }}>{occModel(s.model).note}</p>
        <div className="modal-sub-title" style={{ margin: "12px 0 6px" }}>💻 Default coding language</div>
        <div className="chip-wrap">
          {langsForTier(tier).map((l) => (
            <button key={l.name} className={`heritage-chip${(s.language || "JavaScript / HTML5") === l.name ? " sel" : ""}`} disabled={l.locked} onClick={() => setLang(l.name)} title={l.locked ? `${l.tier}-tier only` : ""} style={l.locked ? { opacity: 0.45 } : undefined}>
              {l.name}{l.locked ? " 🔒" : ""}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-toggle">
        <label>🤖 Automated — OCC performs taskz without asking, just updates you live in LogZ</label>
        <div role="switch" aria-checked={!!s.automated} onClick={() => toggle("automated")} className={`toggle-switch${s.automated ? " active" : ""}`} />
      </div>
      <div className="settings-toggle">
        <label>💭 SuggestionZ — OCC adds taskz explaining the what, why &amp; how before doing them</label>
        <div role="switch" aria-checked={!!s.suggestions} onClick={() => toggle("suggestions")} className={`toggle-switch${s.suggestions ? " active" : ""}`} />
      </div>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 8 }}>
        {s.automated
          ? "🤖 Automated is on — OCC will just do the work and log it. Watch LogZ for the play-by-play."
          : "💭 Suggestion mode — OCC proposes taskz (with why/how) and waits for your go. Flip Automated on to let it run."}
      </p>
    </>
  );
}

// Read an image file and downscale it to a small square thumbnail dataURL so
// it fits in localStorage. Used by FaceZ to bank faces from the user's media.
function fileToThumb(file, size = 128) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = size; c.height = size;
        const ctx = c.getContext("2d");
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function FaceCard({ f, live, onRate, onDelete }) {
  const median = live ? f.median : (f.ratings?.length ? f.ratings.reduce((s, n) => s + n, 0) / f.ratings.length : null);
  const count = live ? f.count : (f.ratings?.length || 0);
  const src = live ? f.url : f.img;
  return (
    <div className="post-card" style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <img src={src} alt={f.name} style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", border: "1px solid var(--border)" }} />
        <div style={{ flex: 1 }}>
          <div className="post-user">{f.name || "Untitled face"} {live && !f.mine && <span style={{ fontSize: 11, color: "var(--text-light)" }}>· @{f.owner}</span>}</div>
          <div style={{ fontSize: 12, color: "var(--gold, #ffcf3f)" }}>
            {median != null ? `💯 ${Number(median).toFixed(1)}/10` : "unrated"} <span style={{ color: "var(--text-light)" }}>· {count} rating{count === 1 ? "" : "s"}</span>
            {live && f.my_rating ? <span style={{ color: "var(--text-light)" }}> · you: {f.my_rating}</span> : null}
          </div>
        </div>
        {onDelete && <button className="btn btn-small btn-secondary" onClick={() => onDelete(f.id)} title="Remove">🗑️</button>}
      </div>
      {onRate && (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 10, color: "var(--text-light)" }}>Rate attractiveness (RateZ)</label>
          <div className="chip-wrap" style={{ marginTop: 4 }}>
            {[1,2,3,4,5,6,7,8,9,10].map((n) => (
              <button key={n} className={`heritage-chip${live && f.my_rating === n ? " sel" : ""}`} style={{ padding: "2px 8px" }} onClick={() => onRate(f.id, n)}>{n}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FaceZTab({ serverOk }) {
  const { state, setList } = useAppState();
  const faces = state.facez || [];
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [server, setServer] = useState(null); // { mine, feed } when live
  const [view, setView] = useState("mine"); // mine | rate

  const reload = () => getFacezApi().then(setServer).catch(() => setServer(null));
  useEffect(() => { if (serverOk) reload(); else setServer(null); }, [serverOk]);

  const add = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      if (server) { await createFaceApi(file, name.trim()); await reload(); }
      else {
        const img = await fileToThumb(file);
        setList("facez", [{ id: `f-${Date.now()}`, name: name.trim() || "Untitled face", img, ratings: [], at: Date.now() }, ...faces]);
      }
      setName("");
    } catch { /* ignore bad image */ }
    setBusy(false);
  };

  const rateLocal = (id, score) => setList("facez", faces.map((f) => (f.id === id ? { ...f, ratings: [...(f.ratings || []), score] } : f)));
  const delLocal = (id) => setList("facez", faces.filter((f) => f.id !== id));
  const rateServer = async (id, score) => { try { await rateFaceApi(id, score); reload(); } catch { /* ignore */ } };
  const delServer = async (id) => { try { await deleteFaceApi(id); reload(); } catch { /* ignore */ } };

  const intro = (
    <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 10 }}>
      Bank faces from your media — Image &amp; Video ConnectZ pull from here for likeness. The community rates each face's attractiveness out of 10, and that median feeds your RateZ score / venue filter.
    </p>
  );
  const adder = (
    <>
      <div className="form-group"><label>Name this face (optional)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., My promo look" /></div>
      <label className="btn" style={{ width: "100%", display: "block", textAlign: "center", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}>
        {busy ? "Adding…" : "＋ Add face from your media"}
        <input type="file" accept="image/*" style={{ display: "none" }} disabled={busy} onChange={add} />
      </label>
    </>
  );

  // Live: two sub-views — your faces (with community medians) and a feed to rate.
  if (server) {
    return (
      <div className="card">
        <div className="card-header">🙂 FaceZ <span className="tag" style={{ color: "var(--success)" }}>● live</span></div>
        {intro}
        <div className="chip-wrap" style={{ marginBottom: 8 }}>
          <button className={`heritage-chip${view === "mine" ? " sel" : ""}`} onClick={() => setView("mine")}>My FaceZ ({server.mine.length})</button>
          <button className={`heritage-chip${view === "rate" ? " sel" : ""}`} onClick={() => setView("rate")}>Rate faces ({server.feed.length})</button>
        </div>
        {view === "mine" ? (
          <>
            {adder}
            {server.mine.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 12 }}>No faces banked yet.</p>
              : server.mine.map((f) => <FaceCard key={f.id} f={f} live onDelete={delServer} />)}
          </>
        ) : (
          server.feed.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No community faces to rate yet.</p>
            : server.feed.map((f) => <FaceCard key={f.id} f={f} live onRate={rateServer} />)
        )}
      </div>
    );
  }

  // Offline fallback: local face bank with self-ratings.
  return (
    <div className="card">
      <div className="card-header">🙂 FaceZ <span className="tag">offline</span></div>
      {intro}
      {adder}
      {faces.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 12 }}>No faces banked yet.</p>
      ) : faces.map((f) => <FaceCard key={f.id} f={f} live={false} onRate={rateLocal} onDelete={delLocal} />)}
    </div>
  );
}

function IntelligencePage({ tier, onOpen, serverOk }) {
  const [app, setApp] = useState("facez");
  const Body = { facez: FaceZTab, image: ImageConnectZ, instrumental: InstrumentalConnectZ, mix: MixConnectZ, video: VideoConnectZ, sentence: SentenceConnectZ, occ: OccWorkspace }[app];
  return (
    <>
      <div className="launch-grid" style={{ marginBottom: 14 }}>
        {INTEL_APPS.map((a) => (
          <button key={a.id} className={`app-tile${app === a.id ? " active" : ""}`} onClick={() => setApp(a.id)}>
            <span className="tile-icon"><IconImg icon={a.icon} alt={a.name} /></span>
            <span className="tile-name">{a.name.replace(" ConnectZ", "")}</span>
          </button>
        ))}
      </div>
      <Body tier={tier} onOpen={onOpen} serverOk={serverOk} />
    </>
  );
}

function FileZPage({ serverOk }) {
  const [state, setState] = useState(null); // { uploads, storage_used_mb, storage_mb, upload_mb, storage_free_mb }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [offline, setOffline] = useState(false);

  const load = () => {
    getUploadsApi().then((r) => { setState(r); setOffline(false); }).catch(() => setOffline(true));
  };
  useEffect(() => { if (serverOk) load(); else setOffline(true); }, [serverOk]);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setErr(""); setBusy(true);
    try {
      const r = await uploadFileApi(file); // server enforces size (413) + quota (409)
      setState(r.upload ? { ...r, uploads: [r.upload, ...(state?.uploads || [])] } : r);
      load();
    } catch (e2) {
      setErr(e2.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setErr("");
    try { const r = await deleteUploadApi(id); setState((s) => ({ ...s, ...r, uploads: (s?.uploads || []).filter((u) => u.id !== id) })); }
    catch (e2) { setErr(e2.message || "Delete failed"); }
  };

  if (offline || !serverOk) {
    return (
      <div className="card">
        <div className="card-header">📁 FileZ <span className="tag">offline</span></div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          🔌 File uploads need a live connection to the storage backend. Storage caps by tier: Free 400MB · Premium 5GB · StatZ 100GB — enforced server-side once connected.
        </p>
      </div>
    );
  }

  const usedMb = state?.storage_used_mb ?? 0;
  const capMb = state?.storage_mb ?? 0;
  const pct = capMb ? Math.min(100, (usedMb / capMb) * 100) : 0;
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">📁 FileZ <span className="tag" style={{ color: "var(--success)" }}>● live</span></div>
        <div className="balance-info">
          Storage: <strong>{mbLabel(usedMb)}</strong> of {mbLabel(capMb)} used · {mbLabel(state?.storage_free_mb ?? 0)} free · max {mbLabel(state?.upload_mb ?? 0)}/file
        </div>
        <div style={{ height: 8, borderRadius: 6, background: "rgba(255,255,255,0.08)", overflow: "hidden", margin: "10px 0" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct > 90 ? "var(--danger)" : "var(--accent, #22e6ff)", transition: "width .3s" }} />
        </div>
        <label className="btn" style={{ width: "100%", display: "block", textAlign: "center", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? "⏳ Uploading…" : "⬆️ Upload file"}
          <input type="file" style={{ display: "none" }} disabled={busy} onChange={pick} />
        </label>
        {err && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 8 }}>⚠️ {err}</p>}
      </div>
      <div className="card">
        <div className="card-header">🗂️ Your Files</div>
        {(!state?.uploads || state.uploads.length === 0) ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No files yet — upload one above.</p>
        ) : state.uploads.map((u) => (
          <div key={u.id} className="skill-item">
            <span className="skill-item-name">
              {u.url ? <a href={u.url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>📄 {u.name}</a> : `📄 ${u.name}`}
            </span>
            <span className="skill-item-exp" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {mbLabel(u.size_mb)}
              <button className="btn btn-small btn-secondary" onClick={() => remove(u.id)} title="Delete">🗑️</button>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function GameZPage() {
  const { state, setList } = useAppState();
  const [genre, setGenre] = useState("All");
  const [sub, setSub] = useState("All");
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState(null);

  // User-made games (published from OCC) sit on top of the seed catalog.
  const all = [...(state.games || []), ...SEED_GAMES];
  const subs = genre === "All" ? [] : subgenresFor(genre);
  const query = q.trim().toLowerCase();
  const games = all.filter((g) => {
    if (genre !== "All" && g.genre !== genre) return false;
    if (sub !== "All" && g.subgenre !== sub) return false;
    if (query && !(`${g.title} ${g.author} ${g.desc || ""}`.toLowerCase().includes(query))) return false;
    return true;
  });

  const pickGenre = (name) => { setGenre(name); setSub("All"); };
  const play = (g) => {
    setPlaying(g);
    // Count the play on user-made games (seed games are static demo data).
    if ((state.games || []).some((x) => x.id === g.id)) {
      setList("games", state.games.map((x) => (x.id === g.id ? { ...x, plays: (x.plays || 0) + 1 } : x)));
    }
  };

  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">👾 GameZ</div>
        <div className="balance-info">{all.length} user-made games from Ocular Code ConnectZ · sorted by genre &amp; subgenre</div>
        <div className="form-group" style={{ marginTop: 10 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Search games, creators…" />
        </div>
      </div>

      <div className="card">
        <div className="card-header">🎮 Genre</div>
        <div className="chip-wrap">
          <button className={`heritage-chip${genre === "All" ? " sel" : ""}`} onClick={() => pickGenre("All")}>All</button>
          {GAME_GENRES.map((g) => (
            <button key={g.name} className={`heritage-chip${genre === g.name ? " sel" : ""}`} onClick={() => pickGenre(g.name)}>{g.emoji} {g.name}</button>
          ))}
        </div>
        {subs.length > 0 && (
          <>
            <div className="modal-sub-title" style={{ margin: "12px 0 6px" }}>Subgenre</div>
            <div className="chip-wrap">
              <button className={`heritage-chip${sub === "All" ? " sel" : ""}`} onClick={() => setSub("All")}>All</button>
              {subs.map((s) => (
                <button key={s} className={`heritage-chip${sub === s ? " sel" : ""}`} onClick={() => setSub(s)}>{s}</button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-header"><span>🕹️ {genre === "All" ? "All Games" : genre}{sub !== "All" ? ` · ${sub}` : ""}</span><span className="tag">{games.length}</span></div>
        {games.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No games match — try a different genre or search.</p>
        ) : games.map((g) => (
          <div key={g.id} className="post-card">
            <div className="post-user">{genreEmoji(g.genre)} {g.title} {g.mine && <span className="tag" style={{ color: "var(--success)" }}>yours</span>}</div>
            <div className="post-content">{g.desc}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
              <span className="tag">{g.genre}</span>
              {g.subgenre && <span className="tag">{g.subgenre}</span>}
              <span className="tag">💻 {g.lang}</span>
              <span className="tag">▶ {(g.plays || 0).toLocaleString()}</span>
              {g.rating != null && <span className="tag">⭐ {g.rating}</span>}
            </div>
            <div className="post-meta" style={{ marginBottom: 8 }}>by @{g.author}</div>
            <button className="btn btn-small" onClick={() => play(g)}>▶ Play</button>
          </div>
        ))}
      </div>

      {playing && (
        <div className="modal" onClick={() => setPlaying(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title"><h2>{genreEmoji(playing.genre)} {playing.title}</h2></div><button className="close-btn" onClick={() => setPlaying(null)}>×</button></div>
            <div style={{ padding: 4 }}>
              <div style={{ height: 160, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(34,230,255,0.25))", fontSize: 40 }}>
                {genreEmoji(playing.genre)}
              </div>
              <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 12 }}>
                {playing.desc}
              </p>
              <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 8 }}>
                {playing.genre} · {playing.subgenre} · built in {playing.lang} by @{playing.author}. The in-browser player streams from the creator's OCC build — real playable builds land with the GameZ runtime.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DawZPage({ onOpen }) {
  const { state, update } = useAppState();
  const votes = state.dawVotes || {};
  const vote = (id) => update({ dawVotes: { ...votes, [id]: (votes[id] || 0) + 1 } });
  // Most-voted first so the crowd's pick floats to the top of the build queue.
  const ranked = [...DAWS].sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0));
  const totalVotes = Object.values(votes).reduce((s, n) => s + n, 0);
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">🎛️ DawZ — Build Queue</div>
        <div className="balance-info">
          The engines aren't built yet. Tap <strong>Vote</strong> to push a DAW up the queue — most-voted gets built first. {totalVotes} vote{totalVotes === 1 ? "" : "s"} cast.
        </div>
      </div>
      {ranked.map((d) => {
        const count = votes[d.id] || 0;
        return (
          <div key={d.id} className="post-card">
            <div className="post-user" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconImg icon={d.icon} alt={d.name} style={{ width: 30, height: 30, borderRadius: 8 }} />
              {d.emoji} {d.name}
              {d.built ? <span className="tag" style={{ color: "var(--success)" }}>● built</span> : <span className="tag">🔨 coming soon</span>}
            </div>
            <div className="post-content" style={{ margin: "6px 0" }}>{d.desc}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              <span className="tag">knockoff of {d.knockoff}</span>
              <span className="tag">🗳️ {count} vote{count === 1 ? "" : "s"}</span>
            </div>
            {d.built ? (
              <button className="btn btn-small btn-success" onClick={() => onOpen?.(d.id)}>▶ Open {d.name}</button>
            ) : (
              <button className="btn btn-small" onClick={() => vote(d.id)}>🗳️ Vote to build</button>
            )}
          </div>
        );
      })}
    </>
  );
}

// Rich-text (Microsoft Word-style) editor for SentenceZ.
const SZ_TOOLS = [
  { cmd: "bold", label: "B", style: { fontWeight: 800 } },
  { cmd: "italic", label: "I", style: { fontStyle: "italic" } },
  { cmd: "underline", label: "U", style: { textDecoration: "underline" } },
  { cmd: "insertUnorderedList", label: "• List" },
  { cmd: "insertOrderedList", label: "1. List" },
  { cmd: "justifyLeft", label: "⬅" },
  { cmd: "justifyCenter", label: "⬌" },
  { cmd: "justifyRight", label: "➡" },
];
function SentenceZPage() {
  const { state, setList } = useAppState();
  const docs = state.sentenceDocs || [];
  const [openId, setOpenId] = useState(null);
  const [title, setTitle] = useState("");
  const [saved, setSaved] = useState("");
  const bodyRef = useRef(null);

  const exec = (cmd) => { document.execCommand(cmd, false, null); bodyRef.current?.focus(); };
  const block = (tag) => { document.execCommand("formatBlock", false, tag); bodyRef.current?.focus(); };

  const openDoc = (d) => { setOpenId(d.id); setTitle(d.title); setSaved(""); setTimeout(() => { if (bodyRef.current) bodyRef.current.innerHTML = d.html || ""; }, 0); };
  const newDoc = () => { setOpenId("new"); setTitle(""); setSaved(""); setTimeout(() => { if (bodyRef.current) bodyRef.current.innerHTML = ""; }, 0); };

  const save = () => {
    const html = bodyRef.current?.innerHTML || "";
    const text = bodyRef.current?.innerText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const name = title.trim() || "Untitled";
    if (openId && openId !== "new") {
      setList("sentenceDocs", docs.map((d) => (d.id === openId ? { ...d, title: name, html, words, at: Date.now() } : d)));
    } else {
      const id = `doc-${Date.now()}`;
      setList("sentenceDocs", [{ id, title: name, html, words, at: Date.now() }, ...docs]);
      setOpenId(id);
    }
    setSaved("Saved ✓");
    setTimeout(() => setSaved(""), 1500);
  };

  const del = (id) => { setList("sentenceDocs", docs.filter((d) => d.id !== id)); if (openId === id) setOpenId(null); };

  if (openId) {
    return (
      <>
        <div className="stripe-section">
          <button className="btn btn-secondary btn-small" onClick={() => setOpenId(null)} style={{ marginBottom: 8 }}>‹ Documents</button>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" style={{ fontWeight: 700 }} />
        </div>
        <div className="card" style={{ padding: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
            <button className="btn btn-small btn-secondary" onClick={() => block("H1")}>H1</button>
            <button className="btn btn-small btn-secondary" onClick={() => block("H2")}>H2</button>
            <button className="btn btn-small btn-secondary" onClick={() => block("P")}>¶</button>
            {SZ_TOOLS.map((t) => (
              <button key={t.cmd} className="btn btn-small btn-secondary" style={t.style} onClick={() => exec(t.cmd)}>{t.label}</button>
            ))}
          </div>
          <div
            ref={bodyRef}
            contentEditable
            suppressContentEditableWarning
            className="sz-editor"
            style={{ minHeight: 260, outline: "none", background: "#fff", color: "#111", padding: 16, borderRadius: 8, lineHeight: 1.6, overflowY: "auto" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <span style={{ fontSize: 11, color: "var(--text-light)" }}>{saved || "Autosaves to your account on Save"}</span>
            <button className="btn btn-small btn-success" onClick={save}>💾 Save</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">📝 SentenceZ</div>
        <div className="balance-info">A Word-style text editor — write, format, and save documents right here.</div>
        <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={newDoc}>＋ New document</button>
      </div>
      <div className="card">
        <div className="card-header"><span>🗂️ Your Documents</span><span className="tag">{docs.length}</span></div>
        {docs.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No documents yet — start one above.</p>
        ) : docs.map((d) => (
          <div key={d.id} className="skill-item">
            <span className="skill-item-name" style={{ cursor: "pointer" }} onClick={() => openDoc(d)}>📄 {d.title} <span style={{ fontSize: 11, color: "var(--text-light)" }}>· {d.words || 0} words</span></span>
            <span className="skill-item-exp" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {new Date(d.at).toLocaleDateString()}
              <button className="btn btn-small btn-secondary" onClick={() => del(d.id)} title="Delete">🗑️</button>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// VideoZ — a Sony Vegas-style multitrack timeline editor.
const VZ_CLIP_TYPES = [
  { id: "video", label: "🎬 Video", track: "video", color: "#7c5cff" },
  { id: "image", label: "🖼️ Image", track: "video", color: "#22a7ff" },
  { id: "text", label: "🔤 Title", track: "video", color: "#ff8f3f" },
  { id: "transition", label: "✨ Transition", track: "video", color: "#ff2bd1" },
  { id: "audio", label: "🎵 Audio", track: "audio", color: "#22e6ff" },
];
function fmtSecs(s) { const m = Math.floor(s / 60), r = s % 60; return `${m}:${String(r).padStart(2, "0")}`; }

function VideoZPage() {
  const { state, setList } = useAppState();
  const projects = state.videoProjects || [];
  const [openId, setOpenId] = useState(null);
  const [name, setName] = useState("");
  const [clips, setClips] = useState([]);
  const [form, setForm] = useState({ label: "", type: "video", seconds: 5 });
  const [saved, setSaved] = useState("");

  const openProj = (p) => { setOpenId(p.id); setName(p.name); setClips(p.clips || []); setSaved(""); };
  const newProj = () => { setOpenId("new"); setName(""); setClips([]); setSaved(""); };

  const addClip = () => {
    const label = form.label.trim() || VZ_CLIP_TYPES.find((t) => t.id === form.type).label.replace(/^\S+\s/, "");
    const track = VZ_CLIP_TYPES.find((t) => t.id === form.type).track;
    setClips((c) => [...c, { id: `c-${Date.now()}`, label, type: form.type, track, seconds: Math.max(1, Number(form.seconds) || 1) }]);
    setForm({ ...form, label: "" });
  };
  const trim = (id, delta) => setClips((c) => c.map((x) => (x.id === id ? { ...x, seconds: Math.max(1, x.seconds + delta) } : x)));
  const move = (id, dir) => setClips((c) => {
    const track = c.find((x) => x.id === id).track;
    const lane = c.filter((x) => x.track === track);
    const i = lane.findIndex((x) => x.id === id);
    const j = i + dir;
    if (j < 0 || j >= lane.length) return c;
    [lane[i], lane[j]] = [lane[j], lane[i]];
    const other = c.filter((x) => x.track !== track);
    return track === "video" ? [...lane, ...other] : [...other, ...lane];
  });
  const del = (id) => setClips((c) => c.filter((x) => x.id !== id));

  const save = () => {
    const proj = { id: openId !== "new" ? openId : `vp-${Date.now()}`, name: name.trim() || "Untitled Project", clips, at: Date.now() };
    if (openId !== "new") setList("videoProjects", projects.map((p) => (p.id === openId ? proj : p)));
    else { setList("videoProjects", [proj, ...projects]); setOpenId(proj.id); }
    setSaved("Saved ✓"); setTimeout(() => setSaved(""), 1500);
  };

  const lane = (track) => clips.filter((c) => c.track === track);
  const runtime = Math.max(lane("video").reduce((s, c) => s + c.seconds, 0), lane("audio").reduce((s, c) => s + c.seconds, 0));

  const Track = ({ track, title }) => {
    const items = lane(track);
    const total = items.reduce((s, c) => s + c.seconds, 0) || 1;
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 4 }}>{title} · {fmtSecs(items.reduce((s, c) => s + c.seconds, 0))}</div>
        <div style={{ display: "flex", gap: 3, background: "#0c0a16", borderRadius: 8, padding: 4, minHeight: 46, overflowX: "auto" }}>
          {items.length === 0 ? <span style={{ fontSize: 11, color: "var(--text-light)", alignSelf: "center", padding: 6 }}>empty</span> :
            items.map((c) => {
              const col = VZ_CLIP_TYPES.find((t) => t.id === c.type)?.color || "#7c5cff";
              return (
                <div key={c.id} onClick={() => setForm((f) => ({ ...f }))}
                  style={{ flex: `0 0 ${Math.max(48, (c.seconds / total) * 240)}px`, background: `${col}33`, border: `1px solid ${col}`, borderRadius: 6, padding: "4px 6px", fontSize: 10, color: "#fff", position: "relative" }}>
                  <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</div>
                  <div style={{ color: "var(--text-light)" }}>{fmtSecs(c.seconds)}</div>
                  <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
                    <button className="btn btn-small btn-secondary" style={{ padding: "0 5px", fontSize: 10 }} onClick={() => move(c.id, -1)}>‹</button>
                    <button className="btn btn-small btn-secondary" style={{ padding: "0 5px", fontSize: 10 }} onClick={() => trim(c.id, -1)}>−</button>
                    <button className="btn btn-small btn-secondary" style={{ padding: "0 5px", fontSize: 10 }} onClick={() => trim(c.id, 1)}>+</button>
                    <button className="btn btn-small btn-secondary" style={{ padding: "0 5px", fontSize: 10 }} onClick={() => move(c.id, 1)}>›</button>
                    <button className="btn btn-small btn-secondary" style={{ padding: "0 5px", fontSize: 10 }} onClick={() => del(c.id)}>🗑️</button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  if (openId) {
    return (
      <>
        <div className="stripe-section">
          <button className="btn btn-secondary btn-small" onClick={() => setOpenId(null)} style={{ marginBottom: 8 }}>‹ Projects</button>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" style={{ fontWeight: 700 }} />
          <div className="balance-info" style={{ marginTop: 6 }}>Total runtime: <strong>{fmtSecs(runtime)}</strong> · {clips.length} clip{clips.length === 1 ? "" : "s"}</div>
        </div>
        <div className="card">
          <div className="card-header">➕ Add clip</div>
          <div className="chip-wrap" style={{ marginBottom: 8 }}>
            {VZ_CLIP_TYPES.map((t) => (
              <button key={t.id} className={`heritage-chip${form.type === t.id ? " sel" : ""}`} onClick={() => setForm({ ...form, type: t.id })}>{t.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Clip name" style={{ flex: 2 }} />
            <input type="number" min="1" value={form.seconds} onChange={(e) => setForm({ ...form, seconds: e.target.value })} placeholder="sec" style={{ flex: 1 }} />
          </div>
          <button className="btn btn-small" style={{ width: "100%", marginTop: 8 }} onClick={addClip}>➕ Add to timeline</button>
        </div>
        <div className="card">
          <div className="card-header">🎞️ Timeline</div>
          <Track track="video" title="🎬 Video / Titles" />
          <Track track="audio" title="🎵 Audio" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 10, color: "var(--text-light)" }}>{saved || "Export/render arrives with the render backend."}</span>
            <button className="btn btn-small btn-success" onClick={save}>💾 Save project</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">🎬 VideoZ <span className="tag">Sony Vegas-style</span></div>
        <div className="balance-info">Build videos on a multitrack timeline — clips, titles, and audio.</div>
        <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={newProj}>＋ New project</button>
      </div>
      <div className="card">
        <div className="card-header"><span>🗂️ Your Projects</span><span className="tag">{projects.length}</span></div>
        {projects.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No projects yet — start one above.</p>
        ) : projects.map((p) => {
          const rt = (p.clips || []).filter((c) => c.track === "video").reduce((s, c) => s + c.seconds, 0);
          return (
            <div key={p.id} className="skill-item">
              <span className="skill-item-name" style={{ cursor: "pointer" }} onClick={() => openProj(p)}>🎬 {p.name} <span style={{ fontSize: 11, color: "var(--text-light)" }}>· {(p.clips || []).length} clips · {fmtSecs(rt)}</span></span>
              <span className="skill-item-exp" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {new Date(p.at).toLocaleDateString()}
                <button className="btn btn-small btn-secondary" onClick={() => setList("videoProjects", projects.filter((x) => x.id !== p.id))} title="Delete">🗑️</button>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

const VENUE_TYPES = [
  { id: "party", label: "🎉 Party" },
  { id: "openmic", label: "🎙️ Open mic" },
  { id: "theater", label: "🏟️ Theater" },
  { id: "show", label: "🎞️ Show" },
  { id: "custom", label: "❓ Custom" },
];
const SEED_VENUES = [
  { id: "v-seed-1", title: "Rooftop Cypher", mode: "collaborative", type: "openmic", host: "Kaya", hostPrice: 10, visitorPay: 8, minAttract: 6, seed: true },
  { id: "v-seed-2", title: "Neon Nights Showcase", mode: "performance", type: "show", host: "Azrael", hostPrice: 15, minAttract: 0, seed: true },
  { id: "v-seed-3", title: "Midnight Theater Set", mode: "performance", type: "theater", host: "Lilith", hostPrice: 25, minAttract: 7, seed: true },
];

// Normalize a server venue (cents/host_price_cents) to the local shape.
function fromServerVenue(v) {
  return {
    id: v.id, title: v.title, mode: v.mode, type: v.vtype, customName: v.custom_name,
    host: v.host, mine: v.mine, hostPrice: v.host_price_cents / 100,
    visitorPay: v.visitor_pay_cents / 100, minAttract: v.min_attract, attending: v.attending, live: true,
  };
}

function VenueZPage({ tier, serverOk, syncEconomy }) {
  const { state, updateWallet, addTo, setList } = useAppState();
  const [tab, setTab] = useState("discover"); // discover | host
  const [form, setForm] = useState({ title: "", mode: "collaborative", type: "party", custom: "", hostPrice: 10, visitorPay: 5, minAttract: 0 });
  const [msg, setMsg] = useState("");
  const [serverVenues, setServerVenues] = useState(null); // null = not loaded / offline
  const [myAttractServer, setMyAttractServer] = useState(null);

  // Live data when the backend is reachable; local fallback otherwise.
  useEffect(() => {
    if (!serverOk) { setServerVenues(null); return; }
    getVenuesApi().then((r) => setServerVenues(r.venues.map(fromServerVenue))).catch(() => setServerVenues(null));
    getAttractivenessApi().then((r) => setMyAttractServer(r.median)).catch(() => {});
  }, [serverOk]);

  const localAttract = (() => {
    const r = (state.facez || []).flatMap((f) => f.ratings || []);
    return r.length ? r.reduce((s, n) => s + n, 0) / r.length : null;
  })();
  const myAttract = serverVenues ? myAttractServer : localAttract;

  const venues = serverVenues ? serverVenues : [...(state.venues || []), ...SEED_VENUES];

  const create = async () => {
    if (!form.title.trim()) return;
    if (serverVenues) {
      try {
        await createVenueApi({
          title: form.title.trim(), mode: form.mode, vtype: form.type,
          custom_name: form.type === "custom" ? form.custom.trim() : "",
          host_price_cents: Math.round((Number(form.hostPrice) || 0) * 100),
          visitor_pay_cents: Math.round((Number(form.visitorPay) || 0) * 100),
          min_attract: Number(form.minAttract) || 0,
        });
        const r = await getVenuesApi();
        setServerVenues(r.venues.map(fromServerVenue));
        setForm({ title: "", mode: "collaborative", type: "party", custom: "", hostPrice: 10, visitorPay: 5, minAttract: 0 });
        setTab("discover");
        return;
      } catch (e) { setMsg(e.message || "Could not publish venue"); return; }
    }
    const v = {
      id: `v-${Date.now()}`, title: form.title.trim(), mode: form.mode,
      type: form.type, customName: form.type === "custom" ? form.custom.trim() : "",
      host: state.user?.name || "you", hostPrice: Number(form.hostPrice) || 0,
      visitorPay: form.mode === "collaborative" ? Number(form.visitorPay) || 0 : 0,
      minAttract: Number(form.minAttract) || 0, at: Date.now(),
    };
    setList("venues", [v, ...(state.venues || [])]);
    setForm({ title: "", mode: "collaborative", type: "party", custom: "", hostPrice: 10, visitorPay: 5, minAttract: 0 });
    setTab("discover");
  };

  const join = async (v) => {
    setMsg("");
    if (v.live) {
      try {
        const r = await joinVenueApi(v.id); // server moves money between wallets + enforces gate/tax
        updateWallet({ balance: r.wallet.money });
        addTo("paymentHistory", { amount: -(r.paid_cents / 100), at: Date.now(), note: `VenueZ: ${v.title} (attend)` });
        if (r.earned_cents) addTo("paymentHistory", { amount: r.earned_cents / 100, at: Date.now(), note: `VenueZ: ${v.title} (skill payout)` });
        setMsg(`✅ Joined ${v.title}${r.earned_cents ? ` · earned ${money(r.earned_cents / 100)}` : ""}.`);
        getVenuesApi().then((rr) => setServerVenues(rr.venues.map(fromServerVenue))).catch(() => {});
        syncEconomy?.();
        return;
      } catch (e) { setMsg(e.message || "Could not join"); return; }
    }
    if (myAttract != null && v.minAttract > 0 && myAttract < v.minAttract) {
      setMsg(`🔒 ${v.title} needs an attractiveness of ${v.minAttract}+ — yours is ${myAttract.toFixed(1)}.`);
      return;
    }
    const bal = Number(state.wallet.balance) || 0;
    if (bal < v.hostPrice) { setMsg(`Need ${money(v.hostPrice)} to attend — add funds.`); return; }
    const paid = splitTransaction(v.hostPrice, tier);
    let newBal = bal - v.hostPrice;
    addTo("paymentHistory", { amount: -v.hostPrice, dev: paid.dev, at: Date.now(), note: `VenueZ: ${v.title} (attend)` });
    let earnNote = "";
    if (v.mode === "collaborative" && v.visitorPay > 0) {
      const earn = splitTransaction(v.visitorPay, tier);
      newBal += earn.net;
      addTo("paymentHistory", { amount: earn.net, dev: earn.dev, at: Date.now(), note: `VenueZ: ${v.title} (skill payout)` });
      earnNote = ` · earned ${money(earn.net)} for your skill`;
    }
    updateWallet({ balance: Number(newBal.toFixed(2)) });
    setMsg(`✅ Joined ${v.title} — paid ${money(v.hostPrice)} to ${v.host}${earnNote}.`);
    syncEconomy?.();
  };

  const typeLabel = (v) => v.type === "custom" ? `❓ ${v.customName || "Custom"}` : VENUE_TYPES.find((t) => t.id === v.type)?.label || v.type;

  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">🏛️ VenueZ</div>
        <div className="balance-info">Go places with your music · Balance {money(state.wallet.balance)} · your attractiveness {myAttract != null ? myAttract.toFixed(1) : "—"}/10</div>
        <div className="chip-wrap" style={{ marginTop: 8 }}>
          <button className={`heritage-chip${tab === "discover" ? " sel" : ""}`} onClick={() => setTab("discover")}>🔎 Discover</button>
          <button className={`heritage-chip${tab === "host" ? " sel" : ""}`} onClick={() => setTab("host")}>🏛️ Host a venue</button>
        </div>
        {msg && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>{msg}</p>}
      </div>

      {tab === "host" ? (
        <div className="card">
          <div className="card-header">🏛️ Host a venue</div>
          <div className="form-group"><label>Event name</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Name your event" /></div>
          <label style={{ fontSize: 11, color: "var(--text-light)" }}>Mode</label>
          <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
            <button className={`heritage-chip${form.mode === "collaborative" ? " sel" : ""}`} onClick={() => setForm({ ...form, mode: "collaborative" })}>🤝 Collaborative</button>
            <button className={`heritage-chip${form.mode === "performance" ? " sel" : ""}`} onClick={() => setForm({ ...form, mode: "performance" })}>🤩 Performance</button>
          </div>
          <p style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 8 }}>
            {form.mode === "collaborative" ? "Visitors get paid their skill price and pay you yours." : "Visitors pay you (your SkillZ or a custom price) to attend."}
          </p>
          <label style={{ fontSize: 11, color: "var(--text-light)" }}>Type</label>
          <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
            {VENUE_TYPES.map((t) => <button key={t.id} className={`heritage-chip${form.type === t.id ? " sel" : ""}`} onClick={() => setForm({ ...form, type: t.id })}>{t.label}</button>)}
          </div>
          {form.type === "custom" && (
            <div className="form-group"><label>Custom type name</label><input value={form.custom} onChange={(e) => setForm({ ...form, custom: e.target.value })} placeholder="Name your event type" /></div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <div className="form-group" style={{ flex: 1 }}><label>Host price ($)</label><input type="number" min="0" value={form.hostPrice} onChange={(e) => setForm({ ...form, hostPrice: e.target.value })} /></div>
            {form.mode === "collaborative" && <div className="form-group" style={{ flex: 1 }}><label>Visitor payout ($)</label><input type="number" min="0" value={form.visitorPay} onChange={(e) => setForm({ ...form, visitorPay: e.target.value })} /></div>}
          </div>
          <div className="form-group"><label>Min attractiveness filter: {form.minAttract}/10</label><input type="range" min="0" max="10" value={form.minAttract} onChange={(e) => setForm({ ...form, minAttract: e.target.value })} /></div>
          <p style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 8 }}>Developer tax ({devTaxFor(tier).label} {Math.round(devTaxFor(tier).rate * 100)}%) is applied to every VenueZ payment.</p>
          <button className="btn btn-success" style={{ width: "100%" }} disabled={!form.title.trim()} onClick={create}>➕ Publish venue</button>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <span>🔎 Venues {serverVenues ? <span className="tag" style={{ color: "var(--success)" }}>● live</span> : <span className="tag">offline</span>}</span>
            <span className="tag">{venues.length}</span>
          </div>
          {venues.length === 0 && <p style={{ fontSize: 12, color: "var(--text-light)" }}>No venues yet — host one.</p>}
          {venues.map((v) => {
            const mine = v.live ? v.mine : !v.seed;
            const locked = !mine && myAttract != null && v.minAttract > 0 && myAttract < v.minAttract;
            return (
              <div key={v.id} className="post-card">
                <div className="post-user">{typeLabel(v)} · {v.title} {mine ? <span className="tag" style={{ color: "var(--success)" }}>yours</span> : ""}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0" }}>
                  <span className="tag">{v.mode === "collaborative" ? "🤝 Collaborative" : "🤩 Performance"}</span>
                  <span className="tag">host @{v.host}</span>
                  <span className="tag">attend {money(v.hostPrice)}</span>
                  {v.mode === "collaborative" && v.visitorPay > 0 && <span className="tag" style={{ color: "var(--success)" }}>earn {money(v.visitorPay)}</span>}
                  {v.minAttract > 0 && <span className="tag" style={{ color: locked ? "var(--danger)" : undefined }}>💯 {v.minAttract}+</span>}
                </div>
                {!mine && <CostBreakdown amount={v.hostPrice} tier={tier} recipient={`@${v.host}`} payLabel="You pay to attend" />}
                {mine ? (
                  <span className="tag">🏛️ You're hosting this</span>
                ) : v.attending ? (
                  <span className="tag" style={{ color: "var(--success)" }}>✓ Attending</span>
                ) : (
                  <button className="btn btn-small" style={{ marginTop: 6, opacity: locked ? 0.5 : 1 }} disabled={locked} onClick={() => join(v)}>
                    {locked ? `🔒 Needs ${v.minAttract}+ attractiveness` : v.mode === "collaborative" ? "🤝 Join & collaborate" : "🎟️ Pay & attend"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function CallZPage({ tier, onOpen }) {
  const { state, updateWallet, addTo } = useAppState();
  const isStatz = /stat[sz]/i.test(tier || "");
  const [mode, setMode] = useState("ai"); // ai | user
  const [method, setMethod] = useState("cash"); // cash | spinaz
  const [aiModel, setAiModel] = useState(AI_MODELS[0].id);
  const [callee, setCallee] = useState(CALLABLE_USERS[0].id);
  const [session, setSession] = useState(null); // { startedAt, seconds }
  const balance = Number(state.wallet.balance || 0);

  // Live call timer: tick once a second while a call is active.
  useEffect(() => {
    if (!session) return undefined;
    const t = setInterval(() => setSession((s) => (s ? { ...s, seconds: s.seconds + 1 } : s)), 1000);
    return () => clearInterval(t);
  }, [session?.startedAt]);

  // Auto-hang-up when the running cost reaches the wallet balance (calls are
  // billed from cash, so you can't run a negative balance).
  useEffect(() => {
    if (session && callCost(session.seconds, session.rate, session.unit) >= balance) {
      endCall(session, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.seconds, balance]);

  if (!isStatz) {
    return (
      <div className="card">
        <div className="card-header">📞 CallZ — StatZ only</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          🔒 CallZ is a <strong>StatZ</strong> feature. Upgrade to place live AI calls (billed per minute) and user calls
          (billed per hour) straight from your cash balance.
        </p>
        <UpgradeCTA onOpen={onOpen} label="👑 Upgrade to StatZ" />
      </div>
    );
  }

  const aiPick = AI_MODELS.find((m) => m.id === aiModel);
  const userPick = CALLABLE_USERS.find((u) => u.id === callee);
  const rate = mode === "ai" ? aiPick.perMin : userPick.perHour;
  const unit = mode === "ai" ? AI_UNIT_SECONDS : USER_UNIT_SECONDS;
  const rateLabel = mode === "ai" ? `${money(rate)}/min` : `${money(rate)}/hr`;

  const start = () => {
    if (method === "spinaz" || balance <= 0 || session) return;
    setSession({
      startedAt: Date.now(), seconds: 0, rate, unit,
      who: mode === "ai" ? aiPick.name : userPick.name,
      mode,
    });
  };

  const endCall = (s = session, autoEnded = false) => {
    if (!s) return;
    const gross = Math.min(Number(callCost(s.seconds, s.rate, s.unit).toFixed(2)), balance);
    if (gross > 0) {
      const { dev } = splitTransaction(gross, tier); // developer tax on the call spend
      updateWallet({ balance: Number((balance - gross).toFixed(2)) });
      addTo("paymentHistory", { amount: -gross, dev, at: Date.now(), note: `CallZ · ${s.mode === "ai" ? "AI" : "User"}: ${s.who}` });
      addTo("callLog", { id: Date.now(), who: s.who, mode: s.mode, seconds: s.seconds, cost: gross, autoEnded, at: Date.now() });
    }
    setSession(null);
  };

  const runningCost = session ? callCost(session.seconds, session.rate, session.unit) : 0;
  const canCall = method === "cash" && balance > 0 && !session;

  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">📞 CallZ <span className="tag" style={{ color: "var(--gold, #ffcf3f)" }}>StatZ</span></div>
        <div className="balance-info">Balance: <strong>{money(balance)}</strong> · Calls bill your cash wallet · {devTaxFor(tier).label} developer tax {Math.round(devTaxFor(tier).rate * 100)}% on every call</div>
      </div>

      {/* Active call panel */}
      {session && (
        <div className="card" style={{ textAlign: "center", border: "1px solid var(--accent, #22e6ff)" }}>
          <div className="card-header" style={{ justifyContent: "center" }}>🟢 On call — {session.who}</div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 1 }}>{fmtDuration(session.seconds)}</div>
          <div style={{ fontSize: 12, color: "var(--text-light)", margin: "6px 0 12px" }}>
            {rateLabel} · running {money(runningCost)} · {money(Math.max(balance - runningCost, 0))} left
          </div>
          <button className="btn btn-danger" style={{ width: "100%" }} onClick={() => endCall()}>📴 End call</button>
        </div>
      )}

      {!session && (
        <div className="card">
          <div className="chip-wrap" style={{ marginBottom: 12 }}>
            <button className={`heritage-chip${mode === "ai" ? " sel" : ""}`} onClick={() => setMode("ai")}>🤖 AI</button>
            <button className={`heritage-chip${mode === "user" ? " sel" : ""}`} onClick={() => setMode("user")}>🗣️ User</button>
          </div>

          {mode === "ai" ? (
            <>
              <label style={{ fontSize: 11, color: "var(--text-light)" }}>AI model — cost varies by model</label>
              <div style={{ margin: "6px 0 12px" }}>
                {AI_MODELS.map((m) => (
                  <div key={m.id} className={`skill-item${aiModel === m.id ? "" : ""}`} onClick={() => setAiModel(m.id)}
                    style={{ cursor: "pointer", border: `1px solid ${aiModel === m.id ? "var(--accent, #22e6ff)" : "var(--border)"}`, borderRadius: 10, padding: 10, marginBottom: 6 }}>
                    <span className="skill-item-name">{m.emoji} {m.name} <span style={{ fontSize: 11, color: "var(--text-light)" }}>— {m.desc}</span></span>
                    <span className="skill-item-exp">{money(m.perMin)}/min</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <label style={{ fontSize: 11, color: "var(--text-light)" }}>Call a user — hourly rate scales with skill</label>
              <div style={{ margin: "6px 0 12px" }}>
                {CALLABLE_USERS.map((u) => (
                  <div key={u.id} className="skill-item" onClick={() => setCallee(u.id)}
                    style={{ cursor: "pointer", border: `1px solid ${callee === u.id ? "var(--accent, #22e6ff)" : "var(--border)"}`, borderRadius: 10, padding: 10, marginBottom: 6 }}>
                    <span className="skill-item-name">🗣️ {u.name} <span style={{ fontSize: 11, color: "var(--text-light)" }}>— {u.skill}</span></span>
                    <span className="skill-item-exp">{money(u.perHour)}/hr</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <label style={{ fontSize: 11, color: "var(--text-light)" }}>Payment</label>
          <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>
            <button className={`heritage-chip${method === "cash" ? " sel" : ""}`} onClick={() => setMethod("cash")}>💵 Cash balance</button>
            <button className={`heritage-chip${method === "spinaz" ? " sel" : ""}`} onClick={() => setMethod("spinaz")}>🍥 SpinAZ</button>
          </div>

          {method === "spinaz" ? (
            <div className="card" style={{ margin: 0, background: "rgba(255,207,63,0.08)" }}>
              <p style={{ fontSize: 12, color: "var(--text-light)" }}>🍥 SpinAZ calling is <strong>coming soon</strong>. For now, add a cash balance via Stripe/PayPal to place calls.</p>
              <button className="btn btn-small" style={{ marginTop: 8 }} onClick={() => onOpen?.("money")}>➕ Add balance</button>
            </div>
          ) : balance <= 0 ? (
            <div className="card" style={{ margin: 0, background: "rgba(255,43,209,0.08)" }}>
              <p style={{ fontSize: 12, color: "var(--text-light)" }}>💸 Calls require a cash balance. Add funds to start calling.</p>
              <button className="btn btn-small" style={{ marginTop: 8 }} onClick={() => onOpen?.("money")}>➕ Add balance</button>
            </div>
          ) : (
            <>
              <div className="balance-info" style={{ marginBottom: 8 }}>
                Rate: <strong>{rateLabel}</strong> · you can talk ~<strong>{fmtDuration(Math.floor((balance / rate) * unit))}</strong> on {money(balance)}
              </div>
              <button className="btn btn-success" style={{ width: "100%" }} disabled={!canCall} onClick={start}>
                📞 Call {mode === "ai" ? aiPick.name : userPick.name} — {rateLabel}
              </button>
            </>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-header">🧾 Call History</div>
        {(!state.callLog || state.callLog.length === 0) ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No calls yet.</p>
        ) : [...state.callLog].reverse().map((c) => (
          <div key={c.id} className="skill-item">
            <span className="skill-item-name">{c.mode === "ai" ? "🤖" : "🗣️"} {c.who} · {fmtDuration(c.seconds)}{c.autoEnded ? " · ⚠️ funds" : ""}</span>
            <span className="skill-item-exp">{money(c.cost)} · {new Date(c.at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// SingZ / RapZ — functional training. Each drill runs a quick scored session
// and tracks your best, so tapping the app actually does something.
const TRAINING = {
  singz: { emoji: "🎤", title: "SingZ", note: "Voice health first — warm up before you belt.", drills: ["Warmups", "Range Detection", "Pitch Match", "Breath Control", "Boss SongZ"] },
  rapz: { emoji: "🎙️", title: "RapZ", note: "Flow, breath, and bars — build the combo.", drills: ["Flow Pockets", "Breath Control", "Punchlines", "Combo Meter", "Boss Mode"] },
};
function TrainingZ({ appKey }) {
  const { state, update } = useAppState();
  const cfg = TRAINING[appKey];
  const best = state.trainingBest?.[appKey] || {};
  const [active, setActive] = useState(null); // { drill, secs } during a session
  const [result, setResult] = useState(null);

  const practice = (drill) => {
    setResult(null);
    setActive({ drill, secs: 3 });
    const iv = setInterval(() => {
      setActive((a) => {
        if (!a) return a;
        if (a.secs <= 1) {
          clearInterval(iv);
          const score = Math.floor(60 + Math.random() * 41); // 60-100
          const prev = best[drill] || 0;
          const isBest = score > prev;
          update({ trainingBest: { ...state.trainingBest, [appKey]: { ...best, [drill]: Math.max(prev, score) } } });
          setResult({ drill, score, isBest });
          return null;
        }
        return { ...a, secs: a.secs - 1 };
      });
    }, 700);
  };

  const scored = Object.values(best);
  const avg = scored.length ? Math.round(scored.reduce((s, n) => s + n, 0) / scored.length) : null;
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">{cfg.emoji} {cfg.title} Training</div>
        <div className="balance-info">{cfg.note}{avg != null ? ` · overall ${avg}/100` : ""}</div>
      </div>
      {active && (
        <div className="card" style={{ textAlign: "center" }}>
          <div className="card-header" style={{ justifyContent: "center" }}>🔴 {active.drill}</div>
          <div style={{ fontSize: 34, fontWeight: 800 }}>{active.secs}</div>
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>Hold the note / keep the flow…</p>
        </div>
      )}
      {result && (
        <div className="card" style={{ textAlign: "center", border: "1px solid var(--accent, #22e6ff)" }}>
          <div className="card-header" style={{ justifyContent: "center" }}>{result.drill} — {result.score}/100</div>
          <p style={{ fontSize: 12, color: result.isBest ? "var(--success)" : "var(--text-light)" }}>{result.isBest ? "🏆 New personal best!" : "Keep grinding — beat your best."}</p>
        </div>
      )}
      <div className="card">
        <div className="card-header">🎯 Drills</div>
        {cfg.drills.map((d) => (
          <div key={d} className="skill-item">
            <span className="skill-item-name">{d} {best[d] ? <span style={{ fontSize: 11, color: "var(--gold, #ffcf3f)" }}>· best {best[d]}</span> : ""}</span>
            <button className="btn btn-small" disabled={!!active} onClick={() => practice(d)}>▶ Practice</button>
          </div>
        ))}
      </div>
    </>
  );
}
function SingZPage() { return <TrainingZ appKey="singz" />; }
function RapZPage() { return <TrainingZ appKey="rapz" />; }

const MERCH_CATS = [
  { id: "apparel", label: "👕 Apparel" },
  { id: "art", label: "🖼️ Art / Prints" },
  { id: "beats", label: "🎹 Beats" },
  { id: "samples", label: "🎛️ Sample Packs" },
  { id: "accessories", label: "🧢 Accessories" },
  { id: "digital", label: "💾 Digital" },
];
function MerchZPage({ tier, serverOk, syncEconomy }) {
  const { state, updateWallet, addTo } = useAppState();
  const [tab, setTab] = useState("shop");
  const [items, setItems] = useState(null); // null = offline/not loaded
  const [form, setForm] = useState({ title: "", description: "", category: "apparel", price: "" });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => getMerchApi().then((r) => setItems(r.items)).catch(() => setItems(null));
  useEffect(() => { if (serverOk) reload(); else setItems(null); }, [serverOk]);

  const publish = async () => {
    if (!form.title.trim() || !(Number(form.price) > 0)) { setMsg("Title and a price are required."); return; }
    setBusy(true); setMsg("");
    try {
      await createMerchApi({ title: form.title.trim(), description: form.description.trim(), category: form.category, priceCents: Math.round(Number(form.price) * 100), image: file });
      setForm({ title: "", description: "", category: "apparel", price: "" }); setFile(null);
      await reload(); setTab("mine");
    } catch (e) { setMsg(e.message || "Could not publish"); }
    setBusy(false);
  };
  const buy = async (it) => {
    setMsg("");
    try {
      const r = await buyMerchApi(it.id);
      updateWallet({ balance: r.wallet.money });
      addTo("paymentHistory", { amount: -(it.price_cents / 100), dev: r.dev_tax_cents / 100, at: Date.now(), note: `MerchZ: ${it.title}` });
      setMsg(`✅ Bought ${it.title} from @${it.seller}.`); reload(); syncEconomy?.();
    } catch (e) { setMsg(e.message || "Purchase failed"); }
  };
  const del = async (id) => { try { await deleteMerchApi(id); reload(); } catch { /* ignore */ } };

  if (!serverOk || items === null) {
    return (
      <div className="card">
        <div className="card-header">🛍️ MerchZ <span className="tag">offline</span></div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>The creator marketplace needs a live connection. Sell &amp; buy legal goods — apparel, art, beats, sample packs — with the developer tax on every sale.</p>
      </div>
    );
  }

  const shop = items.filter((i) => !i.mine);
  const mine = items.filter((i) => i.mine);
  const catLabel = (id) => MERCH_CATS.find((c) => c.id === id)?.label || id;
  const list = tab === "mine" ? mine : shop;

  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">🛍️ MerchZ <span className="tag" style={{ color: "var(--success)" }}>● live</span></div>
        <div className="balance-info">Creator marketplace · Balance {money(state.wallet.balance)} · {devTaxFor(tier).label} developer tax {Math.round(devTaxFor(tier).rate * 100)}% on every sale</div>
        <div className="chip-wrap" style={{ marginTop: 8 }}>
          <button className={`heritage-chip${tab === "shop" ? " sel" : ""}`} onClick={() => setTab("shop")}>🛒 Shop ({shop.length})</button>
          <button className={`heritage-chip${tab === "sell" ? " sel" : ""}`} onClick={() => setTab("sell")}>🏷️ Sell</button>
          <button className={`heritage-chip${tab === "mine" ? " sel" : ""}`} onClick={() => setTab("mine")}>📦 My Listings ({mine.length})</button>
        </div>
        {msg && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>{msg}</p>}
      </div>

      {tab === "sell" ? (
        <div className="card">
          <div className="card-header">🏷️ List an item</div>
          <div className="form-group"><label>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Neon Logo Hoodie" /></div>
          <div className="form-group"><label>Description</label><CappedTextarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ height: 50 }} /></div>
          <label style={{ fontSize: 11, color: "var(--text-light)" }}>Category</label>
          <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
            {MERCH_CATS.map((c) => <button key={c.id} className={`heritage-chip${form.category === c.id ? " sel" : ""}`} onClick={() => setForm({ ...form, category: c.id })}>{c.label}</button>)}
          </div>
          <div className="form-group"><label>Price ($)</label><input type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="20.00" /></div>
          <label className="btn btn-secondary btn-small" style={{ display: "block", textAlign: "center", cursor: "pointer" }}>
            {file ? `📷 ${file.name}` : "📷 Add a photo (optional)"}
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <p style={{ fontSize: 10, color: "var(--text-light)", margin: "8px 0" }}>Legal goods only. Every sale takes the {devTaxFor(tier).label} developer tax; you keep the rest.</p>
          <button className="btn btn-success" style={{ width: "100%" }} disabled={busy || !form.title.trim() || !(Number(form.price) > 0)} onClick={publish}>{busy ? "Publishing…" : "🏷️ Publish listing"}</button>
        </div>
      ) : (
        <div className="card">
          <div className="card-header"><span>{tab === "mine" ? "📦 My Listings" : "🛒 Shop"}</span><span className="tag">{list.length}</span></div>
          {list.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-light)" }}>{tab === "mine" ? "You haven't listed anything yet." : "No items yet — be the first to sell."}</p>
          ) : list.map((it) => (
            <div key={it.id} className="post-card">
              {it.image_url && <img src={it.image_url} alt={it.title} style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 10, marginBottom: 8 }} />}
              <div className="post-user">{it.title} <span className="tag">{catLabel(it.category)}</span></div>
              {it.description && <div className="post-content">{it.description}</div>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0" }}>
                <span className="tag">by @{it.seller}</span>
                <span className="tag">{money(it.price_cents / 100)}</span>
                {it.sold > 0 && <span className="tag">🛒 {it.sold} sold</span>}
              </div>
              {it.mine ? (
                <button className="btn btn-small btn-danger" onClick={() => del(it.id)}>🗑️ Remove</button>
              ) : it.bought ? (
                <span className="tag" style={{ color: "var(--success)" }}>✓ Purchased</span>
              ) : (
                <>
                  <CostBreakdown amount={it.price_cents / 100} tier={tier} recipient={`@${it.seller}`} payLabel="You pay" />
                  <button className="btn btn-small" onClick={() => buy(it)}>🛒 Buy {money(it.price_cents / 100)}</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

const FN_PAGES = {
  merchz: MerchZPage,
  singz: SingZPage,
  rapz: RapZPage,
  dawz: DawZPage,
  sentencez: SentenceZPage,
  videoz: VideoZPage,
  venuez: VenueZPage,
  callz: CallZPage,
  gamez: GameZPage,
  filez: FileZPage,
  onboardz: OnboardZPage,
  groupz: GroupZPage,
  bodiez: BodieZPage,
  zodiacz: ZodiacZPage,
  battlez: BattleZPage,
  spinaz: SpinaZPage,
  energy: EnergyPage,
  ratez: RateConnectZPage,
  distributez: DistributeZPage,
  royaltiez: RoyaltieZPage,
  messagez: MessageZPage,
  collabz: CollabZPage,
  legalz: LegalZPage,
  labelz: LabelZPage,
  lilith: LilithPage,
  intelligence: IntelligencePage,
  occ: OccWorkspace,
  nationalitiez: NationalitieZPage,
  substancez: SubstanceZPage,
  preferencez: PreferenceZPage,
  social_connectz: SocialConnectZPage,
  setup: SetupPage,
  personas: PersonasPage,
  examples: PostZPage,
  profile: ProfilePage,
  money: MoneyPage,
  membership: MembershipZPage,
  specz: SpecZPage,
  settings: SettingsPage,
};

// ---- App description modal (blueprint "click icon → Corey voice" pattern) ----
function AppModal({ app, onClose, onOpen }) {
  if (!app) return null;
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <IconImg icon={app.icon} alt={app.name} />
            <h2>{app.emoji} {app.name}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <p className="modal-desc">{app.desc}</p>
        {app.children?.length > 0 && (
          <div className="modal-sub">
            <div className="modal-sub-title">Inside {app.name}</div>
            {app.children.map((c) => (
              <div key={c.name} className="modal-sub-row">
                <IconImg icon={c.icon} alt={c.name} />
                <div>
                  <div className="s-name">{c.emoji} {c.name}</div>
                  <div className="s-desc">{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {app.fn && <button className="btn" style={{ marginTop: 16, width: "100%" }} onClick={() => onOpen(app.key)}>Open {app.name} →</button>}
      </div>
    </div>
  );
}

// ---- PickConnectZ dock ----
function Dock({ usage, pins, tier, current, onOpen, onTogglePin, onHome }) {
  const [editing, setEditing] = useState(false);
  const { label: tierLabel, limit } = tierInfo(tier);
  const pinnedApps = pins.map((k) => APPS_BY_KEY[k]).filter(Boolean);
  const aiPicks = TOP_APPS
    .filter((a) => !pins.includes(a.key) && (usage[a.key] || 0) > 0)
    .sort((a, b) => (usage[b.key] || 0) - (usage[a.key] || 0))
    .slice(0, AI_PICK_COUNT);
  const atLimit = pins.length >= limit;

  return (
    <div className="dock-wrap">
      {editing && (
        <div className="dock" style={{ display: "block", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="dock-hint">
              {limit === Infinity ? `${tierLabel} · unlimited pins (${pins.length})` : `${tierLabel} · ${pins.length}/${limit} pinned`}
              {limit !== Infinity && atLimit && " · upgrade for more"}
            </span>
            <button className="close-btn" onClick={() => setEditing(false)}>×</button>
          </div>
          <div className="pin-grid">
            {TOP_APPS.map((a) => {
              const pinned = pins.includes(a.key);
              const disabled = !pinned && atLimit;
              return (
                <div key={a.key} className={`pin-cell${pinned ? " pinned" : ""}${disabled ? " disabled" : ""}`}
                  onClick={() => !disabled && onTogglePin(a.key)} title={a.name}>
                  <IconImg icon={a.icon} alt={a.name} />
                  {pinned && <span className="pin-check">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="dock">
        <button className="dock-brand" onClick={onHome} title="PickConnectZ — home">
          <IconImg icon="pickconz.png" alt="PickConnectZ" />
          <span>PickConnectZ</span>
        </button>
        <div className="dock-sep" />
        <div className="dock-scroll">
          {aiPicks.length === 0 && pinnedApps.length === 0 ? (
            <span className="dock-hint">Open apps to build your quick nav →</span>
          ) : (
            <>
              {aiPicks.map((a) => (
                <div key={a.key} className={`dock-icon${current === a.key ? " active" : ""}`} onClick={() => onOpen(a.key)} title={`${a.name} · AI pick`}>
                  <IconImg icon={a.icon} alt={a.name} /><span className="ai-dot" />
                </div>
              ))}
              {aiPicks.length > 0 && pinnedApps.length > 0 && <div className="dock-sep" />}
              {pinnedApps.map((a) => (
                <div key={a.key} className={`dock-icon${current === a.key ? " active" : ""}`} onClick={() => onOpen(a.key)} title={a.name}>
                  <IconImg icon={a.icon} alt={a.name} />
                </div>
              ))}
            </>
          )}
        </div>
        <button className="dock-edit" onClick={() => onOpen("occ")} title="Ask OCC — help & code">❓</button>
        <button className={`dock-edit${editing ? " active" : ""}`} onClick={() => setEditing((v) => !v)} title="Customize slots">⚙</button>
      </div>
    </div>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const { state, update, setTab, toggleLightDark } = useAppState();
  const { settings, wallet } = state;
  // Live community tallies + owner flag from /api/auth/stats/.
  const [community, setCommunity] = useState({ total: null, online: null });
  const isOwner = !!(user?.is_owner || community.isOwner);

  // Brand-new users land in the OnboardZ guided first session.
  const isNewUser = !state.user.name && state.personas.length === 0 && state.examples.length === 0 && !state.onboardDismissed;
  // Returning from a Stripe/PayPal checkout lands on /v2?checkout=… — open the
  // wallet so MoneyPage can capture/confirm the payment.
  const returningFromCheckout = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("checkout");
  const [view, setView] = useState(returningFromCheckout ? "money" : (isNewUser ? "onboardz" : null)); // null = launcher; else an fn app key
  const [modalApp, setModalApp] = useState(null);
  const [usage, setUsage] = useState(() => readStore(USAGE_KEY) || {});
  const [pins, setPins] = useState(() => readStore(PINS_KEY) || []);
  // Dev default StatZ (editable in Settings); the server's real tier overrides on load.
  const [tier, setTier] = useState("statz");
  const [serverOk, setServerOk] = useState(false);

  // Hydrate money/energy/spinaz + tier from the backend economy when signed in;
  // silently stay on local state if the API is unavailable.
  const syncEconomy = () => {
    getWallet()
      .then((r) => {
        setServerOk(true);
        update({ wallet: { ...state.wallet, balance: r.wallet.money }, energy: r.wallet.energy, spinaz: r.wallet.spinaz });
      })
      .catch(() => setServerOk(false));
  };
  useEffect(() => {
    let on = true;
    api("/api/auth/stats/").then((s) => {
      if (!on) return;
      setTier(s?.my_tier || "");
      setCommunity({ total: s?.total_members ?? null, online: s?.online_now ?? null, isOwner: !!s?.is_owner });
    }).catch(() => {});
    if (isSignedIn()) syncEconomy();
    return () => { on = false; };
  }, []);

  // Auto-publish the public profile to the backend (debounced) so other members
  // can view and search you. Fires when profile/personas change while signed in.
  useEffect(() => {
    if (!isSignedIn()) return undefined;
    const t = setTimeout(() => { saveProfileApi(buildProfilePayload(state)).catch(() => {}); }, 1200);
    return () => clearTimeout(t);
  }, [state.user, state.personas]);

  const recordUsage = (key) =>
    setUsage((u) => {
      const next = { ...u, [key]: (u[key] || 0) + 1 };
      writeStore(USAGE_KEY, next);
      return next;
    });

  const openApp = (key) => {
    const app = APPS_BY_KEY[key];
    if (!app) {
      // Functional pages without a launcher tile (e.g. legalz) open directly.
      if (FN_PAGES[key]) { recordUsage(key); setModalApp(null); setView(key); setTab(key); }
      return;
    }
    recordUsage(key);
    setModalApp(null);
    if (app.fn) { setView(key); setTab(key); }
    else setModalApp(app);
  };

  const togglePin = (key) =>
    setPins((p) => {
      const next = p.includes(key) ? p.filter((k) => k !== key) : [...p, key];
      writeStore(PINS_KEY, next);
      return next;
    });

  const goHome = () => { setView(null); setModalApp(null); };
  const FnPage = view ? FN_PAGES[view] : null;
  const activeApp = view ? APPS_BY_KEY[view] : null;
  const balance = Number(wallet.balance || 0).toFixed(2);

  return (
    <LimitsProvider tier={tier} serverOk={serverOk}>
    <div className="mcz2-root" data-theme={dataThemeFor(settings)} style={accentStyle(settings.accent)}>
      <div className="container">
        <div className="header">
          <button className="dock-brand" onClick={goHome} title="Home">
            <IconImg icon="logo.png" alt="Music ConnectZ" style={{ width: 34, height: 34, borderRadius: 9 }} />
          </button>
          <div className="header-center">
            <div className="header-title">🎵 Music ConnectZ</div>
            <div className="header-subtitle">
              {user?.username ? `@${user.username}` : "Signed in"}
              {community.total != null && <span title="Total members"> · 👥 {community.total}</span>}
              {community.online != null && <span title="Online now" style={{ color: "var(--success)" }}> · 🟢 {community.online}</span>}
              {isOwner && <span title="Owner" style={{ color: "var(--gold, #ffcf3f)" }}> · 🛠️ owner</span>}
            </div>
          </div>
          <div className="header-right">
            <button className="theme-toggle" onClick={toggleLightDark} title="Panel depth">
              {settings.lightDark === "dark" ? "🌙" : "☀️"}
            </button>
            <div className="balances">
              <div className="balance" onClick={() => openApp("money")} title="Money">💲{balance}</div>
              <div className="balance" onClick={() => openApp("energy")} title="Energy">⚡{state.energy || 0}</div>
              <div className="balance" onClick={() => openApp("spinaz")} title="SpinAZ">🍥{state.spinaz || 0}</div>
            </div>
            <div className="profile-pic" onClick={() => openApp("profile")}>
              {(user?.username || "?").charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="content">
          {FnPage ? (
            <>
              <button className="btn btn-secondary btn-small" onClick={goHome} style={{ marginBottom: 12 }}>‹ Home</button>
              <div className="card-header" style={{ borderBottom: "none" }}>{activeApp?.emoji} {activeApp?.name}</div>
              <FnPage tier={tier} onOpen={openApp} serverOk={serverOk} syncEconomy={syncEconomy} onTierChange={setTier} isOwner={isOwner} />
            </>
          ) : (
            CATALOG.map((group) => (
              <div key={group.label} className="launch-group">
                <div className="launch-label">{group.label}</div>
                <div className="launch-grid">
                  {group.apps.map((a) => (
                    <button key={a.key} className="app-tile" onClick={() => openApp(a.key)}>
                      <span className="tile-icon"><IconImg icon={a.icon} alt={a.name} /></span>
                      <span className="tile-name">{a.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button className="btn btn-secondary btn-small" onClick={() => openApp("legalz")}>⚖️ Terms &amp; Policies</button>
            <button className="btn btn-secondary btn-small" onClick={logout}>🚪 Log out</button>
          </div>
        </div>

        <Dock usage={usage} pins={pins} tier={tier} current={view} onOpen={openApp} onTogglePin={togglePin} onHome={goHome} />
      </div>

      <AppModal app={modalApp} onClose={() => setModalApp(null)} onOpen={openApp} />
    </div>
    </LimitsProvider>
  );
}

export default function Mcz2App() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  );
}
