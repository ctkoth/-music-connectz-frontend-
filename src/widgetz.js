// What a link will do BEFORE the member presses it.
//
// The server is the only authority on what actually gets framed — it reads the
// id out of a provider link, runs the malware scan and checks the tier. But it
// answers one link per press, on purpose: resolving a whole profile's links on
// render would scan every one of them because somebody scrolled past.
//
// So the button needs a label it can work out for itself, and a host is enough
// for that. This file classifies by host and NOTHING else: no id parsing, no
// URL building, no verdict. Its entire job is so a control can say what it is
// about to do while there is still time to not press it.
//
// If it ever drifts from the server's list the worst case is a button that
// promised a widget and produced an honest "this one opens in a tab" tile —
// which is the same tile the member would have got anyway. That is the reason
// this duplication is safe and the reason it must never grow past labelling.
const PLAYER_HOSTS = [
  "youtube.com", "youtu.be", "spotify.com", "soundcloud.com", "music.apple.com",
  "deezer.com", "vimeo.com", "mixcloud.com", "tiktok.com", "instagram.com",
];

const OUR_HOSTS = ["musicconnectz.net"];

export function hostOf(url) {
  try {
    const h = new URL(/^[a-z]+:/i.test(url) ? url : `https://${url}`).hostname.toLowerCase();
    return h.startsWith("www.") ? h.slice(4) : h;
  } catch {
    return "";
  }
}

const isOneOf = (host, list) =>
  list.some((s) => host === s || host.endsWith(`.${s}`));

/**
 * How this link is expected to open, for labelling only.
 * @param {string} url
 * @param {boolean} canFramePages  from GET /api/economy/widgetz/
 */
export function widgetHint(url, canFramePages) {
  const host = hostOf(url);
  if (!host) return { kind: "outside", host: "" };
  if (isOneOf(host, OUR_HOSTS)) return { kind: "internal", host };
  if (isOneOf(host, PLAYER_HOSTS)) return { kind: "player", host };
  return { kind: canFramePages ? "page" : "outside", host };
}
