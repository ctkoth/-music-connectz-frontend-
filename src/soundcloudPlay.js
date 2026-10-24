// Plays on Music ConnectZ from an embedded SoundCloud player, and the link back
// to the artist's own SoundCloud page.
//
// The CLIENT ONLY REPORTS. It counts wall-clock seconds while the SoundCloud
// widget says it is playing AND this tab is visible (the line the +5 ⚡ link
// reward draws), and sends them in heartbeats. Whether that is a play — 30 s,
// once per member per post per day, never the author, rate limits — is the
// server's (`apps/economy/embedplays.py`). The number shown is the server's.
// It is labelled "on Music ConnectZ" and is never added to SoundCloud's own.

export const SC_ORIGIN = "https://w.soundcloud.com";
// SoundCloud's documented Widget API. Loaded lazily, once, only when a post
// with a SoundCloud player is on screen — never at app start.
export const SC_API_SRC = `${SC_ORIGIN}/player/api.js`;
export const FLUSH_EVERY_MS = 10000;

/** The link to follow the artist, or null.
 *
 * Only a PUBLIC permalink on soundcloud.com is ever linked. A private track's
 * address carries its secret, so `private_on_sc` embeds never get one, and a
 * link carrying a secret/token is refused whatever flag it arrived with. Older
 * imports have no `permalink`: nothing is derived from the player URL, so they
 * get nothing. */
export function scFollowLink(embed) {
  if (!embed || embed.type !== "soundcloud" || embed.private_on_sc) return null;
  const raw = typeof embed.permalink === "string" ? embed.permalink.trim() : "";
  if (!raw) return null;
  let u;
  try { u = new URL(raw); } catch { return null; }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || !(host === "soundcloud.com" || host === "www.soundcloud.com")) return null;
  if (/secret|token/i.test(u.search + u.hash) || u.username || u.password) return null;
  // The path is the track's own page; drop any query/hash so nothing rides along.
  return { href: `https://soundcloud.com${u.pathname}`, host: "soundcloud.com" };
}

/** "N plays on Music ConnectZ", only above 0. */
export function playsLabel(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 1) return null;
  const k = Math.floor(v);
  return `${k.toLocaleString("en-US")} ${k === 1 ? "play" : "plays"} on Music ConnectZ`;
}

/** Seconds of real listening: only while playing and visible, off the wall
 *  clock (never the track position, so scrubbing banks nothing). `now` is
 *  injected so this runs under plain node. */
export function createListenClock() {
  let playing = false, visible = true, since = null, banked = 0;
  const bank = (now) => { if (since != null) { banked += (now - since) / 1000; since = null; } };
  const sync = (now) => {
    if (playing && visible) { if (since == null) since = now; } else bank(now);
  };
  return {
    play(now) { playing = true; sync(now); },
    pause(now) { playing = false; sync(now); },
    setVisible(v, now) { visible = !!v; sync(now); },
    /** Whole seconds not yet taken; the remainder stays banked. */
    take(now) {
      bank(now);
      const whole = Math.floor(banked);
      banked -= whole;
      sync(now);
      return whole;
    },
  };
}

let apiPromise = null;
/** Inject SoundCloud's api.js once. Resolves to window.SC, or rejects. */
export function loadWidgetApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.SC?.Widget) return Promise.resolve(window.SC);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SC_API_SRC;
      s.async = true;
      s.onload = () => (window.SC?.Widget ? resolve(window.SC) : reject(new Error("no widget api")));
      s.onerror = () => { apiPromise = null; reject(new Error("widget api failed to load")); };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

/** Watch one SoundCloud iframe and call `report(seconds)` with whole seconds of
 *  real listening every FLUSH_EVERY_MS and on pause/finish. `report` may return
 *  false to stop reporting (the server has decided). Returns a cleanup. */
export function watchPlayer(iframe, report) {
  let dead = false, timer = null, stopped = false;
  const clock = createListenClock();
  const flush = async () => {
    if (stopped) return;
    const s = clock.take(Date.now());
    if (!s) return;
    try { if ((await report(s)) === false) stopped = true; } catch { /* next beat carries on */ }
  };
  const onVis = () => { clock.setVisible(document.visibilityState === "visible", Date.now()); if (document.visibilityState !== "visible") flush(); };
  loadWidgetApi().then((SC) => {
    if (dead) return;
    const w = SC.Widget(iframe);
    w.bind(SC.Widget.Events.PLAY, () => {
      clock.play(Date.now());
      if (!timer) timer = setInterval(flush, FLUSH_EVERY_MS);
    });
    w.bind(SC.Widget.Events.PAUSE, () => { clock.pause(Date.now()); flush(); });
    w.bind(SC.Widget.Events.FINISH, () => { clock.pause(Date.now()); flush(); });
  }).catch(() => { /* no widget API: plays simply go uncounted */ });
  clock.setVisible(document.visibilityState === "visible", Date.now());
  document.addEventListener("visibilitychange", onVis);
  return () => {
    dead = true;
    if (timer) clearInterval(timer);
    document.removeEventListener("visibilitychange", onVis);
    flush();
  };
}
