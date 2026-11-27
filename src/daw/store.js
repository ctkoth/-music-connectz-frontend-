// Sessions kept on THIS device, in IndexedDB: the session itself and the audio its regions play.
//
// Nothing here goes to the server — a session is the member's work in progress, and the platform keeps
// what they choose to save (a bounce, in FileZ). The cost of that is said on screen: a session lives in
// this browser on this device, clearing site data clears it, and another device will not see it.
// Every call is wrapped, because private windows and blocked storage throw, and a DAW that fails to
// autosave must keep working and say so rather than stop.

// A session may also be kept on the member's account (cloud.js), opt-in per session. That choice and which
// upload holds each sound live on the session's own row as `cloud`, so removing the row forgets them.
const DB = "mcz-dawz";
const VERSION = 2;   // 2 adds the stems kept for Mix ConnectZ (keepStems below)

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("This browser keeps no storage here.")); return; }
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id" });
      if (!db.objectStoreNames.contains("sources")) db.createObjectStore("sources", { keyPath: "id" });
      if (!db.objectStoreNames.contains("stems")) db.createObjectStore("stems", { keyPath: "key" }).createIndex("batch", "batch");
      if (!db.objectStoreNames.contains("stemBatches")) db.createObjectStore("stemBatches", { keyPath: "id" });
    };
    // Blocked means another tab still holds the older version open. That usually clears in a moment, so wait a little before
    // saying so; and if it clears after we have said so, the connection that finally opens is closed rather than kept.
    let settled = false;
    const settle = (fn) => { if (!settled) { settled = true; fn(); } };
    req.onblocked = () => setTimeout(() => settle(() => reject(new Error("Close the other tabs of this app and reload, so this device's storage can update."))), 3000);
    req.onsuccess = () => { if (settled) { req.result.close(); return; } settled = true; resolve(req.result); };
    req.onerror = () => settle(() => reject(req.error || new Error("Couldn't open this device's storage.")));
  });
}

async function run(store, mode, fn) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const os = tx.objectStore(store);
      let out;
      Promise.resolve(fn(os)).then((v) => { out = v; });
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => reject(tx.error || new Error("A save on this device failed."));
      tx.onabort = () => reject(tx.error || new Error("A save on this device was stopped — the device may be out of space."));
    });
  } finally { db.close(); }
}

const req = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

export const listSessions = () => run("sessions", "readonly", (os) => req(os.getAll()))
  .then((rows) => (rows || []).map(({ id, name, app, updated, session, cloud }) => ({ id, name, app, updated, cloud: !!cloud?.on, genre: session?.genre || "", key: session?.key || "", bpm: session?.bpm, skills: Array.isArray(session?.skills) ? session.skills : [] })).sort((a, b) => b.updated - a.updated));

export const loadSession = (id) => run("sessions", "readonly", (os) => req(os.get(id))).then((row) => row || null);

/** Saves the session. `cloud` is left as it was unless passed (null forgets it), so an autosave never drops it. */
export const saveSession = (id, app, session, cloud) =>
  run("sessions", "readwrite", async (os) => {
    const prev = await req(os.get(id));
    const keep = cloud === undefined ? prev?.cloud : cloud;
    return req(os.put({ id, app, name: session.name, updated: Date.now(), session, ...(keep ? { cloud: keep } : {}) }));
  });

export async function removeSession(id) {
  await run("sessions", "readwrite", (os) => req(os.delete(id)));
  await sweepSources();
}

export const putSource = (id, blob) => run("sources", "readwrite", (os) => req(os.put({ id, blob })));
export const getSource = (id) => run("sources", "readonly", (os) => req(os.get(id))).then((row) => row?.blob || null);

// Stems the DAW sends to Mix ConnectZ, kept on THIS device until the member removes them. They are rendered tracks, not a
// session, and until now lived only as in-tab blobs, so a reload or a closed tab lost them. A batch is listed only once every
// stem in it is stored (stems first, the batch row last); a save that fails part way removes what it wrote.

/** Ask the browser not to clear this site's storage to make room. True when it agreed. */
export async function askToKeep() {
  try { return !!(await navigator.storage?.persist?.()); } catch { return false; }
}

/** Keep a batch of rendered stems, [{ title, blob }], under `id`. Resolves once the whole batch is on the device. */
export async function keepStems(id, { session = "", of = 0, stems, persisted = false }) {
  try {
    for (const [index, st] of stems.entries()) {
      await run("stems", "readwrite", (os) => req(os.put({ key: `${id}:${index}`, batch: id, index, title: st.title, blob: st.blob })));
    }
    await run("stemBatches", "readwrite", (os) => req(os.put({ id, session, of: of || stems.length, count: stems.length, sentAt: Date.now(), persisted })));
  } catch (e) {
    await removeStems(id).catch(() => {});
    throw e;
  }
  return id;
}

/** Batches kept on this device, newest first. Metadata only: no audio is read to list them. */
export const listStemBatches = () => run("stemBatches", "readonly", (os) => req(os.getAll()))
  .then((rows) => (rows || []).sort((a, b) => b.sentAt - a.sentAt));

/** One kept batch, with its stems in the order they were sent. Null when it is no longer on this device. */
export async function loadStemBatch(id) {
  const meta = await run("stemBatches", "readonly", (os) => req(os.get(id)));
  if (!meta) return null;
  const rows = await run("stems", "readonly", (os) => req(os.index("batch").getAll(id)));
  return { ...meta, stems: (rows || []).sort((a, b) => a.index - b.index).map((r) => ({ title: r.title, blob: r.blob })) };
}

/** Remove a kept batch and its audio. */
export async function removeStems(id) {
  const keys = await run("stems", "readonly", (os) => req(os.index("batch").getAllKeys(id)));
  if (keys?.length) await run("stems", "readwrite", (os) => Promise.all(keys.map((k) => req(os.delete(k)))));
  await run("stemBatches", "readwrite", (os) => req(os.delete(id)));
}

/** Delete stored audio no saved session points at any more. */
export async function sweepSources() {
  const sessions = await run("sessions", "readonly", (os) => req(os.getAll()));
  const used = new Set();
  (sessions || []).forEach((row) => Object.keys(row.session?.sources || {}).forEach((k) => used.add(k)));
  const keys = await run("sources", "readonly", (os) => req(os.getAllKeys()));
  const stale = (keys || []).filter((k) => !used.has(k));
  if (stale.length) await run("sources", "readwrite", (os) => Promise.all(stale.map((k) => req(os.delete(k)))));
  return stale.length;
}
