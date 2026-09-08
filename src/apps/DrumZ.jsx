import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Download } from "lucide-react";

const DRUM_KITS = {
  acoustic: {
    name: "Acoustic",
    drums: [
      { name: "Kick", freq: 60, duration: 0.4 },
      { name: "Snare", freq: 200, duration: 0.15 },
      { name: "Hi-Hat Closed", freq: 400, duration: 0.08 },
      { name: "Hi-Hat Open", freq: 350, duration: 0.25 },
      { name: "Tom High", freq: 150, duration: 0.12 },
      { name: "Tom Mid", freq: 120, duration: 0.14 },
      { name: "Tom Low", freq: 90, duration: 0.16 },
      { name: "Cymbal", freq: 250, duration: 0.3 },
    ],
  },
  electronic: {
    name: "Electronic",
    drums: [
      { name: "808 Kick", freq: 55, duration: 0.5 },
      { name: "Clap", freq: 300, duration: 0.12 },
      { name: "Perc 1", freq: 500, duration: 0.06 },
      { name: "Perc 2", freq: 600, duration: 0.05 },
      { name: "Beep 1", freq: 800, duration: 0.1 },
      { name: "Beep 2", freq: 1000, duration: 0.08 },
      { name: "Noise 1", freq: 450, duration: 0.2 },
      { name: "Noise 2", freq: 350, duration: 0.15 },
    ],
  },
};

const PATTERN_LENGTHS = [8, 16, 32];
const TEMPO_RANGE = { min: 60, max: 180 };

function DrumZ() {
  const [kitName, setKitName] = useState("acoustic");
  const [bpm, setBpm] = useState(120);
  const [patternLength, setPatternLength] = useState(16);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pattern, setPattern] = useState(
    new Array(16).fill(null).map(() => new Array(8).fill(false))
  );
  const [currentStep, setCurrentStep] = useState(-1);

  const audioContextRef = useRef(null);
  const oscillatorsRef = useRef([]);
  const playbackTimeRef = useRef(0);
  const nextStepTimeRef = useRef(0);
  const scheduleAheadTimeRef = useRef(0.1);
  const lookAheadTimeRef = useRef(25);
  const timerIDRef = useRef(null);

  const kit = DRUM_KITS[kitName];

  useEffect(() => {
    return () => {
      if (timerIDRef.current) clearInterval(timerIDRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const initAudioContext = () => {
    if (audioContextRef.current) return;
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    nextStepTimeRef.current = audioContextRef.current.currentTime;
  };

  const playDrumSound = (drum) => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.frequency.value = drum.freq;
    osc.type = drum.name.includes("Kick") ? "sine" : "square";

    filter.type = "lowpass";
    filter.frequency.value = drum.freq * 2;

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + drum.duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + drum.duration);
  };

  const scheduleNotes = () => {
    while (
      nextStepTimeRef.current <
      audioContextRef.current.currentTime + scheduleAheadTimeRef.current
    ) {
      scheduleStep(Math.floor(playbackTimeRef.current * 4));
      playbackTimeRef.current += 0.25;
    }
  };

  const scheduleStep = (stepIndex) => {
    const currentPattern = Math.floor(stepIndex / 4) % patternLength;
    setCurrentStep(stepIndex % patternLength);

    for (let drumIdx = 0; drumIdx < kit.drums.length; drumIdx++) {
      if (pattern[currentPattern][drumIdx]) {
        playDrumSound(kit.drums[drumIdx]);
      }
    }

    const secondsPerBeat = (60.0 / bpm) * 0.25;
    nextStepTimeRef.current += secondsPerBeat;
  };

  const handlePlay = () => {
    if (!isPlaying) {
      initAudioContext();
      playbackTimeRef.current = 0;
      nextStepTimeRef.current = audioContextRef.current.currentTime;
      setCurrentStep(0);

      if (timerIDRef.current) clearInterval(timerIDRef.current);
      timerIDRef.current = setInterval(() => {
        scheduleNotes();
      }, lookAheadTimeRef.current);

      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    if (timerIDRef.current) {
      clearInterval(timerIDRef.current);
      timerIDRef.current = null;
    }
    setIsPlaying(false);
    setCurrentStep(-1);
  };

  const handleReset = () => {
    handleStop();
    setPattern(new Array(patternLength).fill(null).map(() => new Array(8).fill(false)));
    setBpm(120);
  };

  const togglePad = (patternIdx, drumIdx) => {
    const newPattern = pattern.map((p) => [...p]);
    newPattern[patternIdx][drumIdx] = !newPattern[patternIdx][drumIdx];
    setPattern(newPattern);
  };

  const handlePatternLengthChange = (newLength) => {
    const newPattern = new Array(newLength)
      .fill(null)
      .map((_, idx) => (pattern[idx] ? [...pattern[idx]] : new Array(8).fill(false)));
    setPattern(newPattern);
    setPatternLength(newLength);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-5xl font-bold text-white">DrumZ</h1>
          <p className="text-lg text-slate-400">(beat pad)</p>
        </div>

        {/* Controls */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Kit Selection */}
          <div className="rounded-lg bg-slate-800/50 p-4 backdrop-blur">
            <label className="block text-sm font-semibold text-slate-300 mb-2">Drum Kit</label>
            <select
              value={kitName}
              onChange={(e) => setKitName(e.target.value)}
              disabled={isPlaying}
              className="w-full rounded bg-slate-700 px-3 py-2 text-white text-sm disabled:opacity-50"
            >
              {Object.entries(DRUM_KITS).map(([key, k]) => (
                <option key={key} value={key}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>

          {/* BPM Control */}
          <div className="rounded-lg bg-slate-800/50 p-4 backdrop-blur">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              BPM: {bpm}
            </label>
            <input
              type="range"
              min={TEMPO_RANGE.min}
              max={TEMPO_RANGE.max}
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value))}
              disabled={isPlaying}
              className="w-full accent-cyan-500 disabled:opacity-50"
            />
          </div>

          {/* Pattern Length */}
          <div className="rounded-lg bg-slate-800/50 p-4 backdrop-blur">
            <label className="block text-sm font-semibold text-slate-300 mb-2">Length</label>
            <div className="flex gap-2">
              {PATTERN_LENGTHS.map((len) => (
                <button
                  key={len}
                  onClick={() => handlePatternLengthChange(len)}
                  disabled={isPlaying}
                  className={`flex-1 rounded py-1 text-sm font-semibold transition-all disabled:opacity-50 ${
                    patternLength === len
                      ? "bg-cyan-500 text-slate-900"
                      : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                  }`}
                >
                  {len}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={handlePlay}
            disabled={isPlaying}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 font-bold text-white transition-all hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={20} /> Play
          </button>

          <button
            onClick={handleStop}
            disabled={!isPlaying}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-mcz-ember px-6 py-3 font-bold text-white transition-all hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Pause size={20} /> Stop
          </button>

          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-6 py-3 font-bold text-white transition-all hover:bg-slate-600"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {/* Drum Pads Grid */}
        <div className="mb-8 rounded-xl bg-slate-800/50 p-6 backdrop-blur">
          <div className="mb-4">
            <label className="text-sm font-semibold text-slate-300">Pattern Editor</label>
            <p className="text-xs text-slate-500">Click pads to add/remove drum hits</p>
          </div>

          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Drum Labels */}
              <div className="mb-2">
                <div className="flex gap-1">
                  <div className="w-24 flex-shrink-0"></div>
                  {Array.from({ length: patternLength }).map((_, stepIdx) => (
                    <div
                      key={stepIdx}
                      className={`w-8 h-8 flex items-center justify-center text-xs font-bold transition-all ${
                        currentStep === stepIdx
                          ? "bg-cyan-500/50 text-cyan-300"
                          : stepIdx % 4 === 0
                          ? "text-slate-400"
                          : "text-slate-600"
                      }`}
                    >
                      {stepIdx + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pads */}
              {kit.drums.map((drum, drumIdx) => (
                <div key={drumIdx} className="flex gap-1 mb-2">
                  <div className="w-24 flex-shrink-0">
                    <div className="text-xs font-semibold text-slate-300 truncate">
                      {drum.name}
                    </div>
                  </div>
                  {Array.from({ length: patternLength }).map((_, stepIdx) => (
                    <button
                      key={`${drumIdx}-${stepIdx}`}
                      onClick={() => togglePad(stepIdx, drumIdx)}
                      disabled={isPlaying}
                      className={`w-8 h-8 rounded transition-all disabled:cursor-not-allowed ${
                        pattern[stepIdx][drumIdx]
                          ? "bg-pink-500 hover:bg-pink-600"
                          : "bg-slate-700 hover:bg-slate-600"
                      } ${currentStep === stepIdx ? "ring-2 ring-cyan-400" : ""}`}
                    ></button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mb-6 text-center">
          <div className="inline-block rounded-full bg-slate-700/50 px-4 py-2">
            <span className="text-sm text-slate-300">
              {isPlaying ? (
                <>
                  <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
                  Playing
                </>
              ) : (
                <>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-slate-500"></span>
                  Ready
                </>
              )}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-lg bg-slate-800/30 p-6 text-center text-sm text-slate-400">
          <p>Create drum patterns by clicking pads. Each column is a beat in your pattern.</p>
          <p className="mt-2">
            Use the kit selector to switch between different drum sounds. Play to hear your beat!
          </p>
        </div>
      </div>
    </div>
  );
}

export default DrumZ;
