import test from "node:test";
import assert from "node:assert/strict";
import { addPoint, cleanAuto, laneCount, laneRoom, movePoint, removePoint, schedule, thin, valueAt, writePass, reads } from "./automation.js";
import { newSession, setAuto, cleanSession, addTrack } from "./session.js";

const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≈ ${b}`);

test("before the first point and after the last, the lane holds those points' values", () => {
  const pts = [{ t: 2, v: -6 }, { t: 4, v: 0 }];
  assert.equal(valueAt("volume", pts, 0), -6);
  assert.equal(valueAt("volume", pts, 9), 0);
  assert.equal(valueAt("volume", [], 3, -3), -3);
});

test("volume is interpolated in gain, the way a GainNode ramps; pan in a straight line", () => {
  const pts = [{ t: 0, v: -60 }, { t: 1, v: 0 }];      // gain 0 → 1
  near(valueAt("volume", pts, 0.5), 20 * Math.log10(0.5), 1e-9);
  near(valueAt("pan", [{ t: 0, v: -1 }, { t: 2, v: 1 }], 1.5), 0.5);
});

test("points stay sorted; one on the same spot replaces the old; values are clamped", () => {
  let lane = { on: true, points: [] };
  lane = addPoint("volume", lane, 3, 50);
  lane = addPoint("volume", lane, 1, -100);
  lane = addPoint("volume", lane, 3.005, -3);
  assert.deepEqual(lane.points, [{ t: 1, v: -60 }, { t: 3.005, v: -3 }]);
  lane = movePoint("volume", lane, 0, 10, 2);            // can't pass its neighbour
  assert.ok(lane.points[0].t < lane.points[1].t);
  assert.equal(removePoint(lane, 0).points.length, 1);
});

test("a written pass replaces the lane under it and keeps the rest, thinned", () => {
  const lane = { on: false, points: [{ t: 0, v: 0 }, { t: 5, v: -10 }, { t: 20, v: 0 }] };
  const written = Array.from({ length: 101 }, (_, i) => ({ t: 4 + i * 0.05, v: -6 }));   // a flat move from 4 s to 9 s
  const out = writePass("volume", lane, written);
  assert.equal(out.on, true);
  assert.deepEqual(out.points.map((p) => p.t), [0, 4, 9, 20]);   // 5 s was overwritten; a flat line is two points
});

test("thinning keeps the shape of a real move", () => {
  const ramp = Array.from({ length: 50 }, (_, i) => ({ t: i * 0.02, v: i < 25 ? -i : -50 + i }));
  const t = thin("volume", ramp);
  assert.ok(t.length < ramp.length && t.length >= 3);
  near(valueAt("volume", t, 0.5), -24, 1.5);
});

test("the engine is given exactly the line that is drawn", () => {
  const calls = [];
  const param = { cancelScheduledValues: () => calls.push(["cancel"]), setValueAtTime: (v, at) => calls.push(["set", v, at]),
    linearRampToValueAtTime: (v, at) => calls.push(["ramp", v, at]) };
  schedule(param, "pan", { on: true, points: [{ t: 1, v: -1 }, { t: 3, v: 1 }, { t: 5, v: 0 }] }, 2, 10);
  assert.deepEqual(calls, [["cancel"], ["set", 0, 10], ["ramp", 1, 11], ["ramp", 0, 13]]);
  calls.length = 0;
  schedule(param, "volume", { on: true, points: [{ t: 0, v: 0 }] }, 0, 0, 0);    // a muted track: everything × 0
  assert.deepEqual(calls[1], ["set", 0, 0]);
});

test("a session keeps its lanes through a save and a reload, and repairs junk", () => {
  let s = newSession();
  const id = s.tracks[0].id;
  s = setAuto(s, id, "volume", { on: true, points: [{ t: 1, v: -3 }, { t: "x", v: 0 }] });
  s = setAuto(s, id, "nonsense", { points: [{ t: 1, v: 1 }] });
  const back = cleanSession(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.tracks[0].auto, { volume: { on: true, points: [{ t: 1, v: -3 }] } });
  assert.ok(reads(back.tracks[0], "volume"));
  assert.deepEqual(cleanAuto(null), {});
});

test("the tier counts lanes with points: 3, 6 or unlimited", () => {
  let s = newSession();
  s = addTrack(s); s = addTrack(s);
  const [a, b] = s.tracks;
  s = setAuto(s, a.id, "volume", { points: [{ t: 0, v: 0 }] });
  s = setAuto(s, a.id, "pan", { points: [{ t: 0, v: 0 }] });
  s = setAuto(s, b.id, "volume", { points: [{ t: 0, v: 0 }] });
  assert.equal(laneCount(s), 3);
  assert.equal(laneRoom(s, s.tracks[2], "volume", 3).ok, false);
  assert.equal(laneRoom(s, s.tracks[0], "volume", 3).ok, true);   // a lane you already have is never locked
  assert.equal(laneRoom(s, s.tracks[2], "volume", 6).ok, true);
  assert.equal(laneRoom(s, s.tracks[2], "volume", null).ok, true);
});
