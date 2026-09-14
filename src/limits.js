// Per-tier limits, fetched once and shared.
//
// The server is the only source of truth for these numbers — every screen that
// hardcoded its own drifted from it. PostZ offered 1,000 characters while the
// server enforced 400 for Free and 1500 for Premium, so a Free member was
// invited to write more than would be accepted and a Premium member was capped
// 500 short of what they had paid for.
import { useEffect, useState } from "react";
import { api } from "./api.js";

let cache = null;          // resolved limits, shared across every mount
let inFlight = null;       // one request even if ten components mount at once
const listeners = new Set();

export const TIER_CHAR_LIMITS = { free: 400, premium: 1500, statz: "Unlimited" };

export const TIER_LABEL = { free: "Free", premium: "Premium", statz: "StatZ", debug: "Debug" };

/** The next tier up, or null at the top. */
export function nextTier(tier) {
  const t = (tier || "free").toLowerCase();
  if (t === "free") return "premium";
  if (t === "premium") return "statz";
  return null;
}

export function loadLimits() {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = api("/api/economy/limits/")
      .then((d) => {
        cache = d;
        listeners.forEach((fn) => fn(d));
        return d;
      })
      .catch(() => {
        // Fall back to the free tier: never offer more room than the most
        // restrictive tier allows, or the member writes text that gets refused.
        //
        // `third_party_ads: false` is spelled out rather than left absent.
        // Undefined is already falsy, so the ad would stay hidden either way —
        // but by accident, and one `?? true` written by somebody reading a
        // missing key as "no answer, assume yes" would turn a Play Families
        // commitment into a policy breach. The safe answer wants to be a value,
        // not an absence.
        cache = { tier: "free", char_limit: TIER_CHAR_LIMITS.free,
                  char_limit_unlimited: false, third_party_ads: false };
        listeners.forEach((fn) => fn(cache));
        return cache;
      })
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

/** Force a refetch — call after a tier change so caps update without a reload. */
export function refreshLimits() {
  cache = null;
  return loadLimits();
}

/**
 * Character limit for the signed-in member.
 * Returns { limit, unlimited, tier, remaining(text), state(text) }.
 */
export function useCharLimit() {
  const [lim, setLim] = useState(cache);

  useEffect(() => {
    let on = true;
    listeners.add(setLim);
    loadLimits().then((d) => on && setLim(d));
    return () => { on = false; listeners.delete(setLim); };
  }, []);

  const limit = lim?.char_limit ?? TIER_CHAR_LIMITS.free;
  const unlimited = !!lim?.char_limit_unlimited;
  const tier = lim?.tier || "free";

  return {
    limit,
    unlimited,
    tier,
    ready: !!lim,
    remaining: (text) => (unlimited ? Infinity : Math.max(0, limit - (text || "").length)),
    /** "ok" | "near" (last 10%) | "full" — drives the colour cue. */
    state: (text) => {
      if (unlimited) return "ok";
      const used = (text || "").length;
      if (used >= limit) return "full";
      if (used >= limit * 0.9) return "near";
      return "ok";
    },
    /** Trim to the cap — the guard for paste, which bypasses per-key limits. */
    clamp: (text) => (unlimited ? text : (text || "").slice(0, limit)),
  };
}

/**
 * The per-upload size cap for the signed-in member, from the server.
 *
 * `upload_mb` has been in `/api/economy/limits/` since it shipped and most of
 * the file inputs in this app never read it — a member could attach a 500MB
 * video to a post, wait through the upload, and be refused by a 413 at the
 * end. Checking it here costs nothing and turns a wasted wait into a sentence.
 *
 * `check(file)` returns null when the file is fine, or the reason it isn't —
 * so a caller cannot accidentally treat "no cap loaded yet" as "too big".
 * Until the limits land it refuses NOTHING: guessing low would refuse files
 * the member's tier actually allows, and the server is the real gate either
 * way.
 */
export function useUploadLimit() {
  const [lim, setLim] = useState(cache);

  useEffect(() => {
    let on = true;
    listeners.add(setLim);
    loadLimits().then((d) => on && setLim(d));
    return () => { on = false; listeners.delete(setLim); };
  }, []);

  const mb = lim?.upload_mb ?? null;
  return {
    mb,
    tier: lim?.tier || "free",
    ready: !!lim,
    check: (file) => {
      if (!file) return "No file.";
      // An empty file is a round trip that can only fail. It happens for real:
      // a cancelled export, a sync placeholder, a recording that captured
      // nothing.
      if (!file.size) return "That file is empty — there's nothing in it to upload.";
      if (mb && file.size > mb * 1024 * 1024) {
        return `That's ${(file.size / 1024 / 1024).toFixed(1)}MB — your tier allows `
             + `${mb}MB per upload. A shorter clip, or a tier up raises it.`;
      }
      return null;
    },
  };
}
