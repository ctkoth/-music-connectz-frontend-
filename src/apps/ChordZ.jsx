import { useEffect, useRef, useState } from "react";
import { Play, Volume2 } from "lucide-react";

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
      <div className="flex gap-6">
        {chord.map((fret, idx) => (
          <div key={idx} className="text-center">
            <div className="mb-2 h-16 w-12 border-4 border-slate-400 bg-slate-800">
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
  );
}

function ChordZ() {
  const [rootNote, setRootNote] = useState("C");
  const [chordType, setChordType] = useState("major");
  const audioContextRef = useRef(null);
  const oscillatorsRef = useRef([]);

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-2 text-5xl font-bold text-white">ChordZ</h1>
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
