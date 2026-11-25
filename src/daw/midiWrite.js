// Write a Standard MIDI File (format 1): a tempo track and one track per part, 480 ticks per beat, channel 1. Pure and
// tested by reading it back with midi.js. Used to keep a live take as notes: download it, or edit it in the MIDI window.
const PPQ = 480;
const vlq = (n) => { const out = [n & 0x7f]; while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80); return out; };
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const text = (s) => [...new TextEncoder().encode(String(s).slice(0, 60))];
const chunk = (id, bytes) => [...id].map((c) => c.charCodeAt(0)).concat(u32(bytes.length), bytes);

function track(events) {                                   // events: [{ tick, order, bytes }]
  const sorted = [...events].sort((a, b) => a.tick - b.tick || a.order - b.order);
  const out = [];
  let last = 0;
  for (const e of sorted) { out.push(...vlq(e.tick - last), ...e.bytes); last = e.tick; }
  out.push(0, 0xff, 0x2f, 0);
  return chunk("MTrk", out);
}

/** parts: [{ name, notes: [[pitch, startBeat, lengthBeats, velocity]] }] -> Uint8Array */
export function writeMidi({ bpm = 120, name = "", parts = [] }) {
  const us = Math.round(60000000 / Math.min(300, Math.max(20, bpm)));
  const meta = [
    { tick: 0, order: 0, bytes: [0xff, 0x03, ...vlq(text(name).length), ...text(name)] },
    { tick: 0, order: 1, bytes: [0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255] },
    { tick: 0, order: 2, bytes: [0xff, 0x58, 4, 4, 2, 24, 8] },
  ];
  const tracks = [track(meta)];
  for (const p of parts) {
    const ev = [{ tick: 0, order: 0, bytes: [0xff, 0x03, ...vlq(text(p.name || "Part").length), ...text(p.name || "Part")] }];
    for (const [pitch, start, len, vel] of p.notes) {
      const on = Math.round(Math.max(0, start) * PPQ);
      const off = on + Math.max(1, Math.round(len * PPQ));
      const k = Math.min(127, Math.max(0, Math.round(pitch)));
      ev.push({ tick: on, order: 2, bytes: [0x90, k, Math.min(127, Math.max(1, Math.round(vel ?? 100)))] }, { tick: off, order: 1, bytes: [0x80, k, 0] });   // an end before a start at the same tick
    }
    tracks.push(track(ev));
  }
  return Uint8Array.from([...chunk("MThd", [0, 1, 0, tracks.length, PPQ >> 8, PPQ & 255]), ...tracks.flat()]);
}
