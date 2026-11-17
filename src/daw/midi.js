// Read a Standard MIDI File (.mid) into notes the DAW can play. Pure — no audio, no DOM — so it
// is tested under node. Formats 0 and 1; note on/off (a note-on at velocity 0 is an off), program
// changes, track names and the first tempo. Times come back in BEATS (quarter notes), so the
// session's tempo decides how fast it plays, the way every DAW treats an imported MIDI file.

export const MAX_NOTES = 20000;   // a tab's bound; a bigger file is cut and the screen says so

function readVarLen(d, i) {
  let v = 0, b;
  do { b = d[i++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80 && i < d.length);
  return [v, i];
}
const str = (d, i, n) => String.fromCharCode(...d.slice(i, i + n));

/**
 * { bpm, tracks: [{ name, channel, program, drums, notes: [[pitch, startBeat, lengthBeats, velocity]] }], cut }
 * Throws a plain-English Error for anything that is not a MIDI file.
 */
export function parseMidi(input) {
  const d = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (d.length < 14 || str(d, 0, 4) !== "MThd") throw new Error("That isn't a MIDI file (.mid).");
  const hl = (d[4] << 24) | (d[5] << 16) | (d[6] << 8) | d[7];
  const ntrk = (d[10] << 8) | d[11];
  const div = (d[12] << 8) | d[13];
  if (div & 0x8000) throw new Error("This MIDI file counts time in SMPTE frames, which isn't supported — export it with beats.");
  const ppq = div || 480;
  let i = 8 + hl, bpm = 0, total = 0, cut = false;
  const tracks = [];
  for (let t = 0; t < ntrk && i + 8 <= d.length; t++) {
    if (str(d, i, 4) !== "MTrk") break;
    const len = (d[i + 4] << 24) | (d[i + 5] << 16) | (d[i + 6] << 8) | d[i + 7];
    let p = i + 8;
    const end = Math.min(d.length, p + len);
    i = end;
    let tick = 0, status = 0, name = "";
    const open = new Map();          // `${ch}:${pitch}` -> [startTick, vel]
    const byCh = new Map();          // channel -> { program, notes }
    const chan = (c) => { if (!byCh.has(c)) byCh.set(c, { program: 0, notes: [] }); return byCh.get(c); };
    while (p < end) {
      let delta;
      [delta, p] = readVarLen(d, p);
      tick += delta;
      let b = d[p];
      if (b & 0x80) { status = b; p++; } else if (!status) break;
      const type = status & 0xf0, c = status & 0x0f;
      if (status === 0xff) {
        const meta = d[p++];
        let l; [l, p] = readVarLen(d, p);
        if (meta === 0x03 && !name) name = str(d, p, l).trim();
        if (meta === 0x51 && !bpm && l === 3) bpm = Math.round(60000000 / ((d[p] << 16) | (d[p + 1] << 8) | d[p + 2]));
        p += l;
        status = 0;
      } else if (status === 0xf0 || status === 0xf7) {
        let l; [l, p] = readVarLen(d, p); p += l; status = 0;
      } else if (type === 0x90 || type === 0x80) {
        const pitch = d[p], vel = d[p + 1]; p += 2;
        const key = `${c}:${pitch}`;
        if (type === 0x90 && vel > 0) { if (!open.has(key)) open.set(key, [tick, vel]); }
        else if (open.has(key)) {
          const [st, v] = open.get(key); open.delete(key);
          if (total < MAX_NOTES) { chan(c).notes.push([pitch, st / ppq, Math.max(1, tick - st) / ppq, v]); total++; } else cut = true;
        }
      } else if (type === 0xc0) { chan(c).program = d[p++]; }
      else if (type === 0xd0) p += 1;
      else p += 2;   // 0xA0, 0xB0, 0xE0: two data bytes
    }
    for (const [key, [st, v]] of open) {   // a note never released ends where the track does
      const [c, pitch] = key.split(":").map(Number);
      if (total < MAX_NOTES) { chan(c).notes.push([pitch, st / ppq, Math.max(1, tick - st) / ppq, v]); total++; }
    }
    for (const [c, info] of byCh) {
      if (!info.notes.length) continue;
      info.notes.sort((a, b) => a[1] - b[1]);
      tracks.push({ name: name || `Track ${tracks.length + 1}`, channel: c, program: info.program, drums: c === 9, notes: info.notes });
    }
  }
  if (!tracks.length) throw new Error("That MIDI file has no notes in it.");
  return { bpm: bpm || 120, tracks, cut };
}

/** Length of a track in beats. */
export const beatsOf = (notes) => notes.reduce((m, n) => Math.max(m, n[1] + n[2]), 0);
