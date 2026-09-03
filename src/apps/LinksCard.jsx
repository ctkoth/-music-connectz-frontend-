// LinksCard — external accounts (Spotify, SoundCloud, YouTube, Instagram, a
// press kit, anything) on ProfileZ. Each verified link's real follower count
// becomes a source in reach_median, and Energy's hourly regen rate is
// reach_median ÷ tier — so this screen is not decoration, it is the input to
// a real number.
//
// Paste a URL and the server tells you which platform it is (a known domain
// instantly, an unrecognized one via one AI call) — the logo shows up before
// you've typed a label. Verifying is definitive for YouTube (OAuth — see
// YouTubeVerifyCard) and best-effort everywhere else (code-in-bio, or a
// quick AI identity match that queues for a human when it can't be sure).
//
// Per the cost/gain rule: every link that carries a real number shows the
// ⚡/hour this ONE link is worth — red for what removing it would cost,
// green for what verifying it would gain — computed server-side from the
// same formula that actually pays Energy, never a guess.
import { useEffect, useState } from "react";
import {
  Check, Link2, Loader2, Lock, Plus, Star, Trash2, Zap,
} from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { serviceFor } from "../socialServices.jsx";
import { ENERGY } from "../resources.js";
import EmbedLink from "../EmbedLink.jsx";
import YouTubeVerifyCard from "./YouTubeVerifyCard.jsx";

const VERIFY = "/api/economy/social/verify/";

/** −N ⚡/hr in red, +N ⚡/hr in green, per the cost/gain rule — nothing shown
 * at all when there's no real number behind this link yet. */
function EnergyChip({ delta }) {
  if (delta === null || delta === undefined || delta === 0) return null;
  const up = delta > 0;
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-bold ${up ? "text-emerald-300" : "text-mcz-ember"}`}
          title={up ? "What verifying this would add to your Energy regen" : "What removing this would cost your Energy regen"}>
      {up ? "+" : "−"}{Math.abs(delta)} {ENERGY}/hr
    </span>
  );
}

function LinkRow({ link, featured, onVerify, onRemove, onFeature, busy }) {
  const svc = serviceFor(link.service);
  return (
    <li className="space-y-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <a href={link.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2">
          <svc.Icon size={16} color={svc.color} />
          <span className="min-w-0 truncate text-[12px] text-white/80">{link.label}</span>
        </a>
        <div className="flex shrink-0 items-center gap-2">
          <EnergyChip delta={link.energy_delta} />
          {link.verified ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-300">
              <Check size={11} /> verified{link.verified_count != null ? ` · ${link.verified_count.toLocaleString()}` : ""}
            </span>
          ) : link.review === "pending" ? (
            <span className="text-[10px] text-mcz-gold">pending review</span>
          ) : (
            <button className="re-link text-[10px]" disabled={busy} onClick={() => onVerify(link)}>Verify</button>
          )}
          <button
            className={featured ? "text-mcz-gold" : "text-white/25 hover:text-mcz-gold"}
            disabled={busy} onClick={() => onFeature(link, featured)}
            title={featured ? "Featured at the top of your profile — tap to unfeature" : "Pin to the top of your profile"}
          >
            <Star size={13} fill={featured ? "currentColor" : "none"} />
          </button>
          <button className="text-white/25 hover:text-mcz-ember" disabled={busy} onClick={() => onRemove(link)} title="Remove">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </li>
  );
}

export default function LinksCard() {
  const [links, setLinks] = useState(null);
  const [reach, setReach] = useState(0);
  const [featured, setFeatured] = useState(null); // {url, label, service} | null
  const [url, setUrl] = useState("");
  const [detected, setDetected] = useState(null); // {service, label, source}
  const [detecting, setDetecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => api(VERIFY).then((d) => {
    setLinks(asList(d?.links)); setReach(d?.reach_median || 0); setFeatured(d?.featured_link || null);
  });
  useEffect(() => { load().catch(() => setLinks([])); }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  async function detect() {
    if (!url.trim()) return;
    setDetecting(true);
    try {
      const d = await api("/api/economy/social/detect/", { method: "POST", body: { url: url.trim() } });
      setDetected(d);
    } catch (e) { flash(e.message || "Couldn't read that link."); }
    finally { setDetecting(false); }
  }

  async function addLink() {
    if (!url.trim() || !detected) return;
    setBusy(true);
    try {
      await api(VERIFY, {
        method: "POST",
        body: { action: "save", url: url.trim(), label: detected.label, service: detected.service },
      });
      setUrl(""); setDetected(null);
      await load();
      flash(`${detected.label} added.`);
    } catch (e) { flash(e.message || "Couldn't add that link."); }
    finally { setBusy(false); }
  }

  async function verify(link) {
    setBusy(true);
    try {
      const r = await api(VERIFY, { method: "POST", body: { action: "match", url: link.url } });
      await load();
      flash(r.verified ? `${link.label} verified.` : (r.detail || "Sent for review."));
    } catch (e) { flash(e.message || "Couldn't verify that."); }
    finally { setBusy(false); }
  }

  async function remove(link) {
    if (!window.confirm(`Remove ${link.label}? If it was counting toward your reach, your Energy rate updates immediately.`)) return;
    setBusy(true);
    try {
      await api(VERIFY, { method: "POST", body: { action: "remove", url: link.url } });
      await load();
      flash(`${link.label} removed.`);
    } catch (e) { flash(e.message || "Couldn't remove that."); }
    finally { setBusy(false); }
  }

  async function toggleFeature(link, isFeatured) {
    setBusy(true);
    try {
      await api(VERIFY, {
        method: "POST",
        body: isFeatured ? { action: "unfeature" } : { action: "feature", url: link.url },
      });
      await load();
      flash(isFeatured ? "Unfeatured." : `${link.label} now plays at the top of your profile.`);
    } catch (e) { flash(e.message || "Couldn't feature that."); }
    finally { setBusy(false); }
  }

  if (links === null) {
    return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading links…</p>;
  }

  return (
    <div className="neon-frame space-y-3 p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/45">
        <Link2 size={12} /> External links & reach
      </p>
      <p className="text-[11px] text-white/40">
        Spotify, SoundCloud, Instagram, a press kit — anything. A verified link's real follower
        count feeds your reach median, and reach ÷ tier is your hourly <Zap size={10} className="inline text-mcz-gold" /> Energy
        regen — currently <b className="text-mcz-gold">{reach.toLocaleString()}</b> median reach.
      </p>

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-mcz-gold">{msg}</p>}

      {featured && (
        <div className="space-y-1">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-mcz-gold">
            <Star size={10} fill="currentColor" /> Featured — plays at the top of your profile
          </p>
          <EmbedLink link={featured} />
        </div>
      )}

      {links.length === 0 ? (
        <p className="text-[12px] text-white/35">No links yet — paste one below.</p>
      ) : (
        <ul className="space-y-1.5">
          {links.map((l) => (
            <LinkRow key={l.url} link={l} featured={featured?.url === l.url}
                     onVerify={verify} onRemove={remove} onFeature={toggleFeature} busy={busy} />
          ))}
        </ul>
      )}

      <div className="space-y-2 border-t border-white/[0.08] pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <input className="neon-input !flex-1 !py-2 text-xs" placeholder="Paste a profile link — spotify.com/artist/…"
                 value={url}
                 onChange={(e) => { setUrl(e.target.value); setDetected(null); }}
                 onBlur={detect} />
          <button className="re-btn !w-auto px-3 text-xs" disabled={detecting || !url.trim()} onClick={detect}>
            {detecting ? <Loader2 className="animate-spin" size={12} /> : "Detect"}
          </button>
        </div>
        {detected && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.06] px-3 py-2">
            <span className="flex items-center gap-2 text-[12px] text-white/80">
              {(() => { const s = serviceFor(detected.service); return <s.Icon size={16} color={s.color} />; })()}
              {detected.label}
              {detected.source === "ai" && <span className="text-[10px] text-white/35">(AI-detected)</span>}
            </span>
            <button className="re-btn !w-auto px-3 text-xs" disabled={busy} onClick={addLink}>
              {busy ? <Loader2 className="animate-spin" size={12} /> : <Plus size={12} />} Add
            </button>
          </div>
        )}
      </div>

      <YouTubeVerifyCard onChange={load} />

      <p className="flex items-center gap-1.5 text-[10px] text-white/30">
        <Lock size={10} /> Ranges are exclusive elsewhere in the app the same way: only VERIFIED sources
        ever count toward reach — nobody games it by typing a stranger's follower count.
      </p>
    </div>
  );
}
