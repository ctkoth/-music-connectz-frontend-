// Coach Review Promo Video: what appears on screen, and when. Pure (plain node).
//
// The renderer (components/CoachPromoVideo.jsx) draws the member's own take with a
// gradient overlay and records it in the browser. Everything shown comes from the
// coach's read as the member saw it; nothing here invents a line or a number.

export const DURATIONS = [15, 30, 60];

/** Words wrapped to lines of at most `max` characters (a long word is cut). */
export function wrapLines(text, max = 28, maxLines = 5) {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const out = [];
  let cur = "";
  for (const w0 of words) {
    const w = w0.length > max ? `${w0.slice(0, max - 1)}…` : w0;
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= max) cur += " " + w;
    else { out.push(cur); cur = w; }
    if (out.length === maxLines) break;
  }
  if (cur && out.length < maxLines) out.push(cur);
  if (out.length === maxLines && words.join(" ").length > out.join(" ").length) {
    out[maxLines - 1] = out[maxLines - 1].replace(/.?$/, "…");
  }
  return out;
}

/**
 * The cards, in order, across `seconds`: the verdict, then each strength (green),
 * then each fix (amber). Each gets an equal slice, at least 3 s; if there are too
 * many for the length, the earliest are kept (verdict first, strengths before fixes).
 */
export function schedule(review, seconds = 30) {
  const cards = [];
  if (review?.verdict) cards.push({ tone: "verdict", title: "The coach's read", text: review.verdict });
  for (const s of (review?.strengths || []).slice(0, 3)) cards.push({ tone: "good", title: "What's working", text: s });
  for (const f of (review?.fixes || []).slice(0, 3)) {
    cards.push({ tone: "fix", title: "Next to fix", text: typeof f === "string" ? f : f?.text || "" });
  }
  const usable = cards.filter((c) => c.text);
  const n = Math.max(1, Math.min(usable.length, Math.floor(seconds / 3)));
  const each = seconds / n;
  return usable.slice(0, n).map((c, i) => ({ ...c, start: i * each, end: (i + 1) * each }));
}

/** The card on screen at time t, or null. */
export const cardAt = (cards, t) => cards.find((c) => t >= c.start && t < c.end) || cards[cards.length - 1] || null;

/** "7.2" from the exact score when there is one, else the whole number. */
export const scoreText = (r) => (r?.exact != null ? Number(r.exact).toFixed(1) : r?.score != null ? String(r.score) : "");

/** Best container this browser can record a video in, MP4 first (what TikTok takes best). */
export function bestVideoMime(isSupported) {
  const list = ["video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return list.find((m) => { try { return isSupported(m); } catch { return false; } }) || "";
}
