// Runs the mastering chain off the main thread. A four-minute song is tens of
// millions of samples through a true-peak interpolator several times over;
// on the page's own thread that is a frozen screen for the length of it.
//
// Messages in:  { id, op: "analyse" | "master" | "encode" | "export", ...args }
// Messages out: { id, progress, stage } while working, then
//               { id, ok: true, result } or { id, ok: false, error }
import { analyse } from "./meter.js";
import { master, toStereo, balanceChart } from "./master.js";
import { encodeWav } from "./wav.js";
import { exportMaster } from "./export.js";

self.onmessage = (e) => {
  const { id, op } = e.data || {};
  const progress = (p, stage) => self.postMessage({ id, progress: p, stage });
  try {
    if (op === "analyse") {
      const { channels, sampleRate } = e.data;
      const result = analyse(toStereo(channels), sampleRate);
      self.postMessage({ id, ok: true, result });
    } else if (op === "master") {
      const { channels, sampleRate, settings, reference, vocal } = e.data;
      const out = master(channels, sampleRate, settings, reference, progress, vocal || null);
      const result = {
        plan: out.plan, before: out.before, after: out.after, report: out.report,
        outcome: out.outcome, chart: balanceChart(out.before, out.after),
        channels: out.channels,
      };
      self.postMessage({ id, ok: true, result }, out.channels.map((c) => c.buffer));
    } else if (op === "encode") {
      const { channels, sampleRate, bitDepth, dither } = e.data;
      const result = encodeWav(channels, sampleRate, { bitDepth, dither });
      self.postMessage({ id, ok: true, result }, [result]);
    } else if (op === "export") {
      // Async (the MP3 encoder loads on first use), so its own reply path.
      const { channels, sampleRate, options } = e.data;
      exportMaster(channels, sampleRate, options, progress)
        .then((result) => self.postMessage({ id, ok: true, result }, [result.bytes]))
        .catch((err) => self.postMessage({ id, ok: false, error: (err && err.message) || String(err) }));
    } else {
      self.postMessage({ id, ok: false, error: `unknown op ${op}` });
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: (err && err.message) || String(err) });
  }
};
