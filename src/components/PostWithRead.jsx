// "Post this take with the coach's read" — the growth loop's last inch.
//
// A member who got a score they are proud of wants to put the SONG on PostZ with
// the coach's notes beside it, paste one link on Reddit or TikTok, and have a
// stranger hear the track and see the score on the same page. They also want the
// opposite on other days — a public song whose read only members see, or a read
// nobody but them sees. So the read has its own setting, separate from who can
// open the post.
//
// What this does and does not decide:
//   * It sends WHICH of the member's own reads (`coach_token`, the tail of the
//     coach's `share_url`) and the two settings. It never sends a score, a
//     verdict or a payload — the server copies the read from the row the coach
//     minted for this member, so a number typed into a request is not a number
//     on a post.
//   * It decides nothing about who sees what. Every sentence under a choice is
//     coachVis.js labelling a setting; the server enforces it.
//
// COST / GAIN, before the button: the storage the file uses (against what is
// left), the posting price PostZ's own button states, and the one scored-post
// slot it takes today — then the gain: a link anyone can open, and the cards.
// A refused upload is refused up here, in the server's own words, not after a
// four-minute wait.
import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Send } from "lucide-react";
import { api } from "../api.js";
import { refreshLimits } from "../limits.js";
import { ENERGY } from "../resources.js";
import { mediaItems, primaryMedia } from "../uploadWork.js";
import {
  POST_CHOICES, READ_CHOICES, defaultTitle, memberSees, mmss, readChoiceLabel,
  readResult, shareTokenOf, sizeLabel, storageLine, strangerSees,
} from "../coachVis.js";

// "singz" -> "SingZ", "violinz" -> "ViolinZ": the house spelling, so a default
// title never reads "SINGZ take".
const appLabel = (k) => String(k || "").replace(/^(.)(.*)z$/i, (_, a, b) => `${a.toUpperCase()}${b}Z`);

function extFor(blob, kind) {
  const t = blob.type || "";
  return t.includes("mp4") ? "mp4" : t.includes("webm") ? "webm" : t.includes("mpeg") ? "mp3"
    : t.includes("wav") ? "wav" : t.includes("ogg") ? "ogg" : kind === "video" ? "mp4" : "webm";
}

/** The three-way read choice, each with its result under it. One component for
 *  both the new-post form and the already-posted case, so the words cannot
 *  drift between them. */
function ReadChoices({ value, onChange, postVisibility, disabled }) {
  return (
    <div className="space-y-1.5" role="radiogroup" aria-label="Who sees the coach's read">
      {READ_CHOICES.map((c) => {
        const on = c.value === value;
        return (
          <button key={c.value || "same"} type="button" role="radio" aria-checked={on}
                  disabled={disabled} onClick={() => onChange(c.value)}
                  className={`block w-full rounded-lg border p-2.5 text-left transition ${
                    on ? "border-mcz-cyan/60 bg-mcz-cyan/[0.07]" : "border-white/[0.08] hover:border-white/25"}`}>
            <span className={`text-[13px] font-semibold ${on ? "text-mcz-cyan" : "text-white"}`}>{c.label}</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-white/55">
              {readResult(c.value, postVisibility)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The two lines that are always on screen and change with the choices. */
function Preview({ postVisibility, readVisibility, score }) {
  return (
    <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.04] p-3 text-[12px] leading-relaxed text-white/75"
         data-testid="stranger-preview">
      <p><span className="font-semibold text-emerald-300">What a stranger will see:</span>{" "}
        {strangerSees(postVisibility, readVisibility, score)}</p>
      <p className="mt-1"><span className="font-semibold text-emerald-300">What a member will see:</span>{" "}
        {memberSees(postVisibility, readVisibility)}</p>
    </div>
  );
}

/** The read is already on one of the member's own posts (the coach saved it
 *  there because the take came from that post). It is currently as wide as the
 *  post, so say that and let them narrow it. */
function OnExistingPost({ result }) {
  const [state, setState] = useState(null);       // the server's coach envelope + post_visibility
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api(`/api/economy/postz/${result.post_id}/coach/`).then(setState).catch(() => setState(null));
  }, [result.post_id]);
  if (!state || state.state !== "shown" || !("visibility" in state)) return null;
  const postVis = state.post_visibility || "public";
  const current = state.visibility || "";

  async function choose(value) {
    if (busy || value === current) return;
    setBusy(true); setMsg("");
    try {
      const next = await api("/api/economy/postz/", {
        method: "POST", body: { edit_id: result.post_id, score_visibility: value },
      });
      setState({ ...state, ...next.coach, post_visibility: next.visibility });
      setMsg(`Saved — ${readChoiceLabel(next.coach?.visibility ?? value)}.`);
    } catch (e) { setMsg(e.message || "Couldn't change that."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-2 rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.04] p-3" data-tour="post-with-read">
      <p className="text-[11px] uppercase tracking-widest text-mcz-cyan/80">
        This read is on your post "{result.post_title}"
      </p>
      <p className="text-[11px] text-white/50">
        Who sees it is separate from who can open the post. Free — nothing is charged.
      </p>
      <ReadChoices value={current} onChange={choose} postVisibility={postVis} disabled={busy} />
      <Preview postVisibility={postVis} readVisibility={current} score={result.score} />
      {msg && <p className="text-[12px] text-white/70">{msg}</p>}
    </div>
  );
}

function NewPost({ result, blob, appKey, isVideo, takeName, genre, token }) {
  const kind = isVideo ? "video" : "audio";
  const [title, setTitle] = useState(() => defaultTitle({ takeName, genre, label: appLabel(appKey) }));
  const [postVis, setPostVis] = useState("public");
  const [readVis, setReadVis] = useState("");
  const [lim, setLim] = useState(null);           // upload_mb, storage_mb, storage_used_mb
  const [price, setPrice] = useState(null);       // PostZ's own quote, in ⚡
  const [subs, setSubs] = useState(null);         // scored posts left today
  const [busy, setBusy] = useState("");           // "" | "upload" | "post"
  const [up, setUp] = useState(null);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);         // the created post
  const [copied, setCopied] = useState(false);
  // A file that went up and a post that then failed must not upload twice: the
  // member would pay the storage twice for one song.
  const hosted = useRef(null);

  useEffect(() => {
    let on = true;
    refreshLimits().then((d) => on && setLim(d)).catch(() => {});
    api("/api/economy/postz/cost/").then((d) => on && setPrice(d)).catch(() => {});
    api("/api/economy/submissions/").then((d) => on && setSubs(d)).catch(() => {});
    return () => { on = false; };
  }, []);

  const store = storageLine({
    fileBytes: blob?.size || 0, storageMb: lim?.storage_mb, usedMb: lim?.storage_used_mb,
    uploadMb: lim?.upload_mb,
  });
  // The file is already on the server once it has been hosted, so its storage
  // is spent and no longer a reason to refuse.
  const storageBlocks = !hosted.current && !store.fits;
  const slotsOut = subs && subs.remaining <= 0;
  const cost = price?.cost?.amount || 0;
  const link = done ? `${window.location.origin}/p/${done.id}` : "";

  async function upload() {
    if (hosted.current) return hosted.current;
    setBusy("upload"); setUp(null);
    const form = new FormData();
    form.append("file", blob, blob.name || `${kind}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}.${extFor(blob, kind)}`);
    const res = await api("/api/economy/uploads/", { method: "POST", body: form, onProgress: setUp });
    const url = res?.upload?.url;
    // Refuse rather than post a link that is not one: nothing is posted.
    if (!url) throw new Error("The upload didn't come back with a link — nothing was posted.");
    hosted.current = url;
    setUp(null);
    return url;
  }

  async function post() {
    if (busy || !title.trim() || storageBlocks || slotsOut) return;
    setErr("");
    try {
      const url = await upload();
      setBusy("post");
      const work = kind === "video" ? { video_url: url } : { audio_url: url };
      const created = await api("/api/economy/postz/", {
        method: "POST",
        body: {
          title: title.trim(), visibility: postVis, genre: genre || "",
          ...primaryMedia(work), items: mediaItems(work, title.trim()),
          // Which of THEIR OWN reads — never the read itself.
          coach_token: token, score_visibility: readVis,
        },
      });
      setDone(created);
    } catch (e) {
      // The server's own sentence, whichever step refused. "Posted" is only
      // ever said below, from the `done` branch.
      setErr(hosted.current
        ? `${e.message || "Couldn't post."} Your file is uploaded, so trying again won't upload it twice.`
        : e.message || "Couldn't post that.");
    } finally { setBusy(""); setUp(null); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  }

  if (done) {
    const cardUrl = `/api/economy/scores/${encodeURIComponent(token)}/card.png`;
    const widely = postVis === "public" && readVis === "";
    return (
      <div className="space-y-2 rounded-lg border border-emerald-300/30 bg-emerald-300/[0.05] p-3" data-tour="post-with-read">
        <p className="text-[13px] font-semibold text-emerald-300">Posted — "{done.title}" is on PostZ with the coach's read.</p>
        <Preview postVisibility={done.visibility} readVisibility={done.coach?.visibility ?? readVis} score={result.score} />
        {postVis === "public" ? (
          <div className="space-y-2">
            <p className="text-[11px] text-white/50">Your link — paste it on Reddit, TikTok or anywhere:</p>
            <div className="flex flex-wrap items-center gap-2">
              <input readOnly value={link} onFocus={(e) => e.target.select()}
                     className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white/80" />
              <button type="button" onClick={copy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-mcz-cyan/40 px-3 py-2 text-[12px] text-mcz-cyan hover:bg-mcz-cyan/10">
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy link"}
              </button>
              <a href={`/p/${done.id}?stranger=1`} target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-[12px] text-white/70 hover:text-white">
                <ExternalLink size={13} /> Open as a stranger sees it
              </a>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-white/50">
            This post isn't public, so there is no link a stranger can open. Make it public from its card in PostZ when you want one.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-[12px]">
          <a href={cardUrl} download="coach-score.png" target="_blank" rel="noreferrer" className="text-mcz-cyan underline">
            Download the score card
          </a>
          <a href={`${cardUrl}?format=story`} download="coach-score-story.png" target="_blank" rel="noreferrer" className="text-mcz-cyan underline">
            Download the story-size card (TikTok, Reels)
          </a>
        </div>
        {!widely && (
          <p className="text-[11px] leading-relaxed text-white/45">
            The card images are yours to send wherever you like — the setting above only controls what the post's own page shows.
          </p>
        )}
      </div>
    );
  }

  const canPost = !busy && title.trim() && !storageBlocks && !slotsOut;
  return (
    <div className="space-y-3 rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.04] p-3" data-tour="post-with-read">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-mcz-cyan/80">Post this take with the coach's read</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/50">
          Puts the song on PostZ with your {result.score}/10 beside it, so one link carries both.
        </p>
      </div>

      <label className="block">
        <span className="text-[11px] text-white/55">Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} disabled={!!busy}
               className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/40 p-2.5 text-sm text-white outline-none focus:border-mcz-ember/60" />
      </label>

      <div>
        <p className="mb-1 text-[11px] text-white/55">Who can open the post</p>
        <div className="space-y-1.5" role="radiogroup" aria-label="Who can open the post">
          {POST_CHOICES.map((c) => {
            const on = c.value === postVis;
            return (
              <button key={c.value} type="button" role="radio" aria-checked={on} disabled={!!busy}
                      onClick={() => setPostVis(c.value)}
                      className={`block w-full rounded-lg border p-2.5 text-left transition ${
                        on ? "border-mcz-cyan/60 bg-mcz-cyan/[0.07]" : "border-white/[0.08] hover:border-white/25"}`}>
                <span className={`text-[13px] font-semibold ${on ? "text-mcz-cyan" : "text-white"}`}>{c.label}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-white/55">{c.tip}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1 text-[11px] text-white/55">Who sees the coach's read</p>
        <ReadChoices value={readVis} onChange={setReadVis} postVisibility={postVis} disabled={!!busy} />
      </div>

      <Preview postVisibility={postVis} readVisibility={readVis} score={result.score} />

      {/* The price, before the button — what leaves in red, what arrives in
          green. Posting this does not touch the coach's price: the read was paid
          for when it was given, and a failed post charges nothing. */}
      <div className="space-y-1 text-[12px]" data-testid="post-cost">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-mcz-ember">−{store.mb.toFixed(1)} MB
            <span className="text-white/45"> of your storage{store.left != null ? ` (${store.left.toFixed(1)} MB left)` : ""}</span>
          </span>
          {cost > 0
            ? <span className="text-mcz-ember">−{cost} {ENERGY}</span>
            : <span className="text-emerald-300">Free to post</span>}
          {subs && (
            <span className={slotsOut ? "text-mcz-ember" : "text-mcz-ember/80"}>
              −1 <span className="text-white/45">of {subs.remaining} scored posts left today</span>
            </span>
          )}
          <span className="text-emerald-300">+ a link anyone can open</span>
          <span className="text-emerald-300">+ the score card, wide and story size</span>
        </div>
        <p className="text-[11px] text-white/40">
          Nothing is charged if the upload or the post fails. The coach's read costs nothing extra.
        </p>
        {storageBlocks && <p className="text-mcz-ember">{store.refusal}</p>}
        {slotsOut && (
          <p className="text-mcz-ember">
            You've used today's {subs.cap} posts with media. It renews tomorrow.
          </p>
        )}
      </div>

      {busy === "upload" && (
        <div className="space-y-1" aria-live="polite">
          <p className="flex items-center gap-2 text-[12px] text-white/70">
            <Loader2 size={13} className="animate-spin" /> Sending your {kind}…
          </p>
          {up && !up.done && (
            <>
              <div className="h-1.5 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-mcz-cyan/70" style={{ width: `${up.pct}%` }} />
              </div>
              <p className="flex justify-between text-[11px] text-white/45">
                <span>
                  {up.pct}% · {sizeLabel(up.loaded)} of {sizeLabel(up.total)}
                  {up.bytesPerSecond ? ` · ${sizeLabel(up.bytesPerSecond)}/s` : ""}
                </span>
                {/* No ETA until there is a real sample: a wrong one is worse than none. */}
                <span>{up.etaSeconds != null ? `${mmss(up.etaSeconds)} left` : "…"}</span>
              </p>
            </>
          )}
        </div>
      )}
      {busy === "post" && (
        <p className="flex items-center gap-2 text-[12px] text-white/70">
          <Loader2 size={13} className="animate-spin" /> Posting…
        </p>
      )}
      {err && <p className="text-[12px] text-mcz-ember" role="alert">{err}</p>}

      <button type="button" onClick={post} disabled={!canPost}
              className="re-btn !w-auto px-6 disabled:opacity-50">
        <Send size={15} /> Post with the coach's read
        <span className="ml-1 text-white/70">· {readChoiceLabel(readVis)}</span>
      </button>
    </div>
  );
}

/**
 * Rendered in the coach screen after a scored take. Offers itself only when the
 * take has a share token — a trial take has none, and there is nobody to post it.
 *
 * @param result   the coach's response (`share_url`, `score`, `saved_to_post`, …)
 * @param blob     the take that was scored (a File or a recorded Blob)
 */
export default function PostWithRead({ result, blob, appKey = "singz", trial = false, isVideo = false, takeName = "", genre = "" }) {
  if (trial || !result || result.unscorable || result.score == null) return null;
  const token = shareTokenOf(result.share_url);
  if (!token) return null;
  // The take came from one of the member's own posts and the coach already put
  // the read on it: there is nothing to upload, only who sees it to choose.
  if (result.saved_to_post && result.post_id) return <OnExistingPost result={result} />;
  if (!blob) return null;
  return <NewPost result={result} blob={blob} appKey={appKey} isVideo={isVideo}
                  takeName={takeName} genre={genre} token={token} />;
}
