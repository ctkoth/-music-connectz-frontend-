// Where a logged-out visitor goes when they open a tab's own address (musicconnectz.net/rap).
//
// A tab address is the link people put in bios, ads and DMs. For anything that has a free
// trial it must open THE TRIAL, not a sign-in form. This is the one place that decides it,
// kept out of App.jsx so a test can pin it (App.jsx is JSX and cannot be imported by
// node --test).
//
// Two kinds of trial, told apart because they are decided differently:
//
//   * Scored coaches (`/try/<key>`). WHICH tabs have one is the SERVER's list
//     (`/api/economy/trialdoorz/`, read off the mounted routes) and is never typed here:
//     a coach that gets mounted becomes a working /<slug> link by itself. The fallback is
//     for a failed fetch only, and is the two that have always existed.
//   * Client-only tools (`/tool/<key>`). No server, no account, nothing to ask the server
//     about, so they are a static map — and the only way a tool joins it is by being a
//     public route in App.jsx, which is why the test below checks both lists agree.
//
// `bodiez` has its own trial screen (/try/bodiez): not a scored instrument, so it is not in
// the server's list and is named here for the same reason <Routes> names it.

export const TRIAL_DOOR_FALLBACK = ["singz", "rapz"];

export const PUBLIC_TOOL_PATHS = {
  metz: "/tool/metz",
  tunerz: "/tool/tunerz",
  chordz: "/tool/chordz",
};

// Tool tabs resolve with no server answer at all; coach tabs need the door list.
export const needsDoorList = (tabKey) => !(tabKey in PUBLIC_TOOL_PATHS);

// `doors` is an array of app_keys (the server's, or the fallback), or null if not loaded.
// Returns the path to send a logged-out visitor to, or "" when the tab has no trial and
// they should be sent to /login as before. The query string and hash always travel:
// ?src= (channel), ?ref= (who sent them) and ?beat= (a score card's dare) are all read
// downstream.
export function trialPathFor(tabKey, doors, search = "", hash = "") {
  const tail = `${search || ""}${hash || ""}`;
  if (tabKey in PUBLIC_TOOL_PATHS) return `${PUBLIC_TOOL_PATHS[tabKey]}${tail}`;
  if (tabKey === "bodiez" || (Array.isArray(doors) && doors.includes(tabKey))) {
    return `/try/${tabKey}${tail}`;
  }
  return "";
}
