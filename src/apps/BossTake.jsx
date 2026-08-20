// SingZ Boss Take — record one scored take and have it coached.
//
// The blueprint's Boss Take ("one scored final take, exercise pass, or song
// section") against the StatZ AI Vocal Coach. Record in the browser or attach a
// file; the take goes up with genre, target range and difficulty, and comes
// back scored out of 10 with what worked, what to fix, and one drill.
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Mic, Play, Square, Trash2, Upload, Video } from "lucide-react";
import { api } from "../api.js";
import { GENRE_GROUPS } from "../genres.js";
import { onHandoff } from "../handoff.js";
import { goToSpot } from "../goto.js";

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

// `trial` swaps the member coach for the no-account door. Same recorder, same
// rubric, same score chips — the only differences are the endpoint, the price
// line, and what happens after the score.
export default function BossTake({ appKey = "singz", trial = false, onResult }) {
  const path = trial ? `/api/${appKey}/trial/` : `/api/${appKey}/coach/`;
  const [genre, setGenre] = useState("R&B");
  const [range, setRange] = useState("tenor");
  const [difficulty, setDifficulty] = useState("builder");
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
  // What this take costs, read BEFORE anything is sent. A price you only see
  // in the response is a bill, not a price.
  const [price, setPrice] = useState(null);
  const rec = useRef(null);
  const chunks = useRef([]);
  const fileInput = useRef(null);
  // Whether the take now running came from the camera. A ref, not state,
  // because the size stop reads it from inside the recorder's own callback.
  const videoRec = useRef(false);

  // The size ceiling, in bytes, as published by the server. One copy of the
  // number, on the server, where the transport that imposes it lives.
  const capBytes = price?.max_mb ? price.max_mb * 1024 * 1024 : 0;

  useEffect(() => { api(path, { auth: !trial }).then(setPrice).catch(() => {}); }, [path, trial]);

  // A post arriving from PostZ. The trial door is for people with no account
  // and therefore no posts, so it never listens.
  useEffect(() => {
    if (trial) return undefined;
    return onHandoff(appKey, (h) => {
      if (h?.kind !== "post" || !h.post_id) return;
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

  function attach(b, name, video = false) {
    // Checked here rather than on submit, because the server sends the take to
    // a model that caps the whole request — an oversize take fails upstream and
    // comes back as "the coach couldn't process that", which blames the take
    // instead of the size. Say it before the upload, not after.
    const capMb = price?.max_mb;
    if (capMb && b.size > capMb * 1024 * 1024) {
      // The server says why, because this is NOT the member's tier limit and
      // reading it as one is how a StatZ member concludes their plan is being
      // ignored. Fall back to the old wording if an older server sends none.
      return setMsg(`That take is ${(b.size / 1024 / 1024).toFixed(1)}MB — keep it under ${capMb}MB. `
        + (price?.max_mb_why
           || "Trim it to the section you want scored, or record video at a shorter length."));
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
  }

  // Record into a container the coach's model can actually read. Chrome's
  // default is audio/webm, which Gemini does not accept as audio — the server
  // relabels it to video/webm now, but recording straight into ogg or mp4 where
  // the browser supports it means the take never needs rescuing.
  function bestMime(video) {
    // VP8 first for video, not MP4. Android records MP4 through a hardware
    // encoder that commonly ignores videoBitsPerSecond — which is how a
    // 900kbps request produced a 20Mbps file. MP4 stays last for Safari, which
    // cannot record WebM at all. The server relabels all of these correctly
    // (see _RELABEL in vocalcoach.py), so the choice is purely about size.
    const wanted = video
      ? ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
      : ["audio/ogg;codecs=opus", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
    return wanted.find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
  }

  async function startRec(video = false) {
    setMsg(""); setStopNote("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return setMsg("This browser can't record. Attach a file instead.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        video
          // `max`, not bare values. A bare `width: 640` is an IDEAL the camera
          // may overshoot, and overshoot it did — straight to 1080p.
          ? { audio: true,
              video: { width: { max: 854 }, height: { max: 480 },
                       frameRate: { max: 30 } } }
          : { audio: true });
      chunks.current = [];
      setBytes(0);
      videoRec.current = video;
      // Ask for a modest bitrate on video so a minute of take lands inside the
      // size cap. This is a HINT and phones ignore it — the byte count below is
      // what actually holds the line.
      const mimeType = bestMime(video);
      const mr = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        ...(video ? { videoBitsPerSecond: 900_000 } : {}),
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
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        // Keep the recorder's own mime — the server normalises it — but give
        // the file an extension that matches, so an attached-file round trip
        // and a recorded one look the same to everything downstream.
        const type = mr.mimeType || (video ? "video/webm" : "audio/webm");
        const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : "webm";
        attach(new Blob(chunks.current, { type }),
               `${video ? "take-video" : "take"}.${ext}`, video);
      };
      rec.current = mr;
      // One chunk a second. Without a timeslice the recorder holds everything
      // until stop(), and the first time we'd learn a take was 1.4GB is after
      // it was performed.
      mr.start(1000);
      setSecs(0);
      setRecording(true);
    } catch {
      setMsg(video
        ? "Camera access was refused. Allow it, record audio only, or attach a file instead."
        : "Microphone access was refused. Allow it, or attach a file instead.");
    }
  }

  // `note` is set when the recorder stopped ITSELF — on time or on size. A
  // member pressing Stop gets no note; they know why it stopped.
  function stopRec(note = "") {
    if (rec.current?.state !== "recording") return;
    rec.current.stop();
    setRecording(false);
    if (note) setStopNote(note);
  }

  function discard() {
    if (url) URL.revokeObjectURL(url);
    setBlob(null); setIsVideo(false); setUrl(""); setResult(null); setMsg(""); setSecs(0);
    setBytes(0); setStopNote("");
  }

  async function submit() {
    if (!blob && !fromPost) return;
    setBusy(true); setMsg(""); setResult(null);
    try {
      // A handed-over post is already stored, so it rides as its id. Uploading
      // the same file a second time to have it coached is the dead end this
      // handoff exists to remove — and it would spend the member's storage
      // quota on a duplicate of a track they already posted.
      const body = fromPost
        ? { post_id: fromPost.post_id, genre, range, difficulty, ...(style ? { style } : {}) }
        : (() => {
            const f = new FormData();
            f.append("take", blob, takeName);
            f.append("genre", genre);
            f.append("range", range);
            f.append("difficulty", difficulty);
            if (style) f.append("style", style);
            return f;
          })();
      const out = await api(path, { method: "POST", body, auth: !trial });
      setResult(out);
      onResult?.(out);
    } catch (e) {
      setMsg(e.message || "The coach couldn't take that one.");
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

      {/* A post arrived from PostZ. It IS the take — there is nothing to record
          and nothing to upload, so the recorder steps aside and the only thing
          left is the price and the button that spends it. */}
      {fromPost && !recording && (
        <div className="space-y-2 rounded-lg border border-mcz-gold/30 bg-mcz-gold/[0.05] p-3">
          <p className="text-[11px] uppercase tracking-widest text-mcz-gold/90">
            🎧 From PostZ
          </p>
          <p className="text-[13px] font-semibold text-white">{fromPost.title}</p>
          <p className="text-[11px] text-white/45">
            by @{fromPost.author}
            {fromPost.genre ? ` · ${fromPost.genre}` : ""}
            {fromPost.coach_kind ? ` · the ${fromPost.coach_kind} on it` : ""}
          </p>
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

      <div className={`flex flex-wrap items-center gap-2 ${fromPost && !postUnsendable && !recording ? "opacity-60" : ""}`}>
        {!recording ? (
          <>
            <button className="re-btn !w-auto px-4" onClick={() => startRec(false)} disabled={busy}
                    data-tour="bosstake-mic">
              <Mic size={15} /> {blob ? "Record again" : "Record a take"}
            </button>
            {/* The coach watches as well as listens. On camera it can mark
                delivery, breath and posture, which sound alone can't show. */}
            <button className="re-btn !w-auto px-4" onClick={() => startRec(true)} disabled={busy}
                    data-tour="bosstake-camera" title="Record with camera — the coach scores delivery too">
              <Video size={15} /> Record on camera
            </button>
          </>
        ) : (
          <button className="neon-btn-primary !w-auto px-4" onClick={() => stopRec()}>
            <Square size={14} /> Stop · {mmss}
          </button>
        )}
        <input ref={fileInput} type="file" accept="audio/*,video/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { setStopNote(""); attach(f, f.name); } }} />
        <button className="re-btn !w-auto px-4" onClick={() => fileInput.current?.click()} disabled={busy || recording}>
          <Upload size={15} /> Attach audio or video
        </button>
        {blob && !recording && (
          <button className="re-btn !w-auto px-3 !text-red-300" onClick={discard} disabled={busy}>
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {recording && (
        <p className="flex items-center gap-2 text-[11px] text-mcz-ember">
          <span className="h-2 w-2 animate-pulse rounded-full bg-mcz-ember" />
          Recording — {mmss}
          {videoRec.current && ` / ${mmssOf(VIDEO_MAX_SECONDS)}`}
          {bytes > 0 && ` · ${mb(bytes)}MB${price?.max_mb ? ` of ${price.max_mb}MB` : ""}`}
        </p>
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

      {msg && (
        <p className="flex items-start gap-2 rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[11px] text-mcz-ember">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {msg}
        </p>
      )}

      {result && (
        <div className="space-y-3 border-t border-white/10 pt-3">
          <div className="flex items-baseline gap-3">
            <span className={`font-display text-4xl font-extrabold ${scoreColor(result.score)}`}>
              {result.score}<span className="text-lg text-white/30">/10</span>
            </span>
            <p className="flex-1 text-[12px] leading-relaxed text-white/75">{result.verdict}</p>
          </div>

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

          <div className="flex flex-wrap gap-2">
            {Object.entries(price?.scores || {}).map(([k, label]) => (
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
