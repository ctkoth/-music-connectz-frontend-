// What a member says when they share a score — worded for the score they are
// holding, because the same sentence does not work for a 9 and a 4.
//
// A high score is a flex and a dare ("think you can beat it?"). A low one is a
// beginning, and the honest version of that is the more shareable story: the coach
// told them what to fix, and the next card will show the climb. Neither claims
// anything the coach did not say — the number is the server's, and this only
// frames it. Kept pure so it can be tested under plain node.

const fmt = (n) => (Number.isInteger(Number(n)) ? String(n) : Number(n).toFixed(1));

/** "HookZ 8 · FeelZ 7" from the server's extras rows (or {label, value} pairs) — the same numbers the card shows. */
export function extrasText(extras) {
  const bits = (extras || []).filter((x) => x && x.value != null && x.label).map((x) => `${String(x.label).split(" ")[0]} ${fmt(x.value)}`);
  return bits.join(" · ");
}

export function shareText({ score, exact, progress, pb, extras } = {}) {
  if (progress) {
    return `${progress.label}: ${fmt(progress.was)} → ${fmt(progress.now)} in ${progress.days} days with the AI coach 📈 — get your take scored free:`;
  }
  const n = exact ?? score;
  const x = extrasText(extras);
  const tail = x ? ` (${x})` : "";
  // A personal best is about THEM, needs no comparison and a beginner can have one:
  // the most shareable thing a score can be that is not a high score.
  if (pb && n != null) return `New personal best with the AI coach: ${fmt(n)}/10${tail} 🏆 — get your take scored free:`;
  if (n == null) return "Get your take scored by the AI coach, free:";
  if (n >= 8) return `The AI coach gave my take ${fmt(n)}/10${tail} 🔥 — think you can beat it? Get yours scored free:`;
  if (n >= 5) return `The AI coach gave my take ${fmt(n)}/10${tail} 🎤 — get yours scored free:`;
  return `Day one with the AI coach: ${fmt(n)}/10${tail}. Honest feedback and a plan to fix it — watch me climb 📈 Get yours scored free:`;
}

/** Share through the device's sheet when there is one, else copy. Returns how it went. */
export async function shareLink({ text, url, title = "Music ConnectZ" }) {
  const full = url.startsWith("http") ? url : `${window.location.origin}${url}`;
  try {
    if (navigator.share) { await navigator.share({ title, text, url: full }); return "shared"; }
    await navigator.clipboard.writeText(`${text} ${full}`);
    return "copied";
  } catch { return "cancelled"; }
}
