import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { AppStateProvider, useAppState, dataThemeFor } from "./AppState.jsx";
import { CATALOG, APPS_BY_KEY } from "./catalog.js";
import "./mcz2.css";

const THEMES = [
  { id: "neon-cyan", label: "Cyan", color: "#22e6ff" },
  { id: "neon-pink", label: "Pink", color: "#ff2bd1" },
  { id: "neon-purple", label: "Purple", color: "#a855f7" },
  { id: "neon-gold", label: "Gold", color: "#ffcf3f" },
  { id: "neon-green", label: "Green", color: "#4ade80" },
  { id: "neon-orange", label: "Orange", color: "#fb923c" },
  { id: "neon-red", label: "Red", color: "#f43f5e" },
  { id: "neon-blue", label: "Blue", color: "#4da6ff" },
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
function tierInfo(tier) {
  const t = (tier || "").toLowerCase();
  if (t.includes("statz") || t.includes("stats")) return { label: "StatZ", limit: Infinity };
  if (t.includes("premium") || t.includes("pro")) return { label: "Premium", limit: 5 };
  return { label: "Free", limit: 1 };
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

function SettingsPage() {
  const { state, setTheme, toggleSetting } = useAppState();
  const { settings } = state;
  return (
    <>
      <div className="card">
        <div className="card-header">🎨 Neon Themes</div>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <div key={t.id} onClick={() => setTheme(t.id)}
              className={`theme-option${settings.theme === t.id ? " active" : ""}`}
              style={{ background: t.color }}>
              {t.label}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--text-light)" }}>Toggle 🌙 / ☀️ in the header for panel depth.</p>
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

const FN_PAGES = {
  setup: SetupPage,
  personas: PersonasPage,
  examples: PostZPage,
  profile: ProfilePage,
  money: MoneyPage,
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

  const [view, setView] = useState(null); // null = launcher; else an fn app key
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
    <div className="mcz2-root" data-theme={dataThemeFor(settings)}>
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
              <FnPage />
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
