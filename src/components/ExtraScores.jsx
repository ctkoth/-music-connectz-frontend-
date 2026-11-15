// Opt-in extra scores — Wit, Depth, Rhyme scheme, Wordplay, Metaphors, Imagery, Lyric Clarity and
// Mainstream Appeal.
// Each is its own choice, and each has its own second choice: whether it counts
// toward the overall. Off by default on both, so the headline number only moves
// when the member says so. The list and labels are the server's (`wit_scores`).
import SelectAllBar, { useSelectAllAllowed } from "./SelectAllBar.jsx";

export default function ExtraScores({ scores, neverCounted = [], value, onChange, disabled }) {
  const bulk = useSelectAllAllowed();
  const entries = Object.entries(scores || {});
  if (!entries.length) return null;
  const set = (k, patch) => {
    const cur = value[k] || { on: false, count: false };
    const next = { ...cur, ...patch };
    if (!next.on) next.count = false;
    onChange({ ...value, [k]: next });
  };
  const keys = entries.map(([k]) => k);
  const onKeys = keys.filter((k) => value[k]?.on);
  // Select all ticks every extra and leaves each "counts in overall" as it was;
  // Clear unticks them (and with them their count).
  const setOn = (next) => onChange(Object.fromEntries(keys.map((k) =>
    [k, next.includes(k) ? { on: true, count: !!value[k]?.count } : { on: false, count: false }])));
  const countable = onKeys.filter((k) => !neverCounted.includes(k));
  const allCounted = countable.length > 0 && countable.every((k) => value[k]?.count);
  const countAll = (count) => onChange({ ...value,
    ...Object.fromEntries(countable.map((k) => [k, { on: true, count }])) });
  return (
    <fieldset className="space-y-1 text-[11px] text-white/60" disabled={disabled}>
      <legend className="text-white/75">Extra scores <span className="text-white/35">(optional)</span></legend>
      <p className="text-white/35">
        Pick any. Each shows beside your overall score and leaves it alone — tick
        "counts in overall" on the ones you want inside it. Judged on the words the coach
        can actually make out; a style that doesn't ask for one reads "—". Mainstream Appeal is
        reach, not quality, so it always stays beside your overall.
      </p>
      <p className="flex flex-wrap items-center gap-3">
        <SelectAllBar all={keys} picked={onKeys} onChange={setOn} disabled={disabled} />
        {bulk && countable.length > 1 && (
          <button type="button" className="underline text-white/60" onClick={() => countAll(!allCounted)}>
            {allCounted ? "Count none in overall" : `Count all ${countable.length} ticked in overall`}
          </button>
        )}
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
