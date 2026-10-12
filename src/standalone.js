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
