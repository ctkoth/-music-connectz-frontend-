import Doors from "../components/Doors.jsx";
import { useEffect, useRef, useState } from "react";
import { Clapperboard, Download, Loader2 } from "lucide-react";
import { useCharLimit } from "../limits.js";
import CharLimit from "../CharLimit.jsx";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { IconImg } from "../App.jsx";
import EarnInstead from "../EarnInstead.jsx";
import { MONEY, PROMPTZ, SPINAZ } from "../resources.js";
import { playSound } from "../sound.js";
import UseIn from "../components/UseIn.jsx";
import { money, runTimeoutMs, splitCost, unknownOutcome, unknownOutcomeNote } from "../aiRun.js";
import { firstPollDelay, newestPending, pollIsHopeless } from "../videoz.js";
import { FACE_FEED_NOTE } from "../facez.js";
import StitchedMusicVideo from "../components/StitchedMusicVideo.jsx";

// Video ConnectZ — music, bio and promo videos, optionally starting from the
// member's own FaceZ photo. Price, kinds and faces come from
// /api/economy/videoz/. The price is HELD while a video renders and handed
// back in full if it fails, so the line beside the button says so.

const POLL_MS = 8000;
// A poll that finishes a render downloads the whole video on the server (up to
// 120s there), so it is allowed to take that long here too — a 30s abort would
// only fire the next poll into the server's own claim on the download.
const POLL_TIMEOUT_MS = 150_000;
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// What it costs, BEFORE the button: 🏷️ first, then the balance — in the order
// the server takes them — with the cash half in 💵. The split needs to know what
// the member holds; without it this says the bare price in 🏷️.
function Price({ s, failed, onRetry }) {
  if (!s) {
    return failed ? (
      <span className="text-[11px] text-mcz-ember">
        Couldn't check the price. <button className="re-link" onClick={onRetry}>Try again</button>
      </span>
    ) : <span className="text-[11px] text-white/40">Checking the price…</span>;
  }
  const split = splitCost(s.price_cents, s.promptz);
  return (
    <span className="text-[11px] text-mcz-ember">
      {split ? (
        <>
          {split.promptz > 0 && <>−{split.promptz} {PROMPTZ} </>}
          {split.cents > 0 && <>−{money(split.cents)} {MONEY}</>}
        </>
      ) : <>−{s.price_cents} {PROMPTZ}</>}{" "}
      <span className="text-white/45">
        {split && split.cents > 0 ? `— ${PROMPTZ} first, then your balance` : ""}
        {" "}— held while it renders, refunded in full if it fails
      </span>
    </span>
  );
}

export default function VideoConnectZ() {
  const cl = useCharLimit();
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  // Why a start was refused, when the server said (`reason`): it decides the next
  // move, so the card offers it rather than leaving the sentence to be re-read.
  const [failReason, setFailReason] = useState("");
  const [kind, setKind] = useState("music");
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState("16:9");
  const [face, setFace] = useState(null);
  const [busy, setBusy] = useState(false);
  const [work, setWork] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const resumed = useRef(false);

  // `adopt` picks the newest pending render up as the one on screen. It runs once
  // when the screen opens, so a render that outlived a closed tab is polled again
  // and finished — a render is only collected by being polled — and again after a
  // start that never answered, when the render may well be running.
  const load = ({ adopt = false } = {}) => api("/api/economy/videoz/")
    .then((d) => {
      setS(d);
      if (adopt || !resumed.current) {
        resumed.current = true;
        const p = newestPending(d?.works);
        if (p) setWork((cur) => (cur?.status === "pending" ? cur : p));
      }
    })
    .catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A render keeps going server-side; poll until it lands or fails. Each poll is
  // scheduled when the LAST one has answered. A fixed interval fired on the clock
  // whether or not the previous request had returned, and the poll that finishes
  // a render is a long one — so they stacked up on top of each other.
  useEffect(() => {
    if (work?.status !== "pending") return undefined;
    let alive = true;
    let t = null;
    const started = Date.parse(work.created_at);
    const tick = () => setElapsed(Number.isFinite(started) ? Math.max(0, Math.floor((Date.now() - started) / 1000)) : 0);
    tick();
    const clockT = setInterval(tick, 1000);
    const poll = async () => {
      try {
        const w = await api(`/api/economy/videoz/${work.id}/`, { timeoutMs: POLL_TIMEOUT_MS });
        if (!alive) return;
        if (w.status !== "pending") {
          setWork(w); load();
          playSound(w.status === "done" ? "build_done" : "build_fail");
          return;
        }
      } catch (e) {
        if (!alive || pollIsHopeless(e)) return;   // gone, or not ours: asking again cannot help
        /* otherwise a missed poll just waits for the next one */
      }
      if (alive) t = setTimeout(poll, POLL_MS);
    };
    t = setTimeout(poll, firstPollDelay(work.created_at, Date.now(), POLL_MS));
    return () => { alive = false; clearTimeout(t); clearInterval(clockT); };
  }, [work?.id, work?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const [uploading, setUploading] = useState(false);
  async function addFace(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true); setErr("");
    try {
      const body = new FormData();
      body.append("image", file);
      body.append("name", "Video ConnectZ");
      const f = await api("/api/economy/facez/", { method: "POST", body });
      await load();
      const id = f?.face?.id ?? f?.id;
      if (id) setFace(id);
    } catch (x) { setErr(x.message); } finally { setUploading(false); }
  }

  async function start() {
    setErr(""); setFailReason(""); setBusy(true);
    let w;
    try {
      w = await api("/api/economy/videoz/", { method: "POST",
        body: { kind, prompt, aspect, face_id: face || undefined },
        timeoutMs: runTimeoutMs(s?.budget_seconds) });
    } catch (e) {
      playSound("error");
      if (unknownOutcome(e)) {
        // The price is HELD the moment a render is started, so "nothing was
        // charged" would be wrong, and pressing again would hold it twice.
        load({ adopt: true });
        setErr(`${unknownOutcomeNote(e, "Your videos")} The price is held while a video renders and handed back if it fails.`);
      } else { setErr(e.message); setFailReason(e.data?.reason || ""); load(); }
      setBusy(false);
      return;
    }
    setWork(w); load();
    playSound("build_start");
    setBusy(false);
  }

  // The royalty is the server's number: on the render, else the screen's GET.
  const pct = work ? (work.royalty_pct ?? s?.royalty_pct) : null;
  const canMake = !!s && s.configured && s.can_afford;
  const rendering = work?.status === "pending";

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="videoconnectz.png" alt="Video ConnectZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">Video ConnectZ</h2>
          <p className="text-sm text-white/60">Music, bio and promo videos — starring your FaceZ if you want.</p>
        </div>
      </header>

      <StitchedMusicVideo />

      {s && !s.configured && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">Video ConnectZ isn't switched on yet.</p>}

      <div className="neon-frame space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {(s?.kinds || []).map((k) => (
            <button key={k.key} onClick={() => setKind(k.key)}
              className={`rounded-full border px-3 py-1.5 text-sm ${kind === k.key ? "border-mcz-cyan bg-mcz-cyan/15" : "border-white/15 text-white/70"}`}>
              {k.emoji} {k.label}
            </button>
          ))}
        </div>
        <textarea className="neon-input min-h-24 w-full" maxLength={cl.limit}
          placeholder="Describe the video — the scene, the mood, what happens."
          aria-label="Describe the video"
          value={prompt} onChange={(e) => setPrompt(cl.clamp(e.target.value))} />
        <CharLimit cl={cl} value={prompt} />

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-white/60">Shape</span>
          {(s?.aspects || ["16:9", "9:16"]).map((a) => (
            <button key={a} onClick={() => setAspect(a)}
              className={`rounded-full border px-3 py-1 ${aspect === a ? "border-mcz-cyan bg-mcz-cyan/15" : "border-white/15 text-white/60"}`}>
              {a === "16:9" ? "16:9 · YouTube" : "9:16 · Reels / TikTok"}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm text-white/70">Star in it <span className="text-white/40">(optional — your FaceZ photo becomes the first frame)</span></p>
          {s?.faces?.length ? (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFace(null)}
                className={`h-14 rounded-lg border px-3 text-xs ${face === null ? "border-mcz-cyan" : "border-white/15 text-white/60"}`}>No face</button>
              {s.faces.map((f) => (
                <button key={f.id} onClick={() => setFace(f.id)} aria-label="Use this FaceZ photo" aria-pressed={face === f.id}
                  className={`h-14 w-14 overflow-hidden rounded-lg border-2 ${face === f.id ? "border-mcz-cyan" : "border-transparent"}`}>
                  <img src={f.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/50">No FaceZ photos yet — add a clear, front-facing one below.</p>
          )}
          {/* Said BEFORE a file is chosen: this posts to the same endpoint as
              FaceZ, so a photo added here is a FaceZ face with everything that
              means — not a private input to one video. */}
          <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/65">{FACE_FEED_NOTE}</p>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-mcz-cyan">
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={addFace} />
            {uploading ? <Loader2 className="animate-spin" size={12} /> : "+"} Add a FaceZ photo
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live only once the price is known and affordable: with no answer
              from the server there is no price to have stated. */}
          <button className="neon-btn-primary !w-auto px-5" disabled={busy || !prompt.trim() || !canMake || rendering}
            onClick={start}>
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Clapperboard size={16} />} Make the video
          </button>
          <Price s={s} failed={!s && !!err} onRetry={load} />
        </div>
        {s?.what_you_get && (
          <p className="text-xs text-white/65"><span className="text-emerald-300">What it buys:</span> {s.what_you_get}</p>
        )}
        {rendering && (
          <p className="text-xs text-white/55">One render at a time here — wait for the one below to finish before starting another.</p>
        )}
        {s && s.configured && !s.can_afford && (
          <div role="status" className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
            <p>
              A video costs <span className="text-mcz-ember">−{s.price_cents} {PROMPTZ}</span> ({money(s.price_cents)}; {PROMPTZ} are used
              first, then your balance). You hold {s.promptz} {PROMPTZ} and {money(s.money_cents)} {MONEY} — not enough.
            </p>
            <button className="re-btn !w-auto px-3 py-1 text-xs" onClick={() => goToSpot("membershipz", "promptz-door")}>
              Get {PROMPTZ} — swap {SPINAZ} or buy
            </button>
            <EarnInstead resource="promptz" title="Or earn some" />
          </div>
        )}
        {s?.royalty_rule && <p className="text-xs text-white/50">{s.royalty_rule}</p>}
        {err && <p role="alert" className="text-sm text-mcz-ember">{err}</p>}
        {/* The provider could not use the photo: the server has already handed the
            price back, so the next move is the same video without it. */}
        {failReason === "photo" && face && (
          <button className="re-btn !w-auto px-3 py-1 text-xs" onClick={() => { setFace(null); setErr(""); setFailReason(""); }}>
            Make it without the photo
          </button>
        )}
      </div>

      {work && (
        <div key={work.id} className="mcz-reveal neon-frame space-y-3 p-4">
          <h3 className="font-semibold">{work.label} · {work.aspect}</h3>
          {work.status === "pending" && (
            <p className="text-sm text-white/70">
              <Loader2 className="mr-2 inline animate-spin" size={14} />
              Rendering — {clock(elapsed)} so far. Videos usually take a few minutes. You can leave this tab: it is collected when
              you open Video ConnectZ again, and a render that never arrives is refunded in full.
            </p>
          )}
          {work.status === "failed" && (
            <p className="text-sm text-mcz-ember">It didn't render{work.error ? ` (${work.error})` : ""}. Your {PROMPTZ}/balance has been handed back.</p>
          )}
          {work.status === "done" && work.video_url && (
            <>
              <video src={work.video_url} controls playsInline
                className={`w-full rounded-xl bg-black ${work.aspect === "9:16" ? "mx-auto max-w-xs" : ""}`} />
              <a className="re-btn !w-auto px-4" href={work.video_url} download><Download size={14} /> Download</a>
              <Doors item={{ title: work.title || "My video", url: work.video_url, kind: "video" }} />
              {pct != null && <UseIn source="video" sourceId={work.id} pct={pct} />}
            </>
          )}
        </div>
      )}

      {s?.works?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/70">Your videos</h3>
          {s.works.map((w) => (
            <button key={w.id} onClick={() => setWork(w)}
              className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:border-white/30">
              {w.label} <span className="text-white/45">— {w.status === "done" ? "ready" : w.status === "pending" ? "rendering…" : "didn't render"} · {w.prompt.slice(0, 60)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
