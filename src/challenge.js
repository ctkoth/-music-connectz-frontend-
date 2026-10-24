// "Beat my score" — the comparison, said honestly.
//
// Both numbers are the coach's own: theirs from the share card the server minted,
// yours from your own take. Compared at the precision the card shows (one decimal
// when there is one), and a tie is a tie — nobody wins on rounding.

const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

export function beatVerdict({ mine, theirs, who }) {
  const a = num(mine), b = num(theirs);
  if (a == null || b == null) return null;
  const them = who ? `@${who}` : "them";
  if (a > b) return { won: true, text: `You beat ${them} — ${a} to ${b}. Share it back.` };
  if (a < b) return { won: false, text: `${who ? `@${who}` : "They"} still hold it, ${b} to ${a}. Fix what the coach says and go again — it's free daily.` };
  return { won: false, text: `A dead heat with ${them} — ${a} each.` };
}
