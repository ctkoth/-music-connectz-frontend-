import { useEffect, useState } from "react";
import { Loader2, Save, Star, Zap, Gift, Copy, Check, Users, Trash2, ShieldCheck, Loader, Lock, Palette, X, Search } from "lucide-react";
import { api, tokenStore } from "../api.js";
import { IconImg } from "../App.jsx";
import { isPremiumTier } from "../PickConnectZ.jsx";
import { PERSONA_ICON_VARIANTS, loadPersonaIcons, personaIcon, setPersonaIcon } from "../personaIcons.js";
import { loadSocial, saveSocial, NATIONALITIES } from "./socialData.js";

// 18+ age verification via Stripe Identity. Government ID + selfie; the backend
// webhook flips the flag only if the verified DOB proves 18+. Gates money
// betting (BattleZ) and adult content.
function Verify18Card() {
  const [st, setSt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // A verify return (?verify=done) — refetch status and acknowledge.
    if (new URLSearchParams(window.location.search).get("verify") === "done") {
      setMsg("Thanks! If your ID cleared, your 18+ badge appears within a minute.");
      window.history.replaceState({}, "", window.location.pathname);
    }
    api("/api/economy/identity/").then(setSt).catch(() => setSt({ verified_18plus: false, stripe_enabled: false }));
  }, []);

  async function start() {
    setBusy(true); setMsg("");
    try {
      const r = await api("/api/economy/identity/", { method: "POST", body: {} });
      if (r?.already || r?.verified_18plus) { setSt({ ...st, verified_18plus: true }); setBusy(false); return; }
      if (r?.url) { window.location.href = r.url; return; }
      setMsg("Couldn't start verification — try again.");
    } catch (e) {
      setMsg(/503|not configured/i.test(e?.message || "") ? "ID verification isn't switched on yet." : "Couldn't start verification — try again.");
    }
    setBusy(false);
  }

  if (!st) return null;
  const verified = !!st.verified_18plus;
  return (
    <div className={`neon-frame space-y-2 p-4 ${verified ? "" : "border-mcz-ember/30"}`}>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
        <ShieldCheck size={13} className={verified ? "text-emerald-400" : "text-mcz-ember"} /> 18+ Verification
      </p>
      {verified ? (
        <p className="flex items-center gap-2 text-sm text-emerald-300"><Check size={15} /> You're verified 18+ — money betting &amp; adult features are unlocked.</p>
      ) : (
        <>
          <p className="text-[11px] text-white/50">Verify your age with a government ID + selfie (via Stripe Identity) to unlock money betting in BattleZ and adult content. We never store your ID — Stripe handles it.</p>
          <button className="re-btn !w-auto px-4" onClick={start} disabled={busy || !st.stripe_enabled}>
            {busy ? <Loader size={14} className="animate-spin" /> : <ShieldCheck size={14} />} {busy ? "Starting…" : "Verify I'm 18+"}
          </button>
          {!st.stripe_enabled && <p className="text-[11px] text-white/40">Verification is being switched on — check back soon.</p>}
        </>
      )}
      {msg && <p className="text-[11px] text-white/70">{msg}</p>}
    </div>
  );
}

const PERSONAS = [
  ["arscout", "A&R Scout", "personaz_arscout.png"],
  ["designer", "Designer", "personaz_designer.png"],
  ["developer", "Developer", "personaz_developer.png"],
  ["director", "Director", "personaz_director.webp"],
  ["ghostwriter", "GhostWriter", "personaz_ghostwriter.png"],
  ["indieartist", "Indie Artist", "personaz_indieartist.png"],
  ["manager", "Manager", "personaz_manager.png"],
  ["mime", "Mime", "personaz_mime.png"],
  ["mixengineer", "Mix Engineer", "personaz_mixengineer.png"],
  ["producer", "Producer", "personaz_producer.png"],
  ["videographer", "Videographer", "personaz_videographer.png"],
];
const ZODIAC_EMOJI = { Aries:"♈",Taurus:"♉",Gemini:"♊",Cancer:"♋",Leo:"♌",Virgo:"♍",
  Libra:"♎",Scorpio:"♏",Sagittarius:"♐",Capricorn:"♑",Aquarius:"♒",Pisces:"♓" };

// Premium ICONS (cosmetic art), independent of whether the PersonaZ is premium.
// Only the manga-styled alternate art is premium. Every PersonaZ in the grid —
// Designer included — is free to pick and shows its standard icon here, so no
// tile in this grid carries the Premium badge today.
const PREMIUM_ICONS = new Set(["personaz_designer_manga.png"]);

export default function ProfileZ() {
  const [me, setMe] = useState(null);
  const [sel, setSel] = useState([]);
  const [birthday, setBirthday] = useState("");
  const [nats, setNats] = useState(() => loadSocial().profile?.nationalities || []);
  const [ref, setRef] = useState(null);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Chosen PersonaZ artwork, and which persona's icon picker is open.
  const [icons, setIcons] = useState(loadPersonaIcons);
  const [pickingIcon, setPickingIcon] = useState(null);
  const [natQuery, setNatQuery] = useState("");
  const premium = isPremiumTier(me?.tier);
  // Matches by PREFIX, not substring: typing "i" should give Irish, Italian,
  // Indian — not every name with an i buried in it. Word starts count too, so
  // "rican" still finds Puerto Rican and "islander" finds Pacific Islander;
  // whole-name matches sort above word matches so the obvious answer leads.
  // Selected entries are always kept — a filter that hides your own choices
  // makes them look lost and invites picking the same heritage twice.
  const natMatches = (() => {
    const q = natQuery.trim().toLowerCase();
    if (!q) return NATIONALITIES;
    const rank = ([, name]) => {
      const n = name.toLowerCase();
      if (n.startsWith(q)) return 0;                                   // Irish
      if (n.split(/[^a-zà-ÿ]+/).some((w) => w.startsWith(q))) return 1; // Puerto Rican
      return nats.includes(name) ? 2 : 3;                              // kept / dropped
    };
    return NATIONALITIES.filter((row) => rank(row) < 3)
                        .sort((a, b) => rank(a) - rank(b));
  })();

  async function deleteAccount() {
    if (!window.confirm("Permanently delete your account and ALL your data? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api("/api/auth/me/", { method: "DELETE" });
      tokenStore.clear();
      window.location.href = "/login";
    } catch (e) {
      setMsg(e.message || "Couldn't delete account.");
      setDeleting(false);
    }
  }

  useEffect(() => {
    api("/api/auth/me/").then((d) => {
      setMe(d); setSel(d.personas || []); setBirthday(d.birthday || "");
      if (Array.isArray(d.nationalities) && d.nationalities.length) setNats(d.nationalities);
    }).catch((e) => setMsg(e.message));
    api("/api/auth/referrals/").then(setRef).catch(() => {});
  }, []);

  const refLink = ref ? `${window.location.origin}/register?ref=${encodeURIComponent(ref.code)}` : "";
  function copyRef() {
    if (!refLink) return;
    navigator.clipboard?.writeText(refLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }

  function toggle(key) {
    setSel((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  function toggleNat(name) {
    setNats((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));
  }

  async function save() {
    setBusy(true); setMsg("");
    // Mirror the public profile into the shared social store so Social ConnectZ
    // can surface & heritage-filter this user immediately.
    saveSocial({
      ...loadSocial(),
      profile: {
        user: me?.username, persona: sel[0] || "Creator",
        icon: "personaz.png", nationalities: nats, looking: "collab",
      },
    });
    try {
      const d = await api("/api/auth/me/", {
        method: "PATCH",
        body: { personas: sel, birthday: birthday || null, nationalities: nats },
      });
      setMe(d); setMsg("Saved! PersonaZ, ZodiacZ & NationalitieZ are set.");
    } catch (e) {
      // Backend may not persist nationalities yet — local heritage still saved.
      setMsg("Saved locally. NationalitieZ now filterable on Social ConnectZ.");
    } finally { setBusy(false); }
  }

  if (!me) return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="personaz.png" alt="ProfileZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#ffcf3f" }}>{me.username}</h2>
          <p className="flex flex-wrap gap-2 pt-1 text-sm">
            <span className="pill uppercase !text-mcz-cyan">{me.tier} tier</span>
            {me.zodiac && <span className="pill">{ZODIAC_EMOJI[me.zodiac]} {me.zodiac}</span>}
            <span className="pill !text-mcz-gold"><Zap size={11} className="inline" /> {me.energy} Energy</span>
            <span className="pill !text-mcz-pink"><Star size={11} className="inline" /> {me.spinaz} SpinaZ</span>
          </p>
        </div>
      </header>

      <Verify18Card />

      {/* ReferZ — invite links + referred members */}
      <div className="neon-frame space-y-3 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
          <Gift size={13} className="text-mcz-ember" /> ReferZ
          <span className="ml-auto flex items-center gap-1 text-mcz-pink">
            <IconImg icon="spinaz.png" alt="" className="h-4 w-4 rounded-full" />
            +{ref?.reward_per_join ?? 300} SpinaZ / legit join
          </span>
        </p>
        <p className="text-[11px] text-white/40">Share your link. You earn SpinaZ every time someone new joins with it.</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={refLink || "Loading your link…"}
            onFocus={(e) => e.target.select()}
            className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-white/80 outline-none"
          />
          <button className="re-btn !w-auto px-3" onClick={copyRef} disabled={!refLink}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="pill"><Users size={11} className="inline" /> {ref?.count ?? 0} referred</span>
          <span className="pill !text-mcz-pink"><Star size={11} className="inline" /> {ref?.spinaz_earned ?? 0} SpinaZ earned</span>
        </div>
        {ref?.members?.length > 0 && (
          <div className="space-y-1 border-t border-white/[0.06] pt-2">
            {ref.members.map((m) => (
              <div key={m.username} className="flex items-center justify-between text-sm">
                <span className="text-white/80">{m.username}</span>
                <span className="text-[11px] text-white/40">
                  {new Date(m.joined).toLocaleDateString()} · +{m.reward} SpinaZ
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="neon-frame space-y-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/45">ZodiacZ — birthday</p>
        <input type="date" className="neon-input !w-auto" value={birthday || ""} onChange={(e) => setBirthday(e.target.value)} />
        <p className="text-xs text-white/40">Your sign auto-detects from your birthday. Only the sign shows publicly.</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">
          Your PersonaZ — pick every role you play ({sel.length} selected)
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {PERSONAS.map(([key, label, icon]) => {
            const shown = personaIcon(key, icon, icons);
            const hasVariants = (PERSONA_ICON_VARIANTS[key] || []).length > 1;
            return (
              <div key={key} className="relative">
                <button onClick={() => toggle(key)}
                  className={`flex w-full flex-col items-center gap-2 rounded-2xl border p-3 transition ${
                    sel.includes(key)
                      ? "border-mcz-gold/70 bg-mcz-gold/10 shadow-neon"
                      : "border-white/10 bg-black/30 hover:bg-white/5"
                  }`}>
                  <span className="relative">
                    <IconImg icon={shown} alt={label} className="h-14 w-14 rounded-full object-cover" />
                    {PREMIUM_ICONS.has(shown) && (
                      <span className="absolute -bottom-1 -right-1 rounded-md bg-mcz-ember px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide text-white shadow-neon">
                        Premium
                      </span>
                    )}
                  </span>
                  <span className="text-xs">{label}</span>
                </button>
                {hasVariants && (
                  <button
                    onClick={() => setPickingIcon(key)}
                    title={`Change the ${label} icon`}
                    className="absolute right-1 top-1 rounded-lg border border-white/10 bg-black/60 p-1 text-white/60 transition hover:text-white"
                  >
                    <Palette size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
          <IconImg icon="nationalitiez.png" alt="" className="h-5 w-5 rounded" />
          NationalitieZ — your heritage ({nats.length} selected)
        </p>
        <p className="mb-2 text-[11px] text-white/40">
          Represent your ancestry. Selections become a filterable metric on Social ConnectZ.
        </p>

        {/* 62 entries is a wall to scan. Type to narrow it; anything already
            selected stays visible regardless of the query, so filtering can
            never hide a choice you have made. */}
        <div className="relative mb-2">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            value={natQuery}
            onChange={(e) => setNatQuery(e.target.value)}
            placeholder="Start typing — i shows Irish, Italian, Indian…"
            className="neon-input !py-2 pl-9 pr-8 text-xs"
          />
          {natQuery && (
            <button onClick={() => setNatQuery("")}
              title="Clear"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {natMatches.map(([flag, name]) => (
            <button
              key={name}
              onClick={() => toggleNat(name)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                nats.includes(name)
                  ? "border-mcz-pink/70 bg-mcz-pink/15 text-white shadow-neon"
                  : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"
              }`}
            >
              {flag} {name}
            </button>
          ))}
        </div>
        {natQuery && (
          <p className="mt-2 text-[11px] text-white/35">
            {natMatches.length === 0
              ? <>Nothing matches “{natQuery}”. Try a shorter word.</>
              : <>{natMatches.length} of {NATIONALITIES.length} shown{nats.length > 0 && " · your selections stay visible"}.</>}
          </p>
        )}
      </div>

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">{msg}</p>}
      <button className="neon-btn-primary !w-auto px-6" disabled={busy} onClick={save}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save ProfileZ
      </button>

      {/* Danger zone — permanent account deletion */}
      <div className="mt-8 rounded-2xl border border-red-500/25 bg-red-500/5 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-red-300/80">Danger zone</p>
        <p className="mb-3 text-xs text-white/50">
          Permanently delete your account and all your data (posts, referrals, messages, SpinaZ). This can't be undone.
        </p>
        <button
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
          disabled={deleting}
          onClick={deleteAccount}
        >
          {deleting ? <Loader2 className="mr-1 inline animate-spin" size={14} /> : <Trash2 className="mr-1 inline" size={14} />}
          Delete my account
        </button>
      </div>

      {/* PersonaZ icon picker — the art only; the PersonaZ itself is always free. */}
      {pickingIcon && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setPickingIcon(null)}
        >
          <div className="neon-frame w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold">
                {(PERSONAS.find(([k]) => k === pickingIcon) || [])[1]} icon
              </h3>
              <button onClick={() => setPickingIcon(null)} className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(PERSONA_ICON_VARIANTS[pickingIcon] || []).map((v) => {
                const locked = v.premium && !premium;
                const current = personaIcon(pickingIcon, (PERSONA_ICON_VARIANTS[pickingIcon] || [])[0]?.icon, icons) === v.icon;
                return (
                  <button
                    key={v.icon}
                    disabled={locked}
                    onClick={() => { setIcons(setPersonaIcon(pickingIcon, v.icon)); setPickingIcon(null); }}
                    title={locked ? "Premium members can use this artwork" : v.label}
                    className={`relative flex flex-col items-center gap-2 rounded-2xl border p-3 transition ${
                      current
                        ? "border-mcz-gold/70 bg-mcz-gold/10 shadow-neon"
                        : locked
                        ? "border-white/5 opacity-45"
                        : "border-white/10 bg-black/30 hover:bg-white/5"
                    }`}
                  >
                    <IconImg icon={v.icon} alt={v.label} className="h-20 w-20 rounded-2xl object-cover" />
                    <span className="text-xs">{v.label}</span>
                    {v.premium && (
                      <span className="absolute right-1 top-1 flex items-center gap-0.5 rounded-md bg-mcz-ember px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide text-white">
                        {locked && <Lock size={7} />} Premium
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {!premium && (
              <p className="mt-4 text-[11px] text-white/45">
                The PersonaZ is free for everyone — only the alternate artwork needs Premium. Upgrade in MembershipZ to unlock it.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
