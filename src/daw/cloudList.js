// The pure half of cloud.js (no network, no storage), so it runs under plain node.

/** Source ids in the session that have no upload yet. */
export const sourcesToSend = (session, audio = {}) => Object.keys(session?.sources || {}).filter((id) => !audio[id]);

export const mb = (bytes) => Math.round((bytes / (1024 * 1024)) * 10) / 10;

/**
 * The picker's rows: this device's sessions, plus those on the account that are not here yet or are newer there.
 * Each row says where it stands (`remote`: "only" on the account / "newer" there, `cloud`: kept on the account).
 */
export function mergeLists(local, remote) {
  const byId = new Map(local.map((r) => [r.id, { ...r }]));
  for (const r of remote || []) {
    const mine = byId.get(r.id);
    if (!mine) byId.set(r.id, { ...r, remote: "only", cloud: true });
    else { mine.cloud = true; if (r.updated > mine.updated) { mine.remote = "newer"; mine.updated = r.updated; } }
  }
  return [...byId.values()].sort((a, b) => b.updated - a.updated);
}

/** The words beside a picker row, so a session from another device is never a surprise. */
export const originNote = (r) => (r.remote === "only" ? " · from your account" : r.remote === "newer" ? " · newer on your account" : r.cloud ? " · on your account" : "");
