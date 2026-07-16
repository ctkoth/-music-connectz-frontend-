import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { AppStateProvider, useAppState, dataThemeFor } from "./AppState.jsx";
import { CATALOG, APPS_BY_KEY } from "./catalog.js";
import { accentStyle, accentOptionsFor } from "./colors.js";
import { REGIONS } from "./heritage.js";
import { MUSCLE_GROUPS, EQUIPMENT, LOCATIONS, EXERCISES, isAvailable, availableEquipment } from "./bodiez.js";
import "./mcz2.css";

// Self-declared, filterable matching metrics (NationalitieZ / SubstanceZ / PreferenceZ).
const SUBSTANCES = [
  { key: "caffeine", name: "Caffeine", emoji: "☕" },
  { key: "nicotine", name: "Nicotine", emoji: "🚬" },
  { key: "alcohol", name: "Alcohol", emoji: "🍺" },
  { key: "cannabis", name: "Cannabis", emoji: "🌿" },
  { key: "prescriptions", name: "Prescriptions", emoji: "💊" },
  { key: "psychedelics", name: "Psychedelics", emoji: "🍄" },
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
  { id: "neutral", label: "Neutral", emoji: "⚧️" },
];
const TRAITS = ["Honesty", "Trust", "Communication", "Energy", "Connection", "Creativity", "Ambition", "Humor"];

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
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="card">
      <div className="card-header">👤 Your Profile</div>
      <div className="form-group"><label>Username</label><input value={form.name} onChange={set("name")} placeholder="Your name" /></div>
      <div className="grid-2">
        <div className="form-group"><label>📧 Email</label><input type="email" value={form.email} onChange={set("email")} /></div>
        <div className="form-group"><label>📱 Phone</label><input value={form.phone} onChange={set("phone")} /></div>
      </div>
      <div className="grid-2">
        <div className="form-group"><label>🎂 Birthday</label><input type="date" value={form.birthday} onChange={set("birthday")} /></div>
        <div className="form-group"><label>⚧️ Gender</label>
          <select value={form.gender} onChange={set("gender")}>
            <option value="">Select</option><option>Male</option><option>Female</option><option>Non-Binary</option>
          </select>
        </div>
      </div>
      <div className="form-group"><label>📍 Location</label><input value={form.location} onChange={set("location")} placeholder="City, State or Zip" /></div>
      <div className="form-group"><label>📝 Bio</label><textarea value={form.bio} onChange={set("bio")} style={{ height: 60 }} /></div>
      <button className="btn btn-success" style={{ width: "100%" }} onClick={() => updateUser(form)}>💾 Save Profile</button>
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
  { name: "Ghostwriter", emoji: "👻", icon: "personaz_ghostwriter.png" },
  { name: "Developer", emoji: "👾", icon: "personaz_developer.png" },
];
function PersonasPage() {
  const { state, addTo, removeFrom } = useAppState();
  const has = (name) => state.personas.some((p) => p.name === name);
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
        <div className="card-header">🎭 Your Personas</div>
        {state.personas.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No personas yet — pick some above.</p>
        ) : state.personas.map((p, i) => (
          <div key={i} className="persona-card">
            <div className="persona-header">
              <span className="persona-name">{p.emoji} {p.name}</span>
              <button className="btn btn-danger btn-small" onClick={() => removeFrom("personas", i)}>Remove</button>
            </div>
          </div>
        ))}
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
        <div className="form-group"><label>📝 Description</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ height: 50 }} /></div>
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

function ProfilePage() {
  const { state } = useAppState();
  const u = state.user;
  const skills = state.personas.flatMap((p) => p.skills || []);
  return (
    <div className="card">
      <div className="card-header">👤 Your Public Profile</div>
      <div style={{ textAlign: "center", padding: 14 }}>
        <div className="profile-pic" style={{ width: 64, height: 64, margin: "0 auto 8px", fontSize: 26 }}>
          {(u.name || "?").charAt(0).toUpperCase()}
        </div>
        <div style={{ fontWeight: 800, fontSize: 15 }}>{u.name || "Not set"}</div>
        <div style={{ fontSize: 11, color: "var(--text-light)" }}>{[u.location, u.gender].filter(Boolean).join(" · ")}</div>
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
      <div className="form-group"><label>💞 PreferenceZ</label>
        <div>{u.preferences?.partnerGender
          ? <span className="tag">Prefers: {u.preferences.partnerGender}</span>
          : "Not set"}
          {(u.preferences?.traits || []).map((t) => <span key={t} className="tag">{t}</span>)}
        </div>
      </div>
    </div>
  );
}

function MoneyPage() {
  const { state, updateWallet, addTo } = useAppState();
  const [amt, setAmt] = useState("");
  const add = () => {
    const v = parseFloat(amt);
    if (!v || v <= 0) return;
    updateWallet({ balance: Number((state.wallet.balance + v).toFixed(2)), earned: Number((state.wallet.earned + v).toFixed(2)) });
    addTo("paymentHistory", { amount: v, at: Date.now() });
    setAmt("");
  };
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">💳 Wallet</div>
        <div className="balance-info">
          Balance: <strong>${Number(state.wallet.balance).toFixed(2)}</strong> &nbsp;·&nbsp; Lifetime earned: <strong>${Number(state.wallet.earned).toFixed(2)}</strong>
        </div>
        <div className="form-group"><label>Add funds (demo)</label><input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" /></div>
        <button className="btn" style={{ width: "100%" }} onClick={add}>➕ Add to balance</button>
        <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>Stripe/PayPal checkout wires in with the payments backend.</p>
      </div>
      <div className="card">
        <div className="card-header">🧾 Payment History</div>
        {state.paymentHistory.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No transactions yet.</p>
        ) : [...state.paymentHistory].reverse().map((p, i) => (
          <div key={i} className="skill-item"><span className="skill-item-name">+${Number(p.amount).toFixed(2)}</span>
            <span className="skill-item-exp">{new Date(p.at).toLocaleDateString()}</span></div>
        ))}
      </div>
    </>
  );
}

function SettingsPage({ tier }) {
  const { state, updateSettings, toggleSetting } = useAppState();
  const { settings } = state;
  const { tier: tierLabel, colors, locked } = accentOptionsFor(tier);
  return (
    <>
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

function SpecZPage({ tier }) {
  const { state, updateWallet, addTo } = useAppState();
  const isStatz = /stat[sz]/i.test(tier || "");
  if (!isStatz) {
    return (
      <div className="card">
        <div className="card-header">✴️ SpecZ — StatZ Marketplace</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          🔒 SpecZ is a <strong>StatZ</strong>-only marketplace for purchasable user metadata &amp; UGC. Upgrade to StatZ to buy
          audience analytics, engagement data, genre intelligence, and creator content packs.
        </p>
      </div>
    );
  }
  const owned = state.speczOwned || [];
  const buy = (item) => {
    if (owned.includes(item.id)) return;
    if (state.wallet.balance < item.price) return;
    updateWallet({ balance: Number((state.wallet.balance - item.price).toFixed(2)) });
    addTo("speczOwned", item.id);
    addTo("paymentHistory", { amount: -item.price, at: Date.now(), note: `SpecZ: ${item.name}` });
  };
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">✴️ SpecZ Marketplace</div>
        <div className="balance-info">Purchase user metadata &amp; UGC with your wallet · Balance: <strong>${Number(state.wallet.balance).toFixed(2)}</strong></div>
      </div>
      {SPECZ_ITEMS.map((item) => {
        const have = owned.includes(item.id);
        const canAfford = state.wallet.balance >= item.price;
        return (
          <div key={item.id} className="post-card">
            <div className="post-user">{item.emoji} {item.name}</div>
            <div className="post-content">{item.desc}</div>
            <div className="post-actions">
              {have ? (
                <span className="tag" style={{ color: "var(--success)" }}>✓ Owned</span>
              ) : (
                <button className="btn btn-small" disabled={!canAfford} style={{ opacity: canAfford ? 1 : 0.5 }} onClick={() => buy(item)}>
                  {canAfford ? `Buy $${item.price.toFixed(2)}` : `Need $${item.price.toFixed(2)} — add funds`}
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
  const picked = state.user.nationalities || [];
  const toggle = (v) => {
    const next = picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v];
    updateUser({ nationalities: next });
  };
  return (
    <>
      <div className="card">
        <div className="card-header"><span>🌐 Your Heritage</span><span className="tag">{picked.length} selected</span></div>
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
  const subs = state.user.substances || {};
  const setStance = (key, id) => updateUser({ substances: { ...subs, [key]: subs[key] === id ? "" : id } });
  return (
    <div className="card">
      <div className="card-header">🧠 SubstanceZ — Your Stance</div>
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
  const pref = state.user.preferences || { partnerGender: "", traits: [] };
  const setGender = (id) => updateUser({ preferences: { ...pref, partnerGender: pref.partnerGender === id ? "" : id } });
  const toggleTrait = (t) => {
    const traits = pref.traits || [];
    const next = traits.includes(t) ? traits.filter((x) => x !== t) : [...traits, t];
    updateUser({ preferences: { ...pref, traits: next } });
  };
  return (
    <>
      <div className="card">
        <div className="card-header">💞 Partner Preference</div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 12 }}>Choose your preference.</p>
        <div className="grid-3">
          {PARTNER_GENDERS.map((g) => (
            <button key={g.id} className={`persona-btn${pref.partnerGender === g.id ? " sel-pref" : ""}`} onClick={() => setGender(g.id)}
              style={pref.partnerGender === g.id ? { borderColor: "var(--primary)", boxShadow: "var(--glow)" } : undefined}>
              {g.emoji} {g.label}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-header">✨ Traits That Matter</div>
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
  { name: "Kaya", gender: "female", region: "Africa", country: "Nigeria", sober: true, lookingFor: "collab" },
  { name: "Diego", gender: "male", region: "South America", country: "Colombia", sober: false, lookingFor: "romance" },
  { name: "Mei", gender: "female", region: "Asia", country: "Japan", sober: true, lookingFor: "collab" },
  { name: "Luka", gender: "male", region: "Europe", country: "Croatia", sober: false, lookingFor: "collab" },
  { name: "Amara", gender: "neutral", region: "Africa", country: "Ghana", sober: true, lookingFor: "romance" },
  { name: "Sam", gender: "male", region: "North America", country: "United States", sober: false, lookingFor: "collab" },
];

function SocialConnectZPage() {
  const { state } = useAppState();
  const [region, setRegion] = useState("");
  const [gender, setGender] = useState("");
  const [soberOnly, setSoberOnly] = useState(false);
  const pref = state.user.preferences || {};

  const filtered = DEMO_MEMBERS.filter((m) =>
    (!region || m.region === region) &&
    (!gender || m.gender === gender) &&
    (!soberOnly || m.sober),
  );

  return (
    <>
      <div className="card">
        <div className="card-header">💓 Social ConnectZ</div>
        <p style={{ fontSize: 11, color: "var(--text-light)" }}>
          Discovery filtered by your matching metrics. Your PreferenceZ:&nbsp;
          <strong>{pref.partnerGender ? PARTNER_GENDERS.find((g) => g.id === pref.partnerGender)?.label : "not set"}</strong>.
        </p>
      </div>

      <div className="card">
        <div className="card-header">🔍 Filters</div>
        <div className="form-group"><label>🌐 NationalitieZ (heritage)</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">All regions</option>
            {REGIONS.map((r) => <option key={r.name} value={r.name}>{r.emoji} {r.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label>💞 PreferenceZ (gender)</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Any</option>
            {PARTNER_GENDERS.map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.label}</option>)}
          </select>
        </div>
        <div className="settings-toggle">
          <label>🧠 SubstanceZ — sober-friendly only</label>
          <div role="switch" aria-checked={soberOnly} onClick={() => setSoberOnly((v) => !v)} className={`toggle-switch${soberOnly ? " active" : ""}`} />
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span>💼 Matches</span><span className="filter-badge">{filtered.length}</span></div>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No members match these filters.</p>
        ) : filtered.map((m) => (
          <div key={m.name} className="post-card">
            <div className="post-user">{m.name} · {PARTNER_GENDERS.find((g) => g.id === m.gender)?.emoji}</div>
            <div className="post-meta">🌐 {m.country} · {m.sober ? "🟢 sober" : "🍺 social"} · looking for {m.lookingFor}</div>
          </div>
        ))}
        <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>
          Demo roster — the same NationalitieZ / SubstanceZ / PreferenceZ filters apply in CollabZ and BattleZ once their live feeds ship.
        </p>
      </div>
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

const FN_PAGES = {
  onboardz: OnboardZPage,
  groupz: GroupZPage,
  bodiez: BodieZPage,
  nationalitiez: NationalitieZPage,
  substancez: SubstanceZPage,
  preferencez: PreferenceZPage,
  social_connectz: SocialConnectZPage,
  setup: SetupPage,
  personas: PersonasPage,
  examples: PostZPage,
  profile: ProfilePage,
  money: MoneyPage,
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
        <button className={`dock-edit${editing ? " active" : ""}`} onClick={() => setEditing((v) => !v)} title="Customize slots">⚙</button>
      </div>
    </div>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const { state, setTab, toggleLightDark } = useAppState();
  const { settings, wallet } = state;

  // Brand-new users land in the OnboardZ guided first session.
  const isNewUser = !state.user.name && state.personas.length === 0 && state.examples.length === 0 && !state.onboardDismissed;
  const [view, setView] = useState(isNewUser ? "onboardz" : null); // null = launcher; else an fn app key
  const [modalApp, setModalApp] = useState(null);
  const [usage, setUsage] = useState(() => readStore(USAGE_KEY) || {});
  const [pins, setPins] = useState(() => readStore(PINS_KEY) || []);
  const [tier, setTier] = useState("");

  useEffect(() => {
    let on = true;
    api("/api/auth/stats/").then((s) => on && setTier(s?.my_tier || "")).catch(() => {});
    return () => { on = false; };
  }, []);

  const recordUsage = (key) =>
    setUsage((u) => {
      const next = { ...u, [key]: (u[key] || 0) + 1 };
      writeStore(USAGE_KEY, next);
      return next;
    });

  const openApp = (key) => {
    const app = APPS_BY_KEY[key];
    if (!app) return;
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
    <div className="mcz2-root" data-theme={dataThemeFor(settings)} style={accentStyle(settings.accent)}>
      <div className="container">
        <div className="header">
          <button className="dock-brand" onClick={goHome} title="Home">
            <IconImg icon="logo.png" alt="Music ConnectZ" style={{ width: 34, height: 34, borderRadius: 9 }} />
          </button>
          <div className="header-center">
            <div className="header-title">🎵 Music ConnectZ</div>
            <div className="header-subtitle">{user?.username ? `@${user.username}` : "Signed in"}</div>
          </div>
          <div className="header-right">
            <button className="theme-toggle" onClick={toggleLightDark} title="Panel depth">
              {settings.lightDark === "dark" ? "🌙" : "☀️"}
            </button>
            <div className="balance" onClick={() => openApp("money")}>💰 ${balance}</div>
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
              <FnPage tier={tier} onOpen={openApp} />
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

          <button className="btn btn-secondary btn-small" onClick={logout} style={{ marginTop: 8 }}>🚪 Log out</button>
        </div>

        <Dock usage={usage} pins={pins} tier={tier} current={view} onOpen={openApp} onTogglePin={togglePin} onHome={goHome} />
      </div>

      <AppModal app={modalApp} onClose={() => setModalApp(null)} onOpen={openApp} />
    </div>
  );
}

export default function Mcz2App() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  );
}
