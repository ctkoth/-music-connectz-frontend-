import test from "node:test";
import assert from "node:assert/strict";
import { envelopeOf, sameAudioGroups } from "./dupes.js";

const fs = 8000;
const buf = (fn, secs = 4) => { const d = new Float32Array(fs * secs).map((_, i) => fn(i)); return { sampleRate: fs, length: d.length, numberOfChannels: 1, getChannelData: () => d }; };
const song = (i) => Math.sin(i / 3) * (Math.sin(i / 4000) > 0 ? 0.8 : 0.1);   // a loud/quiet shape
const drums = (i) => ((i % 2000) < 200 ? 0.9 : 0) * Math.sin(i);

test("three copies of one bounce are one group; a different part is not in it", () => {
  const items = [
    { id: "a", env: envelopeOf(buf(song)) }, { id: "b", env: envelopeOf(buf(song)) },
    { id: "d", env: envelopeOf(buf(drums)) }, { id: "c", env: envelopeOf(buf(song)) },
  ];
  assert.deepEqual(sameAudioGroups(items), [["a", "b", "c"]]);
});

test("the same shape at a very different level is not called a copy", () => {
  const items = [{ id: "a", env: envelopeOf(buf(song)) }, { id: "b", env: envelopeOf(buf((i) => song(i) * 0.2)) }];
  assert.deepEqual(sameAudioGroups(items), []);
});
