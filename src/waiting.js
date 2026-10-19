// Counts of work waiting for this member, shown as a number on the app's
// icon (dock and drawer) so it can be seen from any screen — the "Earn 3"
// pattern exchange apps use. Real counts only, from the server: a badge that
// says 3 when nothing is there is a notification that lies.
//
// One fetch shared by every icon, refreshed every 5 minutes and whenever a
// screen announces it changed something ("mcz-waiting-refresh").
import { useEffect, useState } from "react";
import { api, tokenStore } from "./api.js";

let counts = {};
let loading = null;
let timer = null;
const subs = new Set();
const emit = () => subs.forEach((f) => f(counts));

export function refreshWaiting() {
  if (loading || !tokenStore.get?.()) return loading;
  loading = api("/api/economy/ratez/queue/")
    .then((q) => {
      // Rows skipped this session are hidden in the queue, so not counted here.
      let skipped = [];
      try { skipped = JSON.parse(sessionStorage.getItem("mcz_ratez_skipped") || "[]"); } catch { /* blocked */ }
      const n = (q?.posts || []).filter((p) => !skipped.includes(p.id)).length;
      counts = { ...counts, ratez: n }; emit();
    })
    .catch(() => {})
    .then(() => api("/api/economy/battlez/weekly/"))
    .then((d) => {
      // Weekly Open takes by others that you haven't rated yet.
      const n = (d?.week?.board || []).filter((r) => !r.mine && !r.rated_by_me).length;
      counts = { ...counts, battlez: n }; emit();
    })
    .catch(() => {})
    .finally(() => { loading = null; });
  return loading;
}

export function useWaiting() {
  const [c, setC] = useState(counts);
  useEffect(() => {
    subs.add(setC);
    if (!timer) {
      refreshWaiting();
      timer = setInterval(refreshWaiting, 5 * 60 * 1000);
      window.addEventListener("mcz-waiting-refresh", refreshWaiting);
    }
    return () => { subs.delete(setC); };
  }, []);
  return c;
}

/** Tell the badge something changed (a rating given, a row skipped). */
export const waitingChanged = () => window.dispatchEvent(new Event("mcz-waiting-refresh"));
