// A copy of what a member uploads, kept ON THEIR OWN DEVICE (IndexedDB), so a file the server later loses can still be downloaded back.
//
// Why this exists: the server's upload storage was temporary (erased on every deploy), and a master a member made was gone with no way back.
// The audio is made or chosen on their device, so the device is the one place that is guaranteed to have had it. This keeps a bounded number
// of recent files and lets a "missing" row offer a download of the member's own copy. It is a safety net, not a replacement for permanent
// server storage, and the screens say so.
//
// Bounded on purpose (VAULT_CAP_MB, oldest dropped first, one file never over MAX_FILE_MB): it must never fill a phone or fail an upload. Every
// call is guarded; a private window or blocked storage just means no safety copy, and nothing else changes.
export const VAULT_CAP_MB = 800;
export const MAX_FILE_MB = 300;
const MB = 1024 * 1024;

export const vaultKey = (kind, id) => `${kind}:${id}`;

/** Which stored entries to drop (oldest first) so `incomingBytes` fits under the cap. Pure. Entries: { key, size, savedAt }. */
export function planEviction(entries, incomingBytes, capBytes = VAULT_CAP_MB * MB) {
  const keep = [...entries].filter((e) => !e.ref).sort((a, b) => a.savedAt - b.savedAt);
  let total = keep.reduce((n, e) => n + (e.size || 0), 0) + incomingBytes;
  const drop = [];
  for (const e of keep) { if (total <= capBytes) break; drop.push(e.key); total -= e.size || 0; }
  return drop;
}
export const fitsVault = (bytes) => Number.isFinite(bytes) && bytes > 0 && bytes <= MAX_FILE_MB * MB;

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("no indexedDB")); return; }
    const r = indexedDB.open("mcz-vault", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files", { keyPath: "key" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
const run = (mode, fn) => open().then((db) => new Promise((resolve, reject) => {
  const tx = db.transaction("files", mode);
  const out = fn(tx.objectStore("files"));
  tx.oncomplete = () => { db.close(); resolve(out?.result ?? out); };
  tx.onerror = () => { db.close(); reject(tx.error); };
  tx.onabort = () => { db.close(); reject(tx.error); };
}));
const getAll = () => open().then((db) => new Promise((resolve, reject) => {
  const r = db.transaction("files").objectStore("files").getAll();
  r.onsuccess = () => { db.close(); resolve(r.result || []); };
  r.onerror = () => { db.close(); reject(r.error); };
}));

/** Keep a copy of `blob` under kind:id. Returns true if it was kept. Never throws. */
export async function keepCopy(kind, id, blob, name = "") {
  try {
    if (!(blob instanceof Blob) || !fitsVault(blob.size)) return false;
    const all = await getAll();
    const drop = planEviction(all, blob.size);
    await run("readwrite", (os) => { drop.forEach((k) => os.delete(k)); return os.put({ key: vaultKey(kind, id), name: String(name || blob.name || "file"), type: blob.type || "", size: blob.size, savedAt: Date.now(), blob }); });
    return true;
  } catch { return false; }
}

/** A small pointer: this master's file IS that upload's copy, so it is stored once. */
export async function aliasCopy(kind, id, refKind, refId) {
  try { await run("readwrite", (os) => os.put({ key: vaultKey(kind, id), ref: vaultKey(refKind, refId), savedAt: Date.now() })); return true; } catch { return false; }
}

/** { name, size, type, savedAt, blob } or null. Follows an alias. Never throws. */
export async function getCopy(kind, id) {
  try {
    const get = (key) => open().then((db) => new Promise((resolve) => { const r = db.transaction("files").objectStore("files").get(key); r.onsuccess = () => { db.close(); resolve(r.result || null); }; r.onerror = () => { db.close(); resolve(null); }; }));
    let row = await get(vaultKey(kind, id));
    if (row?.ref) row = await get(row.ref);
    return row && row.blob ? row : null;
  } catch { return null; }
}

export async function dropCopy(kind, id) {
  try { await run("readwrite", (os) => os.delete(vaultKey(kind, id))); return true; } catch { return false; }
}
