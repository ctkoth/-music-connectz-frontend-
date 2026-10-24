// Which build is running. "" on the main site; a name in the single-app shells
// under standalone/ (set by their vite config through VITE_STANDALONE).
//
// The rule every shared screen follows inside a shell: no door to a screen the
// shell does not have (a button onto nothing is the dead button this app keeps
// relearning), and nothing that offers a purchase or an upgrade — Play's billing
// rules do not allow selling from inside an app that is not using Play Billing.
// A member who already holds a balance still sees the price and spends it.
export const STANDALONE = import.meta.env.VITE_STANDALONE || "";

// True in any shell. Screens hide outward doors and upgrade offers on this.
export const IN_SHELL = STANDALONE !== "";

// The IntelligenceZ app (standalone/intelligencez/) — one shell holding several
// IntelligenceZ screens, which may link to EACH OTHER but to nothing else.
export const IN_INTELLIGENCEZ = STANDALONE === "intelligencez";

// The SkillZ app (standalone/skillz/) — the hub and the seven instrument coaches.
// The coaches are the same screens the main site mounts (InstrumentZ → BossTake,
// ProgressPanel, SkillZPanel), so each door in them to a screen this shell lacks has
// to ask `shellHas`: a button onto nothing is the dead button this app keeps
// relearning.
export const IN_SKILLZ = STANDALONE === "skillz";

// Every tab the SkillZ shell answers `mcz-goto-tab` for (standalone/skillz/Shell.jsx
// keeps its own TABS in step with this — `skillz.test.mjs` fails if they drift).
export const SKILLZ_TABS = ["skillz", "singz", "rapz", "guitarz", "bassz", "keyz", "violinz", "drumz"];

/** Can a door to this tab be offered here? On the main site, yes (App.jsx answers
 *  every tab); in the SkillZ shell only for a tab the shell has; in any other shell
 *  never, because none of them mounts a coach. */
export const shellHas = (tab) => !IN_SHELL || (IN_SKILLZ && SKILLZ_TABS.includes(tab));
