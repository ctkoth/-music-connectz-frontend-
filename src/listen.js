// Count how long a member ACTUALLY played something, and tell the server.
//
// Rating used to open 30 seconds after a post landed. That gates the post,
// not the listener: anything older than a minute had no gate at all, and a
// feed could be scrolled and fifty tracks rated in fifty seconds without one
// of them being played. The rule members were told was true and did nothing.
//
// So the seconds are counted HERE, from the media element itself, and only
// while they could plausibly be heard:
//
//   * only while the element is actually playing (not paused, not seeking),
//   * only while the tab is VISIBLE — a track left running in a background
//     tab is not being listened to, which is the same line the +5 ⚡ link
//     reward already draws,
//   * measured off the wall clock rather than currentTime, so dragging the
//     scrubber to the end banks nothing.
//
// The server does not take our word for the total: `record_listen` clamps
// every heartbeat to the time that has really elapsed since the last one. So
// this is a good-faith signal with a hard ceiling, not a security control,
// and it is worth exactly what the ⚡ link reward is worth.
import { api } from "./api.js";

const FLUSH_EVERY_MS = 10000;

/** Attach to a <audio>/<video> element. Returns an unsubscribe function. */
export function trackListening(el, item, onProgress) {
  if (!el || !item) return () => {};

  let playingSince = null;   // wall-clock ms when the current run started
  let unsent = 0;            // whole seconds counted but not yet posted
  let timer = null;
  let dead = false;

  const counting = () =>
    !el.paused && !el.ended && document.visibilityState === "visible";

  const bank = () => {
    if (playingSince == null) return;
    unsent += (Date.now() - playingSince) / 1000;
    playingSince = null;
  };

  const resume = () => {
    if (playingSince == null && counting()) playingSince = Date.now();
  };

  const flush = async (finished = false) => {
    bank();
    const whole = Math.floor(unsent);
    if (!whole && !finished) { resume(); return; }
    unsent -= whole;
    try {
      const r = await api("/api/economy/social/listened/", {
        method: "POST", body: { item, seconds: whole, finished },
      });
      // Report what the SERVER credited, never what we counted — it clamps,
      // and a screen that showed our own optimistic total would promise an
      // unlock that doesn't arrive.
      if (!dead && onProgress) onProgress(r);
    } catch {
      // A dropped heartbeat is not worth telling anybody about; the next one
      // carries the same seconds. Deliberately silent.
    }
    resume();
  };

  const onPlay = () => {
    resume();
    if (!timer) timer = setInterval(() => flush(false), FLUSH_EVERY_MS);
  };
  const onPause = () => { bank(); flush(false); };
  const onEnded = () => { bank(); flush(true); };
  const onVisibility = () => (document.visibilityState === "visible"
    ? resume() : (bank(), flush(false)));

  el.addEventListener("play", onPlay);
  el.addEventListener("playing", onPlay);
  el.addEventListener("pause", onPause);
  el.addEventListener("ended", onEnded);
  // Seeking must not bank the skipped stretch — bank what was heard, then
  // restart the clock at the new position.
  el.addEventListener("seeking", onPause);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    dead = true;
    bank();
    if (timer) clearInterval(timer);
    el.removeEventListener("play", onPlay);
    el.removeEventListener("playing", onPlay);
    el.removeEventListener("pause", onPause);
    el.removeEventListener("ended", onEnded);
    el.removeEventListener("seeking", onPause);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
