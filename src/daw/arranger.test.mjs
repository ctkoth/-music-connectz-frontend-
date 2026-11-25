import test from "node:test";
import assert from "node:assert/strict";
import { newSession, addSource, addRegion, setTrack, cleanSections, endOf, playlistOf } from "./session.js";
import { addSection, appendSection, updateSection, removeSection, sectionProblem, arrange, moveSection, duplicateSection, deleteSectionWithMusic, spans } from "./arranger.js";

// 120 BPM, 4/4: a bar is 2 s. A song of three 4 s sections: Intro 0-4, Verse 4-8, Chorus 8-12, with one long take under all of it,
// a marker in each section, a volume ride, and an outro region after the song.
function song() {
  let s = newSession("t"); const id = s.tracks[0].id;
  s = addSource(s, { id: "src", name: "take", duration: 30, channels: 2, rate: 48000 });
  s = addRegion(s, id, { src: "src", at: 0, name: "take" });
  s = { ...s, tracks: s.tracks.map((t) => ({ ...t, playlists: t.playlists.map((p) => ({ ...p, regions: [{ ...p.regions[0], out: 12, fadeIn: 0.5, fadeOut: 0.5 }, { id: "outro", src: "src", name: "outro", at: 12, in: 12, out: 16, gain: 0, fadeIn: 0, fadeOut: 0 }] })) }))
    .map((t) => ({ ...t, auto: { volume: { on: true, points: [{ t: 1, v: -6 }, { t: 5, v: -3 }, { t: 9, v: 0 }] } } })) };
  s = { ...s, markers: [{ id: "m1", t: 1, name: "a", emoji: "", color: "#fff" }, { id: "m2", t: 5, name: "b", emoji: "", color: "#fff" }, { id: "m3", t: 9, name: "c", emoji: "", color: "#fff" }] };
  s = addSection(s, { name: "Intro", start: 0, end: 4 }); s = addSection(s, { name: "Verse", start: 4, end: 8 }); s = addSection(s, { name: "Chorus", start: 8, end: 12 });
  return s;
}
const ids = (s) => s.sections.map((x) => x.name);
const regs = (s) => playlistOf(s.tracks[0]).regions.map((r) => [Math.round(r.at * 100) / 100, Math.round(r.in * 100) / 100, Math.round(r.out * 100) / 100]);

test("sections are stored sorted, never overlap, and a bad one is refused with a reason", () => {
  const s = song();
  assert.deepEqual(ids(s), ["Intro", "Verse", "Chorus"]);
  assert.match(sectionProblem(s, 3, 6), /Intro|Verse/);
  assert.equal(addSection(s, { name: "x", start: 3, end: 6 }).sections.length, 3);
  assert.equal(cleanSections([{ start: 0, end: 4 }, { start: 2, end: 6 }, { start: 5, end: 5.01 }, { start: "x", end: 1 }]).length, 1);
  assert.equal(appendSection(s, "Outro", 2).sections.at(-1).start, 12);
});
test("moving a section carries the music: the Chorus first puts the take's last third at the start", () => {
  const base = song(); const s = moveSection(base, spans(base)[2].id, 0);
  assert.deepEqual(ids(s), ["Chorus", "Intro", "Verse"]);
  assert.deepEqual(regs(s).slice(0, 3), [[0, 8, 12], [4, 0, 4], [8, 4, 8]]);                          // [at, in, out]: Chorus now at 0, Intro at 4, Verse at 8
  assert.deepEqual(s.sections.map((x) => [x.start, x.end]), [[0, 4], [4, 8], [8, 12]]);
});
test("the fades stay at the true start and end of the take, not at the cuts", () => {
  const base = song(); const r = playlistOf(moveSection(base, spans(base)[2].id, 0).tracks[0]).regions;
  const byAt = Object.fromEntries(r.map((x) => [Math.round(x.at), x]));
  assert.equal(byAt[0].fadeOut, 0.5); assert.equal(byAt[0].fadeIn, 0);                                  // the old Chorus piece kept the take's fade out
  assert.equal(byAt[4].fadeIn, 0.5);                                                                    // the old Intro piece kept the take's fade in
});
test("markers and automation points ride along with their section", () => {
  const base = song(); const s = moveSection(base, spans(base)[2].id, 0);
  assert.deepEqual(s.markers.map((m) => [m.name, m.t]), [["c", 1], ["a", 5], ["b", 9]]);
  assert.deepEqual(s.tracks[0].auto.volume.points.map((p) => [p.t, p.v]), [[1, 0], [5, -6], [9, -3]]);
});
test("a copy goes after its original, the song gets longer, and what came after the song follows the new end", () => {
  const base = song(); const s = duplicateSection(base, spans(base)[1].id);
  assert.deepEqual(ids(s), ["Intro", "Verse", "Verse (copy)", "Chorus"]);
  const outro = playlistOf(s.tracks[0]).regions.find((r) => r.id === "outro");
  assert.equal(outro.at, 16);                                                                           // 12 + one 4 s section
  assert.equal(new Set(s.sections.map((x) => x.id)).size, 4);
  assert.equal(s.markers.filter((m) => m.t >= 8 && m.t < 12).length, 1);                                // the verse's marker was copied to the copy
});
test("cutting a section with its music closes the gap; removing only its label leaves the music", () => {
  const base = song(); const cut = deleteSectionWithMusic(base, spans(base)[1].id);
  assert.deepEqual(ids(cut), ["Intro", "Chorus"]);
  assert.equal(playlistOf(cut.tracks[0]).regions.find((r) => r.id === "outro").at, 8);
  const label = removeSection(base, spans(base)[1].id);
  assert.deepEqual(ids(label), ["Intro", "Chorus"]); assert.equal(playlistOf(label.tracks[0]).regions.length, 2);
});
test("the same order is a no-op, a gap between sections moves with the section before it, and nothing is lost", () => {
  const s = song();
  assert.equal(arrange(s, spans(s).map((x) => x.id)), s);
  const gap = { ...s, sections: s.sections.map((x, i) => (i === 1 ? { ...x, end: 7 } : x)) };         // 1 s of music after the Verse's own end
  const moved = moveSection(gap, spans(gap)[2].id, 0);
  const total = playlistOf(moved.tracks[0]).regions.filter((r) => r.id !== "outro").reduce((n, r) => n + (r.out - r.in), 0);
  assert.equal(Math.round(total * 100) / 100, 12);                                                      // all 12 s of the take are still there
});
test("every take lane moves together, so takes stay lined up", () => {
  let s = song(); const id = s.tracks[0].id;
  s = { ...s, tracks: s.tracks.map((t) => ({ ...t, playlists: [...t.playlists, { id: "p2", name: "Take 2", regions: [{ id: "q", src: "src", name: "alt", at: 0, in: 0, out: 12, gain: 0, fadeIn: 0, fadeOut: 0 }] }] })) };
  const m = moveSection(s, spans(s)[2].id, 0);
  const lane2 = m.tracks[0].playlists[1].regions.map((r) => [r.at, r.in, r.out]);
  assert.deepEqual(lane2, [[0, 8, 12], [4, 0, 4], [8, 4, 8]]);
});
test("renaming and recolouring do not move anything", () => {
  const s = song();
  const r = updateSection(s, s.sections[0].id, { name: "Hook", color: "#ff0000" });
  assert.equal(r.sections[0].name, "Hook"); assert.deepEqual(regs(r), regs(s));
  assert.equal(updateSection(s, s.sections[0].id, { end: 6 }), s);                                       // growing into the Verse is refused
});
