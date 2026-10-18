// Where OCC's doors may lead.
//
// A door is `goToSpot(tab, target)`, and `goToSpot` to a tab key the app does not
// mount is just a sound: the click plays the open-in chime and the member stays
// exactly where they were. The server used to name `imagez` and `writez`, which
// are not tabs anywhere, and OCC itself — so WorkZ's "Open in …" pill did that.
//
// The server's list is the first line of defence (test_occ_routes holds it
// against the same keys). This is the second: whatever a payload says, the
// client only draws a door to a tab it actually mounts, so a backend that gets
// ahead of this build — or behind it — produces a missing pill, never a dead one.
//
// MOUNTED is a copy of App.jsx's TABS keys, restricted to the tabs OCC has any
// reason to open. `occRoutes.test.mjs` parses App.jsx and fails if this names a
// tab that is not there, so the copy cannot rot into a lie.
export const MOUNTED = new Set([
  "occ", "postz", "social", "collabz", "playlistz", "distributez", "directz",
  "sentenceconnectz", "habitz", "logz", "profilez", "callz", "gamez", "facez",
  "onboardz", "membershipz", "journalz", "lilith",
]);

// The data-tour anchors on OCC's own screen — what `open_in: "occ"` targets may
// name. The test checks each is really in the source.
export const OCC_ANCHORS = ["occ-chat", "occ-taskz", "occ-run", "occ-workz", "occ-suggest", "occ-settings"];

/** The doors on a piece of WorkZ: only mounted tabs, and none at all in a shell
 *  (a shell has no other apps to open, and the hub owns navigation between its
 *  own screens). */
export function doorsFor(sendTo, { inShell = false } = {}) {
  if (inShell) return [];
  return (Array.isArray(sendTo) ? sendTo : []).filter((t) => t && MOUNTED.has(t.tab));
}

/** The tab grid: only tabs a screen stands behind, never in a shell. */
export function gridTabs(tabs, { inShell = false } = {}) {
  if (inShell) return [];
  return (Array.isArray(tabs) ? tabs : [])
    .filter((t) => t && t.built && t.open_in && MOUNTED.has(t.open_in));
}
