/* global AudioWorkletProcessor, registerProcessor, sampleRate */
// The synth running live in the browser's audio thread: the SAME core the offline renderer and the tests use, driven by
// messages from the page (patch / on / off / panic). Built by Vite as its own module (`?worker&url`), never imported by the app.
import { SynthCore } from "./engine.js";

class SynthProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.core = null;
    this.port.onmessage = (e) => {
      const m = e.data || {};
      if (m.type === "patch") { if (this.core) this.core.setPatch(m.patch); else this.core = new SynthCore(m.patch, sampleRate); }
      else if (!this.core) return;
      else if (m.type === "on") this.core.noteOn(m.pitch, m.vel);
      else if (m.type === "off") this.core.noteOff(m.pitch);
      else if (m.type === "sustain") this.core.sustain(m.on);
      else if (m.type === "panic") this.core.allNotesOff();
    };
  }
  process(_inputs, outputs) {
    const out = outputs[0];
    if (!this.core || !out || !out[0]) return true;
    const L = out[0]; const R = out[1] || out[0];
    if (R === L) { const tmp = new Float32Array(L.length); this.core.process(L, tmp, L.length); return true; }
    this.core.process(L, R, L.length);
    return true;
  }
}
registerProcessor("mcz-synth", SynthProcessor);
