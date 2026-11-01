// What FileZ says about a file the server no longer has.
//
// A lost recording used to be drawn as an ordinary player that sat at 0:00 / 0:00,
// which reads as "corrupt" — and there is nothing to repair, the bytes are gone.
// The server marks a file `missing` only when something went and LOOKED (the
// coach, the reconcile sweep, or the member pressing Check my files); this file
// only words that. It decides nothing and never guesses from a player error:
// "it would not play" is not "it is not there".

export function isGone(u) {
  return !!(u && u.missing);
}

export function goneCount(files) {
  return (files || []).filter(isGone).length;
}

// The sentence under the list, from the server's counts. Always says what was
// found and what was NOT done: nothing is deleted by a check.
export function checkSummary(r) {
  if (!r || typeof r !== "object") return "";
  const checked = Number(r.checked) || 0;
  const gone = Number(r.gone) || 0;
  const back = Number(r.came_back) || 0;
  const unreadable = Number(r.unreadable) || 0;
  const parts = [];
  if (checked === 0 && unreadable === 0) return "You have no files to check.";
  parts.push(gone === 0
    ? `All ${checked} file${checked === 1 ? " is" : "s are"} on the server.`
    : `${gone} of ${checked} file${checked === 1 ? " is" : "s are"} no longer on the server.`);
  if (back > 0) parts.push(`${back} that were marked lost came back.`);
  if (unreadable > 0) {
    parts.push(`${unreadable} couldn't be checked just now — they are not marked lost. Try again in a minute.`);
  }
  if (gone > 0) parts.push("Nothing was deleted.");
  return parts.join(" ");
}
