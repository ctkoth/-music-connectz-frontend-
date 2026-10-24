import AiEnergy from "../components/AiEnergy.jsx";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { goToSpot, goToTab } from "../goto.js";
import { RatingRow } from "../components/Rating.jsx";
import { PROMPTZ } from "../resources.js";
import { useDragReorder, DragGrip } from "../useDragReorder.jsx";
import { moveItem } from "../dragReorder.js";

// LookZMaxZ (key and API stay `lookmaxz`) — what you can change about how you present, by sector, and where to
// shop for it. It decides nothing: sectors, factors, the wording, the price, who
// may use it, the products and the marketplaces all come from
// /api/economy/lookmaxz/. A client that knew skin has a hydration factor would be
// the second place that list lives.
//
// Three things the screen holds to:
//  * The price is on the button BEFORE the photo is sent (cost/gain rule), and it
//    says a photo that can't be read is not charged and what is free.
//  * Body is never read from a photo. It is BodieZ's own measured progress, and
//    the card says so, because a "body score" from a picture is the harm this
//    feature was built around.
//  * A factor the photo did not show is "not visible", never a number.

function Price({ s }) {
  if (!s) return null;
  if (s.free_today) {
    return (
      <span className="text-[11px] text-emerald-300">
        Free today <span className="text-white/45">— uses 1 of the {s.daily_prompts_left} {PROMPTZ} you have left</span>
      </span>
    );
  }
  return (
    <span className="text-[11px]">
      <span className="font-semibold text-mcz-ember">−{s.cost_cents} {PROMPTZ}</span>
      {!s.affordable && <span className="ml-1 text-white/45">— today's free prompts are spent</span>}
    </span>
  );
}

function Shelf({ items, note }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((p) => (
        <li key={p.key} className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
          <p className="text-[13px] font-semibold text-white/90">
            {p.label}
            {p.score != null && <span className="ml-1.5 text-[11px] font-normal text-white/45">for {p.factor_label} · {p.score}/10</span>}
            {p.score == null && <span className="ml-1.5 text-[11px] font-normal text-white/45">for {p.factor_label}</span>}
          </p>
          <p className="text-[11px] leading-snug text-white/60">{p.why}</p>
          {p.caution && <p className="text-[11px] leading-snug text-mcz-gold">⚠ {p.caution}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {p.links.map((l) => (
              <a key={l.key} href={l.url} target="_blank" rel="noopener noreferrer nofollow sponsored"
                className="re-btn !w-auto inline-flex items-center gap-1 px-2.5 py-1 text-[11px]">
                {l.name} <ExternalLink size={11} />
              </a>
            ))}
          </div>
        </li>
      ))}
      {note && <li className="text-[11px] text-white/40">{note}</li>}
    </ul>
  );
}

// What a factor looks at, why it matters and how to move it — all three from the server,
// shown before any photo is sent: a number with no description is a broken feature.
function HowItsRated({ meta }) {
  return (
    <details className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-widest text-white/45">What, why and how — every factor</summary>
      <dl className="mt-2 space-y-2">
        {Object.entries(meta.factor_info || {}).map(([f, i]) => (
          <div key={f}>
            <dt className="text-[12px] font-semibold text-white/90">{i.label}</dt>
            <dd className="text-[11px] leading-snug text-white/65"><span className="text-white/40">What: </span>{i.what}</dd>
            <dd className="text-[11px] leading-snug text-white/65"><span className="text-white/40">Why: </span>{i.why}</dd>
            <dd className="text-[11px] leading-snug text-emerald-200/80"><span className="text-white/40">How: </span>{i.how}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function Sector({ k, meta, data, shop, affiliate }) {
  const rows = Object.entries(meta.factors).map(([f, label]) => ({
    key: f, label, value: data?.scores?.[f] ?? null,
    detail: data?.scores?.[f] == null ? (meta.source === "bodiez" ? "" : "Not visible in this photo — not guessed.") : "",
  }));
  return (
    <section className="neon-frame space-y-2.5 p-4" data-tour={`lookmax-${k}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white">{meta.emoji} {meta.label}</h3>
          <p className="text-[11px] leading-snug text-white/55">{meta.means}</p>
        </div>
      </div>
      <RatingRow value={data?.score} label={`${meta.label} — average of its factors`}
        detail={data?.score == null ? (data?.why || "Nothing in this sector could be read.") : (data?.why || "Plain mean of the factors below that the photo showed.")} size="lg" outOf />
      {meta.source === "photo" && (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {rows.map((r) => <RatingRow key={r.key} value={r.value} label={r.label} detail={r.detail} size="sm" />)}
        </div>
      )}
      {data?.advice?.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-[12px] text-white/80">
          {data.advice.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      )}
      {data?.disclaimer && <p className="rounded-lg border border-mcz-gold/25 p-2 text-[11px] leading-snug text-white/60">{data.disclaimer}</p>}
      {k === "proportions" && data?.measures && (
        <p className="text-[11px] leading-snug text-white/55">
          Measured in this photo, roughly — thirds {["upper", "middle", "lower"].map((m) => data.measures[m] ?? "—").join(" / ")} (reference about 0.33 each) ·
          eye gap {data.measures.eye_gap_over_eye_width ?? "—"} eye-widths (about 1) · width to height {data.measures.width_over_height ?? "—"} (about 0.67) ·
          balance {data.measures.symmetry ?? "—"} (1 is a mirror). Not in your overall.
        </p>
      )}
      {k === "physique" && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-white/50">Not in your overall. Each low area opens BodieZ's builder for the muscles that train it.</p>
          {(data?.doors || []).map((dr) => (
            <button key={dr.factor} type="button" className="re-btn !w-auto mr-1.5 px-3 text-[12px]"
              onClick={() => { try { sessionStorage.setItem("bodiez.prefillMuscle", dr.open_in.muscle); } catch { /* blocked */ } goToTab("bodiez"); }}>
              {dr.open_in.label} · {dr.score}/10
            </button>
          ))}
          {!data?.doors?.length && data?.score != null && <p className="text-[11px] text-emerald-300">Nothing here reads as lagging — keep logging in BodieZ.</p>}
        </div>
      )}
      {k === "body" && (
        <div className="space-y-1">
          <p className="text-[11px] text-white/60">{data?.sessions_28d ?? 0} session{data?.sessions_28d === 1 ? "" : "s"} logged in the last 28 days — shown, never scored: turning up is not the same as getting stronger.</p>
          <button type="button" className="re-btn !w-auto px-3 text-[12px]" onClick={() => goToSpot("bodiez")}>
            {data?.open_in?.label || "Open BodieZ"}
          </button>
        </div>
      )}
      {shop?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Worth a look · lowest first</p>
          <Shelf items={shop} />
          <p className="text-[10px] text-white/35">{affiliate}</p>
        </div>
      )}
      <HowItsRated meta={meta} />
      <p className="text-[11px] leading-snug text-white/50">🩺 {meta.see_pro}</p>
    </section>
  );
}

function Markets({ info, onChange }) {
  const [rows, setRows] = useState(info.markets.map((m) => ({ ...m })));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const statz = info.can_customise;
  useEffect(() => { setRows(info.markets.map((m) => ({ ...m }))); }, [info]);

  const swap = (i, j) => setRows((r) => { const n = [...r]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const dnd = useDragReorder("markets", (from, to) => setRows((r) => moveItem(r, from, to)));
  async function save() {
    setBusy(true); setMsg("");
    try {
      const r = await api("/api/economy/lookmaxz/markets/", { method: "PUT", body: { markets: rows.map((m) => (m.url && m.custom !== false ? { key: m.key, name: m.name, url: m.url } : { key: m.key })) } });
      setMsg(r.saved_note || "Saved."); onChange(r);
    } catch (x) { setMsg(x.message); } finally { setBusy(false); }
  }
  async function reset() {
    setBusy(true);
    try { const r = await api("/api/economy/lookmaxz/markets/", { method: "DELETE" }); setMsg("Back to Amazon, eBay and Walmart."); onChange(r); }
    catch (x) { setMsg(x.message); } finally { setBusy(false); }
  }

  return (
    <section className="neon-frame space-y-2 p-4" data-tour="lookmax-markets">
      <h3 className="text-sm font-bold text-white">🛒 Where you shop</h3>
      <p className="text-[11px] leading-snug text-white/55">
        Links open the marketplace's own search in a new tab. Everyone gets Amazon, eBay and Walmart first;
        {" "}StatZ can use their own marketplaces instead, in their own order.
      </p>
      {!statz && (
        <ol className="list-decimal space-y-0.5 pl-5 text-[12px] text-white/80">
          {info.markets.map((m) => <li key={m.key}>{m.name}</li>)}
        </ol>
      )}
      {!statz && info.saved > 0 && <p className="text-[11px] text-white/45">Your saved list of {info.saved} comes back with StatZ.</p>}
      {!statz && (
        <button type="button" className="re-btn !w-auto px-3 text-[12px]" onClick={() => goToSpot("membershipz", "membershipz-plans")}>
          <Lock size={12} /> Choose your own marketplaces — StatZ
        </button>
      )}
      {statz && (
        <div className="space-y-1.5">
          {rows.map((m, i) => (
            <div key={`${m.key}-${i}`} {...dnd.row(i)} className={`flex flex-wrap items-center gap-1.5 rounded${dnd.rowClass(i)}`}>
              <DragGrip label="Drag to reorder" size={13} {...dnd.grip(i)} />
              <input aria-label="Marketplace name" className="neon-input !w-32" value={m.name} maxLength={30}
                onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, name: e.target.value, key: x.key || e.target.value } : x)))} />
              <input aria-label="Search address with {q}" className="neon-input min-w-0 flex-1" value={m.url} placeholder="https://shop.example.com/search?q={q}"
                onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => swap(i, i - 1)} className="re-btn !w-auto px-1.5"><ArrowUp size={12} /></button>
              <button type="button" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => swap(i, i + 1)} className="re-btn !w-auto px-1.5"><ArrowDown size={12} /></button>
              <button type="button" aria-label="Remove marketplace" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} className="re-btn !w-auto px-1.5"><Trash2 size={12} /></button>
            </div>
          ))}
          <p className="text-[11px] text-white/45">{info.rule} Up to {info.custom_max}.</p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="re-btn !w-auto px-3 text-[12px]" disabled={rows.length >= info.custom_max}
              onClick={() => setRows((r) => [...r, { key: "", name: "", url: "" }])}><Plus size={12} /> Add marketplace</button>
            <button type="button" className="re-btn !w-auto px-3 text-[12px]" onClick={save} disabled={busy}>Save</button>
            <button type="button" className="re-btn !w-auto px-3 text-[12px]" onClick={reset} disabled={busy}>Back to the three</button>
          </div>
        </div>
      )}
      {msg && <p className="text-[11px] text-white/70">{msg}</p>}
    </section>
  );
}

export default function LookmaxZ() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [picked, setPicked] = useState(null);
  const [self, setSelf] = useState(false);
  // One acknowledgement per opt-in sector (proportions, body photo): each says what it is and is
  // not, in the server's words, and is refused by the server without its tick.
  const [acks, setAcks] = useState({});
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [shelf, setShelf] = useState(null);

  const load = () => api("/api/economy/lookmaxz/").then((r) => { setD(r); setPicked((p) => p || r.default_sectors); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function read() {
    if (!file || !self) return;
    setBusy(true); setErr(""); setRes(null);
    try {
      const body = new FormData();
      body.append("photo", file); body.append("confirm_self", "true"); body.append("sectors", picked.join(","));
      picked.filter((k) => d.opt_in_sectors?.includes(k)).forEach((k) => body.append(`${k}_ack`, "true"));
      const r = await api("/api/economy/lookmaxz/", { method: "POST", body });
      setRes(r);
      if (r.charged) window.dispatchEvent(new Event("mcz-stats-refresh"));
      load();
    } catch (x) { setErr(x.message); } finally { setBusy(false); setFile(null); }
  }
  async function openShelf(sector) {
    try { setShelf(await api(`/api/economy/lookmaxz/shop/?sector=${sector}`)); } catch (x) { setErr(x.message); }
  }

  if (!d && !err) return <div className="p-6 text-white/50"><Loader2 className="animate-spin" size={16} /></div>;
  if (!d) return <p className="p-4 text-sm text-mcz-ember">{err}</p>;

  const optIns = (picked || []).filter((k) => d.opt_in_sectors?.includes(k));
  const optInsAcked = optIns.every((k) => acks[k]);
  const toggle = (k) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const meta = d.sectors;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <header>
        <h2 className="font-display text-xl font-extrabold text-white">✨ LookZMaxZ</h2>
        <p className="text-[12px] leading-snug text-white/60">
          What you can change about how you present — face, skin, teeth, styling and body — with what to do about it and where to shop.
          It never rates bone structure, face shape or body shape, and nothing about your photo or your score is kept.
        </p>
      </header>

      {d.locked ? (
        <section className="neon-frame space-y-2 border-mcz-ember/30 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-mcz-ember"><Lock size={14} /> 18+ only</p>
          <p className="text-[12px] text-white/70">{d.locked}</p>
          <button type="button" className="re-btn !w-auto px-3 text-[12px]" onClick={() => goToSpot("profilez", "verify-18")}>Verify I'm 18+ in ProfileZ</button>
        </section>
      ) : (
        <>
          <section className="neon-frame space-y-3 p-4" data-tour="lookmax-read">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Read one photo</p>
            <div className="flex flex-wrap gap-1.5">
              {d.photo_sectors.map((k) => (
                <button key={k} type="button" aria-pressed={picked?.includes(k)} onClick={() => toggle(k)}
                  className={`rounded-full border px-3 py-1 text-[12px] ${picked?.includes(k) ? "border-mcz-cyan bg-mcz-cyan/10 text-white" : "border-white/15 text-white/50"}`}>
                  {meta[k].emoji} {meta[k].label}{d.opt_in_sectors?.includes(k) ? " · opt-in" : ""}
                </button>
              ))}
            </div>
            {optIns.map((k) => (
              <div key={k} className="space-y-1.5 rounded-lg border border-mcz-gold/30 bg-mcz-gold/[0.04] p-2.5">
                <p className="text-[11px] font-semibold text-mcz-gold">{meta[k].emoji} {meta[k].label} — read this first</p>
                <p className="text-[11px] leading-snug text-white/70">{k === "proportions" ? d.proportions_disclaimer : d.physique_disclaimer}</p>
                {k === "proportions" && <p className="text-[10px] leading-snug text-white/45">{d.proportions_rule}</p>}
                <label className="flex items-start gap-2 text-[12px] text-white/80">
                  <input type="checkbox" checked={!!acks[k]} onChange={(e) => setAcks((a) => ({ ...a, [k]: e.target.checked }))} className="mt-0.5" />
                  I've read this and want {meta[k].label.toLowerCase()} included.
                </label>
              </div>
            ))}
            <label className="flex items-start gap-2 text-[12px] text-white/70">
              <input type="checkbox" checked={self} onChange={(e) => setSelf(e.target.checked)} className="mt-0.5" />
              This is a photo of me. I'm not uploading anyone else's.
            </label>
            <input aria-label="Photo of yourself" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-[12px] text-white/70" />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="re-btn !w-auto px-4" disabled={busy || !file || !self || !picked?.length || !d.affordable || !d.configured || !optInsAcked} onClick={read}>
                {busy ? <><Loader2 size={14} className="animate-spin" /> Reading…</> : "Read my photo"}
              </button>
              <Price s={d} /> <AiEnergy className="text-[11px]" />
            </div>
            <p className="text-[11px] leading-snug text-white/45">{d.cost_note}</p>
            {!d.configured && <p className="text-[11px] text-white/40">The reader isn't switched on yet.</p>}
            <p className="text-[11px] leading-snug text-white/45">{d.caveat}</p>
            <div className="space-y-1 rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">How it's rated</p>
              <p className="text-[11px] leading-snug text-white/60">{d.rating_rule}</p>
              <ul className="grid gap-x-4 sm:grid-cols-2">
                {d.scale.map((b) => <li key={b.band} className="text-[11px] text-white/60"><span className="font-semibold text-white/80">{b.band}</span> — {b.means}</li>)}
              </ul>
            </div>
            {picked?.map((k) => <HowItsRated key={k} meta={meta[k]} />)}
          </section>

          {err && <p role="alert" className="text-sm text-mcz-ember">{err}</p>}

          {res && (
            <div className="space-y-3">
              {res.unreadable ? (
                <section className="neon-frame space-y-1 p-4">
                  <p className="text-sm text-white/80">{res.unreadable}</p>
                  <p className="text-[11px] text-emerald-300">Not charged.</p>
                </section>
              ) : (
                <>
                  <section className="neon-frame space-y-2 p-4">
                    <RatingRow value={res.overall} label="Overall — plain average of the sectors you asked for"
                      detail={res.verdict} size="lg" outOf />
                    {res.photo_quality != null && <RatingRow value={res.photo_quality} label="Photo quality — how well this photo shows you, not a score of you" size="sm" />}
                    {res.working?.length > 0 && (
                      <ul className="list-disc space-y-0.5 pl-5 text-[12px] text-emerald-200/90">{res.working.map((w, i) => <li key={i}>{w}</li>)}</ul>
                    )}
                    <p className="text-[11px] text-emerald-300">Charged {res.cost_cents} {PROMPTZ} once — or covered by a free prompt — however many sectors.</p>
                  </section>
                  {Object.keys(res.sectors).map((k) => (
                    <Sector key={k} k={k} meta={meta[k]} data={res.sectors[k]} shop={res.shop?.[k]} affiliate={res.affiliate_note} />
                  ))}
                </>
              )}
            </div>
          )}

          {!res && d.body && (
            <Sector k="body" meta={meta.body} data={d.body} shop={null} affiliate="" />
          )}

          <section className="neon-frame space-y-2 p-4" data-tour="lookmax-shelf">
            <h3 className="text-sm font-bold text-white">🛍️ Browse the shelf — free, no photo</h3>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(meta).map((k) => (
                <button key={k} type="button" className="rounded-full border border-white/15 px-3 py-1 text-[12px] text-white/70" onClick={() => openShelf(k)}>
                  {meta[k].emoji} {meta[k].label}
                </button>
              ))}
            </div>
            {shelf && Object.entries(shelf.shop).map(([k, items]) => (
              <div key={k} className="space-y-1.5">
                <Shelf items={items} />
                <p className="text-[10px] text-white/35">{shelf.affiliate_note}</p>
              </div>
            ))}
          </section>

          {d.markets && <Markets info={d} onChange={(r) => setD((p) => ({ ...p, ...r }))} />}
        </>
      )}

      <p className="text-[11px] leading-snug text-white/40">{d.care_note}</p>
    </div>
  );
}
