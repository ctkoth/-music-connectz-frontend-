// PhilosophieZ's small decisions, free of React and of `import.meta.env` so plain node can test them.
// The two lists are the server's (`/api/economy/philosophiez/`); nothing here names a philosophy or a
// political outlook, and nothing here ranks one.

/** "Only you" / "Members" / "Members + Friends" — who can see `field`, from the server's own settings
 *  row for this member (`me.visibility`). Never assumed: a default that is not stated is a disclosure by
 *  accident, and politics in particular is private until opened. `audiences` is the served token → label
 *  list (custom groups included); an unknown token is shown as it came rather than dropped. */
export function whoSees(visibility, audiences, field) {
  const row = Array.isArray(visibility) ? visibility.find((v) => v.field === field) : null;
  if (!row) return "";
  const BASE = { private: "Only you", member: "Members", public: "Everyone" };
  return (Array.isArray(row.level) ? row.level : [row.level])
    .map((t) => BASE[t] || (audiences || []).find((a) => a.token === t)?.label || t).join(" + ");
}

/** A key → label lookup built from a served list, so a card can word a stored key without a second copy. */
export const labelMap = (rows) => Object.fromEntries((rows || []).map((r) => [r.key, r.label]));

/** `philosophies=a,b&politics=c` — one place builds it, like religionQuery and languageQuery. */
export function philosophyQuery({ philosophies = [], politics = [] } = {}) {
  const parts = [];
  if (philosophies.length) parts.push(`philosophies=${philosophies.join(",")}`);
  if (politics.length) parts.push(`politics=${politics.join(",")}`);
  return parts.join("&");
}

/** Toggle a key in a multi-select list without mutating it. */
export const toggleKey = (list, key) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
