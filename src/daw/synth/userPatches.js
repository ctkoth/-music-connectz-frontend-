// A member's own synth patches, as instruments. They are saved on the server (/api/economy/tonez/, kind "synth", the
// tier's 3 / 6 / unlimited room) and registered here so `renderNotes` can resolve "synth:u:<id>" without a fetch.
import { cleanPatch } from "./patch.js";

const registry = new Map();                      // id -> cleaned patch
export const USER_PREFIX = "synth:u:";
export const isUserSound = (k) => typeof k === "string" && k.startsWith(USER_PREFIX);
export const userKey = (id) => `${USER_PREFIX}${id}`;

/** Replace the registry from the server's preset list (only kind "synth"). Returns the instrument rows [key, label]. */
export function setUserPatches(presets) {
  registry.clear();
  const rows = [];
  for (const p of presets || []) {
    if (p?.kind !== "synth" || p.id == null) continue;
    registry.set(String(p.id), cleanPatch({ ...p.chain, name: p.name }));
    rows.push([userKey(p.id), `🎛️ ${String(p.name).slice(0, 30)} (mine)`]);
  }
  return rows;
}
export const userPatch = (key) => registry.get(String(key).slice(USER_PREFIX.length)) || null;
export const userRows = () => [...registry.entries()].map(([id, p]) => [userKey(id), `🎛️ ${p.name} (mine)`]);
