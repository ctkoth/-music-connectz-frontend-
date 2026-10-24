// A PersonalitieZ result taken before the visitor had an account. The result screen says
// "A free account keeps it", so it is kept here until signup sends it — the same carry the
// trial take gets (trialToken.js). Only the four letters, the per-axis clarity and the
// depth: nothing a visitor typed.
const KEY = "mcz_quiz_result";

export function keepQuizResult(r) {
  if (!r?.code) return;
  try { localStorage.setItem(KEY, JSON.stringify({ code: r.code, clarity: r.clarity || {}, depth: r.depth || "basic" })); }
  catch { /* blocked storage: the result is shown, it just can't ride the signup */ }
}

export function storedQuizResult() {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}

export function clearQuizResult() {
  try { localStorage.removeItem(KEY); } catch { /* blocked */ }
}
