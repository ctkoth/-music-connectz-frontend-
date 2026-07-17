import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { AppStateProvider, useAppState, dataThemeFor } from "./AppState.jsx";
import { CATALOG, APPS_BY_KEY } from "./catalog.js";
import { accentStyle, accentOptionsFor } from "./colors.js";
import { REGIONS } from "./heritage.js";
import { MUSCLE_GROUPS, EQUIPMENT, LOCATIONS, EXERCISES, isAvailable, availableEquipment } from "./bodiez.js";
import { SIGNS, zodiacFor } from "./zodiac.js";
import { GAME_GENRES, SEED_GAMES, subgenresFor, genreEmoji } from "./gamez.js";
import { AI_MODELS, CALLABLE_USERS, AI_UNIT_SECONDS, USER_UNIT_SECONDS, callCost, fmtDuration } from "./callz.js";
import { devTaxFor, splitTransaction, money, mbLabel } from "./economy.js";
import { LimitsProvider, useLimits } from "./LimitsContext.jsx";
import {
  isSignedIn, getWallet, addFundsApi, setTierApi,
  getSpecZApi, buySpecZApi, getRoyaltiesApi, cashoutRoyaltiesApi,
  getUploadsApi, uploadFileApi, deleteUploadApi,
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
  const { char_limit } = useLimits();
  const len = (value || "").length;
  const near = char_limit && len >= char_limit * 0.9;
  return (
    <>
      <textarea value={value} onChange={onChange} maxLength={char_limit || undefined} {...rest} />
      {char_limit ? (
        <div className="char-count" style={{ fontSize: 10, textAlign: "right", color: near ? "var(--gold, #ffcf3f)" : "var(--text-light)", marginTop: 2 }}>
          {len.toLocaleString()} / {char_limit.toLocaleString()}
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
      <div className="form-group"><label>📝 Bio</label><CappedTextarea value={form.bio} onChange={set("bio")} style={{ height: 60 }} /></div>
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
  { name: "A&R Scout", emoji: "🔎", icon: "personaz_arscout.png" },
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
        <div style={{ fontSize: 11, color: "var(--text-light)" }}>
          {[u.location, u.gender, zodiacFor(u.birthday) && `${zodiacFor(u.birthday).emoji} ${zodiacFor(u.birthday).name}`].filter(Boolean).join(" · ")}
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

function MoneyPage({ tier, serverOk, syncEconomy }) {
  const { state, update, updateWallet, addTo } = useAppState();
  const [amt, setAmt] = useState("");
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
        <div className="form-group"><label>Add funds — {label} developer tax {Math.round(rate * 100)}%</label>
          <input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" /></div>
        <CostBreakdown amount={amt} tier={tier} recipient="Your wallet" />
        <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={add}>➕ Add to balance</button>
        <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>Every transaction shows the developer tax up front. Stripe/PayPal checkout wires in with the payments backend.</p>
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

function SpecZPage({ tier, serverOk, syncEconomy }) {
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
  { name: "Kaya", gender: "female", region: "Africa", country: "Nigeria", sober: true, lookingFor: "collab", sign: "Leo" },
  { name: "Diego", gender: "male", region: "South America", country: "Colombia", sober: false, lookingFor: "romance", sign: "Scorpio" },
  { name: "Mei", gender: "female", region: "Asia", country: "Japan", sober: true, lookingFor: "collab", sign: "Virgo" },
  { name: "Luka", gender: "male", region: "Europe", country: "Croatia", sober: false, lookingFor: "collab", sign: "Aries" },
  { name: "Amara", gender: "neutral", region: "Africa", country: "Ghana", sober: true, lookingFor: "romance", sign: "Pisces" },
  { name: "Sam", gender: "male", region: "North America", country: "United States", sober: false, lookingFor: "collab", sign: "Gemini" },
];

function DiscoverTab() {
  const { state } = useAppState();
  const [region, setRegion] = useState("");
  const [gender, setGender] = useState("");
  const [sign, setSign] = useState("");
  const [soberOnly, setSoberOnly] = useState(false);
  const pref = state.user.preferences || {};

  const filtered = DEMO_MEMBERS.filter((m) =>
    (!region || m.region === region) &&
    (!gender || m.gender === gender) &&
    (!sign || m.sign === sign) &&
    (!soberOnly || m.sober),
  );

  return (
    <>
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
        <div className="form-group"><label>♌ ZodiacZ (sign)</label>
          <select value={sign} onChange={(e) => setSign(e.target.value)}>
            <option value="">Any sign</option>
            {SIGNS.map((s) => <option key={s.name} value={s.name}>{s.emoji} {s.name}</option>)}
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
            <div className="post-meta">🌐 {m.country} · {SIGNS.find((s) => s.name === m.sign)?.emoji} {m.sign} · {m.sober ? "🟢 sober" : "🍺 social"} · looking for {m.lookingFor}</div>
          </div>
        ))}
        <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>
          Demo roster — the same NationalitieZ / SubstanceZ / PreferenceZ filters apply in CollabZ and BattleZ once their live feeds ship.
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

function SocialConnectZPage() {
  const [sub, setSub] = useState("discover");
  const SUBS = [["discover", "🔎 Discover"], ["vibez", "♥️ VibeZ"], ["inferno", "❤️‍🔥 Inferno"], ["boardz", "🪧 BoardZ"], ["personalitiez", "😶 PersonalitieZ"]];
  const Body = { discover: DiscoverTab, vibez: VibeZTab, inferno: InfernoTab, boardz: BoardZTab, personalitiez: PersonalitieZTab }[sub];
  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 14 }}>
        {SUBS.map(([id, label]) => <button key={id} className={`heritage-chip${sub === id ? " sel" : ""}`} onClick={() => setSub(id)}>{label}</button>)}
      </div>
      <Body />
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
  const { state, update, addTo } = useAppState();
  const [type, setType] = useState("image");
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
function MessageZPage() {
  const { state, addTo } = useAppState();
  const [box, setBox] = useState("inbox");
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const sent = (state.messages || []).filter((m) => m.dir === "out");
  const send = () => {
    if (!to.trim() || !body.trim()) return;
    addTo("messages", { id: Date.now(), dir: "out", who: to.trim(), body: body.trim(), at: Date.now() });
    setTo(""); setBody(""); setBox("outbox");
  };
  const list = box === "inbox" ? DEMO_INBOX : [...sent].reverse();
  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 14 }}>
        <button className={`heritage-chip${box === "inbox" ? " sel" : ""}`} onClick={() => setBox("inbox")}>📥 Inbox</button>
        <button className={`heritage-chip${box === "outbox" ? " sel" : ""}`} onClick={() => setBox("outbox")}>📤 Outbox</button>
        <button className={`heritage-chip${box === "compose" ? " sel" : ""}`} onClick={() => setBox("compose")}>✍️ Compose</button>
      </div>
      {box === "compose" ? (
        <div className="card">
          <div className="card-header">✍️ New Message</div>
          <div className="form-group"><label>To</label><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="username" /></div>
          <div className="form-group"><label>Message</label><CappedTextarea value={body} onChange={(e) => setBody(e.target.value)} style={{ height: 70 }} /></div>
          <button className="btn btn-success" style={{ width: "100%" }} onClick={send}>📤 Send</button>
        </div>
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

function LabelZPage({ tier }) {
  const { state, addTo, updateSettings } = useAppState();
  const isPremium = /premium|pro|stat[sz]/i.test(tier || "");
  const hasLabelPersona = (state.personas || []).some((p) => /manager|a&r|scout/i.test(p.name));
  const canCreate = isPremium || hasLabelPersona;
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
      {reusable ? " ♻️ Reusable: 10% K-Oth royalty when used on DistributeZ / CollabZ / BattleZ, split transparently to contributors." : ""}
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
      <button className="btn" style={{ width: "100%" }} disabled={!prompt.trim()}>🎬 Generate {type} ({t.ratio})</button>
      <IntelNote role="Videographer" reusable />
    </div>
  );
}

function SentenceConnectZ() {
  const [doc, setDoc] = useState(DOC_TYPES[0]);
  return (
    <div className="card">
      <div className="card-header">📃 Sentence ConnectZ</div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Document type</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{DOC_TYPES.map((d) => <Pill key={d} active={doc === d} onClick={() => setDoc(d)}>{d}</Pill>)}</div>
      <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 10 }}>Controls: ChatGPT toggle · document language · Explicit / Slang / Emoji toggles. LyricZ adds genre, mood, metaphor/simile/pun density and syllable-rhyme ranges.</p>
      <button className="btn" style={{ width: "100%" }}>✍️ Generate {doc}</button>
      <IntelNote role="Ghostwriter" reusable />
    </div>
  );
}

function OccConnectZ({ tier, onOpen }) {
  const t = occTierFor(tier);
  const { state, addTo } = useAppState();
  const [lang, setLang] = useState(t.languages[0]);
  const [genre, setGenre] = useState(GAME_GENRES[0].name);
  const [title, setTitle] = useState("");
  const subs = subgenresFor(genre);
  const [sub, setSub] = useState(subs[0]);
  const author = state.user?.name || "you";
  const generate = () => {
    const name = title.trim() || `Untitled ${genre}`;
    addTo("games", {
      id: `g-${Date.now()}`, title: name, author, genre, subgenre: sub, lang,
      plays: 0, rating: null, mine: true,
      desc: `A ${t.complexity.toLowerCase()} ${genre.toLowerCase()} game generated in ${lang} via Ocular Code ConnectZ.`,
    });
    setTitle("");
    onOpen?.("gamez"); // published — jump to the GameZ browser
  };
  return (
    <div className="card">
      <div className="card-header">👁️‍🗨️ Ocular Code ConnectZ <span className="tag">{t.label} · {t.complexity}</span></div>
      <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 10 }}>{t.desc}</p>
      <div className="form-group"><label>Game title</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name your game" /></div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Genre</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{GAME_GENRES.map((g) => <Pill key={g.name} active={genre === g.name} onClick={() => { setGenre(g.name); setSub(subgenresFor(g.name)[0]); }}>{g.emoji} {g.name}</Pill>)}</div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Subgenre</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{subs.map((s) => <Pill key={s} active={sub === s} onClick={() => setSub(s)}>{s}</Pill>)}</div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Language ({t.label} tier)</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{t.languages.map((l) => <Pill key={l} active={lang === l} onClick={() => setLang(l)}>{l}</Pill>)}</div>
      <button className="btn" style={{ width: "100%" }} onClick={generate}>🎮 Generate {t.complexity.toLowerCase()} game in {lang} → GameZ</button>
      <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 8 }}>🔐 Any attempt to access Music ConnectZ repos is flagged, prevented, and alerts the owner — unless it's the owner. Media requests route to the matching Intelligence app.</p>
      <IntelNote role="Developer" />
    </div>
  );
}

function IntelligencePage({ tier, onOpen }) {
  const [app, setApp] = useState("image");
  const Body = { image: ImageConnectZ, instrumental: InstrumentalConnectZ, mix: MixConnectZ, video: VideoConnectZ, sentence: SentenceConnectZ, occ: OccConnectZ }[app];
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
      <Body tier={tier} onOpen={onOpen} />
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

const FN_PAGES = {
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
  labelz: LabelZPage,
  lilith: LilithPage,
  intelligence: IntelligencePage,
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
    api("/api/auth/stats/").then((s) => on && setTier(s?.my_tier || "")).catch(() => {});
    if (isSignedIn()) syncEconomy();
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
    <LimitsProvider tier={tier} serverOk={serverOk}>
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
              <FnPage tier={tier} onOpen={openApp} serverOk={serverOk} syncEconomy={syncEconomy} onTierChange={setTier} />
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
