// A screen's unsaved work, kept so it is still there after a reload, and, for StatZ, on the member's account too.
//
// The device copy is written when the member CHANGES something (localStorage, so it works signed out and offline), and
// is what a reload comes back to. Opening a screen writes nothing and sends nothing: an account copy that is newer than
// this device's is offered back, and replaces nothing until the member presses Restore. For StatZ, a change goes up to
// the account a moment later; a copy that fails is tried again.
//
// Pictures and sound are NOT in `data`. A screen that has them keeps those as ordinary uploads and names them there.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { useStatzTrial } from "./components/StatzSample.jsx";
import { offerBack, readDevice, writeDevice } from "./workSaveCore.js";

const clock = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/**
 * `data` is a memoised JSON-able object, or null for nothing to keep yet. `apply(data)` puts a restored copy on the screen.
 * `device` keeps the device copy too (on by default). Pass `active: false` where the work must not leave the device.
 */
export function useWorkSave({ app, wid, data, name = "", apply, device = true, active = true }) {
  const { s: statz } = useStatzTrial();
  const isStatz = !!statz?.is_statz;
  const [offer, setOffer] = useState(null);
  const [status, setStatus] = useState({ kind: "idle", text: "" });
  const pending = useRef(null);       // the newest snapshot not yet confirmed on the account
  const failures = useRef(0);
  const retryTimer = useRef(null);
  const sendTimer = useRef(null);     // not cleared by re-renders: a change still reaches the account after a status update
  const lastJson = useRef(undefined); // what this screen last wrote or sent; undefined until it has been opened
  const ids = useRef({ app, wid, name });
  const dataRef = useRef(data);
  const applyRef = useRef(apply);
  useEffect(() => { ids.current = { app, wid, name }; dataRef.current = data; applyRef.current = apply; });

  // Sends a snapshot to the account. A failure is tried again: after 30 seconds, when the connection returns, or on the next change.
  const sendNow = useCallback((snap) => {
    const { app: a, wid: w } = ids.current;
    api(`/api/economy/works/${a}/${w}/`, { method: "PUT", body: { name: snap.name, data: snap.data, updated: snap.updated } })
      .then(() => {
        if (pending.current?.updated === snap.updated) pending.current = null;
        failures.current = 0;
        setStatus({ kind: "account", text: `Kept on your account · ${clock()}` });
      })
      .catch((e) => {
        failures.current += 1;
        const retry = failures.current < 3;
        setStatus({ kind: "failed", text: `Not on your account yet: ${e.message}${retry ? " It will try again." : " It will try again after your next change."}` });
        if (retry) {
          clearTimeout(retryTimer.current);
          retryTimer.current = setTimeout(() => { if (pending.current) sendNow(pending.current); }, 30000);
        }
      });
  }, []);

  // Opening: read this device's copy before anything is written, then ask the account whether it has a newer one.
  useEffect(() => {
    if (!active || !app || !wid) return undefined;
    const atOpen = device ? readDevice(app, wid) : null;
    let live = true;
    api(`/api/economy/works/${app}/${wid}/`).then((remote) => {
      if (live && offerBack(atOpen, remote, dataRef.current)) setOffer(remote);
    }).catch(() => { /* nothing on the account yet (404), or signed out: nothing to offer */ });
    return () => { live = false; };
  }, [app, wid, active, device]);

  // A change: the device copy at once, and for StatZ the account copy two seconds later. Opening is not a change.
  useEffect(() => {
    if (!active || !app || !wid) return;
    if (lastJson.current === undefined) { lastJson.current = data == null ? "" : JSON.stringify(data); return; }
    if (data == null) return;
    const json = JSON.stringify(data);
    if (json === lastJson.current) return;
    lastJson.current = json;
    const snap = { updated: Date.now(), name, data };
    if (device) writeDevice(app, wid, snap);
    if (!isStatz) return;
    pending.current = snap;
    clearTimeout(sendTimer.current);
    sendTimer.current = setTimeout(() => sendNow(snap), 2000);
  }, [data, name, app, wid, active, device, isStatz, sendNow]);

  // A hidden tab sends what is pending now, rather than in two seconds.
  useEffect(() => {
    const hidden = () => { if (document.visibilityState === "hidden" && pending.current) sendNow(pending.current); };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, [sendNow]);
  // A dropped connection coming back sends what is pending.
  useEffect(() => {
    const back = () => { if (pending.current) sendNow(pending.current); };
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, [sendNow]);
  // Leaving with a change that has not reached the account yet asks first.
  useEffect(() => {
    const ask = (e) => { if (pending.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, []);

  const restore = () => {
    if (!offer) return;
    if (device) writeDevice(app, wid, { updated: Date.now(), name: offer.name, data: offer.data });
    lastJson.current = JSON.stringify(offer.data);   // the restored copy is what this device holds now
    applyRef.current(offer.data);
    setOffer(null);
  };
  // "Keep this device's" replaces the account copy with what is on this screen, as the bar says.
  const dismiss = () => {
    setOffer(null);
    if (isStatz && dataRef.current != null) {
      const snap = { updated: Date.now(), name: ids.current.name, data: dataRef.current };
      pending.current = snap;
      sendNow(snap);
    }
  };
  return { offer, restore, dismiss, status };
}
