// BeatZ — producers list beats, artists license them, in real money (💵).
//
// Everything a button needs to say before it is pressed is the server's:
// the price, whether it can be bought and why not (`can_buy` / `why_not`),
// and on confirm the buyer's balance, the platform fee and the producer's
// cut. A beat with no audio cannot be sold — nobody should pay for what they
// could not hear — so the preview player sits above every Buy button.
import { useEffect, useState } from "react";
import { Loader2, Music, Upload } from "lucide-react";
import { api } from "../api.js";
import { MONEY } from "../resources.js";
import MemberName from "../MemberName.jsx";

const usd = (c) => `$${((c || 0) / 100).toFixed(2)}`;
const LICENSE = {
  nonexclusive: "Non-exclusive — many artists can license it",
  exclusive: "Exclusive — one artist, then it's off the market",
};

async function uploadAudio(file) {
  const form = new FormData();
  form.append("file", file, file.name);
  const r = await api("/api/economy/uploads/", { method: "POST", body: form });
  if (!r?.upload?.id) throw new Error("The upload didn't come back — nothing was listed.");
  return r.upload.id;
}

export default function BeatZ() {
  const [tab, setTab] = useState("browse");
  const [beats, setBeats] = useState(null);
  const [err, setErr] = useState("");
  const [genre, setGenre] = useState("");

  const load = () => {
    const q = tab === "mine" ? "/api/economy/beatz/my-beats/"
      : `/api/economy/beatz/${genre ? `?genre=${encodeURIComponent(genre)}` : ""}`;
    setBeats(null);
    api(q).then((d) => setBeats(d.beats || [])).catch((e) => { setErr(e.message); setBeats([]); });
  };
  useEffect(load, [tab, genre]);

  const replace = (b) => setBeats((cur) => (cur || []).map((x) => (x.id === b.id ? { ...x, ...b } : x)));

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <header className="flex items-center gap-3">
        <img src="/icons/beatz-neon.svg" alt="" className="h-10 w-10" />
        <div>
          <h2 className="font-display text-2xl font-extrabold">BeatZ</h2>
          <p className="text-sm text-white/55">License beats from producers here, or sell your own. Paid in {MONEY}, straight to the producer.</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        {[["browse", "Browse"], ["mine", "My beats"], ["sell", "Sell a beat"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
                  className={`rounded-lg px-3 py-1.5 ${tab === k ? "bg-mcz-cyan/20 text-mcz-cyan" : "border border-white/10 text-white/60"}`}>{l}</button>
        ))}
        {tab === "browse" && (
          <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Filter by genre"
                 className="ml-auto w-36 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white" />
        )}
      </div>

      {err && <p className="text-sm text-mcz-ember">{err}</p>}

      {tab === "sell" ? <SellForm onListed={() => setTab("mine")} /> : (
        <>
          {tab === "mine" && <Earnings />}
          {beats === null ? (
            <p className="flex items-center gap-2 text-white/50"><Loader2 size={14} className="animate-spin" /> Loading…</p>
          ) : beats.length === 0 ? (
            <p className="text-sm text-white/50">
              {tab === "mine" ? "You haven't listed a beat yet." : "No beats listed yet."}{" "}
              <button onClick={() => setTab("sell")} className="text-mcz-cyan underline">Sell one</button>
            </p>
          ) : (
            <div className="space-y-3">{beats.map((b) => <BeatCard key={b.id} beat={b} onChange={replace} />)}</div>
          )}
        </>
      )}
    </div>
  );
}

function BeatCard({ beat, onChange }) {
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const openQuote = () => {
    setErr("");
    api(`/api/economy/beatz/${beat.id}/purchase/`).then(setQuote).catch((e) => setErr(e.message));
  };
  const buy = async () => {
    setBusy(true); setErr("");
    try {
      const r = await api(`/api/economy/beatz/${beat.id}/purchase/`, { method: "POST" });
      onChange({ ...beat, sold: (beat.sold || 0) + 1, left: Math.max(0, (beat.left || 0) - (beat.license_type === "exclusive" ? 1 : 0)), owned_by_me: true, purchase_id: r.id, can_buy: false, why_not: "You already hold a license." });
      setQuote(null);
      setMsg(`Licensed. ${usd(r.producer_payout_cents)} went to @${beat.producer}.`);
    } catch (e) { setErr(e.message || "The purchase didn't go through. Nothing was charged."); }
    finally { setBusy(false); }
  };

  const attach = async (file) => {
    if (!file) return;
    setBusy(true); setErr("");
    try {
      const id = await uploadAudio(file);
      onChange(await api(`/api/economy/beatz/${beat.id}/`, { method: "PATCH", body: { audio_upload_id: id } }));
    } catch (e) { setErr(e.message || "Couldn't attach that audio."); }
    finally { setBusy(false); }
  };

  return (
    <div className="neon-frame space-y-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold">{beat.title}</h3>
          <p className="text-xs text-white/50">
            {beat.mine ? "Your beat" : <>by <MemberName username={beat.producer} /></>} · {beat.genre}{beat.tempo_bpm ? ` · ${beat.tempo_bpm} BPM` : ""}
          </p>
        </div>
        <span className="text-sm font-bold text-white/85">{usd(beat.price_cents)} {MONEY}</span>
      </div>
      {beat.description && <p className="text-sm text-white/70">{beat.description}</p>}
      <p className="text-xs text-white/45">
        {LICENSE[beat.license_type] || beat.license_type}
        {beat.license_type === "exclusive" ? (beat.left ? " · still available" : " · sold") : ` · ${beat.sold} licensed`}
      </p>

      {beat.audio_url ? (
        <audio controls preload="none" src={beat.audio_url} className="w-full" />
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-white/45"><Music size={12} /> No preview yet.</p>
      )}

      {beat.mine ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {!beat.audio_url && <span className="text-mcz-ember">Nobody can buy it until you attach the audio.</span>}
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-white/70">
            <Upload size={12} /> {busy ? "Uploading…" : beat.audio_url ? "Replace audio" : "Attach audio"}
            <input type="file" accept="audio/*" className="hidden" disabled={busy} onChange={(e) => attach(e.target.files?.[0])} />
          </label>
          <span className="text-white/35">Uses your FileZ storage.</span>
        </div>
      ) : beat.owned_by_me ? (
        <p className="text-xs text-emerald-300">✓ You hold a {beat.license_type} license. The audio above is your file.</p>
      ) : !beat.can_buy ? (
        <p className="text-xs text-white/45">{beat.why_not}</p>
      ) : !quote ? (
        <button onClick={openQuote} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:border-mcz-cyan">
          License it <span className="text-mcz-ember">−{usd(beat.price_cents)} {MONEY}</span>
        </button>
      ) : (
        <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-xs">
          <p className="text-white/70"><span className="text-mcz-ember">−{usd(quote.price_cents)} {MONEY}</span> from your balance of {usd(quote.balance_cents)}.</p>
          <p className="text-white/50">@{beat.producer} gets {usd(quote.producer_cents)} · platform fee {usd(quote.fee_cents)}. A failed purchase charges nothing.</p>
          {quote.balance_cents < quote.price_cents ? (
            <p className="text-mcz-ember">You're {usd(quote.price_cents - quote.balance_cents)} short — top up in your wallet first.</p>
          ) : (
            <div className="flex gap-2">
              <button onClick={buy} disabled={busy} className="rounded-lg bg-mcz-cyan/20 px-3 py-1.5 text-mcz-cyan">
                {busy ? "Buying…" : `Confirm — pay ${usd(quote.price_cents)}`}
              </button>
              <button onClick={() => setQuote(null)} className="text-white/40">Cancel</button>
            </div>
          )}
        </div>
      )}
      {msg && <p className="text-xs text-emerald-300">{msg}</p>}
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
    </div>
  );
}

function Earnings() {
  const [e, setE] = useState(null);
  useEffect(() => { api("/api/economy/beatz/earnings/").then(setE).catch(() => {}); }, []);
  if (!e) return null;
  return (
    <p className="text-sm text-white/65">
      {e.total_sales} license{e.total_sales === 1 ? "" : "s"} sold ·{" "}
      <span className="text-emerald-300">+{usd(e.total_earnings_cents)} {MONEY}</span> earned, after the platform fee.
    </p>
  );
}

function SellForm({ onListed }) {
  const [f, setF] = useState({ title: "", genre: "", tempo_bpm: "", price: "", license_type: "nonexclusive", description: "" });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (ev) => {
    ev.preventDefault();
    setBusy(true); setErr("");
    try {
      const audio_upload_id = file ? await uploadAudio(file) : null;
      await api("/api/economy/beatz/", { method: "POST", body: {
        title: f.title, genre: f.genre, tempo_bpm: Number(f.tempo_bpm), description: f.description,
        price_cents: Math.round(parseFloat(f.price || "0") * 100), license_type: f.license_type, audio_upload_id,
      } });
      onListed();
    } catch (e) { setErr(e.message || "Couldn't list that beat."); }
    finally { setBusy(false); }
  };

  const input = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30";
  return (
    <form onSubmit={submit} className="neon-frame space-y-3 p-4" data-tour="beatz-sell">
      <input className={input} placeholder="Title" required value={f.title} onChange={set("title")} />
      <div className="grid gap-3 sm:grid-cols-3">
        <input className={input} placeholder="Genre" required value={f.genre} onChange={set("genre")} />
        <input className={input} placeholder="BPM" inputMode="numeric" required value={f.tempo_bpm} onChange={set("tempo_bpm")} />
        <input className={input} placeholder="Price in $ (1–500)" inputMode="decimal" required value={f.price}
               onChange={(e) => setF({ ...f, price: e.target.value.replace(/[^0-9.]/g, "") })} />
      </div>
      <select className={input} value={f.license_type} onChange={set("license_type")}>
        <option value="nonexclusive">{LICENSE.nonexclusive}</option>
        <option value="exclusive">{LICENSE.exclusive}</option>
      </select>
      <textarea className={input} rows={2} placeholder="What's it for? (optional)" value={f.description} onChange={set("description")} />
      <label className="block text-xs text-white/55">The beat itself — buyers hear this before they pay
        <input type="file" accept="audio/*" className="mt-1 block text-white/70" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </label>
      {!file && <p className="text-xs text-mcz-ember">Without audio it's listed but can't be sold until you attach it.</p>}
      <p className="text-xs text-white/45">
        Listing is free. When it sells you get the price minus the platform fee for your plan, in {MONEY}.
      </p>
      <button disabled={busy} className="rounded-lg bg-mcz-cyan/20 px-4 py-2 text-mcz-cyan">{busy ? "Listing…" : "List it"}</button>
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
    </form>
  );
}
