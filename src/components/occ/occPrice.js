// The numbers and sentences OCC's screen states BEFORE anything is pressed.
//
// Pure on purpose: nothing here imports api.js or reads import.meta.env, so the
// price line, the timeouts and the failure copy are tested under plain node
// (occPrice.test.mjs). And it decides nothing about money — every figure it
// prints arrives from the server (`GET /api/economy/ai/models/`,
// `GET /api/economy/occ/run/`). The one thing that lives here is WHICH sentence
// goes with which situation, because that is the part that kept being wrong.
import { ENERGY, PROMPTZ, amount } from "../../resources.js";

export const NOT_CHARGED_IF_FAILS = "A reply that fails isn't charged.";

// ---- the chat's Send button ---------------------------------------------------

/**
 * What the Send button says it costs, and whether it can be pressed.
 *
 *   engine — the selected row from `models[]` (name, cost_cents, allowed,
 *            free_today, affordable, required_tier)
 *   state  — the rest of the models payload (daily_prompts, daily_prompts_left,
 *            daily_prompt_max_cents, promptz, money_cents)
 *
 * `kind` is "free" | "paid" | "locked" | "short" | "unknown".
 *   free   the day's allowance covers THIS engine — "Free today — uses 1 of …"
 *   paid   −N 🏷️, and the wallet covers it
 *   short  −N 🏷️ and it does not: Send is off, with the number they are short by
 *   locked the member's tier does not reach this engine
 *
 * `free_today` is the server's own answer (the same two tests the chat endpoint
 * applies). It is read, not recomputed: a client that worked out "3 free prompts
 * cover up to 3 🏷️" would be a second place that rule lives. A payload without
 * the field reads as not-free, which shows a price — the safe way to be wrong.
 */
export function sendPrice(engine, state = {}) {
  if (!engine) return { kind: "unknown", canSend: false, text: "", note: "" };
  if (engine.allowed === false) {
    return {
      kind: "locked", canSend: false, text: "",
      note: `${engine.name} needs ${engine.required_tier || engine.tier}.`,
    };
  }
  const left = Number(state.daily_prompts_left ?? 0);
  const allowance = Number(state.daily_prompts ?? 0);
  if (engine.free_today) {
    return {
      kind: "free", canSend: true,
      text: `Free today — uses 1 of your ${allowance} free prompts`,
      note: `${left} left today.`,
    };
  }
  const cost = Number(engine.cost_cents ?? 0);
  const text = amount(cost, PROMPTZ, "−");
  // Why the free allowance is not covering this one, said while there is still
  // time to pick a different engine: two different walls, two different fixes.
  const max = Number(state.daily_prompt_max_cents ?? 0);
  let note = "";
  if (allowance > 0) {
    if (cost > max) note = `A free prompt covers engines up to ${amount(max, PROMPTZ)}.`;
    else if (left <= 0) note = "Today's free prompts are spent.";
  }
  if (engine.affordable === false) {
    const have = Number(state.promptz ?? 0) + Number(state.money_cents ?? 0);
    return {
      kind: "short", canSend: false, text, cost, have, short: Math.max(0, cost - have),
      note: `You have ${amount(have, PROMPTZ)} and this needs ${amount(cost, PROMPTZ)}.${note ? ` ${note}` : ""}`,
    };
  }
  return { kind: "paid", canSend: true, text, cost, note };
}

/** The engine a member could switch to and run free right now, if there is one. */
export function freeAlternative(models, currentKey) {
  return (models || []).find((m) => m.allowed && m.free_today && m.key !== currentKey) || null;
}

/** A locked engine's sentence. Inside a shell there is nothing to buy, so the
 *  sentence stops at the fact and never grows an upgrade. */
export function lockedNote(row, { inShell = false } = {}) {
  const need = row.required_tier || row.tier;
  return inShell ? `Needs ${need}.` : `Needs ${need} — upgrade in MembershipZ.`;
}

// ---- how long to wait --------------------------------------------------------

// The server's own budget for one chat reply is `chat_budget_seconds`; the
// client waits LONGER, so a server that answers in time is always the one that
// decides and this only fires when nothing answered at all (api.js says the
// same of its own default). Falls back to a bound that is longer than any budget
// the server has shipped, not to api.js's 30s — which would abort a healthy
// reply from a slow engine and say it "took too long".
export const CHAT_MARGIN_SECONDS = 20;
export const CHAT_FALLBACK_BUDGET_SECONDS = 100;

export function chatTimeoutMs(budgetSeconds) {
  const b = Number(budgetSeconds);
  const budget = Number.isFinite(b) && b > 0 ? b : CHAT_FALLBACK_BUDGET_SECONDS;
  return Math.round((budget + CHAT_MARGIN_SECONDS) * 1000);
}

// A sandbox run: the container is killed at `seconds`, but pulling the image and
// starting it happen before the clock does. The default 30s client timeout
// aborted a healthy 120-second run and said "Nothing was charged" — while the
// server went on to charge up to 120 ⚡.
export const RUN_STARTUP_MARGIN_SECONDS = 60;

export function runTimeoutMs(seconds) {
  const s = Number(seconds);
  const base = Number.isFinite(s) && s > 0 ? s : 120;
  return Math.round((base + RUN_STARTUP_MARGIN_SECONDS) * 1000);
}

// ---- the sandbox's Run button ------------------------------------------------

/**
 * How long the Run button lets a run be, what that costs at most, and why not.
 * `execute` is `spec.execute` (= `GET /occ/run/`). The server works out
 * `max_seconds_now` — the tier's ceiling, today's remainder and the member's own
 * ⚡, whichever bites first — so the price on the button is the price of the run
 * that will be made, not of a ceiling the member cannot reach.
 */
export function runLimit(execute) {
  if (!execute) return { seconds: 0, price: 0, blocked: true, why: "" };
  const perSecond = Number(execute.cost?.per_second ?? 1);
  const seconds = Number(
    execute.max_seconds_now
      ?? Math.min(execute.per_run_seconds ?? 0, execute.seconds_left_today ?? 0));
  const price = Number(execute.max_cost_now ?? seconds * perSecond);
  if (seconds > 0) return { seconds, price, perSecond, blocked: false, why: "" };
  const left = Number(execute.seconds_left_today ?? 0);
  return {
    seconds: 0, price: 0, perSecond, blocked: true,
    why: left <= 0
      ? "Today's sandbox time is used up."
      : `You need at least ${amount(perSecond, ENERGY)} to run — Energy regenerates hourly.`,
  };
}

/** "−1 ⚡ per second", from the server's rate — never typed into the screen. */
export function perSecondText(execute) {
  return `${amount(execute?.cost?.per_second ?? 1, ENERGY, "−")} per second`;
}

// ---- when it fails -----------------------------------------------------------

const hasAnswer = (e) => typeof e?.status === "number" && e.status > 0;

/**
 * The sentence for a failed chat call, and where to go from it.
 *
 * The server's sentence is shown unreworded whenever the server answered: it
 * knows which failure it was and whether anything was charged. The only
 * sentences written here are for the two cases where NOBODY answered (the
 * request timed out in the browser, or the connection dropped) — and those
 * cannot promise "nothing was charged", because the server may have finished
 * after we stopped listening.
 */
export function chatFailure(e) {
  const code = e?.data?.code || "";
  const detail = e?.data?.detail || e?.message || "";
  if (code === "not_configured" || /LLM backend unavailable/i.test(detail)) {
    return { kind: "off", text: "OCC's chat isn't switched on yet." };
  }
  if (!hasAnswer(e) || e?.timedOut) {
    return {
      kind: "silent",
      text: "OCC stopped waiting for a reply. If one went through it shows in LogZ — "
        + NOT_CHARGED_IF_FAILS,
    };
  }
  if (e.status === 402) {
    return {
      kind: "payment", text: detail,
      door: e.data?.open_in ? { tab: e.data.open_in, target: e.data.target || "" } : null,
      buy: e.data?.buy_in ? { tab: e.data.buy_in, target: e.data.buy_target || "" } : null,
    };
  }
  return { kind: "refused", text: detail || "That didn't send." };
}

/** The sentence for a failed sandbox run — its own copy, not api.js's. api.js
 *  says "Nothing was charged" for any timeout, which is true of a take and false
 *  of a run the server may well be charging for right now. */
export function runFailure(e) {
  if (!hasAnswer(e) || e?.timedOut) {
    return "OCC stopped waiting for the sandbox. A run that finished is charged "
      + `(${ENERGY} in LogZ) and its output is in WorkZ — check there before running it again.`;
  }
  return e?.data?.detail || e?.message || "That run didn't happen.";
}

// ---- the conversation --------------------------------------------------------

/**
 * `history` for the chat endpoint, from the messages already on screen:
 * [{ role: "user" | "occ", text }], newest last, capped to what the server will
 * read (`limits.history_turns`, each clipped to `limits.history_chars`). Sending
 * more is not wrong — the server trims — but it is bytes for nothing, and the
 * trim drops the OLDEST turns it was sent.
 *
 * A turn that failed, or has no text, is not part of the conversation.
 */
export function historyFor(messages, limits = {}) {
  const turns = Number(limits.history_turns) || 8;
  const chars = Number(limits.history_chars) || 4000;
  return (messages || [])
    .filter((m) => m && !m.failed && String(m.text || "").trim())
    .map((m) => ({ role: m.role === "occ" ? "occ" : "user", text: String(m.text).slice(0, chars) }))
    .slice(-turns);
}

/** A WorkZ title from the prompt that was asked: its first line, short. */
export function titleFromPrompt(prompt) {
  const first = String(prompt || "").trim().split("\n")[0].trim();
  return (first || "OCC reply").slice(0, 160);
}
