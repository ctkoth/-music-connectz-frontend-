import { useEffect, useRef, useState } from "react";
import { Copy, Loader2, PenLine } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { IconImg } from "../App.jsx";
import { PROMPTZ } from "../resources.js";

// Sentence ConnectZ — the IntelligenceZ writer. Everything it shows about
// price, kinds, persona gates and the royalty rule comes from
// /api/economy/sentencez/; this screen states it and decides none of it.

function Price({ s }) {
  if (!s) return null;
  if (s.free_today) {
    return (
      <span className="text-[11px] text-emerald-300">
        Free today <span className="text-white/45">— uses 1 of the {s.daily_remaining} {PROMPTZ} you have left</span>
      </span>
    );
  }
  return (
    <span className="text-[11px] text-mcz-ember">
      −{s.cost_cents} {PROMPTZ} <span className="text-white/35">— no free prompts left today</span>
    </span>
  );
}

export default function SentenceConnectZ() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [kind, setKind] = useState("lyrics");
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

  const open = (w) => { setWork(w); setDraft(w.text); setRoyalty({ royalty_pct: s?.royalty_pct ?? 10, kept_share: 1 }); };

  useEffect(() => {
    if (!work) return;
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
      open(w);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const kinds = s?.kinds || [];
  const current = kinds.find((k) => k.key === kind);
  const locked = current && !current.allowed;
  const max = s?.rhyme_max ?? 4;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="sentencez.png" alt="Sentence ConnectZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">Sentence ConnectZ</h2>
          <p className="text-sm text-white/60">Lyrics, captions, posts, essays and agreements — written in K-Oth's voice.</p>
        </div>
      </header>

      {s && !s.configured && (
        <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">The writer isn't switched on yet.</p>
      )}

      <div className="neon-frame space-y-4 p-4" data-tour="sentencez-write">
        <div className="flex flex-wrap gap-2">
          {kinds.map((k) => (
            <button
              key={k.key}
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
            <textarea
              className="neon-input min-h-28 w-full"
              maxLength={2000}
              placeholder={kind === "lyrics" ? "What's the song about? Describe the topic, the story, the feeling." : "What should it say?"}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <input className="neon-input w-full" maxLength={60} placeholder="Genre / style (optional)"
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
            {s?.royalty_rule && <p className="text-xs text-white/50">{s.royalty_rule}</p>}
          </>
        )}
        {err && <p className="text-sm text-mcz-ember">{err}</p>}
      </div>

      {work && (
        <div className="neon-frame space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{work.label}</h3>
            {royalty && (
              <span className="text-xs text-white/60">
                If used in DistributeZ, CollabZ or BattleZ: <span className="text-mcz-ember">−{royalty.royalty_pct}%</span> to K-Oth
                <span className="text-white/40"> ({Math.round(royalty.kept_share * 100)}% of the original kept)</span>
              </span>
            )}
          </div>
          {work.legal_note && <p className="rounded-lg bg-mcz-gold/10 px-3 py-2 text-xs text-mcz-gold">{work.legal_note}</p>}
          <textarea className="neon-input min-h-64 w-full font-mono text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex flex-wrap gap-3">
            <button className="re-btn !w-auto px-4" onClick={() => {
              navigator.clipboard?.writeText(draft).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
            }}><Copy size={14} /> {copied ? "Copied" : "Copy"}</button>
            <button className="re-link" onClick={() => goToSpot("postz", "composer")}>Post it in PostZ</button>
          </div>
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
