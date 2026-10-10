import { useEffect, useRef, useState } from "react";
import { playSound } from "../sound.js";
import { Copy, Download, Flag, Loader2, PenLine } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { IconImg } from "../App.jsx";
import { PROMPTZ } from "../resources.js";
import UseIn from "../components/UseIn.jsx";
import { nextTierBrief, pickKind, visibleKinds } from "../sentencez.js";

// Sentence ConnectZ — the IntelligenceZ writer. Everything it shows about
// price, kinds, whose voice a kind is written in, how much a brief may hold, and
// the royalty rule comes from /api/economy/sentencez/; this screen states it and
// decides none of it.
//
// It is also the whole of the standalone Sentence ConnectZ app
// (standalone/sentencez/, VITE_STANDALONE="sentencez"). There it has no ProfileZ,
// PostZ, DistributeZ or MembershipZ to hand a member to, so every control that
// would go to one is simply not rendered — a door to a screen that is not there
// is the dead button this app already knows too well — and nothing offers a
// purchase, which Play's billing rules would not allow from inside the app.

const STANDALONE = import.meta.env.VITE_STANDALONE === "sentencez";

function Price({ s }) {
  if (!s) return null;
  if (s.free_today) {
    return (
      <span className="text-[11px] text-emerald-300">
        Free today <span className="text-white/45">— uses 1 of the {s.daily_remaining} {PROMPTZ} you have left</span>
      </span>
    );
  }
  if (STANDALONE && !s.can_run) {
    // Nothing to buy here, so no price to state — only the honest fact. The free
    // runs renew every day, which is the whole of what a member can do about it.
    return <span className="text-[11px] text-white/55">No free writes left today. They renew tomorrow.</span>;
  }
  return (
    <span className="text-[11px] text-mcz-ember">
      −{s.cost_cents} {PROMPTZ} <span className="text-white/35">— no free prompts left today</span>
    </span>
  );
}

// The brief is what the writer works FROM, so its limit is its own ladder and
// not the 400 a post gets (see catalog.WRITER_BRIEF_CHARS). The count is stated
// while somebody types; what the next tier takes is the server's number, and is
// only offered where there is a tier to move to.
function BriefCount({ s, value }) {
  if (!s || s.brief_limit == null) return null;
  const used = (value || "").length;
  if (s.brief_unlimited) {
    return <p className="text-[11px] text-white/35">{used.toLocaleString()} characters · no limit on your plan</p>;
  }
  const near = used >= s.brief_limit * 0.9;
  const next = STANDALONE ? null : nextTierBrief(s);
  return (
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
  );
}

// Says whose voice a kind is written in BEFORE it is written, because the same
// button produces a resume in nobody's style and a lyric in K-Oth's.
function VoiceNote({ kind }) {
  if (!kind) return null;
  const text = kind.voice === "koth"
    ? "Written in K-Oth's voice."
    : kind.voice === "academic"
      ? "Written in K-Oth's academic register — APA 7, and it cites only the sources you list."
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
      setDone("Reported. The owner will see it.");
    } catch (e) { setErr(e.message || "That didn't send."); }
  };
  return (
    <div className="space-y-2 rounded-lg border border-white/10 p-3 text-xs">
      <label className="block text-white/60" htmlFor={`rep-${work.id}`}>What is wrong with it?</label>
      <select id={`rep-${work.id}`} className="neon-input" value={reason} onChange={(e) => setReason(e.target.value)}>
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
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [kind, setKind] = useState(STANDALONE ? "resume" : "lyrics");
  const [topic, setTopic] = useState("");
  const [genre, setGenre] = useState("");
  const [majority, setMajority] = useState(2);
  const [minority, setMinority] = useState(1);
  const [busy, setBusy] = useState(false);
  const [work, setWork] = useState(null);
  const [draft, setDraft] = useState("");
  const [royalty, setRoyalty] = useState(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  const load = () => api("/api/economy/sentencez/").then(setS).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const kinds = visibleKinds(s?.kinds || [], STANDALONE);
  // Land on something the member can use. The standalone drops the persona-gated
  // agreements entirely (there is no ProfileZ to add the persona in), and an older
  // API may not know a kind this build asks for first.
  useEffect(() => {
    if (kinds.length && !kinds.some((k) => k.key === kind)) setKind(pickKind(kinds, kind));
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (w) => { setWork(w); setDraft(w.text); setRoyalty({ royalty_pct: s?.royalty_pct ?? 10, kept_share: 1 }); };

  useEffect(() => {
    // The royalty is for taking a piece into DistributeZ, CollabZ or BattleZ; the
    // standalone has none of them, so it neither asks nor states one.
    if (!work || STANDALONE) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api(`/api/economy/sentencez/${work.id}/royalty/`, { method: "POST", body: { text: draft } })
        .then(setRoyalty).catch(() => {});
    }, 500);
    return () => clearTimeout(timer.current);
  }, [draft, work]);

  async function write() {
    setErr(""); setBusy(true);
    try {
      const body = { kind, topic, genre };
      if (kind === "lyrics") Object.assign(body, { majority, minority });
      const w = await api("/api/economy/sentencez/", { method: "POST", body });
      playSound("build_done");
      open(w);
      load();
    } catch (e) {
      playSound("build_fail");
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const current = kinds.find((k) => k.key === kind);
  const locked = current && current.allowed === false;
  const max = s?.rhyme_max ?? 4;
  const limited = s && s.brief_limit != null && !s.brief_unlimited;
  const clamp = (v) => (limited ? v.slice(0, s.brief_limit) : v);
  // The royalty line is about taking a piece to the music platform, so the
  // standalone says it only where a member could plausibly do that.
  const royaltyLine = s?.royalty_rule && (!STANDALONE || kind === "lyrics")
    ? (STANDALONE ? `If you later take this lyric to Music ConnectZ: ${s.royalty_rule}` : s.royalty_rule) : "";

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
            <textarea
              className="neon-input min-h-28 w-full"
              aria-label="What to write about"
              maxLength={limited ? s.brief_limit : undefined}
              placeholder={current?.hint || "What should it say?"}
              value={topic}
              onChange={(e) => setTopic(clamp(e.target.value))}
            />
            <BriefCount s={s} value={topic} />
            <input className="neon-input w-full" maxLength={60} aria-label={current?.style_label || "Genre / style (optional)"}
              placeholder={current?.style_label || "Genre / style (optional)"}
              value={genre} onChange={(e) => setGenre(e.target.value)} />

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

            <div className="flex flex-wrap items-center gap-3">
              <button className="neon-btn-primary !w-auto px-5" disabled={busy || !topic.trim() || (s && !s.can_run)} onClick={write}>
                {busy ? <Loader2 className="animate-spin" size={16} /> : <PenLine size={16} />} Write it
              </button>
              <Price s={s} />
              <span className="text-[11px] text-white/40">A run that comes back empty isn't charged.</span>
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
            {!STANDALONE && royalty && (
              <span className="text-xs text-white/60">
                If used in DistributeZ, CollabZ or BattleZ: <span className="text-mcz-ember">−{royalty.royalty_pct}%</span> to K-Oth
                <span className="text-white/40"> ({Math.round(royalty.kept_share * 100)}% of the original kept)</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-white/45">Written by AI. Check it before you use it.</p>
          {work.legal_note && <p className="rounded-lg bg-mcz-gold/10 px-3 py-2 text-xs text-mcz-gold">{work.legal_note}</p>}
          {work.note && <p className="rounded-lg bg-mcz-gold/10 px-3 py-2 text-xs text-mcz-gold">{work.note}</p>}
          <textarea className="neon-input min-h-64 w-full font-mono text-sm" aria-label={`${work.label}, editable`}
                    value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex flex-wrap items-center gap-3">
            <button className="re-btn !w-auto px-4" onClick={() => {
              navigator.clipboard?.writeText(draft).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
            }}><Copy size={14} /> {copied ? "Copied" : "Copy"}</button>
            <button className="re-btn !w-auto px-4" onClick={() => download(`${work.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`, draft)}>
              <Download size={14} /> Save as text
            </button>
            {!STANDALONE && <button className="re-link" onClick={() => goToSpot("postz", "composer")}>Post it in PostZ</button>}
          </div>
          {!STANDALONE && <UseIn source="sentence" sourceId={work.id} pct={royalty?.royalty_pct ?? 10} text={draft} />}
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
