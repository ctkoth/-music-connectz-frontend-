import { createContext, useContext, useEffect, useMemo, useState } from "react";

// localStorage key kept identical to the code_2.2 prototype so an existing
// prototype user's data carries over unchanged.
const STORE_KEY = "musicConnectZState";

const DEFAULT_STATE = {
  user: { name: "", email: "", phone: "", birthday: "", gender: "", location: "", bio: "", profilePic: null },
  personas: [],
  examples: [],
  collabs: [],
  wallet: { balance: 0, earned: 0 },
  paymentHistory: [],
  currentTab: "setup",
  settings: {
    theme: "theme-blue",
    lightDark: "light",
    notifications: true,
    collabAlerts: true,
    paymentAlerts: true,
    emailDigest: true,
    shareLocation: true,
    privateMode: false,
    soundEffects: true,
    bgMusic: false,
    vibration: true,
    autoDark: false,
  },
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (!saved) return structuredClone(DEFAULT_STATE);
    // Merge over defaults so newly added fields are always present.
    return {
      ...structuredClone(DEFAULT_STATE),
      ...saved,
      user: { ...DEFAULT_STATE.user, ...(saved.user || {}) },
      wallet: { ...DEFAULT_STATE.wallet, ...(saved.wallet || {}) },
      settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

// The wrapper's data-theme: dark mode wins; otherwise the chosen accent theme.
export function dataThemeFor(settings) {
  return settings.lightDark === "dark" ? "dark" : settings.theme;
}

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [state, setState] = useState(loadState);

  // Persist on every change (mirrors the prototype's saveAppState()).
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — app still works for the session */
    }
  }, [state]);

  const actions = useMemo(
    () => ({
      // Shallow top-level merge, e.g. update({ currentTab: "money" }).
      update: (partial) => setState((s) => ({ ...s, ...partial })),
      // Merge into state.user.
      updateUser: (partial) => setState((s) => ({ ...s, user: { ...s.user, ...partial } })),
      // Merge into state.wallet.
      updateWallet: (partial) => setState((s) => ({ ...s, wallet: { ...s.wallet, ...partial } })),
      // Merge into state.settings.
      updateSettings: (partial) => setState((s) => ({ ...s, settings: { ...s.settings, ...partial } })),
      toggleSetting: (key) =>
        setState((s) => ({ ...s, settings: { ...s.settings, [key]: !s.settings[key] } })),
      setTheme: (theme) => setState((s) => ({ ...s, settings: { ...s.settings, theme } })),
      toggleLightDark: () =>
        setState((s) => ({
          ...s,
          settings: { ...s.settings, lightDark: s.settings.lightDark === "light" ? "dark" : "light" },
        })),
      setTab: (currentTab) => setState((s) => ({ ...s, currentTab })),
      // Append to a list field (personas/examples/collabs/paymentHistory).
      addTo: (field, item) => setState((s) => ({ ...s, [field]: [...s[field], item] })),
      // Remove by index from a list field.
      removeFrom: (field, idx) => setState((s) => ({ ...s, [field]: s[field].filter((_, i) => i !== idx) })),
      // Replace an entire list field.
      setList: (field, list) => setState((s) => ({ ...s, [field]: list })),
      reset: () => setState(structuredClone(DEFAULT_STATE)),
    }),
    [],
  );

  const value = useMemo(() => ({ state, ...actions }), [state, actions]);
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within <AppStateProvider>");
  return ctx;
}
