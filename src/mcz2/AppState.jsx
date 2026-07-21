import { createContext, useContext, useEffect, useMemo, useState } from "react";

// localStorage key kept identical to the code_2.2 prototype so an existing
// prototype user's data carries over unchanged.
const STORE_KEY = "musicConnectZState";

const DEFAULT_STATE = {
  user: { name: "", email: "", phone: "", birthday: "", gender: "", location: "", bio: "", profilePic: null, verified18: false, links: [], nationalities: [], languages: [], substances: {}, preferences: { partnerGender: "", traits: [] } },
  // When each metric was last saved (ISO), anchoring its tier edit window so a
  // metric locks after the window passes (NationalitieZ, SubstanceZ, …).
  metricSavedAt: {},
  // Universal social layer: likes/dislikes/comments keyed by any item id, so
  // posts, CollabZ, BattleZ, profiles — anything — is shareable/rateable/commentable.
  social: {},
  personas: [],
  examples: [],
  collabs: [],
  wallet: { balance: 0, earned: 0 },
  paymentHistory: [],
  energy: 0,
  spinaz: 0,
  energyLog: [],
  spinazLog: [],
  // Platform State Model (blueprint): XP-driven progression shared across
  // RapZ / SingZ / Lilith / BodieZ / challenges.
  progression: { xp: 0, level: 1, streak: 0, lastDay: "", shields: 1, badges: [], xpLog: [] },
  releases: [],
  royalties: 0,
  royaltyLog: [],
  messages: [],
  labelContracts: [],
  lilithTasks: [],
  boardPosts: [],
  speczOwned: [],
  games: [],
  battleBets: {}, // { [mode]: { a, b, myMoney, mySpinazSide, collected } } — BattleZ wagers
  // Ocular Code ConnectZ workspace (Claude-Code-style): tasks, learned notes,
  // logs and the automation settings that drive OCC.
  occ: {
    tasks: [],      // { id, text, status, eta, at, undoUntil }
    codez: [],      // { id, term, means, count }
    paths: [],      // { id, device, path }
    mistakes: [],   // { id, text, at }
    habits: [],     // { id, text, at }
    tell: [],       // { id, tab, text, at } — prompts/posts log
    log: [],        // { id, kind, text, at } — everything OCC did
    repos: [],      // { id, owner, name, branch } — GitHub repos OCC can commit to
    defaultRepo: null, // id of the repo new commits target
    knowledge: [],  // { id, course, text, at } — what the user has taught Corey GPT
    exports: [],    // { id, name, ext, category, app, at } — media OCC routed to Intelligence apps
    settings: { automated: false, suggestions: true, model: "corey-gpt", language: "JavaScript / HTML5" },
  },
  callLog: [],
  dawVotes: {},
  sentenceDocs: [],
  videoProjects: [],
  facez: [],
  venues: [],
  trainingBest: {},
  // SingZ vocal game: onboarding, sessions, quests, badges, strain safety.
  singz: { onboarded: false, range: "", goalRange: "", goalPath: "strengthen", difficulty: "starter", sessions: [], badges: [], strain: 0, questDay: "", quests: {} },
  groups: [],
  bodiez: { location: "Gym", customEquipment: ["Bodyweight"], routines: [] },
  onboardDismissed: false,
  currentTab: "setup",
  settings: {
    theme: "neon-cyan",
    accent: "#22e6ff", // tab-highlight glow color (premium/statz customizable)
    lightDark: "dark",
    uiLang: "en", // display language for the whole app (LanguageZ). NOTE: distinct
                  // from settings.language, which is OCC's *coding* language.
    appIcons: {}, // per-app chosen icon overrides: { [appKey]: iconFile }
    notifications: true,
    ratezAttractiveness: true, // let RateZ ratings move your attractiveness median
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
      occ: { ...DEFAULT_STATE.occ, ...(saved.occ || {}), settings: { ...DEFAULT_STATE.occ.settings, ...((saved.occ || {}).settings || {}) } },
      progression: { ...DEFAULT_STATE.progression, ...(saved.progression || {}) },
      singz: { ...DEFAULT_STATE.singz, ...(saved.singz || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

// data-theme now only controls panel depth (dark vs light); the accent glow
// color is applied separately as a CSS variable.
export function dataThemeFor(settings) {
  return settings.lightDark === "light" ? "light" : "dark";
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
      // Award XP (level = 1 + xp/100) and log it. Blueprint progression model.
      addXP: (amount, note = "") =>
        setState((s) => {
          const p = s.progression || { xp: 0, level: 1, badges: [], xpLog: [] };
          const xp = Math.max(0, (p.xp || 0) + amount);
          return {
            ...s,
            progression: {
              ...p,
              xp,
              level: 1 + Math.floor(xp / 100),
              xpLog: [{ amount, note, at: Date.now() }, ...(p.xpLog || [])].slice(0, 100),
            },
          };
        }),
      // Award a cosmetic badge once (no duplicates).
      awardBadge: (badge) =>
        setState((s) => {
          const p = s.progression || { badges: [] };
          if ((p.badges || []).includes(badge)) return s;
          return { ...s, progression: { ...p, badges: [...(p.badges || []), badge] } };
        }),
      // Daily streak bookkeeping: called on load. Consecutive days build the
      // streak; a gap resets to 1 (a shield can save one missed day).
      touchStreak: () =>
        setState((s) => {
          const p = s.progression || { streak: 0, lastDay: "", shields: 1 };
          const today = new Date().toISOString().slice(0, 10);
          if (p.lastDay === today) return s;
          const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
          let streak; let shields = p.shields ?? 1;
          if (p.lastDay === y) streak = (p.streak || 0) + 1;
          else if (p.lastDay && shields > 0) { streak = (p.streak || 0) + 1; shields -= 1; } // shield saves the gap
          else streak = 1;
          return { ...s, progression: { ...p, streak, shields, lastDay: today } };
        }),
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
