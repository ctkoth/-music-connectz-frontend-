// Include / exclude muscles — pure, so it runs under plain node.
//
// Each muscle is in one of three states: untouched, ONLY (show just the ones marked only) or HIDE (drop it).
// One tap cycles untouched -> only -> hide -> untouched, so "show chest and back, hide legs" is three taps
// and "back to everything" never needs a Clear button. The server (SessionZ) and the BodyMap screen both
// read the same `{ only: [], hide: [] }`, so the two can never disagree about what a filter means.

export const EMPTY = Object.freeze({ only: [], hide: [] });

export function cycle(state, key) {
  const only = state.only.includes(key), hide = state.hide.includes(key);
  if (!only && !hide) return { only: [...state.only, key], hide: state.hide };
  if (only) return { only: state.only.filter((k) => k !== key), hide: [...state.hide, key] };
  return { only: state.only, hide: state.hide.filter((k) => k !== key) };
}

export const stateOf = (state, key) => (state.only.includes(key) ? "only" : state.hide.includes(key) ? "hide" : "");

export const isActive = (state) => !!(state && (state.only.length || state.hide.length));

/** Keep what a filter keeps: if anything is marked ONLY, just those; then drop anything marked HIDE. */
export function apply(items, keyOf, state) {
  if (!isActive(state)) return items;
  return items.filter((it) => {
    const k = keyOf(it);
    if (state.hide.includes(k)) return false;
    return state.only.length === 0 || state.only.includes(k);
  });
}

/** The two server parameters, blank when empty. */
export const params = (state) => ({ muscle: (state?.only || []).join(","), not_muscle: (state?.hide || []).join(",") });
