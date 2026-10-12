// The coach's read on a post — what the server says THIS viewer may see of it.
//
// A post carries `coach: {state, …}` and the state is already decided for the
// person looking (apps/economy/coachshare.py). This renders that answer and
// decides nothing:
//
//   none    nothing at all. There is no read, or it is not this viewer's to know
//           about; either way a placeholder would be a hint.
//   locked  a read exists and this viewer may not see it. The card says exactly
//           why, in the server's own sentence, and offers the way in — and no
//           number, no verdict, nothing that was in the read.
//   shown   the score with every dimension beside its label, the verdict, the
//           notes, the next drill and the caveat on the SAME card. A number with
//           no description beside it is a number with no meaning, and a score
//           from one take with no scope beside it reads as a verdict on a person.
//
// `CoachReadSetting` is the author's half: who sees the read, with what each
// choice does written under it before it is pressed.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Loader2, Lock } from "lucide-react";
import { api } from "../api.js";
import { SPINAZ } from "../resources.js";
import {
  READ_CHOICES, REMOVE_RESULT, dimensionRows, firstSentence, givenOn,
  memberSees, readChoiceLabel, readResult, strangerSees,
} from "../coachVis.js";

const scoreColor = (n) =>
  n == null ? "text-white/30" : n >= 8 ? "text-emerald-300" : n >= 5 ? "text-mcz-gold" : "text-mcz-ember";

// What joining pays, from the server — the same numbers the shared score card
// states. Fetched only where a stranger is looking; a failed fetch just means
// the sentence is not shown, never a number made up to fill it.
function useJoinReward(enabled) {
  const [join, setJoin] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let on = true;
    api("/api/economy/tiers/", { auth: false }).then((t) => on && setJoin(t?.join || null)).catch(() => {});
    return () => { on = false; };
  }, [enabled]);
  return join;
}

/** The way a stranger takes their own free take, and what joining after it pays
 *  — stated before the link is pressed, like everywhere else. */
function GetYours({ coach, author, join }) {
  const g = coach.get_yours;
  if (!g?.path) return null;
  return (
    <div className="mt-3 space-y-1 border-t border-white/[0.06] pt-3">
      <Link to={g.path}
            className="inline-block rounded-lg border border-mcz-cyan/40 px-3 py-1.5 text-[12px] font-semibold text-mcz-cyan hover:bg-mcz-cyan/10">
        Get your own take scored — free, no account
      </Link>
      <p className="text-[11px] leading-relaxed text-white/45">
        Upload a clip or record one and the {g.label} coach reads it.{" "}
        {author && join?.joinee_spinaz
          ? <>Join after through @{author}'s link: <span className="text-emerald-300">+{join.joinee_spinaz} {SPINAZ}</span> for you, <span className="text-emerald-300">+{join.referrer_spinaz} {SPINAZ}</span> for them.</>
          : "Join after to keep it."}
      </p>
    </div>
  );
}

function Locked({ coach, author }) {
  const join = useJoinReward(true);
  return (
    <div className="mt-3 rounded-lg border border-white/[0.1] bg-black/30 p-3" data-testid="coach-locked">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/55">
        <Lock size={12} /> {coach.label ? `The ${coach.label} coach's read` : "The coach's read"}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-white/85">{coach.reason}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Link to="/register"
              className="rounded-lg bg-mcz-ember px-3 py-1.5 text-[12px] font-bold text-white hover:brightness-110">
          Join free
          {join?.welcome_spinaz > 0 && <span className="ml-1.5 text-emerald-100">+{join.welcome_spinaz} {SPINAZ}</span>}
        </Link>
        <Link to="/login" className="text-[12px] text-white/60 underline hover:text-white">Already a member? Sign in</Link>
      </div>
      <GetYours coach={coach} author={author} join={join} />
    </div>
  );
}

function List({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
      <p className="mb-1 text-[10px] uppercase tracking-widest text-white/40">{title}</p>
      <ul className="space-y-1 text-[12px] leading-relaxed text-white/75">
        {items.map((x, i) => <li key={i}>• {x}</li>)}
      </ul>
    </div>
  );
}

function Note({ title, text }) {
  if (!text) return null;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
      <p className="mb-1 text-[10px] uppercase tracking-widest text-white/40">{title}</p>
      <p className="text-[12px] leading-relaxed text-white/75">{text}</p>
    </div>
  );
}

function Shown({ coach, compact, signedIn, onOpen, author }) {
  const read = coach.read;
  const [open, setOpen] = useState(!compact);
  // A stranger on a public page is the audience for the growth link; a member
  // already has the coach. The reward line is only fetched for the former.
  const join = useJoinReward(!signedIn);
  const rows = dimensionRows(read);
  const given = givenOn(read.coached_at);
  const lead = firstSentence(read.verdict);
  return (
    <div className="mt-3 rounded-lg border border-mcz-cyan/20 bg-mcz-cyan/[0.04] p-3" data-testid="coach-shown">
      <div className="flex items-start gap-3">
        <div className={`font-display text-4xl font-extrabold leading-none ${scoreColor(read.score)}`}>
          {read.score}<span className="text-base text-white/30">/10</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-widest text-mcz-cyan/80">
            👑 Coach's read · {read.label}
          </p>
          <p className="text-[10px] text-white/40">
            {given ? `Given ${given}` : "Given by the coach"}
            {read.coached_by ? ` on @${read.coached_by}'s take` : ""}
            {coach.public ? " · open to anyone with the link" : ""}
          </p>
          {compact && !open && lead && (
            <p className="mt-1 text-[12px] leading-relaxed text-white/75">{lead}</p>
          )}
        </div>
        {compact && (
          <button type="button" onClick={() => setOpen((v) => !v)}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/60 hover:text-white">
            {open ? <>Hide <ChevronUp size={12} /></> : <>Notes <ChevronDown size={12} /></>}
          </button>
        )}
      </div>

      {/* The scope sits on the card even when it is folded: a bare number from
          one take is read as a verdict on the person, and the caveat is the
          sentence that stops that. */}
      {compact && !open && read.caveat && (
        <p className="mt-2 text-[10px] leading-relaxed text-white/35">{firstSentence(read.caveat, 200)}</p>
      )}

      {open && (
        <div className="mt-3 space-y-2">
          {rows.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {rows.map((r) => (
                <span key={r.key} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[12px] text-white/80">
                  {r.label} <span className={`font-bold ${scoreColor(r.value)}`}>{r.value}</span>
                  <span className="text-white/30">/10</span>
                </span>
              ))}
            </div>
          )}
          {read.verdict && <p className="text-[13px] leading-relaxed text-white/85">{read.verdict}</p>}
          {read.song_score != null && read.labels?.song_score && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/[0.06] p-3">
              <p className="text-[10px] uppercase tracking-widest text-amber-300/80">
                {read.labels.song_score} · the song, separate from the performance score
              </p>
              <p className="text-[12px] leading-relaxed text-white/80">
                <span className={`font-bold ${scoreColor(read.song_score)}`}>{read.song_score}</span>
                <span className="text-white/30">/10</span>
                {read.song_why ? ` — ${read.song_why}` : ""}
              </p>
            </div>
          )}
          {(read.now || read.goal) && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Note title="Where they're at" text={read.now} />
              <Note title="What they're aiming at" text={read.goal} />
            </div>
          )}
          <List title="What's working" items={read.strengths} />
          <List title="What to fix" items={read.fixes} />
          <Note title="Next drill" text={read.next_drill} />
          <Note title="Style" text={read.style_fit} />
          <Note title="Range" text={read.range_profile} />
          <Note title="The words" text={read.lyrics_note} />
          <Note title="The mix" text={read.mix_note} />
        </div>
      )}

      {open && read.caveat && (
        <p className="mt-3 text-[11px] leading-relaxed text-white/45">{read.caveat}</p>
      )}

      {/* Not a dead end. A member opens the coach that gave this read; a
          stranger is offered the same coach, free, with no account. */}
      {open && signedIn && onOpen && read.open_in && (
        <button type="button" onClick={() => onOpen(read.open_in, read.target)}
                className="mt-3 text-[11px] font-semibold text-mcz-cyan hover:underline">
          Open in {read.label} →
        </button>
      )}
      {open && signedIn && !onOpen && (
        <Link to="/" className="mt-3 inline-block text-[11px] font-semibold text-mcz-cyan hover:underline">
          Open Music ConnectZ →
        </Link>
      )}
      {open && !signedIn && <GetYours coach={coach} author={author} join={join} />}
    </div>
  );
}

/**
 * @param coach     the post's `coach` object, exactly as the server sent it
 * @param compact   fold the notes behind a one-line headline (feed cards)
 * @param signedIn  whether the viewer has an account — only decides which link
 *                  is offered; the server already decided what to show
 * @param onOpen    (appKey, target) => void — open the coach that gave the read
 * @param author    the post's author handle, carried as the referral code
 */
export default function CoachReadCard({ coach, compact = false, signedIn = false, onOpen, author = "" }) {
  if (!coach) return null;
  if (coach.state === "shown" && coach.read) {
    return <Shown coach={coach} compact={compact} signedIn={signedIn} onOpen={onOpen} author={author} />;
  }
  if (coach.state === "locked") return <Locked coach={coach} author={author} />;
  return null;
}

/**
 * The AUTHOR's control: who sees the coach's read on this post.
 *
 * Rendered only when the server told us the setting (`coach.visibility` is sent
 * to the author alone) and there is a read to control. Each choice states what
 * it does for THIS post before it is pressed; the answer comes back from the
 * server and replaces the card, so what is on screen is what is stored.
 */
export function CoachReadSetting({ post, onChanged, onFlash }) {
  const coach = post.coach;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  if (!coach || coach.state !== "shown" || !("visibility" in coach)) return null;
  const current = coach.visibility || "";

  async function choose(value) {
    if (busy || value === current) return;
    setBusy(`v:${value}`);
    try {
      const next = await api("/api/economy/postz/", {
        method: "POST", body: { edit_id: post.id, score_visibility: value },
      });
      onChanged(post.id, next);
      onFlash(`Saved — ${readChoiceLabel(next?.coach?.visibility ?? value)}. ${readResult(next?.coach?.visibility ?? value, post.visibility)}`);
    } catch (e) {
      onFlash(e.message || "Couldn't change that.");
    } finally { setBusy(""); }
  }

  async function remove() {
    if (busy) return;
    setBusy("remove");
    try {
      const next = await api(`/api/economy/postz/${post.id}/coach/`, { method: "DELETE" });
      onChanged(post.id, next);
      onFlash("The coach's read is off this post. The song is still posted.");
    } catch (e) {
      onFlash(e.message || "Couldn't remove that.");
    } finally { setBusy(""); }
  }

  return (
    <div className="mt-2" data-tour="coach-read-setting">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
              className="flex items-center gap-1 text-[11px] text-white/55 hover:text-white">
        Coach read: <span className="font-semibold text-white/85">{readChoiceLabel(current)}</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        <span className="ml-1 text-emerald-300/80">Free</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg border border-white/[0.08] bg-black/25 p-3">
          <p className="text-[11px] text-white/45">
            Who sees the coach's read on this song. It is separate from who can open the post.
          </p>
          {READ_CHOICES.map((c) => {
            const on = c.value === current;
            return (
              <button key={c.value || "same"} type="button" disabled={!!busy} onClick={() => choose(c.value)}
                      aria-pressed={on}
                      className={`block w-full rounded-lg border p-2.5 text-left transition ${
                        on ? "border-mcz-cyan/60 bg-mcz-cyan/[0.07]" : "border-white/[0.08] hover:border-white/25"}`}>
                <span className={`text-[13px] font-semibold ${on ? "text-mcz-cyan" : "text-white"}`}>
                  {c.label}{on ? " · now" : ""}
                  {busy === `v:${c.value}` && <Loader2 size={12} className="ml-2 inline animate-spin" />}
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-white/55">
                  {readResult(c.value, post.visibility)}
                </span>
              </button>
            );
          })}
          <p className="text-[11px] leading-relaxed text-white/50">
            <span className="text-white/70">A stranger sees:</span> {strangerSees(post.visibility, current, coach.read?.score)}
            <br />
            <span className="text-white/70">A member sees:</span> {memberSees(post.visibility, current)}
          </p>
          <div className="border-t border-white/[0.06] pt-2">
            <p className="text-[11px] leading-relaxed text-white/45">{REMOVE_RESULT}</p>
            <button type="button" onClick={remove} disabled={!!busy}
                    className="mt-1 text-[11px] text-mcz-ember hover:underline">
              {busy === "remove" ? "Removing…" : "Remove the read from this post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
