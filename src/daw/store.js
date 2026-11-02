// Sessions kept on THIS device, in IndexedDB: the session itself and the audio its regions play.
//
// Nothing here goes to the server — a session is the member's work in progress, and the platform keeps
// what they choose to save (a bounce, in FileZ). The cost of that is said on screen: a session lives in
// this browser on this device, clearing site data clears it, and another device will not see it.
// Every call is wrapped, because private windows and blocked storage throw, and a DAW that fails to
// autosave must keep working and say so rather than stop.

const DB = "mcz-dawz";
const VERSION = 1;

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("This browser keeps no storage here.")); return; }
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id" });
      if (!db.objectStoreNames.contains("sources")) db.createObjectStore("sources", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Couldn't open this device's storage."));
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
  .then((rows) => (rows || []).map(({ id, name, app, updated }) => ({ id, name, app, updated })).sort((a, b) => b.updated - a.updated));

export const loadSession = (id) => run("sessions", "readonly", (os) => req(os.get(id))).then((row) => row || null);

export const saveSession = (id, app, session) =>
  run("sessions", "readwrite", (os) => req(os.put({ id, app, name: session.name, updated: Date.now(), session })));

export async function removeSession(id) {
  await run("sessions", "readwrite", (os) => req(os.delete(id)));
  await sweepSources();
}

export const putSource = (id, blob) => run("sources", "readwrite", (os) => req(os.put({ id, blob })));
export const getSource = (id) => run("sources", "readonly", (os) => req(os.get(id))).then((row) => row?.blob || null);

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
