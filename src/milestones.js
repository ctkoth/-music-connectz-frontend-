// Milestones worth a celebration that the member doesn't watch happen — a
// battle settling, a badge landing — noticed the next time they look.
//
// "Seen" lives in localStorage: a per-viewer convenience, and losing it costs
// at most one repeated celebration. The FIRST read only records a baseline, so
// opening the app on a new device never replays every old win at once.
import { api } from "./api.js";
import { celebrate } from "./celebrate.js";

export function newSince(storeKey, ids) {
  let seen = null;
  try { seen = JSON.parse(localStorage.getItem(storeKey) || "null"); } catch { seen = null; }
  const fresh = Array.isArray(seen) ? ids.filter((id) => !seen.includes(id)) : [];
  try { localStorage.setItem(storeKey, JSON.stringify([...new Set([...(seen || []), ...ids])].slice(-500))); } catch { /* storage blocked */ }
  return fresh;
}

/** BattleZ: celebrate a newly settled win — as the winner, or as a backer. */
export function celebrateBattles(battles, me) {
  const settled = (battles || []).filter((b) => b.status === "settled");
  const fresh = new Set(newSince("mcz_seen_settled_battles", settled.map((b) => b.id)));
  for (const b of settled) {
    if (!fresh.has(b.id)) continue;
    const paid = Number(b.my_wager?.paid_out) || 0;
    if (me && b.winner === me) {
      celebrate("spinaz", paid, { label: `🏆 You won “${b.title}”`, sound: "battle", big: true });
    } else if (b.my_wager && paid > Number(b.my_wager.amount || 0)) {
      celebrate("spinaz", paid, { label: `you backed the winner in “${b.title}”` });
    }
  }
}

/** App-wide: celebrate a badge that wasn't there last time. */
export function checkBadges() {
  return api("/api/economy/badgez/").then((d) => {
    const badges = d?.badges || [];
    const fresh = newSince("mcz_seen_badges", badges.map((b) => b.key));
    for (const b of badges.filter((x) => fresh.includes(x.key))) {
      celebrate(null, 0, { label: `${b.emoji || "🏅"} Badge earned: ${b.name}`, sound: "badge", big: true });
    }
  }).catch(() => {});
}

/** CollabZ / BattleZ: celebrate becoming PartnerZ❤️, once, for the two of you. */
export function celebratePartnerz(items, me, kind) {
  const mine = (items || []).filter((x) => (x.partnered || []).some((p) => p.includes(me)));
  const fresh = new Set(newSince(`mcz_seen_partnerz_${kind}`, mine.map((x) => x.id)));
  for (const x of mine) {
    if (!fresh.has(x.id)) continue;
    for (const pair of x.partnered.filter((p) => p.includes(me))) {
      const them = pair.find((u) => u !== me);
      celebrate(null, 0, { label: `PartnerZ❤️ with @${them} — “${x.title}” made it official`, sound: "level_up", big: true });
    }
  }
}
