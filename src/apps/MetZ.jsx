import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

function MetZ() {
  // Parse URL params for pre-set BPM (from coach feedback linking)
  const params = new URLSearchParams(window.location.search);
  const urlBpm = params.get("bpm") ? parseInt(params.get("bpm")) : null;

  const [bpm, setBpm] = useState(urlBpm || 120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeSignature, setTimeSignature] = useState(4);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const scheduleAheadTimeRef = useRef(0.1);
  const lookAheadTimeRef = useRef(25);
  const currentNoteRef = useRef(0);
  const lastScheduledNoteRef = useRef(-1);
  const timerIDRef = useRef(null);
  const isAccentedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerIDRef.current) clearInterval(timerIDRef.current);
      if (oscillatorRef.current) oscillatorRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const initAudioContext = () => {
    if (audioContextRef.current) return;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioContext;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = "sine";
    oscillator.frequency.value = 800;
    oscillator.start();

    oscillatorRef.current = oscillator;
    gainNodeRef.current = gainNode;

    nextNoteTimeRef.current = audioContext.currentTime;
  };

  const playClick = (isAccented = false) => {
    if (!gainNodeRef.current || !audioContextRef.current) return;

    const now = audioContextRef.current.currentTime;
    const frequency = isAccented ? 1000 : 800;
    const duration = isAccented ? 0.12 : 0.08;

    oscillatorRef.current.frequency.setValueAtTime(frequency, now);
    gainNodeRef.current.gain.setValueAtTime(0.3, now);
    gainNodeRef.current.gain.exponentialRampToValueAtTime(0.01, now + duration);
  };

  const scheduleNotes = () => {
    while (
      nextNoteTimeRef.current <
      audioContextRef.current.currentTime + scheduleAheadTimeRef.current
    ) {
      scheduleNote(currentNoteRef.current, nextNoteTimeRef.current);
      nextNote();
    }
  };

  const scheduleNote = (beatNumber, time) => {
    if (beatNumber !== lastScheduledNoteRef.current) {
      lastScheduledNoteRef.current = beatNumber;
      const isAccented = beatNumber % timeSignature === 0;
      if (audioContextRef.current) {
        audioContextRef.current.resume();
      }
      setTimeout(() => playClick(isAccented), (time - audioContextRef.current.currentTime) * 1000);
    }
  };

  const nextNote = () => {
    const secondsPerBeat = (60.0 / bpm) * 1.0;
    nextNoteTimeRef.current += secondsPerBeat;
    currentNoteRef.current = (currentNoteRef.current + 1) % timeSignature;
  };

  const handlePlay = () => {
    if (!isPlaying) {
      initAudioContext();
      nextNoteTimeRef.current = audioContextRef.current.currentTime;
      currentNoteRef.current = 0;
      lastScheduledNoteRef.current = -1;

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
  };

  const handleReset = () => {
    handleStop();
    setBpm(120);
    setTimeSignature(4);
  };

  const handleBpmChange = (e) => {
    const newBpm = parseInt(e.target.value);
    setBpm(newBpm);
    if (isPlaying) {
      handleStop();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-2 text-5xl font-bold text-white">MetZ</h1>
          <p className="text-lg text-slate-400">
            {urlBpm ? "Practice tempo from coach feedback" : "(metronome)"}
          </p>
        </div>

        {/* Coach Context */}
        {urlBpm && (
          <div className="mb-8 rounded-lg bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/50 p-6">
            <div className="text-center">
              <div className="text-sm text-slate-400 mb-2">Coach recommended practicing at:</div>
              <div className="text-2xl font-bold text-cyan-400">{urlBpm} BPM</div>
              <div className="text-xs text-slate-300 mt-2">Lock in the tempo, then focus on precision.</div>
            </div>
          </div>
        )}

        {/* BPM Display */}
        <div className="mb-8 rounded-xl bg-slate-800/50 p-8 backdrop-blur">
          <div className="mb-6 text-center">
            <div className="text-6xl font-bold text-cyan-400">{bpm}</div>
            <div className="mt-2 text-sm text-slate-400">BPM</div>
          </div>

          {/* BPM Slider */}
          <input
            type="range"
            min="40"
            max="240"
            value={bpm}
            onChange={handleBpmChange}
            disabled={isPlaying}
            className="w-full cursor-pointer accent-cyan-500 disabled:opacity-50"
          />

          <div className="mt-4 flex justify-between text-xs text-slate-400">
            <span>40</span>
            <span>240</span>
          </div>
        </div>

        {/* Quick BPM buttons */}
        <div className="mb-8 grid grid-cols-4 gap-2">
          {[60, 90, 120, 140, 160, 180, 200, 220].map((tempo) => (
            <button
              key={tempo}
              onClick={() => !isPlaying && setBpm(tempo)}
              disabled={isPlaying}
              className={`rounded py-2 text-sm font-semibold transition-all disabled:opacity-50 ${
                bpm === tempo
                  ? "bg-cyan-500 text-slate-900"
                  : "bg-slate-700 text-slate-200 hover:bg-slate-600"
              }`}
            >
              {tempo}
            </button>
          ))}
        </div>

        {/* Time Signature */}
        <div className="mb-8 rounded-xl bg-slate-800/50 p-6 backdrop-blur">
          <label className="block text-sm font-semibold text-slate-300">Time Signature</label>
          <select
            value={timeSignature}
            onChange={(e) => setTimeSignature(parseInt(e.target.value))}
            disabled={isPlaying}
            className="mt-2 w-full rounded bg-slate-700 px-3 py-2 text-white disabled:opacity-50"
          >
            <option value={2}>2/4</option>
            <option value={3}>3/4</option>
            <option value={4}>4/4</option>
            <option value={6}>6/8</option>
          </select>
        </div>

        {/* Controls */}
        <div className="flex gap-4">
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

        {/* Status */}
        <div className="mt-8 text-center">
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
                  Stopped
                </>
              )}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="mt-12 rounded-lg bg-slate-800/30 p-6 text-center text-sm text-slate-400">
          <p>Use MetZ as a practice aid to keep your tempo steady while playing.</p>
          <p className="mt-2">The first beat of each measure is accented (higher pitch).</p>
        </div>
      </div>
    </div>
  );
}

export default MetZ;
