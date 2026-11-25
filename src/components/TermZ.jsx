// TermZ — the numbers in a label agreement, as fields the label fills in and as plain sentences the artist reads
// BEFORE signing. The field list (labels, ranges, choices) and the sentences are the server's (`term_fields`,
// `terms_lines` from /api/economy/labelz/); nothing about a term is typed here. Every field is optional, and a value
// outside its range is refused by the server rather than bent into one.

/** The label's side: one input per field the server lists. `value` is {key: string}; `onChange` gets the new object. */
export function TermFields({ fields, value, onChange }) {
  if (!Array.isArray(fields) || !fields.length) return null;
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <fieldset className="space-y-2 rounded-lg border border-white/10 p-3 sm:col-span-2">
      <legend className="px-1 text-xs font-semibold text-violet-200">📑 TermZ · the numbers (all optional)</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.key} className="space-y-0.5 text-xs text-white/70">
            <span>{f.label}{f.unit ? ` (${f.unit})` : ""}{f.kind === "money" ? " ($)" : ""}</span>
            {f.kind === "choice" ? (
              <select data-nomemo="true" className="neon-input !py-1.5" value={value[f.key] || ""} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">Not set</option>
                {f.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            ) : (
              <input type="number" className="neon-input !py-1.5" min={f.min ?? 0} max={f.max} step={f.kind === "money" ? "any" : 1}
                     value={value[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
            )}
          </label>
        ))}
      </div>
      <p className="text-[11px] text-white/50">Free. Said in plain sentences to the artist before they sign, and part of what the signature covers. Nothing here moves money.</p>
    </fieldset>
  );
}

/** What the terms say, in the server's sentences. Renders nothing when none were set. */
export function TermLines({ lines }) {
  if (!Array.isArray(lines) || !lines.length) return null;
  return (
    <div className="rounded-lg border border-violet-300/20 bg-violet-500/10 p-3 text-xs">
      <p className="mb-1 font-semibold text-violet-200">📑 TermZ — in plain words</p>
      <ul className="list-disc space-y-0.5 pl-4 text-white/80">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </div>
  );
}
