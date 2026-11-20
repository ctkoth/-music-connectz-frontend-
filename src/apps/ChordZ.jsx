import { useEffect, useRef, useState } from "react";
import { Play, Volume2 } from "lucide-react";
import { SCALES, scaleNotes, diatonicChords, noteFreq } from "../scales.js";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const CHORD_TYPES = {
  major: { name: "Major", suffix: "" },
  minor: { name: "Minor", suffix: "m" },
  major7: { name: "Major 7", suffix: "maj7" },
  minor7: { name: "Minor 7", suffix: "m7" },
  dominant7: { name: "Dominant 7", suffix: "7" },
  sus2: { name: "Suspended 2", suffix: "sus2" },
  sus4: { name: "Suspended 4", suffix: "sus4" },
  dim: { name: "Diminished", suffix: "°" },
  aug: { name: "Augmented", suffix: "+" },
  add9: { name: "Add 9", suffix: "add9" },
};

const GUITAR_CHORDS = {
  C: {
    major: [0, 3, 2, 0, 1, 0],
    minor: ["x", 3, 3, 2, 1, 1],
    major7: [0, 3, 2, 0, 0, 0],
    minor7: ["x", 3, 1, 0, 1, 0],
    dominant7: [0, 3, 2, 3, 1, 0],
    sus2: [0, 3, 0, 0, 3, 0],
    sus4: [0, 3, 3, 2, 3, 0],
  },
  D: {
    major: ["x", "x", 0, 2, 3, 2],
    minor: ["x", "x", 0, 2, 3, 1],
    major7: ["x", "x", 0, 2, 2, 2],
    minor7: ["x", "x", 0, 2, 1, 1],
    dominant7: ["x", "x", 0, 2, 3, 2],
    sus2: ["x", "x", 0, 2, 3, 2],
    sus4: ["x", "x", 0, 2, 3, 3],
  },
  E: {
    major: [0, 2, 2, 1, 0, 0],
    minor: [0, 2, 2, 0, 0, 0],
    major7: [0, 2, 1, 1, 0, 0],
    minor7: [0, 2, 0, 0, 0, 0],
    dominant7: [0, 2, 2, 1, 3, 0],
    sus2: [0, 2, 4, 4, 0, 0],
    sus4: [0, 2, 2, 2, 0, 0],
  },
  F: {
    major: [1, 3, 3, 2, 1, 1],
    minor: [1, 3, 3, 1, 1, 1],
    major7: [1, 3, 3, 2, 1, 0],
    minor7: [1, 3, 1, 1, 1, 1],
    dominant7: [1, 3, 3, 2, 4, 1],
    sus2: ["x", 3, 3, 0, 1, 1],
    sus4: [1, 3, 3, 3, 1, 1],
  },
  G: {
    major: [3, 2, 0, 0, 0, 3],
    minor: [3, 5, 5, 4, 3, 3],
    major7: [3, 2, 0, 0, 0, 2],
    minor7: [3, 5, 3, 3, 3, 3],
    dominant7: [3, 2, 0, 0, 0, 1],
    sus2: [3, 0, 0, 0, 3, 3],
    sus4: [3, 3, 0, 0, 3, 3],
  },
  A: {
    major: [0, 0, 1, 2, 2, 0],
    minor: [0, 0, 1, 2, 1, 0],
    major7: [0, 0, 1, 2, 0, 0],
    minor7: [0, 0, 0, 2, 1, 0],
    dominant7: [0, 0, 1, 2, 3, 0],
    sus2: [0, 0, 3, 2, 2, 0],
    sus4: [0, 0, 2, 2, 2, 0],
  },
};

const STRING_FREQUENCIES = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];
const SEMITONE_FREQS = [1.05946];

function getNoteFrequency(baseFreq, semitones) {
  return baseFreq * Math.pow(2, semitones / 12);
}

function FretboardDiagram({ chord, rootNote }) {
  const getStringLabel = (stringIndex) => {
    const baseNotes = ["E", "A", "D", "G", "B", "E"];
    return baseNotes[stringIndex];
  };

  return (
    <div className="mb-6 rounded-lg bg-slate-700/50 p-6">
      <div className="mb-4 font-mono text-sm text-slate-400">
        <div>Standard Tuning (E-A-D-G-B-E)</div>
      </div>
      {/* A six-string diagram cannot wrap — three strings on a second row
          is not a chord chart. So it does the other thing the responsive
          rule allows for a diagram: tries to fit with a tighter gap, and
          scrolls ITSELF rather than pushing the page sideways. At 320px
          this hung 160px off the edge and took the whole page with it. */}
      <div className="-mx-2 overflow-x-auto px-2">
      <div className="flex w-max gap-2 sm:gap-6">
        {chord.map((fret, idx) => (
          <div key={idx} className="text-center">
            {/* `relative` is the fix for a real drawing bug, not just an
                overflow one. The fret dot below is `absolute` and this box
                was not positioned, so the dot resolved against whatever
                positioned ancestor it could find further up the page —
                drawing the marker in the wrong place AND escaping the
                diagram's own scroll container to push the whole page
                sideways. */}
            <div className="relative mb-2 h-16 w-12 border-4 border-slate-400 bg-slate-800">
              {Array.from({ length: 5 }).map((_, fretIdx) => (
                <div key={fretIdx} className="border-b border-slate-500 h-3"></div>
              ))}
              {fret !== "x" && fret !== 0 && (
                <div
                  className="absolute mt-px ml-px w-10 h-3 bg-cyan-500 rounded-full border-2 border-cyan-400"
                  style={{
                    marginTop: `${(fret - 0.5) * 16}px`,
                    marginLeft: "2px",
                  }}
                ></div>
              )}
              {fret === 0 && (
                <div className="mt-0.5 ml-3 w-2 h-2 bg-emerald-400 rounded-full"></div>
              )}
            </div>
            <div className="text-xs text-slate-400">{getStringLabel(idx)}</div>
            {fret !== "x" ? (
              <div className="text-sm font-bold text-cyan-400">{fret}</div>
            ) : (
              <div className="text-sm font-bold text-slate-500">mute</div>
            )}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

function ChordZ() {
  const [rootNote, setRootNote] = useState("C");
  const [chordType, setChordType] = useState("major");
  const audioContextRef = useRef(null);
  const oscillatorsRef = useRef([]);
  // ScaleZ: the notes of the key, from the same root as the chord. Heard on the same audio context.
  const [scaleKey, setScaleKey] = useState("major");
  const notesInKey = scaleNotes(rootNote, scaleKey);
  const chordsInKey = diatonicChords(rootNote, scaleKey);
  const [lit, setLit] = useState(-1);
  const playNotes = (names) => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioContextRef.current;
    ctx.resume();
    const t0 = ctx.currentTime;
    // Walk up from the root: a name that comes earlier in the alphabet of the octave than the one before it
    // is in the next octave, so the scale rises instead of jumping back down.
    let octave = 4, prev = -1;
    names.forEach((n, i) => {
      const idx = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].indexOf(n);
      if (prev >= 0 && idx < prev) octave += 1;
      prev = idx;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = noteFreq(n, octave);
      const at = t0 + i * 0.45;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.42);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(at); osc.stop(at + 0.45);
      setTimeout(() => setLit(names.length === 1 ? -1 : i), i * 450);
    });
    setTimeout(() => setLit(-1), names.length * 450 + 50);
  };

  const currentChord = GUITAR_CHORDS[rootNote]?.[chordType] || [];
  const chordName = `${rootNote}${CHORD_TYPES[chordType]?.suffix || ""}`;

  const playChord = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    ctx.resume();

    oscillatorsRef.current.forEach((osc) => osc.stop());
    oscillatorsRef.current = [];

    const now = ctx.currentTime;
    const duration = 2;

    currentChord.forEach((fret, stringIdx) => {
      if (fret !== "x") {
        const baseFreq = STRING_FREQUENCIES[stringIdx];
        const freq = getNoteFrequency(baseFreq, fret);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration);

        oscillatorsRef.current.push(osc);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-3 sm:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 text-center sm:mb-12">
          <h1 className="mb-2 text-3xl font-bold text-white sm:text-5xl">ChordZ</h1>
          <p className="text-lg text-slate-400">(chord library)</p>
        </div>

        {/* Chord Display */}
        <div className="mb-8 text-center">
          <div className="inline-block rounded-lg bg-gradient-to-r from-cyan-500/20 to-pink-500/20 px-8 py-4 border border-cyan-500/50">
            <div className="text-6xl font-bold text-cyan-400">{chordName}</div>
          </div>
        </div>

        {/* Fretboard */}
        {currentChord.length > 0 && (
          <FretboardDiagram chord={currentChord} rootNote={rootNote} />
        )}

        {/* Play Button */}
        <div className="mb-8 text-center">
          <button
            onClick={playChord}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-8 py-4 font-bold text-white transition-all hover:bg-emerald-600 active:scale-95"
          >
            <Volume2 size={20} /> Play Chord
          </button>
        </div>

        {/* Root Note Selection */}
        <div className="mb-8 rounded-xl bg-slate-800/50 p-6 backdrop-blur">
          <label className="mb-4 block text-sm font-semibold text-slate-300">Root Note</label>
          <div className="grid grid-cols-6 gap-2">
            {NOTES.map((note) => (
              <button
                key={note}
                onClick={() => setRootNote(note)}
                className={`rounded py-2 font-semibold transition-all ${
                  rootNote === note
                    ? "bg-cyan-500 text-slate-900"
                    : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                }`}
              >
                {note}
              </button>
            ))}
          </div>
        </div>

        {/* ScaleZ — the notes of the key, like TunerZ names the note being played. Same root as above. */}
        <div className="mb-8 rounded-xl bg-slate-800/50 p-4 backdrop-blur sm:p-6" data-tour="scalez">
          <label className="mb-1 block text-sm font-semibold text-slate-300">ScaleZ — the notes of the key of {rootNote}</label>
          <p className="mb-3 text-xs text-slate-400">Every note below belongs in {rootNote} {SCALES[scaleKey].name.toLowerCase()}. Tap one to hear it, or play the whole scale.</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {Object.entries(SCALES).map(([k, sc]) => (
              <button key={k} onClick={() => setScaleKey(k)}
                      className={`rounded px-2.5 py-1.5 text-xs font-semibold transition-all ${scaleKey === k ? "bg-emerald-500 text-slate-900" : "bg-slate-700 text-slate-200 hover:bg-slate-600"}`}>
                {sc.name}
              </button>
            ))}
          </div>
          <div className="mb-3 flex flex-wrap gap-2" role="list" aria-label={`Notes in ${rootNote} ${SCALES[scaleKey].name}`}>
            {notesInKey.map((n, i) => (
              <button key={`${n}${i}`} role="listitem" onClick={() => playNotes([n])} aria-label={`Play ${n}`}
                      className={`min-w-[2.75rem] rounded-lg border px-3 py-2 text-base font-bold transition-all ${lit === i ? "scale-110 border-emerald-300 bg-emerald-400 text-slate-900"
                        : i === 0 ? "border-cyan-400 bg-cyan-500/20 text-cyan-300" : "border-slate-600 bg-slate-700/60 text-slate-100 hover:bg-slate-600"}`}>
                {n}
              </button>
            ))}
          </div>
          <button onClick={() => playNotes([...notesInKey, notesInKey[0]])}
                  className="mb-3 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 active:scale-95">
            <Volume2 size={16} /> Play the scale
          </button>
          {chordsInKey.length > 0 && (
            <p className="text-xs text-slate-400">Chords in this key: <span className="font-semibold text-slate-200">{chordsInKey.join(" · ")}</span></p>
          )}
        </div>

        {/* Chord Type Selection */}
        <div className="mb-8 rounded-xl bg-slate-800/50 p-6 backdrop-blur">
          <label className="mb-4 block text-sm font-semibold text-slate-300">Chord Type</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(CHORD_TYPES).map(([key, type]) => (
              <button
                key={key}
                onClick={() => setChordType(key)}
                className={`rounded py-2 px-3 text-sm font-semibold transition-all ${
                  chordType === key
                    ? "bg-pink-500 text-slate-900"
                    : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                }`}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* Chord Info */}
        <div className="rounded-lg bg-slate-800/30 p-6 text-sm text-slate-400">
          <div className="mb-2 font-semibold text-slate-300">How to read the fretboard:</div>
          <ul className="space-y-1">
            <li>• Numbers show which fret to press on that string</li>
            <li>• Open circles (○) are open strings (don't fret)</li>
            <li>• "Mute" strings are not played in this chord</li>
            <li>• Press strings at the fret number shown, then play all strings together</li>
          </ul>
        </div>

        {/* Guitar Tuning Reference */}
        <div className="mt-6 rounded-lg bg-slate-800/20 p-4 text-xs text-slate-500">
          <div className="font-mono">
            Standard guitar tuning (low to high): E • A • D • G • B • E
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChordZ;
