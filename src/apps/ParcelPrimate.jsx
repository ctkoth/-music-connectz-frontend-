import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Mail, MessageSquare, Newspaper, Send } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import CharLimit from "../CharLimit.jsx";
import { useCharLimit } from "../limits.js";
import { goToSpot } from "../goto.js";

// Parcel Primate — a newsletter to the people who follow you, sent as a post,
// a DM and (to whoever asked for it) an email.
//
// Everything about who it reaches is the server's (parcel.py): this screen
// states it BEFORE the Send button — how many people each audience is, how
// many of them get email, and how many campaigns your tier has left this
// week — because a send to thousands of people is not something to find out
// the size of on the receipt.
//
// Email reaches only members who turned campaign email on. The switch for
// YOUR inbox lives here too, since this is where the word "campaign" means
// something.

const BASE = "/api/economy/parcel/";
const AUD = {
  followers: ["Followers", "everyone who follows you"],
  fans: ["Fans", "follow you, you don't follow back"],
  friends: ["Friends", "you follow each other"],
};
const DOORS = [
  ["post", Newspaper, "Post", "one public post in the feed"],
  ["message", MessageSquare, "DM", "a direct message to each person"],
  ["email", Mail, "Email", "only to people who turned campaign email on"],
];

function when(iso) {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function MyInbox() {
  const [p, setP] = useState(null);
  useEffect(() => { api(`${BASE}email-pref/`).then(setP).catch(() => setP(null)); }, []);
  if (!p) return null;
  const flip = async () => setP(await api(`${BASE}email-pref/`, { method: "POST", body: { campaign_email: !p.campaign_email } }));
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
      <span className="text-white/65">
        <Mail size={12} className="inline" /> Email me campaigns from people I follow:{" "}
        <b className={p.campaign_email ? "text-emerald-300" : "text-white/50"}>{p.campaign_email ? "on" : "off"}</b>
        {!p.has_email && <span className="text-mcz-ember"> — there's no email address on your account</span>}
      </span>
      <button className="re-btn !w-auto px-3 py-1 text-xs" onClick={flip}>{p.campaign_email ? "Turn off" : "Turn on"}</button>
    </div>
  );
}

export default function ParcelPrimate() {
  const cl = useCharLimit();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("followers");
  const [doors, setDoors] = useState(["post", "message"]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const load = () => api(BASE).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const q = d?.quota;
  const reach = d?.reach?.[audience];
  const out = q && q.left <= 0;
  const toggle = (k) => setDoors(doors.includes(k) ? doors.filter((x) => x !== k) : [...doors, k]);

  async function send() {
    setBusy(true); setErr(""); setResult(null);
    try {
      const r = await api(BASE, { method: "POST", body: { subject, body, audience, channels: doors } });
      setResult(r); setSubject(""); setBody(""); load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="parcel.png" alt="Parcel Primate" className="h-16 w-16 rounded-2xl object-cover shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">Parcel Primate</h2>
          <p className="text-sm text-white/60">A newsletter to the people who follow you — as a post, a DM, and email for whoever wants it.</p>
        </div>
      </header>

      <MyInbox />

      {!d && !err && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>}

      {d && (
        <section className="neon-frame space-y-3 p-3" data-tour="parcel-compose">
          <input className="neon-input w-full font-semibold" placeholder="Subject — e.g. New single out Friday" maxLength={160}
            value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea className="neon-input min-h-32 w-full text-sm" placeholder="What do you want them to know?"
            maxLength={cl.unlimited ? undefined : cl.limit} value={body} onChange={(e) => setBody(cl.clamp(e.target.value))} />
          <CharLimit cl={cl} value={body} />

          <div className="space-y-1">
            <p className="text-xs font-semibold text-white/70">Who</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(AUD).map(([k, [label, hint]]) => (
                <button key={k} onClick={() => setAudience(k)} title={hint}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${audience === k ? "border-mcz-cyan text-mcz-cyan" : "border-white/15 text-white/70"}`}>
                  {label} <span className="text-white/45">{d.reach?.[k]?.people ?? d.audiences?.[k] ?? 0}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-white/45">{AUD[audience][1]}. Anyone blocked either way is left out.</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-white/70">How</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {DOORS.map(([k, Icon, label, hint]) => (
                <label key={k} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs ${doors.includes(k) ? "border-mcz-cyan/60" : "border-white/10"}`}>
                  <input type="checkbox" checked={doors.includes(k)} onChange={() => toggle(k)} className="mt-0.5" />
                  <span>
                    <Icon size={12} className="inline" /> <b>{label}</b>
                    <span className="block text-white/45">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* The size of the send, before the send. */}
          <div className="space-y-0.5 rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-white/70">
            {doors.includes("post") && <p>1 public post in the feed.</p>}
            {doors.includes("message") && <p>{reach?.people ?? 0} DM{reach?.people === 1 ? "" : "s"}.</p>}
            {doors.includes("email") && (
              <p>
                {reach?.email ?? 0} email{reach?.email === 1 ? "" : "s"} — of {reach?.people ?? 0}, only those who turned campaign email on.
                {!d.email_ready && <span className="text-mcz-ember"> Email isn't switched on for the platform yet, so none will go.</span>}
              </p>
            )}
            {q && (
              <p className={out ? "text-mcz-ember" : "text-white/50"}>
                {q.left} of {q.per_week} campaign{q.per_week === 1 ? "" : "s"} left this week on {q.tier === "free" ? "Free" : q.tier === "premium" ? "Premium" : "StatZ"}.
                {out && q.next_at && <> Next one opens {when(q.next_at)}.</>}
                {q.tier === "free" && <> <button className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>Premium sends one a day</button></>}
              </p>
            )}
            <p className="text-white/40">Sending costs nothing.</p>
          </div>

          {err && <p className="text-sm text-mcz-ember">{err}</p>}
          <button className="neon-btn-primary !w-auto px-5 py-2 text-sm"
            disabled={busy || out || !subject.trim() || doors.length === 0} onClick={send}>
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} className="inline" />} Send campaign
          </button>

          {result && (
            <div className="rounded-lg border border-emerald-300/40 p-2 text-xs text-emerald-300">
              Sent to {result.recipients} {result.recipients === 1 ? "person" : "people"}
              {result.messaged ? ` · ${result.messaged} DMs` : ""}
              {doors.includes("email") || result.emailed ? ` · ${result.emailed} emails` : ""}.
              {result.post && <> <a className="re-link" href={result.post.url}>See the post <ExternalLink size={10} className="inline" /></a></>}
              {result.email_note && <p className="text-white/60">{result.email_note}</p>}
            </div>
          )}
        </section>
      )}

      {d?.history?.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold">Sent</h3>
          <ul className="space-y-1 text-xs">
            {d.history.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 p-2">
                <span className="min-w-0">
                  <b className="block truncate">{c.subject}</b>
                  <span className="text-white/45">{when(c.created_at)} · {AUD[c.audience]?.[0] || c.audience} · {c.recipients} people
                    {c.messaged ? ` · ${c.messaged} DMs` : ""}{c.emailed ? ` · ${c.emailed} emails` : ""}</span>
                </span>
                {c.post && <a className="re-link shrink-0" href={c.post.url}>post <ExternalLink size={10} className="inline" /></a>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
