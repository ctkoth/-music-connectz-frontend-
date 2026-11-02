// The last step: the finished master at the rate and in the format the member
// chose. Converting the rate rebuilds the waveform, and a rebuilt waveform can
// peak a hair higher than the one that was held under the ceiling — so the
// true peak is measured again after it and any excess is trimmed off the whole
// file, and the trim is reported rather than hidden.
import { truePeak, dbToGain, gainToDb } from "./dsp.js";
import { encodeWav } from "./wav.js";
import { encodeMp3 } from "./mp3.js";
import { resample } from "./resample.js";

export async function exportMaster(channels, sampleRate, options = {}, onProgress) {
  const { format = "wav", bitDepth = 24, dither = true, kbps, rate, ceilingDb = -1 } = options;
  let out = channels;
  let outRate = sampleRate;
  let trimDb = 0;
  if (rate && rate !== sampleRate) {
    onProgress && onProgress(0.1, `Converting to ${rate / 1000} kHz`);
    out = resample(channels, sampleRate, rate);
    outRate = rate;
    const tp = truePeak(out);
    const lim = dbToGain(ceilingDb);
    if (tp > lim) {
      const g = (lim / tp) * 0.999;
      trimDb = gainToDb(g);
      for (const x of out) for (let i = 0; i < x.length; i++) x[i] *= g;
    }
  }
  onProgress && onProgress(0.5, format === "mp3" ? "Encoding MP3" : "Writing WAV");
  const bytes = format === "mp3"
    ? await encodeMp3(out, outRate, { kbps, onProgress: (p) => onProgress && onProgress(0.5 + p * 0.5, "Encoding MP3") })
    : encodeWav(out, outRate, { bitDepth, dither: bitDepth === 16 && dither });
  return { bytes, sampleRate: outRate, trimDb, format };
}
