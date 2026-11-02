// Opt-in extra scores — Wit, Depth, Rhyme scheme, Wordplay, Metaphors, Imagery, Lyric Clarity and
// Mainstream Appeal.
// Each is its own choice, and each has its own second choice: whether it counts
// toward the overall. Off by default on both, so the headline number only moves
// when the member says so. The list and labels are the server's (`wit_scores`).
export default function ExtraScores({ scores, neverCounted = [], value, onChange, disabled }) {
  const entries = Object.entries(scores || {});
  if (!entries.length) return null;
  const set = (k, patch) => {
    const cur = value[k] || { on: false, count: false };
    const next = { ...cur, ...patch };
    if (!next.on) next.count = false;
    onChange({ ...value, [k]: next });
  };
  return (
    <fieldset className="space-y-1 text-[11px] text-white/60" disabled={disabled}>
      <legend className="text-white/75">Extra scores <span className="text-white/35">(optional)</span></legend>
      <p className="text-white/35">
        Pick any. Each shows beside your overall score and leaves it alone — tick
        "counts in overall" on the ones you want inside it. Judged on the words the coach
        can actually make out; a style that doesn't ask for one reads "—". Mainstream Appeal is
        reach, not quality, so it always stays beside your overall.
      </p>
      <div className="grid gap-1 sm:grid-cols-2">
        {entries.map(([k, label]) => {
          const v = value[k] || { on: false, count: false };
          return (
            <div key={k} className="flex items-center justify-between gap-2 rounded border border-white/10 px-2 py-1">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={v.on} onChange={(e) => set(k, { on: e.target.checked })}
                       className="h-3.5 w-3.5 accent-mcz-cyan" />
                <span className="text-white/80">{label}</span>
              </label>
              {neverCounted.includes(k) ? (
                <span className="text-white/35">beside overall</span>
              ) : (
                <label className={`flex cursor-pointer items-center gap-1 ${v.on ? "" : "opacity-30"}`}>
                  <input type="checkbox" checked={v.count} disabled={!v.on}
                         onChange={(e) => set(k, { count: e.target.checked })}
                         className="h-3 w-3 accent-mcz-cyan" />
                  <span>counts in overall</span>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/** {key:{on,count}} → the request fields. Only sent for keys the server offers. */
export function extraFields(value, scores, neverCounted = []) {
  const out = {};
  for (const k of Object.keys(scores || {})) {
    const v = value?.[k];
    if (v?.on) { out[`rate_${k}`] = "1"; if (v.count && !neverCounted.includes(k)) out[`count_${k}`] = "1"; }
  }
  return out;
}
