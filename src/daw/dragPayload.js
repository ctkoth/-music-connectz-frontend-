// What a drag from the Studio Dragon browser carries, and the one place that reads it back. A drop target never trusts the
// payload: it is checked against what the browser can actually offer (a known effect, a known loop, a tone by key or id), so a
// dragged string from another page or a tampered one is simply not a drop. Pure and tested.
import { PLUGINS } from "./plugins.js";
import { loopById } from "./loopRender.js";

export const DRAG_MIME = "application/x-mcz-dragon";
export const encode = (item) => JSON.stringify(item);

/** The item, or null for anything that is not one of ours. `tones` is the list of saved tone ids the member has. */
export function decode(text, { savedToneIds = [] } = {}) {
  let o;
  try { o = JSON.parse(text); } catch { return null; }
  if (!o || typeof o !== "object") return null;
  if (o.kind === "effect") return PLUGINS[o.type] ? { kind: "effect", type: o.type } : null;
  if (o.kind === "loop") return loopById(o.id) ? { kind: "loop", id: o.id } : null;
  if (o.kind === "tone") {
    if (o.source === "starter" && typeof o.key === "string") return { kind: "tone", source: "starter", key: o.key.slice(0, 60) };
    if (o.source === "mine" && savedToneIds.map(String).includes(String(o.id))) return { kind: "tone", source: "mine", id: o.id };
  }
  return null;
}
/** Is a drag one of ours? (Read during dragover, when the data itself is hidden but its types are not.) */
export const isOurs = (dt) => !!dt && [...(dt.types || [])].includes(DRAG_MIME);
export const hasFiles = (dt) => !!dt && [...(dt.types || [])].includes("Files");
/** The audio and video files in a drop (other files are ignored, with a count so the screen can say so). */
export function mediaFiles(files) {
  const all = [...(files || [])];
  const ok = all.filter((f) => /^(audio|video)\//.test(f.type) || /\.(wav|mp3|m4a|aac|ogg|oga|flac|aif|aiff|mp4|mov|webm|mkv)$/i.test(f.name || ""));
  return { ok, skipped: all.length - ok.length };
}
