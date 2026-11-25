// Tracks that play the SAME audio. A folder of exports often holds several copies of one bounce ([55], [56], …),
// and stacked copies of one recording sum, comb and partly cancel — it sounds like phasy static, not music.
// Pure (runs in node): a loudness envelope per track, compared pairwise.
//
// "Same" is strict on purpose: the envelopes must match almost exactly (correlation ≥ SAME_CORR) at the same
// level (within SAME_DB). Different stems of one song — a vocal and the drums — never come close, so they are
// never called copies.
export const RATE = 50;            // envelope points per second
export const SAME_CORR = 0.97;
export const SAME_DB = 1.5;
export const MAX_SECONDS = 120;    // the first two minutes decide it

/** Mean |sample| per 1/RATE s, from `inSec` for up to MAX_SECONDS. buf: {getChannelData, numberOfChannels, sampleRate, length}. */
export function envelopeOf(buf, inSec = 0, outSec = Infinity) {
  const rate = buf.sampleRate, step = Math.max(1, Math.round(rate / RATE));
  const start = Math.max(0, Math.round(inSec * rate));
  const end = Math.min(buf.length, Math.round(Math.min(outSec, inSec + MAX_SECONDS) * rate));
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  const n = Math.max(0, Math.floor((end - start) / step));
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = start + i * step, e = k + step; k < e; k += 4) for (const c of chans) s += Math.abs(c[k] || 0);
    env[i] = s / (Math.ceil(step / 4) * chans.length);
  }
  return env;
}

function compare(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < RATE || Math.abs(a.length - b.length) > RATE) return null;      // lengths over a second apart: not copies
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  if (!sa || !sb) return null;
  const ma = sa / n, mb = sb / n;
  let xy = 0, xx = 0, yy = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; xy += x * y; xx += x * x; yy += y * y; }
  return { corr: xx && yy ? xy / Math.sqrt(xx * yy) : 0, db: Math.abs(20 * Math.log10(ma / mb)) };
}

/** items: [{id, name, env}] → [[id, …], …], each group ≥ 2 tracks holding the same audio, in the order given. */
export function sameAudioGroups(items) {
  const parent = new Map(items.map((t) => [t.id, t.id]));
  const find = (x) => (parent.get(x) === x ? x : find(parent.get(x)));
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const c = compare(items[i].env, items[j].env);
    if (c && c.corr >= SAME_CORR && c.db <= SAME_DB) parent.set(find(items[j].id), find(items[i].id));
  }
  const groups = new Map();
  for (const t of items) { const r = find(t.id); groups.set(r, [...(groups.get(r) || []), t.id]); }
  return [...groups.values()].filter((g) => g.length > 1);
}
