import { suggest, SUGGEST_SHARE } from "../remember.js";

// "You usually pick X (70% of 20) — use it". Renders nothing unless one value
// carries at least 65% of this member's uses AND differs from what the field
// shows now. `server` is the same read from their account's history, for a
// device that hasn't seen them yet. `label` turns a stored value into words.
export default function UsualHint({ field, value, onUse, allowed, server, label }) {
  const local = suggest(field, value, allowed);
  const remote = server && server.value != null && server.n >= 5 && server.share >= SUGGEST_SHARE
    && String(server.value) !== String(value) && (!allowed || allowed.includes(server.value))
    ? server : null;
  const s = local && (!remote || local.n >= remote.n) ? local : remote;
  if (!s) return null;
  const words = label ? label(s.value) : s.value;
  return (
    <button type="button" onClick={() => onUse(s.value)}
            className="re-link mt-0.5 block text-left text-[10px] text-mcz-cyan/80">
      You usually pick {words} ({Math.round(s.share * 100)}% of {s.n}) — use it
    </button>
  );
}
