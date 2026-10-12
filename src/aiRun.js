// The pure part of the AI-run screens (Sentence, Instrumental and Video ConnectZ):
// how long a run may be waited on, what to say when the answer never arrived,
// and what a price line has to state. Nothing here DECIDES a price or an
// allowance — those are the server's, from GET — this only chooses which true
// thing to say about them. It runs under plain node, so it imports nothing that
// reads import.meta.env. (The emoji are the screens' to render, from resources.js.)

// ---- How long to wait --------------------------------------------------------

/** Used when GET did not say what the server's own budget is. */
export const DEFAULT_RUN_TIMEOUT_MS = 120_000;
const MARGIN_SECONDS = 30;

/**
 * How long the browser waits for a run before giving up on the ANSWER.
 *
 * api.js stops a request at 30s unless told otherwise, and a compose/write run
 * takes the server up to 60-90s. So the browser used to abort first, say
 * "Nothing was charged" — and the server went on, finished, charged and saved
 * the piece. The wait has to be LONGER than the server's, so that a server that
 * answers in time is always the one that decides.
 */
export function runTimeoutMs(budgetSeconds) {
  const b = Number(budgetSeconds);
  return Number.isFinite(b) && b > 0 ? Math.round((b + MARGIN_SECONDS) * 1000) : DEFAULT_RUN_TIMEOUT_MS;
}

/** The server's stated budget in whole seconds, or null when it did not state one. */
export function budgetOf(s) {
  const b = Number(s?.budget_seconds);
  return Number.isFinite(b) && b > 0 ? Math.round(b) : null;
}

export const clock = (sec) => {
  const t = Math.max(0, Math.floor(Number(sec) || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

// ---- When the answer never arrived ------------------------------------------

/**
 * True when we do not know what happened: the wait ran out, the connection
 * dropped, or a PROXY in front of the server gave up (a gateway error with no
 * JSON body of ours — gunicorn and the host's router answer in HTML). The server
 * may well have finished, charged and saved the piece in every one of those.
 *
 * An answer from the view itself is a verdict and is NOT this, even a 504: the
 * server's own deadline answers 504 with `timed_out: true` and a body that says
 * nothing was charged, because it checks the deadline before it bills.
 */
export function unknownOutcome(e) {
  if (!e) return false;
  if (e.timedOut === true || e.status === undefined || e.status === 0) return true;
  if (e.data?.timed_out === true) return false;
  return (e.status === 502 || e.status === 503 || e.status === 504) && e.data == null;
}

/**
 * What to say instead of "Nothing was charged" — which is only true of an
 * answer, not of silence. `where` is the heading the finished piece would be
 * listed under, so the member can go and look before paying twice.
 */
export function unknownOutcomeNote(e, where) {
  const lead = e?.timedOut ? "That took longer than we waited for."
    : e?.status >= 500 ? "The server stopped answering before it said how that went."
    : "The connection dropped before we heard back.";
  return `${lead} If it finished it will be under ${where} — check there before trying again.`;
}

// ---- Money and the split a price is taken in ---------------------------------

/** "$4.00" from cents. */
export const money = (cents) => `$${(Math.max(0, Number(cents) || 0) / 100).toFixed(2)}`;

/**
 * How a price in cents is taken from a wallet: PromptZ first, then cash (1 🏷️ is
 * 1¢). This mirrors the order the server takes them in — it is how the two
 * halves get stated BEFORE the button, not a second place the rule lives; the
 * server still takes what it takes. Null when the screen was not told what the
 * member holds, so the caller falls back to a bare "−N 🏷️" rather than guess.
 */
export function splitCost(cost, promptz) {
  const c = Math.round(Number(cost));
  if (!Number.isFinite(c) || c < 0) return null;
  if (typeof promptz !== "number" || !Number.isFinite(promptz)) return null;
  const p = Math.min(Math.max(0, Math.floor(promptz)), c);
  return { promptz: p, cents: c - p };
}

// ---- The price line for a free-prompt-then-paid run -------------------------

/**
 * What the price line beside a Write/Compose button has to say, as data:
 *
 *   loading  — GET has not answered (or failed): there is no price to state, so
 *              the button must not be live.
 *   off      — the server says the feature is not switched on.
 *   free     — today's free allowance covers it. The allowance is "free
 *              prompts", NOT 🏷️: the 🏷️ is the paid credit and a free run does
 *              not touch it.
 *   paid     — it will be paid, and `split` is how (PromptZ then cash) when the
 *              server served the member's holdings.
 *   blocked  — configured, not free, not affordable. `holds` is what they have.
 */
export function priceView(s) {
  if (!s) return { state: "loading", canRun: false };
  if (!s.configured) return { state: "off", canRun: false };
  const cost = Number(s.cost_cents);
  // No price served means no price to state, and a run is never live without one.
  if (!Number.isFinite(cost) && !s.free_today) return { state: "loading", canRun: false };
  const left = Number(s.daily_remaining) || 0;
  if (s.free_today) {
    return { state: "free", canRun: s.can_run !== false, left, allowance: Number(s.daily_allowance) || null };
  }
  // Free prompts can remain while the run is still not free: a prompt only
  // covers a run up to a size. The two reasons need different sentences.
  const freeLeft = left > 0;
  const split = splitCost(cost, s.promptz);
  if (s.can_run) return { state: "paid", canRun: true, cost, split, freeLeft };
  const holdsKnown = typeof s.promptz === "number" && typeof s.money_cents === "number";
  return {
    state: "blocked", canRun: false, cost, freeLeft,
    holds: holdsKnown ? { promptz: s.promptz, cents: s.money_cents } : null,
  };
}

/** The one-line form for a build that has no CollabZ/BattleZ/DistributeZ of its own. */
export function shellRoyaltyLine(noun, rule) {
  return rule ? `If you later take this ${noun} to Music ConnectZ: ${rule}` : "";
}
