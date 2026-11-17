// Actions: a recorded list of whole-picture steps (filters, Levels, Curves, presets, image size,
// rotation) that can be replayed on another picture. Pure — the editor supplies `run(step)`.
// Saved per device in localStorage; a step this build does not know is skipped, never guessed.

export const STEP_KINDS = new Set(["filter", "levels", "curves", "adjust", "size", "rotate"]);
const KEY = "mcz_imagez_actions";

export function cleanStep(s) {
  if (!s || !STEP_KINDS.has(s.kind)) return null;
  const out = { kind: s.kind };
  for (const [k, v] of Object.entries(s)) {
    if (k === "kind") continue;
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "string" && v.length <= 40) out[k] = v;
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = {};
      for (const [k2, v2] of Object.entries(v)) if (typeof v2 === "number" && Number.isFinite(v2)) o[k2] = v2;
      out[k] = o;
    }
  }
  return out;
}

export function describeStep(s) {
  return {
    filter: () => `Filter: ${s.key}`, levels: () => "Levels", curves: () => "Curves", adjust: () => "Adjustments",
    size: () => `Image size ${Math.round((s.k || 1) * 100)}%`, rotate: () => `Rotate ${s.dir > 0 ? "right" : "left"}`,
  }[s.kind]?.() || s.kind;
}

export function loadActions(store = globalThis.localStorage) {
  try {
    const raw = JSON.parse(store?.getItem(KEY) || "[]");
    return (Array.isArray(raw) ? raw : []).slice(0, 50).map((a) => ({
      name: String(a?.name || "Action").slice(0, 60),
      steps: (Array.isArray(a?.steps) ? a.steps : []).map(cleanStep).filter(Boolean).slice(0, 100),
    })).filter((a) => a.steps.length);
  } catch { return []; }
}

export function saveActions(list, store = globalThis.localStorage) {
  try { store?.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; }
}

/** Replay, in order. `run` may be async; a step that throws stops the replay and says which. */
export async function replay(action, run) {
  let done = 0;
  for (const s of action.steps) {
    try { await run(s); done++; } catch (e) { return { done, failed: describeStep(s), error: e.message }; }
  }
  return { done, failed: null };
}
