import { useEffect, useRef, useState } from "react";
import { Loader2, Save, Zap, Gift, Copy, Check, Users, Trash2, ShieldCheck, Loader, Lock, Palette, X, Heart, Search, Upload, Image as ImageIcon } from "lucide-react";
import { api, tokenStore } from "../api.js";
import { IconImg } from "../App.jsx";
import { isPremiumTier } from "../PickConnectZ.jsx";
import { PERSONA_ICON_VARIANTS, loadPersonaIcons, personaIcon, setPersonaIcon } from "../personaIcons.js";
import { PERSONA_SKILLS, periodsOf, skillActivity, skillYears } from "../personaSkills.js";
import { useCharLimit } from "../limits.js";
import CharLimit from "../CharLimit.jsx";
import { loadSocial, saveSocial, NATIONALITIES } from "./socialData.js";
import { SPINAZ } from "../resources.js";
import BadgeZ from "../BadgeZ.jsx";

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

// SubstanceZ — what a member uses, declared by them. A profile metric, so it is
// filterable on Social ConnectZ like every other one. Order runs legal → heavy;
// the copy stays non-judgemental because honest data beats flattering data.
const SUBSTANCES = [
  ["cigarettes", "Cigarettes", "🚬"],
  ["caffeine", "Caffeine", "☕"],
  ["alcohol", "Alcohol", "🍺"],
  ["thc", "THC", "🍃"],
  ["dxm", "DXM", "🧴"],
  ["adderall", "Adderall", "💊"],
  ["benzos", "Benzos", "💊"],
  ["opioids", "Opioids", "💊"],
  ["heroin", "Heroin", "💉"],
  ["crack", "Crack", "💎"],
  ["meth", "Meth", "💎"],
];

// PreferenceZ — the genders a member is attracted to. Any one, any mix, or all.
const PARTNER_GENDERS = [
  ["male", "Male", "♂"],
  ["female", "Female", "♀"],
  ["nonbinary", "Non-binary", "⚧"],
];

// ZodiacZ — the canonical date ranges. Shown so a member can see why their sign
// is what it is; the sign itself is derived server-side from the birthday.
const ZODIAC_RANGES = {
  Aries: "March 21 – April 19", Taurus: "April 20 – May 20", Gemini: "May 21 – June 20",
  Cancer: "June 21 – July 22", Leo: "July 23 – August 22", Virgo: "August 23 – September 22",
  Libra: "September 23 – October 22", Scorpio: "October 23 – November 21",
  Sagittarius: "November 22 – December 21", Capricorn: "December 22 – January 19",
  Aquarius: "January 20 – February 18", Pisces: "February 19 – March 20",
};

const ZODIAC_EMOJI = { Aries:"♈",Taurus:"♉",Gemini:"♊",Cancer:"♋",Leo:"♌",Virgo:"♍",
  Libra:"♎",Scorpio:"♏",Sagittarius:"♐",Capricorn:"♑",Aquarius:"♒",Pisces:"♓" };

// Premium ICONS (cosmetic art), independent of whether the PersonaZ is premium.
// Only the manga-styled alternate art is premium. Every PersonaZ in the grid —
// Designer included — is free to pick and shows its standard icon here, so no
// tile in this grid carries the Premium badge today.
const PREMIUM_ICONS = new Set(["personaz_designer_manga.png"]);


// Skill picker for one PersonaZ — 2.2's openSkillModal, with the start date it
// never had. The date is the point: the server derives a member's experience
// from the earliest one across all their skills, so an undated skill is a claim
// and a dated one is years served.
function SkillModal({ personaKey, personaLabel, skills, onChange, onClose }) {
  const cats = PERSONA_SKILLS[personaKey] || {};
  const today = new Date().toISOString().slice(0, 10);
  // name -> skill object, so a skill carries its stints rather than one date.
  const picked = Object.fromEntries((skills || []).map((s) => [s.name, s]));

  // Rows being edited live here, not in the saved value. A blank stint you are
  // about to type into has no start yet, and the saved value drops startless
  // periods — so emitting straight through deleted the row the moment "picked
  // it back up" created it, making a second stint impossible to add.
  const [draft, setDraft] = useState({});
  const rowsFor = (label) => draft[label] ?? (periodsOf(picked[label]).length ? periodsOf(picked[label]) : [{ start: "" }]);

  // Drop stints with no start on the way out — a period without one is not a
  // period, and storing it would look like dated experience that isn't there.
  const clean = (rows) => rows.filter((p) => p.start)
    .map((p) => (p.end ? { start: p.start, end: p.end } : { start: p.start }));

  function toggle(label) {
    const next = { ...picked };
    if (label in next) {
      delete next[label];
      setDraft(({ [label]: _drop, ...rest }) => rest);
    } else {
      next[label] = { name: label };
      setDraft((d) => ({ ...d, [label]: [{ start: "" }] }));
    }
    onChange(Object.values(next));
  }

  function setPeriods(label, rows) {
    setDraft((d) => ({ ...d, [label]: rows }));
    const c = clean(rows);
    onChange(Object.values({ ...picked, [label]: c.length ? { name: label, periods: c } : { name: label } }));
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
         onClick={onClose}>
      <div className="neon-frame max-h-[85vh] w-full max-w-md overflow-y-auto p-5"
           onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold">{personaLabel} skills</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <p className="mb-4 text-[11px] text-white/45">
          Pick what you actually do, then say when. Experience is the time you <em>served</em> — if you stopped,
          add the end date and the years you were away don't count. Picked it back up? Add another stretch.
        </p>

        {Object.entries(cats).map(([cat, entries]) => (
          <div key={cat} className="mb-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-mcz-ember">{cat}</p>
            <div className="space-y-1.5">
              {Object.entries(entries).map(([key, label]) => {
                const on = label in picked;
                const rows = on ? rowsFor(label) : [];
                const total = on ? skillYears(picked[label]) : null;
                const act = on ? skillActivity(picked[label]) : null;
                return (
                  <div key={key}>
                    <button onClick={() => toggle(label)}
                      className={`w-full rounded-lg border px-3 py-1.5 text-left text-xs transition ${
                        on ? "border-mcz-gold/70 bg-mcz-gold/10 text-white"
                           : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"}`}>
                      {on && <Check size={11} className="mr-1 inline text-mcz-gold" />}{label}
                    </button>

                    {on && (
                      <div className="mt-1 space-y-1 pl-3">
                        {rows.map((pr, i) => (
                          <div key={i} className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-white/40">{i === 0 ? "Started" : "Again"}</span>
                            <input type="date" value={pr.start || ""} max={today}
                              onChange={(e) => setPeriods(label, rows.map((r, j) => j === i ? { ...r, start: e.target.value } : r))}
                              className="rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white/70 outline-none" />
                            {pr.end ? (
                              <>
                                <span className="text-[10px] text-white/40">until</span>
                                <input type="date" value={pr.end} max={today} min={pr.start || undefined}
                                  onChange={(e) => setPeriods(label, rows.map((r, j) => j === i ? { ...r, end: e.target.value } : r))}
                                  className="rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white/70 outline-none" />
                                <button title="Still doing it"
                                  onClick={() => setPeriods(label, rows.map((r, j) => j === i ? { start: r.start } : r))}
                                  className="text-[10px] text-white/35 hover:text-mcz-cyan">still going</button>
                              </>
                            ) : (
                              <button
                                onClick={() => setPeriods(label, rows.map((r, j) => j === i ? { ...r, end: today } : r))}
                                className="text-[10px] text-white/35 hover:text-mcz-ember">
                                I stopped
                              </button>
                            )}
                            {rows.length > 1 && (
                              <button title="Remove this stretch"
                                onClick={() => setPeriods(label, rows.filter((_, j) => j !== i))}
                                className="text-[10px] text-red-300/60 hover:text-red-300">×</button>
                            )}
                          </div>
                        ))}

                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {rows.every((r) => r.end) && rows.some((r) => r.start) && (
                            <button onClick={() => setPeriods(label, [...rows, { start: "" }])}
                              className="text-[10px] text-mcz-cyan hover:brightness-125">+ picked it back up</button>
                          )}
                          {total != null && (
                            <span className="text-[10px] text-mcz-cyan">
                              {total} yr{total === 1 ? "" : "s"} total
                              {act?.active
                                ? <span className="text-emerald-300"> · active</span>
                                : act?.lastPlayed && <span className="text-white/35"> · last played {act.lastPlayed.slice(0, 4)}</span>}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <button className="re-btn !w-auto px-5" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

// Profile picture — view what you have, pick a new one, preview it, save.
// The picture lives on the economy profile (/api/economy/profile/), not on
// /api/auth/me/, so this reads its own copy rather than threading it through.
const AVATAR_MAX_MB = 8;

function AvatarCard() {
  const [url, setUrl] = useState(null);       // what's saved on the server
  const [preview, setPreview] = useState(""); // local object URL, pre-save
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const input = useRef(null);

  useEffect(() => {
    api("/api/economy/profile/").then((d) => setUrl(d?.avatar || null)).catch(() => {});
  }, []);

  // Revoke the object URL when it changes or the card unmounts, or every pick
  // leaks a blob for the life of the page.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after a cancel
    if (!f) return;
    setMsg("");
    if (!f.type.startsWith("image/")) return setMsg("That file isn't an image. Use a JPG, PNG, WebP or GIF.");
    if (f.size > AVATAR_MAX_MB * 1024 * 1024) return setMsg(`That image is too big — keep it under ${AVATAR_MAX_MB}MB.`);
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function discard() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(""); setFile(null); setMsg("");
  }

  async function save() {
    if (!file) return;
    setBusy(true); setMsg("");
    try {
      const body = new FormData();
      body.append("avatar", file);
      const d = await api("/api/economy/profile/avatar/", { method: "POST", body });
      setUrl(d?.avatar || null);
      discard();
      setMsg("Profile picture saved.");
    } catch (e) { setMsg(e.message || "Couldn't save that picture."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm("Remove your profile picture?")) return;
    setBusy(true); setMsg("");
    try {
      const d = await api("/api/economy/profile/avatar/", { method: "DELETE" });
      setUrl(d?.avatar || null);
      discard();
      setMsg("Picture removed.");
    } catch (e) { setMsg(e.message || "Couldn't remove it."); }
    finally { setBusy(false); }
  }

  const shown = preview || url;
  return (
    <div className="neon-frame space-y-3 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
        <ImageIcon size={13} className="text-mcz-ember" /> Profile picture
      </p>
      <div className="flex items-center gap-4">
        {shown ? (
          <img src={shown} alt="Your profile picture"
               className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-neon" />
        ) : (
          <IconImg icon="personaz.png" alt="" className="h-20 w-20 shrink-0 rounded-2xl opacity-60" />
        )}
        <div className="flex-1 space-y-2">
          <p className="text-[11px] text-white/45">
            {preview ? "Preview — not saved yet."
                     : url ? "This is what other members see."
                           : "No picture yet — you're showing the default PersonaZ art."}
          </p>
          <div className="flex flex-wrap gap-2">
            <input ref={input} type="file" accept="image/*" onChange={pick} className="hidden" />
            <button className="re-btn !w-auto px-4" onClick={() => input.current?.click()} disabled={busy}>
              <Upload size={14} /> {shown ? "Change" : "Choose"}
            </button>
            {preview && (
              <>
                <button className="neon-btn-primary !w-auto px-4" onClick={save} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save
                </button>
                <button className="re-btn !w-auto px-3" onClick={discard} disabled={busy}>Cancel</button>
              </>
            )}
            {url && !preview && (
              <button className="re-btn !w-auto px-3 !text-red-300" onClick={remove} disabled={busy}>
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
        </div>
      </div>
      {msg && <p className="text-[11px] text-mcz-gold">{msg}</p>}
    </div>
  );
}

export default function ProfileZ() {
  const [me, setMe] = useState(null);
  const [sel, setSel] = useState([]);
  const [birthday, setBirthday] = useState("");
  const [nats, setNats] = useState(() => loadSocial().profile?.nationalities || []);
  const [subs, setSubs] = useState({});        // SubstanceZ: {key: "sometimes"|"often"}
  const [sober, setSober] = useState(false);   // sober BY CHOICE — a claim, not a blank
  const [partners, setPartners] = useState([]); // PreferenceZ keys
  const [saved, setSaved] = useState(false);    // true briefly after a real save
  const [ref, setRef] = useState(null);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Chosen PersonaZ artwork, and which persona's icon picker is open.
  const [icons, setIcons] = useState(loadPersonaIcons);
  const [pickingIcon, setPickingIcon] = useState(null);
  const [pickingSkills, setPickingSkills] = useState(null); // persona key
  const [natQuery, setNatQuery] = useState("");
  const [bio, setBio] = useState("");
  const cl = useCharLimit();
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
      setMe(d); setBirthday(d.birthday || "");
      // Server may hold the old string form or the dict form — normalize once.
      setSel((d.personas || []).map((x) =>
        typeof x === "string" ? { key: x, name: x, skills: [] }
                              : { key: x.key || x.name, name: x.name || x.key, skills: x.skills || [] }));
      if (Array.isArray(d.nationalities) && d.nationalities.length) setNats(d.nationalities);
    }).catch((e) => setMsg(e.message));
    api("/api/auth/referrals/").then(setRef).catch(() => {});
    api("/api/economy/profile/").then((d) => {
      setBio(d?.bio || "");
      // Older saves are a bare list of keys with no frequency. Read them as
      // declared-but-unspecified rather than inventing a frequency for someone.
      setSubs(Array.isArray(d?.substances)
        ? Object.fromEntries(d.substances.map((k) => [k, "yes"]))
        : (d?.substances || {}));
      setSober(!!d?.sober);
      setPartners(Array.isArray(d?.attracted_to) ? d.attracted_to : []);
    }).catch(() => {});
  }, []);

  const refLink = ref ? `${window.location.origin}/register?ref=${encodeURIComponent(ref.code)}` : "";
  function copyRef() {
    if (!refLink) return;
    navigator.clipboard?.writeText(refLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }

  const hasPersona = (key) => sel.some((x) => x.key === key);
  function toggle(key, label) {
    setSel((cur) => cur.some((x) => x.key === key)
      ? cur.filter((x) => x.key !== key)
      : [...cur, { key, name: label, skills: [] }]);
  }
  const skillsOf = (key) => (sel.find((x) => x.key === key)?.skills) || [];
  function setSkills(key, skills) {
    setSel((cur) => cur.map((x) => (x.key === key ? { ...x, skills } : x)));
  }

  function toggleNat(name) {
    setNats((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));
  }

  async function save() {
    setBusy(true); setMsg(""); setSaved(false);
    // Mirror the public profile into the shared social store so Social ConnectZ
    // can surface & heritage-filter this user immediately.
    saveSocial({
      ...loadSocial(),
      profile: {
        // The NAME, not the persona object. sel[0] is {key, name, skills};
        // storing it whole put an object where Social ConnectZ renders a
        // string, and React refuses to render an object as a child — the
        // whole tab died with "Objects are not valid as a React child".
        user: me?.username, persona: sel[0]?.name || sel[0]?.key || "Creator",
        icon: "personaz.png", nationalities: nats, looking: "collab",
      },
    });
    try {
      // Two writes: identity fields on the account, metrics on the searchable
      // economy profile. Both must land before this reports success.
      const d = await api("/api/auth/me/", {
        method: "PATCH",
        body: { personas: sel, birthday: birthday || null, nationalities: nats },
      });
      await api("/api/economy/profile/", {
        method: "POST",
        body: { bio, substances: sober ? {} : subs, sober, attracted_to: partners, nationalities: nats },
      });
      setMe(d);
      setSaved(true);
      setMsg("Saved. Your bio, PersonaZ, ZodiacZ, NationalitieZ, SubstanceZ and PreferenceZ are live.");
      setTimeout(() => setSaved(false), 4000);
    } catch (e) {
      // Previously this swallowed every failure and answered "Saved locally",
      // so a profile that never reached the server looked saved.
      setMsg(e.message || "Couldn't save your profile — nothing was changed.");
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
            <span className="pill !text-mcz-pink">{SPINAZ} {me.spinaz} SpinaZ</span>
          </p>
        </div>
      </header>

      {/* BadgeZ — the medal, and the effect it actually carries. */}
      <BadgeZ />

      <AvatarCard />

      <Verify18Card />

      {/* ReferZ — invite links + referred members */}
      <div className="neon-frame space-y-3 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
          <Gift size={13} className="text-mcz-ember" /> ReferZ
          <span className="ml-auto flex items-center gap-1 text-mcz-pink">
            +{ref?.reward_per_join ?? 300} {SPINAZ} / legit join
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
          <span className="pill !text-mcz-pink">{SPINAZ} {ref?.spinaz_earned ?? 0} earned</span>
        </div>
        {ref?.members?.length > 0 && (
          <div className="space-y-1 border-t border-white/[0.06] pt-2">
            {ref.members.map((m) => (
              <div key={m.username} className="flex items-center justify-between text-sm">
                <span className="text-white/80">{m.username}</span>
                <span className="text-[11px] text-white/40">
                  {new Date(m.joined).toLocaleDateString()} · +{m.reward} {SPINAZ}
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
        <div data-tour="personas" className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {PERSONAS.map(([key, label, icon]) => {
            const shown = personaIcon(key, icon, icons);
            const hasVariants = (PERSONA_ICON_VARIANTS[key] || []).length > 1;
            return (
              <div key={key} className="relative">
                <button onClick={() => toggle(key, label)}
                  className={`flex w-full flex-col items-center gap-2 rounded-2xl border p-3 transition ${
                    hasPersona(key)
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
                  {hasPersona(key) && (
                    <span className="text-[9px] text-mcz-cyan">
                      {skillsOf(key).length} skill{skillsOf(key).length === 1 ? "" : "s"}
                    </span>
                  )}
                </button>
                {hasPersona(key) && (
                  <button onClick={() => setPickingSkills(key)}
                    data-tour="skills"
                    className="mt-1 w-full rounded-lg border border-mcz-cyan/30 py-1 text-[10px] font-semibold text-mcz-cyan hover:bg-mcz-cyan/10">
                    + Skills
                  </button>
                )}
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

      {/* PreferenceZ — partner genderZ. Any one, any mix, or all three. */}
      <div>
        <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
          <Heart size={13} className="text-mcz-pink" /> PreferenceZ — partner genderZ ({partners.length} selected)
        </p>
        <p className="mb-2 text-[11px] text-white/40">
          Who you're attracted to. Pick one, pick two, pick all three — it becomes a filter on Social ConnectZ.
        </p>
        <div className="flex flex-wrap gap-2">
          {PARTNER_GENDERS.map(([key, label, glyph]) => (
            <button key={key}
              onClick={() => setPartners((v) => v.includes(key) ? v.filter((x) => x !== key) : [...v, key])}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                partners.includes(key)
                  ? "border-mcz-pink/70 bg-mcz-pink/10 text-white shadow-neon"
                  : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"}`}>
              <span className="mr-1.5">{glyph}</span>{label}
            </button>
          ))}
        </div>
      </div>

      {/* SubstanceZ — declared use and how often, another searchable metric. */}
      <div>
        <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
          <IconImg icon="substancez.png" alt="" className="h-5 w-5 rounded" />
          SubstanceZ ({sober ? "sober by choice" : `${Object.keys(subs).length} declared`})
        </p>
        <p className="mb-2 text-[11px] text-white/40">
          What you actually use, and how often — sometimes and often are different lives. Honest beats
          flattering; it's a filter, so it puts you with people who live the same way. Tap once for
          sometimes, twice for often, again to clear.
        </p>

        {/* Sober BY CHOICE is a claim. An empty list only means you didn't say. */}
        <button
          onClick={() => { setSober((v) => !v); if (!sober) setSubs({}); }}
          className={`mb-3 rounded-full border px-3 py-1.5 text-xs transition ${
            sober ? "border-emerald-300/70 bg-emerald-300/10 text-emerald-200 shadow-neon"
                  : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"}`}>
          <span className="mr-1">🚫</span>Sober by choice
        </button>

        <div className={`flex flex-wrap gap-2 ${sober ? "pointer-events-none opacity-35" : ""}`}>
          {SUBSTANCES.map(([key, label, glyph]) => {
            const stance = subs[key];
            return (
              <button key={key}
                onClick={() => setSubs((v) => {
                  const next = { ...v };
                  if (!next[key]) next[key] = "sometimes";
                  else if (next[key] === "sometimes") next[key] = "often";
                  else delete next[key];
                  return next;
                })}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  stance === "often"
                    ? "border-mcz-ember/80 bg-mcz-ember/15 text-white shadow-neon"
                    : stance
                      ? "border-mcz-cyan/70 bg-mcz-cyan/10 text-white shadow-neon"
                      : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"}`}>
                <span className="mr-1">{glyph}</span>{label}
                {stance && (
                  <span className={`ml-1.5 text-[10px] ${stance === "often" ? "text-mcz-ember" : "text-mcz-cyan"}`}>
                    · {stance === "yes" ? "declared" : stance}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {sober ? (
          <p className="mt-2 text-[11px] text-emerald-300/80">
            Sober by choice — you'll show up for people filtering for that, which an empty list can't do.
          </p>
        ) : Object.keys(subs).length === 0 ? (
          <p className="mt-2 text-[11px] text-white/40">
            Nothing declared. That reads as "didn't say", not as sober — use the button above if you mean sober.
          </p>
        ) : null}
      </div>

      {/* Your bio. It already rendered on member profiles with no way to
          write one — the field existed everywhere except where you type it. */}
      <div data-tour="bio">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">
          Bio — who you are
        </p>
        <p className="mb-2 text-[11px] text-white/40">
          The first thing anyone reads on your profile. What you make, who you want to work with.
        </p>
        <textarea
          value={bio}
          rows={4}
          onChange={(e) => setBio(cl.clamp(e.target.value))}
          placeholder="Producer out of Denver. Trap and drill, mostly. Looking for vocalists who write their own hooks."
          className="neon-input resize-y text-sm"
        />
        <CharLimit cl={cl} value={bio} className="mt-1" />
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
        <div data-tour="nationalities" className="relative mb-2">
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
      <div data-tour="save" className="flex flex-wrap items-center gap-3">
        <button className="neon-btn-primary !w-auto px-6" disabled={busy} onClick={save}>
          {busy ? <Loader2 className="animate-spin" size={16} />
                : saved ? <Check size={16} />
                : <Save size={16} />}
          {busy ? "Saving…" : saved ? "Saved" : "Save ProfileZ"}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-300">
            <Check size={13} /> Your profile is live.
          </span>
        )}
      </div>

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

      {pickingSkills && (
        <SkillModal
          personaKey={pickingSkills}
          personaLabel={(PERSONAS.find(([k]) => k === pickingSkills) || [])[1] || pickingSkills}
          skills={skillsOf(pickingSkills)}
          onChange={(sk) => setSkills(pickingSkills, sk)}
          onClose={() => setPickingSkills(null)}
        />
      )}

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
