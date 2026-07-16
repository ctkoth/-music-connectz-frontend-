import { useAuth } from "../auth/AuthContext.jsx";
import { AppStateProvider, useAppState, dataThemeFor } from "./AppState.jsx";
import "./mcz2.css";

// The seven tabs from code_2.2, in order. Bodies land in Phase 2; for now each
// renders a placeholder so the shell, nav, theming, and state are reviewable.
const TABS = [
  { key: "setup", label: "⚙️ Setup" },
  { key: "personas", label: "🎭 Personas" },
  { key: "examples", label: "🎵 PostZ" },
  { key: "collaborate", label: "🤝 Collab" },
  { key: "profile", label: "👤 Profile" },
  { key: "money", label: "💰 Money" },
  { key: "settings", label: "⚙️ Settings" },
];

const THEMES = [
  { id: "theme-blue", label: "🔵 Blue", color: "#2196F3" },
  { id: "theme-purple", label: "🟣 Purple", color: "#9C27B0" },
  { id: "theme-red", label: "🔴 Red", color: "#F44336" },
  { id: "theme-green", label: "🟢 Green", color: "#4CAF50" },
  { id: "theme-orange", label: "🟠 Orange", color: "#FF9800" },
  { id: "theme-pink", label: "🌸 Pink", color: "#E91E63" },
  { id: "theme-teal", label: "🔷 Teal", color: "#00BCD4" },
  { id: "theme-indigo", label: "💙 Indigo", color: "#3F51B5" },
];

const SETTING_TOGGLES = [
  { key: "notifications", label: "🔔 Push Notifications" },
  { key: "collabAlerts", label: "🤝 Collab Alerts" },
  { key: "paymentAlerts", label: "💰 Payment Alerts" },
  { key: "emailDigest", label: "📧 Email Digest" },
  { key: "shareLocation", label: "📍 Share Location" },
  { key: "privateMode", label: "🔒 Private Mode" },
  { key: "soundEffects", label: "🔊 Sound Effects" },
  { key: "bgMusic", label: "🎶 Background Music" },
  { key: "vibration", label: "📳 Vibration" },
  { key: "autoDark", label: "🌗 Auto Dark Mode" },
];

// Placeholder for tabs whose full bodies arrive in Phase 2.
function TabPlaceholder({ title }) {
  return (
    <div className="card">
      <div className="card-header">{title}</div>
      <p style={{ fontSize: 12, color: "var(--text-light)" }}>
        Coming in the next build phase — the shell, navigation, theming, and saved state are live now.
      </p>
    </div>
  );
}

function SettingsTab() {
  const { state, setTheme, toggleSetting } = useAppState();
  const { settings } = state;
  return (
    <>
      <div className="card">
        <div className="card-header">🎨 8 Color Themes</div>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <div
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`theme-option${settings.theme === t.id ? " active" : ""}`}
              style={{ background: t.color, color: "#fff" }}
            >
              {t.label}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--text-light)" }}>
          Accent themes apply in light mode. Toggle 🌙 in the header for dark mode.
        </p>
      </div>
      <div className="card">
        <div className="card-header">🔔 Preferences</div>
        {SETTING_TOGGLES.map((row) => (
          <div key={row.key} className="settings-toggle">
            <label>{row.label}</label>
            <div
              role="switch"
              aria-checked={!!settings[row.key]}
              onClick={() => toggleSetting(row.key)}
              className={`toggle-switch${settings[row.key] ? " active" : ""}`}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const { state, setTab, toggleLightDark } = useAppState();
  const { currentTab, wallet, settings } = state;

  const idx = Math.max(0, TABS.findIndex((t) => t.key === currentTab));
  const prev = () => setTab(TABS[(idx - 1 + TABS.length) % TABS.length].key);
  const next = () => setTab(TABS[(idx + 1) % TABS.length].key);

  const balance = Number(wallet.balance || 0).toFixed(2);
  const initial = (user?.username || "?").charAt(0).toUpperCase();

  return (
    <div className="mcz2-root" data-theme={dataThemeFor(settings)}>
      <div className="container">
        <div className="header">
          <div style={{ display: "flex", gap: 8 }}>
            <button className="nav-btn" onClick={prev} aria-label="Previous tab">←</button>
            <button className="nav-btn" onClick={next} aria-label="Next tab">→</button>
            <button className="theme-toggle" onClick={toggleLightDark} aria-label="Toggle dark mode">
              {settings.lightDark === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
          <div className="header-center">
            <div className="header-title">🎵 Music ConnectZ</div>
            <div className="header-subtitle">{user?.username ? `@${user.username}` : "Signed in"}</div>
          </div>
          <div className="header-right">
            <div className="balance" onClick={() => setTab("money")}>💰 ${balance}</div>
            <div className="profile-pic" onClick={() => setTab("profile")}>
              {user?.username ? initial : "👤"}
            </div>
          </div>
        </div>

        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab-btn${currentTab === t.key ? " active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="content">
          {currentTab === "settings" ? (
            <SettingsTab />
          ) : (
            <TabPlaceholder title={TABS[idx].label} />
          )}

          <button
            className="btn btn-secondary btn-small"
            onClick={logout}
            style={{ marginTop: 4 }}
          >
            🚪 Log out
          </button>
        </div>
      </div>
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
