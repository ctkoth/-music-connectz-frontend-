// Strip Silence (Pro Tools): find the stretches of a clip that are audible and the gaps between them, so a long take
// becomes clean pieces with the dead air gone. Pure, so it runs under plain node. Measured on a short rolling
// loudness, with a pad kept on each side so no word is clipped, and a gap must be long enough to count as a gap.

/** [{from, to}] in seconds, relative to the start of `channels`: the parts to KEEP. */
export function keepSegments(channels, rate, { thresholdDb = -40, minGap = 0.4, pad = 0.06, win = 0.01 } = {}) {
  const n = channels[0]?.length || 0;
  if (!n) return [];
  const w = Math.max(1, Math.round(rate * win));
  const thr = 10 ** (thresholdDb / 20);
  const loud = [];
  for (let i = 0; i + w <= n; i += w) {
    let peak = 0;
    for (const c of channels) for (let k = i; k < i + w; k += 2) { const v = Math.abs(c[k]); if (v > peak) peak = v; }
    loud.push(peak >= thr);
  }
  const gapWins = Math.max(1, Math.round(minGap / win));
  const segs = [];
  let start = -1, quiet = 0;
  for (let i = 0; i < loud.length; i++) {
    if (loud[i]) { if (start < 0) start = i; quiet = 0; }
    else if (start >= 0 && ++quiet >= gapWins) { segs.push([start, i - quiet + 1]); start = -1; quiet = 0; }
  }
  if (start >= 0) segs.push([start, loud.length - quiet]);
  const total = n / rate;
  const out = segs.map(([a, b]) => ({ from: Math.max(0, a * win - pad), to: Math.min(total, b * win + pad) }));
  // Pads of neighbours can touch: join them rather than make two pieces with no gap between.
  return out.reduce((acc, s) => { const last = acc[acc.length - 1]; if (last && s.from <= last.to) last.to = Math.max(last.to, s.to); else acc.push({ ...s }); return acc; }, []);
}
