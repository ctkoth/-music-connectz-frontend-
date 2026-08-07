// CollabZ — escrowed collaboration deals, wired to the API that exists.
//
// PostZ is for show. CollabZ is where a showcase turns into work somebody gets
// paid for, and the escrow is the trust primitive that lets a stranger take
// the first deal: what each payer owes is HELD by the deal, not handed over,
// until the payers release it.
//
// This tab used to call `/api/collabz/` — a collab-call board with roles,
// geolocation and an "I'm in" button. None of that exists on the server; the
// real endpoint is `/api/economy/collab/` and it is a settlement, not a notice
// board. (The call board is a genuine idea with no backend at all. It needs
// building, not faking.)
//
// Every money figure is stated BEFORE the button that moves it, per the
// cost/gain rule — a price you discover by paying it is a bill.
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight, Check, Handshake, Image as ImageIcon, Loader2, Mic, Music, Plus,
  Scale, Send, ShieldCheck, Star, X,
} from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { goToSpot } from "../goto.js";
import { hasBlobs, storageNote, uploadWork } from "../uploadWork.js";
import { IconImg } from "../App.jsx";
import { MONEY, SPINAZ } from "../resources.js";
import RangeGates from "../RangeGates.jsx";
import MediaFields from "../MediaFields.jsx";

const money = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;
const STATUS_LABEL = {
  draft: "Draft — not funded yet", funded: "Funded — held in escrow",
  delivered: "Delivered — awaiting release", released: "Released",
  disputed: "Disputed", refunded: "Refunded", cancelled: "Cancelled",
};

function Amount({ cents, currency }) {
  return currency === "spinaz"
    ? <span>{cents} {SPINAZ}</span>
    : <span>{money(cents)} {MONEY}</span>;
}

function Deal({ deal, onAction, onRate, busy }) {
  const cur = deal.currency;
  const me = deal.participants.find((p) => p.username === deal.__me) || {};
  const held = cur === "spinaz" ? deal.held_spinaz : deal.held_cents;

  const act = (verb) => onAction(deal.id, verb);

  return (
    <div className="neon-frame space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{deal.title || "Untitled deal"}</p>
          <p className="text-xs text-white/55">
            by @{deal.initiator} · {STATUS_LABEL[deal.status] || deal.status}
          </p>
        </div>
        {held > 0 && (
          <span className="pill flex shrink-0 items-center gap-1 !text-emerald-300">
            <ShieldCheck size={11} /> <Amount cents={held} currency={cur} /> held
          </span>
        )}
      </div>

      {/* Back to where it came from. A deal that can't point at the post it
          grew out of is a dead end in the direction people travel. */}
      {deal.source_post && (
        <button
          className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-mcz-ember/40"
          onClick={() => goToSpot("postz", "feed")}
        >
          <Music size={12} className="shrink-0 text-mcz-cyan" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] text-white/80">
              From “{deal.source_post.title}”
            </span>
            <span className="block text-[10px] text-white/35">@{deal.source_post.author} · in PostZ</span>
          </span>
          <ArrowRight size={12} className="shrink-0 text-white/25" />
        </button>
      )}

      {/* The work. A deal you can't hear is a settlement about nothing. */}
      {(deal.media_url || deal.image_url || deal.description || deal.lyrics) && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
          {deal.description && <p className="text-[12px] text-white/70">{deal.description}</p>}
          {deal.media_url && (
            deal.media_type === "video"
              ? <video src={deal.media_url} controls className="w-full rounded-lg" />
              : <audio src={deal.media_url} controls className="w-full" />
          )}
          {deal.image_url && <img src={deal.image_url} alt="" className="w-full rounded-lg" />}
          {deal.lyrics && (
            <details>
              <summary className="cursor-pointer text-[11px] text-white/45">Lyrics / script</summary>
              <p className="mt-1 whitespace-pre-wrap text-[12px] text-white/70">{deal.lyrics}</p>
            </details>
          )}
        </div>
      )}

      {deal.split_mode === "rating" && (
        <div className="rounded-lg border border-mcz-gold/25 bg-mcz-gold/5 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-mcz-gold">
            <Scale size={12} /> Split by contribution rating
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-white/45">
            At release the pot is re-cut by what people outside the deal judged each person
            contributed. It needs {deal.rating_min_raters} raters — under that it pays the agreed
            worth instead. Nobody on the deal can rate it.
          </p>
          {deal.split_snapshot?.reason && (
            <p className="mt-1 text-[10px] text-white/60">{deal.split_snapshot.reason}</p>
          )}
        </div>
      )}

      <ul className="space-y-1">
        {deal.participants.map((p) => (
          <li key={p.username} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="truncate text-white/75">@{p.username}</span>
            <span className="flex shrink-0 items-center gap-2 text-[11px]">
              {p.pays_cents > 0 && (
                <span className="text-mcz-ember">−<Amount cents={p.pays_cents} currency={cur} /></span>
              )}
              {p.receives_cents > 0 && (
                <span className="text-emerald-300">+<Amount cents={p.receives_cents} currency={cur} /></span>
              )}
              {p.funded && <Check size={11} className="text-emerald-300" />}
              {/* Rate what they did — but only if you're not on the deal. */}
              {deal.split_mode === "rating" && !deal.i_am_participant && deal.rating_keys?.[p.username] && (
                <button className="text-white/30 hover:text-mcz-gold"
                        title={`Rate @${p.username}'s contribution`}
                        onClick={() => onRate(deal.rating_keys[p.username], p.username)}>
                  <Star size={11} />
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        {deal.status === "draft" && me.pays_cents > 0 && (
          <button className="neon-btn-primary !w-auto px-4 py-2 text-xs"
                  onClick={() => act("fund")} disabled={busy}>
            Fund your share — <Amount cents={me.pays_cents} currency={cur} />
            {deal.stake_spinaz ? <> + {deal.stake_spinaz} {SPINAZ} stake</> : null}
          </button>
        )}
        {deal.status === "funded" && deal.i_am_participant && (
          <button className="re-btn !w-auto px-4 py-2 text-xs" onClick={() => act("deliver")} disabled={busy}>
            <Send size={13} /> Mark delivered
          </button>
        )}
        {deal.status === "delivered" && deal.i_am_payer && (
          <button className="neon-btn-primary !w-auto px-4 py-2 text-xs" onClick={() => act("release")} disabled={busy}>
            <Handshake size={13} /> Release the escrow
          </button>
        )}
        {["funded", "delivered"].includes(deal.status) && deal.i_am_payer && (
          <button className="re-btn !w-auto px-3 py-2 text-xs !text-red-300"
                  onClick={() => act("dispute")} disabled={busy}>
            <X size={13} /> Dispute
          </button>
        )}
      </div>
    </div>
  );
}

export default function CollabZ() {
  const [deals, setDeals] = useState(null);
  const [me, setMe] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", currency: "money", partner: "", mine: "", theirs: "",
                                     description: "", split_mode: "worth" });
  const [work, setWork] = useState({});
  const [storage, setStorage] = useState(null);
  const [gates, setGates] = useState({});

  const load = useCallback(async () => {
    try {
      const d = await api("/api/economy/collab/");
      setDeals(asList(d?.deals ?? d));
    } catch (e) {
      setMsg(e.message || "Couldn't load CollabZ.");
      setDeals([]);
    }
  }, []);

  useEffect(() => {
    api("/api/auth/me/").then((m) => setMe(m?.username || "")).catch(() => {});
    load();
  }, [load]);

  async function rateContributor(itemKey, username) {
    const raw = window.prompt(`Rate @${username}'s contribution 1–10`);
    const score = Number(raw);
    if (!raw || !Number.isFinite(score) || score < 1 || score > 10) return;
    try {
      await api("/api/economy/social/rate/", {
        method: "POST", body: { item: itemKey, action: "rate", score: Math.round(score) },
      });
      setMsg(`Rated @${username} ${Math.round(score)}/10.`);
      load();
    } catch (e) { setMsg(e.message || "Couldn't rate that."); }
  }

  async function action(id, verb) {
    setBusy(true); setMsg("");
    try {
      await api(`/api/economy/collab/${id}/${verb}/`, { method: "POST", body: {} });
      await load();
    } catch (e) { setMsg(e.message || "That didn't go through."); }
    finally { setBusy(false); }
  }

  async function create() {
    setBusy(true); setMsg("");
    try {
      const cents = (v) => Math.max(0, Math.round(Number(v || 0) * 100));
      // Host the recording before the deal is written, and let a refused
      // upload fail the whole thing — a deal whose work went missing is worse
      // than a deal that wasn't created.
      if (hasBlobs(work)) setMsg("Uploading the work…");
      const { work: hosted, storage: st } = await uploadWork(work);
      if (st) setStorage(st);
      await api("/api/economy/collab/", {
        method: "POST",
        body: {
          title: form.title.trim(),
          currency: form.currency,
          description: form.description.trim(),
          split_mode: form.split_mode,
          gates,
          // Uploaded above, so these are hosted URLs. They used to be blanked
          // whenever a blob was present — a recorded take was captured, shown
          // back, and then silently dropped on submit.
          ...primaryMedia(hosted),
          image_url: hosted.image_url || "",
          lyrics: hosted.lyrics || "",
          participants: [
            { username: me, worth_cents: cents(form.mine) },
            { username: form.partner.trim(), worth_cents: cents(form.theirs) },
          ],
        },
      });
      setForm({ ...form, title: "", partner: "", mine: "", theirs: "", description: "" });
      setWork({}); setGates({});
      setMsg("Deal drafted — fund your share to put it in escrow.");
      load();
    } catch (e) { setMsg(e.message || "Couldn't create that deal."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="collabz.png" alt="CollabZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#facc15" }}>CollabZ</h2>
          <p className="text-sm text-white/60">
            PostZ is for show. This is where it becomes work — escrowed, so a stranger can take the first deal.
          </p>
        </div>
      </header>

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">{msg}</p>}

      {deals === null ? (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      ) : deals.length === 0 ? (
        <p className="text-sm text-white/45">
          No deals yet. Start one below — or open a track in PostZ and take it straight here.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {deals.map((d) => (
            <Deal key={d.id} deal={{ ...d, __me: me }} onAction={action} onRate={rateContributor} busy={busy} />
          ))}
        </div>
      )}

      <div className="neon-frame space-y-3 p-5">
        <h3 className="font-semibold">Start a deal</h3>
        <p className="text-[11px] text-white/45">
          Each side names what their contribution is worth. Everyone pays an equal share of everyone
          else's worth, and the total is held until it's released — nobody hands money to a stranger
          on trust.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="neon-input sm:col-span-2" placeholder="What are we making?"
                 value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="neon-input" value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            <option value="money">Money {MONEY}</option>
            <option value="spinaz">SpinaZ {SPINAZ}</option>
          </select>
          <input className="neon-input" placeholder="Their username"
                 value={form.partner} onChange={(e) => setForm({ ...form, partner: e.target.value })} />
          <input className="neon-input" inputMode="decimal" placeholder="Your contribution is worth"
                 value={form.mine} onChange={(e) => setForm({ ...form, mine: e.target.value })} />
          <input className="neon-input" inputMode="decimal" placeholder="Theirs is worth"
                 value={form.theirs} onChange={(e) => setForm({ ...form, theirs: e.target.value })} />
          <textarea className="neon-input sm:col-span-2" rows={2} placeholder="What's the brief?"
                    value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        {/* The work, in the same format PostZ uses. */}
        <MediaFields value={work} onChange={setWork} label="The work" />
        {storage && <p className="text-[10px] text-white/35">{storageNote(storage)}</p>}

        {/* Who can be on it — the same five ranges search and BattleZ use. */}
        <RangeGates value={gates} onChange={setGates} title="Who can be on this deal" />

        <label className="flex items-start gap-2 text-[11px] text-white/55">
          <input type="checkbox" className="mt-0.5"
                 checked={form.split_mode === "rating"}
                 onChange={(e) => setForm({ ...form, split_mode: e.target.checked ? "rating" : "worth" })} />
          <span>
            Split the pot by <span className="text-mcz-gold">contribution rating</span> instead of the
            agreed worth. At release it's re-cut by what people outside the deal judged each person
            did — and if too few of them rated, it pays the agreed worth instead. Nobody on the deal
            can rate it.
          </span>
        </label>
        <button className="neon-btn-primary !w-auto px-6" onClick={create}
                disabled={busy || !form.partner.trim()}>
          {busy ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Draft the deal
        </button>
        <p className="text-[11px] text-white/35">
          Drafting costs nothing. Money only moves when you fund your share, and it stays held until release.
        </p>
      </div>
    </div>
  );
}
