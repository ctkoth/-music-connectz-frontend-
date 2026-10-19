// ViewZ client: tells the server what's on screen, and for how long.
//
// One heartbeat request covers everything visible (a feed of 20 posts is one
// beat every 15s, not 20). Nothing beats while the tab is hidden — the server
// stops the clock on silence, so time away is never counted as time on page.
// Every failure is swallowed: measurement must never take a screen down.
import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { anonId, channel } from "./track.js";
import { deviceShape } from "./useScreenShape.js";

const active = new Map(); // target -> { id, refs }
let timer = null;
let beatSec = 15;

function beat() {
  if (document.visibilityState !== "visible") return;
  const ids = [...active.values()].map((a) => a.id).filter(Boolean);
  if (ids.length) api("/api/economy/views/beat/", { method: "POST", body: { ids, anon_id: anonId() } }).catch(() => {});
}

async function open(target) {
  const a = active.get(target) || { id: null, refs: 0 };
  a.refs += 1;
  active.set(target, a);
  if (a.refs > 1) return;
  try {
    const r = await api("/api/economy/views/start/", { method: "POST", body: { target, anon_id: anonId(), src: channel(), dev: deviceShape() } });
    if (active.get(target) === a) a.id = r?.id || null;
    if (r?.beat) beatSec = r.beat;
  } catch { /* uncounted is better than broken */ }
  if (!timer) timer = setInterval(beat, beatSec * 1000);
}

function close(target) {
  const a = active.get(target);
  if (!a) return;
  a.refs -= 1;
  if (a.refs <= 0) active.delete(target);
  if (!active.size && timer) { clearInterval(timer); timer = null; }
}

if (typeof document !== "undefined") {
  // Back from another tab or app: reopen what's on screen, so the server
  // starts a fresh stretch instead of bridging the time away.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    for (const target of [...active.keys()]) {
      const a = active.get(target);
      api("/api/economy/views/start/", { method: "POST", body: { target, anon_id: anonId(), src: channel(), dev: deviceShape() } })
        .then((r) => { if (active.get(target) === a) a.id = r?.id || a.id; }).catch(() => {});
    }
  });
}

/** Count time on `target` while this component is mounted. */
export function useViewTracker(target) {
  useEffect(() => {
    if (!target) return undefined;
    open(target);
    return () => close(target);
  }, [target]);
}

/** Count time on `target` while the element is mostly on screen. */
export function useInViewTracker(target) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !target || typeof IntersectionObserver === "undefined") return undefined;
    let on = false;
    const io = new IntersectionObserver(([e]) => {
      const vis = e.isIntersecting && e.intersectionRatio >= 0.6;
      if (vis && !on) { on = true; open(target); }
      if (!vis && on) { on = false; close(target); }
    }, { threshold: [0, 0.6] });
    io.observe(el);
    return () => { io.disconnect(); if (on) close(target); };
  }, [target]);
  return ref;
}

// Counts are batched: every <ViewCount> mounted in the same moment shares
// one request.
let pending = new Map();
let flushT = null;
const cache = new Map();
let notice = "";

function flush() {
  const batch = pending; pending = new Map(); flushT = null;
  const qs = [...batch.keys()].map((t) => `t=${encodeURIComponent(t)}`).join("&");
  api(`/api/economy/views/counts/?${qs}`, { auth: false })
    .then((d) => {
      notice = d?.notice || notice;
      for (const [t, cbs] of batch) {
        const n = d?.counts?.[t] ?? null;
        cache.set(t, n);
        cbs.forEach((cb) => cb(n));
      }
    }).catch(() => {});
}

export function useViewCount(target) {
  const [n, setN] = useState(cache.get(target) ?? null);
  useEffect(() => {
    if (!target) return;
    if (!pending.has(target)) pending.set(target, []);
    pending.get(target).push(setN);
    if (!flushT) flushT = setTimeout(flush, 60);
  }, [target]);
  return { n, notice };
}
