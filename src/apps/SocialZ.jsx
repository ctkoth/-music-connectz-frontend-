import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clock, Copy, ExternalLink, Loader2, Plus, ShieldCheck, X } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import LoadGate from "../components/LoadGate.jsx";
import { goToSpot } from "../goto.js";
import { ENERGY } from "../resources.js";
import { nkey, rateChange, statusLook } from "../socialz.js";

// SocialZ — the accounts a member has connected, and what their followers pay.
//
// Passive ⚡ is `reach ÷ divisor` (never under a floor), and reach is the median follower
// count across VERIFIED accounts. The server proved ownership and read counts for years;
// no mounted screen ever drove it, so the one income path a member can grow had no way in.
//
// This screen decides NOTHING: the rule's sentence, the divisor and floor, what every tier
// would pay this member, which accounts count and why one does not are all
// `GET /api/economy/socialz/`. Verifying is `POST /api/economy/social/verify/`, and the line
// after a check is the difference between two reads of the server's own rate — never a rate
// worked out here, which would be a second place the rule lives.
//
// Cost and gain up front: the one cost is stated before any button ("costs you nothing, a
// failed check charges nothing") and the gain is the live rate beside the controls.

const nf = (n) => Number(n || 0).toLocaleString();

function Chip({ status }) {
  const l = statusLook(status);
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${l.cls}`}>{l.label}</span>;
}

function Row({ src, busy, say, onStart, onCheck, onMatch }) {
  const [copied, setCopied] = useState(false);
  const counts = src.status === "verified";
  return (
    <div className={`space-y-2 rounded-xl border p-3 ${counts ? "border-emerald-300/30 bg-emerald-300/5" : "border-white/10 bg-black/30"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{src.label}</span>
          {src.url && (
            <a href={src.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 truncate text-[11px] text-white/45 hover:text-mcz-cyan">
              <ExternalLink size={10} /> <span className="truncate">{src.url.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
        </span>
        <span className="text-right">
          <span className="block text-sm font-bold text-white">{nf(src.followers)}</span>
          <span className="block text-[10px] text-white/40">followers</span>
        </span>
        <Chip status={src.status} />
      </div>

      {src.kind === "mcz" && <p className="text-[11px] text-white/45">{src.note}</p>}

      {src.kind === "link" && counts && (
        <p className="text-[11px] text-emerald-300/80">
          Counts toward your reach{src.verified_at ? ` · checked ${new Date(src.verified_at).toLocaleDateString()}` : ""}
          {src.verified_by === "manual" ? " · approved by a person" : ""}
        </p>
      )}

      {src.kind === "link" && !counts && (
        <>
          <p className="text-[11px] text-white/45">
            {src.status === "pending"
              ? "A person is looking at this one. It doesn't count until it clears."
              : src.status === "rejected"
                ? "This one wasn't confirmed as yours, so it doesn't count."
                : "Listed on your profile, but not counted — a follower count nobody checked can't pay."}
            {src.note ? <> <span className="text-white/60">{src.note}</span></> : null}
          </p>
          {src.code && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-mcz-gold/30 bg-black/40 px-2.5 py-2 text-xs">
              <span className="text-white/55">Put this in that profile's bio:</span>
              <code className="font-mono font-bold text-mcz-gold">{src.code}</code>
              <button type="button" className="text-white/50 hover:text-white" title="Copy"
                onClick={() => navigator.clipboard?.writeText(src.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {})}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="re-btn !w-auto px-3 !py-1.5 text-xs" disabled={!!busy} onClick={() => onMatch(src)}>
              {busy === "match" ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Quick match
            </button>
            {src.code ? (
              <button type="button" className="re-btn !w-auto px-3 !py-1.5 text-xs" disabled={!!busy} onClick={() => onCheck(src)}>
                {busy === "check" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} I've added it — verify
              </button>
            ) : (
              <button type="button" className="re-btn !w-auto px-3 !py-1.5 text-xs" disabled={!!busy} onClick={() => onStart(src)}>
                {busy === "start" ? <Loader2 size={13} className="animate-spin" /> : null} Get a code
              </button>
            )}
          </div>
        </>
      )}

      {say && (
        <p role="status" className={`text-[11px] ${say.ok ? "text-emerald-300" : "text-mcz-ember"}`}>{say.text}</p>
      )}
    </div>
  );
}

export default function SocialZ() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [me, setMe] = useState(null);
  const [busy, setBusy] = useState({});          // nkey(url) -> "start" | "check" | "match"
  const [said, setSaid] = useState({});          // nkey(url) -> {ok, text}
  const [moved, setMoved] = useState(null);      // the rate line after a check
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState("");
  const [addErr, setAddErr] = useState("");
  const rate = useRef(null);                      // the last rate we showed

  const load = useCallback(() => api("/api/economy/socialz/").then((x) => { setD(x); setErr(""); return x; })
    .catch((e) => { setErr(e.message || "Couldn't load SocialZ."); return null; }), []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api("/api/auth/me/").then(setMe).catch(() => {}); }, []);
  useEffect(() => { if (d && rate.current === null) rate.current = d.energy_per_hour; }, [d]);

  // One call for all three verify actions. After it, read the server's rate again and say
  // what moved — the gain stated, not promised.
  async function run(action, src, labelHint = "") {
    const key = nkey(src.url);
    setBusy((b) => ({ ...b, [key]: action }));
    setSaid((s) => ({ ...s, [key]: null }));
    let res = null, fail = null;
    try {
      res = await api("/api/economy/social/verify/", { method: "POST", body: { action, url: src.url.trim(), label: labelHint || src.label } });
    } catch (e) { fail = e; }
    const before = rate.current;
    const fresh = await load();
    if (fresh) {
      // A code being issued moves nothing, so it does not get a "rate unchanged" line.
      setMoved(action === "start" ? null : rateChange(before, fresh.energy_per_hour));
      rate.current = fresh.energy_per_hour;
    }
    setBusy((b) => ({ ...b, [key]: "" }));
    if (fail) {
      setSaid((s) => ({ ...s, [key]: { ok: false, text: [fail.message, fail.data?.hint].filter(Boolean).join(" ") } }));
    } else if (res?.verified) {
      setSaid((s) => ({ ...s, [key]: { ok: true, text: `Verified${res.followers != null ? ` — ${nf(res.followers)} followers read from the page` : ""}.` } }));
    } else if (action === "start") {
      setSaid((s) => ({ ...s, [key]: { ok: true, text: res?.instructions || "Add the code to that profile's bio, then verify." } }));
    } else {
      setSaid((s) => ({ ...s, [key]: { ok: false, text: [res?.detail, res?.reason, res?.faster].filter(Boolean).join(" ") || "That didn't verify." } }));
    }
    return { res, fail };
  }

  async function add(action) {
    const u = url.trim();
    if (!u) return;
    setAdding(action); setAddErr("");
    const { fail } = await run(action, { url: u, label: label.trim() }, label.trim());
    setAdding("");
    // A refusal has no row to land on (a quick match that could not reach the page saves
    // nothing), so it is said here and the form keeps what was typed.
    if (fail) setAddErr([fail.message, fail.data?.hint].filter(Boolean).join(" "));
    else { setUrl(""); setLabel(""); }
  }

  if (!d) return <LoadGate error={err} what="SocialZ" onRetry={load} />;

  const links = d.sources.filter((s) => s.kind === "link");
  const mcz = d.sources.find((s) => s.kind === "mcz");
  const signIns = (me?.connections || []).map((c) => c.provider);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="socialz.png" alt="SocialZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#ffcf3f" }}>SocialZ</h2>
          <p className="text-sm text-white/55">Connect where your audience lives. Verified followers raise how fast your {ENERGY} comes back.</p>
        </div>
      </header>

      {/* The gain, first: what you regenerate now and what the rule is. */}
      <section data-tour="socialz-reach" className="neon-frame space-y-3 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Your reach</p>
            <p className="text-3xl font-extrabold text-white">{nf(d.reach)}</p>
            <p className="text-[11px] text-white/40">{d.counted} {d.counted === 1 ? "account counts" : "accounts count"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/45">You regenerate</p>
            <p className="text-3xl font-extrabold text-emerald-300">+{nf(d.energy_per_hour)} {ENERGY}<span className="text-base font-semibold text-white/50"> / hour</span></p>
          </div>
        </div>
        <p className="text-[12px] leading-relaxed text-white/65">{d.rule}</p>

        {moved && (
          <p role="status" className={`rounded-lg px-3 py-2 text-sm ${moved.tone === "up" ? "bg-emerald-300/10 text-emerald-300" : moved.tone === "down" ? "bg-mcz-ember/10 text-mcz-ember" : "bg-white/5 text-white/60"}`}>
            {moved.text}
          </p>
        )}

        {/* What the same reach pays on each tier — the server's own number per tier. */}
        <div className="grid gap-2 sm:grid-cols-3">
          {d.ladder.map((t) => {
            const diff = t.per_hour - d.energy_per_hour;
            return (
              <div key={t.tier} className={`rounded-lg border px-3 py-2 text-xs ${t.yours ? "border-mcz-cyan/50 bg-mcz-cyan/5" : "border-white/10 bg-black/30"}`}>
                <p className="font-semibold text-white">{t.label}{t.yours ? " · you" : ""}</p>
                <p className="text-white/55">reach {t.divisor === 1 ? "× 1" : `÷ ${t.divisor}`} · never under {t.floor}</p>
                <p className="mt-1 text-sm font-bold text-emerald-300">+{nf(t.per_hour)} {ENERGY}/hr</p>
                {!t.yours && diff > 0 && (
                  <button type="button" className="mt-0.5 text-[11px] text-mcz-cyan hover:underline"
                    onClick={() => goToSpot("membershipz", "membershipz-plans")}>
                    +{nf(diff)} {ENERGY}/hr more →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Sign-ins. Connecting one proves it's you at login; it does NOT count followers —
          said before anybody expects otherwise. The connect flow itself stays in ProfileZ,
          where its return trip lands. */}
      <section data-tour="socialz-signins" className="neon-frame space-y-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Connected sign-ins</p>
        <p className="text-[11px] text-white/45">{d.oauth_note}</p>
        <div className="flex flex-wrap items-center gap-2">
          {signIns.length
            ? signIns.map((p) => <span key={p} className="pill capitalize !border-emerald-300/40 !text-emerald-300"><Check size={10} className="mr-1 inline" />{p}</span>)
            : <span className="text-xs text-white/40">None linked yet.</span>}
          <button type="button" className="re-link text-xs" onClick={() => goToSpot("profilez", "connections")}>
            Connect or remove a sign-in →
          </button>
        </div>
      </section>

      <section data-tour="socialz-sites" className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Your accounts &amp; sites</p>
        {mcz && <Row src={mcz} />}
        {links.length === 0 && (
          <p className="text-sm text-white/45">No sites yet. Add the places people follow you — Instagram, TikTok, YouTube, SoundCloud, anywhere with a public page.</p>
        )}
        {links.map((s) => (
          <Row key={s.url} src={s} busy={busy[nkey(s.url)]} say={said[nkey(s.url)]}
            onStart={(x) => run("start", x)} onCheck={(x) => run("check", x)} onMatch={(x) => run("match", x)} />
        ))}
      </section>

      <section data-tour="socialz-add" className="neon-frame space-y-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Add a site</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
          <input className="neon-input text-sm" placeholder="Label (optional)" value={label} maxLength={80}
            onChange={(e) => setLabel(e.target.value)} />
          <input className="neon-input text-sm" placeholder="https://instagram.com/yourname" value={url} inputMode="url"
            onChange={(e) => { setUrl(e.target.value); setAddErr(""); }} />
        </div>
        {/* The price, before the buttons. */}
        <p className="text-[11px] text-emerald-300/90">{d.cost}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="re-btn !w-auto px-4" disabled={!url.trim() || !!adding} onClick={() => add("match")}>
            {adding === "match" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add &amp; quick match
          </button>
          <button type="button" className="re-btn !w-auto px-4" disabled={!url.trim() || !!adding} onClick={() => add("start")}>
            {adding === "start" ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />} Add &amp; get a code
          </button>
        </div>
        {addErr && <p role="alert" className="flex items-start gap-1 text-[11px] text-mcz-ember"><X size={12} className="mt-0.5 shrink-0" /> {addErr}</p>}
        <ul className="list-disc space-y-1 pl-4 text-[11px] text-white/45">
          {d.how.map((h) => <li key={h}>{h}</li>)}
        </ul>
      </section>
    </div>
  );
}
