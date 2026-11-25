// Words for the ways asking a device for its position fails. Pure, so it runs under plain node.
//
// A failed position is never a generic "couldn't get location": denied, unavailable and slow
// need different answers (the same lesson as the recorder's mediaError). And every one ends with
// what the member most wants to know — whether anything was stored. Nothing was.
export function locationError(err) {
  const code = err && typeof err === "object" ? err.code : null;
  if (code === 1) return "Your device refused location for this app. Allow it in Settings for Music ConnectZ, then try again. Nothing was stored.";
  if (code === 2) return "Your device couldn't work out where you are right now. Try again with a signal or Wi-Fi. Nothing was stored.";
  if (code === 3) return "Finding your position took too long. Try again. Nothing was stored.";
  return "This device can't share a location. Nothing was stored.";
}
