import PriorityDials, { usePriorityInfo } from "../components/PriorityDials.jsx";
import { useEffect, useRef, useState } from "react";
import { playSound } from "../sound.js";
import { Copy, Download, Flag, Loader2, PenLine, Star } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { handOff, onHandoff } from "../handoff.js";
import { useCharLimit } from "../limits.js";
import { IconImg } from "../App.jsx";
import { IN_SHELL } from "../standalone.js";
import SpeakingIn from "../components/SpeakingIn.jsx";
import SentenceInspiration from "../components/SentenceInspiration.jsx";
import UseIn from "../components/UseIn.jsx";
import RunPrice from "../components/RunPrice.jsx";
import HashtagCount, { hashtagBody } from "../components/HashtagCount.jsx";
import { useRemembered } from "../useRemembered.js";
import RunClock from "../components/RunClock.jsx";
import { budgetOf, runTimeoutMs, shellRoyaltyLine, unknownOutcome, unknownOutcomeNote } from "../aiRun.js";
import { briefCut, cutNote, nextTierBrief, pickKind, visibleKinds } from "../sentencez.js";

// Sentence ConnectZ — the IntelligenceZ writer. Everything it shows about
// price, kinds, whose voice a kind is written in, how much a brief may hold, and
// the royalty rule comes from /api/economy/sentencez/; this screen states it and
// decides none of it.
//
// It is also the whole of the standalone Sentence ConnectZ app
// (standalone/sentencez/, VITE_STANDALONE="sentencez") and a screen of the
// IntelligenceZ app. In any shell (IN_SHELL) it has no ProfileZ, PostZ,
// DistributeZ or MembershipZ to hand a member to, so every control that would go
// to one is simply not rendered — a door to a screen that is not there is the
// dead button this app already knows too well — and nothing offers a purchase,
// which Play's billing rules would not allow from inside the app.

// The brief is what the writer works FROM, so its limit is its own ladder and
// not the 400 a post gets (see catalog.WRITER_BRIEF_CHARS). The count is stated
// while somebody types; what the next tier takes is the server's number, and is
// only offered where there is a tier to move to.
function BriefCount({ s, value, cut = 0 }) {
  if (!s || s.brief_limit == null) return null;
  const used = (value || "").length;
  if (s.brief_unlimited) {
    return <p className="text-[11px] text-white/35">{used.toLocaleString()} characters · no limit on your plan</p>;
  }
  const near = used >= s.brief_limit * 0.9;
  const next = IN_SHELL ? null : nextTierBrief(s);
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className={used >= s.brief_limit ? "text-mcz-ember" : near ? "text-mcz-gold" : "text-white/35"}>
          {used.toLocaleString()} / {s.brief_limit.toLocaleString()}
          {used >= s.brief_limit && " · limit reached"}
        </span>
        {next && near && (
          <span className="text-mcz-cyan">
            {next.label} takes {next.chars == null ? "no limit" : next.chars.toLocaleString()}{" "}
            <button className="font-semibold underline" onClick={() => goToSpot("membershipz", "membershipz-plans")}>Upgrade</button>
          </span>
        )}
      </div>
      {/* A brief cut to the limit says how much, rather than quietly being shorter. */}
      {cut > 0 && <p role="status" className="text-[11px] text-mcz-ember">{cutNote(cut, s.brief_limit)}</p>}
    </div>
  );
}

// Says whose voice a kind is written in BEFORE it is written, because the same
// button produces a resume in nobody's style and a lyric in K-Oth's.
//
// The server's own `voice_note` is the sentence when it sends one — it is the
// side that knows what the prompt asks for. The fallback below is what the prompt
// does today (every heading and paragraph opens with an emoji, Music ConnectZ is
// the recurring example, APA 7 from only the sources listed with the rest marked
// [CITATION NEEDED]), for an API that does not serve it yet.
function VoiceNote({ kind }) {
  if (!kind) return null;
  const text = typeof kind.voice_note === "string" && kind.voice_note.trim()
    ? kind.voice_note
    : kind.voice === "koth"
    ? "Written in K-Oth's voice."
    : kind.voice === "academic"
      ? "Written in K-Oth's academic register: every heading and paragraph opens with an emoji, Music ConnectZ is the recurring example, and it cites in APA 7 only the sources you list — anything else is marked [CITATION NEEDED]."
      : kind.invents_nothing
        ? "Written plainly from only what you give it. Anything you leave out becomes a [BRACKETED] blank — it adds nothing you did not say."
        : "Written plainly, to what you ask for.";
  return <p className="text-xs text-white/55">{text}</p>;
}

// Play asks an app that generates content with AI to let a member flag it from
// inside the app. One tap, and the owner's moderation queue is where it lands.
function ReportOutput({ work }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("other");
  const [note, setNote] = useState("");
  const [done, setDone] = useState("");
  const [err, setErr] = useState("");
  if (done) return <p className="text-xs text-white/55">{done}</p>;
  if (!open) {
    return (
      <button className="inline-flex items-center gap-1 text-[11px] text-white/45 hover:text-white" onClick={() => setOpen(true)}>
        <Flag size={11} /> Report this output
      </button>
    );
  }
  const send = async () => {
    setErr("");
    try {
      await api("/api/economy/report/", { method: "POST", body: { item: `sentence:${work.id}`, reason, note } });
      setDone("Reported. It's in the owner's queue.");
    } catch (e) { setErr(e.message || "That didn't send."); }
  };
  return (
    <div className="space-y-2 rounded-lg border border-white/10 p-3 text-xs">
      <label className="block text-white/60" htmlFor={`rep-${work.id}`}>What is wrong with it?</label>
      <select data-nomemo="true" id={`rep-${work.id}`} className="neon-input" value={reason} onChange={(e) => setReason(e.target.value)}>
        <option value="harassment">Harassment</option>
        <option value="hate">Hate or abuse</option>
        <option value="nsfw">Adult content</option>
        <option value="other">Something else</option>
      </select>
      <input className="neon-input w-full" maxLength={280} placeholder="Anything we should know (optional)"
             value={note} onChange={(e) => setNote(e.target.value)} />
      {err && <p role="alert" className="text-mcz-ember">{err}</p>}
      <div className="flex gap-3">
        <button className="re-btn !w-auto px-3" onClick={send}>Send report</button>
        <button className="text-white/50 hover:text-white" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

function download(name, text) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { /* the Copy button is still there */ }
}

export default function SentenceConnectZ() {
  const cl = useCharLimit();
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [cutBy, setCutBy] = useState(0);
  const [kind, setKind] = useState(IN_SHELL ? "resume" : "lyrics");
  const [topic, setTopic] = useState("");
  const [genre, setGenre] = useState("");
  const [tags, setTags] = useRemembered("promo-hashtags", "");
  const [majority, setMajority] = useState(2);
  const [minority, setMinority] = useState(1);
  const [busy, setBusy] = useState(false);
  const [work, setWork] = useState(null);
  const [draft, setDraft] = useState("");
  const [royalty, setRoyalty] = useState(null);
  const [copied, setCopied] = useState(false);
  const [items, setItems] = useState(null);      // a fixer's ranked suggestions
  const [picked, setPicked] = useState([]);      // which of them the member is using
  const [hidden, setHidden] = useState(false);   // the suggestions, minimised
  const timer = useRef(null);

  // The coach hands a weak score here with the writer for it already chosen, and
  // the genre it was scored in. The bars themselves aren't carried: the coach
  // never kept the member's words, so they paste the ones they want fixed.
  useEffect(() => (IN_SHELL ? undefined : onHandoff("sentenceconnectz", (p) => {
    if (p.kind) setKind(String(p.kind));
    // WriteZ has the member's own words, so they arrive in the brief.
    if (p.text) setTopic(String(p.text));
    const g = p.style || p.genre;
    if (g) setGenre(String(g).slice(0, 60));
  })), []);

  const load = () => api("/api/economy/sentencez/").then(setS).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const kinds = visibleKinds(s?.kinds || [], IN_SHELL);
  // Land on something the member can use. The standalone drops the persona-gated
  // agreements entirely (there is no ProfileZ to add the persona in), and an older
  // API may not know a kind this build asks for first.
  useEffect(() => {
    if (kinds.length && !kinds.some((k) => k.key === kind)) setKind(pickKind(kinds, kind));
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps

  // The royalty is the server's number — on the piece when it sends one, else the
  // screen's GET. Never a figure typed here: with neither, no share is stated.
  const open = (w) => {
    const its = Array.isArray(w.items) ? w.items : null;
    setItems(its); setHidden(false);
    // Every suggestion starts selected: "suggest all", the member narrows down.
    setPicked(its ? its.map((i) => i.idx) : []);
    setWork(w); setDraft(w.text);
    const pct = w.royalty_pct ?? s?.royalty_pct;
    setRoyalty(pct == null ? null : { royalty_pct: pct, kept_share: 1 });
  };

  useEffect(() => {
    // The royalty is for taking a piece into DistributeZ, CollabZ or BattleZ; the
    // standalone has none of them, so it neither asks nor states one.
    if (!work || IN_SHELL) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api(`/api/economy/sentencez/${work.id}/royalty/`, { method: "POST", body: { text: draft } })
        .then(setRoyalty).catch(() => {});
    }, 500);
    return () => clearTimeout(timer.current);
  }, [draft, work]);

  const prioInfo = usePriorityInfo();
  const [prio, setPrio] = useState({});
  const dialsHere = !!prioInfo?.writing_kinds?.includes(kind);

  async function write() {
    setErr(""); setBusy(true);
    const body = { kind, topic, genre };
    if (dialsHere && Object.keys(prio).length) body.priorities = prio;
    if (kind === "lyrics") Object.assign(body, { majority, minority });
    if (current?.hashtags) Object.assign(body, hashtagBody(tags));
    let w;
    try {
      // The wait has to outlast the server's: api.js stops at 30s, a write takes
      // up to a minute or more, and the server goes on to charge and save a piece
      // the browser has already given up on.
      w = await api("/api/economy/sentencez/", { method: "POST", body, timeoutMs: runTimeoutMs(s?.budget_seconds) });
    } catch (e) {
      playSound("build_fail");
      // Silence is not "nothing was charged": the write may have finished.
      if (unknownOutcome(e)) { load(); setErr(unknownOutcomeNote(e, "Your recent pieces")); }
      else { if (e.status === 402) load(); setErr(e.message); }
      setBusy(false);
      return;
    }
    playSound("build_done");
    open(w);
    load();
    setBusy(false);
    // Said, not hidden: the writer can miscount, and the text is what it is.
    if (w?.hashtags && w.hashtags.got !== w.hashtags.asked) {
      setErr(`You asked for ${w.hashtags.asked} hashtag${w.hashtags.asked === 1 ? "" : "s"}; the writer gave ${w.hashtags.got}. Add or cut to taste.`);
    }
  }

  // The draft is the lines the member has ticked, in the order they are shown.
  // Using fewer lines keeps less of the original, and the royalty (the server's
  // number, re-read as the draft changes) scales with it.
  const toggle = (idx) => {
    const next = picked.includes(idx) ? picked.filter((i) => i !== idx) : [...picked, idx];
    setPicked(next);
    setDraft((items || []).filter((i) => next.includes(i.idx)).map((i) => i.line).join("\n"));
  };
  async function rate(idx, stars) {
    try {
      const r = await api(`/api/economy/sentencez/${work.id}/punchline/${idx}/rate/`, { method: "POST", body: { stars } });
      setItems(r.items);
    } catch (e) { setErr(e.message); }
  }

  const current = kinds.find((k) => k.key === kind);
  const locked = current && current.allowed === false;
  const max = s?.rhyme_max ?? 4;
  const limited = s && s.brief_limit != null && !s.brief_unlimited;
  // A brief held to the limit says how much was left off. The textarea takes the
  // whole paste (no maxLength, which cut it before any handler could see it) and
  // this is where it is trimmed.
  const takeBrief = (v) => {
    const { kept, cut } = limited ? briefCut(v, s.brief_limit) : { kept: v, cut: 0 };
    setTopic(kept);
    setCutBy(cut);
  };
  // The royalty line is about taking a piece to the music platform, so a shell
  // says it only where a member could plausibly do that.
  const royaltyLine = s?.royalty_rule && (!IN_SHELL || kind === "lyrics")
    ? (IN_SHELL ? shellRoyaltyLine("lyric", s.royalty_rule) : s.royalty_rule) : "";
  // What a PostZ post holds, said next to the button that sends a draft there.
  const postTooLong = !!work && cl.ready && !cl.unlimited && draft.length > cl.limit;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="sentencez.png" alt="Sentence ConnectZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">Sentence ConnectZ</h2>
          <p className="text-sm text-white/60">Resumes, cover letters, lyrics, poems, bios, captions, posts and essays — written by AI from what you tell it.</p>
        </div>
      </header>

      {s && !s.configured && (
        <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">The writer isn't switched on yet.</p>
      )}

      <div className="neon-frame space-y-4 p-4" data-tour="sentencez-write">
        <div className="flex flex-wrap gap-2" role="group" aria-label="What to write">
          {kinds.map((k) => (
            <button
              key={k.key}
              aria-pressed={kind === k.key}
              onClick={() => setKind(k.key)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${kind === k.key
                ? "border-mcz-cyan bg-mcz-cyan/15 text-white"
                : "border-white/15 text-white/70 hover:border-white/40"} ${k.allowed ? "" : "opacity-60"}`}
            >
              {k.emoji} {k.label}{!k.allowed && " 🔒"}
            </button>
          ))}
        </div>

        {locked ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
            {current.label}s are written for members with the {current.needs.join(" or ")} PersonaZ.{" "}
            <button className="re-link" onClick={() => goToSpot("profilez", "personas")}>Add one in ProfileZ</button>
          </div>
        ) : (
          <>
            <VoiceNote kind={current} />
            {!IN_SHELL && current?.takes_voice && <SpeakingIn surface="writer" />}
            {!IN_SHELL && (current?.fixer || ["lyrics", "poem"].includes(kind)) && (
              <SentenceInspiration info={s} kind={kind} label={current?.label || kind}
                onDirection={(d) => takeBrief(`${topic}${topic ? "\n\n" : ""}Inspiration direction (how a song I admire does this; use none of its words): ${d}`)} />
            )}
            <textarea
              className="neon-input min-h-28 w-full"
              aria-label="What to write about"
              placeholder={current?.hint || "What should it say?"}
              value={topic}
              onChange={(e) => takeBrief(e.target.value)}
            />
            <BriefCount s={s} value={topic} cut={cutBy} />
            <input className="neon-input w-full" maxLength={60} aria-label={current?.style_label || "Genre / style (optional)"}
              placeholder={current?.style_label || "Genre / style (optional)"}
              value={genre} onChange={(e) => setGenre(e.target.value)} />
            {current?.hashtags && <HashtagCount value={tags} onChange={setTags} max={s?.hashtag_max || 30} />}

            {kind === "lyrics" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-white/70">
                  Majority rhyme — syllables at the end of most lines that must rhyme
                  <input type="number" min={0} max={max} className="neon-input mt-1 w-full"
                    value={majority} onChange={(e) => setMajority(Math.max(0, Math.min(max, Number(e.target.value) || 0)))} />
                </label>
                <label className="text-sm text-white/70">
                  Minority rhyme — syllables that rhyme on the remaining lines
                  <input type="number" min={0} max={max} className="neon-input mt-1 w-full"
                    value={minority} onChange={(e) => setMinority(Math.max(0, Math.min(max, Number(e.target.value) || 0)))} />
                </label>
              </div>
            )}

            {dialsHere && <PriorityDials medium="writing" value={prio} onChange={setPrio} disabled={busy} />}

            <div className="flex flex-wrap items-center gap-3">
              {/* Live only once the price is known and the run can be paid for: with
                  no answer from the server there is no price to have stated. */}
              <button className="neon-btn-primary !w-auto px-5"
                      disabled={busy || !topic.trim() || !s || !s.configured || !s.can_run} onClick={write}>
                {busy ? <Loader2 className="animate-spin" size={16} /> : <PenLine size={16} />} Write it
              </button>
              <RunPrice s={s} noun="writes" inShell={IN_SHELL} failed={!s && !!err} onRetry={load} />
              <span className="text-[11px] text-white/40">A run that comes back empty isn't charged.</span>
              <RunClock running={busy} budgetSeconds={budgetOf(s)} what="Writing" />
            </div>
            {royaltyLine && <p className="text-xs text-white/50">{royaltyLine}</p>}
          </>
        )}
        {err && <p role="alert" className="text-sm text-mcz-ember">{err}</p>}
      </div>

      {work && (
        <div key={work.id} className="mcz-reveal neon-frame space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{work.label}</h3>
            {!IN_SHELL && royalty && (
              <span className="text-xs text-white/60">
                If used in DistributeZ, CollabZ or BattleZ: <span className="text-mcz-ember">−{royalty.royalty_pct}%</span> to K-Oth
                <span className="text-white/40"> ({Math.round(royalty.kept_share * 100)}% of the original kept)</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-white/45">Written by AI. Check it before you use it.</p>
          {work.legal_note && <p className="rounded-lg bg-mcz-gold/10 px-3 py-2 text-xs text-mcz-gold">{work.legal_note}</p>}
          {work.note && <p className="rounded-lg bg-mcz-gold/10 px-3 py-2 text-xs text-mcz-gold">{work.note}</p>}
          {items && (
            <div className="space-y-2" data-tour="sentencez-fixes">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-white/50">{work.rank_note}</p>
                <button className="re-link text-[11px]" onClick={() => setHidden((h) => !h)}>
                  {hidden ? `Show the ${items.length} suggestions` : "Minimise"}
                </button>
              </div>
              {!hidden && items.map((it) => (
                <div key={it.idx} className="space-y-1 rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                  <label className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" checked={picked.includes(it.idx)} onChange={() => toggle(it.idx)}
                           aria-label={`Use: ${it.line}`} />
                    <span className="font-semibold text-white">{it.line}</span>
                  </label>
                  <p className="text-[11px] text-mcz-cyan/80">
                    {it.technique_label}{it.where ? ` · ${it.where}` : ""}
                    {" · "}
                    {it.community
                      ? <span className="text-emerald-300">members rate this kind {it.community.avg}★ ({it.community.n} ratings)</span>
                      : <span className="text-white/45">no member ratings for this kind yet — rate it to help rank them</span>}
                  </p>
                  {it.why && <p className="text-[12px] text-white/70">{it.why}</p>}
                  <div className="flex items-center gap-1" role="group" aria-label="Rate this suggestion">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => rate(it.idx, n)} aria-label={`${n} star${n === 1 ? "" : "s"}`}
                              className={(it.my_stars || 0) >= n ? "text-mcz-gold" : "text-white/25 hover:text-white/60"}>
                        <Star size={14} fill={(it.my_stars || 0) >= n ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!hidden && <p className="text-[11px] text-white/45">
                Tick the ones you will use — the box below holds exactly those. Using them anywhere that earns pays
                K-Oth's royalty on the part you keep, shown under the box before you attach anything.
              </p>}
            </div>
          )}
          <textarea className="neon-input min-h-64 w-full font-mono text-sm" aria-label={`${work.label}, editable`}
                    value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex flex-wrap items-center gap-3">
            <button className="re-btn !w-auto px-4" onClick={() => {
              navigator.clipboard?.writeText(draft).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
            }}><Copy size={14} /> {copied ? "Copied" : "Copy"}</button>
            <button className="re-btn !w-auto px-4" onClick={() => download(`${work.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`, draft)}>
              <Download size={14} /> Save as text
            </button>
            {!IN_SHELL && (
              // The draft goes WITH the jump: a bare jump opened an empty composer.
              <button className="re-link" onClick={() => handOff("postz", "composer", { title: work.label, description: draft })}>
                Post it in PostZ
              </button>
            )}
            {!IN_SHELL && postTooLong && (
              <span className="text-[11px] text-mcz-gold">
                Your posts hold {cl.limit.toLocaleString()} characters; this draft is {draft.length.toLocaleString()} — you'll trim it in the composer.
              </span>
            )}
          </div>
          {!IN_SHELL && royalty && <UseIn source="sentence" sourceId={work.id} pct={royalty.royalty_pct} text={draft} />}
          <ReportOutput work={work} />
        </div>
      )}

      {s?.works?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/70">Your recent pieces</h3>
          {s.works.map((w) => (
            <button key={w.id} onClick={() => open(w)}
              className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:border-white/30">
              <span className="text-white/80">{w.label}</span>
              <span className="text-white/40"> — {w.topic.slice(0, 80)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
