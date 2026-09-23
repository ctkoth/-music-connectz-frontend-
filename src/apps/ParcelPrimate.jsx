// Parcel Primate — the "Mailchimp knockoff" from Corey's blueprint image.
// Bulk email to a member's OWN contact list: build lists, draft a campaign,
// send it through the real SendGrid transport in apps/economy/parcelprimate.py.
//
// Deliberately NOT the same screen as MessageZ. MessageZ is a member's own
// direct messages to other MEMBERS — free, one-to-one, no external service.
// This is a member's outbound mail to EXTERNAL addresses they collected —
// real SendGrid spend, a real unsubscribe obligation, its own cost. They
// share the word "mail" and nothing else in the data or the screen.
//
// Corey's ask, verbatim: "belongs in toolz and messagez groups" — so this
// one component is reached from TWO places (a ToolZ tile, and a MessageZ
// entry point) rather than being built twice. See App.jsx TABS: both routes
// render <ParcelPrimate />.
import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, Plus, Send, Trash2, Users } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";

function useStatus() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    api("/api/economy/parcelprimate/status/").then(setStatus).catch(() => setStatus(null));
  }, []);
  return status;
}

function NewList({ onCreated }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setErr("");
    try {
      const l = await api("/api/economy/parcelprimate/lists/", { method: "POST", body: { name: name.trim() } });
      setName("");
      onCreated(l);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={create} className="flex gap-2">
      <input className="neon-input flex-1" placeholder="New list name — e.g. Fans, Press"
        value={name} onChange={(e) => setName(e.target.value)} />
      <button className="neon-btn shrink-0" disabled={busy || !name.trim()}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} List
      </button>
      {err && <span className="text-xs text-mcz-ember">{err}</span>}
    </form>
  );
}

function ListPanel({ list, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [email, setEmail] = useState("");
  const [cname, setCname] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    api(`/api/economy/parcelprimate/lists/${list.id}/`).then(setDetail).catch(() => setDetail(null));
  }, [list.id]);
  useEffect(() => { load(); }, [load]);

  async function addContact(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true); setErr("");
    try {
      await api(`/api/economy/parcelprimate/lists/${list.id}/contacts/`, {
        method: "POST", body: { email: email.trim(), name: cname.trim() },
      });
      setEmail(""); setCname(""); load(); onChanged();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  async function removeContact(id) {
    await api(`/api/economy/parcelprimate/lists/${list.id}/contacts/${id}/`, { method: "DELETE" });
    load(); onChanged();
  }

  if (!detail) return <div className="p-3 text-sm text-white/40"><Loader2 className="inline animate-spin" size={14} /> Loading list…</div>;

  return (
    <div className="space-y-3">
      <form onSubmit={addContact} className="flex flex-wrap gap-2">
        <input className="neon-input flex-1 min-w-[180px]" placeholder="email@example.com"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="neon-input flex-1 min-w-[140px]" placeholder="Name (optional)"
          value={cname} onChange={(e) => setCname(e.target.value)} />
        <button className="neon-btn shrink-0" disabled={busy || !email.trim()}>
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Add
        </button>
      </form>
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
      {/* Add-one-at-a-time is what this ships with this pass, not CSV import —
          said here rather than left to be discovered. */}
      <p className="text-[11px] text-white/40">Add contacts one at a time for now — CSV import isn't built yet.</p>
      <ul className="divide-y divide-white/10">
        {(detail.contacts || []).map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
            <span className={c.subscribed ? "text-white/80" : "text-white/30 line-through"}>
              {c.name ? `${c.name} · ` : ""}{c.email}
            </span>
            <div className="flex items-center gap-2">
              {!c.subscribed && <span className="text-[11px] text-white/40">unsubscribed</span>}
              <button onClick={() => removeContact(c.id)} className="text-white/40 hover:text-mcz-ember">
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
        {!detail.contacts?.length && <li className="py-2 text-sm text-white/40">No contacts yet.</li>}
      </ul>
    </div>
  );
}

function NewCampaign({ lists, onCreated }) {
  const [listId, setListId] = useState(lists[0]?.id || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (!listId && lists[0]) setListId(lists[0].id); }, [lists, listId]);

  async function create(e) {
    e.preventDefault();
    if (!listId || !subject.trim() || !body.trim()) return;
    setBusy(true); setErr("");
    try {
      const c = await api("/api/economy/parcelprimate/campaigns/", {
        method: "POST", body: { mail_list_id: listId, subject: subject.trim(), body: body.trim() },
      });
      setSubject(""); setBody("");
      onCreated(c);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  if (!lists.length) return <p className="text-sm text-white/40">Make a list first — a campaign needs somewhere to send.</p>;

  return (
    <form onSubmit={create} className="space-y-2">
      <select className="neon-input" value={listId} onChange={(e) => setListId(e.target.value)}>
        {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.contact_count})</option>)}
      </select>
      <input className="neon-input" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <textarea className="neon-input" rows={5} placeholder="Message body…" value={body} onChange={(e) => setBody(e.target.value)} />
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
      <button className="neon-btn" disabled={busy || !listId || !subject.trim() || !body.trim()}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Save draft
      </button>
    </form>
  );
}

function CampaignCard({ campaign, status, onSent }) {
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (campaign.status !== "draft") return;
    api(`/api/economy/parcelprimate/campaigns/${campaign.id}/quote/`).then(setQuote).catch(() => setQuote(null));
  }, [campaign.id, campaign.status]);

  async function send() {
    setBusy(true); setMsg("");
    try {
      const r = await api(`/api/economy/parcelprimate/campaigns/${campaign.id}/send/`, { method: "POST" });
      setMsg(`Sent to ${r.sent_count}${r.failed_count ? `, ${r.failed_count} failed` : ""}${r.cost_spinaz ? ` · −${r.cost_spinaz} 🍥` : ""}`);
      onSent();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  const canSend = status?.sending_available && campaign.status === "draft";

  return (
    <div className="neon-frame p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-white">{campaign.subject}</div>
          <div className="text-xs text-white/40">
            {campaign.status === "sent"
              ? `Sent to ${campaign.sent_count}${campaign.failed_count ? ` (${campaign.failed_count} failed)` : ""}`
              : campaign.status}
          </div>
        </div>
        {campaign.status === "draft" && (
          <div className="text-right">
            {/* Cost/gain rule: the price sits on the control, before it's
                pressed — never discovered by pressing it. */}
            {quote && (
              <div className="mb-1 text-xs">
                {quote.recipients} recipient{quote.recipients === 1 ? "" : "s"}
                {quote.cost_spinaz > 0 && <span className="ml-1 text-mcz-ember">−{quote.cost_spinaz} 🍥</span>}
                {quote.cost_spinaz === 0 && <span className="ml-1 text-emerald-300">free</span>}
              </div>
            )}
            <button onClick={send} disabled={!canSend || busy} className="neon-btn text-sm">
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Send
            </button>
            {!status?.sending_available && (
              <p className="mt-1 max-w-[220px] text-[11px] text-white/40">{status?.unavailable_reason}</p>
            )}
          </div>
        )}
      </div>
      {msg && <p className="text-xs text-white/60">{msg}</p>}
    </div>
  );
}

export default function ParcelPrimate() {
  const status = useStatus();
  const [lists, setLists] = useState([]);
  const [openList, setOpenList] = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  const loadLists = useCallback(() => {
    api("/api/economy/parcelprimate/lists/").then((r) => setLists(r.lists || [])).catch(() => setLists([]));
  }, []);
  const loadCampaigns = useCallback(() => {
    api("/api/economy/parcelprimate/campaigns/").then((r) => setCampaigns(r.campaigns || [])).catch(() => setCampaigns([]));
  }, []);
  useEffect(() => { loadLists(); loadCampaigns(); }, [loadLists, loadCampaigns]);

  return (
    <div className="space-y-6 p-4">
      <header className="flex items-center gap-4">
        <IconImg icon="parcelprimate.png" alt="Parcel Primate" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#ff5500" }}>Parcel Primate</h2>
          <p className="text-sm text-white/60">
            Build a mailing list, draft a campaign, send it for real. Not the same as MessageZ — this goes to
            addresses you collected, not to other members.
          </p>
          {status && !status.sending_available && (
            <p className="mt-1 text-xs text-mcz-ember">
              <Mail size={12} className="mr-1 inline" /> {status.unavailable_reason}
            </p>
          )}
          {status && status.sending_available && (
            <p className="mt-1 text-xs text-white/40">
              First {status.free_sends_daily} recipients/day free, then {status.spinaz_per_send} 🍥 each —
              {" "}{status.sends_today} sent today, capped at {status.max_sends_daily}/day.
            </p>
          )}
        </div>
      </header>

      <section className="neon-frame space-y-3 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-white"><Users size={16} /> Lists</h3>
        <NewList onCreated={(l) => { setLists((prev) => [l, ...prev]); }} />
        <ul className="space-y-2">
          {lists.map((l) => (
            <li key={l.id} className="rounded-lg border border-white/10 p-2">
              <button className="flex w-full items-center justify-between text-left text-sm text-white/80"
                onClick={() => setOpenList(openList === l.id ? null : l.id)}>
                <span>{l.name}</span>
                <span className="text-white/40">{l.contact_count} contact{l.contact_count === 1 ? "" : "s"}</span>
              </button>
              {openList === l.id && (
                <div className="mt-2 border-t border-white/10 pt-2">
                  <ListPanel list={l} onChanged={loadLists} />
                </div>
              )}
            </li>
          ))}
          {!lists.length && <li className="text-sm text-white/40">No lists yet.</li>}
        </ul>
      </section>

      <section className="neon-frame space-y-3 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-white"><Mail size={16} /> Campaigns</h3>
        <NewCampaign lists={lists} onCreated={(c) => setCampaigns((prev) => [c, ...prev])} />
        <div className="space-y-2">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} status={status} onSent={loadCampaigns} />
          ))}
          {!campaigns.length && <p className="text-sm text-white/40">No campaigns yet.</p>}
        </div>
      </section>
    </div>
  );
}
