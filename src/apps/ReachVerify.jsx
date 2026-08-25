// ReachZ — prove an account is yours, and switch on hourly Energy.
//
// Why this screen exists at all:
//
// Energy regenerates from REACH, and reach is the MEDIAN follower count across
// your VERIFIED sources. Unverified links are excluded on purpose — otherwise
// anybody pastes a stranger's big account and mints Energy off somebody else's
// audience. Which means a member with nothing verified earns exactly zero an
// hour, forever, and nothing in the app has ever told them that or given them
// the way out.
//
// The API for it has been complete for a long time: `social_verify.py` serves
// three actions and a review queue. **Nothing in the client called any of
// them.** The one thing that permanently fixes a member's cold start could
// only be done by the owner, by hand, against the raw endpoint. That is the
// hole this fills.
//
// Two routes, and both are offered because they fail in different places:
//
//   • Instant (`match`) — we read the public page and judge whether it's you.
//     One tap, nothing to paste. A verdict of no or unsure does NOT refuse:
//     it goes to a person, because an artist's stage name differing from their
//     username is the normal case, not a red flag.
//   • Code-in-bio (`start` → `check`) — definitive. You paste our code in the
//     bio, we read it back. Slower, but it cannot be wrong about who you are.
//
// House rules honoured here:
//   - The cost and the gain are stated BEFORE the button, not in the result.
//     Verifying is free and a failed check charges nothing, and both of those
//     are said out loud rather than left to be discovered.
//   - Every number comes from the server. The hourly rate is re-read after a
//     verify rather than recomputed here, because the tier divisor and the
//     BadgeZ multiplier are the server's business and a second implementation
//     of them would drift.
//   - A failure shows the server's real reason, plus its `hint` when it sent
//     one. Never a cheerful lie.
//   - Nothing is a dead end: every row links out to the profile it's about,
//     and a queued review shows the faster route rather than just "waiting".
import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck, Clock, ExternalLink, Loader2, Plus, ShieldQuestion, Sparkles, Trash2, Zap,
} from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { ENERGY } from "../resources.js";

const VERIFY = "/api/economy/social/verify/";
const REVIEWS = "/api/economy/social/reviews/";

const fmt = (n) => Number(n ?? 0).toLocaleString();

/** Same normalisation the server matches links on, so a row we drew and a row
 *  it wrote back are the same row even when one has a trailing slash. */
const norm = (u) => String(u || "").trim().replace(/\/+$/, "").toLowerCase();

const hostOf = (u) => {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
};

/** The server sends more than a message on a failure. `hint` is the half that
 *  tells you what to do instead, and it only ever appeared in the payload. */
const reasonOf = (e) => [e?.message, e?.data?.hint].filter(Boolean).join(" ");

function State({ link }) {
  if (link.verified) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
        <BadgeCheck size={12} /> Verified{link.verified_by === "manual" ? " by a person" : ""} — counting
      </span>
    );
  }
  if (link.review === "pending") {
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-mcz-gold">
        <Clock size={12} /> With a reviewer
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] text-white/40">
      <ShieldQuestion size={12} /> Not counting toward reach yet
    </span>
  );
}

function Source({ link, code, busy, onMatch, onStart, onCheck, onForget, review }) {
  const followers = link.verified_count ?? link.followers;
  const working = busy === link.url;

  return (
    <div className={`rounded-lg border p-3 ${link.verified
      ? "border-emerald-400/25 bg-emerald-400/[0.04]"
      : link.review === "pending"
        ? "border-mcz-gold/30 bg-mcz-gold/[0.04]"
        : "border-white/[0.08] bg-white/[0.02]"}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[13px] font-semibold text-white">{link.label || hostOf(link.url)}</span>
        {link.verified && followers != null && (
          <span className="text-[12px] font-bold tabular-nums text-white/80">
            {fmt(followers)} followers
          </span>
        )}
        <a href={link.url} target="_blank" rel="noreferrer noopener"
           className="ml-auto flex items-center gap-1 text-[11px] text-white/40 hover:text-white">
          {hostOf(link.url)} <ExternalLink size={10} />
        </a>
      </div>

      <div className="mt-1"><State link={link} /></div>

      {/* Why it's waiting, in the reviewer's own words rather than a spinner.
          Being in a queue you can't see is its own small cruelty. */}
      {link.review === "pending" && review?.ai_reason && (
        <p className="mt-1.5 text-[11px] italic leading-relaxed text-white/45">
          “{review.ai_reason}” — a person is checking. It doesn't count toward your reach until it clears.
        </p>
      )}

      {code && (
        <div className="mt-2 rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.05] p-2.5">
          <p className="text-[11px] leading-relaxed text-white/70">{code.instructions}</p>
          <code className="mt-1.5 inline-block rounded bg-black/50 px-2 py-1 font-mono text-[13px] font-bold tracking-wider text-mcz-cyan">
            {code.code}
          </code>
        </div>
      )}

      {!link.verified && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {code ? (
            <button className="neon-btn-primary !w-auto px-4 !py-1.5 text-xs disabled:opacity-50"
                    onClick={() => onCheck(link)} disabled={working}>
              {working ? <Loader2 size={13} className="animate-spin" /> : <BadgeCheck size={13} />}
              {" "}It's in my bio — check now
            </button>
          ) : (
            <>
              {/* Instant first: it's one tap and it's right most of the time.
                  The consequence of it being wrong is stated on the button's
                  own line, because that is the thing worth knowing before you
                  press it — not after.
                  A row already with a reviewer doesn't get this button at all.
                  It was rendered disabled at first, which looked identical to
                  the live one — a bright primary button that does nothing when
                  you press it is worse than no button. */}
              {link.review !== "pending" && (
                <button className="neon-btn-primary !w-auto px-4 !py-1.5 text-xs disabled:opacity-50"
                        onClick={() => onMatch(link)} disabled={working}>
                  {working ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {" "}Verify instantly
                </button>
              )}
              <button className={`!text-[11px] hover:!text-white disabled:opacity-50 ${
                link.review === "pending"
                  ? "neon-btn-primary !w-auto px-4 !py-1.5 !text-xs hover:!text-white"
                  : "pill"}`}
                      onClick={() => onStart(link)} disabled={working}>
                {working && link.review === "pending"
                  ? <Loader2 size={13} className="animate-spin" />
                  : null}
                {link.review === "pending" ? "Settle it now with a code" : "Use a code instead"}
              </button>
            </>
          )}
          {onForget && (
            <button className="ml-auto flex items-center gap-1 text-[11px] text-white/30 hover:text-mcz-ember"
                    onClick={() => onForget(link)} disabled={working} title="Remove this link">
              <Trash2 size={11} /> Remove
            </button>
          )}
        </div>
      )}

      {!link.verified && !code && (
        <p className="mt-1.5 text-[10px] leading-relaxed text-white/35">
          {link.review === "pending"
            ? "The code route settles it in a minute if you'd rather not wait for a person."
            : "We read the public page. If we can't tell it's you it goes to a person — that's not a refusal, and the code route settles it instantly."}
        </p>
      )}
    </div>
  );
}

function Queue({ rows, onSettle, busy }) {
  const [notes, setNotes] = useState({});
  return (
    <div className="space-y-2" data-tour="social-review-queue">
      <div className="flex items-baseline gap-2">
        <h3 className="re-label">Review queue</h3>
        <span className="text-[11px] text-white/30">
          {rows.length} waiting · approving lets those followers pay Energy
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[13px] font-semibold text-white">@{r.username}</span>
            {r.handle && <span className="text-[11px] text-white/50">{r.handle}</span>}
            <span className="text-[12px] font-bold tabular-nums text-white/70">
              claims {fmt(r.claimed_followers)}
            </span>
            <a href={r.url} target="_blank" rel="noreferrer noopener"
               className="ml-auto flex items-center gap-1 text-[11px] text-white/40 hover:text-white">
              {hostOf(r.url)} <ExternalLink size={10} />
            </a>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-white/55">
            <span className="uppercase tracking-wide text-white/35">{r.ai_verdict}</span>
            {r.ai_reason ? ` — ${r.ai_reason}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              className="min-w-[10rem] flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-[12px] text-white placeholder-white/30 outline-none focus:border-mcz-ember/60"
              placeholder="Note (sent to them if you reject)"
              value={notes[r.id] || ""}
              onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
            />
            <button className="neon-btn-primary !w-auto px-4 !py-1.5 text-xs"
                    onClick={() => onSettle(r, "approve", notes[r.id] || "")}
                    disabled={busy === r.id}>
              {busy === r.id ? <Loader2 size={13} className="animate-spin" /> : <BadgeCheck size={13} />} Approve
            </button>
            <button className="pill !text-[11px] hover:!text-mcz-ember"
                    onClick={() => onSettle(r, "reject", notes[r.id] || "")}
                    disabled={busy === r.id}>
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReachVerify() {
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [quest, setQuest] = useState(null);
  const [codes, setCodes] = useState({});       // url → {code, instructions}
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);         // {tone: "good"|"wait"|"bad", text}
  const [delta, setDelta] = useState(null);     // reach change from the last verify
  const [draft, setDraft] = useState({ label: "", url: "" });
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    api("/api/economy/profile/").then(setProfile).catch((e) => {
      setProfile({});
      setMsg({ tone: "bad", text: e.message || "Couldn't load your sources." });
    });
    // Both of these are extras: a member with no queue and a server without
    // QuestZ should still get the screen. Failing quietly is right here and
    // wrong for the profile above, which is the screen's actual subject.
    api(REVIEWS).then(setReviews).catch(() => setReviews({ mine: [], queue: null }));
    api("/api/economy/questz/")
      .then((b) => setQuest(asList(b?.quests).find((q) => q.id === "reach-verified") || null))
      .catch(() => setQuest(null));
  }, []);
  useEffect(() => { load(); }, [load]);

  const links = asList(profile?.links).filter((l) => l && typeof l === "object" && l.url);
  const sources = asList(profile?.sources);
  const mcz = sources.find((s) => s.label === "Music ConnectZ");
  const reach = profile?.reach_median ?? 0;
  const rate = profile?.energy_per_hour ?? 0;
  const verifiedCount = sources.filter((s) => s.verified).length;
  const myReviews = asList(reviews?.mine);
  const queue = reviews?.queue;                 // null unless you're the owner

  const reviewFor = (url) =>
    myReviews.find((r) => norm(r.url) === norm(url) && r.status === "pending");

  /** Fold a verify response back in: the server returns the refreshed sources
   *  and median, and the true hourly rate needs a profile re-read because the
   *  tier divisor and BadgeZ multiplier live there. */
  async function settle(res, url, note) {
    const before = reach;
    setCodes((c) => { const n = { ...c }; delete n[url]; return n; });
    if (typeof res?.reach_median === "number" && res.reach_median !== before) {
      setDelta(res.reach_median - before);
    }
    setMsg(note);
    try { setProfile(await api("/api/economy/profile/")); } catch { load(); }
    api(REVIEWS).then(setReviews).catch(() => {});
    api("/api/economy/questz/")
      .then((b) => setQuest(asList(b?.quests).find((q) => q.id === "reach-verified") || null))
      .catch(() => {});
  }

  async function onMatch(link) {
    setBusy(link.url); setMsg(null); setDelta(null);
    try {
      const r = await api(VERIFY, {
        method: "POST",
        body: { action: "match", url: link.url, label: link.label || "" },
      });
      if (r?.verified) {
        await settle(r, link.url, {
          tone: "good",
          text: `${link.label || hostOf(link.url)} is yours — ${fmt(r.followers)} followers now count toward your reach.`,
        });
      } else {
        // 202. Accepted, queued, and explicitly not a refusal — the server
        // sends the copy for that, including the faster way round.
        await settle(r, link.url, {
          tone: "wait",
          text: [r?.detail, r?.faster].filter(Boolean).join(" "),
        });
      }
    } catch (e) {
      setMsg({ tone: "bad", text: reasonOf(e) || "That check didn't complete. Nothing was charged." });
    } finally { setBusy(""); }
  }

  async function onStart(link) {
    setBusy(link.url); setMsg(null);
    try {
      const r = await api(VERIFY, {
        method: "POST",
        body: { action: "start", url: link.url, label: link.label || "" },
      });
      setCodes((c) => ({ ...c, [link.url]: { code: r.code, instructions: r.instructions } }));
      if (!links.some((l) => norm(l.url) === norm(link.url))) load();
    } catch (e) {
      setMsg({ tone: "bad", text: reasonOf(e) || "Couldn't issue a code." });
    } finally { setBusy(""); }
  }

  async function onCheck(link) {
    setBusy(link.url); setMsg(null); setDelta(null);
    try {
      const r = await api(VERIFY, { method: "POST", body: { action: "check", url: link.url } });
      await settle(r, link.url, {
        tone: "good",
        text: r?.followers != null
          ? `Verified — ${fmt(r.followers)} followers now count toward your reach.`
          : "Verified. That account now counts toward your reach.",
      });
    } catch (e) {
      // The common one here is "couldn't find MCZ-XXXXXX on that profile yet",
      // which is actionable and must survive intact.
      setMsg({ tone: "bad", text: reasonOf(e) || "Couldn't check that page." });
    } finally { setBusy(""); }
  }

  /** Links live on the profile, so adding and removing one is a profile save.
   *  Verified links are never removable from here — losing a verification by
   *  a mis-tap would be an expensive accident. */
  async function saveLinks(next, ok) {
    setBusy("links"); setMsg(null);
    try {
      const r = await api("/api/economy/profile/", { method: "POST", body: { links: next } });
      setProfile(r);
      setDraft({ label: "", url: "" });
      setAdding(false);
      if (ok) setMsg(ok);
    } catch (e) {
      setMsg({ tone: "bad", text: e.message || "Couldn't save that link." });
    } finally { setBusy(""); }
  }

  function onAdd(e) {
    e.preventDefault();
    const url = draft.url.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setMsg({ tone: "bad", text: "That needs to be a full public link — https://… and reachable without logging in." });
      return;
    }
    if (links.some((l) => norm(l.url) === norm(url))) {
      setMsg({ tone: "bad", text: "That account is already on the list." });
      return;
    }
    saveLinks([...links, { label: draft.label.trim() || hostOf(url), url }], {
      tone: "wait",
      text: "Added. It doesn't count toward your reach until it's verified — that's the next button.",
    });
  }

  const onForget = (link) =>
    saveLinks(links.filter((l) => norm(l.url) !== norm(link.url)),
              { tone: "wait", text: "Removed." });

  async function onSettle(row, decision, note) {
    setBusy(row.id); setMsg(null);
    try {
      await api(REVIEWS, { method: "POST", body: { id: row.id, decision, note } });
      setMsg({ tone: "good", text: `@${row.username} ${decision === "approve" ? "approved" : "rejected"} — they've been told.` });
      api(REVIEWS).then(setReviews).catch(() => {});
    } catch (e) {
      setMsg({ tone: "bad", text: e.message || "Couldn't settle that one." });
    } finally { setBusy(""); }
  }

  const TONE = {
    good: "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-200",
    wait: "border-mcz-gold/30 bg-mcz-gold/[0.06] text-mcz-gold",
    bad: "border-mcz-ember/40 bg-mcz-ember/[0.07] text-mcz-ember",
  };

  return (
    <div className="space-y-4" data-tour="social-verify">
      <div className="re-card space-y-3">
        <div className="flex items-baseline gap-2">
          <h3 className="re-label">Your reach — and the Energy it pays</h3>
          {profile === null && <Loader2 size={12} className="animate-spin text-white/30" />}
        </div>

        {/* The readout. Reach is the input; the hourly rate is the thing a
            member actually feels, and it had never been on screen anywhere. */}
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-white tabular-nums">{fmt(reach)}</span>
              {delta != null && delta !== 0 && (
                <span className={`text-[13px] font-bold ${delta > 0 ? "text-emerald-300" : "text-mcz-ember"}`}>
                  {delta > 0 ? "▲" : "▼"} {fmt(Math.abs(delta))}
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/40">
              median across {verifiedCount} verified source{verifiedCount === 1 ? "" : "s"}
            </p>
          </div>
          <div>
            <div className="text-[15px] font-bold text-emerald-300 tabular-nums">
              +{fmt(rate)} {ENERGY} <span className="text-[11px] font-normal text-white/45">an hour</span>
            </div>
            <p className="text-[11px] text-white/40">
              {rate > 0 ? "already accruing, awake or not" : "nothing verified — this stays at zero"}
            </p>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-white/55">
          Reach is the <b>median</b>, not the sum, so one giant account can't stand in for your
          whole audience — it's your typical pull. Only <b>verified</b> sources count, because
          reach pays Energy and a link nobody checked is just a number somebody typed.
        </p>

        {/* Cost and gain, before the buttons rather than after them. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/[0.06] pt-2.5 text-[11px]">
          <span className="text-white/55">
            Verifying is <b className="text-white/80">free</b> — no 🏷️, no {ENERGY}, and a check that
            fails costs nothing.
          </span>
          {quest && !quest.claimed && (
            <span className="font-semibold text-emerald-300">
              +{quest.energy} {ENERGY} once, the first time one clears
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {/* Music ConnectZ is a source too, and it's the one nobody has to
            prove — showing it makes the median legible instead of magic. */}
        {mcz && (
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[13px] font-semibold text-white">Music ConnectZ</span>
              <span className="text-[12px] font-bold tabular-nums text-white/80">
                {fmt(mcz.followers)} followers
              </span>
              <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                <BadgeCheck size={12} /> Ours — always counts
              </span>
            </div>
          </div>
        )}

        {links.map((l) => (
          <Source
            key={l.url}
            link={l}
            code={codes[l.url]}
            review={reviewFor(l.url)}
            busy={busy}
            onMatch={onMatch}
            onStart={onStart}
            onCheck={onCheck}
            onForget={l.verified ? null : onForget}
          />
        ))}

        {profile && !links.length && (
          <p className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-[12px] leading-relaxed text-white/55">
            No outside accounts yet. Your reach is your Music ConnectZ followers alone, which is why
            your hourly {ENERGY} is where it is. Add one you already have — the audience is already
            yours, this only proves it.
          </p>
        )}
      </div>

      {adding ? (
        <form onSubmit={onAdd} className="re-card space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              className="w-32 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60"
              placeholder="Instagram" value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
            <input
              className="min-w-[14rem] flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60"
              placeholder="https://instagram.com/yourhandle" value={draft.url} autoFocus
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            />
          </div>
          <p className="text-[11px] text-white/35">
            It has to be viewable without logging in — we read the same page anyone else would.
          </p>
          <div className="flex gap-2">
            <button className="neon-btn-primary !w-auto px-4 !py-1.5 text-xs" disabled={busy === "links"}>
              {busy === "links" ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add it
            </button>
            <button type="button" className="pill !text-[11px] hover:!text-white"
                    onClick={() => { setAdding(false); setDraft({ label: "", url: "" }); }}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="pill flex items-center gap-1 !text-[11px] hover:!text-white"
                onClick={() => { setAdding(true); setMsg(null); }}>
          <Plus size={12} /> Add an account
        </button>
      )}

      {msg && (
        <p className={`rounded-lg border px-3 py-2 text-[12px] leading-relaxed ${TONE[msg.tone] || TONE.wait}`}>
          {msg.text}
        </p>
      )}

      {/* Your own pending reviews, even for links you've since removed —
          something in a queue you can't see is indistinguishable from
          something that was dropped. */}
      {myReviews.some((r) => r.status === "pending" && !links.some((l) => norm(l.url) === norm(r.url))) && (
        <p className="text-[11px] text-white/40">
          <Clock size={11} className="mr-1 inline" />
          You have {myReviews.filter((r) => r.status === "pending").length} account
          {myReviews.filter((r) => r.status === "pending").length === 1 ? "" : "s"} with a reviewer.
          You'll get a notification either way.
        </p>
      )}

      {/* Owner only — the server decides, by returning a queue at all. */}
      {asList(queue).length > 0 && (
        <Queue rows={asList(queue)} onSettle={onSettle} busy={busy} />
      )}

      {rate === 0 && verifiedCount <= 1 && (
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-white/35">
          <Zap size={12} className="mt-0.5 shrink-0 text-mcz-gold" />
          Until something is verified, quests in MimeZ are where your Energy comes from. They're
          the income that exists before reach does.
        </p>
      )}
    </div>
  );
}
