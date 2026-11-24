// Open a DAW session on another device: the opt-in copy kept on the member's account.
//
// A session is made in IndexedDB on one device (store.js), so another device never saw it. When a member
// turns "Open on my other devices" on for a session, its arrangement is saved to /economy/dawz/sessions/
// and each sound goes up as an ordinary upload under their storage quota (so the cost is MB they already
// have, said before the switch). The other device lists those sessions and pulls one in when it is opened.
// The server decides what fits; nothing here invents a size limit.
import { api } from "../api.js";
import { getSource, loadSession, putSource, saveSession } from "./store.js";
import { sourcesToSend } from "./cloudList.js";

const BASE = "/api/economy/dawz/sessions/";
const enc = encodeURIComponent;

/** What turning it on will add to storage: the sounds not yet uploaded, measured from the device's own copies. */
export async function sizeToSend(session, audio = {}) {
  let bytes = 0;
  for (const id of sourcesToSend(session, audio)) { const b = await getSource(id).catch(() => null); bytes += b?.size || 0; }
  return bytes;
}

export const listCloud = () => api(BASE).then((d) => d?.sessions || []);

/** Uploads the missing sounds, saves the arrangement, remembers the upload ids. Throws with the server's own sentence. */
export async function syncSession(id) {
  const row = await loadSession(id);
  if (!row) throw new Error("That session isn't on this device.");
  const audio = { ...(row.cloud?.audio || {}) };
  try {
    for (const sid of sourcesToSend(row.session, audio)) {
      const blob = await getSource(sid);
      if (!blob) continue;                                 // lost on this device: nothing to send, the session says so on open
      const form = new FormData();
      form.append("file", blob, `daw-${sid}.wav`);
      const res = await api("/api/economy/uploads/", { method: "POST", body: form });
      if (!res?.upload?.id) throw new Error("A sound didn't upload, so the session was not saved to your account.");
      audio[sid] = res.upload.id;
    }
    await api(`${BASE}${enc(id)}/`, { method: "PUT", body: { app: row.app, session: row.session, audio, updated: row.updated } });
  } catch (e) {
    // Sounds already up are remembered, so a retry sends only the rest rather than filling storage twice.
    await saveSession(id, row.app, row.session, { on: !!row.cloud?.on, audio, syncedAt: row.cloud?.syncedAt || 0 }).catch(() => {});
    throw e;
  }
  await saveSession(id, row.app, row.session, { on: true, audio, syncedAt: Date.now() });
  return row.updated;
}

/** Brings the account's copy onto this device: the arrangement and every sound, then it is an ordinary local session. */
export async function pullSession(id) {
  const d = await api(`${BASE}${enc(id)}/`);
  const audio = {};
  let lost = 0;
  for (const [sid, a] of Object.entries(d.audio || {})) {
    if (!a?.url || a.missing) { lost += 1; continue; }
    const have = await getSource(sid).catch(() => null);
    if (have) { audio[sid] = a.id; continue; }
    const r = await fetch(a.url);
    if (!r.ok) { lost += 1; continue; }
    await putSource(sid, await r.blob());
    audio[sid] = a.id;
  }
  await saveSession(id, d.app, d.session, { on: true, audio, syncedAt: Date.now() });
  return { lost, updated: d.updated };
}

/** Removes the account's copy (and the sounds it uploaded). The copy on this device is untouched. */
export const removeCloud = (id) => api(`${BASE}${enc(id)}/`, { method: "DELETE" });
