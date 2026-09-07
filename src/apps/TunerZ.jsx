import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";

const NOTES = [
  { note: "C", freq: 16.35 },
  { note: "C#", freq: 17.32 },
  { note: "D", freq: 18.35 },
  { note: "D#", freq: 19.45 },
  { note: "E", freq: 20.6 },
  { note: "F", freq: 21.83 },
  { note: "F#", freq: 23.12 },
  { note: "G", freq: 24.5 },
  { note: "G#", freq: 25.96 },
  { note: "A", freq: 27.5 },
  { note: "A#", freq: 29.13 },
  { note: "B", freq: 30.87 },
];

const STANDARD_TUNING = {
  guitar: [
    { string: "E", freq: 82.41 },
    { string: "A", freq: 110.0 },
    { string: "D", freq: 146.83 },
    { string: "G", freq: 196.0 },
    { string: "B", freq: 246.94 },
    { string: "e", freq: 329.63 },
  ],
  bass: [
    { string: "E", freq: 41.2 },
    { string: "A", freq: 55.0 },
    { string: "D", freq: 73.42 },
    { string: "G", freq: 98.0 },
  ],
  ukulele: [
    { string: "G", freq: 392.0 },
    { string: "C", freq: 261.63 },
    { string: "E", freq: 329.63 },
    { string: "A", freq: 440.0 },
  ],
};

function autoCorrelate(buffer, sampleRate) {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);

  let best_offset = -1;
  let best_correlation = 0;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  if (rms < 0.01) return -1;

  let lastCorrelation = 1;
  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;

    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }

    correlation = 1 - correlation / MAX_SAMPLES;
    if (correlation > 0.9 && correlation > lastCorrelation) {
      let foundGoodCorrelation = false;
      if (correlation > best_correlation) {
        best_correlation = correlation;
        best_offset = offset;
        foundGoodCorrelation = true;
      }
      if (foundGoodCorrelation) {
        const shift = ((correlation - lastCorrelation) * offset) / (2 * (correlation + lastCorrelation));
        return sampleRate / (offset + shift);
      }
    }
    lastCorrelation = correlation;
  }

  if (best_correlation > 0.01) {
    return sampleRate / best_offset;
  }
  return -1;
}

function findClosestNote(frequency) {
  let closestNote = NOTES[0];
  let minDiff = Math.abs(frequency - closestNote.freq);

  for (const note of NOTES) {
    const diff = Math.abs(frequency - note.freq);
    if (diff < minDiff) {
      minDiff = diff;
      closestNote = note;
    }
  }

  const cents = Math.round(1200 * Math.log2(frequency / closestNote.freq));
  return { ...closestNote, detectedFreq: frequency, cents };
}

function TunerZ() {
  // Parse URL params for drill mode (from coach feedback)
  const params = new URLSearchParams(window.location.search);
  const drillNote = params.get("note");
  const drillFreq = params.get("freq") ? parseFloat(params.get("freq")) : null;
  const drillCentsOff = params.get("cents") ? parseInt(params.get("cents")) : null;
  const drillKey = params.get("key");
  const drillBpm = params.get("bpm") ? parseInt(params.get("bpm")) : null;
  const isDrillMode = !!drillNote;

  const [isListening, setIsListening] = useState(false);
  const [frequency, setFrequency] = useState(0);
  const [note, setNote] = useState(null);
  const [instrument, setInstrument] = useState("guitar");
  const [targetString, setTargetString] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [drillAccuracy, setDrillAccuracy] = useState(0);
  const [drillHistory, setDrillHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sessionStartRef = useRef(null);
  const lastFrequencyRef = useRef(0);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096;

      source.connect(analyser);
      analyserRef.current = analyser;
      dataArrayRef.current = new Float32Array(analyser.fftSize);

      sessionStartRef.current = Date.now();
      lastFrequencyRef.current = 0;
      setIsListening(true);
      detectPitch();
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopListening = async () => {
    setIsListening(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (isDrillMode && drillNote && sessionStartRef.current) {
      const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
      const finalFreq = lastFrequencyRef.current;
      const finalNote = finalFreq > 0 ? findClosestNote(finalFreq) : null;
      const finalCentsOff = finalNote ? finalNote.cents : null;

      try {
        await fetch("/api/economy/tunerz/drills/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weak_note: drillNote,
            original_frequency: drillFreq,
            original_cents_off: drillCentsOff,
            accuracy_percent: Math.round(drillAccuracy),
            duration_seconds: durationSeconds,
            final_frequency: finalFreq || null,
            final_cents_off: finalCentsOff,
            key_context: drillKey,
            bpm_context: drillBpm,
          }),
        });
      } catch (err) {
        console.error("Failed to save drill take:", err);
      }
    }

    setFrequency(0);
    setNote(null);
  };

  const detectPitch = () => {
    if (!analyserRef.current || !isListening) return;

    analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
    const detectedFreq = autoCorrelate(dataArrayRef.current, audioContextRef.current.sampleRate);

    if (detectedFreq > -1) {
      setFrequency(detectedFreq);
      lastFrequencyRef.current = detectedFreq;
      const closestNote = findClosestNote(detectedFreq);
      setNote(closestNote);
    } else {
      setFrequency(0);
      setNote(null);
    }

    animationFrameRef.current = requestAnimationFrame(detectPitch);
  };

  // In drill mode, use the target frequency from coach feedback
  const targetFreq = isDrillMode ? drillFreq : STANDARD_TUNING[instrument][targetString].freq;

  // Calculate deviation from target
  const deviation = note ? note.cents : 0;
  const deviationPercent = Math.max(-50, Math.min(50, deviation / 2));

  useEffect(() => {
    const acc = isDrillMode && frequency > 0 ? Math.max(0, 100 - Math.abs(deviation) * 2) : 0;
    setDrillAccuracy(acc);
  }, [isDrillMode, frequency, deviation]);

  useEffect(() => {
    return () => {
      if (isListening) stopListening();
    };
  }, []);

  useEffect(() => {
    const fetchDrillHistory = async () => {
      try {
        const noteFilter = isDrillMode ? `?note=${encodeURIComponent(drillNote)}` : "";
        const response = await fetch(`/api/economy/tunerz/drills/${noteFilter}`);
        if (response.ok) {
          const data = await response.json();
          setDrillHistory(data);
        }
      } catch (err) {
        console.error("Failed to fetch drill history:", err);
      }
    };
    fetchDrillHistory();
  }, [isDrillMode, drillNote]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-2 text-5xl font-bold text-white">TunerZ</h1>
          <p className="text-lg text-slate-400">
            {isDrillMode ? "Practice drill from coach feedback" : "(instrument tuner)"}
          </p>
        </div>

        {/* Drill Context */}
        {isDrillMode && (
          <div className="mb-8 rounded-lg bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/50 p-6">
            <div className="text-center">
              <div className="text-sm text-slate-400 mb-2">Coach said you were:</div>
              <div className="text-3xl font-bold text-cyan-400 mb-3">{drillNote} {drillCentsOff && `(${Math.abs(drillCentsOff)}¢ ${drillCentsOff < 0 ? 'flat' : 'sharp'})`}</div>
              {drillKey && <div className="text-sm text-slate-300 mb-2">Key: {drillKey}</div>}
              {drillBpm && <div className="text-sm text-slate-300">Song tempo: {drillBpm} BPM</div>}
            </div>
          </div>
        )}

        {/* Microphone Control */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={startListening}
            disabled={isListening}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 font-bold text-white transition-all hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mic size={20} /> Start Listening
          </button>
          <button
            onClick={stopListening}
            disabled={!isListening}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-mcz-ember px-6 py-3 font-bold text-white transition-all hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MicOff size={20} /> Stop
          </button>
        </div>

        {/* Listening Status */}
        <div className="mb-8 text-center">
          <div className="inline-block rounded-full bg-slate-700/50 px-4 py-2">
            <span className="text-sm text-slate-300">
              {isListening ? (
                <>
                  <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
                  Listening...
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

        {/* Instrument Selection (hidden in drill mode) */}
        {!isDrillMode && (
          <>
            <div className="mb-8 rounded-xl bg-slate-800/50 p-6 backdrop-blur">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Instrument</label>
              <select
                value={instrument}
                onChange={(e) => {
                  setInstrument(e.target.value);
                  setTargetString(0);
                }}
                className="w-full rounded bg-slate-700 px-3 py-2 text-white"
              >
                <option value="guitar">Guitar</option>
                <option value="bass">Bass Guitar</option>
                <option value="ukulele">Ukulele</option>
              </select>
            </div>

            {/* String Selection */}
            <div className="mb-8 rounded-xl bg-slate-800/50 p-6 backdrop-blur">
              <label className="block text-sm font-semibold text-slate-300 mb-3">String</label>
              <div className="grid grid-cols-3 gap-2">
                {STANDARD_TUNING[instrument].map((string, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTargetString(idx)}
                    className={`rounded py-2 font-semibold transition-all ${
                      targetString === idx
                        ? "bg-cyan-500 text-slate-900"
                        : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                    }`}
                  >
                    {string.string}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Tuner Display */}
        {isListening && (
          <div className="mb-8 rounded-xl bg-slate-800/50 p-8 backdrop-blur">
            {/* Frequency & Note */}
            <div className="mb-8 text-center">
              {!isDrillMode && <div className="text-2xl text-slate-400 mb-2">Target: {STANDARD_TUNING[instrument][targetString].string}</div>}
              {note ? (
                <>
                  <div className="mb-2 text-6xl font-bold text-cyan-400">{note.note}</div>
                  <div className="text-lg text-slate-300">
                    Detected: {frequency.toFixed(1)} Hz | Target: {targetFreq?.toFixed(1)} Hz
                  </div>
                  <div className={`text-lg font-semibold ${
                    Math.abs(deviation) < 5 ? "text-emerald-400" : "text-amber-400"
                  }`}>
                    {deviation > 0 ? `↓ ${deviation} cents flat` : deviation < 0 ? `↑ ${Math.abs(deviation)} cents sharp` : "✓ In tune"}
                  </div>

                  {/* Drill mode accuracy */}
                  {isDrillMode && (
                    <div className="mt-4 text-sm text-slate-400">
                      Accuracy: <span className={drillAccuracy > 80 ? "text-emerald-400 font-bold" : "text-amber-400"}>{Math.round(drillAccuracy)}%</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-lg text-slate-400">Play a note...</div>
              )}
            </div>

            {/* Tuning Gauge */}
            <div className="relative mb-8 h-12 overflow-hidden rounded-lg bg-slate-700/50">
              <div className="absolute inset-0 flex items-center">
                <div className="h-full w-1/2 bg-gradient-to-r from-slate-700 to-transparent"></div>
                <div className="absolute left-1/2 top-0 h-full w-1 bg-white/30"></div>
                <div className="h-full w-1/2 bg-gradient-to-l from-slate-700 to-transparent"></div>
              </div>

              {/* Drill mode goal marker - show where they were originally off */}
              {isDrillMode && drillCentsOff && (
                <div
                  className="absolute top-0 h-full w-1 bg-purple-400/50 border-l border-purple-300"
                  style={{
                    left: `calc(50% + ${Math.max(-50, Math.min(50, drillCentsOff / 2))}%)`,
                  }}
                  title={`Goal: ${drillCentsOff < 0 ? 'fix flat by' : 'fix sharp by'} ${Math.abs(drillCentsOff)}¢`}
                ></div>
              )}

              {/* Indicator - current detection */}
              <div
                className={`absolute top-0 h-full w-2 transition-all ${
                  Math.abs(deviation) < 5 ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{
                  left: `calc(50% + ${deviationPercent}%)`,
                  transform: "translateX(-50%)",
                }}
              ></div>
            </div>

            {/* Deviation Scale */}
            <div className="flex justify-between text-xs text-slate-400">
              <span>Flat</span>
              <span>In Tune</span>
              <span>Sharp</span>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="rounded-lg bg-slate-800/30 p-6 text-center text-sm text-slate-400">
          {isDrillMode ? (
            <>
              <p>The purple line shows where you were flat/sharp in your recording. Hit the green area (in tune) to complete this drill.</p>
              <p className="mt-2">When you're consistently hitting 80%+ accuracy, you've locked it in—move to the next weak note.</p>
            </>
          ) : (
            <>
              <p>Allow microphone access and play a note to see the detected frequency and tuning accuracy.</p>
              <p className="mt-2">The gauge shows how far you are from the target note (±50 cents).</p>
            </>
          )}
        </div>

        {/* Drill History */}
        {drillHistory.length > 0 && (
          <div className="mt-8 rounded-xl bg-slate-800/50 p-6 backdrop-blur">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full text-left font-semibold text-slate-300 mb-4 hover:text-emerald-400 transition-colors"
            >
              {showHistory ? "▼ " : "▶ "} Drill History ({drillHistory.length} attempts)
            </button>
            {showHistory && (
              <div className="space-y-3">
                {drillHistory.map((drill, idx) => (
                  <div key={idx} className="rounded bg-slate-700/50 p-4 text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-cyan-400 font-bold">{drill.weak_note}</span>
                        <span className="text-slate-400 ml-2">{drill.duration_seconds}s</span>
                      </div>
                      <div className={drill.accuracy_percent >= 80 ? "text-emerald-400 font-bold" : "text-amber-400"}>
                        {drill.accuracy_percent}% accuracy
                      </div>
                    </div>
                    {drill.improvement !== null && (
                      <div className="text-slate-300">
                        Improvement: <span className={drill.improvement > 0 ? "text-emerald-400" : "text-slate-400"}>
                          {drill.improvement > 0 ? `+${drill.improvement}¢` : `${drill.improvement}¢`}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(drill.created_at).toLocaleDateString()} {new Date(drill.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TunerZ;
