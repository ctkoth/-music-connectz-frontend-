// Words for the five-control bar (karma · rate · comment · share · open in…).
// Nothing here decides anything: the server says what each control costs, earns
// and where it goes, and this only turns that into the text beside the control.
// Pure, so it runs under plain node.

// The address to hand out. The server gives a PATH (the item's public page);
// an empty path means it has no shareable page (a private post), never "copy a
// blank".
export function shareUrl(origin, share) {
  if (!share || !share.path) return "";
  return `${String(origin || "").replace(/\/$/, "")}${share.path}`;
}

// What the Comment control shows BEFORE it is pressed: free (and how many are
// left today) or the energy it costs.
export function commentPrice(d) {
  if (!d) return { kind: "none", cost: 0, text: "" };
  if (d.comment_cost_energy > 0) return { kind: "cost", cost: d.comment_cost_energy, text: "" };
  return { kind: "free", cost: 0, text: `free (${d.comment_free_left ?? 0} left today)` };
}

// What the Rate control shows: how it stands, and the gain a FIRST rating pays.
// Absent, never zero, when nobody has rated.
export function rateState(d) {
  if (!d) return { text: "", gain: 0 };
  const text = d.rating != null ? `${d.rating}/10 · ${d.rating_count}` : "not rated yet";
  const gain = !d.my_rating && d.rating_reward_energy > 0 ? d.rating_reward_energy : 0;
  return { text, gain };
}

// Why a control is switched off, said on the control — never a silent dead button.
export function whyOff(control, { canRate, share, opens }) {
  if (control === "rate" && !canRate) return "You can't rate your own work";
  if (control === "share" && !(share && share.path)) return (share && share.who) || "This has no page to link to";
  if (control === "open" && !(opens && opens.length)) return "Nothing else opens this yet";
  return "";
}

// The mood row. The list, the counts and this member's own come from the server
// (`moods`); this only joins them. Moods with nobody on them are not drawn in the
// row (they are still in the picker), so a bar with no reactions stays quiet.
export function moodRows(moods) {
  const list = (moods && Array.isArray(moods.list)) ? moods.list : [];
  const counts = (moods && moods.counts) || {};
  const mine = (moods && moods.mine) || "";
  return list.map((m) => ({ ...m, count: Number(counts[m.key]) || 0, mine: m.key === mine }));
}

export function shownMoods(moods) {
  return moodRows(moods).filter((m) => m.count > 0).sort((a, b) => b.count - a.count);
}

// Pressing the mood you are already on clears it; any other sets it.
export function nextMood(moods, key) {
  return moods && moods.mine === key ? "" : key;
}
