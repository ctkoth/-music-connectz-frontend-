// The pure part of src/workSave.js: no imports, so it can be tested under plain node.

const keyOf = (app, wid) => `mcz_work:${app}:${wid}`;

/** This device's copy of a screen's kept work, or null. */
export function readDevice(app, wid) {
  try { return JSON.parse(localStorage.getItem(keyOf(app, wid)) || "null"); } catch { return null; }
}

export function writeDevice(app, wid, snap) {
  try { localStorage.setItem(keyOf(app, wid), JSON.stringify(snap)); } catch { /* full or blocked: the account copy still goes up */ }
}

/** Whether a copy from the account should be offered back. Never when it matches what the screen holds now; otherwise
 *  when it is newer than this device's copy, or this device has none. */
export function offerBack(device, remote, current) {
  if (!remote || !remote.data) return false;
  if (JSON.stringify(remote.data) === JSON.stringify(current)) return false;
  return !device || Number(remote.updated) > Number(device.updated || 0);
}
