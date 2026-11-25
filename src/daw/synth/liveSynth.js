// The page's end of the live synth: starts the worklet (synthWorklet.js, the same core as everything else) and sends it
// notes. Browser only; the pure parts (key and MIDI mapping) are in liveKeys.js and tested under node.
import workletUrl from "./synthWorklet.js?worker&url";

const loaded = new WeakSet();
export const liveSupported = () => typeof window !== "undefined" && !!(window.AudioContext || window.webkitAudioContext) && typeof AudioWorkletNode !== "undefined";

export async function createLiveSynth(ctx, patch) {
  if (!ctx.audioWorklet) throw new Error("This browser can't run the live synth. Open Music ConnectZ in a current Chrome, Edge, Safari or Firefox.");
  if (ctx.state !== "running") await ctx.resume();
  if (!loaded.has(ctx)) { await ctx.audioWorklet.addModule(workletUrl); loaded.add(ctx); }
  const node = new AudioWorkletNode(ctx, "mcz-synth", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
  node.connect(ctx.destination);
  const send = (m) => node.port.postMessage(m);
  send({ type: "patch", patch });
  return {
    noteOn: (pitch, vel = 100) => send({ type: "on", pitch, vel }),
    noteOff: (pitch) => send({ type: "off", pitch }),
    setPatch: (p) => send({ type: "patch", patch: p }),
    sustain: (on) => send({ type: "sustain", on: !!on }),
    panic: () => send({ type: "panic" }),
    close: () => { send({ type: "panic" }); try { node.disconnect(); } catch { /* gone */ } },
  };
}
