// SingZ Boss Take — record one scored take and have it coached.
//
// The blueprint's Boss Take ("one scored final take, exercise pass, or song
// section") against the StatZ AI Vocal Coach. Record in the browser or attach a
// file; the take goes up with genre, target range and difficulty, and comes
// back scored out of 10 with what worked, what to fix, and one drill.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Loader2, Mic, Play, Square, Trash2, Upload, Video } from "lucide-react";
import { api } from "../api.js";
import { GENRE_GROUPS } from "../genres.js";
import { onHandoff } from "../handoff.js";
import { goToSpot } from "../goto.js";
import { playSound } from "../sound.js";
import { track, anonId } from "../track.js";
import TierUpgradePrompt from "../components/TierUpgradePrompt.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { mediaError, bestMime, sizeLabel } from "../recorder.js";

// Ranges, difficulties, score dimensions and the honest-scope footnote all
// come from GET /api/<appKey>/coach/. They differ per instrument — a guitar
// take has no "breath" and a drummer has no vocal range — and keeping a copy
// here would let the chips disagree with what the model was asked to score.
// How long a video take may run. A rap verse is 30-60s and a song section one
// to two minutes, so ninety seconds covers what a Boss Take actually is — the
// coach scores ONE take, not a session.
//
// It is also what keeps a camera take inside the server's size cap without
// relying on the browser honouring a bitrate hint. It does not: a 640x360,
// 900kbps request came back as 1,407.8MB of 1080p at roughly 20Mbps, because
// every constraint below `max` is a preference the encoder may ignore.
const VIDEO_MAX_SECONDS = 90;

// Why a take came back with no score, as one of the server's closed set of
// slugs. Never the sentence the member read: the reason is what decides what
// gets fixed, and free text is how a visitor's own words end up in a table
// that is supposed to hold none.
const failReason = (e) => {
  const status = e?.status;
  // Nobody answered inside the time we are willing to make somebody wait.
  // Counted apart from "network" because the fixes are opposite: a dropped
  // connection is the member's link, an unanswered request is ours. This is
  // the row the 853-second spinner would have written, had anything been able
  // to write one — it wrote nothing, forever, which is why it took a
  // screenshot to find.
  if (e?.timedOut) return "timeout";
  if (!status) return "network";      // fetch never reached us
  if (status >= 500) return "server";
  return "refused";                   // 400/401/403/413/429 — we said no
};

const DIFFICULTY_LABEL = {
  starter: "Starter 🌱", builder: "Builder 🧩",
  performer: "Performer 🌟", stageboss: "Stage Boss 👑",
};



const mmssOf = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const mb = (n) => (n / 1024 / 1024).toFixed(1);

const scoreColor = (n) =>
  n == null ? "text-white/30" : n >= 8 ? "text-emerald-300" : n >= 5 ? "text-mcz-gold" : "text-mcz-ember";

/** What this take costs, stated before it is sent.
 *
 * Red minus for what leaves, green plus for what a free allowance covers —
 * never a bare number, and never only after the fact. */
function Cost({ price, trial }) {
  if (!price) return null;
  // The trial spends nothing the visitor owns — they have no wallet yet. Say
  // that up front too: a free thing whose price is unstated still reads risky.
  if (trial) {
    return <span className="text-[11px] text-emerald-300">Free — no account, nothing to pay</span>;
  }
  if (price.free_today) {
    // NOT "+1 🏷️". Nothing arrives — a take SPENDS one of the day's free
    // prompts. A green plus on something that costs you is the paradigm
    // pointing the wrong way, and it sat under the send button saying the
    // opposite of what the button does.
    return (
      <span className="text-[11px] text-emerald-300">
        Free today <span className="text-white/45">
          — uses 1 of the {price.daily_remaining} 🏷️ you have left
        </span>
      </span>
    );
  }
  const fromPromptz = price.promptz >= price.cost_cents;
  return (
    <span className="text-[11px] text-mcz-ember">
      −{price.cost_cents} 🏷️{" "}
      <span className="text-white/35">
        from your {fromPromptz ? `${price.promptz} PromptZ` : "balance"} — no free prompts left today
      </span>
    </span>
  );
}

/** What a tier buys here: how OFTEN, not whether.
 *
 * Nothing locks a take any more, so there is no wall to explain — but the
 * ladder is still worth showing, because "you've used today's free one" is only
 * half an answer without "a tier up gets five". */
function AllowanceLadder({ price }) {
  const ladder = price?.allowance_ladder;
  if (!ladder?.length || price.free_today) return null;
  return (
    <p className="text-[11px] text-white/35">
      Free takes a day:{" "}
      {ladder.map((r, i) => (
        <span key={r.tier}>
          {i > 0 && " · "}
          <span className={r.tier === price.tier ? "text-mcz-gold" : ""}>
            {r.tier} {r.daily}
          </span>
        </span>
      ))}
      . Past that a take costs {price.cost_cents} 🏷️ at any tier.
    </p>
  );
}

/** Coach Corey, read aloud — the house voice free at every tier, Premium can
 * sample any catalog voice once, StatZ can save a standing choice. Never on
 * the trial: this is a member's own take, on their own account, and the
 * StatZ upsell inside the picker has nothing to say to a visitor who has no
 * tier yet.
 *
 * The text read aloud is assembled client-side from the fields already on
 * screen — nothing new is asked of the server, and it stays under
 * MAX_SPEAK_CHARS by construction (verdict + now + goal + two fixes is
 * nowhere near 2000 characters for any take this coach has ever produced).
 */
function CoachVoicePlayer({ result }) {
  const [voices, setVoices] = useState(null);
  const [chosen, setChosen] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const audioRef = useRef(null);

  useEffect(() => {
    api("/api/economy/coachvoice/").then(setVoices).catch(() => {});
  }, []);

  const text = [
    result.verdict,
    result.now && `Where you're at: ${result.now}`,
    result.goal && `What you're aiming at: ${result.goal}`,
    ...(result.fixes || []).slice(0, 2),
  ].filter(Boolean).join(" ");

  async function play(voiceId) {
    setBusy(true); setErr("");
    try {
      const d = await api("/api/economy/coachvoice/speak/", {
        method: "POST", body: voiceId ? { text, voice: voiceId } : { text },
      });
      const audio = new Audio(`data:${d.mime};base64,${d.audio_b64}`);
      audioRef.current = audio;
      audio.play();
      setVoices((v) => v && { ...v, speak_used_today: d.speak_used_today, speak_remaining: d.speak_remaining });
    } catch (e) {
      setErr(e.message || "Couldn't play that.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDefault() {
    if (!chosen) return;
    try {
      const d = await api("/api/economy/coachvoice/", { method: "PATCH", body: { voice: chosen } });
      setVoices(d);
      setChosen("");
    } catch (e) {
      setErr(e.message || "Couldn't save that.");
    }
  }

  if (!voices || !text) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <button onClick={() => play(chosen || undefined)} disabled={busy}
              className="neon-btn-ghost !w-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
        Hear it — {(voices.voices.find((v) => v.id === (chosen || voices.voice)) || {}).label || "Coach Corey"}
      </button>
      {voices.can_sample && (
        <select className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-white/70"
                value={chosen} onChange={(e) => setChosen(e.target.value)}>
          <option value="">{voices.voices.find((v) => v.id === voices.voice)?.label} (yours)</option>
          {voices.voices.filter((v) => v.id !== voices.voice).map((v) => (
            <option key={v.id} value={v.id}>{v.label} — sample</option>
          ))}
        </select>
      )}
      {!voices.can_sample && (
        <span className="text-white/35">
          Premium can sample other voices; StatZ can save one —{" "}
          <button className="re-link" onClick={() => goToSpot("membershipz")}>upgrade</button>
        </span>
      )}
      {voices.can_choose && chosen && chosen !== voices.voice && (
        <button className="re-link text-[10px]" onClick={saveDefault}>
          save as my coach's voice
        </button>
      )}
      {err && <span className="text-mcz-ember">{err}</span>}
    </div>
  );
}

// `trial` swaps the member coach for the no-account door. Same recorder, same
// rubric, same score chips — the only differences are the endpoint, the price
// line, and what happens after the score.
export default function BossTake({ appKey = "singz", trial = false, onResult, onReady }) {
  const { user } = useAuth();
  const path = trial ? `/api/${appKey}/trial/` : `/api/${appKey}/coach/`;
  const [genre, setGenre] = useState("R&B");
  const [range, setRange] = useState("tenor");
  const [difficulty, setDifficulty] = useState("builder");
  // Have the coach judge the WRITING as well as the performance. Off by
  // default and deliberately so: somebody working on breath control has not
  // asked for their lyrics to be marked, and scoring a member on something
  // they did not submit for scoring is how a coach stops being trusted.
  //
  // Only offered where the server says the coach can do it (`rates_lyrics`) —
  // a drum take has no words, and a toggle a screen cannot honour is the
  // switch that changes nothing.
  const [rateLyrics, setRateLyrics] = useState(false);
  // Have the coach judge the RECORDING as well as the playing. Off by default
  // for the same reason as lyrics, and one more: most takes here are a phone in
  // a bedroom, so a coach that scored production by default would be marking
  // somebody down for their room — a number they could raise by buying an
  // interface rather than by getting better.
  const [rateMix, setRateMix] = useState(false);
  // RapZ picks a style the way SingZ picks a range. The list comes from the
  // server profile, so the coach is judging against the same names the picker
  // offered rather than a second list kept over here.
  const [style, setStyle] = useState("");
  // A post handed over from PostZ. It is a take that is already recorded and
  // already stored, so there is nothing to upload: the coach is given the
  // post's id and reads the file itself. Null the rest of the time.
  const [fromPost, setFromPost] = useState(null);
  // The handed-over recording failed to load. Not the same as "too big" — the
  // file is gone, and the send button must not be the thing that discovers it.
  const [takeGone, setTakeGone] = useState(false);
  const [blob, setBlob] = useState(null);
  // Video takes are scored on delivery and breath as well as sound, so the
  // preview has to be a <video> or the member can't check what they sent.
  const [isVideo, setIsVideo] = useState(false);
  const [takeName, setTakeName] = useState("take.webm");
  const [url, setUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  // Bytes recorded so far. Hints can be ignored; bytes cannot — this is what
  // the size stop actually reads, and what the member watches climb.
  const [bytes, setBytes] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");
  // Why the recorder stopped itself, when it did. Kept apart from `msg`: an
  // auto-stop is not an error — the take is good, it just ended on its own, and
  // dressing it in the red warning box would read as a failure.
  const [stopNote, setStopNote] = useState("");
  // Show upgrade prompt when upload limit is hit
  const [showUploadLimitPrompt, setShowUploadLimitPrompt] = useState(false);
  // What this take costs, read BEFORE anything is sent. A price you only see
  // in the response is a bill, not a price.
  const [price, setPrice] = useState(null);
  const [scoringElapsed, setScoringElapsed] = useState(0);
  // Bytes on the wire: { loaded, total, pct, bytesPerSecond, etaSeconds, done }
  // while the take uploads, null once the server has it. Only the multipart
  // path can produce this — a take handed over from PostZ is already stored,
  // so there is nothing to send and nothing to measure.
  const [upload, setUpload] = useState(null);
  // Why the last send came back with nothing, or "". Separate from `msg`
  // because a visitor at the trial door needs the way FORWARD, and a red line
  // is not one — see the card below.
  // The whole failure, not a label for it: {why, status, data}. The server
  // says something specific on every one of these — which cap, which cause —
  // and a card that keeps only a category throws that away.
  const [failed, setFailed] = useState(null);
  const rec = useRef(null);
  const chunks = useRef([]);
  const fileInput = useRef(null);
  // WHAT THE MICROPHONE IS ACTUALLY SENDING, while it is being sent.
  //
  // "The microphone was open but captured nothing" names three possible causes
  // — muted input, wrong device, or a take too short to encode — and cannot
  // say which. That is the exact fault the recorder audit was about: every
  // failure reported a cause that was not the cause. Bytes arriving is not the
  // same question as sound arriving, either: a muted input still produces a
  // perfectly valid file full of silence, which the coach then refuses with a
  // 502 after the visitor has already spent their one free take.
  //
  // So the level is measured off the live stream and shown while recording. A
  // meter that never moves is the member's answer before they finish
  // performing, not ours afterwards.
  const meter = useRef(null);         // {ctx, analyser, raf, peak, source}
  const [level, setLevel] = useState(0);      // 0-1, right now
  const [heard, setHeard] = useState(false);  // did it ever cross the floor
  // The device the browser actually opened. When somebody has three inputs and
  // the browser picked the HDMI one, this is the only thing on screen that
  // says so.
  const [inputName, setInputName] = useState("");
  // Whether the take now running came from the camera. A ref, not state,
  // because the size stop reads it from inside the recorder's own callback.
  const videoRec = useRef(false);
  // The live camera, while it is recording. Without it a video take is
  // recorded blind: you cannot tell whether you are in frame, whether the
  // light is usable, or — before the facingMode fix above — that you were
  // pointing the wrong camera at the ceiling. A recorder you cannot see
  // yourself in is one people press once.
  const preview = useRef(null);
  const [previewOn, setPreviewOn] = useState(false);

  /** One step of the JOIN funnel, from the trial door only.
   *
   * Trial-only because that is what the funnel measures — a member's recorder
   * is not a step on the way to having an account, and counting both would
   * put K-Oth's own takes in the number that says whether strangers get a
   * score. The kinds are the server's closed set (FUNNEL_KINDS); anything
   * else is dropped with a 400 and measures nothing, which is exactly what
   * happened to the four `boss_take_*` names this replaced. */
  function step(kind, meta = {}) {
    if (!trial) return;
    try {
      track(kind, { app_key: appKey, ...meta });
    } catch {
      // Belt and braces, and earned: the calls this replaced sat OUTSIDE the
      // try blocks around them, so one bad line in the measurement took the
      // recorder down with it. `track` guards itself, but the guard that
      // matters is the one between a measurement and the feature it measures
      // — and it belongs here, once, rather than at six call sites.
    }
  }

  // The size ceiling, in bytes, as published by the server. One copy of the
  // number, on the server, where the transport that imposes it lives.
  const capBytes = price?.max_mb ? price.max_mb * 1024 * 1024 : 0;
  // The longest the server will now let a take run before it gives up and
  // says so. From the server, because a ceiling the screen invented would be
  // the second place that number lives — and the whole point of showing it is
  // that it is the real one.
  const coachCeiling = price?.coach_budget_seconds || 0;

  useEffect(() => {
    // The trial's "one free take each" is counted per BROWSER now, not per IP
    // address — a carrier's shared CGNAT address meant one stranger spent the
    // take for everybody behind it. The server needs the same id the funnel
    // uses, on the GET as well as the POST, or the door reports availability
    // it will not honour a moment later.
    api(trial ? `${path}?anon_id=${encodeURIComponent(anonId())}` : path, { auth: !trial })
      .then((p) => {
        setPrice(p);
        onReady?.();
      })
      .catch(() => {
        onReady?.();
      });
  }, [path, trial, onReady]);

  // A post arriving from PostZ. The trial door is for people with no account
  // and therefore no posts, so it never listens.
  useEffect(() => {
    if (trial) return undefined;
    return onHandoff(appKey, (h) => {
      // A post, or a page of the member's own diary — a voice note kept in
      // JournalZ is a take like any other, and it is already stored, so it
      // rides as an id exactly like a post does.
      if (!((h?.kind === "post" && h.post_id)
            || (h?.kind === "journal" && h.journal_id))) return;
      setFromPost(h);
      setTakeGone(false);
      setResult(null);
      setMsg("");
      setStopNote("");
      // The post already says what it is. Its genre seeds the picker so the
      // coach isn't asked to score a Drill verse as "unspecified" — the member
      // can still change it before sending.
      if (h.genre) setGenre(h.genre);
    });
  }, [appKey, trial]);

  // Object URLs must be revoked or every take leaks for the life of the page.
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  // Stop on time — video only. Audio at speech bitrates needs a quarter of an
  // hour to reach the size cap, and a song section can legitimately run long;
  // the size stop covers it without putting a clock on singing.
  useEffect(() => {
    if (recording && videoRec.current && secs >= VIDEO_MAX_SECONDS) {
      stopRec(`Stopped at ${VIDEO_MAX_SECONDS} seconds — that's a full Boss Take. Send it, or record another.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, secs]);

  // Track elapsed time while scoring is in progress
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setScoringElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  function attach(b, name, video = false, recorded = false) {
    // Checked here rather than on submit, because the server sends the take to
    // a model that caps the whole request — an oversize take fails upstream and
    // comes back as "the coach couldn't process that", which blames the take
    // instead of the size. Say it before the upload, not after.
    const capMb = price?.max_mb;
    if (capMb && b.size > capMb * 1024 * 1024) {
      // The server says WHOSE limit this is, because it can now be either: the
      // coach's own judgement about what one take is, or this member's tier
      // upload limit when that binds first. Reading a StatZ member's refusal as
      // their tier's is how somebody concludes the plan they paid for is being
      // ignored — and telling a Free member it ISN'T their tier when it is, is
      // the same lie pointing the other way. Fall back only for an old server.
      setMsg(`That take is ${(b.size / 1024 / 1024).toFixed(1)}MB — keep it under ${capMb}MB. `
        + (price?.max_mb_why
           || "Trim it to the section you want scored, or record video at a shorter length."));
      setShowUploadLimitPrompt(true);
      step("try_failed", { why: "too_big" });
      setFailed({ why: "too_big", status: 0, data: {} });
      return;
    }
    if (url) URL.revokeObjectURL(url);
    // Keep the filename in state rather than assigning onto the Blob: File.name
    // is a read-only getter, so Object.assign threw and swallowed the attach.
    setBlob(b);
    // A fresh take replaces the handed-over post. Both loaded at once would
    // leave the Send button ambiguous about which one it is spending on.
    setFromPost(null); setTakeGone(false);
    setIsVideo(video || (b.type || "").startsWith("video/"));
    setTakeName(name || b.name || (video ? "take-video.webm" : "take.webm"));
    setUrl(URL.createObjectURL(b));
    setResult(null);
    setMsg("");
    if (!recorded) step("try_attach");
  }

  // Anything above this counts as "the input is live". It is deliberately
  // low — a fifth of a percent of full scale — because the job is telling
  // SILENCE from SOUND, not judging whether somebody sang loudly enough. Room
  // tone from a working microphone clears it easily; a muted input does not
  // clear it at all.
  const SILENCE_FLOOR = 0.002;

  function startMeter(stream) {
    // Best-effort, and nothing downstream depends on it. If WebAudio is
    // unavailable or the context will not start, the meter simply never
    // reports — which leaves the recorder exactly as it was, rather than
    // making a claim about the take from a measurement that did not run.
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      // NOT connected to ctx.destination, deliberately: that would play the
      // member's own microphone back through their speakers, which is
      // feedback in a room with no headphones.
      const buf = new Float32Array(analyser.fftSize);
      const state = { ctx, analyser, source, raf: 0, peak: 0 };
      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        state.peak = Math.max(state.peak, rms);
        setLevel(rms);
        if (rms > SILENCE_FLOOR) setHeard(true);
        state.raf = requestAnimationFrame(tick);
      };
      state.raf = requestAnimationFrame(tick);
      meter.current = state;
    } catch {
      meter.current = null;
    }
  }

  function stopMeter() {
    const m = meter.current;
    meter.current = null;
    setLevel(0);
    if (!m) return null;
    try { cancelAnimationFrame(m.raf); } catch { /* nothing to cancel */ }
    try { m.source.disconnect(); } catch { /* already gone */ }
    // `running` is the only state a reading can be trusted from. A context the
    // autoplay policy left suspended produces a flat line that looks exactly
    // like a muted microphone, and reporting that as silence would be this
    // recorder's oldest bug wearing a new hat.
    const ran = m.ctx.state === "running";
    try { m.ctx.close(); } catch { /* already closed */ }
    return ran ? m.peak : null;
  }

  async function startRec(video = false, relaxed = false) {
    setMsg(""); setStopNote("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      // The usual cause is not the browser. `mediaDevices` is undefined on any
      // origin that isn't https (or localhost), and "this browser can't
      // record" sends somebody to install a different browser to fix a URL.
      if (typeof window !== "undefined" && window.isSecureContext === false) {
        step("try_mic_denied", { video, why: "insecure" });
        return setMsg("Recording needs a secure (https) connection — this page isn't on one. "
          + "Upload a clip instead and the coach scores it the same.");
      }
      step("try_mic_denied", { video, why: "other" });
      return setMsg("This browser can't record. Upload a clip instead — it scores the same.");
    }
    if (!relaxed) step("try_record", { video });
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        relaxed ? { audio: true, ...(video ? { video: true } : {}) } :
        video
          // `max`, not bare values. A bare `width: 640` is an IDEAL the camera
          // may overshoot, and overshoot it did — straight to 1080p.
          ? { audio: true,
              video: { width: { max: 854 }, height: { max: 480 },
                       frameRate: { max: 30 },
                       // THE FRONT CAMERA. With no facingMode a phone hands
                       // back the BACK camera, so a member who pressed
                       // "record on camera" to sing was filming the ceiling —
                       // and with no preview (below) there was nothing on
                       // screen to tell them. That is most of what "the camera
                       // doesn't work" actually was.
                       //
                       // `ideal`, never `exact`: exact fails outright on a
                       // laptop with one camera, which would turn a wrong
                       // camera into no camera.
                       facingMode: { ideal: "user" } } }
          : { audio: true });
      chunks.current = [];
      setBytes(0);
      videoRec.current = video;
      setHeard(false);
      setLevel(0);
      const audioTrack = stream.getAudioTracks()[0];
      // Held as a local as well as in state. `onstop` closes over the values
      // that existed when `startRec` ran, so reading `inputName` in there
      // would always give the PREVIOUS take's device — a stale closure is how
      // a message that exists to name the right cause ends up naming the
      // wrong one, which is the whole fault being fixed here.
      const label = audioTrack?.label || "";
      setInputName(label);
      // `muted` on a track means the SOURCE is delivering nothing — the
      // browser's own word for it, not a guess. Known before the member
      // performs, so it is said before rather than after.
      if (audioTrack && audioTrack.muted) {
        stream.getTracks().forEach((t) => t.stop());
        setPreviewOn(false);
        step("try_failed", { why: "empty" });
        return setMsg(`"${audioTrack.label || "That input"}" is open but sending no audio — `
          + "it's muted at the device or the operating system. Unmute it, pick a "
          + "different input, or upload a clip instead.");
      }
      startMeter(stream);
      if (video) {
        setPreviewOn(true);
        // Attached after the element mounts. `muted` is not cosmetic: an
        // unmuted preview plays the member's own microphone back through
        // their speakers, which is feedback in a room without headphones —
        // the same reason the level meter never connects to the destination.
        setTimeout(() => {
          if (preview.current) {
            preview.current.srcObject = stream;
            preview.current.play?.().catch(() => { /* autoplay policy; the
              frame still shows, and this is a preview rather than playback */ });
          }
        }, 0);
      }
      // Same reason: `secs` in `onstop` would be whatever it was at the moment
      // recording started, which is zero.
      const startedAt = Date.now();
      // Ask for a modest bitrate on video so a minute of take lands inside the
      // size cap. This is a HINT and phones ignore it — the byte count below is
      // what actually holds the line.
      const mimeType = bestMime(video);
      const mr = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        ...(video ? { videoBitsPerSecond: 900_000 } : { audioBitsPerSecond: 96_000 }),
      });
      // The stop that can't be argued with. A timeslice makes the recorder hand
      // over a chunk every second instead of one blob at the end, so we can
      // total the real bytes as they arrive and stop at the published cap —
      // whatever the browser decided to do with resolution, codec or bitrate.
      mr.ondataavailable = (e) => {
        if (!e.data.size) return;
        chunks.current.push(e.data);
        const total = chunks.current.reduce((n, c) => n + c.size, 0);
        setBytes(total);
        // Stop BELOW the cap, not at it. stop() flushes one more chunk, so
        // leaving room for two seconds of the heaviest second seen so far keeps
        // the finished take inside the limit — otherwise the size stop would
        // hand attach() a file attach() then refuses, losing the take twice.
        const headroom = 2 * chunks.current.reduce((n, c) => Math.max(n, c.size), 0);
        if (capBytes && total + headroom >= capBytes) {
          stopRec(`Stopped near ${price.max_mb}MB — that's as much as the coach can take in one go. `
            + "It's still a take: send it, or record a shorter one.");
        }
      };
      mr.onerror = (e) => {
        setMsg(`The recorder stopped with an error (${e?.error?.name || "unknown"}). `
          + "Upload a clip instead — it scores the same.");
        step("try_failed", { why: "empty" });
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setPreviewOn(false);
        if (preview.current) preview.current.srcObject = null;
        // null means the meter never ran, so it gets no opinion. A reading of
        // 0 from a context that DID run is a fact.
        const peak = stopMeter();
        const named = label ? `"${label}"` : (video ? "The camera" : "The microphone");
        const held = (Date.now() - startedAt) / 1000;
        // ...and a take too short for the analyser to have sampled anything is
        // not evidence either. Verified in a browser rather than reasoned
        // about: a 300ms take of a REAL tone came back reading zero peak and
        // was reported as silent, which is this recorder's oldest bug — a
        // message naming a cause that was not the cause — reintroduced by the
        // thing written to end it. Below the floor, the meter says nothing.
        const MEASURABLE_AFTER = 1.5;
        const silent = peak !== null && peak <= SILENCE_FLOOR && held >= MEASURABLE_AFTER;
        // A take with no bytes in it is not a take.
        //
        // This attached whatever it had, including nothing — which is exactly
        // what a 0:00 / 0:00 player is: an empty Blob wearing a filename. The
        // send then uploaded zero bytes, the coach answered 502, and it cost
        // the visitor their one free take to find out. Refuse it here, where
        // the reason is still knowable.
        const total = chunks.current.reduce((n, c) => n + c.size, 0);
        if (!total) {
          setRecording(false);
          step("try_failed", { why: "empty" });
          // Three different causes, and until the meter existed this line had
          // to list all three and let the member guess. Now it can say which.
          if (held < 2) {
            return setMsg("That was too short for the recorder to produce anything — "
              + "it writes the file in one-second pieces. Hold it for a few seconds; "
              + "eight is enough to score.");
          }
          if (silent) {
            return setMsg(`${named} was open and never heard a sound — the level meter `
              + "stayed flat the whole way through. It's muted, or the browser is on a "
              + "different input than you think. Pick another input, or upload a clip.");
          }
          return setMsg(`${named} was open but the recorder produced no file. `
            + "That's the browser rather than your input — upload a clip instead, "
            + "it scores the same.");
        }
        // Bytes without sound. A muted input still produces a perfectly valid
        // file full of silence, and sending it costs a free take to be told
        // the audio was silent. Said here, where the take is still in hand:
        // it is attached either way, because a meter that got it wrong must
        // not be the reason somebody loses a performance.
        if (silent) {
          setStopNote(`Recorded, but ${named} never rose above silence for the whole take. `
            + "If that's not right, check the input and record again — the coach can't "
            + "score a silent file.");
        }
        // Keep the recorder's own mime — the server normalises it — but give
        // the file an extension that matches, so an attached-file round trip
        // and a recorded one look the same to everything downstream.
        const type = mr.mimeType || (video ? "video/webm" : "audio/webm");
        const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : "webm";
        attach(new Blob(chunks.current, { type }),
               `${video ? "take-video" : "take"}.${ext}`, video, true);
      };
      rec.current = mr;
      // One chunk a second. Without a timeslice the recorder holds everything
      // until stop(), and the first time we'd learn a take was 1.4GB is after
      // it was performed.
      mr.start(1000);
      setSecs(0);
      setRecording(true);
      playSound("record_start");
    } catch (err) {
      const { why, msg: line, retry } = mediaError(err, video);
      // Our constraints were impossible on this device. That is ours to fix,
      // not something to hand the member as a refusal — one retry with plain
      // settings, then whatever it says the second time is real.
      if (retry && !relaxed) {
        setMsg(line);
        return startRec(video, true);
      }
      step("try_mic_denied", { video, why });
      setMsg(line);
    }
  }

  // `note` is set when the recorder stopped ITSELF — on time or on size. A
  // member pressing Stop gets no note; they know why it stopped.
  function stopRec(note = "") {
    if (rec.current?.state !== "recording") return;
    rec.current.stop();
    setRecording(false);
    playSound("record_stop");
    if (note) setStopNote(note);
  }

  function discard() {
    if (url) URL.revokeObjectURL(url);
    setBlob(null); setIsVideo(false); setUrl(""); setResult(null); setMsg(""); setSecs(0);
    setBytes(0); setStopNote(""); setShowUploadLimitPrompt(false); setFailed(null);
  }

  async function submit() {
    if (!blob && !fromPost) return;
    // An empty file is a round trip that can only fail, and on the trial door
    // it costs the visitor the one free take they came for. The recorder
    // refuses to attach a 0-byte take now; this catches the same shape
    // arriving from a file picker.
    if (blob && !blob.size) {
      step("try_failed", { why: "empty" });
      setFailed({ why: "empty", status: 0, data: {} });
      return setMsg("That file is empty — there's no audio in it to score. "
        + "Record again, or pick a different clip.");
    }
    setBusy(true); setScoringElapsed(0); setUpload(null); setMsg(""); setResult(null); setFailed(null);
    step("try_send");
    try {
      // A handed-over post is already stored, so it rides as its id. Uploading
      // the same file a second time to have it coached is the dead end this
      // handoff exists to remove — and it would spend the member's storage
      // quota on a duplicate of a track they already posted.
      const body = fromPost
        ? { ...(fromPost.kind === "journal"
              ? { journal_id: fromPost.journal_id }
              : { post_id: fromPost.post_id }),
            genre, range, difficulty, ...(style ? { style } : {}),
            // A take handed over from PostZ takes the toggle too. It was
            // missing here while the upload path had it, which is the quiet
            // half of a feature: the control renders on both screens and only
            // one of them honours it.
            ...(rateLyrics && price?.rates_lyrics ? { rate_lyrics: "1" } : {}),
            ...(rateMix && price?.rates_mix ? { rate_mix: "1" } : {}) }
        : (() => {
            const f = new FormData();
            f.append("take", blob, takeName);
            f.append("genre", genre);
            f.append("range", range);
            f.append("difficulty", difficulty);
            if (style) f.append("style", style);
            if (rateLyrics && price?.rates_lyrics) f.append("rate_lyrics", "1");
            if (rateMix && price?.rates_mix) f.append("rate_mix", "1");
            // Same id as the GET above, and as the funnel's. Blank in a
            // private window, which the server reads as "unknown" rather than
            // as a visitor who has already been here.
            if (trial) f.append("anon_id", anonId());
            return f;
          })();
      const out = await api(path, {
        method: "POST", body, auth: !trial,
        // Only a FormData body has bytes to report. A handed-over post is
        // already on the server, so `api` ignores this and the panel falls
        // straight through to the scoring phase, which is correct.
        onProgress: setUpload,
      });
      setResult(out);
      if (out?.score == null) {
        step("try_failed", { why: "empty" });
        setFailed({ why: "empty", status: 200, data: {} });
      }
      else step("try_scored");
      // The score landing is the moment worth hearing. The prompt it spent
      // is announced separately, and only when one was actually spent — a
      // take covered by the day's free allowance costs nothing, and saying
      // otherwise in audio would be the same lie as saying it on screen.
      playSound("xp_gain");
      if (!trial && out?.cost_cents) playSound("promptz_spend");
      onResult?.(out);
    } catch (e) {
      setMsg(e.message || "The coach couldn't take that one.");
      setFailed({ why: failReason(e), status: e?.status, data: e?.data || {} });
      playSound("error");
      step("try_failed", { why: failReason(e) });
    } finally { setBusy(false); }
  }

  // Measured in PostZ and carried over. Zero means nobody measured it, which
  // is not the same as "it fits" — the send is allowed and the server still
  // holds the wall.
  const postTooBig = !!(fromPost?.take_bytes && fromPost?.max_bytes
                        && fromPost.take_bytes > fromPost.max_bytes);
  // Either way the post can't be sent, so the recorder below is the way out
  // and must not look like the dimmed path.
  const postUnsendable = postTooBig || takeGone;

  /** Put the post back down. The recorder is free again, and the post is
   *  still in PostZ — nothing was consumed by looking at it here. */
  function dropPost() {
    setFromPost(null); setTakeGone(false); setResult(null); setMsg("");
  }

  const mmss = mmssOf(secs);

  // Whether this visitor can have a take AT ALL, answered before they perform
  // one.
  //
  // `available`, `already_used`, `configured` and `cap_reached` have been in
  // GET /api/<key>/trial/ the whole time and nothing has ever read them. So
  // the door showed a stranger a recorder, let them do a take, and refused it
  // on Send — the cost/gain rule broken the most expensive way there is,
  // because the thing they spent was a performance. `price` null means the
  // fetch failed, and a failed fetch is not a refusal: nothing is blocked.
  const blocked = trial && price && price.available === false;
  const blockedNote = !blocked ? "" : !price.configured
    ? "The coach isn't switched on right now. That's our end, not yours — nothing here will fix it, so don't spend a take on it."
    : price.already_used
      ? `You've already had a free take ${price.per_address ? `(${price.per_address})` : "today"}. An account gets you more, every day.`
      // Never phrased as something they did. The per-address ceiling was ONE
      // for most of this app's life, so a mobile carrier's shared address
      // meant a stranger spent the take and the next visitor got told they
      // had used theirs — a false accusation on the one screen a stranger
      // ever sees, and unanswerable, because there is nothing they can do
      // about somebody else's phone.
      : price.address_busy
        ? "This network has already used today's free takes — that's the connection you're on, not you. Common on mobile data, where thousands of phones share one address. An account gets you the coach on any connection."
        : price.cap_reached
          ? "Today's free takes are all spoken for — they're capped so we can keep giving them away. Tomorrow, or make an account now."
          : "The free take isn't available right now.";

  // A shut door is a funnel step. `blocked` hides EVERY control — upload, mic
  // and camera all vanish — so a visitor who was refused and one who looked
  // and left produce the same two rows: a try_view and nothing after it. 18
  // opened the trial and 1 started the recorder, and nothing could say which
  // of those the other 17 were; they need opposite fixes.
  //
  // Fired once per mount, from the state that actually drove the render, so
  // it can never disagree with what the visitor was shown.
  const toldNo = useRef(false);
  useEffect(() => {
    if (!blocked || toldNo.current) return;
    toldNo.current = true;
    step("try_blocked", {
      why: !price.configured ? "not_configured"
        : price.already_used ? "already_used"
        // Ordered above cap_reached because it is the narrower claim, and
        // below already_used because a visitor who really has had their take
        // should be told that rather than blamed on their network.
        : price.address_busy ? "address_busy"
        : price.cap_reached ? "cap_reached"
        : undefined,
    });
  }, [blocked, price]);

  return (
    <div className="neon-frame space-y-4 p-4">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
          👑 Boss Take — {price?.label || "AI"} Coach
        </p>
        <p className="mt-1 text-[11px] text-white/45">
          Record one take — mic or camera — or upload audio or video, and have it scored. You'll get what
          actually worked, what to fix, and a drill to run before the next one. On camera the coach can
          mark delivery and breath too.
        </p>
        {/* The ceiling, before the button that hits it. A limit you discover by
            reaching it costs you the take you already performed. */}
        <p className="mt-1 text-[11px] text-white/35">
          Video takes run up to {VIDEO_MAX_SECONDS} seconds — one verse or one section, which is what the
          coach scores. Audio can run longer{price?.max_mb ? `, up to ${price.max_mb}MB` : ""}; either way
          the recorder stops itself before the take gets too big to send.
        </p>
        {/* When the member's own tier is what's holding the ceiling down, say
            what a tier up would actually buy here — the same "frequency, not
            access" upsell the allowance ladder makes, about size instead. */}
        {price?.max_mb_is_tier_limit && price?.coach_max_mb > price?.max_mb && (
          <p className="mt-1 text-[11px] text-white/35">
            {price.max_mb}MB is your tier's upload limit. The coach itself takes up to{" "}
            <span className="text-mcz-gold">{price.coach_max_mb}MB</span> —{" "}
            <button type="button" onClick={() => goToSpot("membershipz")}
                    className="text-mcz-cyan hover:underline">
              a tier up gets you there
            </button>.
          </p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-[11px] text-white/50">
          Genre
          <select value={genre} onChange={(e) => setGenre(e.target.value)} className="neon-input !py-2 text-xs">
            {GENRE_GROUPS.map((grp) => (
              <optgroup key={grp.key} label={`${grp.emoji} ${grp.label}`}>
                {grp.genres.map(([name, emoji]) => (
                  <option key={name} value={name}>{name} {emoji}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {price?.range_label && (
          <label className="text-[11px] text-white/50">
            {price.range_label}
            <select value={range} onChange={(e) => setRange(e.target.value)} className="neon-input !py-2 text-xs">
              {(price.ranges || []).map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </label>
        )}
        {price?.style_label && (
          <label className="text-[11px] text-white/50">
            {price.style_label}
            <select value={style} onChange={(e) => setStyle(e.target.value)} className="neon-input !py-2 text-xs">
              <option value="">Any</option>
              {(price.styles || []).map((v) => <option key={v.key} value={v.label}>{v.label}</option>)}
            </select>
          </label>
        )}
        <label className="text-[11px] text-white/50">
          Difficulty
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="neon-input !py-2 text-xs">
            {(price?.difficulties || ["starter", "builder", "performer", "stageboss"])
              .map((v) => <option key={v} value={v}>{DIFFICULTY_LABEL[v] || v}</option>)}
          </select>
        </label>
      </div>

      {/* The server says whether this coach has words to read. Rendering it
          off a hardcoded ["singz","rapz"] would be the two-door TrialTake
          mistake again — a list in the client that the backend has already
          moved past. */}
      {price?.rates_lyrics && (
        <label className="flex cursor-pointer items-start gap-2 text-[11px] text-white/60">
          <input type="checkbox" checked={rateLyrics}
                 onChange={(e) => setRateLyrics(e.target.checked)}
                 className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-mcz-cyan" />
          <span>
            Rate my lyrics too
            <span className="block text-white/35">
              Scores{" "}
              {Object.values(price.lyric_scores || {}).join(", ").toLowerCase()
                || "rhyme scheme, punchlines, story, imagery and freshness"}
              {" "}— weighted by the style you picked, so a dimension that style
              isn't asking for reads "—" rather than a low mark. It judges the
              craft, not what you're talking about, and if the words aren't clear
              enough to catch it says so instead of guessing.
            </span>
          </span>
        </label>
      )}

      {/* The other half of "score the performance, not the mix". The coach is
          told to ignore production unless this is on, so this is the only way
          to hear about it — and it stays off by default because a phone
          recording of a great take is still a great take. */}
      {price?.rates_mix && (
        <label className="flex cursor-pointer items-start gap-2 text-[11px] text-white/60">
          <input type="checkbox" checked={rateMix}
                 onChange={(e) => setRateMix(e.target.checked)}
                 className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-mcz-cyan" />
          <span>
            Rate my mix too
            <span className="block text-white/35">
              Scores{" "}
              {Object.values(price.mix_scores || {}).join(", ").toLowerCase()
                || "balance, low end, space and level"}
              {" "}— the recording judged as a recording. Leave it off and
              production is ignored entirely: room noise and a phone mic never
              pull your performance scores down either way. It rates the mix you
              made, never the gear you used.
            </span>
          </span>
        </label>
      )}

      {/* A post arrived from PostZ. It IS the take — there is nothing to record
          and nothing to upload, so the recorder steps aside and the only thing
          left is the price and the button that spends it. */}
      {fromPost && !recording && (
        <div className="space-y-2 rounded-lg border border-mcz-gold/30 bg-mcz-gold/[0.05] p-3">
          <p className="text-[11px] uppercase tracking-widest text-mcz-gold/90">
            {fromPost.kind === "journal" ? "📔 From your journal" : "🎧 From PostZ"}
          </p>
          <p className="text-[13px] font-semibold text-white">{fromPost.title}</p>
          <p className="text-[11px] text-white/45">
            {fromPost.kind === "journal"
              ? fromPost.day
              : `by @${fromPost.author}`}
            {fromPost.genre ? ` · ${fromPost.genre}` : ""}
            {fromPost.coach_kind ? ` · the ${fromPost.coach_kind} on it` : ""}
          </p>
          {fromPost.kind === "journal" && (
            <p className="text-[11px] text-white/45">
              The entry stays private — sending a take to the coach publishes nothing.
            </p>
          )}
          {/* The player is the first thing that knows whether the recording is
              actually there. A take that 404s shows 0:00 / 0:00 and says
              nothing — and the send button then spends a press to find out.
              `onError` is that answer, for free, before the button. */}
          {fromPost.coach_kind === "video" && fromPost.video_url
            ? <video src={fromPost.video_url} controls playsInline className="w-full rounded-lg"
                     onError={() => setTakeGone(true)} />
            : fromPost.audio_url
              ? <audio src={fromPost.audio_url} controls className="w-full"
                       onError={() => setTakeGone(true)} />
              : null}
          {/* The ceiling, before the button that would hit it. The row in PostZ
              says this too — this is the second line of defence, for a card
              rendered before anyone measured the file. */}
          {takeGone ? (
            <p className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[11px] leading-relaxed text-mcz-ember">
              This recording won't load — it isn't on the server any more, so there's nothing
              for the coach to listen to. Nothing was charged. Record or attach the take below
              and it'll be scored.
            </p>
          ) : postTooBig ? (
            <p className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[11px] leading-relaxed text-mcz-ember">
              This {fromPost.coach_kind || "take"} is {mb(fromPost.take_bytes)}MB and the coach reads
              one in a single request that caps out near {mb(fromPost.max_bytes)}MB. It isn't your
              tier's upload limit — the post keeps the full track. Record or attach just the section
              you want scored, below.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button className="neon-btn-primary !w-auto px-5" onClick={submit} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" size={15} /> : <Play size={15} />}
                {busy ? "Coaching this post…" : "Send this post to the coach"}
              </button>
              <Cost price={price} trial={trial} />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <button className="re-link" onClick={dropPost}>
              Record a fresh take instead
            </button>
            <button className="re-link" onClick={() => goToSpot("postz", "feed")}>
              Back to the post
            </button>
          </div>
          <p className="text-[11px] text-white/35">
            Nothing is uploaded again — the coach reads the take already on the
            post. A take it can't read isn't charged.
          </p>
        </div>
      )}

      {/* Order matters at the trial door, and only there.
          A visitor's first move is the browser's mic dialog — a permission
          prompt, from a site they have never heard of, usually on a phone,
          before they have been given anything. Leading with a file they
          already have skips the one step nobody has to say yes to; the mic
          stays right beside it for whoever would rather sing now. A member is
          already past that, so their recorder keeps the order it had. */}
      {/* Stated before the recorder, not after the performance. */}
      {blocked && (
        <div className="space-y-2 rounded-xl border border-mcz-gold/30 bg-mcz-gold/[0.07] p-4">
          <p className="text-[12px] font-semibold text-white">No free take right now</p>
          <p className="text-[11px] leading-relaxed text-white/70">{blockedNote}</p>
          {/* An account is the honest answer to both of the caps. It is not
              the answer to our own outage, so it isn't offered for that one. */}
          {price.configured && (
            <Link to="/register" className="re-btn re-btn-emerald !w-auto px-4">
              Make a free account
            </Link>
          )}
        </div>
      )}

      <div className={`flex flex-wrap items-center gap-2 ${blocked ? "hidden" : ""} ${fromPost && !postUnsendable && !recording ? "opacity-60" : ""}`}>
        <input ref={fileInput} type="file" accept="audio/*,video/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { setStopNote(""); attach(f, f.name); playSound((f.type || "").startsWith("video/") ? "upload_video" : "upload_audio"); } }} />
        {trial && !recording && (
          <button className="neon-btn-primary !w-auto px-5" onClick={() => fileInput.current?.click()} disabled={busy}>
            <Upload size={15} /> Upload a clip
          </button>
        )}
        {!recording ? (
          <>
            <button className="re-btn re-btn-cyan !w-auto px-4" onClick={() => startRec(false)} disabled={busy}
                    data-tour="bosstake-mic">
              <Mic size={15} /> {blob ? "Record again" : trial ? "Or record one now" : "Record a take"}
            </button>
            {/* The coach watches as well as listens. On camera it can mark
                delivery, breath and posture, which sound alone can't show. */}
            <button className="re-btn re-btn-pink !w-auto px-4" onClick={() => startRec(true)} disabled={busy}
                    data-tour="bosstake-camera" title="Record with camera — the coach scores delivery too">
              <Video size={15} /> Record on camera
            </button>
          </>
        ) : (
          <button className="neon-btn-primary !w-auto px-4" onClick={() => stopRec()}>
            <Square size={14} /> Stop · {mmss}
          </button>
        )}
        {!trial && (
          <button className="re-btn re-btn-emerald !w-auto px-4" onClick={() => fileInput.current?.click()} disabled={busy || recording}>
            <Upload size={15} /> Attach audio or video
          </button>
        )}
        {blob && !recording && (
          <button className="re-btn !w-auto px-3 !text-red-300" onClick={discard} disabled={busy}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {trial && !blocked && !blob && !recording && (
        <p className="text-[11px] text-white/40">
          Eight seconds is enough to score. A voice note you already have works —
          nothing to install, nothing to allow.
        </p>
      )}

      {/* The camera, live, while it rolls. Mirrored, because a selfie preview
          that is not mirrored reads as somebody else's face and people
          instinctively correct the wrong way — the RECORDING is not mirrored,
          only what they watch. */}
      {previewOn && recording && (
        <video ref={preview} muted playsInline autoPlay
               className="w-full -scale-x-100 rounded-lg border border-mcz-ember/30" />
      )}

      {recording && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-2 text-[11px] text-mcz-ember">
            <span className="h-2 w-2 animate-pulse rounded-full bg-mcz-ember" />
            Recording — {mmss}
            {videoRec.current && ` / ${mmssOf(VIDEO_MAX_SECONDS)}`}
            {bytes > 0 && ` · ${mb(bytes)}MB${price?.max_mb ? ` of ${price.max_mb}MB` : ""}`}
          </p>
          {/* The live input level, and the device it is coming from.
              Bytes ticking up says the recorder is writing; it says nothing
              about whether anything is being recorded INTO it. A muted mic
              produces a perfectly good file full of silence, and until this
              bar existed the first anyone knew was a 502 after the take was
              over — which on the trial door costs the visitor the one free
              take they came for. A bar that never moves is the answer while
              there is still time to do something about it.

              `Math.min(1, level * 8)` is a display scale, not a measurement:
              speech RMS sits around 0.05-0.15, so an unscaled bar would look
              broken at normal volume. */}
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-[width] duration-75 ${
                  heard ? "bg-emerald-400" : "bg-white/25"}`}
                style={{ width: `${Math.min(100, level * 800)}%` }}
              />
            </div>
            <span className="shrink-0 text-[10px] text-white/40">
              {heard ? "input live" : "no sound yet"}
            </span>
          </div>
          {!heard && secs >= 3 && (
            <p className="text-[11px] text-mcz-ember">
              Nothing has reached {inputName ? `"${inputName}"` : "the microphone"} in {secs}s.
              Stop, check the input isn't muted, or upload a clip instead — the coach
              can't score silence.
            </p>
          )}
          {heard && inputName && (
            <p className="text-[10px] text-white/35">Input: {inputName}</p>
          )}
        </div>
      )}

      {/* The recorder stopped itself. Said plainly, in its own line, because
          the take is fine — this is information, not a warning. */}
      {stopNote && !recording && (
        <p className="rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/5 px-3 py-2 text-[11px] text-white/70">
          {stopNote}
        </p>
      )}

      {url && !recording && (
        <div className="space-y-2">
          {isVideo
            ? <video src={url} controls playsInline className="w-full rounded-lg" />
            : <audio src={url} controls className="w-full" />}
          {/* What is actually in the take, measured by us.
              The player says 0:00 / 0:00 on a perfectly good recording,
              every time: a MediaRecorder WebM carries no Duration in its
              header because it was written as a live stream, so the element
              has nothing to read. Somebody looking at 0:00 has no way to tell
              that from a recording that genuinely captured nothing — which is
              the difference between "send it" and "something is broken". We
              counted the seconds and the bytes on the way in; this is them. */}
          {blob && (
            <p className="text-[11px] text-white/45">
              {secs > 0 && <>{mmss} · </>}{sizeLabel(blob.size)}
              <span className="text-white/30">
                {" "}— the player may show 0:00 for a browser recording; that's the file's
                header, not your take.
              </span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button className="neon-btn-primary !w-auto px-5" onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" size={15} /> : <Play size={15} />}
              {busy ? "Coaching your take…" : "Send it to the coach"}
            </button>
            <Cost price={price} trial={trial} />
          </div>
          {price && (
            <p className="text-[11px] text-white/35">
              A take the coach can't read isn't charged.
            </p>
          )}
          {!trial && <AllowanceLadder price={price} />}
        </div>
      )}

      {/* Suppressed on the trial when the card below is showing it: the two
          were rendering the same failure in two different sets of words, one
          of them invented here. */}
      {msg && !(trial && failed) && (
        <p className="flex items-start gap-2 rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[11px] text-mcz-ember">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {msg}
        </p>
      )}

      {/* A spinner that ends in a red line is a bounce.
          Somebody at the trial door came for a number and did not get one, and
          what they need next is the move that gets them one. It never invents
          a partial score: a made-up number at the exact moment somebody is
          deciding whether any of this is real is the substance rule's worst
          case.

          It leads with the SERVER'S sentence, not a category of its own. The
          first version of this card mapped every 5xx to "the coach is down at
          our end, give it a minute and send the same take again" — which is
          the wrong advice for a 502 "the audio was silent" (resending the
          identical take fails identically) and a flat contradiction of a 503
          "free takes are all spoken for today". A 429 got "try a shorter
          clip", when the actual answer is that today's free take is spent and
          an account is what lifts it. The server already knows which of those
          it is and says so; the card's job is the NEXT MOVE, not a second
          opinion about the cause. */}
      {trial && failed && !busy && !result && (() => {
        const spent = !!failed.data?.already_used || !!failed.data?.retry_tomorrow;
        // Resending helps a dropped connection. It cannot help a take the
        // coach read and refused, and it cannot help a used-up allowance.
        const resendable = blob && (failed.why === "network" || failed.why === "server") && !spent;
        return (
          <div className="space-y-2 rounded-xl border border-mcz-cyan/25 bg-mcz-cyan/[0.06] p-4">
            <p className="text-[12px] font-semibold text-white">
              {spent
                ? "No score this time — and nothing was charged for it."
                : "No score came back — and nothing was charged for it."}
            </p>
            <p className="text-[11px] leading-relaxed text-white/70">
              {msg || (failed.why === "network"
                ? "The take never reached us. That is usually the connection rather than the take."
                : "The coach couldn't read a take out of that one.")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {resendable && (
                <button className="neon-btn-primary !w-auto px-4" onClick={submit} disabled={busy}>
                  <Play size={15} /> Send it again
                </button>
              )}
              {/* The allowance is spent, so the honest next move is the thing
                  that lifts it — not another attempt at the same wall. */}
              {spent ? (
                <Link to="/register" className="re-btn re-btn-emerald !w-auto px-4">
                  Make a free account
                </Link>
              ) : (
                <button className="re-btn re-btn-emerald !w-auto px-4"
                        onClick={() => fileInput.current?.click()} disabled={busy}>
                  <Upload size={15} /> Try a shorter clip
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {showUploadLimitPrompt && !trial && price?.max_mb_is_tier_limit && (
        <TierUpgradePrompt
          limit="upload_mb"
          current={0}
          userTier={user?.tier || "free"}
          onUpgrade={() => goToSpot("membershipz")}
        />
      )}

      {/* Two phases, told apart, because they fail differently and only one
          of them can honestly show a percentage.
          *
          * This was a spinner and a rising second count, and a member watched
          * it reach 853s on a take that was never coming back. A number that
          * only goes up is not progress — it cannot distinguish "working" from
          * "hung", which is the one thing the person watching needs to know.
          *
          * UPLOADING is measurable: bytes sent over bytes total, so it gets a
          * real bar, a percent and an ETA. SCORING is not — the model takes
          * as long as it takes and reports nothing on the way — so it gets no
          * fake bar. It gets the CEILING instead: the longest this can now
          * run before the server gives up and says so. "0:42 of up to 1:40" is
          * a wait somebody can sit through; "853s" is one they abandon. */}
      {busy && !result && (
        <div className="space-y-3 rounded-lg border border-mcz-cyan/20 bg-mcz-cyan/5 p-4">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-mcz-cyan" size={18} />
            <span className="text-sm text-white/75">
              {upload && !upload.done ? "Sending your take…" : "Scoring your take…"}
            </span>
          </div>

          {upload && !upload.done ? (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-mcz-cyan transition-[width] duration-200"
                     style={{ width: `${upload.pct}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-white/50">
                <span>
                  {upload.pct}% · {sizeLabel(upload.loaded)} of {sizeLabel(upload.total)}
                  {upload.bytesPerSecond ? ` · ${sizeLabel(upload.bytesPerSecond)}/s` : ""}
                </span>
                {/* Null until there is enough of a sample to mean anything. A
                    wrong ETA is worse than none, because people plan around it. */}
                <span>{upload.etaSeconds != null ? `${mmssOf(upload.etaSeconds)} left` : "…"}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-[11px] text-white/50">
              <span>The AI coach is listening</span>
              <span>
                {mmssOf(scoringElapsed)}
                {coachCeiling ? ` of up to ${mmssOf(coachCeiling)}` : ""}
              </span>
            </div>
          )}
        </div>
      )}

      {/* The coach heard no performance — silence, a room, a TV, the wrong
          file. That is not a bad take, it is not a take, and the two need
          opposite answers: one is what to fix, the other is what to send.
          Rendering a 2 here would be the substance rule's worst case, at the
          exact moment a stranger is deciding whether any of this is real.
          So: no number, no dimension chips, and the next move instead. */}
      {result?.unscorable ? (
        <div className="space-y-3 border-t border-white/10 pt-3">
          <div className="rounded-lg border border-mcz-cyan/30 bg-mcz-cyan/[0.06] p-3">
            <p className="text-[10px] uppercase tracking-widest text-mcz-cyan/70">
              🎧 Nothing to score yet
            </p>
            <p className="pt-1.5 text-[12px] leading-relaxed text-white/80">
              {result.unscorable}
            </p>
          </div>
          {/* `discard`, not a partial reset — it also revokes the object URL
              and clears the player, so the old take doesn't sit there under
              the invitation to record a new one. */}
          <button className="neon-btn" onClick={discard}>
            Try another take
          </button>
        </div>
      ) : result && (
        <div className="space-y-3 border-t border-white/10 pt-3">
          <div className="flex items-baseline gap-3">
            <span className={`font-display text-4xl font-extrabold ${scoreColor(result.score)}`}>
              {result.score}<span className="text-lg text-white/30">/10</span>
            </span>
            <p className="flex-1 text-[12px] leading-relaxed text-white/75">{result.verdict}</p>
          </div>

          {!trial && <CoachVoicePlayer result={result} />}

          {/* The SONG, kept out of the performance number entirely — its own
              card, its own label, its own score, right beside the one it is
              easiest to confuse with. A take can connect with real listeners
              while the performance underneath still has real work to do;
              rendering these as one grid or one number is exactly the
              confusion this card exists to end. Absent (not 0) when the take
              was a warm-up or exercise with no actual song to react to. */}
          {result.song_score != null && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] p-3">
              <span className={`font-display text-2xl font-extrabold ${scoreColor(result.song_score)}`}>
                🎶 {result.song_score}<span className="text-sm text-white/30">/10</span>
              </span>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest text-amber-300/80">
                  Song — separate from the performance score above
                </p>
                {result.song_why && (
                  <p className="text-[12px] leading-relaxed text-white/80">{result.song_why}</p>
                )}
              </div>
            </div>
          )}

          {/* Where you are, and where you're going. A score with no
              destination is a number, not coaching — so the two sit together,
              current read first. Each row hides itself when the coach had
              nothing honest to put in it (a take too short to read a range
              from says so by leaving this empty). */}
          {(result.now || result.goal) && (
            <div className="grid gap-2 sm:grid-cols-2">
              {result.now && (
                <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-white/40">
                    Where you're at
                  </p>
                  <p className="text-[12px] leading-relaxed text-white/75">{result.now}</p>
                </div>
              )}
              {result.goal && (
                <div className="rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.05] p-3">
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-mcz-cyan/80">
                    What you're aiming at
                  </p>
                  <p className="text-[12px] leading-relaxed text-white/80">{result.goal}</p>
                </div>
              )}
            </div>
          )}

          {result.range_profile && (
            <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-white/40">
                📏 Your range
              </p>
              <p className="text-[12px] leading-relaxed text-white/75">{result.range_profile}</p>
            </div>
          )}

          {result.style_fit && (
            <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-white/40">
                🎯 {style || genre}
              </p>
              <p className="text-[12px] leading-relaxed text-white/75">{result.style_fit}</p>
            </div>
          )}

          {/* What it made of the writing, and — first — what it actually
              heard. The words come before the verdict on purpose: a lyric
              review is worth nothing if the member cannot check it was
              listening to the right words, and this is the one field on the
              screen where a confident wrong answer is hardest to spot. */}
          {(result.lyrics_note || result.lyrics_read) && (
            <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3 space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-white/40">📝 Your words</p>
              {result.lyrics_read && (
                <p className="whitespace-pre-wrap text-[12px] italic leading-relaxed text-white/55">
                  {result.lyrics_read}
                </p>
              )}
              {result.lyrics_note && (
                <p className="text-[12px] leading-relaxed text-white/75">{result.lyrics_note}</p>
              )}
            </div>
          )}

          {/* Kept apart from the performance notes above, because that is the
              whole claim the toggle makes: production is scored in its own box
              or not at all. */}
          {result.mix_note && (
            <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3 space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-white/40">🎚️ Your mix</p>
              <p className="text-[12px] leading-relaxed text-white/75">{result.mix_note}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {/* The take's OWN dimensions. `result.rated_lyrics` rather than
                the toggle's current state: the member may have switched it
                since, and a chip row that follows a checkbox instead of the
                take would relabel a score that was never given. */}
            {Object.entries({
              ...(price?.scores || {}),
              ...(result.rated_lyrics ? (price?.lyric_scores || { writing: "Writing 📝" }) : {}),
              ...(result.rated_mix ? (price?.mix_scores || { mix: "Mix 🎚️" }) : {}),
            }).map(([k, label]) => (
              <span key={k} className="pill">
                {label} <span className={`font-bold ${scoreColor(result.scores?.[k])}`}>
                  {result.scores?.[k] ?? "—"}
                </span>
              </span>
            ))}
          </div>

          {result.strengths?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300/80">What worked</p>
              <ul className="mt-1 space-y-1">
                {result.strengths.map((s, i) => (
                  <li key={i} className="text-[12px] leading-relaxed text-white/65">· {s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.fixes?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-mcz-ember/80">Fix this</p>
              <ul className="mt-1 space-y-1">
                {result.fixes.map((s, i) => (
                  <li key={i} className="text-[12px] leading-relaxed text-white/65">· {s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.next_drill && (
            <p className="rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/5 px-3 py-2 text-[12px] text-white/70">
              <span className="font-semibold text-mcz-cyan">Next drill · </span>{result.next_drill}
            </p>
          )}

          {!trial && (
            <p className="text-[11px]">
              {result.cost_cents
                ? <span className="text-mcz-ember">−{result.cost_cents} 🏷️ spent</span>
                : <span className="text-emerald-300">Free — a daily prompt covered it 🏷️</span>}
            </p>
          )}

          {/* The score is not a dead end either: it says which post it scored
              and takes you back to it. When the post is yours the coaching is
              kept ON it, so it is there next time without paying twice. */}
          {result.source === "post" && (
            <p className="text-[11px] text-white/45">
              {result.saved_to_post
                ? `Kept on "${result.post_title}" — it'll be on the post next time you look.`
                : `Scored @${result.post_author}'s "${result.post_title}". This read is yours; their post is untouched.`}
              {" "}
              <button className="re-link" onClick={() => goToSpot("postz", "feed")}>
                Back to the post
              </button>
            </p>
          )}

          <p className="text-[10px] text-white/30">{price?.caveat}</p>
        </div>
      )}
    </div>
  );
}
