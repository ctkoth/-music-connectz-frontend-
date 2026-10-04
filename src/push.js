// Push notifications on this device — the client half of apps/economy/push.py.
//
// Whether push CAN work here is answered before anything is offered, with the
// reason when it can't, because a toggle that silently does nothing is the
// dead button this app has shipped too many of:
//   * the Android app's built-in browser has no Web Push — that needs Firebase
//     (a separate piece of work), so it says so instead of failing;
//   * the Windows app can't receive pushes in the background yet;
//   * an iPhone only allows Web Push once the site is on the Home Screen.
import { api } from "./api.js";
import { appShell } from "./externalAuth.js";

const BASE = "/api/economy/push/";

function b64ToBytes(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent || "");
const standalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

/** { ok: true } or { ok: false, why: "a sentence the member can act on" }. */
export function pushSupport() {
  const shell = appShell();
  if (shell.startsWith("android")) return { ok: false, why: "Push in the Android app is coming. For now, turn it on at musicconnectz.net in Chrome." };
  if (shell.startsWith("desktop")) return { ok: false, why: "The Windows app can't get pushes yet. Turn it on at musicconnectz.net in your browser." };
  if (shell === "inapp") return { ok: false, why: "Open Music ConnectZ in Chrome or Safari to turn on push." };
  if (isIOS() && !standalone()) return { ok: false, why: "On iPhone: tap Share → Add to Home Screen, open it from there, then turn push on." };
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { ok: false, why: "This browser can't receive push notifications." };
  }
  if (Notification.permission === "denied") {
    return { ok: false, why: "Notifications are blocked for this site — allow them in your browser's site settings, then come back." };
  }
  return { ok: true };
}

export const pushState = () => api(BASE);

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) || navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/** Is THIS browser subscribed (not just some device on the account)? */
export async function subscribedHere() {
  if (!pushSupport().ok) return false;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return !!(reg && (await reg.pushManager.getSubscription()));
}

/** Ask, subscribe and register with the server. Throws with a readable message. */
export async function enablePush(publicKey) {
  const can = pushSupport();
  if (!can.ok) throw new Error(can.why);
  if (!publicKey) throw new Error("Push notifications aren't switched on for the platform yet.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications weren't allowed, so nothing changed.");
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) }));
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  return api(`${BASE}subscribe/`, { method: "POST", body: { subscription: sub.toJSON(), tz } });
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = reg && (await reg.pushManager.getSubscription());
  if (sub) {
    await api(`${BASE}subscribe/`, { method: "DELETE", body: { endpoint: sub.endpoint } });
    await sub.unsubscribe();
  }
  return pushState();
}

export const savePushPrefs = (body) => api(`${BASE}prefs/`, { method: "POST", body });
export const testPush = () => api(`${BASE}test/`, { method: "POST", body: {} });
