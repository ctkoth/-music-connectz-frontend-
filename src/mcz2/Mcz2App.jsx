import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { AppStateProvider, useAppState, dataThemeFor } from "./AppState.jsx";
import { CATALOG, APPS_BY_KEY, ICON_VARIANTS, iconFor } from "./catalog.js";
import { accentStyle, accentOptionsFor } from "./colors.js";
import { REGIONS } from "./heritage.js";
import { CONTINENTS, TOP_60, flagOf } from "./nationalitiez.js";
import { MUSCLE_GROUPS, EQUIPMENT, LOCATIONS, EXERCISES, isAvailable, availableEquipment } from "./bodiez.js";
import { RANGE_CLASSES, GOAL_PATHS, DIFFICULTIES, SCORE_METERS, SKILLS as SINGZ_SKILLS, CHECKIN, simScore, wellnessOf } from "./singz.js";
import { decodeBlob, analyzeAudioBuffer } from "./audioLab.js";
import { SIGNS, zodiacFor, dailyReading, signByName, signCompatibility } from "./zodiac.js";
import { GAME_GENRES, SEED_GAMES, subgenresFor, genreEmoji, langsForTier } from "./gamez.js";
import { AI_MODELS as OCC_AI_MODELS, aiModel, centsLabel, CURRICULA, courseForQuery } from "./aiModels.js";
import { MEDIA_ROUTES, routeForFile, ROUTE_BY_APP, extOf } from "./mediaRouting.js";
import { AI_MODELS, CALLABLE_USERS, AI_UNIT_SECONDS, USER_UNIT_SECONDS, callCost, fmtDuration } from "./callz.js";
import { DAWS } from "./dawz.js";
import { LANGUAGES, langByCode, langLabel, langName, suggestLanguages } from "./languages.js";
import { AutoTranslate, translateOne } from "./i18n.jsx";
import { devTaxFor, splitTransaction, splitCashout, collabSettlement, money, mbLabel, TIER_PRICING, TIER_EMOJI, tierKey, tierLabel, FLOW_GREEN, FLOW_RED, SPINAZ_PER_DOLLAR, SPINAZ_EARNINGS, energyRatePerHour, editWindowFor, EDIT_WINDOW_LABEL } from "./economy.js";

// Tier + Founding Member badges, reusable across profiles and member cards.
// Tapping the tier chip (when onOpen given) jumps to MembershipZ upgrade prices.
const TIER_COLOR = { free: "var(--text-light)", premium: "var(--gold, #ffcf3f)", statz: "var(--cyan, #22e6ff)", debug: "var(--gold, #ffcf3f)" };
function TierBadge({ tier, onOpen, size = 12 }) {
  const k = tierKey(tier);
  const clickable = !!onOpen && k !== "statz" && k !== "debug";
  return (
    <span
      className="tag"
      title={clickable ? "Tap to see upgrade prices" : `${tierLabel(k)} member`}
      onClick={clickable ? () => onOpen("membership") : undefined}
      style={{ color: TIER_COLOR[k], fontSize: size, cursor: clickable ? "pointer" : "default", borderColor: TIER_COLOR[k] }}
    >
      {TIER_EMOJI[k]} {tierLabel(k)}{clickable ? " · ⬆️ upgrade" : ""}
    </span>
  );
}
function FoundingBadge({ founding, lifetime }) {
  if (!founding && !lifetime) return null;
  return <span className="tag" title="Founding 50 member" style={{ color: "var(--gold, #ffcf3f)", borderColor: "var(--gold, #ffcf3f)" }}>👑 Founding{lifetime ? " · Lifetime" : ""}</span>;
}
// Follow / friends / fans. Mutual follow = friends; one-way = a fan.
const REL_BADGE = {
  friends: { label: "🤝 Friends", color: "var(--success)" },
  fan: { label: "⭐ Your fan", color: "var(--gold, #ffcf3f)" },
  following: { label: "Following", color: "var(--primary)" },
  none: null,
};
function FollowButton({ username, rel: rel0, counts: counts0, onChange }) {
  const [rel, setRel] = useState(rel0 || { is_following: false, label: "none" });
  const [counts, setCounts] = useState(counts0 || null);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      const r = await followApi(username, rel.is_following ? "unfollow" : "follow");
      setRel(r.relationship); setCounts(r); onChange?.(r);
    } catch { /* offline */ }
    setBusy(false);
  };
  const badge = REL_BADGE[rel.label];
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "6px 0" }}>
      <button className={`btn btn-small${rel.is_following ? " btn-secondary" : ""}`} disabled={busy} onClick={toggle}>
        {rel.is_following ? "✓ Following" : rel.follows_me ? "↩️ Follow back" : "➕ Follow"}
      </button>
      {badge && <span className="tag" style={{ color: badge.color }}>{badge.label}</span>}
      {counts && <span style={{ fontSize: 11, color: "var(--text-light)" }}>👥 {counts.total_followers} followers · 🤝 {counts.friends}</span>}
    </div>
  );
}

// 1–10 rater for a member's profile picture. dimension = overall | attractiveness.
function ProfileRater({ username, dimension, label, emoji, median, mine, onRated }) {
  const [busy, setBusy] = useState(false);
  const [my, setMy] = useState(mine ?? null);
  const rate = async (score) => {
    setBusy(true);
    try { const r = await rateProfileApi(username, dimension, score); setMy(score); onRated?.(r); } catch { /* offline */ }
    setBusy(false);
  };
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, marginBottom: 3, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span>{emoji} {label}:</span>
        <StarRow value={median || 0} size={13} /><strong>{median != null ? `${median}/10` : "unrated"}</strong>{my != null ? <span style={{ color: "var(--text-light)" }}> · you {my}</span> : ""}
      </div>
      <StarRow value={my || 0} size={20} showEnds onRate={(n) => !busy && rate(n)} />
    </div>
  );
}

// Colored money: green = money in / growth, red = money out / cost.
// `flow`: "in" (green), "out" (red), or omit for neutral. Optional sign prefix.
function Amount({ value, flow, sign = false, bold = false }) {
  const color = flow === "in" ? FLOW_GREEN : flow === "out" ? FLOW_RED : "inherit";
  const prefix = sign ? (flow === "out" ? "−" : flow === "in" ? "+" : "") : "";
  return <span style={{ color, fontWeight: bold ? 700 : "inherit" }}>{prefix}{money(Math.abs(Number(value) || 0))}</span>;
}

// Canonical earned/lost paradigm for INTEGER currencies (SpinAZ, Energy, XP,
// counts) across every Music ConnectZ app: earned shows as a green +N, lost as a
// red −N. `unit` is an optional trailing emoji (🍥/⚡/…). Money uses <Amount>.
function Delta({ value, unit = "", bold = true, style }) {
  const n = Math.round(Number(value) || 0);
  const color = n > 0 ? FLOW_GREEN : n < 0 ? FLOW_RED : "var(--text-light)";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return <span style={{ color, fontWeight: bold ? 700 : "inherit", ...style }}>{sign}{Math.abs(n)}{unit ? ` ${unit}` : ""}</span>;
}

// Wraps user-generated text (post/comment) with a 🌐 Translate toggle. The text
// is marked data-notranslate so the whole-app auto-translator leaves it alone;
// tapping transcreates it into the viewer's display language (charges a prompt,
// cached), and toggles back to the original.
function Translatable({ text, tag: Tag = "div", className, style, onCharge }) {
  const { state } = useAppState();
  const lang = state.settings?.uiLang || "en";
  const [out, setOut] = useState(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const s = (text ?? "").toString();
  const canT = lang !== "en" && s.trim().length > 1;
  const toggle = async () => {
    setErr("");
    if (out != null) { setShow((v) => !v); return; }
    setBusy(true);
    try { setOut(await translateOne(s, lang, onCharge)); setShow(true); }
    catch { setErr(" · couldn't translate"); }
    setBusy(false);
  };
  return (
    <>
      <Tag className={className} style={style} data-notranslate>{show && out != null ? out : text}</Tag>
      {canT && (
        <button className="btn-link" style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: "2px 0", fontSize: 10 }} onClick={toggle}>
          {busy ? "🌐 translating…" : show ? "↩️ original" : "🌐 translate"}<span style={{ color: "var(--danger)" }}>{err}</span>
        </button>
      )}
    </>
  );
}
// Lets the member choose which icon an app shows (for apps with >1 variant).
// Choosing a custom icon is a Premium perk — Free stays on the default with a
// lock + upgrade prompt. The choice persists in settings.appIcons and applies
// everywhere the tile draws.
function AppIconPicker({ appKey, tier, onOpen }) {
  const { state, updateSettings } = useAppState();
  const variants = ICON_VARIANTS[appKey] || [];
  if (variants.length < 2) return null;
  const app = APPS_BY_KEY[appKey];
  const current = iconFor(state.settings?.appIcons, appKey, app?.icon);
  const locked = tierKey(tier) === "free";
  const choose = (icon) => { if (!locked) updateSettings({ appIcons: { ...(state.settings?.appIcons || {}), [appKey]: icon } }); };
  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }} data-notranslate>
        {variants.map((v) => {
          const on = current === v.icon;
          return (
            <button key={v.icon} onClick={() => choose(v.icon)} title={locked ? "Premium perk" : v.label} disabled={locked}
              style={{ background: "none", border: `2px solid ${on ? "var(--primary)" : "var(--border)"}`, borderRadius: 14, padding: 5, cursor: locked ? "not-allowed" : "pointer", boxShadow: on ? "var(--glow)" : "none", textAlign: "center", opacity: locked && !on ? 0.5 : 1, position: "relative" }}>
              <IconImg icon={v.icon} alt={v.label} style={{ width: 54, height: 54, borderRadius: 11, display: "block" }} />
              <div style={{ fontSize: 10, marginTop: 3, color: on ? "var(--primary)" : "var(--text-light)" }}>{on ? "✓ " : ""}{v.label}{locked && !on ? " 🔒" : ""}</div>
            </button>
          );
        })}
      </div>
      {locked && (
        <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 6 }}>
          🔒 Choosing app icons is a <strong>Premium</strong> perk. <button className="btn-link" style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0, textDecoration: "underline", font: "inherit" }} onClick={() => onOpen?.("membership")}>Upgrade to customize.</button>
        </p>
      )}
    </>
  );
}
import { LimitsProvider, useLimits } from "./LimitsContext.jsx";
import { PostModalProvider, usePostModal } from "./PostModalContext.jsx";
import {
  isSignedIn, getWallet, addFundsApi, setTierApi,
  getSpecZApi, buySpecZApi, getRoyaltiesApi, cashoutRoyaltiesApi,
  getUploadsApi, uploadFileApi, deleteUploadApi,
  getCheckoutConfig, createStripeCheckout, createPaypalOrder, capturePaypalOrder,
  getFoundingApi, claimFoundingApi, foundingCheckoutApi,
  getRefundWindowApi, refundMembershipApi,
  getVenuesApi, createVenueApi, joinVenueApi,
  getAttractivenessApi, setAttractivenessOptInApi,
  getFacezApi, createFaceApi, rateFaceApi, deleteFaceApi,
  saveProfileApi, searchMembersApi, getMemberApi, uploadAvatarApi, rateProfileApi, setLocationApi,
  startSocialVerifyApi, checkSocialVerifyApi,
  followApi, getNotificationsApi, markNotificationApi,
  reportItemApi, blockUserApi, exportAccountApi, deleteAccountApi,
  getConversationsApi, getThreadApi, sendMessageApi,
  getMerchApi, createMerchApi, buyMerchApi, deleteMerchApi,
  getDirectzApi, createDirectzApi, rateDirectzApi,
  getCollabsApi, createCollabApi, fundCollabApi, deliverCollabApi, releaseCollabApi, disputeCollabApi, refundCollabApi,
  getParcelApi, sendParcelApi,
  getAutoTopUpsApi, createAutoTopUpApi, cancelAutoTopUpApi,
  getIdentityApi, startIdentityApi,
  getPostzApi, createPostzApi, editPostApi, joinPostzApi, sharePostzApi, getSubmissionsApi,
  clickLinkApi, getLinkTalliesApi,
  transcodeApi, distributeLyricsApi,
  getAdzApi, createCommercialApi, deleteCommercialApi, rewardAdApi,
  chargeAiApi, occChatApi,
  getSocialApi, reactSocialApi, commentSocialApi, rateSocialApi, editCommentApi,
  editMessageApi,
} from "./economyApi.js";
import { IMAGE_TYPES, VIDEO_TYPES, MIX_MODES, MIX_TARGETS, MIX_EXTRAS, INSTR_GENRES, INSTR_INSTRUMENTS, KEYS, occTierFor, DOC_TYPES, INTEL_APPS, MOOD_GROUPS, MOODS, DIRECTZ_FORMATS, directzFormatForSec, DIRECTZ_GENRES, TV_GENRES, MOVIE_GENRES } from "./intelligence.js";
import "./mcz2.css";

// Transparent transaction breakdown — RepostExchange-style: plain numbers,
// the developer-tax cut always shown, and the bold total the user pays.
function CostBreakdown({ amount, tier, recipient = "Recipient", payLabel = "You pay" }) {
  const { gross, dev, net, rate, label } = splitTransaction(amount, tier);
  if (!gross) return null;
  return (
    <div className="txn">
      <div className="txn-row"><span>Amount</span><span>{money(gross)}</span></div>
      <div className="txn-row txn-tax"><span>Developer tax · {label} {Math.round(rate * 100)}%</span><Amount value={dev} flow="out" sign /></div>
      <div className="txn-row"><span>{recipient} receives</span><Amount value={net} flow="in" bold /></div>
      <div className="txn-total"><span>{payLabel}</span><Amount value={gross} flow="out" bold /></div>
    </div>
  );
}

// Textarea that enforces the active tier's character cap and shows a live
// counter. The cap comes from LimitsContext (backend /api/economy/limits/ when
// live, local TIER_LIMITS otherwise) — the same limit the server enforces.
function CappedTextarea({ value, onChange, ...rest }) {
  const { char_limit, tier } = useLimits();
  const len = (value || "").length;
  const near = char_limit && len >= char_limit * 0.9;
  const atLimit = char_limit && len >= char_limit;
  const canUpgrade = (tier || "free") !== "statz";
  return (
    <>
      <textarea value={value} onChange={onChange} maxLength={char_limit || undefined} {...rest} />
      {char_limit ? (
        <div className="char-count" style={{ fontSize: 10, display: "flex", justifyContent: "space-between", color: near ? "var(--gold, #ffcf3f)" : "var(--text-light)", marginTop: 2 }}>
          <span>{atLimit && canUpgrade ? "🔒 Limit reached — upgrade for more" : near && canUpgrade ? "Almost at your limit" : ""}</span>
          <span>{len.toLocaleString()} / {char_limit.toLocaleString()}</span>
        </div>
      ) : null}
    </>
  );
}

// Readout of the active tier's caps, sourced from LimitsContext.
function TierLimitsCard() {
  const { char_limit, upload_mb, storage_mb, storage_used_mb, tier, live } = useLimits();
  return (
    <div className="card">
      <div className="card-header">
        <span>📦 Tier Limits</span>
        <span className="tag" style={live ? { color: "var(--success)" } : undefined}>{tier || "free"} · {live ? "● live" : "offline"}</span>
      </div>
      <div className="skill-item"><span className="skill-item-name">✍️ Text / prompt length</span><span className="skill-item-exp">{Number(char_limit).toLocaleString()} chars</span></div>
      <div className="skill-item"><span className="skill-item-name">⬆️ Max upload size</span><span className="skill-item-exp">{mbLabel(upload_mb)}</span></div>
      <div className="skill-item"><span className="skill-item-name">💾 Storage</span><span className="skill-item-exp">{storage_used_mb != null ? `${mbLabel(storage_used_mb)} / ` : ""}{mbLabel(storage_mb)}</span></div>
      <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>Caps are enforced server-side; text inputs cut off at your character limit. Upgrade for higher limits.</p>
    </div>
  );
}

// Derive the public, searchable profile payload from local AppState.
function buildProfilePayload(state) {
  const u = state.user || {};
  const nats = u.nationalities || [];
  const regions = REGIONS.filter((r) => nats.includes(r.any) || (r.countries || []).some((c) => nats.includes(c))).map((r) => r.name);
  const subs = u.substances || {};
  const declared = Object.values(subs).filter(Boolean);
  const sober = declared.length > 0 && !Object.values(subs).includes("use");
  const z = zodiacFor(u.birthday);
  const pref = u.preferences || {};
  return {
    display_name: u.name || "",
    bio: u.bio || "",
    location: u.location || "",
    gender: u.gender || "",
    birthday: u.birthday || "",
    sign: z ? z.name : "",
    nationalities: nats,
    regions,
    languages: u.languages || [],
    substances: subs,
    sober,
    attracted_to: pref.partnerGenders || (pref.partnerGender ? [pref.partnerGender] : []),
    asexual: !!pref.asexual,
    traits: pref.traits || [],
    personas: (state.personas || []).map((p) => ({ name: p.name, emoji: p.emoji, skills: p.skills || [] })),
    links: (state.user.links || []).map((l) => ({ label: l.label, url: l.url })),
  };
}

// Flashes a "✓ Saved" confirmation when auto-saving edits (metrics pages).
function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  const ping = () => { setSaved(true); setTimeout(() => setSaved(false), 1400); };
  return [saved, ping];
}
function SavedFlash({ saved }) {
  return <span className="tag" style={{ color: saved ? "var(--success)" : "var(--text-light)", transition: "color .2s" }}>{saved ? "✓ Saved" : "Auto-saves"}</span>;
}

// Live edit-window countdown off a created-at timestamp + the viewer's tier.
// Returns { remaining (sec), expired }. Ticks every second while the window is open.
function useEditWindow(createdAt) {
  const { tier } = useLimits();
  const windowSec = editWindowFor(tier);
  const startMs = createdAt ? new Date(createdAt).getTime() : Date.now();
  const calc = () => Math.max(0, Math.round(windowSec - (Date.now() - startMs) / 1000));
  const [remaining, setRemaining] = useState(calc);
  useEffect(() => {
    setRemaining(calc());
    if (windowSec >= 10 ** 8) return undefined; // owner/unlimited — no ticking
    const t = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(t);
  }, [createdAt, windowSec]);
  return { remaining, expired: remaining <= 0 && windowSec < 10 ** 8, unlimited: windowSec >= 10 ** 8 };
}

const fmtCountdown = (s) => {
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return `${s}s`;
};
// Human duration for media length: "1h 12m" / "45m" / "40s".
const fmtDur = (s) => {
  s = Math.round(s || 0);
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ""}`;
  return `${s}s`;
};

// Renders the edit affordance while the window is open, or a 🔒 + upgrade nudge
// when it's expired. `onEdit` is the "start editing" callback; `onUpgrade` opens
// MembershipZ. Owner/unlimited shows an infinity marker.
function EditCountdown({ createdAt, onEdit, onUpgrade, mine }) {
  const { remaining, expired, unlimited } = useEditWindow(createdAt);
  const upgrade = onUpgrade || (() => { if (typeof window !== "undefined") window.location.assign("/membership"); });
  if (!mine) return null;
  if (unlimited) return <button className="btn-link" style={editLinkStyle} onClick={onEdit}>✏️ edit ∞</button>;
  if (expired) {
    return (
      <span style={{ fontSize: 10, color: "var(--text-light)" }}>
        🔒 edit window passed ·{" "}
        <button className="btn-link" style={{ ...editLinkStyle, color: "var(--gold, #ffcf3f)" }} onClick={upgrade}>upgrade for longer ({EDIT_WINDOW_LABEL})</button>
      </span>
    );
  }
  return <button className="btn-link" style={editLinkStyle} onClick={onEdit}>✏️ edit · {fmtCountdown(remaining)} left</button>;
}
const editLinkStyle = { background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0, fontSize: 10 };

// EditZ 🕞 — expandable timestamped edit history (newest on top).
function EditZHistory({ history, editedAt, field = "body" }) {
  const [open, setOpen] = useState(false);
  const rows = (history || []).slice().reverse();
  if (!editedAt && rows.length === 0) return null;
  return (
    <span style={{ marginLeft: 6 }}>
      <button className="btn-link" style={{ ...editLinkStyle, color: "var(--text-light)" }} onClick={() => setOpen((v) => !v)} title="Edit history">
        🕞 EditZ{editedAt ? ` · edited ${new Date(editedAt).toLocaleString()}` : ""}
      </button>
      {open && (
        <div style={{ marginTop: 4, padding: 6, borderRadius: 8, background: "rgba(255,255,255,0.05)" }}>
          {rows.length === 0 ? <div style={{ fontSize: 10, color: "var(--text-light)" }}>No prior versions recorded.</div>
            : rows.map((h, i) => (
              <div key={i} style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 3 }}>
                <span style={{ color: "var(--gold, #ffcf3f)" }}>{h.at ? new Date(h.at).toLocaleString() : "—"}</span> · {String(h[field] ?? h.body ?? h.score ?? h.title ?? "")}
              </div>
            ))}
        </div>
      )}
    </span>
  );
}

// Explicit Save button + saved/unsaved cue for editable pages. Default save
// persists the public profile (buildProfilePayload); pass onSave for a custom one.
function ProfileSaveBar({ dirty, onSave, label = "Save" }) {
  const { state } = useAppState();
  const [saved, ping] = useSavedFlash();
  const save = () => {
    if (onSave) onSave();
    else if (isSignedIn()) saveProfileApi(buildProfilePayload(state)).catch(() => {});
    ping();
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
      <button className="btn btn-success" style={{ flex: 1 }} onClick={save}>💾 {label}</button>
      {saved ? <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 700 }}>✓ Saved</span>
        : dirty ? <span style={{ fontSize: 11, color: "var(--gold, #ffcf3f)" }}>Unsaved changes</span>
        : <span style={{ fontSize: 11, color: "var(--text-light)" }}>Auto-saves</span>}
    </div>
  );
}

// Shared gate: business personas (Manager / A&R Scout / Label) unlock legal
// tooling like contracts and royalty agreements.
function isBizPersona(personas) {
  return (personas || []).some((p) => /manager|a&r|scout|label/i.test(p.name || ""));
}

// Upgrade call-to-action button — drops the member straight into MembershipZ
// from any locked feature. Every upgrade prompt should pair its 🔒 copy with this.
function UpgradeCTA({ onOpen, label = "👑 Upgrade", to = "membership", style }) {
  return (
    <button className="btn" style={{ marginTop: 8, ...style }} onClick={() => onOpen?.(to)}>{label}</button>
  );
}

// Disclaimer shown on any AI-generated or platform legal document.
function LegalDisclaimer() {
  return (
    <p style={{ fontSize: 10, color: "var(--gold, #ffcf3f)", marginTop: 8, lineHeight: 1.4 }}>
      ⚖️ Draft for convenience only — not legal advice. AI/template documents can miss
      jurisdiction-specific terms. Have a qualified attorney review before anyone signs.
    </p>
  );
}

// ---- Universal social layer ----
// Drop <SocialBar id=… /> on ANY content — posts, CollabZ, BattleZ, profiles —
// to make it shareable / (dis)likeable / commentable. State is keyed by `id`.
// Fractional star row (out of `max`, default 10). Display mode (no onRate)
// shades each star to the median's fraction; input mode (onRate given) is a
// clickable row that lights up every star up to the one you hover/click.
// showEnds adds the 👎🏼 (1 = worst) / 🥰 (10 = best) cues.
function StarRow({ value = 0, max = 10, onRate, size = 15, showEnds = false }) {
  const [hover, setHover] = useState(0);
  const shown = onRate ? (hover || value) : value;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: showEnds ? 5 : 0 }}>
      {showEnds && <span title="1 = 👎🏼 worst" style={{ fontSize: size - 1 }}>👎🏼</span>}
      <span style={{ display: "inline-flex" }} onMouseLeave={onRate ? () => setHover(0) : undefined}>
        {Array.from({ length: max }, (_, i) => {
          const fill = Math.max(0, Math.min(1, shown - i));
          return (
            <span key={i}
              onClick={onRate ? () => onRate(i + 1) : undefined}
              onMouseEnter={onRate ? () => setHover(i + 1) : undefined}
              title={onRate ? `${i + 1}/10` : undefined}
              style={{ position: "relative", display: "inline-block", width: size, height: size, lineHeight: `${size}px`, fontSize: size, cursor: onRate ? "pointer" : "default" }}>
              <span style={{ color: "rgba(255,255,255,0.22)" }}>★</span>
              <span style={{ position: "absolute", left: 0, top: 0, width: `${fill * 100}%`, overflow: "hidden", color: "var(--gold, #ffcf3f)" }}>★</span>
            </span>
          );
        })}
      </span>
      {showEnds && <span title="10 = 🥰 best" style={{ fontSize: size - 1 }}>🥰</span>}
    </span>
  );
}

function SocialBar({ id, shareText, style }) {
  const { state, update, addXP } = useAppState();
  const signedIn = isSignedIn();
  // Server state when signed in; otherwise the per-device local store.
  const [srv, setSrv] = useState(null);
  const local = (state.social || {})[id] || { up: 0, down: 0, my: 0, comments: [] };
  const s = srv || local;
  const [open, setOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [flash, setFlash] = useState("");
  const mountRef = useRef(Date.now()); // dwell timer for the share reward

  useEffect(() => {
    if (!signedIn) return;
    getSocialApi(id).then(setSrv).catch(() => setSrv(null));
  }, [id, signedIn]);

  const setS = (patch) => update({ social: { ...(state.social || {}), [id]: { ...local, ...patch } } });
  const vote = (dir) => {
    const my = s.my === dir ? 0 : dir;
    if (signedIn) {
      reactSocialApi(id, my).then(setSrv).catch(() => {});
    } else {
      let up = s.up || 0; let down = s.down || 0;
      if (s.my === 1) up--; if (s.my === -1) down--;
      if (my === 1) up++; if (my === -1) down++;
      setS({ my, up: Math.max(0, up), down: Math.max(0, down) });
    }
    if (my !== 0) addXP(1, "Reacted");
  };
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = shareText || "Check this out on Music ConnectZ";
    try {
      if (typeof navigator !== "undefined" && navigator.share) await navigator.share({ text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); setFlash("🔗 copied"); setTimeout(() => setFlash(""), 1500); }
    } catch { /* user cancelled share */ }
    // Sharing another member's PostZ earns +5⚡ (once per post, dwell-gated
    // server-side — you must have genuinely viewed it for 30s+).
    if (signedIn && typeof id === "string" && id.startsWith("post:")) {
      const pid = id.slice(5);
      const dwell = Math.round((Date.now() - mountRef.current) / 1000);
      try {
        const r = await sharePostzApi(pid, dwell);
        if (r?.rewarded) { setFlash("🔁 +5⚡ shared!"); addXP(1, "Shared a post"); setTimeout(() => setFlash(""), 2500); }
      } catch { /* own post / already shared / not enough dwell — no reward */ }
    }
  };
  const addComment = () => {
    if (!draft.trim()) return;
    if (signedIn) commentSocialApi(id, draft.trim()).then(setSrv).catch(() => {});
    else setS({ comments: [{ id: Date.now(), body: draft.trim(), at: Date.now() }, ...(local.comments || [])] });
    addXP(2, "Commented");
    setDraft("");
  };
  const rate = (score) => {
    const val = s.my_rating === score ? 0 : score;
    if (signedIn) reactRate(val);
    else setS({ my_rating: val || undefined });
    if (val) addXP(1, "Rated");
    setRateOpen(false);
  };
  const reactRate = (val) => {
    rateSocialApi(id, val).then(setSrv).catch((e) => {
      if (e?.message?.includes("window")) alert(`⏳ Rating edit window passed — upgrade for a longer window (${EDIT_WINDOW_LABEL}).`);
    });
  };
  const comments = s.comments || [];
  return (
    <div style={{ marginTop: 8, ...style }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <button className={`btn btn-small${s.my === 1 ? "" : " btn-secondary"}`} onClick={() => vote(1)}>👍 {s.up || 0}</button>
        <button className={`btn btn-small${s.my === -1 ? " btn-danger" : " btn-secondary"}`} onClick={() => vote(-1)}>👎 {s.down || 0}</button>
        <button className={`btn btn-small${rateOpen ? "" : " btn-secondary"}`} onClick={() => setRateOpen((v) => !v)} title="Rate this 1–10" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <StarRow value={s.rating || 0} size={13} />
          <span style={{ fontSize: 11 }}>{s.rating != null ? `${s.rating}/10` : "Rate"}</span>
        </button>
        <button className="btn btn-small btn-secondary" onClick={() => setOpen((v) => !v)}>💬 {comments.length}</button>
        <button className="btn btn-small btn-secondary" onClick={share}>🔗 Share</button>
        {signedIn && <button className="btn btn-small btn-secondary" onClick={() => setReportOpen((v) => !v)} title="Report">⚠️</button>}
        {flash && <span style={{ fontSize: 11, color: "var(--success)" }}>{flash}</span>}
      </div>
      {reportOpen && (
        <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-light)" }}>Report:</span>
          {[["spam", "Spam"], ["harassment", "Harassment"], ["hate", "Hate"], ["nsfw", "NSFW"], ["stolen", "Stolen"], ["other", "Other"]].map(([reason, l]) => (
            <button key={reason} className="heritage-chip" style={{ padding: "2px 7px", fontSize: 11 }} onClick={() => { reportItemApi(id, reason).catch(() => {}); setReportOpen(false); setFlash("⚠️ reported — thanks"); setTimeout(() => setFlash(""), 1800); }}>{l}</button>
          ))}
        </div>
      )}
      {rateOpen && (
        <div style={{ marginTop: 8, padding: 8, borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 4 }}>Tap to rate — lights up every star up to your pick:</div>
          <StarRow value={s.my_rating || 0} size={22} showEnds onRate={rate} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--text-light)" }}>Community median:</span>
            <StarRow value={s.rating || 0} size={14} />
            <strong style={{ fontSize: 12 }}>{s.rating != null ? `${s.rating}/10` : "—"}</strong>
            {s.rating_count != null && <span style={{ fontSize: 10, color: "var(--text-light)" }}>· {s.rating_count} rating{s.rating_count === 1 ? "" : "s"}</span>}
            {s.my_rating ? <button className="btn-link" style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: 0, fontSize: 10 }} onClick={() => rate(s.my_rating)}>clear mine</button> : null}
          </div>
          {signedIn && s.my_rating ? (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "var(--text-light)" }}>You rated {s.my_rating}/10 — change it while your edit window's open:</span>
              <EditCountdown createdAt={s.my_rating_at} mine onEdit={() => {}} />
              <EditZHistory history={s.my_rating_history} editedAt={s.my_rating_edited_at} field="score" />
            </div>
          ) : null}
        </div>
      )}
      {open && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} placeholder="Add a comment…" style={{ flex: 1 }} />
            <button className="btn btn-small" onClick={addComment} disabled={!draft.trim()}>Post</button>
          </div>
          {comments.map((c) => {
            const mine = signedIn && c.user && c.user === state.user?.username;
            const editing = editId === c.id;
            const saveEdit = async () => {
              try { const r = await editCommentApi(id, c.id, editDraft.trim()); setSrv(r); setEditId(null); }
              catch (e) { alert(e?.message?.includes("window") ? `⏳ Edit window passed — upgrade for a longer edit window (${EDIT_WINDOW_LABEL}).` : "Couldn't edit."); }
            };
            return (
              <div key={c.id} className="post-card" style={{ marginTop: 6 }}>
                {c.user && <div className="post-user">@{c.user}{mine && !editing && <span style={{ marginLeft: 8 }}><EditCountdown createdAt={c.at} mine onEdit={() => { setEditId(c.id); setEditDraft(c.body); }} /></span>}</div>}
                {editing ? (
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <input value={editDraft} onChange={(e) => setEditDraft(e.target.value)} style={{ flex: 1 }} />
                    <button className="btn btn-small" onClick={saveEdit} disabled={!editDraft.trim()}>Save</button>
                    <button className="btn btn-small btn-secondary" onClick={() => setEditId(null)}>✕</button>
                  </div>
                ) : <Translatable tag="div" className="post-content" text={c.body} />}
                <div className="post-meta">{new Date(c.at).toLocaleString()}<EditZHistory history={c.edit_history} editedAt={c.edited_at} field="body" /></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Known platforms → brand name + emoji, matched by host substring. Any other
// site falls back to its domain name + favicon (a real logo for any URL).
const LINK_PLATFORMS = [
  { host: "open.spotify.com", name: "Spotify", emoji: "🟢" }, { host: "spotify.com", name: "Spotify", emoji: "🟢" },
  { host: "music.apple.com", name: "Apple Music", emoji: "🍎" }, { host: "itunes.apple.com", name: "Apple Music", emoji: "🍎" },
  { host: "youtube.com", name: "YouTube", emoji: "▶️" }, { host: "youtu.be", name: "YouTube", emoji: "▶️" },
  { host: "soundcloud.com", name: "SoundCloud", emoji: "🟠" },
  { host: "bandcamp.com", name: "Bandcamp", emoji: "🔵" },
  { host: "instagram.com", name: "Instagram", emoji: "📸" },
  { host: "tiktok.com", name: "TikTok", emoji: "🎵" },
  { host: "twitter.com", name: "X", emoji: "✖️" }, { host: "x.com", name: "X", emoji: "✖️" },
  { host: "facebook.com", name: "Facebook", emoji: "📘" }, { host: "fb.com", name: "Facebook", emoji: "📘" },
  { host: "twitch.tv", name: "Twitch", emoji: "🟣" },
  { host: "audiomack.com", name: "Audiomack", emoji: "🟡" },
  { host: "deezer.com", name: "Deezer", emoji: "🎧" },
  { host: "tidal.com", name: "Tidal", emoji: "🌊" },
  { host: "patreon.com", name: "Patreon", emoji: "🧡" },
  { host: "linktr.ee", name: "Linktree", emoji: "🌳" },
];
// Returns { name, emoji, favicon } for a URL — a real logo (favicon) for any site.
function detectLink(rawUrl) {
  let host = "";
  try { host = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).hostname.replace(/^www\./, ""); }
  catch { return { name: rawUrl, emoji: "🔗", favicon: "" }; }
  const hit = LINK_PLATFORMS.find((p) => host === p.host || host.endsWith(`.${p.host}`) || host.includes(p.host.split(".")[0] + "."));
  const favicon = `https://www.google.com/s2/favicons?sz=64&domain=${host}`;
  if (hit) return { name: hit.name, emoji: hit.emoji, favicon };
  // Fallback: derive a title-cased name from the domain's main label.
  const label = host.split(".").slice(-2, -1)[0] || host;
  return { name: label.charAt(0).toUpperCase() + label.slice(1), emoji: "🔗", favicon };
}
// A link's logo (favicon img, emoji fallback) + detected name, as a chip's leading glyph.
function LinkGlyph({ url, size = 14 }) {
  const info = detectLink(url);
  const [broken, setBroken] = useState(false);
  if (info.favicon && !broken) {
    return <img src={info.favicon} alt={info.name} width={size} height={size} style={{ borderRadius: 3, verticalAlign: "middle" }} onError={() => setBroken(true)} />;
  }
  return <span>{info.emoji}</span>;
}

// Profile/post links — add labelled URLs; render as tappable chips.
function LinksEditor({ links, onChange }) {
  const list = links || [];
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const add = () => {
    if (!url.trim()) return;
    let u = url.trim(); if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    onChange([...list, { id: Date.now(), label: label.trim() || detectLink(u).name, url: u }]);
    setLabel(""); setUrl("");
  };
  // Auto-fill the label with the detected platform name as they paste a URL.
  const onUrl = (e) => {
    const val = e.target.value;
    setUrl(val);
    if (val.trim() && (!label.trim() || label === detectLink(url).name)) setLabel(detectLink(val).name);
  };
  const detected = url.trim() ? detectLink(url) : null;
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="label (auto-detected)" style={{ flex: 1, minWidth: 90 }} />
        <input value={url} onChange={onUrl} placeholder="paste any link — Spotify, IG, YouTube…" style={{ flex: 1.4, minWidth: 120 }} />
        <button className="btn btn-small" onClick={add} disabled={!url.trim()}>+ Link</button>
      </div>
      {detected && <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><LinkGlyph url={url} /> Detected: <strong>{detected.name}</strong></div>}
      <div className="chip-wrap">
        {list.map((l) => (
          <span key={l.id} className="tag" style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
            <LinkGlyph url={l.url} /> {l.label}
            <button onClick={() => onChange(list.filter((x) => x.id !== l.id))} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}>×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

// Renders member links with a live click tally, a malware/spyware safety flag,
// and the +5⚡ reward for genuinely visiting another member's link. `owner` is
// the link owner's username (so the backend knows whose link was clicked).
function LinksRow({ links, owner = "" }) {
  const [tallies, setTallies] = useState({}); // url -> { clicks, safe, threat }
  const [flash, setFlash] = useState("");
  const { update } = useAppState();
  const signedIn = isSignedIn();

  useEffect(() => {
    if (!signedIn || !owner) return;
    getLinkTalliesApi(owner).then((r) => {
      const map = {};
      (r.links || []).forEach((c) => { map[c.url] = c; });
      setTallies(map);
    }).catch(() => {});
  }, [owner, signedIn]);

  if (!links?.length) return null;

  const onClick = (e, l) => {
    if (!signedIn) return; // plain navigation when signed out
    const t = tallies[l.url];
    if (t && t.safe === false) {
      // Flagged unsafe — block the visit and warn.
      e.preventDefault();
      setFlash(`⚠️ "${l.label || l.url}" was flagged unsafe (${t.threat || "threat"}) — not opening.`);
      setTimeout(() => setFlash(""), 4000);
      return;
    }
    // Record the click now; confirm a genuine 30s dwell to earn the reward.
    clickLinkApi(l.url, owner, 0).then((r) => setTallies((m) => ({ ...m, [l.url]: r }))).catch(() => {});
    setTimeout(() => {
      clickLinkApi(l.url, owner, 31).then((r) => {
        setTallies((m) => ({ ...m, [l.url]: r }));
        if (r.rewarded) { update({ energy: r.energy }); setFlash("🔗 +5⚡ for visiting a member's link!"); setTimeout(() => setFlash(""), 3000); }
      }).catch(() => {});
    }, 31000);
  };

  return (
    <div style={{ margin: "6px 0" }}>
      <div className="chip-wrap">
        {links.map((l) => {
          const t = tallies[l.url];
          const unsafe = t && t.safe === false;
          return (
            <a key={l.id || l.url} href={l.url} target="_blank" rel="noreferrer" onClick={(e) => onClick(e, l)}
               className="tag" style={{ color: unsafe ? "var(--danger)" : "var(--accent, #22e6ff)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}
               title={unsafe ? `Flagged unsafe: ${t.threat}` : "Opens in a new tab · visiting a member's link earns +5⚡"}>
              {unsafe ? <span>⚠️</span> : <LinkGlyph url={l.url} />} {l.label || detectLink(l.url).name}
              {t && t.clicks != null && <span style={{ color: "var(--text-light)" }}>· {t.clicks} click{t.clicks === 1 ? "" : "s"}</span>}
            </a>
          );
        })}
      </div>
      {flash && <div style={{ fontSize: 11, color: /⚠️/.test(flash) ? "var(--danger)" : "var(--success)", marginTop: 2 }}>{flash}</div>}
    </div>
  );
}

// Self-declared, filterable matching metrics (NationalitieZ / SubstanceZ / PreferenceZ).
const SUBSTANCES = [
  { key: "cigarettes", name: "Cigarettes", emoji: "🚬" },
  { key: "caffeine", name: "Caffeine", emoji: "☕" },
  { key: "alcohol", name: "Alcohol", emoji: "🍺" },
  { key: "thc", name: "THC", emoji: "🌿" },
  { key: "heroin", name: "Heroin", emoji: "💉" },
  { key: "crack", name: "Crack", emoji: "🪨" },
  { key: "meth", name: "Meth", emoji: "💎" },
  { key: "dxm", name: "DXM", emoji: "🧪" },
  { key: "adderall", name: "Adderall", emoji: "💊" },
  { key: "opioids", name: "Opioids", emoji: "⚕️" },
  { key: "benzos", name: "Benzos", emoji: "😴" },
];
// Stance ladder. Only "use"/"sometimes" count as active on the backend's
// sober-friendly filter — every other stance (incl. the sober-leaning ones and
// legacy "sober"/"avoid") reads as sober-friendly.
const STANCES = [
  { id: "use", label: "Use", dot: "🟢" },
  { id: "sometimes", label: "Sometimes", dot: "🟡" },
  { id: "before", label: "From before", dot: "🕰️" },
  { id: "oftensober", label: "Often sober", dot: "🔵" },
  { id: "soberchoice", label: "Sober by choice", dot: "🔴" },
  { id: "never", label: "Never", dot: "⚪" },
];
const PARTNER_GENDERS = [
  { id: "male", label: "Male", emoji: "♂️" },
  { id: "female", label: "Female", emoji: "♀️" },
  { id: "neutral", label: "Non-Binary", emoji: "⚧️" },
];
const TRAITS = ["Honesty", "Trust", "Communication", "Energy", "Connection", "Creativity", "Ambition", "Humor"];

// Notification preferences by app-group. `rec` marks Corey's recommended-on set
// (marketing, posts, collabs, battles) so a member can one-tap the sensible baseline.
const NOTIF_GROUPS = [
  { key: "notif_connect", label: "🤝 ConnectZ — collabs, messages, follows", rec: true },
  { key: "notif_compete", label: "⚔️ CompeteZ — BattleZ & RateZ results", rec: true },
  { key: "notif_posts", label: "🎵 PostZ — shares, ratings, comments", rec: true },
  { key: "notif_marketing", label: "📣 Marketing — drops, tips & offers", rec: true },
  { key: "notif_money", label: "💰 MoneyZ — payments, royalties, cashouts", rec: false },
  { key: "notif_intel", label: "🧠 IntelligenceZ — AI jobs & exports", rec: false },
];

const SETTING_TOGGLES = [
  { key: "notifications", label: "🔔 Push Notifications" },
  { key: "collabAlerts", label: "🤝 Collab Alerts" },
  { key: "paymentAlerts", label: "💰 Payment Alerts" },
  { key: "emailDigest", label: "📧 Email Digest" },
  { key: "shareLocation", label: "📍 Share Location" },
  { key: "privateMode", label: "🔒 Private Mode" },
  { key: "soundEffects", label: "🔊 Sound Effects" },
  { key: "vibration", label: "📳 Vibration" },
];

// ---- PickConnectZ usage + pins (localStorage, shared convention) ----
const USAGE_KEY = "mcz_app_usage";
const PINS_KEY = "mcz_pinned_apps";
const AI_PICK_COUNT = 5;
const readStore = (k) => {
  try { return JSON.parse(localStorage.getItem(k)); } catch { return null; }
};
const writeStore = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
};
// PickConnectZ pin allowance (blueprint): Free pins 2, the rest AI-populated;
// Premium and StatZ pin unlimited.
function tierInfo(tier) {
  const t = (tier || "").toLowerCase();
  if (t.includes("statz") || t.includes("stats")) return { label: "StatZ", limit: Infinity };
  if (t.includes("premium") || t.includes("pro")) return { label: "Premium", limit: Infinity };
  return { label: "Free", limit: 2 };
}

const TOP_APPS = CATALOG.flatMap((g) => g.apps);

// ---- Functional pages ----
function SetupPage() {
  const { state, updateUser } = useAppState();
  const [form, setForm] = useState(state.user);
  const [saved, setSaved] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [locMsg, setLocMsg] = useState("");
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setSaved(false); };
  const zsign = zodiacFor(form.birthday);
  const save = () => { updateUser(form); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  // Capture GPS → store coords for distance filtering + reverse-geocode a
  // readable location onto the profile (best-effort; falls back to coords).
  const useMyLocation = () => {
    if (!navigator.geolocation) { setLocMsg("Geolocation isn't available on this device."); return; }
    setLocBusy(true); setLocMsg("");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      try { await setLocationApi(true, lat, lng); } catch { /* offline — coords saved on next sync */ }
      let label = `📍 ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
      try {
        const g = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { "Accept": "application/json" } }).then((r) => r.json());
        const a = g.address || {};
        const city = a.city || a.town || a.village || a.county || "";
        const region = a.state || a.country || "";
        if (city || region) label = [city, region].filter(Boolean).join(", ");
      } catch { /* geocode best-effort */ }
      setForm((f) => ({ ...f, location: label, lat, lng })); setSaved(false);
      setLocMsg("📍 Location set — distance filtering is on across CollabZ, VenueZ, Social & search.");
      setLocBusy(false);
    }, () => { setLocMsg("Location permission denied."); setLocBusy(false); }, { enableHighAccuracy: true, timeout: 10000 });
  };
  return (
    <div className="card">
      <div className="card-header">👤 Your Profile</div>
      <div className="grid-2">
        <div className="form-group"><label>First name</label><input value={form.firstName || ""} onChange={set("firstName")} placeholder="First" /></div>
        <div className="form-group"><label>Last name</label><input value={form.lastName || ""} onChange={set("lastName")} placeholder="Last" /></div>
      </div>
      <div className="form-group"><label>Display name / username</label><input value={form.name} onChange={set("name")} placeholder="Shown publicly" /></div>
      <div className="grid-2">
        <div className="form-group"><label>📧 Email</label><input type="email" value={form.email} onChange={set("email")} /></div>
        <div className="form-group"><label>📱 Phone</label><input value={form.phone} onChange={set("phone")} /></div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label>🎂 Birthday {zsign && <span style={{ color: "var(--accent, #22e6ff)" }}>· {zsign.emoji} {zsign.name}</span>}</label>
          <input type="date" value={form.birthday} onChange={set("birthday")} />
        </div>
        <div className="form-group"><label>⚧️ Gender</label>
          <select value={form.gender} onChange={set("gender")}>
            <option value="">Select</option>
            <option value="Male">🚹 Male ♂️</option>
            <option value="Female">🚺 Female ♀️</option>
            <option value="Non-Binary">⚧️ Non-Binary</option>
          </select>
        </div>
      </div>
      <div className="form-group"><label>📍 Location</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input value={form.location} onChange={set("location")} placeholder="City, State or Zip" style={{ flex: 1, minWidth: 140 }} />
          <button type="button" className="btn btn-small btn-secondary" onClick={useMyLocation} disabled={locBusy}>{locBusy ? "📍 locating…" : "📍 Use my GPS"}</button>
        </div>
        {locMsg && <p style={{ fontSize: 10, color: "var(--accent, #22e6ff)", marginTop: 4 }}>{locMsg}</p>}
      </div>
      <div className="form-group"><label>📝 Bio</label><CappedTextarea value={form.bio} onChange={set("bio")} style={{ height: 60 }} /></div>
      <div className="form-group"><label>🔗 Links (Spotify, IG, YouTube, store…)</label>
        <LinksEditor links={form.links} onChange={(l) => { setForm((f) => ({ ...f, links: l })); setSaved(false); }} />
      </div>
      <button className="btn btn-success" style={{ width: "100%" }} onClick={save}>{saved ? "✅ Profile saved!" : "💾 Save Profile"}</button>
      {saved && <p style={{ fontSize: 11, color: "var(--success)", textAlign: "center", marginTop: 6 }}>Your profile &amp; filters are saved.</p>}
    </div>
  );
}

const PERSONA_CHOICES = [
  { name: "Independent Artist", emoji: "🎤", icon: "personaz_indieartist.png" },
  { name: "Beat Producer", emoji: "🎚️", icon: "personaz_producer.png" },
  { name: "Mix Engineer", emoji: "🎛️", icon: "personaz_mixengineer.png" },
  { name: "Designer", emoji: "🎨", icon: "personaz_designer.png" },
  { name: "Videographer", emoji: "🎥", icon: "personaz_videographer.png" },
  { name: "Director", emoji: "🎬", icon: "personaz_director.png" },
  { name: "Manager", emoji: "🕴🏼", icon: "personaz_manager.png" },
  { name: "A&R Scout", emoji: "🔎", icon: "personaz_arscout.png" },
  { name: "Ghostwriter", emoji: "👻", icon: "personaz_ghostwriter.png" },
  { name: "Developer", emoji: "👾", icon: "personaz_developer.png" },
  { name: "Weightlifter", emoji: "🏋🏼", icon: "personaz_weightlifter.png" },
  { name: "Mime", emoji: "🤹", icon: "personaz_mime.png" },
];

// Derived skill sets shared by Director/Videographer/Developer, built off the
// same taxonomies the rest of the app uses (moods, DirectZ length formats, game
// genres) so persona skills stay in sync with those catalogs. Every skill chip
// carries an emoji — the taxonomies without per-item emojis get one here.
const MOOD_EMOJI = {
  Joyful: "😄", Calm: "😌", Optimistic: "🌅", Grateful: "🙏", Inspired: "💡", Confident: "😎",
  Sad: "😢", Anxious: "😰", Frustrated: "😤", Lonely: "🥀", Angry: "😠", Overwhelmed: "🌊",
  Indifferent: "😐", Reflective: "🤔", Curious: "🧐", Tired: "🥱", Bored: "😑",
  Melancholic: "🖤", Moody: "🌫️", Dreamy: "💭", Aggressive: "⚡", Dark: "🌑", Hyped: "🔥",
  Playful: "😜", Affectionate: "🥰", Awkward: "😬", Supportive: "🤝", Detached: "🧊",
};
const MOOD_SKILLS = ["Any Mood 🎭", ...MOODS.map((m) => `${m} ${MOOD_EMOJI[m] || "🎭"}`)];
const FORMAT_SKILLS = ["Any Format 🎬", ...DIRECTZ_FORMATS.map((f) => `${f.name} ${f.emoji} (${f.label})`)];
const DIRECTING_CRAFT = ["Any Directing 🎬", "Shot Composition 🎞️", "Blocking 🚦", "Coverage 🎥", "Pacing ⏱️", "Performance Direction 🎭", "Scene Planning 🗂️", "Visual Storytelling 📖"];
const MOVIE_GENRE_SKILLS = ["Any Movie Genre 🎬", ...MOVIE_GENRES.map((g) => `${g.name} ${g.emoji}`)];
const TV_GENRE_SKILLS = ["Any TV Genre 📺", ...TV_GENRES.map((g) => `${g.name} ${g.emoji}`)];
// Music genres + subgenres (emoji-tagged) shared by the music-making personas
// so Artist / Beat Producer / Mix Engineer all carry (sub)genre skills.
const MUSIC_GENRE_SKILLS = [
  "Any Genre 🎶", "Hip-Hop 🎤", "Trap 🏚️", "Boom Bap 🥁", "Drill ⚔️", "Cloud Rap ☁️",
  "R&B 💜", "Neo-Soul 🌙", "Soul 💛", "Funk 🕺", "Pop 🌟", "Synth-Pop 🎹", "Hyperpop 💊",
  "Rock 🎸", "Alternative 🎸", "Punk 🤘", "Metal 🤘", "Indie 🎧",
  "EDM 🎛️", "House 🏠", "Deep House 🌊", "Techno 🔊", "Dubstep 🔉", "Trance 🌀", "Drum & Bass 🥁", "Hyphy 🔥",
  "Jazz 🎷", "Blues 🎸", "Classical 🎻", "Lo-Fi 🌫️", "Ambient 🌊",
  "Gospel 🙏", "Country 🤠", "Folk 🪕", "Reggae 🇯🇲", "Dancehall 🔥",
  "Afrobeats 🥁", "Amapiano 🎹", "Latin 💃", "Reggaeton 🔥", "K-Pop 🇰🇷", "World 🌍",
];
// Distinct emoji per game subgenre where recognizable; falls back to the genre's
// emoji so every subgenre skill still carries one.
const SUBGENRE_EMOJI = {
  Platformer: "🏃", "Hack and Slash": "⚔️", "Beat 'Em Up": "👊", "Roguelike / Roguelite": "💀", Survival: "🏕️", "Flight Combat": "✈️", "Vehicular Combat": "🚗", "Run and Gun": "🔫",
  "Open World / Sandbox": "🌍", Metroidvania: "🗺️", Stealth: "🥷", "Linear Action-Adventure": "🎬",
  "Point-and-Click / Graphic Adventure": "🖱️", "Visual Novel": "📖", "Walking Simulator": "🚶", "Narrative / Interactive Movie": "🎞️", "Text-Based / Interactive Fiction": "📜", "Escape Room": "🔓",
  "First-Person Shooter (FPS)": "🔫", "Third-Person Shooter (TPS)": "🎯", "Tactical Shooter": "🪖", "Arena Shooter": "🏟️", "Hero Shooter": "🦸", "Light Gun": "🔫",
  "Top-Down Shooter": "🚁", "Bullet Hell": "💥", "Battle Royale": "🪂",
  "Action RPG": "⚔️", "Turn-Based RPG": "🎲", JRPG: "🗾", MMORPG: "🌐", "Tactical RPG": "♟️", "Dungeon Crawler": "🏰", Soulslike: "💀", "Sandbox / Open World RPG": "🌍",
  "Real-Time Strategy (RTS)": "⏱️", "Real-Time Tactics (RTT)": "🎖️", "Turn-Based Strategy (TBS)": "♟️", "Turn-Based Tactics (TBT)": "🎲", "Tower Defense": "🏰", "4X": "🌌", "Grand Strategy / Wargame": "🗺️", MOBA: "⚔️", "Auto-Battler / Auto Chess": "♟️", Artillery: "💣",
  "Life / Social Simulation": "🏡", "City Builder / Construction": "🏗️", "Vehicle Simulation": "🚚", "Flight Simulation": "✈️", "Management / Business": "💼", "Farming Simulation": "🌾", "Pet Raising": "🐾",
  "Football / Soccer": "⚽", "American Football": "🏈", Basketball: "🏀", Baseball: "⚾", Golf: "⛳", Tennis: "🎾", Hockey: "🏒", "Boxing / Combat Sports": "🥊", "MMA / Wrestling": "🤼", "Extreme Sports": "🛹", "Olympic / Mixed Sports": "🥇",
  "Arcade Racing": "🏎️", "Simulation Racing": "🏁", "Kart Racing": "🏎️", "Futuristic Racing": "🚀", "Combat Racing": "💥",
  "Traditional 2D Fighter": "🥋", "3D Fighter": "🥊", "Arena Brawler / Party Fighter": "🎉", "Hack and Slash Fighter": "⚔️",
  "Logic Puzzle": "🧠", "Physics-Based Puzzle": "⚛️", "Match-Three / Tile Matching": "🔷", "Exploration Puzzle": "🗺️", "Word Construction": "🔤", "Trivia / Quiz": "❓", "Falling Block (Tetris-style)": "🧱",
  "Psychological Horror": "🧠", "Survival Horror": "🧟", "Stealth Horror": "👻",
  "Peripheral-Based": "🎸", "Rhythm Action": "🎵", "Music Sandbox": "🎹",
  "Creative Sandbox": "🧱", "Survival Sandbox": "🏕️", "Open World Survival Craft": "⛏️",
  "Idle / Incremental": "📈", Clicker: "👆", "Hyper-Casual": "🍬", "Party Games": "🎉", "Mini-Games": "🎯", Exergames: "🏃",
  Pinball: "🎯", "Board Game / Card Game": "🃏", "Dating Simulation": "💘", "Educational / Edutainment": "🎓", "Programming Games": "💻", "Hidden Object": "🔍",
};
// Each game genre becomes its own category; its subgenres are the pickable skills.
const GAME_GENRE_CATS = Object.fromEntries(
  GAME_GENRES.map((g) => [`${g.emoji} ${g.name}`, [`Any ${g.name} ${g.emoji}`, ...g.subgenres.map((s) => `${s} ${SUBGENRE_EMOJI[s] || g.emoji}`)]]),
);

// Available skills per persona — categorized, emoji-tagged catalog modeled off
// the instrumentDatabase from the earlier build: each persona → categories →
// skills, each with an emoji + an "Any X" wildcard. The doc-covered personas
// (Artist, Beat Producer, Mix Engineer, Designer, Videographer) port the doc's
// instruments / DAWs / subgenres / vocal ranges / software verbatim, plus a
// "Craft" category preserving the app's original abstract skills. App-only
// personas keep their skills in the same categorized style. Selection stores the
// skill string (with emoji) + a start date; experience math is unchanged.
const PERSONA_SKILLS = {
  "Independent Artist": {
    "🎸 String Instruments": ["Any String 🎸", "Acoustic Guitar 🎸", "Electric Guitar 🎸", "Bass Guitar 🎸", "Ukulele 🎸", "Banjo 🪕", "Mandolin 🎸", "Violin 🎻", "Viola 🎻", "Cello 🎻", "Double Bass 🎻", "Harp 🎵"],
    "🎹 Keyboard Instruments": ["Any Keyboard 🎹", "Acoustic Piano 🎹", "Digital Piano 🎹", "Synthesizer 🎹", "Organ 🎹", "Harpsichord 🎹", "Accordion 🪗"],
    "🥁 Percussion": ["Any Percussion 🥁", "Drums (Snare) 🥁", "Drums (Bass) 🥁", "Drums (Bongo) 🥁", "Cymbals 🥁"],
    "🎤 Rapping": ["Any Rapping 🎤", "Alternative Rap 🎸", "Boom Bap 🥁", "Chopper 🚁", "Cloud Rap ☁️", "Conscious Rap 🧠", "Crunk 🔥", "Drill ⚔️", "Emo Rap 🖤", "G-Funk 🌴", "Gangsta Rap ⛓️", "Hardcore Hip Hop 🎤", "Jazz Rap 🎷", "Mumble Rap 💤", "Old School 📻", "Snap 🫰", "Trap 🏚️"],
    "🎶 Singing (range)": ["Any Singing 🎶", "Bass 🧔‍♂️", "Baritone 🎙️", "Tenor 🎤", "Countertenor 🕊️", "Contralto 🎻", "Alto 🎶", "Mezzo-Soprano 🌊", "Soprano ☀️"],
    "🎶 Genres & Subgenres": MUSIC_GENRE_SKILLS,
    "✍️ Craft": ["Songwriting ✍️", "Stage Presence 🎤", "Freestyle 🌀", "Melody 🎶", "Performance 🎭", "Branding 🏷️"],
  },
  "Beat Producer": {
    "🎛️ Music DAWs": ["Any DAW 🎛️", "Ableton Live 🎵", "Adobe Audition 🎙️", "Audacity 🎧", "Bitwig Studio 🎚️", "Cakewalk 🎼", "Cubase 🎛️", "FL Studio 🎚️", "GarageBand 🎵", "Logic Pro 🎵", "Luna ☁️", "Mixcraft 🎚️", "PreSonus Studio One 🎛️", "Pro Tools 🎙️", "Reason 🎛️", "Reaper 🔧", "Studio One 🎛️", "Waveform Pro 📊"],
    "🎚️ Production": ["Any Production 🎚️", "Beat Making 🎚️", "Sampling 🎵", "Sound Design 🎛️", "Arrangement 🎼", "Synthesis 🎹", "Drum Programming 🥁", "Melody 🎶", "Genre Range 🎯"],
    "🎶 Genres & Subgenres": MUSIC_GENRE_SKILLS,
  },
  "Mix Engineer": {
    "🎛️ Music DAWs": ["Any DAW 🎛️", "Ableton Live 🎵", "Adobe Audition 🎙️", "Audacity 🎧", "Bitwig Studio 🎚️", "Cakewalk 🎼", "Cubase 🎛️", "FL Studio 🎚️", "GarageBand 🎵", "Logic Pro 🎵", "Luna ☁️", "Mixcraft 🎚️", "PreSonus Studio One 🎛️", "Pro Tools 🎙️", "Reason 🎛️", "Reaper 🔧", "Studio One 🎛️", "Waveform Pro 📊"],
    "🎚️ Engineering Skills": ["Any Engineering 🎛️", "Mixing 🎛️", "Mastering 🎙️", "EQ 📊", "Compression 🔧", "Reverb/Effects ✨", "Vocal Tuning 🎤", "Stereo Imaging 🔊", "Noise Reduction 🔇"],
    "🎶 Genres & Subgenres": MUSIC_GENRE_SKILLS,
  },
  "Designer": {
    "🎨 Design Software": ["Any Design Software 🎨", "Adobe Photoshop 🎨", "Adobe Illustrator 🖌️", "Figma 🎯", "Blender 🧊", "Adobe After Effects ✨", "Canva 🌈", "Affinity Designer ✨", "CorelDRAW 🎨", "Sketch 📐", "Adobe InDesign 📄"],
    "🖌️ Design Skills": ["Any Design Skill 🎨", "Composition & Layout 📐", "Color Theory 🌈", "Typography 🔤", "Brand Identity 🏷️", "UI/UX Prototyping 🎯", "Graphic Design 🖌️", "Icon Design 🎭", "Visual Storytelling 📖", "Asset Production 📦"],
  },
  "Videographer": {
    "🎬 Video Software": ["Any Video Software 🎬", "Adobe Premiere 🎬", "DaVinci Resolve 🎞️", "Final Cut Pro 🎥", "Sony Vegas 📹", "Filmora 🎬", "After Effects ✨", "OBS Studio 🔴"],
    "🎥 Video Skills": ["Any Video Skill 🎬", "Filming 🎥", "Cinematography 🎥", "Camera Operation 📷", "Lighting Techniques 💡", "Audio Capture 🎙️", "Video Editing 🎬", "Color Grading 🎨", "Motion Graphics ✨", "Storyboarding 🗂️", "Drone Footage 🚁", "Music Video Production 🎞️", "Social Optimization 📱"],
    "🎬 Movie Genres": MOVIE_GENRE_SKILLS,
    "📺 TV Genres": TV_GENRE_SKILLS,
    "🎭 Moods": MOOD_SKILLS,
    "🎬 Length Formats": FORMAT_SKILLS,
  },
  "Director": {
    "🎬 Directing": DIRECTING_CRAFT,
    "🎬 Movie Genres": MOVIE_GENRE_SKILLS,
    "📺 TV Genres": TV_GENRE_SKILLS,
    "🎭 Moods": MOOD_SKILLS,
    "🎬 Length Formats": FORMAT_SKILLS,
  },
  "Manager": {
    "🕴🏼 Management": ["Any Management 🕴🏼", "Strategic Planning 🗺️", "Team Leadership 👥", "Communication 💬", "Conflict Resolution 🤝", "Project Management 📋", "Decision-Making 🎯", "Performance Tracking 📈", "Resource Management 📦"],
  },
  "A&R Scout": {
    "🔎 Scouting": ["Any Scouting 🔎", "Talent Spotting 👀", "Market Trends 📈", "Networking 🤝", "Deal Structuring 📝", "Genre Expertise 🎯", "Analytics 📊"],
  },
  "Ghostwriter": {
    "👻 Writing": ["Any Writing 👻", "Lyricism 🖊️", "Storytelling 📖", "Rhyme Schemes 🎯", "Hook Writing 🪝", "Tone Matching 🎭", "Multi-Genre 🎶"],
    "🎶 Genres & Subgenres": MUSIC_GENRE_SKILLS,
  },
  "Developer": {
    "👾 Top 10 Languages": ["Any Language 👾", "Python 🐍", "JavaScript 📜", "TypeScript 🔷", "Java ☕", "C++ ⚙️", "C# 🎯", "Go 🐹", "Rust 🦀", "Swift 🕊️", "Kotlin 🅺"],
    ...GAME_GENRE_CATS,
  },
  "Weightlifter": {
    "🏋🏼 Training": ["Any Training 🏋🏼", "Routine Design 📋", "Personal Training 💪", "Powerlifting 🏋️", "HIIT ⚡", "Olympic Lifting 🥇", "Nutrition Coaching 🥗", "Mobility & Recovery 🧘", "Progressive Overload 📈"],
  },
  "Mime": {
    "🤹 Performance": ["Any Performance 🤹", "Lipsync 👄", "Selfie 🤳", "Dance 💃", "Drama 🎭", "Comedy 😂"],
  },
};
// Skills carry a start date so experience = years since start. Back-compat:
// legacy plain-string skills read as name with no date.
const todayISO = () => new Date().toISOString().slice(0, 10);
const skillName = (s) => (typeof s === "string" ? s : s?.name || "");
const skillStart = (s) => (typeof s === "string" ? "" : s?.start || "");
// A skill can carry a price the member sets: a flat rate "per work" (per
// project/deliverable) OR "per hour". Both are valid anywhere money changes
// hands by agreement — CollabZ, BattleZ, VenueZ. Back-compat: no rate = unset.
const skillRate = (s) => (typeof s === "string" ? 0 : Number(s?.rate) || 0);
const skillRateUnit = (s) => (typeof s === "string" ? "work" : s?.rateUnit === "hour" ? "hour" : "work");
const rateUnitLabel = (u) => (u === "hour" ? "per hour" : "per work");
// Flatten a member's priced skills → [{name, rate, unit}] for quick-fill.
function mySkillRates(state) {
  const out = [];
  (state?.personas || []).forEach((p) => (p.skills || []).forEach((s) => {
    if (skillRate(s) > 0) out.push({ name: skillName(s), rate: skillRate(s), unit: skillRateUnit(s) });
  }));
  return out;
}
// Given a rate basis, the agreed total: flat per work, or rate × hours.
function rateTotal({ rate, unit, hours }) {
  const r = Number(rate) || 0;
  return unit === "hour" ? r * (Number(hours) || 0) : r;
}
function expYears(start) {
  if (!start) return null;
  const [y, m, d] = String(start).split("-").map(Number);
  if (!y) return null;
  const t = new Date();
  const mo = t.getMonth() + 1;
  const yrs = t.getFullYear() - y - ((mo < m || (mo === m && t.getDate() < d)) ? 1 : 0);
  return yrs >= 0 ? yrs : null;
}
const expLabel = (start) => { const y = expYears(start); return y == null ? "" : y === 0 ? "<1y" : `${y}y`; };

// Shared pricer: name a price per work (flat) OR per hour × hours, and
// optionally quick-fill from your own priced skillZ. Used wherever money is
// agreed — CollabZ offers, VenueZ host/visitor pay, BattleZ contributor pay.
// Controlled: value = { rate, unit, hours }; onChange gets the whole basis.
function RatePricer({ value, onChange, skillRates = [], currency = "$", label = "Rate", compact = false }) {
  const rate = value?.rate ?? "";
  const unit = value?.unit === "hour" ? "hour" : "work";
  const hours = value?.hours ?? "";
  const set = (patch) => onChange({ rate, unit, hours, ...patch });
  const total = rateTotal({ rate, unit, hours });
  return (
    <div style={{ margin: compact ? "4px 0" : "6px 0" }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {!compact && <label style={{ fontSize: 11, color: "var(--text-light)" }}>{label} ({currency})</label>}
        <input type="number" min="0" step="0.01" value={rate} placeholder="0.00" onChange={(e) => set({ rate: e.target.value })} style={{ width: 88 }} />
        <div className="chip-wrap">
          <button type="button" className={`heritage-chip${unit === "work" ? " sel" : ""}`} style={{ padding: "2px 8px" }} onClick={() => set({ unit: "work" })}>per work</button>
          <button type="button" className={`heritage-chip${unit === "hour" ? " sel" : ""}`} style={{ padding: "2px 8px" }} onClick={() => set({ unit: "hour" })}>per hour</button>
        </div>
        {unit === "hour" && (
          <>
            <span style={{ fontSize: 11, color: "var(--text-light)" }}>× hrs</span>
            <input type="number" min="0" step="0.25" value={hours} placeholder="1" onChange={(e) => set({ hours: e.target.value })} style={{ width: 60 }} />
          </>
        )}
      </div>
      {skillRates.length > 0 && (
        <div className="chip-wrap" style={{ marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "var(--text-light)" }}>from your skillZ:</span>
          {skillRates.map((sr) => (
            <button type="button" key={sr.name} className="heritage-chip" style={{ padding: "2px 8px" }} title={`Use your ${sr.name} rate`} onClick={() => set({ rate: sr.rate, unit: sr.unit })}>
              {sr.name} {currency}{sr.rate}/{sr.unit === "hour" ? "hr" : "work"}
            </button>
          ))}
        </div>
      )}
      {unit === "hour" && (
        <div style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 2 }}>= {currency}{total.toFixed(2)} total ({currency}{Number(rate) || 0}/hr × {Number(hours) || 0}h)</div>
      )}
    </div>
  );
}
// Human-readable agreement note for a rate basis, e.g. "$40/hr × 2h = $80" or
// "$120 per work" — recorded in terms so both sides see how the price was set.
function rateBasisNote({ rate, unit, hours }, currency = "$") {
  const total = rateTotal({ rate, unit, hours });
  return unit === "hour"
    ? `${currency}${Number(rate) || 0}/hr × ${Number(hours) || 0}h = ${currency}${total.toFixed(2)}`
    : `${currency}${total.toFixed(2)} per work`;
}

function PersonasPage() {
  const { state, addTo, removeFrom, setList } = useAppState();
  const [openCats, setOpenCats] = useState({}); // "personaIdx:cat" -> forced open/closed
  const toggleCat = (key) => setOpenCats((o) => ({ ...o, [key]: !o[key] }));
  const has = (name) => state.personas.some((p) => p.name === name);
  const hasSkill = (mine, sk) => (mine || []).some((s) => skillName(s) === sk);
  const toggleSkill = (i, skill) => setList("personas", state.personas.map((p, idx) =>
    idx === i ? { ...p, skills: hasSkill(p.skills, skill) ? (p.skills || []).filter((s) => skillName(s) !== skill) : [...(p.skills || []), { name: skill, start: todayISO() }] } : p));
  // Patch a single skill's fields (start date, price, rate unit) without
  // dropping the others — every skill is { name, start, rate, rateUnit }.
  const patchSkill = (i, skill, patch) => setList("personas", state.personas.map((p, idx) =>
    idx === i ? { ...p, skills: (p.skills || []).map((s) => (skillName(s) === skill
      ? { name: skillName(s), start: skillStart(s), rate: skillRate(s), rateUnit: skillRateUnit(s), ...patch } : s)) } : p));
  const setSkillStart = (i, skill, start) => patchSkill(i, skill, { start });
  return (
    <>
      <div className="card">
        <div className="card-header">🎭 Select Your PersonaZ</div>
        <div className="grid-3">
          {PERSONA_CHOICES.map((p) => (
            <button key={p.name} className="persona-btn" disabled={has(p.name)} style={{ opacity: has(p.name) ? 0.4 : 1 }}
              onClick={() => addTo("personas", { name: p.name, emoji: p.emoji, icon: p.icon, skills: [] })}>
              {p.emoji} {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-header">🎭 Your Personas & SkillZ</div>
        {state.personas.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No personas yet — pick some above.</p>
        ) : state.personas.map((p, i) => {
          const cats = PERSONA_SKILLS[p.name] || {};
          const poolCount = Object.values(cats).flat().length;
          const mine = p.skills || [];
          return (
            <div key={i} className="persona-card" style={{ marginBottom: 10 }}>
              <div className="persona-header">
                <span className="persona-name">{p.emoji} {p.name} <span style={{ fontSize: 11, color: "var(--text-light)" }}>· {mine.length}/{poolCount} skillZ</span></span>
                <button className="btn btn-danger btn-small" onClick={() => removeFrom("personas", i)}>Remove</button>
              </div>
              {Object.entries(cats).map(([cat, skills]) => {
                const key = `${i}:${cat}`;
                const picked = skills.filter((sk) => hasSkill(mine, sk)).length;
                // Collapsed by default; auto-open when a category holds a pick,
                // unless the member explicitly toggled it. Many categories
                // (e.g. Developer's game genres) stay tidy as a drill-down.
                const manual = key in openCats;
                const open = manual ? openCats[key] : picked > 0;
                return (
                  <div key={cat} style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, opacity: 0.95, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} onClick={() => toggleCat(key)}>
                      <span style={{ opacity: 0.7 }}>{open ? "▾" : "▸"}</span>
                      <span>{cat}</span>
                      <span style={{ fontWeight: 400, color: picked ? "var(--gold, #ffcf3f)" : "var(--text-light)" }}>· {picked}/{skills.length}</span>
                    </div>
                    {open && (
                      <div className="chip-wrap">
                        {skills.map((sk) => {
                          const any = /\bany\b/i.test(sk);
                          return (
                            <button key={sk} className={`heritage-chip${hasSkill(mine, sk) ? " sel" : ""}`} style={{ padding: "2px 8px", ...(any ? { fontStyle: "italic", opacity: hasSkill(mine, sk) ? 1 : 0.85 } : {}) }} onClick={() => toggleSkill(i, sk)}>
                              {hasSkill(mine, sk) ? "✓ " : ""}{sk}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {mine.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", marginBottom: 4 }}>📅 Start date sets your experience (years). 💲 Set a price per skill — <strong>per work</strong> or <strong>per hour</strong> — used across CollabZ, BattleZ &amp; VenueZ by agreement.</div>
                  {mine.map((s) => (
                    <div key={skillName(s)} style={{ borderTop: "1px solid var(--border)", paddingTop: 6, marginBottom: 6 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11 }}>
                        <span style={{ flex: 1 }}>{skillName(s)} {skillStart(s) && <span style={{ color: "var(--gold, #ffcf3f)" }}>· {expLabel(skillStart(s))} exp</span>}{skillRate(s) > 0 && <span style={{ color: "var(--success)" }}> · {money(skillRate(s))}/{skillRateUnit(s) === "hour" ? "hr" : "work"}</span>}</span>
                        <input type="date" max={todayISO()} value={skillStart(s)} onChange={(e) => setSkillStart(i, skillName(s), e.target.value)} style={{ width: 140, fontSize: 11 }} />
                      </div>
                      <RatePricer compact value={{ rate: skillRate(s) || "", unit: skillRateUnit(s), hours: "" }} onChange={(v) => patchSkill(i, skillName(s), { rate: v.rate, rateUnit: v.unit })} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <ProfileSaveBar label="Save PersonaZ" />
      </div>
    </>
  );
}

// PostZ visibility 👁️ — who can see a post. Restricted rewards the creator
// 300 SpinAZ per valid join (another IP active <5 min or staying >5 min).
const POST_VIS = [
  { id: "public", emoji: "👀", label: "Public", note: "Viewable by anyone." },
  { id: "restricted", emoji: "🛑", label: "Restricted", note: "Members only — tracks joins (timestamp + profile card). Earn 300 SpinAZ per valid join from another IP active <5 min or staying >5 min." },
  { id: "private", emoji: "🔏", label: "Private", note: "Only you can see it." },
];
function PostZPage({ serverOk }) {
  const { state, addTo, removeFrom, update } = useAppState();
  const { openPost } = usePostModal();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [links, setLinks] = useState([]);
  const [vis, setVis] = useState("public");
  const [skillCost, setSkillCost] = useState(0); // $ of skills used → energy cost
  const [media, setMedia] = useState(null); // { url, type } single-post attachment
  const [isAlbum, setIsAlbum] = useState(false);
  const [items, setItems] = useState([]); // album entries: { url, type, title }
  const [feed, setFeed] = useState(null); // server posts
  const [sort, setSort] = useState("hot");
  const [msg, setMsg] = useState("");
  const visOf = (id) => POST_VIS.find((v) => v.id === id) || POST_VIS[0];

  const load = () => { if (serverOk) getPostzApi(sort).then((r) => setFeed(r.posts || [])).catch(() => setFeed(null)); };
  useEffect(load, [serverOk, sort]);

  const addAlbumItem = (m) => { if (m?.url) setItems((xs) => [...xs, { url: m.url, type: m.type, title: `Track ${xs.length + 1}` }]); };

  const reset = () => { setTitle(""); setDesc(""); setLinks([]); setVis("public"); setSkillCost(0); setMedia(null); setItems([]); setIsAlbum(false); };

  const add = async () => {
    if (!title.trim()) return;
    setMsg("");
    const body = {
      title: title.trim(), description: desc.trim(), links, visibility: vis,
      skill_cost_cents: Math.round((Number(skillCost) || 0) * 100),
      media_url: isAlbum ? "" : (media?.url || ""), media_type: isAlbum ? "" : (media?.type || ""),
      is_album: isAlbum, items: isAlbum ? items : [],
    };
    if (serverOk) {
      try {
        const r = await createPostzApi(body);
        if (r.energy_charged) update({ energy: r.energy });
        setMsg(r.energy_charged ? `📤 Posted — ${r.energy_charged} energy spent on skills used.` : "📤 Posted.");
        reset(); load();
        return;
      } catch (e) { setMsg(/limit|429/i.test(e?.message || "") ? "Daily submission limit reached — upgrade for more submits." : "Couldn't post to the server — saved locally."); }
    }
    addTo("examples", { id: Date.now(), title: title.trim(), desc: desc.trim(), links, visibility: vis, joins: [], at: Date.now() });
    reset();
  };

  const join = async (id) => {
    // Record the join now (no reward yet), then confirm real engagement after a
    // few seconds — the creator only earns 300 SpinAZ for a genuine visit.
    try { await joinPostzApi(id, 0); setMsg("🛑 Joined — stay a few seconds to support the creator…"); load(); }
    catch { /* offline */ return; }
    setTimeout(async () => {
      try {
        const r = await joinPostzApi(id, 6); // engaged heartbeat (>5s)
        if (r.rewarded) setMsg(`🛑 Thanks for staying — creator earned ${r.reward_spinaz} SpinAZ.`);
        load();
      } catch { /* offline */ }
    }, 6000);
  };

  const localPosts = feed === null ? (state.examples || []) : [];
  return (
    <>
      <div className="card">
        <div className="card-header">🎵 Post your work</div>
        <div className="form-group"><label>🎯 Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., My Latest Beat" /></div>
        <div className="form-group"><label>📝 Description</label><CappedTextarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ height: 50 }} /></div>
        <div className="form-group"><label>🔗 Links (Spotify, YouTube, store…)</label><LinksEditor links={links} onChange={setLinks} /></div>
        <div className="settings-toggle">
          <label>💿 Album post (multiple tracks/clips)</label>
          <div role="switch" aria-checked={isAlbum} onClick={() => setIsAlbum((v) => !v)} className={`toggle-switch${isAlbum ? " active" : ""}`} />
        </div>
        {isAlbum ? (
          <div className="form-group">
            <label>💿 Add each track/clip to the album</label>
            {items.map((it, i) => (
              <div key={i} className="skill-item">
                <input value={it.title} onChange={(e) => setItems((xs) => xs.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} style={{ flex: 1 }} maxLength={160} />
                <span className="tag">{it.type === "video" ? "🎥" : "🎧"}</span>
                <button className="btn btn-danger btn-small" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <MediaCapture onUploaded={addAlbumItem} />
            {items.length > 0 && <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 4 }}>💿 {items.length} item{items.length === 1 ? "" : "s"} in this album.</p>}
          </div>
        ) : (
          <div className="form-group"><label>🎙️ Attach audio/video (record or upload)</label><MediaCapture onUploaded={setMedia} /></div>
        )}
        <div className="form-group">
          <label>👁️ Visibility</label>
          <div className="chip-wrap">
            {POST_VIS.map((v) => <button key={v.id} className={`heritage-chip${vis === v.id ? " sel" : ""}`} onClick={() => setVis(v.id)}>{v.emoji} {v.label}</button>)}
          </div>
          <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 4 }}>{visOf(vis).note}</p>
        </div>
        <div className="form-group"><label>🎯 Skill value used ($) — costs that in energy (100/$)</label><input type="number" min="0" step="0.5" value={skillCost} onChange={(e) => setSkillCost(e.target.value)} style={{ width: 120 }} /></div>
        <button className="btn btn-success" style={{ width: "100%" }} onClick={add}>📤 Post{Number(skillCost) > 0 ? ` (−${Math.round(Number(skillCost) * 100)}⚡)` : ""}</button>
        {msg && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 6 }}>{msg}</p>}
      </div>
      <div className="card">
        <div className="card-header">{feed !== null ? "🌐 Community feed" : "🎵 Your Work Examples"}</div>
        {feed !== null && (
          <div className="chip-wrap" style={{ marginBottom: 8 }}>
            {[["hot", "🔥 Hot"], ["new", "🆕 New"], ["top", "⭐ Top rated"]].map(([id, l]) => (
              <button key={id} className={`heritage-chip${sort === id ? " sel" : ""}`} onClick={() => setSort(id)}>{l}</button>
            ))}
            <span style={{ fontSize: 10, color: "var(--text-light)", alignSelf: "center", marginLeft: 4 }}>👍 ranks reach · ⭐ ranks value</span>
          </div>
        )}
        {(feed !== null ? feed : localPosts).length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>{feed !== null ? "No posts yet — be the first." : "No examples yet."}</p>
        ) : (feed !== null ? feed : localPosts).map((ex, i) => {
          const v = visOf(ex.visibility);
          const restricted = ex.visibility === "restricted";
          return (
            <div key={ex.id || i} className="post-card" style={ex.flagged ? { opacity: 0.6 } : undefined}>
              <div className="post-user"><span style={{ cursor: "pointer" }} title="Open post" onClick={() => openPost(ex)}>{ex.title}</span> <span className="tag" title={v.note}>{v.emoji} {v.label}</span>{ex.vibe >= 5 && sort === "hot" ? <span className="tag" style={{ color: "var(--danger)" }} title="High vibe">🔥 Trending</span> : ""}{ex.flagged ? <span className="tag" style={{ color: "var(--danger)" }} title="Heavily disliked — under review">⚠️ Flagged</span> : ""}{ex.author && !ex.mine ? <span style={{ fontSize: 11, color: "var(--text-light)" }}> · @{ex.author}</span> : ""}</div>
              {ex.vibe != null && <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>✨ vibe {ex.vibe > 0 ? "+" : ""}{ex.vibe} · 👍 {ex.up || 0} 👎 {ex.down || 0}{ex.rating != null ? ` · ⭐ ${ex.rating}/10` : ""}</div>}
              {(ex.description ?? ex.desc) ? <Translatable tag="div" className="post-content" text={ex.description ?? ex.desc} /> : null}
              {ex.is_album && (ex.items || []).length > 0 ? (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginBottom: 4 }}>💿 Album · {(ex.items || []).length} tracks</div>
                  {(ex.items || []).map((it, k) => (
                    <div key={k} style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 11, marginBottom: 2 }}>{k + 1}. {it.title || (it.type === "video" ? "Clip" : "Track")}</div>
                      {it.type === "video"
                        ? <video src={it.url} controls style={{ width: "100%", maxHeight: 220, borderRadius: 8 }} />
                        : <audio src={it.url} controls style={{ width: "100%" }} />}
                    </div>
                  ))}
                </div>
              ) : ex.media_url && (
                <div style={{ marginTop: 6 }}>
                  {ex.media_type === "video"
                    ? <video src={ex.media_url} controls style={{ width: "100%", maxHeight: 260, borderRadius: 8 }} />
                    : <audio src={ex.media_url} controls style={{ width: "100%" }} />}
                  {ex.score?.overall != null && <div style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 2 }}>🎯 scored {ex.score.overall}/10</div>}
                </div>
              )}
              <LinksRow links={ex.links} owner={ex.author || ""} />
              {restricted && <div style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 4 }}>🛑 {ex.joins || 0} join{(ex.joins || 0) === 1 ? "" : "s"} · earns 300 SpinAZ per valid join</div>}
              {restricted && ex.author && !ex.mine && <button className="btn btn-small" style={{ marginTop: 6 }} onClick={() => join(ex.id)}>🛑 Join this drop</button>}
              <SocialBar id={`post:${ex.id || i}`} shareText={`${ex.title} on Music ConnectZ`} />
              {ex.mine === undefined && feed === null && <button className="btn btn-danger btn-small" style={{ marginTop: 8 }} onClick={() => removeFrom("examples", i)}>Delete</button>}
            </div>
          );
        })}
      </div>
    </>
  );
}

// SocialZ — connect external accounts + links. Each entry carries a follower
// count that populates your reach (external followers) for the energy engine.
const SOCIALZ_PRESETS = [
  { label: "Spotify", emoji: "🟢" }, { label: "Apple Music", emoji: "🍎" },
  { label: "YouTube", emoji: "▶️" }, { label: "SoundCloud", emoji: "☁️" },
  { label: "Instagram", emoji: "📸" }, { label: "TikTok", emoji: "🎵" },
  { label: "X", emoji: "✖️" }, { label: "Website", emoji: "🔗" },
];
// Median of a list of numbers (matches the backend reach_median rule).
function medianOf(nums) {
  const xs = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!xs.length) return 0;
  const mid = xs.length >> 1;
  return xs.length % 2 ? xs[mid] : Math.round((xs[mid - 1] + xs[mid]) / 2);
}
const fmtReach = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

function SocialZConnect({ serverOk, onSaved, mczFollowers = 0 }) {
  const { state, update } = useAppState();
  const [links, setLinks] = useState(() => (state.user?.links || []).map((l) => ({
    label: l.label || "", url: l.url || "", followers: l.followers || "",
    verified: !!l.verified, verified_count: l.verified_count ?? null, code: l.code || "",
  })));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifyingAt, setVerifyingAt] = useState(-1);
  const [prevMedian, setPrevMedian] = useState(null); // for the ▲/▼ delta
  const setL = (i, patch) => setLinks((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const add = (label = "") => setLinks((ls) => [...ls, { label, url: "", followers: "", verified: false, verified_count: null, code: "" }]);
  const remove = (i) => setLinks((ls) => ls.filter((_, j) => j !== i));

  // Sources that COUNT toward reach: Music ConnectZ (always) + every VERIFIED
  // link. Unverified links are shown but excluded — same rule as the backend,
  // so nobody games reach with a stranger's big account.
  const sources = [
    { label: "Music ConnectZ", followers: mczFollowers, verified: true },
    ...links.filter((l) => l.url.trim()).map((l) => ({
      label: l.label.trim() || l.url.trim(),
      followers: l.verified ? ((l.verified_count ?? Number(l.followers)) || 0) : (Number(l.followers) || 0),
      verified: !!l.verified,
    })),
  ];
  const median = medianOf(sources.filter((s) => s.verified).map((s) => s.followers));
  const delta = prevMedian == null ? 0 : median - prevMedian;

  const persist = async (nextLinks, note) => {
    const clean = nextLinks.filter((l) => l.label.trim() || l.url.trim()).map((l) => ({
      label: l.label.trim(), url: l.url.trim(), followers: Number(l.followers) || 0,
      verified: !!l.verified, verified_count: l.verified_count ?? null, code: l.code || "",
    }));
    update({ user: { ...state.user, links: clean } });
    if (serverOk) {
      try { const r = await saveProfileApi({ links: clean }); onSaved?.(r); setMsg(note || "✅ SocialZ saved."); }
      catch { setMsg("Saved locally — sign in to sync."); }
    } else setMsg("Saved locally — sign in to sync.");
  };

  const save = async () => { setPrevMedian(median); setBusy(true); setMsg(""); await persist(links, "✅ SocialZ saved — verified reach updated."); setBusy(false); };

  const startVerify = async (i) => {
    const l = links[i];
    if (!l.url.trim()) { setMsg("Add the profile URL first, then verify."); return; }
    if (!serverOk) { setMsg("Sign in to verify — it proves the account is yours."); return; }
    setVerifyingAt(i); setMsg("");
    try {
      const r = await startSocialVerifyApi(l.url.trim(), l.label.trim());
      setL(i, { code: r.code });
      setMsg(`🔑 ${r.instructions}`);
    } catch { setMsg("Couldn't start verification — try again."); }
    setVerifyingAt(-1);
  };

  const checkVerify = async (i) => {
    const l = links[i];
    if (!serverOk) return;
    setPrevMedian(median); setVerifyingAt(i); setMsg("");
    try {
      const r = await checkSocialVerifyApi(l.url.trim());
      if (r.verified) {
        setL(i, { verified: true, verified_count: r.followers, followers: r.followers ?? l.followers });
        setMsg(`✅ Verified — ${r.followers != null ? fmtReach(r.followers) + " followers confirmed" : "account confirmed"} and counted in your median.`);
        onSaved?.(r);
      } else setMsg(r.detail || "Not verified yet — add the code to your bio and retry.");
    } catch (e) { setMsg(e?.detail || "Couldn't verify that page — some platforms block automated checks."); }
    setVerifyingAt(-1);
  };

  // Re-poll verified counts hourly so the median stays live as follower counts move.
  useEffect(() => {
    if (!serverOk) return;
    const id = setInterval(() => {
      links.forEach((l, i) => { if (l.verified && l.url.trim()) checkVerify(i); });
    }, 3600 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverOk, links.length]);

  return (
    <div className="card">
      <div className="card-header"><span>🌐 SocialZ — connect, verify &amp; share</span><span className="tag" title="Median follower reach across your verified accounts">📏 median {fmtReach(median)}</span></div>

      {/* Fixed reach-median readout — always in the same spot, per-source tallies. */}
      <div className="post-card" style={{ marginBottom: 8, background: "rgba(255,255,255,0.03)" }}>
        <div style={{ fontSize: 11, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {sources.map((s, k) => (
            <span key={k} title={s.verified ? "Verified — counts toward your median" : "Unverified — not counted until you verify it"}
              style={{ opacity: s.verified ? 1 : 0.45 }}>
              {s.verified ? "✓" : "•"} {s.label} {fmtReach(s.followers)}{k < sources.length - 1 ? " ·" : ""}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 6, fontWeight: 800, fontSize: 13 }}>
          📏 Reach median: {fmtReach(median)}
          {delta !== 0 && (
            <span style={{ marginLeft: 8, color: delta > 0 ? "var(--success)" : "var(--danger)", fontSize: 12 }}>
              {delta > 0 ? "▲" : "▼"} {fmtReach(Math.abs(delta))}
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-light)", marginTop: 2 }}>Median of your <b>verified</b> sources — drives your hourly ⚡ energy. Unverified links don't count (anti-cheat).</div>
      </div>

      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Add your accounts, then <b>Verify</b> — we drop a code in your bio and read your live follower count, so no one games their reach with someone else's account.</p>
      <div className="chip-wrap" style={{ marginBottom: 8 }}>
        {SOCIALZ_PRESETS.map((p) => <button key={p.label} className="heritage-chip" onClick={() => add(p.label)}>{p.emoji} {p.label}</button>)}
      </div>
      {links.map((l, i) => (
        <div key={i} className="post-card" style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
            <input value={l.label} onChange={(e) => setL(i, { label: e.target.value })} placeholder="Platform" style={{ width: 110 }} />
            <input value={l.url} onChange={(e) => setL(i, { url: e.target.value, verified: false })} placeholder="https://…" style={{ flex: 1 }} />
            <button className="btn btn-small btn-secondary" onClick={() => remove(i)} title="Remove">✕</button>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="number" min="0" value={l.followers} onChange={(e) => setL(i, { followers: e.target.value })} placeholder="followers (verify to confirm)" style={{ flex: 1 }} disabled={l.verified} />
            {l.verified
              ? <span className="tag" style={{ color: "var(--success)" }} title="Verified — counts toward your median">✓ {fmtReach((l.verified_count ?? Number(l.followers)) || 0)}</span>
              : l.code
                ? <button className="btn btn-small btn-success" disabled={verifyingAt === i} onClick={() => checkVerify(i)} title="We fetch your public page and confirm the code + follower count">{verifyingAt === i ? "…" : "✅ Verify"}</button>
                : <button className="btn btn-small btn-secondary" disabled={verifyingAt === i} onClick={() => startVerify(i)} title="Get a code to add to your bio, proving the account is yours">{verifyingAt === i ? "…" : "🔑 Get code"}</button>}
          </div>
          {l.code && !l.verified && <div style={{ fontSize: 10, color: "var(--gold, #ffcf3f)", marginTop: 4 }}>Add <b>{l.code}</b> to your public bio, then tap Verify.</div>}
        </div>
      ))}
      <button className="btn btn-small btn-secondary" onClick={() => add()}>➕ Add link</button>
      <button className="btn btn-success" style={{ width: "100%", marginTop: 8 }} disabled={busy} onClick={save}>{busy ? "Saving…" : "💾 Save SocialZ"}</button>
      {msg && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 6 }}>{msg}</p>}
    </div>
  );
}

// Wallet top-up tiles — $1–$100 presets that also grant Energy (= cents × tier
// multiplier), shown transparently. Free ×1, Premium ×2 (gold), StatZ ×4 (green).
const TOPUP_PRESETS = [5, 10, 20, 50, 100];
const ENERGY_TOPUP_MULT = { free: 1, premium: 2, statz: 4 };
function TopUpTiles({ serverOk, tier, syncEconomy, onDone, compact = false }) {
  const { state, update, updateWallet, addTo } = useAppState();
  const [busy, setBusy] = useState(0);
  const [msg, setMsg] = useState("");
  const tk = tierKey(tier);
  const mult = ENERGY_TOPUP_MULT[tk] || 1;
  const buy = async (dollars) => {
    setBusy(dollars); setMsg("");
    const cents = dollars * 100;
    if (serverOk) {
      try {
        const r = await addFundsApi(cents);
        updateWallet({ balance: r.wallet.money, earned: Number((state.wallet.earned + r.breakdown.net_cents / 100).toFixed(2)) });
        update({ energy: r.wallet.energy, spinaz: r.wallet.spinaz });
        addTo("paymentHistory", { amount: r.breakdown.net_cents / 100, gross: dollars, dev: r.breakdown.dev_tax_cents / 100, at: Date.now(), note: "Top up" });
        setMsg(`✅ Added ${money(r.breakdown.net_cents / 100)} + ${r.breakdown.energy_granted}⚡ energy`);
        syncEconomy?.(); onDone?.(); setBusy(0); return;
      } catch { /* fall through to local */ }
    }
    const { net } = splitTransaction(dollars, tier);
    updateWallet({ balance: Number((state.wallet.balance + net).toFixed(2)), earned: Number((state.wallet.earned + net).toFixed(2)) });
    update({ energy: (state.energy || 0) + cents * mult });
    addTo("paymentHistory", { amount: net, gross: dollars, dev: dollars - net, at: Date.now(), note: "Top up" });
    setMsg(`✅ Added ${money(net)} + ${cents * mult}⚡ energy (saved locally)`);
    setBusy(0);
  };
  return (
    <div className="card">
      <div className="card-header"><span>💳 Top up</span><span className="tag" title="Every $1 tops up your wallet and grants Energy">$1 = 100⚡ base</span></div>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>
        Add funds and get <strong>Energy</strong> free with it — <strong>{mult}×</strong> on your {tk.toUpperCase()} tier.
        Every tier, transparent: Free <b>×1</b> · <span style={{ color: "var(--gold, #ffcf3f)" }}>Premium ×2</span> · <span style={{ color: "var(--success)" }}>StatZ ×4</span>.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: compact ? "repeat(3,1fr)" : "repeat(auto-fit,minmax(96px,1fr))", gap: 8 }}>
        {TOPUP_PRESETS.map((d) => {
          const big = d >= 50, mid = d >= 20;
          return (
            <button key={d} disabled={busy === d} onClick={() => buy(d)}
              style={{
                padding: big ? "16px 10px" : mid ? "13px 10px" : "10px 8px",
                borderRadius: 12, cursor: "pointer", color: "#fff", fontWeight: 800,
                border: big ? "2px solid var(--gold, #ffcf3f)" : "1px solid var(--border)",
                background: big ? "linear-gradient(135deg,#7c3aed,#db2777)" : mid ? "linear-gradient(135deg,var(--primary),#1565C0)" : "var(--primary)",
                boxShadow: big ? "0 0 16px rgba(219,39,119,0.5)" : "none",
                fontSize: big ? 20 : mid ? 17 : 15, transform: big ? "scale(1.02)" : "none",
              }}>
              {busy === d ? "…" : `$${d}`}
              <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.95, marginTop: 2 }}>+{d * 100 * mult}⚡</div>
              {big && <div style={{ fontSize: 9, marginTop: 2 }}>🔥 best value</div>}
            </button>
          );
        })}
      </div>
      {msg && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>{msg}</p>}
      <AutoTopUpManager serverOk={serverOk} />
    </div>
  );
}

// Hands-off recurring top-up: Stripe bills a saved card on a schedule, each
// charge adds money + tier Energy to the wallet. Only shown when Stripe is live.
const AUTO_INTERVALS = [["week", "Weekly"], ["month", "Monthly"], ["year", "Annual"]];
function AutoTopUpManager({ serverOk }) {
  const [rows, setRows] = useState(null); // null=unknown, []=none
  const [enabled, setEnabled] = useState(false);
  const [amt, setAmt] = useState(10);
  const [cadence, setCadence] = useState("month");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = () => getAutoTopUpsApi().then((r) => { setRows(r.auto_topups || []); setEnabled(!!r.stripe_enabled); }).catch(() => { setRows([]); setEnabled(false); });
  useEffect(() => { if (serverOk) load(); }, [serverOk]);
  if (!serverOk || rows === null) return null;
  const active = rows.filter((a) => a.active);
  const start = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await createAutoTopUpApi({ amountCents: amt * 100, interval: cadence });
      if (r.url) { window.location.href = r.url; return; }
    } catch (e) { setMsg(e?.message || "Couldn't start auto top-up."); }
    setBusy(false);
  };
  const cancel = async (id) => { setBusy(true); try { await cancelAutoTopUpApi(id); await load(); } catch { /* ignore */ } setBusy(false); };
  return (
    <div style={{ marginTop: 12, borderTop: "1px dashed var(--border)", paddingTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 12 }}>⚡ Auto top-up {enabled ? "" : <span style={{ color: "var(--text-light)", fontWeight: 400 }}>· card billing not live yet</span>}</strong>
      </div>
      <p style={{ fontSize: 10, color: "var(--text-light)", margin: "4px 0 8px" }}>Stripe bills your saved card automatically — each charge adds the money + tier Energy to your wallet. Cancel anytime.</p>
      {active.map((a) => (
        <div key={a.id} className="skill-item">
          <span className="skill-item-name">🔁 ${a.amount}/{AUTO_INTERVALS.find(([v]) => v === a.interval)?.[1]?.toLowerCase() || a.interval}</span>
          <span className="skill-item-actions"><button className="btn btn-small btn-danger" disabled={busy} onClick={() => cancel(a.id)}>Cancel</button></span>
        </div>
      ))}
      {enabled && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          <select value={amt} onChange={(e) => setAmt(Number(e.target.value))} style={{ width: 84 }}>{TOPUP_PRESETS.map((d) => <option key={d} value={d}>${d}</option>)}</select>
          <select value={cadence} onChange={(e) => setCadence(e.target.value)} style={{ width: 104 }}>{AUTO_INTERVALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <button className="btn btn-small btn-success" disabled={busy} onClick={start}>{busy ? "…" : "💳 Automate"}</button>
        </div>
      )}
      {msg && <p style={{ fontSize: 10, color: "var(--danger)", marginTop: 6 }}>{msg}</p>}
    </div>
  );
}

// 18+ age verification (Stripe Identity). Server-truth flag gates money betting.
function useIdentity(serverOk) {
  const [status, setStatus] = useState(null); // { verified_18plus, stripe_enabled }
  const load = () => getIdentityApi().then(setStatus).catch(() => setStatus(null));
  useEffect(() => { if (serverOk) load(); }, [serverOk]);
  return status;
}

function Verify18({ serverOk }) {
  const status = useIdentity(serverOk);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (status?.verified_18plus) return <span className="tag" style={{ color: "var(--success)" }}>🔞 18+ verified ✅</span>;
  const start = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await startIdentityApi();
      if (r.url) { window.location.href = r.url; return; }
      if (r.verified_18plus) setMsg("✅ You're already verified.");
    } catch (e) { setMsg(e?.message || "Verification isn't available right now."); }
    setBusy(false);
  };
  return (
    <div>
      <button className="btn btn-small btn-secondary" disabled={busy || !serverOk} onClick={start}>{busy ? "…" : "🔞 Verify 18+ with ID"}</button>
      <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 4 }}>
        {status && !status.stripe_enabled
          ? "A real government-ID check (Stripe Identity) activates once it's configured — no more honor-system."
          : "One-time government-ID check via Stripe — proves you're 18+ so you can stake real money."}
      </p>
      {msg && <p style={{ fontSize: 10, color: "var(--gold, #ffcf3f)", marginTop: 4 }}>{msg}</p>}
    </div>
  );
}

function ProfilePage({ onOpen, tier, serverOk, syncEconomy }) {
  const { state } = useAppState();
  const u = state.user;
  const skills = state.personas.flatMap((p) => p.skills || []);
  const zsign = zodiacFor(u.birthday);
  const [me, setMe] = useState(null); // { tier, founding, lifetime, avatar, overall, attractiveness } from server
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (!serverOk || !u?.username) return;
    getMemberApi(u.username).then(setMe).catch(() => setMe(null));
  }, [serverOk, u?.username]);
  const effTier = me?.tier || tier;
  const onAvatar = async (e) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setUploading(true);
    try { const r = await uploadAvatarApi(file); setMe((s) => ({ ...(s || {}), avatar: r.avatar })); } catch { /* offline */ }
    setUploading(false);
  };
  return (
    <div className="card">
      <div className="card-header">👤 Your Public Profile</div>
      <div style={{ textAlign: "center", padding: 14 }}>
        <label style={{ cursor: "pointer", display: "inline-block" }} title="Change profile picture">
          {me?.avatar
            ? <img src={me.avatar} alt="You" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", margin: "0 auto 6px", display: "block", border: "2px solid var(--primary)" }} />
            : <div className="profile-pic" style={{ width: 72, height: 72, margin: "0 auto 6px", fontSize: 28 }}>{(u.name || "?").charAt(0).toUpperCase()}</div>}
          <input type="file" accept="image/*" onChange={onAvatar} style={{ display: "none" }} />
        </label>
        <div style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 4 }}>{uploading ? "⏳ Uploading…" : "📷 Tap the picture to change it"}</div>
        {(me?.overall != null || me?.attractiveness != null) && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", fontSize: 11, marginBottom: 4 }}>
            <span title="Overall rating">⭐ Overall {me.overall != null ? `${me.overall}/10` : "—"}</span>
            <span title="Attractiveness rating">💯 Attractiveness {me.attractiveness != null ? `${me.attractiveness}/10` : "—"}</span>
          </div>
        )}
        {/* Tapping name/sign opens the user's ZodiacZ daily horoscope. */}
        <div style={{ fontWeight: 800, fontSize: 15, cursor: "pointer" }} onClick={() => onOpen?.("zodiacz")}>{u.name || "Not set"}</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", margin: "6px 0" }}>
          <TierBadge tier={effTier} onOpen={onOpen} />
          <FoundingBadge founding={me?.founding} lifetime={me?.lifetime} />
        </div>
        <div style={{ fontSize: 11, color: "var(--text-light)" }}>
          {[u.location, u.gender].filter(Boolean).join(" · ")}
          {zsign && <> {(u.location || u.gender) ? "· " : ""}<span style={{ color: "var(--accent, #22e6ff)", cursor: "pointer" }} onClick={() => onOpen?.("zodiacz")}>{zsign.emoji} {zsign.name}</span></>}
        </div>
        {me && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", fontSize: 11, marginTop: 6 }}>
            <span title="Total followers (MCZ + connected)">👥 {me.total_followers ?? 0} followers</span>
            <span title="Following">➡️ {me.following ?? 0} following</span>
            <span title="Mutual follows">🤝 {me.friends ?? 0} friends</span>
            <span title="One-way followers">⭐ {me.fans ?? 0} fans</span>
            {me.energy_per_hour != null && <span title="Passive energy per hour from your reach" style={{ color: "var(--gold, #ffcf3f)" }}>⚡ {me.energy_per_hour}/hr</span>}
          </div>
        )}
      </div>
      <button className="btn btn-success" style={{ width: "100%", marginBottom: 10 }} onClick={() => onOpen?.("setup")}>✏️ Edit profile (name, bio, email, photo)</button>
      <div className="form-group"><label>📝 Bio</label><div style={{ fontSize: 12 }}>{u.bio || "No bio — tap Edit profile to add one."}</div></div>
      <TopUpTiles serverOk={serverOk} tier={effTier} syncEconomy={syncEconomy} />
      <div className="card">
        <div className="card-header"><span>🔞 Age verification</span><Verify18 serverOk={serverOk} /></div>
        <p style={{ fontSize: 11, color: "var(--text-light)", margin: 0 }}>Verify you're 18+ with a one-time government-ID check (Stripe Identity) to unlock real-money stakes on BattleZ and any adult content. Your ID goes to Stripe, not stored by us.</p>
      </div>
      <SocialZConnect serverOk={serverOk} mczFollowers={me?.followers ?? 0} onSaved={(r) => setMe((s) => ({ ...(s || {}), ...r }))} />
      <div className="form-group"><label>📧 Email</label><div style={{ fontSize: 12 }}>{u.email || "No email"}</div></div>
      <div className="form-group"><label>🎭 Personas</label>
        <div style={{ cursor: "pointer" }} onClick={() => onOpen?.("personas")}>{state.personas.length ? state.personas.map((p, i) => <span key={i} className="tag">{p.emoji} {p.name}</span>) : <span className="tag" style={{ color: "var(--primary)" }}>+ Add PersonaZ</span>}</div>
      </div>
      <div className="form-group"><label>🎯 Skills</label>
        <div style={{ cursor: "pointer" }} onClick={() => onOpen?.("personas")}>{skills.length ? skills.map((s, i) => <span key={i} className="tag">{skillName(s)}{skillStart(s) ? ` · ${expLabel(skillStart(s))}` : ""}</span>) : <span className="tag" style={{ color: "var(--primary)" }}>+ Add skills</span>}</div>
      </div>
      {/* Tapping a metric opens its selector app to make choices. */}
      <div className="form-group"><label>🌐 NationalitieZ (heritage) <span style={{ fontSize: 10, color: "var(--primary)" }}>· tap to set</span></label>
        <div style={{ cursor: "pointer" }} onClick={() => onOpen?.("nationalitiez")}>{(u.nationalities || []).length ? u.nationalities.map((n, i) => <span key={i} className="tag">{n}</span>) : <span className="tag" style={{ color: "var(--primary)" }}>+ Set NationalitieZ</span>}</div>
      </div>
      <div className="form-group"><label>🌐 LanguageZ (spoken) <span style={{ fontSize: 10, color: "var(--primary)" }}>· tap to set</span></label>
        <div style={{ cursor: "pointer" }} onClick={() => onOpen?.("languagez")} data-notranslate>{(u.languages || []).length ? u.languages.map((c) => <span key={c} className="tag">{langLabel(c)}</span>) : <span className="tag" style={{ color: "var(--primary)" }}>+ Set languages</span>}</div>
      </div>
      <div className="form-group"><label>🧠 SubstanceZ <span style={{ fontSize: 10, color: "var(--primary)" }}>· tap to set</span></label>
        <div style={{ cursor: "pointer" }} onClick={() => onOpen?.("substancez")}>{Object.entries(u.substances || {}).filter(([, v]) => v).length
          ? Object.entries(u.substances).filter(([, v]) => v).map(([k, v]) => <span key={k} className="tag">{k}: {v}</span>)
          : <span className="tag" style={{ color: "var(--primary)" }}>+ Set SubstanceZ</span>}</div>
      </div>
      <div className="form-group"><label>💞 PreferenceZ (attracted to) <span style={{ fontSize: 10, color: "var(--primary)" }}>· tap to set</span></label>
        <div style={{ cursor: "pointer" }} onClick={() => onOpen?.("preferencez")}>{(() => {
          const g = u.preferences?.partnerGenders || (u.preferences?.partnerGender ? [u.preferences.partnerGender] : []);
          const labels = g.map((id) => PARTNER_GENDERS.find((x) => x.id === id)?.label || id);
          return labels.length ? labels.map((l) => <span key={l} className="tag">{l}</span>) : <span className="tag" style={{ color: "var(--primary)" }}>+ Set PreferenceZ</span>;
        })()}
          {(u.preferences?.traits || []).map((t) => <span key={t} className="tag">{t}</span>)}
        </div>
      </div>
    </div>
  );
}

function MoneyPage({ tier, serverOk, syncEconomy }) {
  const { state, update, updateWallet, addTo } = useAppState();
  const [amt, setAmt] = useState("");
  const [checkout, setCheckout] = useState(null); // { stripe_enabled, paypal_enabled, min_cents, max_cents }
  const [payBusy, setPayBusy] = useState("");     // "stripe" | "paypal" while redirecting
  const [notice, setNotice] = useState("");

  // Load which checkout providers are live.
  useEffect(() => {
    if (!serverOk) return;
    getCheckoutConfig().then(setCheckout).catch(() => setCheckout(null));
  }, [serverOk]);

  // Handle the return from a hosted checkout (Stripe/PayPal redirect back here).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("checkout");
    if (!result) return;
    const provider = params.get("provider");
    const cleanUrl = () => window.history.replaceState({}, "", window.location.pathname);
    if (result === "cancel") {
      setNotice("Checkout canceled — no charge was made.");
      cleanUrl();
      return;
    }
    if (result === "success") {
      (async () => {
        // PayPal must be captured on return; Stripe credits via webhook.
        if (provider === "paypal") {
          const token = params.get("token");
          if (token) { try { await capturePaypalOrder(token); } catch { /* may already be captured */ } }
        }
        setNotice("Payment received — your balance will update momentarily.");
        syncEconomy?.();
        setTimeout(() => syncEconomy?.(), 3000); // webhook may lag a beat
        cleanUrl();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payCents = () => Math.round((parseFloat(amt) || 0) * 100);

  const payStripe = async () => {
    const cents = payCents();
    if (cents <= 0) return;
    setPayBusy("stripe"); setNotice("");
    try {
      const r = await createStripeCheckout(cents);
      window.location.href = r.url; // hosted Stripe Checkout
    } catch (e) {
      setNotice(e.message || "Could not start Stripe checkout");
      setPayBusy("");
    }
  };

  const payPaypal = async () => {
    const cents = payCents();
    if (cents <= 0) return;
    setPayBusy("paypal"); setNotice("");
    try {
      const r = await createPaypalOrder(cents);
      if (r.approve_url) window.location.href = r.approve_url;
      else throw new Error("No approval URL returned");
    } catch (e) {
      setNotice(e.message || "Could not start PayPal checkout");
      setPayBusy("");
    }
  };

  const add = async () => {
    const v = parseFloat(amt);
    if (!v || v <= 0) return;
    if (serverOk) {
      try {
        const r = await addFundsApi(Math.round(v * 100)); // server enforces dev tax
        updateWallet({ balance: r.wallet.money, earned: Number((state.wallet.earned + (r.breakdown.net_cents / 100)).toFixed(2)) });
        update({ energy: r.wallet.energy, spinaz: r.wallet.spinaz });
        addTo("paymentHistory", { amount: r.breakdown.net_cents / 100, gross: v, dev: r.breakdown.dev_tax_cents / 100, at: Date.now(), note: "Add funds" });
        setAmt("");
        syncEconomy?.();
        return;
      } catch { /* fall through to local */ }
    }
    const { net, dev } = splitTransaction(v, tier); // local developer tax
    updateWallet({ balance: Number((state.wallet.balance + net).toFixed(2)), earned: Number((state.wallet.earned + net).toFixed(2)) });
    addTo("paymentHistory", { amount: net, gross: v, dev, at: Date.now(), note: "Add funds" });
    setAmt("");
  };
  const { rate, label } = devTaxFor(tier);
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">💳 Wallet {serverOk ? <span className="tag" style={{ color: "var(--success)" }}>● live</span> : <span className="tag">offline</span>}</div>
        <div className="balance-info">
          Balance: <strong>{money(state.wallet.balance)}</strong> &nbsp;·&nbsp; Lifetime earned: <strong><Amount value={state.wallet.earned} flow="in" /></strong>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-light)", marginTop: 2 }}>
          <span style={{ color: FLOW_GREEN }}>● green = money in / growth</span> &nbsp;·&nbsp; <span style={{ color: FLOW_RED }}>● red = cost / money out</span>
        </div>
        <div className="form-group"><label>Amount — {label} developer tax {Math.round(rate * 100)}%</label>
          <input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" /></div>
        <CostBreakdown amount={amt} tier={tier} recipient="Your wallet" />
        {notice && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>{notice}</p>}

        {/* Real checkout — buttons appear only for providers the backend has configured. */}
        {(checkout?.stripe_enabled || checkout?.paypal_enabled) && (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {checkout.stripe_enabled && (
              <button className="btn" style={{ flex: 1 }} disabled={!!payBusy || payCents() <= 0} onClick={payStripe}>
                {payBusy === "stripe" ? "…" : "💳 Card"}
              </button>
            )}
            {checkout.paypal_enabled && (
              <button className="btn" style={{ flex: 1, background: "#ffc439", color: "#003087" }} disabled={!!payBusy || payCents() <= 0} onClick={payPaypal}>
                {payBusy === "paypal" ? "…" : "PayPal"}
              </button>
            )}
          </div>
        )}

        <button className="btn btn-secondary btn-small" style={{ width: "100%", marginTop: 10 }} onClick={add}>➕ Dev top-up (no charge)</button>
        <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>
          {checkout?.stripe_enabled || checkout?.paypal_enabled
            ? "Card & PayPal run through hosted checkout. Every transaction shows the developer tax up front."
            : "Card/PayPal checkout activates once the payment providers are configured on the backend. Dev top-up credits instantly for testing."}
        </p>
      </div>
      <TopUpTiles serverOk={serverOk} tier={tier} syncEconomy={syncEconomy} />
      <div className="card">
        <div className="card-header">🧾 Payment History</div>
        {state.paymentHistory.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No transactions yet.</p>
        ) : [...state.paymentHistory].reverse().map((p, i) => (
          <div key={i} className="skill-item">
            <span className="skill-item-name"><Amount value={p.amount} flow={p.amount >= 0 ? "in" : "out"} sign bold /> {p.note ? `· ${p.note}` : ""}</span>
            <span className="skill-item-exp">{p.dev ? `tax ${money(p.dev)} · ` : ""}{new Date(p.at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </>
  );
}

const MEMBERSHIP_TIERS = [
  {
    id: "free", name: "Free", emoji: "🆓", icon: null, color: "var(--text-light)",
    tag: "The on-ramp",
    perks: [
      "400-character limit on bios, messages & AI prompts",
      "PickConnectZ: 2 pinned apps (rest AI-picked)",
      "OCC builds basic browser games (JS/HTML5, Python)",
      "1 custom GroupZ · standard glow color",
      "Developer tax 10% on every transaction",
      "Full access to CollabZ, BattleZ, RateZ, VenueZ, FaceZ",
    ],
  },
  {
    id: "premium", name: "Premium", emoji: "👑", icon: "tier_premium.png", color: "var(--gold, #ffcf3f)",
    tag: "For serious professionals",
    perks: [
      "1,500-character limit — say more everywhere",
      "SuggestionZ 😉 — AI explains what/why/how across every app",
      "Unlimited PickConnectZ pins",
      "OCC builds medium 2D/3D games (any engine but Unreal)",
      "5 custom GroupZ + custom group icons · 8 glow colors",
      "🎨 Choose your app icons (e.g. LanguageZ ⇄ LinguagemZ)",
      "400MB uploads · 5GB storage",
      "LabelZ + contracts/royalty agreements",
      "Developer tax drops to 5%",
    ],
  },
  {
    id: "statz", name: "StatZ", emoji: "📈", icon: "tier_statz.png", color: "var(--cyan, #22e6ff)",
    tag: "Highest tier — for serious professionals",
    perks: [
      "5,000-character limit — the whole essay",
      "Everything in Premium, plus:",
      "Automations 🤖 + CallZ ☎️ — run apps without input",
      "SpecZ analytics marketplace + live calls",
      "Image/Video lipsync from FaceZ · Instrumental key-by-mood",
      "OCC builds advanced games in any language (incl. C++/Unreal)",
      "20 custom GroupZ · 32 glow colors · 4GB uploads · 100GB storage",
      "Lowest developer tax: 3%",
    ],
  },
];

// Founding 50 — StatZ at 50% off for the first 50 members, three ways: lifetime
// (one-time), yearly, or monthly. Live counter from /economy/founding/; buys via
// Stripe when live, dev-preview grant otherwise. Lists every StatZ benefit.
function FoundingCard({ serverOk, onTierChange, syncEconomy }) {
  const signedIn = isSignedIn();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    if (!serverOk) return;
    getFoundingApi().then(setF).catch(() => setF(null));
  }, [serverOk]);
  if (!serverOk || !f || f.tier !== "statz") return null;

  const statzPerks = (MEMBERSHIP_TIERS.find((t) => t.id === "statz")?.perks || []).filter((p) => !/^everything in/i.test(p));
  const c = (n) => money((n || 0) / 100);
  // plan → { label, price, full, sub, save }
  const PLANS = [
    { id: "lifetime", label: "Lifetime", emoji: "♾️", price: f.price_cents, full: f.full_price_cents, sub: "one-time · never re-billed", best: true },
    { id: "year", label: "Yearly", emoji: "🗓️", price: f.year_cents, full: (f.year_cents || 0) * 2, sub: "per year · founding rate locked in" },
    { id: "month", label: "Monthly", emoji: "📆", price: f.month_cents, full: (f.month_cents || 0) * 2, sub: "per month · cancel anytime" },
  ];

  const claim = async (plan) => {
    setBusy(plan); setMsg("");
    try {
      if (f.stripe_enabled) {
        const r = await foundingCheckoutApi(plan); // real money — redirect to Stripe
        if (r.url) { window.location.href = r.url; return; }
      }
      // Dev-preview (no Stripe): lifetime grants a founding seat; year/month flip StatZ.
      if (plan === "lifetime") {
        const r = await claimFoundingApi();
        setF((s) => ({ ...s, claimed: r.claimed, remaining: r.remaining, sold_out: r.sold_out }));
        setMsg("🎉 You're a Founding Lifetime StatZ member — locked in forever.");
      } else {
        await setTierApi("statz");
        setMsg(`🎉 Founding StatZ (${plan}) active — 50% off, grandfathered.`);
      }
      onTierChange?.("statz"); syncEconomy?.();
    } catch (e) {
      setMsg(e?.message?.includes("sold out") ? "😔 All 50 founding seats are claimed." : "Couldn't complete — try again.");
      getFoundingApi().then(setF).catch(() => {});
    }
    setBusy("");
  };

  const pct = Math.min(100, Math.round((f.claimed / f.limit) * 100));
  return (
    <div className="card" style={{ border: "2px solid var(--gold, #ffcf3f)", background: "linear-gradient(135deg, rgba(255,207,63,0.10), rgba(34,230,255,0.06))" }}>
      <div className="card-header">
        <span style={{ color: "var(--gold, #ffcf3f)" }}>👑 Founding 50 — StatZ 50% off</span>
        <span className="tag" style={{ color: f.sold_out ? "var(--danger)" : "var(--success)" }}>{f.sold_out ? "SOLD OUT" : `🔥 ${f.remaining} left`}</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 8 }}>
        The first <strong>50 members</strong> lock in the highest tier at <strong>half price</strong> — forever, or at grandfathered yearly/monthly rates. Pick your plan:
      </p>

      {/* Live scarcity meter */}
      <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.12)", overflow: "hidden", marginBottom: 4 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--gold, #ffcf3f)" }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 10 }}>👥 {f.claimed} / {f.limit} founding seats claimed</div>

      {/* Three plan options with visual cues */}
      <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
        {PLANS.map((p) => (
          <div key={p.id} className="post-card" style={{ border: p.best ? "1px solid var(--gold, #ffcf3f)" : undefined, position: "relative" }}>
            {p.best && <span className="tag" style={{ position: "absolute", top: -8, right: 8, background: "var(--gold, #ffcf3f)", color: "#1a1a1a", fontWeight: 700 }}>BEST VALUE</span>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{p.emoji} {p.label}</div>
                <div style={{ fontSize: 10, color: "var(--text-light)" }}>{p.sub}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: FLOW_GREEN }}>{c(p.price)}</span>
                <span style={{ textDecoration: "line-through", color: "var(--text-light)", fontSize: 12, marginLeft: 6 }}>{c(p.full)}</span>
                <div style={{ fontSize: 10, color: "var(--gold, #ffcf3f)", fontWeight: 700 }}>SAVE {c(p.full - p.price)} · 50% off</div>
              </div>
            </div>
            <button className="btn btn-small" style={{ width: "100%", marginTop: 8, background: p.best ? "var(--gold, #ffcf3f)" : undefined, color: p.best ? "#1a1a1a" : undefined, fontWeight: 700 }}
              disabled={!!busy || f.sold_out || !signedIn}
              onClick={() => claim(p.id)}>
              {f.sold_out ? "Sold out" : busy === p.id ? "…" : signedIn ? `⬆️ Get StatZ — ${c(p.price)}${p.id === "year" ? "/yr" : p.id === "month" ? "/mo" : ""}` : "Sign in to claim"}
            </button>
          </div>
        ))}
      </div>

      {/* All StatZ benefits */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📈 Everything StatZ unlocks</div>
        {(showAll ? statzPerks : statzPerks.slice(0, 4)).map((p, i) => (
          <div key={i} className="skill-item"><span className="skill-item-name" style={{ fontSize: 12 }}><span style={{ color: FLOW_GREEN }}>✓</span> {p}</span></div>
        ))}
        {statzPerks.length > 4 && (
          <button className="btn-link" style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0, fontSize: 11, marginTop: 4 }} onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Show less" : `+ ${statzPerks.length - 4} more benefits`}
          </button>
        )}
      </div>

      <p style={{ fontSize: 10, color: "var(--success)", marginTop: 8 }}>🛡️ Risk-free: full refund if you downgrade within 10 days.</p>
      {f.stripe_enabled && !f.sold_out && <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 4 }}>🔒 Secure Stripe checkout — StatZ unlocks automatically after payment. Yearly/monthly lock your founding rate for as long as you stay subscribed.</p>}
      {msg && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>{msg}</p>}
    </div>
  );
}

// 10-day downgrade-for-refund. Shows the live window; the button refunds the
// purchase, cancels any subscription, and drops the tier to Free.
function RefundCard({ serverOk, onTierChange, syncEconomy, onOpen }) {
  const [rw, setRw] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (serverOk) getRefundWindowApi().then(setRw).catch(() => setRw(null)); }, [serverOk]);

  const doRefund = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await refundMembershipApi();
      onTierChange?.(r.tier); syncEconomy?.();
      setMsg(`✅ Downgraded to Free. ${r.note || ""}`);
      setConfirm(false);
      getRefundWindowApi().then(setRw).catch(() => {});
    } catch (e) {
      setMsg(e?.message?.includes("window") ? "That purchase is past the 10-day refund window." : "Couldn't process — try again or file a BugZ.");
    }
    setBusy(false);
  };

  const days = rw?.window_days ?? 10;
  return (
    <div className="card">
      <div className="card-header">🧾 Refunds</div>
      <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 8 }}>
        <strong>{days}-day refund window.</strong> Downgrade for a full refund within {days} days of purchase — the charge goes back to your payment method, any subscription is cancelled, and you drop to Free. After that, purchases are final. SpinAZ &amp; Energy are non-refundable (spendable currency). Broken feature? <button className="btn-link" style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0, textDecoration: "underline", font: "inherit" }} onClick={() => onOpen?.("bugz")}>file a BugZ</button> (squashed bugs pay 200 SpinAZ).
      </p>
      {rw?.eligible ? (
        <>
          <p style={{ fontSize: 11, color: "var(--success)", marginBottom: 6 }}>✅ You're inside the window — <strong>{rw.days_left} day{rw.days_left === 1 ? "" : "s"} left</strong> to refund your {rw.kind} purchase.</p>
          {confirm ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-small btn-danger" style={{ flex: 1 }} disabled={busy} onClick={doRefund}>{busy ? "…" : "Yes, refund & downgrade"}</button>
              <button className="btn btn-small btn-secondary" onClick={() => setConfirm(false)}>Keep my tier</button>
            </div>
          ) : (
            <button className="btn btn-small btn-secondary" onClick={() => setConfirm(true)}>↩️ Downgrade &amp; refund</button>
          )}
        </>
      ) : rw && rw.kind ? (
        <p style={{ fontSize: 11, color: "var(--text-light)" }}>Your {rw.kind} purchase is past the {days}-day window — <strong>not refundable</strong> after {days} days.</p>
      ) : null}
      {msg && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>{msg}</p>}
    </div>
  );
}

function MembershipZPage({ tier, serverOk, onTierChange, syncEconomy, isOwner, onOpen }) {
  const cur = (tier || "").toLowerCase() === "debug" ? "debug" : devTaxFor(tier).label.toLowerCase();
  const [cycle, setCycle] = useState("monthly");
  const [msg, setMsg] = useState("");
  const choose = async (id) => {
    setMsg("");
    // Dev/preview: flip the membership live against the backend. Real recurring
    // billing wires in with Stripe subscription price IDs.
    try { const r = await setTierApi(id); onTierChange?.(r.tier); syncEconomy?.(); setMsg(`You're on ${id.toUpperCase()} now (dev preview).`); }
    catch { onTierChange?.(id); setMsg(`Switched to ${id.toUpperCase()} locally.`); }
  };
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">👑 MembershipZ</div>
        <div className="balance-info">You're on <strong>{cur.toUpperCase()}</strong>. Here's every tier, straight up — pick the one that matches your grind.</div>
        <div className="chip-wrap" style={{ marginTop: 8 }}>
          <button className={`heritage-chip${cycle === "monthly" ? " sel" : ""}`} onClick={() => setCycle("monthly")}>Monthly</button>
          <button className={`heritage-chip${cycle === "yearly" ? " sel" : ""}`} onClick={() => setCycle("yearly")}>Yearly · save ~2 months</button>
        </div>
        {msg && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>{msg}</p>}
      </div>
      <FoundingCard serverOk={serverOk} onTierChange={onTierChange} syncEconomy={syncEconomy} />
      {MEMBERSHIP_TIERS.map((t) => {
        const price = TIER_PRICING[t.id]?.[cycle];
        const isCur = cur === t.id;
        const RANK = { free: 0, premium: 1, statz: 2, debug: 3 };
        const above = (RANK[t.id] ?? 0) > (RANK[cur] ?? 0); // a tier you'd upgrade INTO
        return (
          <div key={t.id} className="card" style={{ border: isCur ? `1px solid ${t.color}` : above ? "1px solid var(--success)" : undefined }}>
            <div className="card-header">
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {t.icon ? <IconImg icon={t.icon} alt={t.name} style={{ width: 28, height: 28, borderRadius: 7 }} /> : <span>{t.emoji}</span>}
                <span style={{ color: t.color }}>{t.name}</span>
              </span>
              <span className="tag">{price ? `${money(price)}/${cycle === "monthly" ? "mo" : "yr"}` : "Free"}</span>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>{t.tag}</p>
            {above && <div style={{ fontSize: 11, fontWeight: 800, color: "var(--success)", margin: "0 0 6px" }}>🔓 Upgrading from {cur.toUpperCase()} unlocks:</div>}
            {t.perks.map((p, i) => (
              <div key={i} className="skill-item"><span className="skill-item-name" style={{ fontSize: 12, color: above ? "var(--text)" : undefined }}>{above ? "🔓" : "✓"} {p}</span></div>
            ))}
            <div style={{ marginTop: 10 }}>
              {isCur ? (
                <span className="tag" style={{ color: t.color }}>● Your current tier</span>
              ) : (
                <button className="btn" style={{ width: "100%" }} onClick={() => choose(t.id)}>
                  {t.id === "free" ? "Switch to Free" : `Upgrade to ${t.name} — ${money(price)}/${cycle === "monthly" ? "mo" : "yr"}`}
                </button>
              )}
            </div>
          </div>
        );
      })}
      <div className="card">
        <div className="card-header">🧾 All upgrade options</div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Everything you can upgrade or top up, in one place.</p>
        {[
          { emoji: "⭐", name: "Premium", price: "$10/mo · $90/yr", unlocks: "1,500-char limit · SuggestionZ 😉 · 400MB uploads / 5GB storage · LabelZ + contracts · 8 glow colors · dev tax drops to 5% · games in any language except C++", cta: "Upgrade to Premium", to: "membership" },
          { emoji: "📊", name: "StatZ", price: "$15/mo · $150/yr", unlocks: "5,000-char limit · Automations 🤖 + CallZ ☎️ · 4GB uploads / 100GB storage · SpecZ marketplace · C++/Unreal games · dev tax drops to 3% · includes everything in Premium", cta: "Upgrade to StatZ", to: "membership" },
          { emoji: "🍥", name: "SpinAZ top-up", price: "buy at 80% ($80 = 100)", unlocks: "Subscription currency — spend on spins, boosts and premium features.", cta: "Buy SpinAZ", to: "spinaz" },
          { emoji: "⚡", name: "Energy top-up", price: "buy at 80% ($80 = 100)", unlocks: "Powers ratings, comments and daily activity when you're tapped out.", cta: "Buy Energy", to: "energy" },
          { emoji: "✴️", name: "SpecZ (StatZ only)", price: "per-item", unlocks: "Audience analytics, engagement heatmaps, genre intelligence, UGC packs.", cta: "Open SpecZ", to: "specz" },
        ].map((o) => (
          <div key={o.name} className="post-card">
            <div className="post-user">{o.emoji} {o.name} <span className="tag">{o.price}</span></div>
            <div className="post-content" style={{ fontSize: 12 }}>{o.unlocks}</div>
            <button className="btn btn-small" style={{ marginTop: 6 }} onClick={() => onOpen?.(o.to)}>👑 {o.cta}</button>
          </div>
        ))}
      </div>
      {isOwner && (
        <div className="card" style={{ border: "1px solid var(--gold, #ffcf3f)" }}>
          <div className="card-header"><span style={{ color: "var(--gold, #ffcf3f)" }}>🛠️ Debug (owner)</span>{cur === "debug" ? <span className="tag" style={{ color: "var(--gold, #ffcf3f)" }}>● active</span> : <span className="tag">owner-only</span>}</div>
          <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>God-mode for the owner: 0% developer tax, unlimited character/upload/storage limits, every gate unlocked. Only your account can switch into it.</p>
          {cur === "debug"
            ? <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => choose("statz")}>Drop back to StatZ</button>
            : <button className="btn" style={{ width: "100%" }} onClick={() => choose("debug")}>🛠️ Switch to Debug</button>}
        </div>
      )}
      <RefundCard serverOk={serverOk} onTierChange={onTierChange} syncEconomy={syncEconomy} onOpen={onOpen} />
      <div className="card">
        <div className="card-header">🧾 Disputes</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          Wallet funds you spend on other members (CollabZ, MerchZ, VenueZ, CallZ) are real money between users; disputes and refunds on those are handled member-to-member inside CollabZ. Hit a broken feature? <button className="btn-link" style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0, textDecoration: "underline", font: "inherit" }} onClick={() => onOpen?.("bugz")}>submit a BugZ report</button> and we fix it (squashed bugs pay you 200 SpinAZ).
        </p>
      </div>
      <p style={{ fontSize: 10, color: "var(--text-light)", padding: "0 4px" }}>
        Upgrades flip your tier instantly for dev/preview. Recurring card billing wires in with Stripe subscriptions (needs price IDs configured on the backend).
      </p>
    </>
  );
}

// Privacy & account — data export + permanent deletion (store-required).
function AccountDangerZone({ serverOk }) {
  const { logout } = useAuth();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  if (!serverOk || !isSignedIn()) return null;

  const download = async () => {
    setBusy("export"); setMsg("");
    try {
      const data = await exportAccountApi();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "music-connectz-data.json"; a.click();
      URL.revokeObjectURL(url);
      setMsg("📦 Your data downloaded.");
    } catch { setMsg("Couldn't export — try again."); }
    setBusy("");
  };
  const del = async () => {
    if (confirm !== "DELETE") return;
    setBusy("delete"); setMsg("");
    try { await deleteAccountApi(); try { logout(); } catch { /* ignore */ } window.location.reload(); }
    catch { setMsg("Couldn't delete — try again or contact support."); setBusy(""); }
  };
  return (
    <div className="card" style={{ border: "1px solid var(--danger)" }}>
      <div className="card-header"><span style={{ color: "var(--danger)" }}>🔐 Privacy &amp; account</span></div>
      <button className="btn btn-small btn-secondary" style={{ width: "100%", marginBottom: 10 }} disabled={busy === "export"} onClick={download}>{busy === "export" ? "…" : "📦 Download my data"}</button>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 6 }}>Deleting your account is <strong>permanent</strong> — it wipes your profile, wallet, posts, follows and everything else. Type <strong>DELETE</strong> to confirm.</p>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" style={{ flex: 1 }} />
        <button className="btn btn-small btn-danger" disabled={confirm !== "DELETE" || busy === "delete"} onClick={del}>{busy === "delete" ? "…" : "Delete forever"}</button>
      </div>
      {msg && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>{msg}</p>}
    </div>
  );
}

function SettingsPage({ tier, serverOk, onTierChange, syncEconomy, onOpen }) {
  const { state, updateSettings, toggleSetting } = useAppState();
  const { settings } = state;
  const { tier: tierLabel, colors, locked } = accentOptionsFor(tier);
  const switchTier = async (t) => {
    try { const r = await setTierApi(t); onTierChange?.(r.tier); syncEconomy?.(); } catch { /* offline */ }
  };
  return (
    <>
      <div className="card">
        <div className="card-header">🗺️ LegendZ</div>
        <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 8 }}>New here or unsure what a number means? Every indicator on the app — 🔥 Streak, 📏 reach median, ⚡ energy, ⭐ ratings, tiers — explained in plain English, with the move to make.</p>
        <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => onOpen?.("legendz")}>🗺️ Open LegendZ — what everything means</button>
      </div>
      {serverOk && (
        <div className="card">
          <div className="card-header"><span>🧪 Membership (dev)</span><span className="tag">live</span></div>
          <div className="chip-wrap">
            {["free", "premium", "statz"].map((t) => (
              <button key={t} className={`heritage-chip${/stat/.test(tier) && t === "statz" || /prem|pro/.test(tier) && t === "premium" || (!/stat|prem|pro/.test(tier) && t === "free") ? " sel" : ""}`} onClick={() => switchTier(t)}>{t}</button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 8 }}>Preview tier gating live against the backend. Real upgrades go through billing.</p>
        </div>
      )}
      <div className="card">
        <div className="card-header">
          <span>🎨 Tab Highlight Glow</span>
          <span className="tag">{tierLabel} · {locked ? "locked" : `${colors.length} colors`}</span>
        </div>
        {locked ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>
            🔒 Glow color customization is a <strong>Premium</strong> perk — 8 colors on Premium, 32 on StatZ.
            Upgrade to recolor your tab highlight.
          </p>
        ) : (
          <>
            <div className="swatch-grid">
              {colors.map((c) => (
                <button key={c} onClick={() => updateSettings({ accent: c })}
                  className={`swatch${settings.accent === c ? " active" : ""}`}
                  style={{ background: c, boxShadow: `0 0 10px ${c}` }} title={c} aria-label={c} />
              ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 10 }}>
              {tierLabel} unlocks {colors.length} glow colors. Toggle 🌙 / ☀️ in the header for panel depth.
            </p>
          </>
        )}
      </div>
      <div className="card">
        <div className="card-header"><span>🌐 Display language</span><span className="tag">{langLabel(state.settings?.uiLang || "en")}</span></div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Show the app in your language (transcreated). Switching costs one prompt, then it's cached. Full options in <button className="btn-link" style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0, textDecoration: "underline", font: "inherit" }} onClick={() => onOpen?.("languagez")}>LanguageZ</button>.</p>
        <div className="chip-wrap" data-notranslate>
          {LANGUAGES.map((l) => (
            <button key={l.code} className={`heritage-chip${(state.settings?.uiLang || "en") === l.code ? " sel" : ""}`} onClick={() => updateSettings({ uiLang: l.code })}>{l.flag} {l.endonym}</button>
          ))}
        </div>
      </div>
      {Object.keys(ICON_VARIANTS).length > 0 && (
        <div className="card">
          <div className="card-header">🎨 App icons</div>
          <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Choose the icon for apps that ship more than one look.</p>
          {Object.keys(ICON_VARIANTS).map((key) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{APPS_BY_KEY[key]?.emoji} {APPS_BY_KEY[key]?.name || key}</div>
              <AppIconPicker appKey={key} tier={tier} onOpen={onOpen} />
            </div>
          ))}
        </div>
      )}
      <TierLimitsCard />
      <div className="card">
        <div className="card-header">🔔 Preferences</div>
        {SETTING_TOGGLES.map((row) => (
          <div key={row.key} className="settings-toggle">
            <label>{row.label}</label>
            <div role="switch" aria-checked={!!settings[row.key]} onClick={() => toggleSetting(row.key)}
              className={`toggle-switch${settings[row.key] ? " active" : ""}`} />
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><span>🔔 Notifications by app group</span>
          <button className="btn btn-small btn-secondary" onClick={() => updateSettings(Object.fromEntries(NOTIF_GROUPS.map((g) => [g.key, g.rec])))}>✨ Use recommended</button>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Pick which kinds of activity ping you. My recommended set (marketing, postz, collabz, battlez) keeps you in the loop without the noise.</p>
        {NOTIF_GROUPS.map((g) => {
          const on = settings[g.key] ?? g.rec;
          return (
            <div key={g.key} className="settings-toggle">
              <label>{g.label}{g.rec && <span className="tag" style={{ marginLeft: 6 }}>recommended</span>}</label>
              <div role="switch" aria-checked={on} onClick={() => updateSettings({ [g.key]: !on })}
                className={`toggle-switch${on ? " active" : ""}`} />
            </div>
          );
        })}
      </div>
      <AccountDangerZone serverOk={serverOk} />
    </>
  );
}

const SKILL_KEYS = ["mimez", "directz", "lessonz", "singz", "rapz", "drumz", "violinz", "guitarz", "bassz", "keyz", "producez", "designz", "shotz", "developz", "managez", "bodiez"];
// CI workflows publish these release assets on push to main:
// android-apk.yml → apk-latest, windows-exe.yml → exe-latest.
const APK_DOWNLOAD_URL = "https://github.com/ctkoth/-music-connectz-frontend-/releases/download/apk-latest/MusicConnectZ.apk";
const EXE_DOWNLOAD_URL = "https://github.com/ctkoth/-music-connectz-frontend-/releases/download/exe-latest/MusicConnectZ-Setup.exe";
// Set this to your App Store / TestFlight link once the iOS app is published.
const IOS_APP_URL = "";

function detectOS() {
  const ua = (navigator.userAgent || "").toLowerCase();
  const plat = ((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "").toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua) || (plat.includes("mac") && (navigator.maxTouchPoints || 0) > 1)) return "ios";
  if (/win/.test(plat) || /windows/.test(ua)) return "windows";
  if (/mac/.test(plat)) return "mac";
  return "other";
}

// Device-aware app download — leads with the build for the visitor's OS, with
// the rest available below. OnboardZ is always reachable, so members can return
// anytime to grab any build.
function DownloadApp() {
  const os = detectOS();
  const OPTS = {
    android: { emoji: "🤖", name: "Android", label: "Download for Android (.apk)", href: APK_DOWNLOAD_URL, ready: true, note: "Open the file and allow installs from this source." },
    windows: { emoji: "🪟", name: "Windows", label: "Download for Windows (.exe)", href: EXE_DOWNLOAD_URL, ready: true, note: "Run the installer — SmartScreen: More info → Run anyway (unsigned)." },
    ios: { emoji: "🍎", name: "iPhone / iPad", label: IOS_APP_URL ? "Get it on the App Store" : "iOS — App Store coming soon", href: IOS_APP_URL, ready: !!IOS_APP_URL, note: "iOS installs through the App Store / TestFlight, not a direct download." },
  };
  const primaryKey = OPTS[os] ? os : "windows"; // mac/other → show desktop first
  const primary = OPTS[primaryKey];
  const others = ["android", "windows", "ios"].filter((k) => k !== primaryKey);
  const Btn = ({ o, big }) => (o.ready ? (
    <a className={`btn ${big ? "btn-success" : "btn-secondary btn-small"}`} style={{ width: "100%", textAlign: "center", textDecoration: "none", marginTop: big ? 0 : 6 }} href={o.href} target="_blank" rel="noopener noreferrer">{o.emoji} {o.label}</a>
  ) : (
    <div className="btn btn-secondary btn-small" style={{ width: "100%", textAlign: "center", opacity: 0.6, marginTop: big ? 0 : 6, cursor: "default" }}>{o.emoji} {o.label}</div>
  ));
  return (
    <div className="card">
      <div className="card-header"><span>📲 Get the app</span><IconImg icon="logo.png" alt="Music ConnectZ" style={{ width: 26, height: 26, borderRadius: 6 }} /></div>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Same account, home-screen icon, full-screen. We detected <strong>{primary.name}</strong> — grab that, or pick another below.</p>
      <Btn o={primary} big />
      <p style={{ fontSize: 10, color: "var(--text-light)", margin: "4px 0 8px" }}>{primary.note}</p>
      <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 8 }}>
        <div style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 2 }}>Other platforms</div>
        {others.map((k) => <Btn key={k} o={OPTS[k]} />)}
      </div>
      <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>↩️ Come back to OnboardZ anytime to download again. Links go live as each build publishes.</p>
    </div>
  );
}

function OnboardZPage({ onOpen, serverOk, tier, syncEconomy }) {
  const { state, update } = useAppState();
  const usage = readStore(USAGE_KEY) || {};
  const explored = Object.keys(usage).some((k) => SKILL_KEYS.includes(k));
  const steps = [
    { emoji: "👤", label: "Set up your profile", hint: "Name, contact, location, bio.", done: !!state.user.name, go: "setup" },
    { emoji: "🌐", label: "Pick your language(s)", hint: "So the app speaks your language.", done: (state.user.languages || []).length > 0, go: "languagez" },
    { emoji: "💳", label: "Top up your wallet", hint: "Add funds, SpinAZ or Energy to start transacting.", done: Number(state.wallet?.balance) > 0 || Number(state.wallet?.spinaz) > 0, go: "money" },
    { emoji: "🎭", label: "Pick a PersonaZ", hint: "Artist, Producer, Engineer, Designer…", done: state.personas.length > 0, go: "personas" },
    { emoji: "🎵", label: "Post your first work", hint: "Audio, image, or lyrics.", done: state.examples.length > 0, go: "examples" },
    { emoji: "🎓", label: "Explore a SkillZ app", hint: "Open any training app.", done: explored, go: "lessonz" },
  ];
  const done = steps.filter((s) => s.done).length;
  return (
    <>
    <div className="card">
      <div className="card-header"><span>👋 Welcome to Music ConnectZ</span><span className="tag">{done}/{steps.length}</span></div>
      <div className="ob-bar"><div className="ob-fill" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      {steps.map((s, i) => (
        <div key={i} className={`ob-step${s.done ? " done" : ""}`}>
          <span className="ob-check">{s.done ? "✓" : s.emoji}</span>
          <div style={{ flex: 1 }}>
            <div className="ob-label">{s.label}</div>
            <div className="ob-hint">{s.hint}</div>
          </div>
          {!s.done && <button className="btn btn-small" onClick={() => onOpen(s.go)}>Do it →</button>}
        </div>
      ))}
      {done === steps.length && <p style={{ fontSize: 12, color: "var(--success)", marginTop: 10 }}>🎉 You're all set — welcome aboard!</p>}
      <button className="btn btn-secondary btn-small" style={{ marginTop: 12 }} onClick={() => update({ onboardDismissed: true })}>Dismiss onboarding</button>
    </div>
    <TopUpTiles serverOk={serverOk} tier={tier} syncEconomy={syncEconomy} />
    <DownloadApp />
    </>
  );
}

const SPECZ_ITEMS = [
  { id: "demographics", name: "Audience Demographics", emoji: "📊", price: 9.99, desc: "Age, region, and platform breakdown of a creator's audience." },
  { id: "engagement", name: "Engagement Heatmap", emoji: "🔥", price: 7.99, desc: "When and how a creator's fans interact — your best post windows." },
  { id: "genre-intel", name: "Genre Intelligence", emoji: "🎼", price: 6.99, desc: "Verified genre tags, sub-genre trends, and playlist fit." },
  { id: "collab-score", name: "Collab Compatibility", emoji: "🤝", price: 4.99, desc: "Predictive score for how well two creators' audiences overlap." },
  { id: "ugc-covers", name: "UGC: Cover Art Pack", emoji: "🖼️", price: 12.99, desc: "Licensed community cover-art bundle for your releases." },
  { id: "trending", name: "Trending Metadata Report", emoji: "📈", price: 8.99, desc: "This week's rising tags, sounds, and metadata across the platform." },
];

function SpecZPage({ tier, serverOk, syncEconomy, onOpen }) {
  const { state, updateWallet, addTo, update } = useAppState();
  const [err, setErr] = useState("");
  const isStatz = /stat[sz]/i.test(tier || "");

  // When live, pull the authoritative owned-list from the backend.
  useEffect(() => {
    if (!serverOk || !isStatz) return;
    getSpecZApi()
      .then((r) => update({ speczOwned: r.items.filter((i) => i.owned).map((i) => i.id) }))
      .catch(() => {});
  }, [serverOk, isStatz]);

  if (!isStatz) {
    return (
      <div className="card">
        <div className="card-header">✴️ SpecZ — StatZ Marketplace</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          🔒 SpecZ is a <strong>StatZ</strong>-only marketplace for purchasable user metadata &amp; UGC. Upgrade to StatZ to buy
          audience analytics, engagement data, genre intelligence, and creator content packs.
        </p>
        <UpgradeCTA onOpen={onOpen} label="👑 Upgrade to StatZ" />
      </div>
    );
  }
  const owned = state.speczOwned || [];
  const buy = async (item) => {
    if (owned.includes(item.id)) return;
    setErr("");
    if (serverOk) {
      try {
        const r = await buySpecZApi(item.id); // server deducts, records dev tax, enforces StatZ gate
        updateWallet({ balance: r.wallet.money });
        addTo("speczOwned", item.id);
        addTo("paymentHistory", { amount: -item.price, dev: r.dev_tax_cents / 100, at: Date.now(), note: `SpecZ: ${item.name}` });
        syncEconomy?.();
        return;
      } catch (e) {
        setErr(e.message || "Purchase failed");
        return; // don't silently grant the item on a server rejection
      }
    }
    if (state.wallet.balance < item.price) return;
    const { dev } = splitTransaction(item.price, tier); // local developer tax
    updateWallet({ balance: Number((state.wallet.balance - item.price).toFixed(2)) });
    addTo("speczOwned", item.id);
    addTo("paymentHistory", { amount: -item.price, dev, at: Date.now(), note: `SpecZ: ${item.name}` });
  };
  const { rate, label } = devTaxFor(tier);
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">✴️ SpecZ Marketplace {serverOk ? <span className="tag" style={{ color: "var(--success)" }}>● live</span> : <span className="tag">offline</span>}</div>
        <div className="balance-info">Purchase user metadata &amp; UGC with your wallet · Balance: <strong>${Number(state.wallet.balance).toFixed(2)}</strong> · {label} developer tax {Math.round(rate * 100)}% on every buy</div>
      </div>
      {err && <div className="card" style={{ color: "var(--danger)", fontSize: 12 }}>⚠️ {err}</div>}
      {SPECZ_ITEMS.map((item) => {
        const have = owned.includes(item.id);
        const canAfford = state.wallet.balance >= item.price;
        return (
          <div key={item.id} className="post-card">
            <div className="post-user">{item.emoji} {item.name}</div>
            <div className="post-content">{item.desc}</div>
            {!have && <CostBreakdown amount={item.price} tier={tier} recipient="Seller" payLabel="You pay" />}
            <div className="post-actions" style={{ marginTop: 8 }}>
              {have ? (
                <span className="tag" style={{ color: "var(--success)" }}>✓ Owned</span>
              ) : (
                <button className="btn btn-small" disabled={!canAfford} style={{ opacity: canAfford ? 1 : 0.5 }} onClick={() => buy(item)}>
                  {canAfford ? `Buy ${money(item.price)}` : `Need ${money(item.price)} — add funds`}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

const AZ_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
function NationalitieZPage() {
  const { state, updateUser } = useAppState();
  const [continent, setContinent] = useState(null); // gated continent id
  const [letter, setLetter] = useState("");          // A–Z filter
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const picked = state.user.nationalities || [];
  const toggle = (v) => {
    const next = picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v];
    updateUser({ nationalities: next }); setDirty(true);
  };
  const regionOf = (cid) => REGIONS.find((r) => r.name === CONTINENTS.find((c) => c.id === cid)?.region);
  const allCountries = REGIONS.flatMap((r) => r.countries);
  // Result priority: free-text search > A–Z letter > gated continent > Top-60.
  const base = continent ? (regionOf(continent)?.countries || allCountries) : allCountries;
  const results = query.trim()
    ? allCountries.filter((c) => c.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 80)
    : letter ? base.filter((c) => c.toUpperCase().startsWith(letter)).sort()
    : continent ? (regionOf(continent)?.countries || []) : TOP_60;
  const heading = query ? "🔎 Results"
    : letter ? `🔤 Countries · ${letter}`
    : continent ? `${CONTINENTS.find((c) => c.id === continent)?.emoji} Countries`
    : "🌟 Top 60 nationalities";

  return (
    <>
      <div className="card">
        <div className="card-header"><span>🌐 Your Heritage</span><span className="tag">{picked.length} selected</span></div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 10 }}>Pick a continent, tap a letter, tap the Top-60 flags, or search for any country. Multi-select — also filters your CollabZ / VenueZ / search.</p>

        {/* Continent selectors — picking one gates its countries. */}
        <div className="chip-wrap" style={{ marginBottom: 10 }}>
          {CONTINENTS.map((c) => {
            const r = REGIONS.find((x) => x.name === c.region);
            const anySel = r && picked.includes(r.any);
            return (
              <button key={c.id} className={`heritage-chip${continent === c.id ? " sel" : ""}`} onClick={() => { setContinent(continent === c.id ? null : c.id); setQuery(""); }}>
                {c.emoji} {c.name}{c.descriptor ? ` (${c.descriptor})` : ""}{anySel ? " ✓" : ""}
              </button>
            );
          })}
        </div>

        {/* A–Z letter filter — search by letter (composes with continent). */}
        <div className="chip-wrap" style={{ marginBottom: 10, gap: 4, overflowX: "auto", flexWrap: "nowrap" }}>
          {AZ_LETTERS.map((L) => (
            <button key={L} className={`heritage-chip${letter === L ? " sel" : ""}`} style={{ padding: "2px 8px", fontSize: 12 }}
              onClick={() => { setLetter(letter === L ? "" : L); setQuery(""); }}>{L}</button>
          ))}
        </div>

        {/* "Whole continent" quick pick when one is gated. */}
        {continent && !query && !letter && (() => {
          const c = CONTINENTS.find((x) => x.id === continent); const r = REGIONS.find((x) => x.name === c.region);
          return r ? <button className={`heritage-chip any${picked.includes(r.any) ? " sel" : ""}`} style={{ marginBottom: 8 }} onClick={() => toggle(r.any)}>{c.emoji} All of {c.name} (anywhere)</button> : null;
        })()}

        <input value={query} onChange={(e) => { setQuery(e.target.value); if (e.target.value) setLetter(""); }} placeholder="🔎 Search any country…" style={{ width: "100%", marginBottom: 10 }} />

        <div className="modal-sub-title" style={{ marginBottom: 6 }}>{heading}</div>
        <div className="chip-wrap">
          {results.map((c) => (
            <button key={c} className={`heritage-chip${picked.includes(c) ? " sel" : ""}`} onClick={() => toggle(c)}>{flagOf(c)} {c}</button>
          ))}
          {results.length === 0 && <span style={{ fontSize: 12, color: "var(--text-light)" }}>No match — try another spelling.</span>}
        </div>

        {/* Show what's already picked, with flags, so they can deselect. */}
        {picked.length > 0 && (
          <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8 }}>
            <div className="modal-sub-title" style={{ marginBottom: 6 }}>✅ Your NationalitieZ</div>
            <div className="chip-wrap">
              {picked.map((c) => <button key={c} className="heritage-chip sel" onClick={() => toggle(c)}>{flagOf(c)} {c} ✕</button>)}
            </div>
          </div>
        )}

        <ProfileSaveBar dirty={dirty} onSave={() => { if (isSignedIn()) saveProfileApi(buildProfilePayload(state)).catch(() => {}); setDirty(false); }} label="Save NationalitieZ" />
      </div>
    </>
  );
}

function SubstanceZPage() {
  const { state, updateUser } = useAppState();
  const [saved, ping] = useSavedFlash();
  const [dirty, setDirty] = useState(false);
  const subs = state.user.substances || {};
  const setStance = (key, id) => { updateUser({ substances: { ...subs, [key]: subs[key] === id ? "" : id } }); setDirty(true); };
  const save = () => {
    // Persist the public profile now so the stance powers matching immediately.
    if (isSignedIn()) saveProfileApi(buildProfilePayload(state)).catch(() => {});
    setDirty(false); ping();
  };
  const declared = Object.values(subs).filter(Boolean).length;
  return (
    <div className="card">
      <div className="card-header"><span>🧠 SubstanceZ — Your Stance</span><SavedFlash saved={saved} /></div>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 12 }}>
        Declare your relationship with each — powers sober-friendly matching and healthy spaces. Only <strong>Use</strong> and <strong>Sometimes</strong> read as active; <strong>From before</strong>, <strong>Often sober</strong>, <strong>Sober by choice</strong> and <strong>Never</strong> all read as sober-friendly.
      </p>
      {SUBSTANCES.map((s) => (
        <div key={s.key} className="settings-toggle" style={{ flexWrap: "wrap" }}>
          <label style={{ minWidth: 110 }}>{s.emoji} {s.name}</label>
          <div className="chip-wrap" style={{ justifyContent: "flex-end" }}>
            {STANCES.map((st) => (
              <button key={st.id} className={`heritage-chip${subs[s.key] === st.id ? " sel" : ""}`} onClick={() => setStance(s.key, st.id)}>
                {st.dot} {st.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
        <button className="btn btn-success" style={{ flex: 1 }} onClick={save}>💾 Save stance{declared ? ` (${declared} declared)` : ""}</button>
        {saved && <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 700 }}>✅ Saved</span>}
        {dirty && !saved && <span style={{ fontSize: 11, color: "var(--gold, #ffcf3f)" }}>Unsaved changes</span>}
      </div>
    </div>
  );
}

function PreferenceZPage() {
  const { state, updateUser } = useAppState();
  const [saved, ping] = useSavedFlash();
  const pref = state.user.preferences || {};
  // Multi-select: attracted to male / female / non-binary — any one, both, or all.
  const genders = pref.partnerGenders || (pref.partnerGender ? [pref.partnerGender] : []);
  const asexual = !!pref.asexual;
  const save = (partial) => { updateUser({ preferences: { ...pref, ...partial } }); ping(); };
  const toggleGender = (id) => {
    if (asexual) return;
    const next = genders.includes(id) ? genders.filter((x) => x !== id) : [...genders, id];
    save({ partnerGenders: next });
  };
  const toggleAsexual = () => save({ asexual: !asexual, ...(!asexual ? { partnerGenders: [] } : {}) });
  const toggleTrait = (t) => {
    const traits = pref.traits || [];
    save({ traits: traits.includes(t) ? traits.filter((x) => x !== t) : [...traits, t] });
  };
  const orientation = asexual ? "Asexual" : genders.length === 3 ? "Pansexual" : genders.length === 2 ? "Bi" : genders.length === 1 ? "" : "";
  return (
    <>
      <div className="card">
        <div className="card-header"><span>💞 Attracted To</span><SavedFlash saved={saved} /></div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 12 }}>Pick the gender(s) you're attracted to — one, both, or all. Filterable across CollabZ, VenueZ, and Social ConnectZ.</p>
        <div className="grid-3">
          {PARTNER_GENDERS.map((g) => {
            const on = genders.includes(g.id) && !asexual;
            return (
              <button key={g.id} className={`persona-btn${on ? " sel-pref" : ""}`} disabled={asexual} style={{ ...(on ? { borderColor: "var(--primary)", boxShadow: "var(--glow)" } : undefined), opacity: asexual ? 0.4 : 1 }} onClick={() => toggleGender(g.id)}>
                {on ? "✓ " : ""}{g.emoji} {g.label}
              </button>
            );
          })}
        </div>
        <button className={`persona-btn${asexual ? " sel-pref" : ""}`} style={{ width: "100%", marginTop: 8, ...(asexual ? { borderColor: "var(--primary)", boxShadow: "var(--glow)" } : {}) }} onClick={toggleAsexual}>
          {asexual ? "✓ " : ""}🤍 Asexual — not sexually attracted to any gender
        </button>
        {orientation && <p style={{ fontSize: 11, color: "var(--accent, #22e6ff)", marginTop: 8 }}>💫 Reads as <strong>{orientation}</strong>{orientation === "Pansexual" ? " — attracted to all." : orientation === "Asexual" ? "." : "."}</p>}
      </div>
      <div className="card">
        <div className="card-header"><span>✨ Traits That Matter</span><SavedFlash saved={saved} /></div>
        <div className="chip-wrap">
          {TRAITS.map((t) => (
            <button key={t} className={`heritage-chip${(pref.traits || []).includes(t) ? " sel" : ""}`} onClick={() => toggleTrait(t)}>{t}</button>
          ))}
        </div>
        <ProfileSaveBar label="Save PreferenceZ" />
      </div>
    </>
  );
}

// LanguageZ — the multilingual hub: display language (whole-app transcreation),
// the languages you speak (a profile metric), location-based suggestions, and a
// translator box. Translation is powered by the backend and charges a prompt,
// then caches, so re-viewing the same language is free.
function LanguageZPage({ tier, serverOk, syncEconomy, onOpen }) {
  const { state, updateUser, updateSettings } = useAppState();
  const [saved, ping] = useSavedFlash();
  const uiLang = state.settings?.uiLang || "en";
  const spoken = state.user.languages || [];
  const suggested = suggestLanguages(state.user.nationalities).filter((c) => !spoken.includes(c));
  const toggleSpoken = (code) => {
    updateUser({ languages: spoken.includes(code) ? spoken.filter((c) => c !== code) : [...spoken, code] });
    ping();
  };
  // Translator box
  const [tText, setTText] = useState("");
  const [tLang, setTLang] = useState("es");
  const [tOut, setTOut] = useState("");
  const [tBusy, setTBusy] = useState(false);
  const [tErr, setTErr] = useState("");
  const doTranslate = async () => {
    if (!tText.trim()) return;
    setTBusy(true); setTErr(""); setTOut("");
    try { setTOut(await translateOne(tText.trim(), tLang, syncEconomy)); }
    catch { setTErr("Translation unavailable right now (or add funds). Try again."); }
    setTBusy(false);
  };
  return (
    <>
      <div className="card">
        <div className="card-header"><span>🌐 Display language</span><SavedFlash saved={saved} /></div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 10 }}>
          Show Music ConnectZ in your language — transcreated, not just translated (emoji &amp; app names kept). Switching costs one prompt to translate what's on screen, then it's cached and free.
        </p>
        <div className="chip-wrap">
          {LANGUAGES.map((l) => (
            <button key={l.code} className={`heritage-chip${uiLang === l.code ? " sel" : ""}`} onClick={() => updateSettings({ uiLang: l.code })}>
              {uiLang === l.code ? "✓ " : ""}{l.flag} {l.endonym}
            </button>
          ))}
        </div>
        {uiLang !== "en" && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>Showing in {langName(uiLang)}. Tap 🇬🇧 English to switch back anytime.</p>}
      </div>

      <div className="card">
        <div className="card-header"><span>🗣️ Languages you speak</span><SavedFlash saved={saved} /></div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 10 }}>Pick every language you speak — shown on your profile and used to match collaborators. Multi-select.</p>
        {suggested.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 4 }}>📍 Suggested from your NationalitieZ:</div>
            <div className="chip-wrap">
              {suggested.map((code) => (
                <button key={code} className="heritage-chip" onClick={() => toggleSpoken(code)}>+ {langLabel(code)}</button>
              ))}
            </div>
          </div>
        )}
        <div className="chip-wrap">
          {LANGUAGES.map((l) => (
            <button key={l.code} className={`heritage-chip${spoken.includes(l.code) ? " sel" : ""}`} onClick={() => toggleSpoken(l.code)}>
              {spoken.includes(l.code) ? "✓ " : ""}{l.flag} {l.endonym}
            </button>
          ))}
        </div>
        {state.user.nationalities?.length ? null : (
          <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 8 }}>Set your <button className="btn-link" style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0, textDecoration: "underline", font: "inherit" }} onClick={() => onOpen?.("nationalitiez")}>NationalitieZ</button> to get language suggestions.</p>
        )}
        <ProfileSaveBar label="Save LanguageZ" />
      </div>

      <div className="card">
        <div className="card-header">🎨 App icon</div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Pick the icon this app shows — English <strong>LanguageZ</strong> or Português <strong>LinguagemZ</strong>. Changes it everywhere: the launcher, dock, and window.</p>
        <AppIconPicker appKey="languagez" tier={tier} onOpen={onOpen} />
      </div>

      <div className="card">
        <div className="card-header">🔤 Translator</div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Transcreate any text into another language. Costs one prompt.</p>
        <CappedTextarea value={tText} onChange={(e) => setTText(e.target.value)} placeholder="Type or paste text…" style={{ height: 60 }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}>
          <label style={{ fontSize: 11, color: "var(--text-light)" }}>Into</label>
          <select value={tLang} onChange={(e) => setTLang(e.target.value)} style={{ flex: 1 }}>
            {LANGUAGES.filter((l) => l.code !== "en").map((l) => <option key={l.code} value={l.code}>{l.flag} {l.name} ({l.endonym})</option>)}
          </select>
          <button className="btn btn-small" disabled={tBusy || !tText.trim() || !serverOk} onClick={doTranslate}>{tBusy ? "…" : "🌐 Translate"}</button>
        </div>
        {tErr && <p style={{ fontSize: 11, color: "var(--danger)" }}>{tErr}</p>}
        {tOut && (
          <div className="post-card" data-notranslate style={{ marginTop: 6 }}>
            <div className="post-content" style={{ whiteSpace: "pre-wrap" }}>{tOut}</div>
            <button className="btn btn-small btn-secondary" style={{ marginTop: 6 }} onClick={() => navigator.clipboard?.writeText(tOut)}>📋 Copy</button>
          </div>
        )}
        {!serverOk && <p style={{ fontSize: 11, color: "var(--text-light)" }}>Sign in / connect to translate.</p>}
      </div>
    </>
  );
}

// Demo roster so the filterable metrics are visibly working in Social ConnectZ.
const DEMO_MEMBERS = [
  { name: "Kaya", gender: "female", region: "Africa", country: "Nigeria", sober: true, lookingFor: "collab", sign: "Leo" },
  { name: "Diego", gender: "male", region: "South America", country: "Colombia", sober: false, lookingFor: "romance", sign: "Scorpio" },
  { name: "Mei", gender: "female", region: "Asia", country: "Japan", sober: true, lookingFor: "collab", sign: "Virgo" },
  { name: "Luka", gender: "male", region: "Europe", country: "Croatia", sober: false, lookingFor: "collab", sign: "Aries" },
  { name: "Amara", gender: "neutral", region: "Africa", country: "Ghana", sober: true, lookingFor: "romance", sign: "Pisces" },
  { name: "Sam", gender: "male", region: "North America", country: "United States", sober: false, lookingFor: "collab", sign: "Gemini" },
];

// Toggle a value in/out of a filter array (multi-select).
function inArr(arr, v) { return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]; }

function DiscoverTab({ serverOk }) {
  const [regions, setRegions] = useState([]);
  const [genders, setGenders] = useState([]);
  const [signs, setSigns] = useState([]);
  const [subs, setSubs] = useState([]); // SubstanceZ keys wanted sober-friendly
  const [soberOnly, setSoberOnly] = useState(false);
  const [live, setLive] = useState(null); // server results, or null when offline
  const [viewing, setViewing] = useState(null); // a member profile being viewed

  // Live member search server-side when reachable; debounced on filter change.
  useEffect(() => {
    if (!serverOk) { setLive(null); return undefined; }
    const t = setTimeout(() => {
      searchMembersApi({ regions, genders, signs, substances: subs, sober: soberOnly })
        .then((r) => setLive(r.members)).catch(() => setLive(null));
    }, 300);
    return () => clearTimeout(t);
  }, [serverOk, regions, genders, signs, subs, soberOnly]);

  // Offline fallback: filter the demo roster locally.
  const demoFiltered = DEMO_MEMBERS.filter((m) =>
    (!regions.length || regions.includes(m.region)) &&
    (!genders.length || genders.includes(m.gender)) &&
    (!signs.length || signs.includes(m.sign)) &&
    (!subs.length || m.sober) &&
    (!soberOnly || m.sober),
  );
  const filtered = live !== null ? live : demoFiltered;
  const active = regions.length + genders.length + signs.length + subs.length + (soberOnly ? 1 : 0);
  const openMember = (username) => { if (username) getMemberApi(username).then(setViewing).catch(() => {}); };
  const clear = () => { setRegions([]); setGenders([]); setSigns([]); setSubs([]); setSoberOnly(false); };

  return (
    <>
      <div className="card">
        <div className="card-header"><span>🔍 Filters {active > 0 && <span className="tag">{active}</span>}</span>{active > 0 && <button className="btn btn-small btn-secondary" onClick={clear}>Clear</button>}</div>
        <p style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 8 }}>Pick as many as you want in each — combine metrics to narrow the room.</p>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>🌐 NationalitieZ (heritage)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
          {REGIONS.map((r) => <button key={r.name} className={`heritage-chip${regions.includes(r.name) ? " sel" : ""}`} onClick={() => setRegions((a) => inArr(a, r.name))}>{r.emoji} {r.name}</button>)}
        </div>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>💞 PreferenceZ (gender)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
          {PARTNER_GENDERS.map((g) => <button key={g.id} className={`heritage-chip${genders.includes(g.id) ? " sel" : ""}`} onClick={() => setGenders((a) => inArr(a, g.id))}>{g.emoji} {g.label}</button>)}
        </div>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>♌ ZodiacZ (sign)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
          {SIGNS.map((s) => <button key={s.name} className={`heritage-chip${signs.includes(s.name) ? " sel" : ""}`} onClick={() => setSigns((a) => inArr(a, s.name))}>{s.emoji} {s.name}</button>)}
        </div>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>🧠 SubstanceZ (show members sober-friendly on…)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
          {SUBSTANCES.map((s) => <button key={s.key} className={`heritage-chip${subs.includes(s.key) ? " sel" : ""}`} onClick={() => setSubs((a) => inArr(a, s.key))}>{s.emoji} {s.name}</button>)}
        </div>
        <div className="settings-toggle">
          <label>🧠 SubstanceZ — sober-friendly only (all)</label>
          <div role="switch" aria-checked={soberOnly} onClick={() => setSoberOnly((v) => !v)} className={`toggle-switch${soberOnly ? " active" : ""}`} />
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span>💼 Members {live !== null ? <span className="tag" style={{ color: "var(--success)" }}>● live</span> : <span className="tag">demo</span>}</span><span className="filter-badge">{filtered.length}</span></div>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No members match these filters.</p>
        ) : filtered.map((m) => {
          // Server members use username/display_name/regions; demo uses name/country.
          const name = m.display_name || m.name;
          const uname = m.username;
          const heritage = m.nationalities?.length ? m.nationalities.join(", ") : (m.country || (m.regions || []).join(", "));
          return (
            <div key={uname || name} className="post-card" style={uname ? { cursor: "pointer" } : undefined} onClick={() => openMember(uname)}>
              <div className="post-user">{name} {m.gender && `· ${PARTNER_GENDERS.find((g) => g.id === m.gender)?.emoji || ""}`} {m.median != null && <span className="tag" style={{ color: "var(--gold, #ffcf3f)" }}>💯 {m.median}</span>}</div>
              <div className="post-meta">🌐 {heritage || "—"} · {SIGNS.find((s) => s.name === m.sign)?.emoji} {m.sign} · {m.sober ? "🟢 sober" : "🍺 social"}{m.lookingFor ? ` · looking for ${m.lookingFor}` : ""}{uname ? " · tap to view" : ""}</div>
            </div>
          );
        })}
        <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>
          {live !== null ? "Live members — filtered server-side by their real metrics. Tap anyone to view their profile." : "Demo roster — sign-in + backend brings up real members here, filtered by their metrics."}
        </p>
      </div>

      {viewing && (
        <div className="modal" onClick={() => setViewing(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><h2>👤 {viewing.display_name || viewing.username}</h2></div>
              <button className="close-btn" onClick={() => setViewing(null)}>×</button>
            </div>
            {viewing.avatar && <img src={viewing.avatar} alt={viewing.username} style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", display: "block", margin: "0 auto 8px", border: "2px solid var(--primary)" }} />}
            <div style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 6 }}>
              @{viewing.username} {viewing.gender && `· ${PARTNER_GENDERS.find((g) => g.id === viewing.gender)?.emoji || viewing.gender}`} {viewing.sign && `· ${SIGNS.find((s) => s.name === viewing.sign)?.emoji || ""} ${viewing.sign}`}
            </div>
            {(viewing.tier || viewing.founding) && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                <TierBadge tier={viewing.tier} />
                <FoundingBadge founding={viewing.founding} lifetime={viewing.lifetime} />
              </div>
            )}
            {viewing.username && !viewing.mine && (
              <FollowButton username={viewing.username} rel={viewing.relationship} counts={viewing} />
            )}
            {viewing.username && !viewing.mine && (
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button className="btn btn-small btn-secondary" onClick={() => { reportItemApi(`profile:${viewing.username}`, "other").catch(() => {}); alert("Reported to moderation — thanks."); }}>⚠️ Report</button>
                <button className="btn btn-small btn-secondary" onClick={() => { if (confirm(`Block @${viewing.username}? You won't see each other.`)) { blockUserApi(viewing.username, "block").then(() => setViewing(null)).catch(() => {}); } }}>🚫 Block</button>
              </div>
            )}
            {viewing.username && !viewing.mine && (
              <div className="card" style={{ padding: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>⭐ Rate their profile</div>
                <ProfileRater username={viewing.username} dimension="overall" label="Overall" emoji="⭐" median={viewing.overall} mine={viewing.my_overall} onRated={(r) => setViewing((v) => ({ ...v, overall: r.overall }))} />
                <ProfileRater username={viewing.username} dimension="attractiveness" label="Attractiveness" emoji="💯" median={viewing.attractiveness ?? viewing.median} mine={viewing.my_attractiveness} onRated={(r) => setViewing((v) => ({ ...v, attractiveness: r.attractiveness, median: r.attractiveness }))} />
              </div>
            )}
            {viewing.mine && (viewing.overall != null || viewing.attractiveness != null) && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", fontSize: 11, marginBottom: 8 }}>
                <span>⭐ Overall {viewing.overall != null ? `${viewing.overall}/10` : "—"}</span>
                <span>💯 Attractiveness {viewing.attractiveness != null ? `${viewing.attractiveness}/10` : "—"}</span>
              </div>
            )}
            {viewing.bio && <p style={{ fontSize: 13, marginBottom: 8 }}>{viewing.bio}</p>}
            {viewing.location && <div className="skill-item"><span className="skill-item-name">📍 {viewing.location}</span></div>}
            {(viewing.nationalities || []).length > 0 && <div style={{ margin: "6px 0" }}>🌐 {viewing.nationalities.map((n) => <span key={n} className="tag">{n}</span>)}</div>}
            {(viewing.attracted_to || []).length > 0 && <div style={{ margin: "6px 0" }}>💞 Into: {viewing.attracted_to.map((a) => <span key={a} className="tag">{PARTNER_GENDERS.find((g) => g.id === a)?.label || a}</span>)}</div>}
            {viewing.asexual && <div style={{ margin: "6px 0" }}><span className="tag">🤍 Asexual</span></div>}
            {(viewing.traits || []).length > 0 && <div style={{ margin: "6px 0" }}>✨ {viewing.traits.map((t) => <span key={t} className="tag">{t}</span>)}</div>}
            {(viewing.personas || []).map((p) => (
              <div key={p.name} style={{ marginTop: 8 }}>
                <div className="modal-sub-title">{p.emoji} {p.name}</div>
                <div className="chip-wrap">{(p.skills || []).map((s) => <span key={s} className="tag">{s}</span>)}</div>
              </div>
            ))}
            {(viewing.links || []).length > 0 && <div style={{ margin: "8px 0" }}><LinksRow links={viewing.links} owner={viewing.username || ""} /></div>}
            <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 8 }}>Sober-friendly: {viewing.sober ? "🟢 yes" : "🍺 social"}</p>
            {viewing.username && <SocialBar id={`profile:${viewing.username}`} shareText={`@${viewing.username} on Music ConnectZ`} />}
          </div>
        </div>
      )}
    </>
  );
}

// Min/max range filter row. A set range gates exclusive — members outside it
// (or without a value for the metric) are excluded server-side.
function RangeRow({ label, emoji, minKey, maxKey, rng, setR, min = 0, max = 100, step = 1, suffix = "" }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>{emoji} {label}</label>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
        <input type="number" min={min} max={max} step={step} value={rng[minKey] ?? ""} placeholder={`min${suffix}`} onChange={(e) => setR(minKey, e.target.value)} style={{ width: 90 }} />
        <span style={{ color: "var(--text-light)" }}>–</span>
        <input type="number" min={min} max={max} step={step} value={rng[maxKey] ?? ""} placeholder={`max${suffix}`} onChange={(e) => setR(maxKey, e.target.value)} style={{ width: 90 }} />
      </div>
    </div>
  );
}

// Reusable cross-user member finder: multi-select NationalitieZ / PreferenceZ /
// ZodiacZ / SubstanceZ filters (OR within a metric, AND across metrics), live
// server search with a demo fallback. Used by CollabZ, MessageZ, and anywhere
// members pick other members. onPick(member) fires when a result is tapped.
function MemberFinder({ serverOk, onPick, actionLabel = "Select", note }) {
  const [regions, setRegions] = useState([]);
  const [genders, setGenders] = useState([]);
  const [signs, setSigns] = useState([]);
  const [subs, setSubs] = useState([]); // substance keys wanted sober-friendly
  const [rng, setRng] = useState({}); // { age_min, age_max, attr_min, attr_max, max_km }
  const [locMsg, setLocMsg] = useState("");
  const [locating, setLocating] = useState(false);
  const [live, setLive] = useState(null);
  const setR = (k, v) => setRng((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!serverOk) { setLive(null); return undefined; }
    const t = setTimeout(() => {
      searchMembersApi({ regions, genders, signs, substances: subs, ...rng })
        .then((r) => setLive(r.members)).catch(() => setLive(null));
    }, 300);
    return () => clearTimeout(t);
  }, [serverOk, regions, genders, signs, subs, rng]);

  // Capture GPS and share it so distance filtering works (opt-in).
  const useMyLocation = () => {
    if (!navigator.geolocation) { setLocMsg("Geolocation isn't available on this device."); return; }
    setLocating(true); setLocMsg("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try { await setLocationApi(true, pos.coords.latitude, pos.coords.longitude); setLocMsg("📍 Location shared — distance filtering on."); }
        catch { setLocMsg("Saved locally — sign in to sync location."); }
        setLocating(false);
      },
      () => { setLocMsg("Location permission denied."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const demoFiltered = DEMO_MEMBERS.filter((m) =>
    (!regions.length || regions.includes(m.region)) &&
    (!genders.length || genders.includes(m.gender)) &&
    (!signs.length || signs.includes(m.sign)) &&
    (!subs.length || m.sober),
  );
  const filtered = live !== null ? live : demoFiltered;
  const rangeActive = Object.values(rng).filter((v) => v != null && v !== "").length;
  const active = regions.length + genders.length + signs.length + subs.length + rangeActive;
  const clear = () => { setRegions([]); setGenders([]); setSigns([]); setSubs([]); setRng({}); };

  return (
    <>
      <div className="card">
        <div className="card-header"><span>🔍 Filters {active > 0 && <span className="tag">{active}</span>}</span>{active > 0 && <button className="btn btn-small btn-secondary" onClick={clear}>Clear</button>}</div>
        {note && <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>{note}</p>}
        <p style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 8 }}>Pick as many as you want in each — combine metrics to narrow it down.</p>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>🌐 NationalitieZ (heritage)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
          {REGIONS.map((r) => <button key={r.name} className={`heritage-chip${regions.includes(r.name) ? " sel" : ""}`} onClick={() => setRegions((a) => inArr(a, r.name))}>{r.emoji} {r.name}</button>)}
        </div>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>💞 PreferenceZ (gender)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
          {PARTNER_GENDERS.map((g) => <button key={g.id} className={`heritage-chip${genders.includes(g.id) ? " sel" : ""}`} onClick={() => setGenders((a) => inArr(a, g.id))}>{g.emoji} {g.label}</button>)}
        </div>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>♌ ZodiacZ (sign)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
          {SIGNS.map((s) => <button key={s.name} className={`heritage-chip${signs.includes(s.name) ? " sel" : ""}`} onClick={() => setSigns((a) => inArr(a, s.name))}>{s.emoji} {s.name}</button>)}
        </div>
        <label style={{ fontSize: 11, color: "var(--text-light)" }}>🧠 SubstanceZ (show members sober-friendly on…)</label>
        <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
          {SUBSTANCES.map((s) => <button key={s.key} className={`heritage-chip${subs.includes(s.key) ? " sel" : ""}`} onClick={() => setSubs((a) => inArr(a, s.key))}>{s.emoji} {s.name}</button>)}
        </div>

        {/* Range gates — a set range excludes anyone outside it. */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8, marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>🎚️ Range filters <span style={{ fontWeight: 400, color: "var(--text-light)" }}>(exclusive — gates who qualifies)</span></div>
          <RangeRow label="Attractiveness (/10)" emoji="💯" minKey="attr_min" maxKey="attr_max" rng={rng} setR={setR} min={1} max={10} />
          <RangeRow label="Age (years)" emoji="🎂" minKey="age_min" maxKey="age_max" rng={rng} setR={setR} min={13} max={99} />
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: "var(--text-light)" }}>🧠 Skill experience — minimum years (no max)</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
              <input type="number" min={0} value={rng.exp_min ?? ""} placeholder="min years" onChange={(e) => setR("exp_min", e.target.value)} style={{ width: 110 }} />
              <span style={{ fontSize: 11, color: "var(--text-light)" }}>+ years in the craft — no upper cap</span>
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: "var(--text-light)" }}>🗺️ Distance (within km — for in-person collabs)</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
              <input type="number" min={1} value={rng.max_km ?? ""} placeholder="max km" onChange={(e) => setR("max_km", e.target.value)} style={{ width: 90 }} />
              <button className="btn btn-small btn-secondary" onClick={useMyLocation} disabled={locating}>{locating ? "📍 locating…" : "📍 Use my location"}</button>
            </div>
            {locMsg && <div style={{ fontSize: 10, color: "var(--accent, #22e6ff)", marginTop: 3 }}>{locMsg}</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span>💼 Members {live !== null ? <span className="tag" style={{ color: "var(--success)" }}>● live</span> : <span className="tag">demo</span>}</span><span className="filter-badge">{filtered.length}</span></div>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No members match these filters.</p>
        ) : filtered.map((m) => {
          const name = m.display_name || m.name;
          const uname = m.username;
          const heritage = m.nationalities?.length ? m.nationalities.join(", ") : (m.country || (m.regions || []).join(", "));
          return (
            <div key={uname || name} className="post-card">
              <div className="post-user" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {m.avatar
                  ? <img src={m.avatar} alt={name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                  : <span className="post-avatar" style={{ width: 32, height: 32, fontSize: 14 }}>{(name || "?").charAt(0).toUpperCase()}</span>}
                <span>{name} {m.founding && <span title="Founding member">👑</span>} {m.gender && `· ${PARTNER_GENDERS.find((g) => g.id === m.gender)?.emoji || ""}`} {m.median != null && <span className="tag" style={{ color: "var(--gold, #ffcf3f)" }}>💯 {m.median}</span>}</span>
              </div>
              <div className="post-meta">🌐 {heritage || "—"} · {SIGNS.find((s) => s.name === m.sign)?.emoji} {m.sign} · {m.sober ? "🟢 sober" : "🍺 social"}{m.age != null ? ` · 🎂 ${m.age}` : ""}{m.distance_km != null ? ` · 🗺️ ${m.distance_km}km` : ""}{m.tier && m.tier !== "free" ? ` · ${TIER_EMOJI[tierKey(m.tier)]} ${tierLabel(m.tier)}` : ""}</div>
              <button className="btn btn-small" style={{ marginTop: 6 }} onClick={() => onPick?.(m)}>{actionLabel}{uname ? ` · @${uname}` : name ? ` · ${name}` : ""}</button>
            </div>
          );
        })}
        <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>
          {live !== null ? "Live members — filtered server-side by their real metrics." : "Demo roster — sign-in + backend brings up real members, filtered by their metrics."}
        </p>
      </div>
    </>
  );
}

const DATE_POOL = [
  { name: "Kaya", sign: "Leo", looking: "Collab", bio: "R&B vocalist chasing a moody hook." },
  { name: "Diego", sign: "Scorpio", looking: "Romance", bio: "Reggaeton producer, night owl." },
  { name: "Mei", sign: "Virgo", looking: "Collab", bio: "Mix engineer, clean masters only." },
  { name: "Luka", sign: "Aries", looking: "Quick collab", bio: "Drill beats, fast turnarounds." },
  { name: "Amara", sign: "Pisces", looking: "Romance", bio: "Singer-songwriter, soft-focus feels." },
  { name: "Sam", sign: "Gemini", looking: "Collab", bio: "Multi-instrumentalist, two moods." },
];
function Avatar({ name }) {
  return <div className="post-avatar">{name.charAt(0).toUpperCase()}</div>;
}

function VibeZTab() {
  const [acted, setActed] = useState({});
  return (
    <div className="card">
      <div className="card-header">♥️ VibeZ <span className="tag">what they're looking for</span></div>
      {DATE_POOL.map((p) => {
        const a = acted[p.name];
        return (
          <div key={p.name} className="post-card">
            <div className="post-header"><Avatar name={p.name} /><div className="post-info">
              <div className="post-user">{p.name} · {SIGNS.find((s) => s.name === p.sign)?.emoji}</div>
              <div className="post-meta">💌 Looking for: {p.looking}</div></div></div>
            <div className="post-content">{p.bio}</div>
            <div className="post-actions">
              {a ? <span className="tag" style={{ color: a === "like" ? "var(--primary)" : "var(--text-light)" }}>{a === "like" ? "💚 Liked" : "Passed"}</span> : (
                <>
                  <button className="btn btn-small" onClick={() => setActed((s) => ({ ...s, [p.name]: "like" }))}>💚 Vibe</button>
                  <button className="btn btn-small btn-secondary" onClick={() => setActed((s) => ({ ...s, [p.name]: "pass" }))}>Pass</button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfernoTab() {
  const [i, setI] = useState(0);
  const [last, setLast] = useState(null);
  const p = DATE_POOL[i];
  const act = (kind) => { setLast(`${kind === "fire" ? "🔥 liked" : "👎 passed"} ${p.name}`); setI((n) => n + 1); };
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div className="card-header" style={{ justifyContent: "center", borderBottom: "none" }}>❤️‍🔥 Inferno</div>
      {p ? (
        <>
          <div className="post-avatar" style={{ width: 72, height: 72, margin: "0 auto 10px", fontSize: 30 }}>{p.name.charAt(0)}</div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{p.name} · {SIGNS.find((s) => s.name === p.sign)?.emoji}</div>
          <div className="post-meta" style={{ marginBottom: 6 }}>💌 {p.looking}</div>
          <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 12 }}>{p.bio}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn btn-secondary" onClick={() => act("pass")}>👎 Pass</button>
            <button className="btn" onClick={() => act("fire")}>🔥 Like</button>
          </div>
        </>
      ) : <p style={{ fontSize: 12, color: "var(--text-light)" }}>🔥 You're all caught up — check back for new profiles.</p>}
      {last && <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 10 }}>{last}</p>}
    </div>
  );
}

const BOARDS = ["General", "Collabs", "Beats", "Bars", "Feedback"];
const DEMO_BOARD = [
  { id: "b1", board: "Collabs", who: "Mei", body: "Need a vocalist for a lo-fi flip.", at: Date.now() - 2 * 3600e3 },
  { id: "b2", board: "Beats", who: "Luka", body: "Free drill loop pack, link in bio.", at: Date.now() - 5 * 3600e3 },
];
function BoardZTab() {
  const { state, addTo } = useAppState();
  const [board, setBoard] = useState("General");
  const [body, setBody] = useState("");
  const posts = [...DEMO_BOARD, ...(state.boardPosts || [])].filter((p) => p.board === board).sort((a, b) => b.at - a.at);
  const post = () => { if (!body.trim()) return; addTo("boardPosts", { id: Date.now(), board, who: "You", body: body.trim(), at: Date.now() }); setBody(""); };
  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 12 }}>
        {BOARDS.map((b) => <button key={b} className={`heritage-chip${board === b ? " sel" : ""}`} onClick={() => setBoard(b)}>🪧 {b}</button>)}
      </div>
      <div className="card">
        <div style={{ display: "flex", gap: 8 }}>
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder={`Post to ${board}…`} onKeyDown={(e) => e.key === "Enter" && post()} style={{ flex: 1 }} />
          <button className="btn" onClick={post}>Post</button>
        </div>
      </div>
      <div className="card">
        <div className="card-header">🪧 {board}</div>
        {posts.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No posts yet — start one.</p>
          : posts.map((p) => (
            <div key={p.id} className="post-card">
              <div className="post-user">{p.who}</div>
              <div className="post-content">{p.body}</div>
              <div className="post-meta">{new Date(p.at).toLocaleString()}</div>
              <SocialBar id={`board:${p.id}`} shareText={`${p.who} on BoardZ`} />
            </div>
          ))}
      </div>
    </>
  );
}

const MBTI_Q = [
  { q: "At a session, you…", a: ["Bring the energy, feed off the room", "E"], b: ["Lock in quietly, headphones on", "I"] },
  { q: "Writing a track, you start from…", a: ["Concrete refs and what works", "S"], b: ["A feeling or abstract concept", "N"] },
  { q: "Giving feedback, you lead with…", a: ["The honest technical truth", "T"], b: ["How it makes people feel", "F"] },
  { q: "Your release plan is…", a: ["Scheduled, roadmapped, on time", "J"], b: ["Drop it when it feels right", "P"] },
];
const MBTI_BLURB = {
  E: "outgoing", I: "reflective", S: "grounded", N: "visionary", T: "analytical", F: "empathic", J: "structured", P: "spontaneous",
};
function PersonalitieZTab() {
  const { state, updateUser } = useAppState();
  const [ans, setAns] = useState({});
  const [saved, ping] = useSavedFlash();
  const done = Object.keys(ans).length === MBTI_Q.length;
  const type = MBTI_Q.map((_, i) => ans[i]).join("");
  const save = () => { updateUser({ mbti: type }); if (isSignedIn()) saveProfileApi(buildProfilePayload({ ...state, user: { ...state.user, mbti: type } })).catch(() => {}); ping(); };
  return (
    <div className="card">
      <div className="card-header">😶 PersonalitieZ <span className="tag">MBTI</span></div>
      {state.user.mbti && <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 10 }}>Saved type: <strong style={{ color: "var(--primary)" }}>{state.user.mbti}</strong></p>}
      {MBTI_Q.map((item, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{item.q}</div>
          <div className="chip-wrap">
            <button className={`heritage-chip${ans[i] === item.a[1] ? " sel" : ""}`} onClick={() => setAns((s) => ({ ...s, [i]: item.a[1] }))}>{item.a[0]}</button>
            <button className={`heritage-chip${ans[i] === item.b[1] ? " sel" : ""}`} onClick={() => setAns((s) => ({ ...s, [i]: item.b[1] }))}>{item.b[0]}</button>
          </div>
        </div>
      ))}
      {done && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 800 }}>Your type: {type}</p>
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>{MBTI_Q.map((_, i) => MBTI_BLURB[ans[i]]).join(" · ")}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <button className="btn btn-success" onClick={save}>💾 Save to profile</button>
            {saved && <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 700 }}>✓ Saved</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function SocialConnectZPage({ serverOk }) {
  const [sub, setSub] = useState("discover");
  const SUBS = [["discover", "🔎 Discover"], ["vibez", "♥️ VibeZ"], ["inferno", "❤️‍🔥 Inferno"], ["boardz", "🪧 BoardZ"], ["personalitiez", "😶 PersonalitieZ"]];
  const Body = { discover: DiscoverTab, vibez: VibeZTab, inferno: InfernoTab, boardz: BoardZTab, personalitiez: PersonalitieZTab }[sub];
  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 14 }}>
        {SUBS.map(([id, label]) => <button key={id} className={`heritage-chip${sub === id ? " sel" : ""}`} onClick={() => setSub(id)}>{label}</button>)}
      </div>
      <Body serverOk={serverOk} />
    </>
  );
}

const GROUP_BUILTIN = [
  { name: "FriendZ", icon: "groupz_friendz.png", note: "Mutual follows — your friends" },
  { name: "FanZ", icon: "groupz_fanz.png", note: "Follow you one-way — your fans" },
  { name: "PartnerZ", icon: "groupz.png", note: "Agreed partners (with a terms doc)" },
  { name: "Blocked", icon: "groupz_blocked.png", note: "Cannot contact you" },
];
const VISIBILITIES = [
  { id: "public", icon: "vis_public.png", label: "Public" },
  { id: "private", icon: "vis_private.png", label: "Private" },
  { id: "group", icon: "vis_group.png", label: "Group-only" },
  { id: "restricted", icon: "vis_restricted.png", label: "Restricted" },
];
const GROUP_ICON_CHOICES = ["groupz_custom.png", "groupz_friendz.png", "groupz_fanz.png", "groupz_blocked.png", "groupz.png", "crewz.png", "personaz.png", "collabz.png", "battlez.png", "labelz.png", "spinaz.png", "witchcraft.png"];
function groupLimitFor(tier) {
  const t = (tier || "").toLowerCase();
  if (t.includes("statz") || t.includes("stats")) return 20;
  if (t.includes("premium") || t.includes("pro")) return 5;
  return 1;
}

function GroupZPage({ tier }) {
  const { state, addTo, removeFrom, setList } = useAppState();
  const groups = state.groups || [];
  const limit = groupLimitFor(tier);
  const canCustomIcon = /premium|pro|stat[sz]/i.test(tier || "");
  const atLimit = groups.length >= limit;
  const update = (i, patch) => setList("groups", groups.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  const create = () => { if (!atLimit) addTo("groups", { id: Date.now(), name: "New Group", icon: "groupz_custom.png", visibility: "group" }); };

  return (
    <>
      <div className="card">
        <div className="card-header">👥 Built-in Groups</div>
        <div className="grid-2">
          {GROUP_BUILTIN.map((g) => (
            <div key={g.name} className="modal-sub-row">
              <IconImg icon={g.icon} alt={g.name} />
              <div><div className="s-name">{g.name}</div><div className="s-desc">{g.note}</div></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span>✏️ Your Custom Groups</span>
          <span className="tag">{groups.length}/{limit === 20 ? "20" : limit}</span>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 12 }}>
          {groupLimitFor(tier) === 20 ? "StatZ" : groupLimitFor(tier) === 5 ? "Premium" : "Free"} tier —
          {" "}{limit} renamable custom group{limit === 1 ? "" : "s"}.
          {!canCustomIcon && " Premium+ can also set custom group icons."}
        </p>

        {groups.length === 0 && <p style={{ fontSize: 12, color: "var(--text-light)" }}>No custom groups yet.</p>}

        {groups.map((g, i) => (
          <div key={g.id} className="card" style={{ background: "var(--surface-2)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <span className="grp-thumb"><IconImg icon={g.icon} alt="" /></span>
              <input value={g.name} onChange={(e) => update(i, { name: e.target.value })} style={{ flex: 1 }} />
              <button className="btn btn-danger btn-small" onClick={() => removeFrom("groups", i)}>✕</button>
            </div>

            <label style={{ fontSize: 11, color: "var(--text-light)", display: "block", marginBottom: 6 }}>Visibility</label>
            <div className="chip-wrap" style={{ marginBottom: 10 }}>
              {VISIBILITIES.map((v) => (
                <button key={v.id} onClick={() => update(i, { visibility: v.id })}
                  className={`vis-btn${g.visibility === v.id ? " sel" : ""}`} title={v.label}>
                  <IconImg icon={v.icon} alt={v.label} /> <span>{v.label}</span>
                </button>
              ))}
            </div>

            <label style={{ fontSize: 11, color: "var(--text-light)", display: "block", marginBottom: 6 }}>
              Icon {canCustomIcon ? "" : "🔒 (Premium+)"}
            </label>
            {canCustomIcon ? (
              <div className="pin-grid">
                {GROUP_ICON_CHOICES.map((ic) => (
                  <div key={ic} className={`pin-cell${g.icon === ic ? " pinned" : ""}`} onClick={() => update(i, { icon: ic })}>
                    <IconImg icon={ic} alt="" />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: "var(--text-light)" }}>Upgrade to Premium to choose a custom group icon.</p>
            )}
          </div>
        ))}

        <button className="btn" style={{ width: "100%", marginTop: 6 }} disabled={atLimit} onClick={create}>
          {atLimit ? `Limit reached (${limit}) — upgrade for more` : "➕ Create custom group"}
        </button>
      </div>
    </>
  );
}

function BodieZPage({ tier, onOpen }) {
  const { state, update, addXP } = useAppState();
  const bodiez = state.bodiez || { location: "Gym", customEquipment: ["Bodyweight"], routines: [], sessions: [] };
  const setBodiez = (patch) => update({ bodiez: { ...bodiez, ...patch } });
  const isStatz = /stat[sz]/i.test(tier || "");
  const isPremium = /premium|pro|stat[sz]/i.test(tier || "");

  const [section, setSection] = useState("today");
  const [muscle, setMuscle] = useState("Chest");
  const [editingId, setEditingId] = useState(null);
  const [live, setLive] = useState(null); // active workout being logged

  const avail = availableEquipment(bodiez);
  const routines = bodiez.routines || [];
  const sessions = bodiez.sessions || [];
  const editing = routines.find((r) => r.id === editingId);

  // ---- Session logging + progress helpers ----
  const startSession = (r) => {
    setLive({
      routineId: r.id, name: r.name, startedAt: Date.now(),
      ex: r.exercises.map((e) => ({
        name: e.name, muscle: e.muscle, target: { sets: e.sets, reps: e.reps, weight: e.weight },
        sets: Array.from({ length: Math.max(1, e.sets) }, () => ({ w: e.weight || 0, r: e.reps || 0, rpe: 8, done: false })),
      })),
    });
    setSection("session");
  };
  const patchSet = (ei, si, patch) => setLive((L) => ({ ...L, ex: L.ex.map((x, i) => i !== ei ? x : { ...x, sets: x.sets.map((s, j) => j === si ? { ...s, ...patch } : s) }) }));
  const addSet = (ei) => setLive((L) => ({ ...L, ex: L.ex.map((x, i) => i !== ei ? x : { ...x, sets: [...x.sets, { ...(x.sets[x.sets.length - 1] || { w: 0, r: 0, rpe: 8 }), done: false }] }) }));
  const finishSession = () => {
    const done = live.ex.map((x) => {
      const s = x.sets.filter((st) => st.done);
      const volume = s.reduce((t, st) => t + st.w * st.r, 0);
      const best = s.reduce((b, st) => (st.w > (b?.w || 0) ? st : b), null);
      return { name: x.name, muscle: x.muscle, target: x.target, sets: s, volume, best, hitTarget: s.length >= x.target.sets && s.every((st) => st.r >= x.target.reps) };
    }).filter((e) => e.sets.length);
    const volume = done.reduce((t, e) => t + e.volume, 0);
    const rec = { id: Date.now(), name: live.name, at: Date.now(), minutes: Math.max(1, Math.round((Date.now() - live.startedAt) / 60000)), volume, entries: done };
    setBodiez({ sessions: [rec, ...sessions].slice(0, 200) });
    addXP(10 + Math.floor(volume / 2000), `BodieZ: ${live.name}`);
    setLive(null);
    setSection("progress");
  };

  const lastEntry = (exName) => { for (const s of sessions) { const e = s.entries.find((x) => x.name === exName); if (e) return e; } return null; };
  const prFor = (exName) => { let best = 0; sessions.forEach((s) => s.entries.forEach((e) => { if (e.name === exName && e.best) best = Math.max(best, e.best.w); })); return best; };
  // Progressive-overload verdict from the last logged session of an exercise.
  const coachVerdict = (e) => {
    if (!e) return null;
    const avgRpe = e.sets.length ? e.sets.reduce((t, s) => t + (s.rpe || 0), 0) / e.sets.length : 0;
    if (e.hitTarget && avgRpe <= 8) return { emoji: "⬆️", text: "Add weight — you cleared every target rep with gas left." };
    if (e.hitTarget) return { emoji: "➡️", text: "Repeat the load — you hit target but it was heavy." };
    if (avgRpe >= 9.5) return { emoji: "⬇️", text: "Reduce load or rest — high fatigue, missed reps." };
    return { emoji: "➡️", text: "Repeat — you were 1–2 reps short of target." };
  };
  // BodyMap freshness by muscle: days since last trained.
  const muscleStatus = (m) => {
    const s = sessions.find((sess) => sess.entries.some((e) => e.muscle === m));
    if (!s) return { label: "untrained", days: null, color: "var(--text-light)" };
    const days = Math.floor((Date.now() - s.at) / 864e5);
    if (days <= 2) return { label: `${days}d — fresh`, days, color: "var(--success)" };
    if (days <= 6) return { label: `${days}d — ready`, days, color: "var(--accent, #22e6ff)" };
    return { label: `${days}d — undertrained`, days, color: "var(--gold, #ffcf3f)" };
  };

  const setRoutines = (list) => setBodiez({ routines: list });
  const [sellMsg, setSellMsg] = useState("");
  // Sell a custom routine on the creator marketplace (real money + dev tax).
  const sellRoutine = async (r) => {
    if (!r.exercises.length) return;
    const p = Number(window.prompt(`List "${r.name}" for sale — price in $?`, "9.99"));
    if (!(p > 0)) return;
    const desc = `BodieZ routine · ${r.exercises.length} exercises — ` + r.exercises.map((e) => `${e.name} ${e.sets}×${e.reps}`).join(", ");
    try {
      await createMerchApi({ title: r.name, description: desc.slice(0, 480), category: "routines", priceCents: Math.round(p * 100) });
      setSellMsg(`✅ Listed "${r.name}" for ${money(p)} in the marketplace (MerchZ · routines).`);
    } catch {
      setSellMsg("Listing needs you signed in with a live connection.");
    }
  };
  const patchRoutine = (id, patch) => setRoutines(routines.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addExercise = (ex) => {
    if (!editing) return;
    if (editing.exercises.some((e) => e.name === ex.name)) return;
    patchRoutine(editing.id, { exercises: [...editing.exercises, { ...ex, sets: 3, reps: 10, weight: 0, rest: 90, superset: false }] });
  };
  const patchEx = (i, patch) => patchRoutine(editing.id, { exercises: editing.exercises.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });

  const shown = EXERCISES.filter((e) => e.muscle === muscle && isAvailable(e, avail));

  const SECTIONS = [
    ["today", "💪 Today"],
    ...(live ? [["session", "⏱️ Session"]] : []),
    ["routines", "🧩 Routines"], ["exercises", "📚 Exercises"], ["progress", "📈 Progress"],
    ["bodymap", "🧍 BodyMap"], ["location", "📍 Location"], ["coach", "🤖 Coach"],
  ];

  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 14 }}>
        {SECTIONS.map(([id, label]) => (
          <button key={id} className={`heritage-chip${section === id ? " sel" : ""}`} onClick={() => setSection(id)}>{label}</button>
        ))}
      </div>

      {section === "today" && <HabitStrip appKey="bodiez" appName="BodieZ" onOpen={onOpen} />}

      {section === "location" && (
        <div className="card">
          <div className="card-header"><span>📍 Training Location</span>{!isPremium && <span className="tag">🔒 Premium</span>}</div>
          <div className="chip-wrap" style={{ marginBottom: 12 }}>
            {Object.keys(LOCATIONS).map((loc) => (
              <button key={loc} className={`heritage-chip${bodiez.location === loc ? " sel" : ""}`}
                disabled={!isPremium && loc !== "Gym"}
                style={!isPremium && loc !== "Gym" ? { opacity: 0.4 } : undefined}
                onClick={() => isPremium || loc === "Gym" ? setBodiez({ location: loc }) : null}>{loc}</button>
            ))}
          </div>
          {!isPremium && <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 10 }}>Premium unlocks Home / Travel / Custom locations — routines adapt to whatever gear you have.</p>}
          <label style={{ fontSize: 11, color: "var(--text-light)", display: "block", marginBottom: 6 }}>Available equipment{bodiez.location === "Custom" ? " (toggle)" : ` at ${bodiez.location}`}</label>
          <div className="chip-wrap">
            {EQUIPMENT.map((eq) => {
              const on = avail.includes(eq);
              const editable = bodiez.location === "Custom" && isPremium;
              return (
                <button key={eq} className={`heritage-chip${on ? " sel" : ""}`}
                  style={editable ? undefined : { cursor: "default" }}
                  onClick={() => {
                    if (!editable) return;
                    const ce = bodiez.customEquipment || [];
                    setBodiez({ customEquipment: ce.includes(eq) ? ce.filter((x) => x !== eq) : [...ce, eq] });
                  }}>{eq}</button>
              );
            })}
          </div>
          <ProfileSaveBar onSave={() => {}} label="Save location & gear" />
        </div>
      )}

      {section === "exercises" && (
        <div className="card">
          <div className="card-header">📚 Exercise Library</div>
          <div className="form-group"><label>Muscle group (Jefit)</label>
            <select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
              {MUSCLE_GROUPS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 10 }}>Showing only exercises you can do at <strong>{bodiez.location}</strong>.</p>
          {shown.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No {muscle} exercises with your current equipment.</p>
            : shown.map((ex) => (
              <div key={ex.name} className="skill-item">
                <span className="skill-item-name">{ex.name}</span>
                <span className="skill-item-exp">{ex.equipment.join(", ")}</span>
              </div>
            ))}
        </div>
      )}

      {section === "routines" && !editing && (
        <div className="card">
          <div className="card-header">🧩 Your Routines</div>
          {routines.length === 0 && <p style={{ fontSize: 12, color: "var(--text-light)" }}>No routines yet.</p>}
          {sellMsg && <p style={{ fontSize: 11, color: "var(--success)", marginBottom: 8 }}>{sellMsg}</p>}
          {routines.map((r) => (
            <div key={r.id} className="skill-item">
              <span className="skill-item-name">{r.name}</span>
              <span className="skill-item-exp">{r.exercises.length} exercises</span>
              <div className="skill-item-actions">
                <button className="btn btn-small" onClick={() => setEditingId(r.id)}>Edit</button>
                <button className="btn btn-small btn-secondary" disabled={!r.exercises.length} onClick={() => sellRoutine(r)}>💰 Sell</button>
                <button className="btn btn-danger btn-small" onClick={() => setRoutines(routines.filter((x) => x.id !== r.id))}>✕</button>
              </div>
            </div>
          ))}
          <button className="btn" style={{ width: "100%", marginTop: 8 }}
            onClick={() => { const id = Date.now(); setRoutines([...routines, { id, name: "New Routine", exercises: [] }]); setEditingId(id); setSection("routines"); }}>
            ➕ Create routine
          </button>
        </div>
      )}

      {section === "routines" && editing && (
        <>
          <div className="card">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn btn-secondary btn-small" onClick={() => setEditingId(null)}>‹ Back</button>
              <input value={editing.name} onChange={(e) => patchRoutine(editing.id, { name: e.target.value })} style={{ flex: 1 }} />
            </div>
          </div>
          <div className="card">
            <div className="card-header">➕ Add exercises ({muscle})</div>
            <div className="form-group"><label>Muscle group</label>
              <select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
                {MUSCLE_GROUPS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            {shown.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>None available at {bodiez.location}.</p>
              : shown.map((ex) => (
                <div key={ex.name} className="skill-item">
                  <span className="skill-item-name">{ex.name}</span>
                  <button className="btn btn-small" disabled={editing.exercises.some((e) => e.name === ex.name)} onClick={() => addExercise(ex)}>Add</button>
                </div>
              ))}
          </div>
          <div className="card">
            <div className="card-header">🏋️ {editing.name} — {editing.exercises.length} exercises</div>
            {editing.exercises.length === 0 && <p style={{ fontSize: 12, color: "var(--text-light)" }}>Add exercises above.</p>}
            {editing.exercises.map((ex, i) => (
              <div key={ex.name} className="card" style={{ background: "var(--surface-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: 13 }}>{ex.name}</strong>
                  <button className="btn btn-danger btn-small" onClick={() => patchRoutine(editing.id, { exercises: editing.exercises.filter((_, idx) => idx !== i) })}>✕</button>
                </div>
                <div className="grid-3">
                  <div className="form-group" style={{ margin: 0 }}><label>Target sets</label><input type="number" value={ex.sets} onChange={(e) => patchEx(i, { sets: +e.target.value })} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label>Target reps</label><input type="number" value={ex.reps} onChange={(e) => patchEx(i, { reps: +e.target.value })} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label>Target weight</label><input type="number" value={ex.weight} onChange={(e) => patchEx(i, { weight: +e.target.value })} /></div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
                  <div className="form-group" style={{ margin: 0, flex: 1 }}><label>Rest (sec)</label><input type="number" value={ex.rest} onChange={(e) => patchEx(i, { rest: +e.target.value })} /></div>
                  <button className={`heritage-chip${ex.superset ? " sel" : ""}`} style={{ alignSelf: "flex-end" }} onClick={() => patchEx(i, { superset: !ex.superset })}>⛓ Superset</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {section === "today" && (
        <>
          <div className="stripe-section">
            <div className="stripe-title">💪 Today</div>
            <div className="balance-info">{sessions.length} session{sessions.length === 1 ? "" : "s"} logged · 🔥 streak {state.progression?.streak || 0} · last volume {sessions[0] ? sessions[0].volume.toLocaleString() : 0}</div>
          </div>
          <div className="card">
            <div className="card-header">▶️ Start a workout</div>
            {routines.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No routines yet — build one in 🧩 Routines.</p>
              : routines.map((r) => (
                <div key={r.id} className="skill-item">
                  <span className="skill-item-name">{r.name} <span className="tag">{r.exercises.length} ex</span></span>
                  <button className="btn btn-small" disabled={!r.exercises.length} onClick={() => startSession(r)}>▶ Start</button>
                </div>
              ))}
          </div>
          {sessions[0] && (
            <div className="card">
              <div className="card-header">🧾 Last session</div>
              <div className="post-user">{sessions[0].name} · {new Date(sessions[0].at).toLocaleDateString()}</div>
              <div className="post-meta">{sessions[0].minutes} min · volume {sessions[0].volume.toLocaleString()} · {sessions[0].entries.length} exercises</div>
            </div>
          )}
        </>
      )}

      {section === "session" && (
        live ? (
          <>
            <div className="card">
              <div className="card-header"><span>⏱️ {live.name}</span><button className="btn btn-small btn-secondary" onClick={() => setLive(null)}>Cancel</button></div>
              <p style={{ fontSize: 11, color: "var(--text-light)" }}>Log each set — tap ✓ when it's done. Target shown per exercise.</p>
            </div>
            {live.ex.map((x, ei) => {
              const prev = lastEntry(x.name);
              return (
                <div key={x.name} className="card">
                  <div className="card-header"><span>🏋️ {x.name}</span><span className="tag">🎯 {x.target.sets}×{x.target.reps} @ {x.target.weight}</span></div>
                  {prev && <p style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 6 }}>Last time: {prev.best ? `${prev.best.w}×${prev.best.r}` : "—"} · PR {prFor(x.name)}</p>}
                  {x.sets.map((s, si) => (
                    <div key={si} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--text-light)", width: 18 }}>{si + 1}</span>
                      <input type="number" value={s.w} onChange={(e) => patchSet(ei, si, { w: +e.target.value })} placeholder="wt" style={{ width: 64 }} />
                      <span style={{ fontSize: 11 }}>×</span>
                      <input type="number" value={s.r} onChange={(e) => patchSet(ei, si, { r: +e.target.value })} placeholder="reps" style={{ width: 56 }} />
                      <input type="number" value={s.rpe} onChange={(e) => patchSet(ei, si, { rpe: +e.target.value })} title="RPE" style={{ width: 48 }} />
                      <button className={`btn btn-small${s.done ? " btn-success" : " btn-secondary"}`} onClick={() => patchSet(ei, si, { done: !s.done })}>{s.done ? "✓" : "○"}</button>
                    </div>
                  ))}
                  <button className="btn btn-small btn-secondary" onClick={() => addSet(ei)}>+ set</button>
                </div>
              );
            })}
            <button className="btn btn-success" style={{ width: "100%" }} onClick={finishSession}>🏁 Finish &amp; save</button>
          </>
        ) : (
          <div className="card"><p style={{ fontSize: 12, color: "var(--text-light)" }}>No active workout. Start one from 💪 Today.</p></div>
        )
      )}

      {section === "progress" && (
        <>
          <div className="stripe-section">
            <div className="stripe-title">📈 Progress</div>
            <div className="balance-info">{sessions.length} sessions · total volume {sessions.reduce((t, s) => t + s.volume, 0).toLocaleString()} · 🔥 {state.progression?.streak || 0} day streak</div>
          </div>
          <div className="card">
            <div className="card-header">🏅 Personal records</div>
            {sessions.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>Log a session to build PRs.</p>
              : [...new Set(sessions.flatMap((s) => s.entries.map((e) => e.name)))].slice(0, 20).map((n) => (
                <div key={n} className="settings-toggle"><label>{n}</label><span className="tag">PR {prFor(n)}</span></div>
              ))}
          </div>
          <div className="card">
            <div className="card-header">🧾 Recent sessions</div>
            {sessions.slice(0, 10).map((s) => (
              <div key={s.id} className="post-card">
                <div className="post-user">{s.name} <span className="tag">{s.minutes}m</span></div>
                <div className="post-meta">{new Date(s.at).toLocaleString()} · volume {s.volume.toLocaleString()} · {s.entries.length} exercises</div>
              </div>
            ))}
          </div>
        </>
      )}

      {section === "bodymap" && (
        <div className="card">
          <div className="card-header">🧍 BodyMap</div>
          <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Days since each muscle was last trained — green fresh, blue ready, gold undertrained.</p>
          {MUSCLE_GROUPS.map((m) => { const st = muscleStatus(m); return (
            <div key={m} className="settings-toggle"><label>{m}</label><span className="tag" style={{ color: st.color }}>{st.label}</span></div>
          ); })}
        </div>
      )}

      {section === "coach" && (
        <div className="card">
          <div className="card-header"><span>🤖 AI Coach</span>{!isStatz && <span className="tag">🔒 StatZ</span>}</div>
          {isStatz && sessions.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {[...new Set(sessions.flatMap((s) => s.entries.map((e) => e.name)))].slice(0, 12).map((n) => {
                const v = coachVerdict(lastEntry(n)); if (!v) return null;
                return <div key={n} className="skill-item"><span className="skill-item-name">{v.emoji} {n}</span><span className="skill-item-exp">{v.text}</span></div>;
              })}
            </div>
          )}
          {isStatz ? (
            <p style={{ fontSize: 12, color: "var(--text-light)" }}>
              StatZ personal trainer: progressive-overload suggestions, routine generation, and access to other users' routines.
              Coach reads your logged sessions to recommend when to add weight, repeat, deload, or rest.
            </p>
          ) : (
            <p style={{ fontSize: 12, color: "var(--text-light)" }}>🔒 The AI Coach — personal-trainer routine creator, progression logic, and shared user routines — is a <strong>StatZ</strong> feature.</p>
          )}
        </div>
      )}
    </>
  );
}

function ZodiacZPage() {
  const { state } = useAppState();
  const sign = zodiacFor(state.user.birthday);
  const reading = dailyReading(sign);
  const [openSign, setOpenSign] = useState(sign?.name || null);
  const [matchSign, setMatchSign] = useState(null);
  const compat = sign && matchSign ? signCompatibility(sign, matchSign) : null;
  return (
    <>
      <div className="card">
        <div className="card-header">♌ Your Sign</div>
        {sign ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 40 }}>{sign.emoji}</span>
              <div><div style={{ fontWeight: 800, fontSize: 18 }}>{sign.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-light)" }}>Auto-detected from your birthday</div></div>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-light)", lineHeight: 1.5 }}>{sign.desc}</p>
          </>
        ) : (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>Set your birthday in <strong>Setup</strong> to auto-detect your sign.</p>
        )}
      </div>
      {reading && (
        <div className="stripe-section">
          <div className="stripe-title">🔮 Today's Reading {sign.emoji}</div>
          <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>{reading.date} · your daily cosmic guide, straight from K-Oth</div>
          <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>{reading.vibe}</p>
          <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}><strong>🎯 Today:</strong> {reading.focus}</p>
          <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}><strong>⚠️ Watch:</strong> {reading.caution}</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="tag">🔢 Lucky number {reading.luckyNumber}</span>
            <span className="tag">🎨 Lucky color {reading.luckyColor}</span>
          </div>
        </div>
      )}
      {sign && (
        <div className="card">
          <div className="card-header">💞 Compatibility <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-light)" }}>· your {sign.emoji} vs…</span></div>
          <div className="chip-wrap">
            {SIGNS.map((s) => (
              <button key={s.name} className={`heritage-chip${matchSign === s.name ? " sel" : ""}`} onClick={() => setMatchSign(matchSign === s.name ? null : s.name)}>{s.emoji} {s.name}</button>
            ))}
          </div>
          {compat && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 24 }}>{compat.a.emoji}💞{compat.b.emoji}</span>
                <div style={{ flex: 1 }}>
                  <StarRow value={compat.score} size={16} />
                  <div style={{ fontSize: 12, fontWeight: 800, color: compat.score >= 8 ? "var(--success)" : compat.score >= 6 ? "var(--gold, #ffcf3f)" : "var(--text-light)" }}>{compat.score}/10 · {compat.a.name} + {compat.b.name}</div>
                </div>
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>{compat.note}</p>
            </div>
          )}
        </div>
      )}
      <div className="card">
        <div className="card-header">✨ All 12 Signs <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-light)" }}>· tap a sign for its daily reading</span></div>
        {SIGNS.map((s) => {
          const open = openSign === s.name;
          const r = open ? dailyReading(s) : null;
          return (
            <div key={s.name} className="modal-sub-row" style={{ flexDirection: "column", alignItems: "stretch", cursor: "pointer", ...(sign?.name === s.name ? { borderColor: "var(--primary)", boxShadow: "var(--glow)" } : {}) }} onClick={() => setOpenSign(open ? null : s.name)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 26, width: 40, textAlign: "center" }}>{s.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div className="s-name">{s.name} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-light)" }}>· {s.range}</span></div>
                  <div className="s-desc">{s.desc}</div>
                </div>
                <span style={{ opacity: 0.6, fontSize: 12 }}>{open ? "▾" : "🔮"}</span>
              </div>
              {r && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 6 }}>🔮 {r.date} · daily reading, K-Oth voice</div>
                  <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: "0 0 6px" }}>{r.vibe}</p>
                  <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: "0 0 6px" }}><strong>🎯 Today:</strong> {r.focus}</p>
                  <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: "0 0 8px" }}><strong>⚠️ Watch:</strong> {r.caution}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="tag">🔢 {r.luckyNumber}</span>
                    <span className="tag">🎨 {r.luckyColor}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// RepostExchange-style anonymous 1–10 rating (👎 → 🔥).
function RatingScale({ myRating, onRate, onSkip }) {
  return (
    <div className="rate-wrap">
      <div className="rate-title">Rate this track</div>
      <div className="rate-sub">Ratings are anonymous and help curate the charts.</div>
      <div className="rate-row">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} className={`rate-btn${myRating === n ? " picked" : ""}`} onClick={() => onRate(n)}>{n}</button>
        ))}
      </div>
      <div className="rate-legend"><span>👎</span><span>🔥</span></div>
      {myRating == null && <button className="rate-skip" onClick={onSkip}>Skip</button>}
    </div>
  );
}

const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const BATTLE_MODES = [
  { id: "1v1", label: "1️⃣ 1v1" },
  { id: "freestyle", label: "🆓 Freestyle" },
  { id: "cypher", label: "🧑‍🤝‍🧑 Cypher" },
];
const HOUR = 3600e3;
const BATTLE_WINDOW = 24 * HOUR; // battles close 24h after the post
// postedAt seeded relative to load: 1v1 open (~22h left), freestyle already
// closed (shows a decided winner), cypher open. `seed` are community votes —
// participants' own votes never count.
const DEMO_BATTLES = {
  "1v1": { postedAt: Date.now() - 2 * HOUR, viewerIsParticipant: false, a: { name: "Kaya", track: "Midnight Bloom", seed: [8, 9, 7] }, b: { name: "Diego", track: "Calle Fuego", seed: [7, 6, 8] } },
  freestyle: { postedAt: Date.now() - 25 * HOUR, viewerIsParticipant: false, a: { name: "Luka", track: "Off the Dome #14", seed: [6, 7, 6] }, b: { name: "Mei", track: "No Pen Freestyle", seed: [9, 8, 9] } },
  cypher: { postedAt: Date.now() - 12 * HOUR, viewerIsParticipant: true, a: { name: "Team North", track: "Cypher Round 1", seed: [7, 8, 7] }, b: { name: "Team South", track: "Cypher Round 2", seed: [8, 6, 7] } },
};
const fmtLeft = (ms) => {
  if (ms <= 0) return "closed";
  const h = Math.floor(ms / HOUR); const m = Math.floor((ms % HOUR) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
// Seed 🍥 SpinAZ crowd pools per side so betting feels alive before anyone bets.
const BATTLE_SEED_POOLS = {
  "1v1": { a: 320, b: 260 },
  freestyle: { a: 180, b: 540 },
  cypher: { a: 300, b: 300 },
};

// Drop your own battle entry — record/upload, then it posts to the feed as a
// PostZ others can rate out of 10, comment on, and share.
function BattleEntryRecorder({ mode, onOpen }) {
  const [media, setMedia] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const post = async () => {
    if (!media?.url) return;
    setBusy(true); setMsg("");
    try {
      await createPostzApi({ title: (name || `BattleZ ${mode} entry`).slice(0, 160), description: `🪖 BattleZ ${mode} entry`, media_url: media.url, media_type: media.type, visibility: "public" });
      setMsg("✅ Entry posted to the feed — others can rate it 1–10, comment & share.");
      setMedia(null); setName("");
    } catch (e) { setMsg(/limit|429/i.test(e?.message || "") ? "Daily submission limit reached — upgrade for more submits." : (e?.message || "Couldn't post your entry.")); }
    setBusy(false);
  };
  return (
    <div className="card">
      <div className="card-header">🎤 Drop your entry</div>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 6 }}>Record or upload your round — it posts to the feed where the community rates it out of 10.</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name your entry" style={{ width: "100%", marginBottom: 6 }} maxLength={160} />
      <MediaCapture onUploaded={setMedia} />
      {media?.url && <button className="btn btn-small btn-success" style={{ width: "100%", marginTop: 6 }} onClick={post} disabled={busy}>{busy ? "Posting…" : "📤 Post my entry"}</button>}
      {msg && <p style={{ fontSize: 11, color: /✅/.test(msg) ? "var(--success)" : "var(--danger)", marginTop: 6 }}>{msg}{/✅/.test(msg) && onOpen && <> <button className="btn-link" style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0, textDecoration: "underline", font: "inherit" }} onClick={() => onOpen("postz")}>View feed</button></>}</p>}
    </div>
  );
}

function BattleZPage({ tier, onOpen, serverOk }) {
  const { state, update, updateUser, updateWallet, addTo, addXP } = useAppState();
  const idStatus = useIdentity(serverOk);
  const [mode, setMode] = useState("1v1");
  const vgate = useWatchGate(mode); // watch 30s before voting on a battle
  // ratings + my pick per contestant, seeded from demo; reset when mode changes.
  const [ratings, setRatings] = useState({});
  const battle = DEMO_BATTLES[mode];
  const key = (side) => `${mode}:${side}`;
  const listFor = (side) => ratings[key(side)] ?? battle[side].seed;
  const mineFor = (side) => ratings[`${key(side)}:mine`] ?? null;

  const rate = (side, n) => { setRatings((r) => ({ ...r, [key(side)]: [...(r[key(side)] ?? battle[side].seed), n], [`${key(side)}:mine`]: n })); addXP(2, "BattleZ vote"); };
  const skip = (side) => setRatings((r) => ({ ...r, [`${key(side)}:mine`]: 0 }));

  const left = battle.postedAt + BATTLE_WINDOW - Date.now();
  const closed = left <= 0;
  const isParticipant = battle.viewerIsParticipant;

  const stat = (side) => {
    const list = listFor(side); // community votes only — participants never count
    return { med: median(list), count: list.length, qualified: list.length >= 3 };
  };
  const A = stat("a"), B = stat("b");
  // Winner requires the 24h window closed AND both sides with 3+ votes.
  const bothQualified = A.qualified && B.qualified;
  const decided = closed && bothQualified;
  const winner = !decided ? null : A.med === B.med ? "tie" : A.med > B.med ? "a" : "b";

  // ---- Betting layer ----
  // Contestants (18+ verified) stake real money on themselves; spectators bet
  // 🍥 SpinAZ on a side. Pools = seed crowd + this member's stakes.
  // Server-verified 18+ (Stripe Identity) gates real-money stakes — no honor system.
  const verified18 = !!idStatus?.verified_18plus;
  const bets = (state.battleBets || {})[mode] || {};
  const seed = BATTLE_SEED_POOLS[mode] || { a: 0, b: 0 };
  const spinazPool = (side) => (seed[side] || 0) + (bets[side] || 0);
  const mySide = bets.mySpinazSide || null;
  const myMoney = bets.myMoney || 0;
  const spinaz = state.spinaz || 0;
  const setBets = (patch) => update({ battleBets: { ...(state.battleBets || {}), [mode]: { ...bets, ...patch } } });

  const [betAmt, setBetAmt] = useState(50);
  const [stakeAmt, setStakeAmt] = useState(5);

  const placeSpinaz = (side) => {
    const amt = Math.max(1, Math.floor(Number(betAmt) || 0));
    if (closed || amt > spinaz || (mySide && mySide !== side)) return;
    update({ spinaz: spinaz - amt });
    addTo("spinazLog", { id: Date.now(), delta: -amt, note: `BattleZ bet on ${battle[side].name}`, at: Date.now() });
    setBets({ [side]: (bets[side] || 0) + amt, mySpinazSide: side });
  };
  const stakeMoney = () => {
    // Contestant stakes money on their own side (side "a" for the participant).
    const amt = Math.round((Number(stakeAmt) || 0) * 100) / 100;
    if (!isParticipant || !verified18 || closed || amt <= 0 || amt > Number(state.wallet.balance || 0)) return;
    updateWallet({ balance: Number(state.wallet.balance || 0) - amt });
    addTo("paymentHistory", { id: Date.now(), type: "battle-stake", amount: -amt, note: `Staked on yourself vs ${battle.b.name}`, at: Date.now() });
    setBets({ myMoney: myMoney + amt, myMoneySide: "a" });
  };

  // Settlement — pays out once the battle is decided (winner is not a tie).
  const settle = () => {
    if (!decided || bets.collected) return;
    let spinazWin = 0; let moneyWin = 0;
    if (mySide && winner !== "tie" && mySide === winner) {
      const loser = winner === "a" ? "b" : "a";
      const winPool = spinazPool(winner) || 1;
      // Return your stake + your proportional share of the losing pool.
      spinazWin = Math.round((bets[winner] || 0) + (bets[winner] || 0) / winPool * spinazPool(loser));
    } else if (mySide && winner === "tie") {
      spinazWin = bets[mySide] || 0; // refund on a tie
    }
    if (myMoney > 0 && (winner === "a" || winner === "tie")) {
      // Head-to-head wager: win doubles your stake minus the developer tax; tie refunds.
      const gross = winner === "tie" ? myMoney : myMoney * 2;
      const { net } = splitTransaction(gross, tier);
      moneyWin = net;
    }
    if (spinazWin) { update({ spinaz: spinaz + spinazWin }); addTo("spinazLog", { id: Date.now(), delta: spinazWin, note: "BattleZ winnings", at: Date.now() }); }
    if (moneyWin) { updateWallet({ balance: Number(state.wallet.balance || 0) + moneyWin }); addTo("paymentHistory", { id: Date.now() + 1, type: "battle-win", amount: moneyWin, note: "BattleZ payout", at: Date.now() }); }
    setBets({ collected: true, payout: { spinaz: spinazWin, money: moneyWin } });
  };

  const Contestant = ({ side }) => {
    const c = battle[side]; const s = stat(side); const mine = mineFor(side);
    const win = winner === side;
    return (
      <div className="card" style={win ? { borderColor: "var(--primary)", boxShadow: "var(--glow)" } : undefined}>
        <div className="card-header">
          <span>{win ? "🏆 " : ""}{c.name}</span>
          <span className="tag">{s.qualified ? `${s.med.toFixed(1)}/10` : `${s.count}/3 votes`}</span>
        </div>
        {/* Median as fractional stars, with the score + vote total as clear integers on the side. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <StarRow value={s.med || 0} size={16} />
          <strong style={{ fontSize: 15, color: win ? "var(--primary)" : "inherit" }}>{s.count ? s.med.toFixed(1) : "—"}<span style={{ fontSize: 11, color: "var(--text-light)" }}>/10</span></strong>
          <span className="tag" title="Total votes">🗳️ {s.count} vote{s.count === 1 ? "" : "s"}</span>
        </div>
        <div className="post-meta" style={{ marginBottom: 10 }}>🎵 {c.track}</div>
        {closed ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>🔒 Voting closed{s.qualified ? "" : " · didn't reach 3 votes"}.</p>
        ) : isParticipant ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>🚫 You're a participant in this battle — contestants can't vote on their own battle.</p>
        ) : mine == null && !vgate.canRate ? (
          <p style={{ fontSize: 12, color: "var(--gold, #ffcf3f)" }}>⏳ Watch the round — voting unlocks in <strong>{Math.max(0, vgate.rateS - vgate.sec)}s</strong>.</p>
        ) : mine == null ? (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 4 }}>Rate this contestant:</div>
            <StarRow value={0} size={22} showEnds onRate={(n) => rate(side, n)} />
            <button className="btn-link" style={{ background: "none", border: "none", color: "var(--text-light)", cursor: "pointer", padding: 0, fontSize: 11, marginTop: 6, display: "block" }} onClick={() => skip(side)}>Skip</button>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>
            {mine ? <>You rated <strong style={{ color: "var(--primary)" }}>{mine}/10</strong>. </> : "You skipped. "}
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 14 }}>
        {BATTLE_MODES.map((m) => (
          <button key={m.id} className={`heritage-chip${mode === m.id ? " sel" : ""}`} onClick={() => setMode(m.id)}>{m.label}</button>
        ))}
      </div>
      {serverOk && <BattleEntryRecorder mode={mode} onOpen={onOpen} />}
      <div className="card" style={{ textAlign: "center" }}>
        <div className="card-header" style={{ justifyContent: "center", borderBottom: "none" }}>🪖 {battle.a.name} vs {battle.b.name}</div>
        {decided ? (
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
            {winner === "tie" ? "🤝 It's a tie!" : `🏆 ${battle[winner].name} wins ${stat(winner).med.toFixed(1)}–${stat(winner === "a" ? "b" : "a").med.toFixed(1)}`}
          </p>
        ) : closed ? (
          <p style={{ fontSize: 12, color: "var(--accent)" }}>Voting closed — no winner: both sides need 3+ votes to qualify.</p>
        ) : (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>⏳ Voting closes in <strong>{fmtLeft(left)}</strong> · winner is the higher community median once 3+ votes are in on each side.</p>
        )}
        <SocialBar id={`battle:${mode}`} shareText={`${battle.a.name} vs ${battle.b.name} — BattleZ on Music ConnectZ`} style={{ display: "flex", justifyContent: "center" }} />
      </div>
      <Contestant side="a" />
      <Contestant side="b" />

      {/* ---- Betting ---- */}
      <div className="card">
        <div className="card-header"><span>🎰 The Pool</span><span className="tag">🍥 {spinazPool("a") + spinazPool("b")} staked</span></div>
        <div className="grid-2" style={{ marginBottom: 8 }}>
          {["a", "b"].map((side) => {
            const pool = spinazPool(side); const total = spinazPool("a") + spinazPool("b") || 1;
            return (
              <div key={side} className="post-card" style={mySide === side ? { borderColor: "var(--primary)" } : undefined}>
                <div className="post-user">{battle[side].name}</div>
                <div className="post-meta">🍥 {pool} · {Math.round((pool / total) * 100)}% of pool{mySide === side ? ` · you: 🍥 ${bets[side] || 0}` : ""}</div>
              </div>
            );
          })}
        </div>

        {!closed && !isParticipant && (
          <>
            <div className="form-group"><label>🍥 Bet SpinAZ (you have {spinaz})</label>
              <input type="number" min="1" value={betAmt} onChange={(e) => setBetAmt(e.target.value)} />
            </div>
            <div className="grid-2">
              {["a", "b"].map((side) => (
                <button key={side} className="btn btn-small" disabled={Number(betAmt) > spinaz || Number(betAmt) < 1 || (mySide && mySide !== side)} onClick={() => placeSpinaz(side)}>
                  Bet on {battle[side].name}
                </button>
              ))}
            </div>
            {mySide && <p style={{ fontSize: 11, color: "var(--accent, #22e6ff)", marginTop: 6 }}>You're riding with <strong>{battle[mySide].name}</strong> (🍥 {bets[mySide]}). Win the pool if they take it.</p>}
            {Number(betAmt) > spinaz && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 6 }}>Not enough SpinAZ — earn or buy more.</p>}
          </>
        )}

        {!closed && isParticipant && (
          <>
            <div className="modal-sub-title" style={{ margin: "8px 0 6px" }}>💰 Stake money on yourself</div>
            {!verified18 ? (
              <>
                <p style={{ fontSize: 12, color: "var(--gold, #ffcf3f)" }}>🔞 Money stakes are for <strong>verified 18+</strong> contestants only.</p>
                <Verify18 serverOk={serverOk} />
              </>
            ) : (
              <>
                <div className="form-group"><label>Stake ($) — balance {money(Number(state.wallet.balance || 0))}</label>
                  <input type="number" min="1" step="0.01" value={stakeAmt} onChange={(e) => setStakeAmt(e.target.value)} />
                </div>
                {Number(stakeAmt) > 0 && (() => { const s = splitTransaction(Number(stakeAmt) * 2, tier); return (
                  <p style={{ fontSize: 11, color: "var(--text-light)" }}>Win → <Amount value={s.net} flow="in" sign bold /> back (2× stake − {s.label} dev tax {Math.round(s.rate * 100)}%). Lose → <span style={{ color: FLOW_RED }}>forfeit</span> to the pool.</p>
                ); })()}
                <button className="btn btn-small" disabled={Number(stakeAmt) <= 0 || Number(stakeAmt) > Number(state.wallet.balance || 0)} onClick={stakeMoney}>💸 Stake {money(Number(stakeAmt) || 0)} on yourself</button>
                {myMoney > 0 && <p style={{ fontSize: 11, marginTop: 6 }}>Staked <Amount value={myMoney} flow="out" sign bold /> on yourself.</p>}
              </>
            )}
            <div className="modal-sub-title" style={{ margin: "12px 0 6px" }}>🤝 Agreed contributor pay</div>
            <p style={{ fontSize: 11, color: "var(--text-light)" }}>Bringing other personas into this battle (a cypher, a hook, production)? Agree what each is paid — <strong>per work</strong> or <strong>per hour</strong>.</p>
            <RatePricer value={bets.helperPay || { rate: "", unit: "work", hours: "" }} skillRates={mySkillRates(state)} onChange={(v) => setBets({ helperPay: v })} />
            {rateTotal(bets.helperPay || {}) > 0 && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)" }}>Agreed: {rateBasisNote(bets.helperPay)} per contributor.</p>}
          </>
        )}

        {decided && (mySide || myMoney > 0) && (
          bets.collected ? (
            <p style={{ fontSize: 12, color: "var(--success)", marginTop: 8 }}>✅ Settled — {bets.payout?.spinaz ? `🍥 ${bets.payout.spinaz} ` : ""}{bets.payout?.money ? `+ ${money(bets.payout.money)} ` : ""}{(!bets.payout?.spinaz && !bets.payout?.money) ? "no winnings this time" : "paid out"}.</p>
          ) : (
            <button className="btn btn-success" style={{ width: "100%", marginTop: 8 }} onClick={settle}>🏁 Settle &amp; collect winnings</button>
          )
        )}
      </div>

      <div className="card">
        <p style={{ fontSize: 11, color: "var(--text-light)" }}>
          🏁 A battle is won by the higher score (community median) once voting closes <strong>24h after posting</strong>, needing at least <strong>3 votes</strong> per side. Participants can't vote on their own battle.
          <br />💰 Verified 18+ contestants stake money on themselves; everyone else bets 🍥 SpinAZ on a side. Winners split the losing pool; the developer tax applies to money payouts. Cross-user escrow settles server-side next.
        </p>
      </div>
    </>
  );
}

function LedgerPage({ emoji, title, balance, log, note, unit = "" }) {
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">{emoji} {title}</div>
        <div className="balance-info">Balance: <strong>{balance}</strong>{note ? <> · {note}</> : null}</div>
      </div>
      <div className="card">
        <div className="card-header">🧾 Log</div>
        {(!log || log.length === 0) ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No activity yet.</p>
        ) : [...log].reverse().map((e, i) => (
          <div key={i} className="skill-item">
            <span className="skill-item-name"><Delta value={e.amount} unit={unit} /> <span style={{ color: "var(--text)" }}>· {e.note}</span></span>
            <span className="skill-item-exp">{new Date(e.at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </>
  );
}
function SpinaZPage() {
  const { state } = useAppState();
  return (
    <>
      <LedgerPage emoji="🍥" title="SpinAZ" balance={state.spinaz || 0} log={state.spinazLog} unit="🍥" note={`In-app currency · $1 = ${SPINAZ_PER_DOLLAR} SpinAZ.`} />
      <div className="card">
        <div className="card-header">💰 How you earn SpinAZ</div>
        {SPINAZ_EARNINGS.map((e) => (
          <div key={e.how} className="skill-item">
            <span className="skill-item-name" style={{ fontSize: 12 }}>{e.emoji} {e.how}</span>
            <span className="skill-item-exp" style={{ fontSize: 11 }}>{e.detail}</span>
          </div>
        ))}
      </div>
    </>
  );
}
function EnergyPage() {
  const { state } = useAppState();
  return <LedgerPage emoji="⚡" title="Energy" balance={state.energy || 0} log={state.energyLog} unit="⚡" note="Earn from ratings, comments, and daily activity." />;
}

const RATE_TYPES = [
  { id: "image", label: "🖼 Image", item: "Cover: Neon Skyline", criteria: ["Artistic value", "Attractiveness"] },
  { id: "text", label: "📝 Text", item: "Verse: 16 bars", criteria: ["Wit"] },
  { id: "audio", label: "🎧 Audio", item: "Track: Midnight Bloom", criteria: ["Mix quality", "Performance"] },
  { id: "video", label: "📹 Video", item: "Video: Calle Fuego", criteria: ["Performance", "Artist quality"] },
];
// Genuine-engagement gate: you can rate (like/dislike or score) only after 30s
// on the item, and comment only after 60s. Resets whenever `resetKey` changes.
function useWatchGate(resetKey, rateS = 30, commentS = 60) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    setSec(0);
    const id = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [resetKey]);
  return { sec, canRate: sec >= rateS, canComment: sec >= commentS, rateS, commentS };
}

// Rate real member media — pulls PostZ that carry audio/video, plays each, and
// rates it 1–10 via the shared SocialBar. You can also drop your own media in to
// be rated (it posts to the feed). This is the "media upload or post to rate" ask.
// Corey AI-rates a media post: real /10 for audio (analyzeAudioBuffer) + Corey
// feedback via OCC (costs a prompt). Video/image get Corey feedback from context.
function AIRateButton({ post }) {
  const { state } = useAppState();
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null); // { score, text, cost }
  const [err, setErr] = useState("");
  const mediaUrl = post.media_url || (post.items || [])[0]?.url || "";
  const mediaType = post.media_type || (post.items || [])[0]?.type || "";

  const run = async () => {
    setBusy(true); setErr(""); setOut(null);
    let score = null, meterLine = "";
    try {
      if (mediaType !== "video" && mediaUrl) {
        // Real audio analysis for a /10 score.
        const blob = await fetch(mediaUrl).then((r) => r.blob());
        const buf = await decodeBlob(blob);
        const r = analyzeAudioBuffer(buf, "voice");
        if (r?.ok) { score = Number(toTen(r.scores.overall)); meterLine = (r.profile?.metrics || []).filter((id) => id in r.scores).map((id) => `${id} ${toTen(r.scores[id])}/10`).join(", "); }
      }
    } catch { /* analysis best-effort */ }
    const prompt = `Rate this ${mediaType || "media"} post "${post.title}"${post.description ? ` (${post.description})` : ""} out of 10 and coach the creator. ${score != null ? `Audio analysis: overall ${score}/10, ${meterLine}.` : "Judge from the title/description."} Give a score out of 10 and the top 2 things to improve. Keep it tight, Corey voice.`;
    try {
      const r = await occChatApi({ model: "corey-gpt", prompt, knowledge: [], history: [], slang: true, acronyms: [], suggest: !!state.occ?.settings?.suggestions });
      setOut({ score, text: r.text, cost: r.cost_cents });
    } catch (e) {
      const msg = e?.message || "";
      if (/402/.test(msg)) setErr("You're short on balance — add funds in Money (Corey GPT is the cheapest voice).");
      else { setOut({ score, text: localCoreyFeedback({ ok: score != null, scores: {}, metrics: {}, profile: {} }, post.title), cost: 0 }); } // offline fallback, no charge
    }
    setBusy(false);
  };

  return (
    <div style={{ marginTop: 6 }}>
      <button className="btn btn-small btn-secondary" onClick={run} disabled={busy}>{busy ? "🎤 Corey's listening…" : "🎤 AI rate (Corey · costs a prompt)"}</button>
      {err && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 4 }}>{err}</p>}
      {out && (
        <div style={{ marginTop: 6, padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.05)" }}>
          {out.score != null && <div style={{ fontSize: 12, color: "var(--gold, #ffcf3f)", fontWeight: 700 }}>🎯 Corey's score: {out.score}/10</div>}
          <p style={{ fontSize: 12, whiteSpace: "pre-wrap", margin: "4px 0 0" }}>{out.text}</p>
          {out.cost > 0 && <div style={{ fontSize: 10, color: "var(--text-light)", marginTop: 4 }}>Charged {centsLabel(out.cost)} for the prompt.</div>}
        </div>
      )}
    </div>
  );
}

function RateRealMedia({ serverOk, onOpen }) {
  const { state } = useAppState();
  const { openPost } = usePostModal();
  const [posts, setPosts] = useState(null);
  const [filter, setFilter] = useState("all"); // all | audio | video
  const [media, setMedia] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [source, setSource] = useState("new"); // new upload | existing post
  const [mineList, setMineList] = useState([]);

  const hasMedia = (p) => p.media_url || (p.is_album && (p.items || []).length);
  const load = () => { if (serverOk) getPostzApi("new").then((r) => { const all = (r.posts || []).filter(hasMedia); setPosts(all); setMineList(all.filter((p) => p.mine)); }).catch(() => setPosts(null)); };
  useEffect(load, [serverOk]);

  const post = async () => {
    if (!media?.url) return;
    setBusy(true); setMsg("");
    try {
      await createPostzApi({ title: (name || "Rate my media").slice(0, 160), description: "🤔 Up for rating on RateZ", media_url: media.url, media_type: media.type, visibility: "public" });
      setMsg("✅ Posted for rating — others can score it 1–10."); setMedia(null); setName(""); load();
    } catch (e) { setMsg(/limit|429/i.test(e?.message || "") ? "Daily submission limit reached — upgrade for more submits." : (e?.message || "Couldn't post.")); }
    setBusy(false);
  };
  // Reuse an existing submission: re-post one of your media posts up for rating.
  const putUp = async (p) => {
    setBusy(true); setMsg("");
    try {
      await createPostzApi({ title: `${p.title} (rate me)`.slice(0, 160), description: "🤔 Up for rating on RateZ", media_url: p.media_url, media_type: p.media_type, visibility: "public" });
      setMsg("✅ Your submission is up for rating."); load();
    } catch (e) { setMsg(/limit|429/i.test(e?.message || "") ? "Daily submission limit reached — upgrade for more submits." : (e?.message || "Couldn't post.")); }
    setBusy(false);
  };

  if (!serverOk) return null;
  const shown = (posts || []).filter((p) => filter === "all" ? true : filter === "video" ? p.media_type === "video" || (p.items || []).some((i) => i.type === "video") : p.media_type !== "video" && !(p.items || []).some((i) => i.type === "video"));
  return (
    <div className="card">
      <div className="card-header"><span>🤔 Rate real media</span><span className="tag" style={{ color: "var(--success)" }}>● live</span></div>
      <div className="chip-wrap" style={{ marginBottom: 8 }}>
        {[["new", "🎤 New upload"], ["existing", "📁 Use one of my posts"]].map(([id, l]) => (
          <button key={id} className={`heritage-chip${source === id ? " sel" : ""}`} onClick={() => setSource(id)}>{l}</button>
        ))}
      </div>
      {source === "new" ? (
        <div className="form-group"><label>🎤 Drop your media to be rated</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name it (optional)" style={{ width: "100%", marginBottom: 6 }} maxLength={160} />
          <MediaCapture onUploaded={setMedia} />
          {media?.url && <button className="btn btn-small btn-success" style={{ width: "100%", marginTop: 6 }} onClick={post} disabled={busy}>{busy ? "Posting…" : "📤 Post for rating"}</button>}
        </div>
      ) : (
        <div className="form-group"><label>📁 Put one of your submissions up</label>
          {mineList.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>You have no media posts yet — upload one.</p>
            : mineList.map((p) => (
              <div key={p.id} className="skill-item">
                <span className="skill-item-name">{(p.media_type === "video") ? "📹" : "🎧"} {p.title}</span>
                <button className="btn btn-small" onClick={() => putUp(p)} disabled={busy}>Rate this</button>
              </div>
            ))}
        </div>
      )}
      {msg && <p style={{ fontSize: 11, color: /✅/.test(msg) ? "var(--success)" : "var(--danger)", marginBottom: 6 }}>{msg}</p>}
      <div className="chip-wrap" style={{ marginBottom: 8 }}>
        {[["all", "All"], ["audio", "🎧 Audio"], ["video", "📹 Video"]].map(([id, l]) => (
          <button key={id} className={`heritage-chip${filter === id ? " sel" : ""}`} onClick={() => setFilter(id)}>{l}</button>
        ))}
      </div>
      {shown.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No media to rate yet — be the first to drop one.</p>
        : shown.map((p) => (
          <div key={p.id} className="post-card">
            <div className="post-user"><span style={{ cursor: "pointer" }} onClick={() => openPost(p)}>{p.title}</span>{p.author && <span style={{ fontSize: 11, color: "var(--text-light)" }}> · @{p.author}</span>}{p.is_album ? <span className="tag">💿 album</span> : ""}</div>
            {p.is_album
              ? (p.items || []).slice(0, 1).map((it, k) => <SmartMedia key={k} url={it.url} type={it.type} style={{ maxHeight: 200 }} />)
              : <SmartMedia url={p.media_url} type={p.media_type} style={{ maxHeight: 220 }} />}
            <SocialBar id={`post:${p.id}`} shareText={`${p.title} on Music ConnectZ`} />
            <AIRateButton post={p} />
          </div>
        ))}
    </div>
  );
}

function RateConnectZPage({ serverOk, onOpen }) {
  const { state, update, addTo, toggleSetting, addXP } = useAppState();
  const [type, setType] = useState("image");
  const gate = useWatchGate(type); // 30s to rate, 60s to comment — resets per item
  const [comments, setComments] = useState({});
  const [draft, setDraft] = useState("");
  const addComment = () => {
    if (!gate.canComment || !draft.trim()) return;
    setComments((c) => ({ ...c, [type]: [{ id: Date.now(), body: draft.trim(), at: Date.now() }, ...(c[type] || [])] }));
    update({ energy: (state.energy || 0) + 1 });
    addTo("energyLog", { amount: 1, note: "Commented", at: Date.now() });
    addXP(3, "Commented");
    setDraft("");
  };
  const attractOn = state.settings?.ratezAttractiveness !== false;
  const toggleAttract = () => {
    toggleSetting("ratezAttractiveness");
    if (isSignedIn()) setAttractivenessOptInApi(!attractOn).catch(() => {}); // sync opt-in to backend
  };
  const [rated, setRated] = useState({});
  const t = RATE_TYPES.find((x) => x.id === type);
  const award = (k, n) => {
    if (rated[k] != null) return;
    setRated((r) => ({ ...r, [k]: n }));
    update({ energy: (state.energy || 0) + 1 }); // raters earn 1 Energy per rating
    addTo("energyLog", { amount: 1, note: `Rated ${t.item}`, at: Date.now() });
    addXP(3, `Rated ${t.item}`);
  };
  return (
    <>
      <RateRealMedia serverOk={serverOk} onOpen={onOpen} />
      <div className="card-header" style={{ borderBottom: "none", marginTop: 4 }}>🎯 Quick practice (sample items)</div>
      <div className="chip-wrap" style={{ marginBottom: 14 }}>
        {RATE_TYPES.map((x) => (
          <button key={x.id} className={`heritage-chip${type === x.id ? " sel" : ""}`} onClick={() => setType(x.id)}>{x.label}</button>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><span>{t.label} · {t.item}</span><span className="tag">{gate.sec}s viewed</span></div>
        {!gate.canRate && (
          <p style={{ fontSize: 12, color: "var(--gold, #ffcf3f)", marginBottom: 8 }}>
            ⏳ Give it a real look — rating unlocks in <strong>{Math.max(0, gate.rateS - gate.sec)}s</strong>. Keep your score honest.
          </p>
        )}
        {t.criteria.map((cr) => {
          const k = `${type}:${cr}`;
          return (
            <div key={cr} style={{ marginBottom: 12, opacity: gate.canRate || rated[k] != null ? 1 : 0.45, pointerEvents: gate.canRate || rated[k] != null ? "auto" : "none" }}>
              <div className="rate-sub" style={{ textAlign: "left", marginBottom: 6 }}>{cr}</div>
              {rated[k] != null ? (
                <p style={{ fontSize: 12, color: "var(--text-light)" }}>You rated <strong style={{ color: "var(--primary)" }}>{rated[k]}/10</strong> · earned +1 ⚡</p>
              ) : (
                <div>
                  <StarRow value={0} size={22} showEnds onRate={(n) => award(k, n)} />
                  <button className="btn-link" style={{ background: "none", border: "none", color: "var(--text-light)", cursor: "pointer", padding: 0, fontSize: 11, marginTop: 6, display: "block" }} onClick={() => setRated((r) => ({ ...r, [k]: 0 }))}>Skip</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header"><span>💬 Comments</span>{!gate.canComment && <span className="tag">unlocks in {Math.max(0, gate.commentS - gate.sec)}s</span>}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} placeholder={gate.canComment ? "Say something real…" : "Comment unlocks after 60s"} disabled={!gate.canComment} style={{ flex: 1 }} />
          <button className="btn btn-small" onClick={addComment} disabled={!gate.canComment || !draft.trim()}>Post</button>
        </div>
        {(comments[type] || []).map((c) => (
          <div key={c.id} className="post-card"><div className="post-content">{c.body}</div><div className="post-meta">{new Date(c.at).toLocaleTimeString()}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="settings-toggle">
          <label>💯 Let RateZ move my attractiveness median</label>
          <div role="switch" aria-checked={attractOn} onClick={toggleAttract}
            className={`toggle-switch${attractOn ? " active" : ""}`} />
        </div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 6 }}>
          When on, the attractiveness ratings others give you adjust your median — the score used as a scalable filter on CollabZ, BattleZ, and VenueZ. Turn it off to keep your attractiveness private and unfiltered.
        </p>
      </div>
      <div className="card"><p style={{ fontSize: 11, color: "var(--text-light)" }}>Ratings are anonymous and curate the charts. Raters earn 1 ⚡ Energy per rating; 6+ ratings shape a media's median score, which feeds its price.</p></div>
    </>
  );
}

const DIST_TYPES = [
  { id: "audio", label: "🎧 Audio → Track" },
  { id: "image", label: "🖼 Image → Cover" },
  { id: "text", label: "📝 Text → Lyrics" },
  { id: "album", label: "💿 Album" },
];
// Import a PostZ into a release: pull the audio out of a video (server mp3 320k)
// and populate lyrics from the description, an AI ghostwriter (Corey), or a
// credited collaborator's lyric post.
function DistributeImport({ serverOk, onImported }) {
  const [posts, setPosts] = useState(null);
  const [pick, setPick] = useState(null); // selected post
  const [audioUrl, setAudioUrl] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [lyricSrc, setLyricSrc] = useState("description");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const hasMedia = (p) => p.media_url || (p.is_album && (p.items || []).length);
  useEffect(() => { if (serverOk) getPostzApi("new").then((r) => setPosts((r.posts || []).filter(hasMedia))).catch(() => setPosts(null)); }, [serverOk]);

  const choose = (p) => {
    setPick(p); setMsg(""); setAudioUrl("");
    // Audio posts already give us a track; video needs a transcode.
    const url = p.media_url || (p.items || [])[0]?.url || "";
    const type = p.media_type || (p.items || [])[0]?.type || "";
    if (type !== "video") setAudioUrl(url);
    setLyrics(p.description || "");
  };

  const extract = async () => {
    const url = pick.media_url || (pick.items || [])[0]?.url || "";
    setBusy("audio"); setMsg("");
    try {
      const r = await transcodeApi(url);
      setAudioUrl(r?.upload?.url || ""); setMsg("🎧 Audio extracted at 320k.");
    } catch (e) {
      setMsg(/transcode_unavailable|not enabled|ffmpeg/i.test(e?.message || "") ? "🎬 The server transcoder (ffmpeg) isn't enabled yet — video→audio goes live once it's installed." : (e?.message || "Couldn't extract audio."));
    }
    setBusy("");
  };

  const pullLyrics = async () => {
    setBusy("lyrics"); setMsg("");
    try {
      const r = await distributeLyricsApi({ source: lyricSrc, description: pick.description || "", collaboratorPostId: lyricSrc === "collaborator" ? pick.id : undefined, prompt: pick.title });
      setLyrics(r.lyrics || ""); setMsg(r.ghostwriter ? `✍️ Lyrics by ${r.ghostwriter}.` : "✍️ Lyrics pulled from the description.");
    } catch (e) {
      setMsg(/ai_unavailable|ANTHROPIC/i.test(e?.message || "") ? "🤖 The AI ghostwriter needs the backend AI key — use the description or a collaborator's lyrics for now." : (e?.message || "Couldn't get lyrics."));
    }
    setBusy("");
  };

  if (!serverOk) return null;
  const pickType = pick ? (pick.media_type || (pick.items || [])[0]?.type || "") : "";
  return (
    <div className="card" style={{ border: "1px solid var(--primary)" }}>
      <div className="card-header">📥 Import from a post</div>
      {!pick ? (
        <>
          <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Turn any of your media posts into a release — extract the audio and pull lyrics.</p>
          {(posts || []).length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No media posts yet.</p>
            : (posts || []).slice(0, 20).map((p) => (
              <div key={p.id} className="skill-item">
                <span className="skill-item-name">{(p.media_type === "video" || (p.items || []).some((i) => i.type === "video")) ? "📹" : "🎧"} {p.title} <span style={{ color: "var(--text-light)", fontSize: 11 }}>· @{p.author}</span></span>
                <button className="btn btn-small" onClick={() => choose(p)}>Import</button>
              </div>
            ))}
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <strong style={{ fontSize: 13 }}>{pick.title}</strong>
            <button className="btn btn-small btn-secondary" onClick={() => setPick(null)}>Change</button>
          </div>
          {pickType === "video" && !audioUrl && (
            <button className="btn btn-small btn-success" style={{ width: "100%", marginBottom: 8 }} onClick={extract} disabled={busy === "audio"}>{busy === "audio" ? "Extracting…" : "🎬→🎧 Extract audio (mp3 320k)"}</button>
          )}
          {audioUrl && <div style={{ marginBottom: 8 }}><audio src={audioUrl} controls style={{ width: "100%" }} /></div>}
          <label style={{ fontSize: 11, color: "var(--text-light)" }}>✍️ Lyrics source</label>
          <div className="chip-wrap" style={{ margin: "4px 0 6px" }}>
            {[["description", "📝 Description"], ["ai", "🤖 Corey (AI)"], ["collaborator", "🤝 Collaborator"]].map(([id, l]) => (
              <button key={id} className={`heritage-chip${lyricSrc === id ? " sel" : ""}`} onClick={() => setLyricSrc(id)}>{l}</button>
            ))}
            <button className="btn btn-small" onClick={pullLyrics} disabled={busy === "lyrics"}>{busy === "lyrics" ? "…" : "Pull lyrics"}</button>
          </div>
          <CappedTextarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} style={{ height: 90, width: "100%" }} placeholder="Lyrics populate here (editable)…" />
          <button className="btn btn-success" style={{ width: "100%", marginTop: 8 }} onClick={() => { onImported({ title: pick.title, audioUrl, lyrics }); setPick(null); setAudioUrl(""); setLyrics(""); setMsg("✅ Added to your submissions below."); }}>📤 Add as submission</button>
        </>
      )}
      {msg && <p style={{ fontSize: 11, color: /✅|🎧|✍️/.test(msg) ? "var(--success)" : "var(--gold, #ffcf3f)", marginTop: 6 }}>{msg}</p>}
    </div>
  );
}

function DistributeZPage({ tier, serverOk }) {
  const { state, addTo, removeFrom } = useAppState();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("audio");
  const [licensing, setLicensing] = useState(false);
  const isStatz = /stat[sz]/i.test(tier || "");
  const isPremium = /premium|pro|stat[sz]/i.test(tier || "");
  const releases = state.releases || [];
  const now = new Date();
  const thisMonth = releases.filter((r) => { const d = new Date(r.at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
  const atFreeLimit = !isPremium && thisMonth >= 1;
  const submit = () => {
    if (!title.trim() || atFreeLimit) return;
    addTo("releases", { id: Date.now(), title: title.trim(), type, licensing: isStatz && licensing, at: Date.now() });
    setTitle("");
  };
  const importRelease = ({ title: t, audioUrl, lyrics }) => {
    if (atFreeLimit) return;
    addTo("releases", { id: Date.now(), title: t || "Imported release", type: "audio", audioUrl, lyrics, licensing: false, at: Date.now() });
  };
  return (
    <>
      {serverOk && <DistributeImport serverOk={serverOk} onImported={importRelease} />}
      <div className="card">
        <div className="card-header"><span>🎶 New Submission</span><span className="tag">{isPremium ? "Unlimited" : `${thisMonth}/1 this month`}</span></div>
        <div className="form-group"><label>Media type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>{DIST_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        </div>
        <div className="form-group"><label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Release title" /></div>
        {isStatz && (
          <div className="settings-toggle"><label>⚖️ Submit for licensing (StatZ)</label>
            <div role="switch" aria-checked={licensing} onClick={() => setLicensing((v) => !v)} className={`toggle-switch${licensing ? " active" : ""}`} /></div>
        )}
        {atFreeLimit && <p style={{ fontSize: 12, color: "var(--gold, #ffcf3f)", marginBottom: 8 }}>🔒 Free tier allows 1 submission/month — upgrade for unlimited.</p>}
        <button className="btn btn-success" style={{ width: "100%" }} disabled={atFreeLimit || !title.trim()} onClick={submit}>📤 Submit for distribution</button>
      </div>
      <div className="card">
        <div className="card-header">📀 Your Submissions</div>
        {releases.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No submissions yet.</p>
          : [...releases].reverse().map((r, i) => (
            <div key={r.id} className="post-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="skill-item-name">{DIST_TYPES.find((t) => t.id === r.type)?.label.split(" ")[0]} {r.title}{r.licensing ? " · ⚖️ licensing" : ""}{r.audioUrl ? " · 🎧 320k" : ""}</span>
                <button className="btn btn-danger btn-small" onClick={() => removeFrom("releases", releases.length - 1 - i)}>✕</button>
              </div>
              {r.audioUrl && <audio src={r.audioUrl} controls style={{ width: "100%", marginTop: 6 }} />}
              {r.lyrics && <details style={{ marginTop: 4 }}><summary style={{ fontSize: 11, color: "var(--text-light)", cursor: "pointer" }}>✍️ Lyrics</summary><pre style={{ fontSize: 11, whiteSpace: "pre-wrap", margin: "4px 0 0" }}>{r.lyrics}</pre></details>}
            </div>
          ))}
      </div>
    </>
  );
}

const CASHOUT_PLANS = [
  { id: "instant", label: "⚡ Instant", tax: "15% tax" },
  { id: "weekly", label: "📅 Weekly", tax: "per-tier: Free 10% · Premium 5% · StatZ 3%" },
  { id: "monthly", label: "🗓️ Monthly", tax: "1% tax" },
  { id: "quarterly", label: "📆 3-month", tax: "0% tax — tax free" },
];
function RoyaltieZPage({ tier, serverOk, syncEconomy }) {
  const { state, update, updateWallet, addTo } = useAppState();
  const [royalties, setRoyalties] = useState(state.royalties || 0);
  const [entries, setEntries] = useState(null);
  const [plan, setPlan] = useState("weekly");
  const [msg, setMsg] = useState("");

  const load = () => {
    if (!serverOk) return;
    getRoyaltiesApi()
      .then((r) => {
        setRoyalties(r.royalties);
        setEntries(r.entries);
        update({ royalties: r.royalties });
      })
      .catch(() => {});
  };
  useEffect(load, [serverOk]);

  const cashout = async () => {
    setMsg("");
    if (!serverOk) { setMsg("Cashout requires a live connection to the economy backend."); return; }
    try {
      const r = await cashoutRoyaltiesApi(plan); // server applies plan tax, moves net to wallet
      const b = r.breakdown;
      updateWallet({ balance: r.wallet.money, earned: Number((state.wallet.earned + b.net_cents / 100).toFixed(2)) });
      addTo("paymentHistory", { amount: b.net_cents / 100, dev: b.tax_cents / 100, at: Date.now(), note: `Royalty cashout (${b.plan})` });
      setMsg(`Cashed out ${money(b.gross_cents / 100)} → ${money(b.net_cents / 100)} to wallet (tax ${money(b.tax_cents / 100)}).`);
      load();
      syncEconomy?.();
    } catch (e) {
      setMsg(e.message || "Cashout failed");
    }
  };

  const log = entries
    ? entries.map((e) => ({ amount: e.amount_cents / 100, note: e.kind === "cashout" ? `Cashout · tax ${money(e.tax_cents / 100)}` : (e.source || "Accrual"), at: new Date(e.created_at).getTime() }))
    : state.royaltyLog;

  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">👑 RoyaltieZ {serverOk ? <span className="tag" style={{ color: "var(--success)" }}>● live</span> : <span className="tag">offline</span>}</div>
        <div className="balance-info">Royalty balance: <strong><Amount value={royalties} flow="in" /></strong> · Every source is timestamped. Instant 15% · weekly tiered · monthly 1% · 3-month 0%.</div>
        <div className="form-group" style={{ marginTop: 8 }}>
          <label>Cashout plan</label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)}>
            {CASHOUT_PLANS.map((p) => <option key={p.id} value={p.id}>{p.label} — {p.tax}</option>)}
          </select>
        </div>
        {royalties > 0 && (() => { const c = splitCashout(royalties, plan, tier); return (
          <div className="txn" style={{ marginTop: 8 }}>
            <div className="txn-row"><span>Royalties</span><Amount value={c.gross} /></div>
            <div className="txn-row txn-tax"><span>Cashout tax · {Math.round(c.rate * 100)}%</span><Amount value={c.tax} flow="out" sign /></div>
            <div className="txn-total"><span>You receive</span><Amount value={c.net} flow="in" bold /></div>
          </div>
        ); })()}
        <button className="btn" style={{ width: "100%", marginTop: 8 }} disabled={!serverOk || royalties <= 0} onClick={cashout}>
          💸 Cash out to wallet
        </button>
        {msg && <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 8 }}>{msg}</p>}
      </div>
      <div className="card">
        <div className="card-header">🧾 Royalty Log</div>
        {(!log || log.length === 0) ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No royalty activity yet.</p>
        ) : [...log].reverse().map((e, i) => (
          <div key={i} className="skill-item">
            <span className="skill-item-name"><Amount value={e.amount} flow={e.amount >= 0 ? "in" : "out"} sign bold /> · {e.note}</span>
            <span className="skill-item-exp">{new Date(e.at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </>
  );
}

const DEMO_INBOX = [
  { id: "i1", who: "Kaya", body: "Loved your last drop — collab on a hook?", at: Date.now() - 3 * 3600e3 },
  { id: "i2", who: "LabelZ · Azrael Records", body: "We'd like to send you an advance offer.", at: Date.now() - 26 * 3600e3 },
];
// Real cross-user DMs: conversation list → thread → send. Server-backed when
// signed in; blocks + tier char limit enforced server-side.
function MessageZPage({ serverOk }) {
  const signedIn = isSignedIn();
  const live = signedIn && serverOk;
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null); // username of open thread
  const [thread, setThread] = useState([]);
  const [body, setBody] = useState("");
  const [finding, setFinding] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [editMsgId, setEditMsgId] = useState(null);
  const [editMsgDraft, setEditMsgDraft] = useState("");
  const [media, setMedia] = useState(null); // { url, type } audio/video attachment

  const loadConvos = () => { if (live) getConversationsApi().then((r) => setConvos(r.conversations || [])).catch(() => {}); };
  const loadThread = (u) => { if (live && u) getThreadApi(u).then((r) => setThread(r.messages || [])).catch(() => {}); };
  useEffect(loadConvos, [live]);
  useEffect(() => { if (active) { loadThread(active); const t = setInterval(() => loadThread(active), 20000); return () => clearInterval(t); } }, [active]);

  const send = async () => {
    const to = active || composeTo.trim();
    if (!to || (!body.trim() && !media)) return;
    try {
      await sendMessageApi(to, body.trim(), media);
      setBody(""); setMedia(null); setActive(to); setComposeTo("");
      loadThread(to); loadConvos();
    } catch (e) { alert(e?.message?.includes("blocked") ? "You can't message this user." : e?.message?.includes("limit") ? "Message too long for your tier — upgrade for more." : "Couldn't send."); }
  };
  const saveEdit = async () => {
    try { await editMessageApi(editMsgId, editMsgDraft.trim()); setEditMsgId(null); loadThread(active); }
    catch (e) { alert(e?.message?.includes("window") ? `⏳ Edit window passed — upgrade for a longer edit window (${EDIT_WINDOW_LABEL}).` : "Couldn't edit."); }
  };
  const pick = (m) => { setComposeTo(m.username || m.display_name || m.name || ""); setActive(null); setFinding(false); };

  if (!live) return <div className="card"><p style={{ fontSize: 12, color: "var(--text-light)" }}>💬 Sign in + connect to message other members.</p></div>;

  if (active) {
    return (
      <>
        <button className="btn btn-small btn-secondary" style={{ marginBottom: 10 }} onClick={() => { setActive(null); loadConvos(); }}>‹ Conversations</button>
        <div className="card">
          <div className="card-header">💬 @{active}</div>
          <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
            {thread.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No messages yet — say hi.</p>
              : thread.map((m) => (
                <div key={m.id} style={{ alignSelf: m.mine ? "flex-end" : "flex-start", maxWidth: "80%", background: m.mine ? "var(--primary)" : "rgba(255,255,255,0.08)", color: m.mine ? "#fff" : "inherit", borderRadius: 12, padding: "6px 10px", fontSize: 13 }}>
                  {editMsgId === m.id ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <input value={editMsgDraft} onChange={(e) => setEditMsgDraft(e.target.value)} style={{ flex: 1, fontSize: 12 }} />
                      <button className="btn btn-small" onClick={saveEdit} disabled={!editMsgDraft.trim()}>Save</button>
                      <button className="btn btn-small btn-secondary" onClick={() => setEditMsgId(null)}>✕</button>
                    </div>
                  ) : m.body}
                  {m.media_url && (
                    <div style={{ marginTop: m.body ? 4 : 0 }}>
                      {m.media_type === "video"
                        ? <video src={m.media_url} controls style={{ width: "100%", maxHeight: 200, borderRadius: 8 }} />
                        : <audio src={m.media_url} controls style={{ width: "100%" }} />}
                    </div>
                  )}
                  <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {new Date(m.at).toLocaleString()}
                    {m.mine && editMsgId !== m.id && <EditCountdown createdAt={m.at} mine onEdit={() => { setEditMsgId(m.id); setEditMsgDraft(m.body); }} />}
                    <EditZHistory history={m.edit_history} editedAt={m.edited_at} field="body" />
                  </div>
                </div>
              ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <CappedTextarea value={body} onChange={(e) => setBody(e.target.value)} style={{ height: 40, flex: 1 }} placeholder="Message…" />
            <button className="btn btn-success" onClick={send} disabled={!body.trim() && !media}>📤</button>
          </div>
          <MediaCapture onUploaded={setMedia} compact />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="card">
        <div className="card-header">✍️ New message</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="username" style={{ flex: 1 }} />
          <button className="btn btn-small btn-secondary" onClick={() => setFinding((v) => !v)}>{finding ? "✕" : "🔍 Find"}</button>
          <button className="btn btn-small" onClick={() => composeTo.trim() && setActive(composeTo.trim())} disabled={!composeTo.trim()}>Open</button>
        </div>
        {finding && <MemberFinder serverOk={serverOk} onPick={pick} actionLabel="✉️ Message" note="Filter members, then tap one to message them." />}
      </div>
      <div className="card">
        <div className="card-header">💬 Conversations</div>
        {convos.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No conversations yet.</p>
          : convos.map((c) => (
            <div key={c.user} className="post-card" style={{ cursor: "pointer" }} onClick={() => setActive(c.user)}>
              <div className="post-user">@{c.user} {c.unread > 0 && <span className="tag" style={{ color: "var(--danger)" }}>{c.unread} new</span>}</div>
              <div className="post-content" style={{ fontSize: 12, color: "var(--text-light)" }}>{c.last}</div>
              <div className="post-meta">{new Date(c.at).toLocaleString()}</div>
            </div>
          ))}
      </div>
    </>
  );
}

// CollabZ Split Studio — the core rule: every contributor is paid their worth
// for the skills others use, and everyone pays for the skills they use. Add each
// collaborator + the skills they bring; the settlement funds every person's worth
// and shows exactly who pays and who gets paid (green = paid, red = owed).
const TIER_OPTS = [["free", "Free"], ["premium", "Premium"], ["statz", "StatZ"]];
function CollabSplitStudio({ tier }) {
  const { state } = useAppState();
  const me = state.user?.name || state.user?.username || "You";
  const [rows, setRows] = useState([
    { id: 1, name: me, tier: (tier || "free"), skills: [{ name: "Vocals", price: 40 }] },
    { id: 2, name: "", tier: "free", skills: [{ name: "", price: "" }] },
  ]);
  const worthOf = (r) => r.skills.reduce((t, s) => t + (Number(s.price) || 0), 0);
  const setRow = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const setSkill = (id, si, patch) => setRow(id, { skills: rows.find((r) => r.id === id).skills.map((s, i) => (i === si ? { ...s, ...patch } : s)) });
  const addSkill = (id) => setRow(id, { skills: [...rows.find((r) => r.id === id).skills, { name: "", price: "" }] });
  const addPerson = () => setRows((rs) => [...rs, { id: Date.now(), name: "", tier: "free", skills: [{ name: "", price: "" }] }]);
  const removePerson = (id) => setRows((rs) => (rs.length > 2 ? rs.filter((r) => r.id !== id) : rs));

  const participants = rows.filter((r) => r.name.trim() && worthOf(r) >= 0).map((r) => ({ id: r.id, name: r.name.trim(), tier: r.tier, worth: worthOf(r) }));
  const settled = participants.length >= 2 ? collabSettlement(participants) : [];
  const pot = participants.reduce((t, p) => t + p.worth, 0);
  const platform = settled.reduce((t, p) => t + p.tax, 0);

  return (
    <div className="card" style={{ border: "1px solid var(--primary)" }}>
      <div className="card-header"><span>💠 Split Studio — everyone paid their worth</span><span className="tag">{participants.length} in</span></div>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>
        Add each collaborator and the skills they bring. Every person's worth is funded by the others who use it, and everyone pays for the skills they use. Developer tax comes off each payment at the payer's tier.
      </p>
      {rows.map((r) => (
        <div key={r.id} className="post-card" style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
            <input value={r.name} onChange={(e) => setRow(r.id, { name: e.target.value })} placeholder="Collaborator name" style={{ flex: 1 }} />
            <select value={r.tier} onChange={(e) => setRow(r.id, { tier: e.target.value })} style={{ width: 100 }}>
              {TIER_OPTS.map(([v, l]) => <option key={v} value={v}>{TIER_EMOJI[v]} {l}</option>)}
            </select>
            {rows.length > 2 && <button className="btn btn-small btn-secondary" onClick={() => removePerson(r.id)} title="Remove">✕</button>}
          </div>
          {r.skills.map((s, si) => (
            <div key={si} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              <input value={s.name} onChange={(e) => setSkill(r.id, si, { name: e.target.value })} placeholder="Skill (e.g. Mixing)" style={{ flex: 1 }} />
              <input type="number" value={s.price} onChange={(e) => setSkill(r.id, si, { price: e.target.value })} placeholder="$ worth" style={{ width: 90 }} />
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <button className="btn-link" style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0, fontSize: 11 }} onClick={() => addSkill(r.id)}>+ add skill</button>
            <span style={{ fontSize: 11, color: "var(--text-light)" }}>worth <strong>{money(worthOf(r))}</strong></span>
          </div>
        </div>
      ))}
      <button className="btn btn-small btn-secondary" onClick={addPerson}>➕ Add collaborator</button>

      {settled.length >= 2 && pot > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="card-header" style={{ fontSize: 13 }}><span>🧾 Settlement</span><span className="tag">pot {money(pot)} · platform {money(platform)}</span></div>
          <div className="txn">
            {settled.map((p) => (
              <div key={p.id} className="txn-row" style={{ alignItems: "baseline" }}>
                <span>{p.name} <span style={{ color: "var(--text-light)", fontSize: 10 }}>{TIER_EMOJI[devTaxFor(p.tier).key]} worth {money(p.worth)}</span></span>
                <span style={{ textAlign: "right" }}>
                  <Amount value={p.receives} flow="in" /> <span style={{ color: "var(--text-light)" }}>in</span> · <Amount value={p.pays} flow="out" /> <span style={{ color: "var(--text-light)" }}>out</span><br />
                  <span style={{ fontSize: 11 }}>net <Amount value={p.net} flow={p.net >= 0 ? "in" : "out"} sign bold /></span>
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 6 }}>Every contributor's worth is fully funded by the others who use it. Green = paid to them, red = they owe. This is your live preview — start a 🔒 escrow deal from an offer above and each payer's share is held safe until approval; the platform keeps {money(platform)} in developer tax on release.</p>
        </div>
      )}
    </div>
  );
}

// 🔒 Escrow-protected badge — reusable wherever money changes hands.
function EscrowBadge({ title = "Escrow-protected — money is held until you approve, then released. Refundable while a dispute is open." }) {
  return <span className="tag" style={{ color: "var(--success)" }} title={title}>🔒 Escrow-protected</span>;
}

const COLLAB_STATUS = {
  draft: { emoji: "📝", label: "Draft — awaiting funding", color: "var(--text-light)" },
  funded: { emoji: "🔒", label: "Funded — money held in escrow", color: "var(--gold, #ffcf3f)" },
  delivered: { emoji: "📦", label: "Delivered — awaiting approval", color: "var(--accent, #22e6ff)" },
  released: { emoji: "✅", label: "Released — paid out", color: "var(--success)" },
  disputed: { emoji: "⚖️", label: "Disputed — under review", color: "var(--danger)" },
  refunded: { emoji: "↩️", label: "Refunded", color: "var(--text-light)" },
  cancelled: { emoji: "✕", label: "Cancelled", color: "var(--text-light)" },
};

// Live tracker for the current user's escrow deals: shows who's funded, the
// amount held, the auto-release countdown, and the right action per role.
function CollabDealTracker({ me, refreshKey }) {
  const [deals, setDeals] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = () => getCollabsApi().then((r) => setDeals(r.deals || [])).catch(() => {});
  useEffect(() => { load(); }, [refreshKey]);
  const act = async (fn, id) => {
    setBusy(true); setMsg("");
    try { await fn(id); await load(); } catch (e) { setMsg(e?.message || "Couldn't complete that — try again."); }
    setBusy(false);
  };
  const active = deals.filter((d) => !["released", "refunded", "cancelled"].includes(d.status));
  const done = deals.filter((d) => ["released", "refunded", "cancelled"].includes(d.status));
  if (!deals.length) return null;
  const uname = me?.username;
  const myEntry = (d) => d.participants.find((p) => p.username === uname);
  const dealRow = (d) => {
    const meta = COLLAB_STATUS[d.status] || COLLAB_STATUS.draft;
    const mine = myEntry(d);
    const iOwe = mine && Number(mine.pays_cents) > 0;
    const iFunded = mine && mine.funded;
    const cur = d.currency === "spinaz" ? "🍥" : "$";
    const fmtAmt = (c) => (d.currency === "spinaz" ? `${c} 🍥` : money(c / 100));
    const daysLeft = d.auto_release_at ? Math.max(0, Math.ceil((new Date(d.auto_release_at) - Date.now()) / 86400000)) : null;
    return (
      <div key={d.id} className="post-card" style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: 13 }}>{d.title || `Collab #${d.id}`}</strong>
          <span className="tag" style={{ color: meta.color }}>{meta.emoji} {d.status}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-light)", margin: "4px 0" }}>{meta.label}{d.status === "funded" && daysLeft != null && ` · auto-releases in ${daysLeft}d`}</div>
        <div style={{ fontSize: 11 }}>
          {d.participants.map((p) => (
            <div key={p.username} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{p.username === uname ? "You" : `@${p.username}`} {p.funded ? "🔒" : ""}</span>
              <span style={{ color: "var(--text-light)" }}>
                {Number(p.pays_cents) > 0 && <span style={{ color: FLOW_RED }}>pays {fmtAmt(p.pays_cents)} </span>}
                {Number(p.receives_cents) > 0 && <span style={{ color: FLOW_GREEN }}>gets {fmtAmt(p.receives_cents)}</span>}
              </span>
            </div>
          ))}
        </div>
        {d.currency === "money" && d.held_cents > 0 && <div style={{ fontSize: 10, color: "var(--gold, #ffcf3f)", marginTop: 4 }}>🔒 {money(d.held_cents / 100)} held safe in escrow</div>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {iOwe && !iFunded && ["draft", "funded"].includes(d.status) && <button className="btn btn-small btn-success" disabled={busy} onClick={() => act(fundCollabApi, d.id)}>💳 Fund my share ({fmtAmt(mine.pays_cents)}{d.stake_spinaz ? ` + ${d.stake_spinaz}🍥 stake` : ""})</button>}
          {d.status === "funded" && mine && <button className="btn btn-small btn-secondary" disabled={busy} onClick={() => act(deliverCollabApi, d.id)}>📦 Mark delivered</button>}
          {iOwe && ["funded", "delivered"].includes(d.status) && <button className="btn btn-small btn-success" disabled={busy} onClick={() => act(releaseCollabApi, d.id)} title="Releases the held funds to your collaborator instantly">✅ Accept &amp; pay now</button>}
          {mine && ["funded", "delivered"].includes(d.status) && <button className="btn btn-small btn-secondary" disabled={busy} onClick={() => act(disputeCollabApi, d.id)} title="Freezes auto-release; the platform will mediate">⚖️ Dispute</button>}
          {iOwe && ["draft", "funded"].includes(d.status) && !d.delivered_at && <button className="btn btn-small btn-secondary" disabled={busy} onClick={() => act(refundCollabApi, d.id)} title="Cancel and return held funds">↩️ Cancel &amp; refund</button>}
        </div>
      </div>
    );
  };
  return (
    <div className="card" style={{ border: "1px solid var(--gold, #ffcf3f)" }}>
      <div className="card-header"><span>🔒 Your escrow deals</span><EscrowBadge /></div>
      {active.map(dealRow)}
      {done.length > 0 && <details style={{ marginTop: 6 }}><summary style={{ fontSize: 11, color: "var(--text-light)", cursor: "pointer" }}>Past deals ({done.length})</summary>{done.map(dealRow)}</details>}
      {msg && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 6 }}>{msg}</p>}
    </div>
  );
}

// CollabZ — user-based collaboration. Find collaborators by their real metrics,
// send a paid collab offer (real money between members), and settle any dispute
// or refund member-to-member right here. Membership/upgrades are never refundable.
function CollabZPage({ tier, serverOk, onOpen }) {
  const { state, addTo } = useAppState();
  const [target, setTarget] = useState(null);
  const [offer, setOffer] = useState("");
  const [offerUnit, setOfferUnit] = useState("work");
  const [offerHours, setOfferHours] = useState("");
  const [terms, setTerms] = useState("");
  const [stake, setStake] = useState(0);
  const [collabCur, setCollabCur] = useState("money");
  const [dealKey, setDealKey] = useState(0);
  const [escrowMsg, setEscrowMsg] = useState("");
  const [escrowBusy, setEscrowBusy] = useState(false);
  const requests = state.collabRequests || [];
  const offerBasis = { rate: offer, unit: offerUnit, hours: offerHours };
  const offerTotal = rateTotal(offerBasis);
  const cur = collabCur === "spinaz" ? "🍥" : "$";
  // Fold the agreed basis (per work / per hour) into the recorded terms.
  const termsWithBasis = () => {
    const note = `Agreed: ${rateBasisNote(offerBasis, cur)}`;
    return terms.trim() ? `${terms.trim()}\n(${note})` : note;
  };
  const resetOffer = () => { setTarget(null); setOffer(""); setOfferUnit("work"); setOfferHours(""); setTerms(""); setStake(0); };
  const submit = () => {
    if (!target || !(offerTotal > 0)) return;
    addTo("collabRequests", {
      id: Date.now(),
      who: target.username || target.display_name || target.name,
      amount: offerTotal,
      rateUnit: offerUnit,
      hours: Number(offerHours) || 0,
      terms: termsWithBasis(),
      status: "sent",
      at: Date.now(),
    });
    resetOffer();
  };
  // Turn an offer into a real escrow deal: I pay the offer, my collaborator
  // delivers; the money is held until I approve. Requires a real member target.
  const startEscrow = async () => {
    if (!target?.username || !(offerTotal > 0)) return;
    setEscrowBusy(true); setEscrowMsg("");
    try {
      const basis = rateBasisNote(offerBasis, cur);
      await createCollabApi({
        title: (terms.trim() ? terms.trim() : `Collab with @${target.username}`).slice(0, 62) + ` · ${basis}`.slice(0, 18),
        currency: collabCur,
        stake_spinaz: Number(stake) || 0,
        participants: [
          { username: state.user?.username, worth_cents: 0 },
          { username: target.username, worth_cents: Math.round(offerTotal * (collabCur === "spinaz" ? 1 : 100)) },
        ],
      });
      setEscrowMsg(`🔒 Escrow deal created (${basis}) — fund your share below to hold the money safe.`);
      resetOffer();
      setDealKey((k) => k + 1);
    } catch (e) { setEscrowMsg(e?.message || "Couldn't create the escrow deal — is your collaborator a signed-in member?"); }
    setEscrowBusy(false);
  };
  return (
    <>
      <div className="card">
        <div className="card-header">🤝 CollabZ — user-based</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}><EscrowBadge /><span style={{ fontSize: 11, color: "var(--text-light)" }}>Your money is held safe until you approve the work.</span></div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          Every CollabZ is member-to-member. You put up <strong>real wallet money</strong> (or 🍥 SpinAZ), it's <strong>held in escrow</strong> — not sent — until you approve; the developer tax applies to your tier and the rest goes to your collaborator. Filter the room by their real metrics — NationalitieZ, PreferenceZ, ZodiacZ, SubstanceZ — then send an offer.
        </p>
        <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 6 }}>
          🧾 Money's held until you approve, auto-releases after the window, and is refundable while a dispute is open — settled between members here. <strong>Membership and upgrades are not refundable.</strong> Broken feature? <button className="btn-link" style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0, textDecoration: "underline", font: "inherit" }} onClick={() => onOpen?.("bugz")}>Submit a BugZ report.</button>
        </p>
      </div>

      {serverOk && <CollabDealTracker me={state.user} refreshKey={dealKey} />}
      {escrowMsg && <div className="card"><p style={{ fontSize: 12, color: "var(--gold, #ffcf3f)", margin: 0 }}>{escrowMsg}</p></div>}

      <CollabSplitStudio tier={tier} />

      {target ? (
        <div className="card" style={{ border: "1px solid var(--primary)" }}>
          <div className="card-header"><span>🤝 Offer to {target.username ? `@${target.username}` : (target.display_name || target.name)}</span><button className="btn btn-small btn-secondary" onClick={() => setTarget(null)}>Change</button></div>
          <div className="form-group"><label>💵 Offer — pay per work or per hour, as you agree</label>
            <RatePricer value={offerBasis} currency={cur} skillRates={mySkillRates(state)}
              onChange={(v) => { setOffer(v.rate); setOfferUnit(v.unit); setOfferHours(v.hours); }} />
            {offerTotal > 0 && <div style={{ fontSize: 12, fontWeight: 700 }}>Agreed total: <span style={{ color: "var(--success)" }}>{cur === "🍥" ? `${offerTotal} 🍥` : money(offerTotal)}</span></div>}
          </div>
          <div className="form-group"><label>Terms</label><CappedTextarea value={terms} onChange={(e) => setTerms(e.target.value)} style={{ height: 56 }} placeholder="What are you collaborating on? Deliverables, splits, deadline…" /></div>
          <div className="form-group"><label>🎧 Attach a reference sample (record/upload)</label><MediaCapture onUploaded={(m) => { if (m?.url) setTerms((t) => `${t}${t ? "\n" : ""}🎧 Sample: ${m.url}`); }} /></div>
          {offerTotal > 0 && collabCur === "money" && (() => { const s = splitTransaction(offerTotal, tier); return (
            <p style={{ fontSize: 11, color: "var(--text-light)" }}>Developer tax ({s.label} {Math.round(s.rate * 100)}%): {money(s.dev)} · your collaborator receives {money(s.net)}.</p>
          ); })()}
          {serverOk && target.username && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "6px 0" }}>
              <label style={{ fontSize: 11, color: "var(--text-light)" }}>Pay with</label>
              <div className="chip-wrap">
                <button className={`heritage-chip${collabCur === "money" ? " sel" : ""}`} onClick={() => setCollabCur("money")}>💲 Money</button>
                <button className={`heritage-chip${collabCur === "spinaz" ? " sel" : ""}`} onClick={() => setCollabCur("spinaz")}>🍥 SpinAZ</button>
              </div>
              <label style={{ fontSize: 11, color: "var(--text-light)" }} title="Optional refundable good-faith stake both sides put up; returned on completion.">🍥 Stake</label>
              <input type="number" min="0" value={stake} onChange={(e) => setStake(e.target.value)} placeholder="0" style={{ width: 70 }} />
            </div>
          )}
          {serverOk && target.username ? (
            <>
              <button className="btn btn-success" style={{ width: "100%" }} disabled={!(offerTotal > 0) || escrowBusy} onClick={startEscrow}>{escrowBusy ? "Creating…" : "🔒 Start escrow deal (held until you approve)"}</button>
              <button className="btn btn-secondary btn-small" style={{ width: "100%", marginTop: 6 }} disabled={!(offerTotal > 0)} onClick={submit}>📤 Send informal offer (no escrow)</button>
            </>
          ) : (
            <button className="btn btn-success" style={{ width: "100%" }} disabled={!(offerTotal > 0)} onClick={submit}>📤 Send collab offer</button>
          )}
        </div>
      ) : (
        <MemberFinder serverOk={serverOk} onPick={setTarget} actionLabel="🤝 Collab with" note="Multi-select filters — combine NationalitieZ, PreferenceZ, ZodiacZ and SubstanceZ to find the right collaborator." />
      )}

      {requests.length > 0 && (
        <div className="card">
          <div className="card-header">📤 Your collab offers</div>
          {[...requests].reverse().map((r) => (
            <div key={r.id} className="post-card">
              <div className="post-user">To: {r.who} · {money(r.amount)}{r.rateUnit === "hour" && r.hours ? ` (per hour × ${r.hours}h)` : r.rateUnit === "work" ? " (per work)" : ""} <span className="tag">{r.status}</span></div>
              <SocialBar id={`collab:${r.id}`} shareText={`Collab offer to ${r.who}`} />
              {r.terms && <div className="post-content">{r.terms}</div>}
              <div className="post-meta">{new Date(r.at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// LegalZ — the site-side coverage: terms, refund/dispute policy, entity + liability
// disclaimers. The owner drops their real LLC name in via the OWNER_ENTITY constant.
const OWNER_ENTITY = "Music ConnectZ (operating entity — set your LLC name here)";
function LegalZPage() {
  return (
    <>
      <div className="card">
        <div className="card-header">⚖️ Terms &amp; Policies</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          Music ConnectZ is operated by <strong>{OWNER_ENTITY}</strong>. Using the platform means you agree to everything below. Plain English, no fine-print games.
        </p>
      </div>
      <div className="card">
        <div className="card-header">🧾 Refunds</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          <strong>Membership &amp; upgrades — 10-day refund window.</strong> You can downgrade for a full refund within <strong>10 days</strong> of purchase, straight from MembershipZ: the charge is refunded to your original payment method, any subscription is cancelled, and your tier drops back to Free. After 10 days the purchase is final. <strong>SpinAZ and Energy purchases are non-refundable</strong> (they're spendable currency). If something's broken, that's a bug — file a <strong>BugZ</strong> report and we fix it (squashed bugs pay you 200 SpinAZ). We don't issue refunds for buyer's remorse outside the 10-day window.
        </p>
      </div>
      <div className="card">
        <div className="card-header">🔒 CollabZ escrow</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          Funds committed to a CollabZ deal are <strong>held in escrow</strong> by {OWNER_ENTITY} and are not paid to your collaborator until (a) the paying member approves release, or (b) the deal <strong>auto-releases</strong> after the release window (default 10 days from funding) if no dispute is open. Either party may open a <strong>dispute</strong> within the dispute window, which freezes auto-release pending resolution. A deal cancelled before delivery returns all held funds and any good-faith stake to the payers. Optional SpinAZ stakes are refundable good faith and are returned on completion. Escrow is a holding mechanism only — {OWNER_ENTITY} is not an arbiter of creative quality and mediates disputes at its discretion.
        </p>
      </div>
      <div className="card">
        <div className="card-header">🤝 Member-to-member disputes</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          Money you spend on other members — CollabZ offers, MerchZ, VenueZ, CallZ — is a transaction <em>between you and them</em>. Disputes and refunds on those are settled member-to-member inside CollabZ. {OWNER_ENTITY} takes the developer tax as a platform fee and provides the rails, but is not a party to your deal and isn't liable for another member's delivery, quality, or conduct.
        </p>
      </div>
      <div className="card">
        <div className="card-header">🛡️ Liability</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          The platform is provided "as is," without warranties. To the fullest extent the law allows, {OWNER_ENTITY} is not liable for lost profits, lost data, or indirect/consequential damages arising from your use of Music ConnectZ, member transactions, or AI-generated output. AI documents and tools are drafts for convenience, not legal advice.
        </p>
      </div>
      <div className="card">
        <div className="card-header">📇 Contact &amp; entity</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          Legal notices go to the operating entity above. <strong>Set your registered LLC name, state of formation, and a contact address</strong> in the <code>OWNER_ENTITY</code> field (and your lawyer should review this page before you rely on it).
        </p>
      </div>
      <LegalDisclaimer />
    </>
  );
}

function LabelZPage({ tier, onOpen }) {
  const { state, addTo, updateSettings } = useAppState();
  const isPremium = /premium|pro|stat[sz]/i.test(tier || "");
  const canCreate = isPremium || isBizPersona(state.personas);
  const [form, setForm] = useState({ artist: "", advance: "", royalty: "", terms: "" });
  const [sign, setSign] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const contracts = state.labelContracts || [];
  const submit = () => {
    if (!canCreate || !form.artist.trim() || !sign.trim()) return;
    addTo("labelContracts", { id: Date.now(), ...form, advance: Number(form.advance) || 0, royalty: Number(form.royalty) || 0, signedBy: sign.trim(), at: Date.now() });
    setForm({ artist: "", advance: "", royalty: "", terms: "" }); setSign("");
  };
  if (!canCreate) {
    return (
      <div className="card">
        <div className="card-header">🏷️ LabelZ</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          🔒 Creating a label requires <strong>Premium</strong>, or an <strong>A&amp;R Scout</strong> / <strong>Manager</strong> persona. Add one in PersonaZ, or upgrade.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <UpgradeCTA onOpen={onOpen} label="👑 Upgrade to Premium" />
          <UpgradeCTA onOpen={onOpen} label="🎭 Add a persona" to="personas" style={{ background: "transparent", border: "1px solid var(--primary)" }} />
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="card">
        <div className="card-header">🏷️ New Signing — Advance Offer</div>
        <div className="form-group"><label>Artist</label><input value={form.artist} onChange={set("artist")} placeholder="Who are you signing?" /></div>
        <div className="grid-2">
          <div className="form-group"><label>💵 Advance ($)</label><input type="number" value={form.advance} onChange={set("advance")} /></div>
          <div className="form-group"><label>👑 Artist royalty (%)</label><input type="number" value={form.royalty} onChange={set("royalty")} /></div>
        </div>
        <div className="form-group"><label>Terms</label><CappedTextarea value={form.terms} onChange={set("terms")} style={{ height: 56 }} placeholder="Deliverables, length, recoupment…" /></div>
        <div className="form-group"><label>✍️ E-signature (type your legal name)</label><input value={sign} onChange={(e) => setSign(e.target.value)} placeholder="Your name" /></div>
        <LegalDisclaimer />
        <button className="btn btn-success" style={{ width: "100%" }} disabled={!form.artist.trim() || !sign.trim()} onClick={submit}>✒️ Sign & issue contract</button>
      </div>
      <div className="card">
        <div className="card-header">📜 Signed Contracts</div>
        {contracts.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No contracts yet.</p>
          : [...contracts].reverse().map((c) => (
            <div key={c.id} className="post-card">
              <div className="post-user">🏷️ {c.artist} — {money(c.advance)} advance · {c.royalty}% royalty</div>
              {c.terms && <div className="post-content">{c.terms}</div>}
              <div className="post-meta">✍️ Signed by {c.signedBy} · {new Date(c.at).toLocaleString()} · hash #{(c.id % 100000).toString(16)}</div>
            </div>
          ))}
      </div>
    </>
  );
}

const LILITH_LISTS = [
  { id: "today", label: "‼️ Today" },
  { id: "habits", label: "🔁 Habits" },
  { id: "inbox", label: "📥 Inbox" },
  { id: "upcoming", label: "📅 Upcoming" },
  { id: "anytime", label: "👐🏼 Anytime" },
  { id: "someday", label: "🧠 Someday" },
  { id: "logbook", label: "🧾 Logbook" },
  { id: "trash", label: "🚮 Trash" },
];

// ---- Recurring-habit helpers (shared by Lilith + the training apps) ----
const REPEAT_OPTS = [["none", "Once"], ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["annual", "Annual"]];
const REPEAT_MS = { daily: 864e5, weekly: 6048e5, monthly: 2592e6, annual: 31536e6 };
const REPEAT_LABEL = Object.fromEntries(REPEAT_OPTS);
const rollDue = (repeat, from = Date.now()) => from + (REPEAT_MS[repeat] || 0);
const isHabit = (t) => t.repeat && t.repeat !== "none";
const dueLabel = (t) => {
  if (!t.dueAt) return "";
  const d = Math.ceil((t.dueAt - Date.now()) / 864e5);
  return d <= 0 ? "due now" : `in ${d}d`;
};
// Curated metrics per app + globals; free-text also allowed. This is the
// "reference every metric in every app" surface (expandable v1).
const GLOBAL_METRICS = ["followers", "reach median", "energy", "spinaz", "money", "level", "streak", "rating"];
const APP_METRICS = {
  bodiez: ["volume", "PRs", "sets", "reps", "bodyweight", "recovery"],
  singz: ["range", "pitch accuracy", "breath", "vibrato", "sessions"],
  rapz: ["flow", "breath", "rhymes", "bars written", "BPM comfort"],
  money: ["balance", "energy"],
  directz: ["works", "rating"],
  battlez: ["wins", "rating"],
  collabz: ["deals", "escrow"],
};
const metricsFor = (k) => [...(APP_METRICS[k] || []), ...GLOBAL_METRICS];

// Reusable: run an in-app top-up (money + tier energy) — same path as TopUpTiles.
function useTopUp({ serverOk, tier }) {
  const { state, update, updateWallet, addTo } = useAppState();
  return async (dollars) => {
    const cents = dollars * 100;
    if (serverOk) {
      try {
        const r = await addFundsApi(cents);
        updateWallet({ balance: r.wallet.money, earned: Number((state.wallet.earned + r.breakdown.net_cents / 100).toFixed(2)) });
        update({ energy: r.wallet.energy, spinaz: r.wallet.spinaz });
        addTo("paymentHistory", { amount: r.breakdown.net_cents / 100, gross: dollars, dev: r.breakdown.dev_tax_cents / 100, at: Date.now(), note: "Top up (habit)" });
        return `✅ +${money(r.breakdown.net_cents / 100)} + ${r.breakdown.energy_granted}⚡`;
      } catch { /* local fallback */ }
    }
    const { net } = splitTransaction(dollars, tier);
    const mult = ENERGY_TOPUP_MULT[tierKey(tier)] || 1;
    updateWallet({ balance: Number((state.wallet.balance + net).toFixed(2)), earned: Number((state.wallet.earned + net).toFixed(2)) });
    update({ energy: (state.energy || 0) + cents * mult });
    return `✅ +${money(net)} + ${cents * mult}⚡ (local)`;
  };
}

// Cross-app recurring-habit strip — mounted on BodieZ / SingZ / RapZ. Writes into
// the shared state.lilithTasks pool so every habit also shows up in Lilith.
function HabitStrip({ appKey, appName, onOpen }) {
  const { state, setList, update } = useAppState();
  const tasks = state.lilithTasks || [];
  const mine = tasks.filter((t) => t.app === appKey && isHabit(t) && t.list !== "trash");
  const [title, setTitle] = useState("");
  const [repeat, setRepeat] = useState("weekly");
  const [metric, setMetric] = useState("");
  const add = () => {
    if (!title.trim()) return;
    setList("lilithTasks", [...tasks, { id: Date.now(), title: title.trim(), list: "today", app: appKey, repeat, metric, dueAt: rollDue(repeat), energy: 2, xp: 10 }]);
    setTitle(""); setMetric("");
  };
  const complete = (t) => {
    setList("lilithTasks", (state.lilithTasks || []).map((x) => (x.id === t.id ? { ...x, dueAt: rollDue(x.repeat), lastDone: Date.now() } : x)));
    update({ energy: (state.energy || 0) + (t.energy || 1) });
  };
  return (
    <div className="card" style={{ border: "1px solid var(--gold, #ffcf3f)" }}>
      <div className="card-header"><span>🔁 {appName} habits</span><button className="btn btn-small btn-secondary" onClick={() => onOpen?.("lilith")}>💃🏽 Lilith</button></div>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Weekly / monthly / annual practice habits — they earn ⚡ Energy and cross-pollinate into Lilith.</p>
      {mine.map((t) => (
        <div key={t.id} className="skill-item">
          <span className="skill-item-name">{t.title}{t.metric ? <span style={{ color: "var(--text-light)" }}> · {t.metric}</span> : ""} <span style={{ color: "var(--text-light)", fontSize: 10 }}>({REPEAT_LABEL[t.repeat]} · {dueLabel(t)})</span></span>
          <span className="skill-item-actions"><button className="btn btn-success btn-small" onClick={() => complete(t)}>✓ +{t.energy || 1}⚡</button></span>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New practice habit…" onKeyDown={(e) => e.key === "Enter" && add()} style={{ flex: 1, minWidth: 120 }} />
        <select value={repeat} onChange={(e) => setRepeat(e.target.value)} style={{ width: 96 }}>{REPEAT_OPTS.filter(([id]) => id !== "none").map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <select value={metric} onChange={(e) => setMetric(e.target.value)} style={{ flex: 1 }}><option value="">metric (optional)</option>{metricsFor(appKey).map((m) => <option key={m} value={m}>{m}</option>)}</select>
        <button className="btn btn-small" onClick={add}>＋ Add habit</button>
      </div>
    </div>
  );
}

function LilithPage({ onOpen, tier, serverOk }) {
  const { state, setList, update } = useAppState();
  const [list, setActiveList] = useState("today");
  const [title, setTitle] = useState("");
  const [repeat, setRepeat] = useState("none");
  const [app, setApp] = useState("");
  const [metric, setMetric] = useState("");
  const [topupAmt, setTopupAmt] = useState(10);
  const [topupRepeat, setTopupRepeat] = useState("monthly");
  const [msg, setMsg] = useState("");
  const runTopUp = useTopUp({ serverOk, tier });
  const tasks = state.lilithTasks || [];
  const fnApps = CATALOG.flatMap((g) => g.apps).filter((a) => a.fn);
  const shown = list === "habits" ? tasks.filter((t) => isHabit(t) && t.list !== "trash") : tasks.filter((t) => t.list === list);
  const patch = (id, p) => setList("lilithTasks", tasks.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const add = () => {
    if (!title.trim()) return;
    const t = { id: Date.now(), title: title.trim(), list: list === "habits" ? "today" : list, xp: 10, energy: 1 };
    if (repeat !== "none") { t.repeat = repeat; t.dueAt = rollDue(repeat); t.energy = 2; }
    if (app) { t.app = app; }
    if (metric) { t.metric = metric; }
    setList("lilithTasks", [...tasks, t]);
    setTitle(""); setMetric("");
  };
  const addTopUpHabit = () => {
    setList("lilithTasks", [...tasks, { id: Date.now(), title: `Top up $${topupAmt}`, list: "today", app: "money", repeat: topupRepeat, dueAt: rollDue(topupRepeat), topupAmount: Number(topupAmt), energy: 2, xp: 10 }]);
    setMsg(`💳 Top-up habit added — $${topupAmt} ${topupRepeat}. Complete it to fund + earn energy.`);
  };
  const complete = async (t) => {
    if (t.app === "money" && t.topupAmount) {
      const m = await runTopUp(t.topupAmount);
      setMsg(m);
    } else {
      update({ energy: (state.energy || 0) + (t.energy || 1) });
    }
    if (isHabit(t)) patch(t.id, { dueAt: rollDue(t.repeat), lastDone: Date.now() });  // reschedule
    else patch(t.id, { list: "logbook", done: true });
  };
  const openApp = (a) => onOpen?.(a);
  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 14 }}>
        {LILITH_LISTS.map((l) => (
          <button key={l.id} className={`heritage-chip${list === l.id ? " sel" : ""}`} onClick={() => setActiveList(l.id)}>
            {l.label} {(l.id === "habits" ? tasks.filter((t) => isHabit(t) && t.list !== "trash").length : tasks.filter((t) => t.list === l.id).length) || ""}
          </button>
        ))}
      </div>

      {!["logbook", "trash"].includes(list) && (
        <div className="card">
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Add ${list === "habits" ? "a habit" : `to ${list}`}…`} onKeyDown={(e) => e.key === "Enter" && add()} style={{ flex: 1 }} />
            <button className="btn" onClick={add}>＋</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <select value={repeat} onChange={(e) => setRepeat(e.target.value)} title="Repeat" style={{ width: 96 }}>{REPEAT_OPTS.map(([id, l]) => <option key={id} value={id}>{id === "none" ? "Once" : `🔁 ${l}`}</option>)}</select>
            <select value={app} onChange={(e) => { setApp(e.target.value); setMetric(""); }} title="Link an app" style={{ flex: 1, minWidth: 110 }}>
              <option value="">Link app (optional)</option>
              {fnApps.map((a) => <option key={a.key} value={a.key}>{a.emoji} {a.name}</option>)}
            </select>
            {app && <select value={metric} onChange={(e) => setMetric(e.target.value)} title="Metric" style={{ flex: 1, minWidth: 110 }}><option value="">metric…</option>{metricsFor(app).map((m) => <option key={m} value={m}>{m}</option>)}</select>}
          </div>
          <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 6 }}>Link any app + metric — habits cross-pollinate across the whole platform. 🌐</p>
        </div>
      )}

      {list === "habits" && (
        <div className="card" style={{ border: "1px solid var(--gold, #ffcf3f)" }}>
          <div className="card-header">💳 Top-up habit</div>
          <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Schedule a top-up that rewards Energy = the $ you add (× your tier). One tap on the due date funds + fuels you. <span style={{ color: "var(--text-light)" }}>(Scheduled one-tap — not silent card billing.)</span></p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <select value={topupAmt} onChange={(e) => setTopupAmt(Number(e.target.value))} style={{ width: 90 }}>{TOPUP_PRESETS.map((d) => <option key={d} value={d}>${d}</option>)}</select>
            <select value={topupRepeat} onChange={(e) => setTopupRepeat(e.target.value)} style={{ width: 110 }}>{REPEAT_OPTS.filter(([id]) => id !== "none").map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
            <button className="btn btn-success btn-small" onClick={addTopUpHabit}>＋ Add top-up habit</button>
          </div>
          <AutoTopUpManager serverOk={serverOk} />
        </div>
      )}

      <div className="card">
        <div className="card-header">{LILITH_LISTS.find((l) => l.id === list).label}</div>
        {shown.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>Nothing here.</p>
          : shown.map((t) => {
            const linked = t.app && APPS_BY_KEY[t.app];
            return (
              <div key={t.id} className="skill-item">
                <span className="skill-item-name" style={t.done ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>
                  {t.title}
                  {t.metric ? <span style={{ color: "var(--text-light)", fontSize: 10 }}> · {t.metric}</span> : ""}
                  {isHabit(t) && <span style={{ color: "var(--gold, #ffcf3f)", fontSize: 10 }}> · 🔁 {REPEAT_LABEL[t.repeat]} {dueLabel(t)}</span>}
                  {linked && <button className="btn-link" style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: "0 0 0 6px", fontSize: 10 }} onClick={() => openApp(t.app)}>{linked.emoji} open</button>}
                </span>
                <span className="skill-item-actions">
                  {!t.done && list !== "trash" && <button className="btn btn-success btn-small" onClick={() => complete(t)}>✓{isHabit(t) ? ` +${t.energy || 1}⚡` : ""}</button>}
                  {list !== "trash" ? <button className="btn btn-danger btn-small" onClick={() => patch(t.id, { list: "trash", repeat: "none" })}>🚮</button>
                    : <button className="btn btn-secondary btn-small" onClick={() => patch(t.id, { list: "inbox", done: false })}>↩</button>}
                </span>
              </div>
            );
          })}
        {msg && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>{msg}</p>}
        {list === "logbook" && shown.length > 0 && <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 8 }}>Completed missions earn ⚡ Energy. Clear your Today list for a daily bonus.</p>}
      </div>
    </>
  );
}

// Shared attribution/royalty footer for anything Intelligence creates.
function IntelNote({ role, reusable }) {
  return (
    <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 4 }}>
      🏷️ Attributed to Corey Knap ({role}) · low-gradient MCZ watermark applied · can't be exported/downloaded outside posts.
      {reusable ? " ♻️ Reusable: 10% K-Oth royalty when used on DistributeZ / CollabZ / BattleZ, split transparently to contributors. Edit the output and the royalty scales to how much stays original — change 50% of the words, K-Oth is paid on the other 50% (so 5%)." : ""}
    </p>
  );
}
function Pill({ active, onClick, children }) {
  return <button className={`heritage-chip${active ? " sel" : ""}`} onClick={onClick}>{children}</button>;
}

// Mood picker — grouped chips shared across ShotZ (image) and DirectZ (video).
function MoodPicker({ mood, setMood }) {
  return (
    <div style={{ margin: "6px 0 12px" }}>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>🫥 Mood</label>
      {MOOD_GROUPS.map((g) => (
        <div key={g.group} style={{ marginTop: 6 }}>
          <div style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 3 }}>{g.emoji} {g.group}</div>
          <div className="chip-wrap">
            {g.moods.map((m) => (
              <button key={m.name} type="button" title={m.note} className={`heritage-chip${mood === m.name ? " sel" : ""}`} onClick={() => setMood(mood === m.name ? "" : m.name)}>{m.name} {MOOD_EMOJI[m.name] || "🎭"}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ImageConnectZ() {
  const [type, setType] = useState(IMAGE_TYPES[0].name);
  const [mood, setMood] = useState("");
  const [prompt, setPrompt] = useState("");
  const t = IMAGE_TYPES.find((x) => x.name === type);
  return (
    <div className="card">
      <div className="card-header">🖼️ Image ConnectZ <span className="tag">{t.ratio}</span></div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Image type</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>
        {IMAGE_TYPES.map((x) => <Pill key={x.name} active={type === x.name} onClick={() => setType(x.name)}>{x.name}</Pill>)}
      </div>
      <MoodPicker mood={mood} setMood={setMood} />
      <div className="form-group"><label>Describe it</label><CappedTextarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ height: 56 }} placeholder={`e.g., neon skyline for a ${type.toLowerCase()}`} /></div>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>🙂 Uses your saved FaceZ for likeness. StatZ can lipsync the result to an audio/video track and drop it into VideoZ.</p>
      <button className="btn" style={{ width: "100%" }} disabled={!prompt.trim()}>✨ Generate {mood ? `${mood} ` : ""}{type} ({t.ratio})</button>
      <IntelNote role="Designer" />
    </div>
  );
}

function InstrumentalConnectZ({ tier }) {
  const isStatz = /stat[sz]/i.test(tier || "");
  const [genre, setGenre] = useState(INSTR_GENRES[0]);
  const [inst, setInst] = useState(["808 / Bass", "Drums"]);
  const [bpm, setBpm] = useState(140);
  const [keyIdx, setKeyIdx] = useState(0);
  const [moodQ, setMoodQ] = useState("");
  const toggle = (i) => setInst((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  const keyList = isStatz && moodQ ? KEYS.filter((k) => (k.mood + k.key).toLowerCase().includes(moodQ.toLowerCase())) : KEYS;
  const chosen = keyList[keyIdx] || KEYS[0];
  return (
    <div className="card">
      <div className="card-header">🎹 Instrumental ConnectZ <span className="tag">MIDI</span></div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Genre</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{INSTR_GENRES.map((g) => <Pill key={g} active={genre === g} onClick={() => setGenre(g)}>{g}</Pill>)}</div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Instruments</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{INSTR_INSTRUMENTS.map((i) => <Pill key={i} active={inst.includes(i)} onClick={() => toggle(i)}>{i}</Pill>)}</div>
      <div className="form-group"><label>BPM: {bpm}</label><input type="range" min="60" max="200" value={bpm} onChange={(e) => setBpm(+e.target.value)} /></div>
      {isStatz && (
        <div className="form-group"><label>🔎 StatZ — search key by mood</label><input value={moodQ} onChange={(e) => { setMoodQ(e.target.value); setKeyIdx(0); }} placeholder="e.g., dark, triumphant, midnight" /></div>
      )}
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Key</label>
      <div className="chip-wrap" style={{ margin: "6px 0 8px" }}>{keyList.map((k, i) => <Pill key={k.key} active={keyIdx === i} onClick={() => setKeyIdx(i)}>{k.key}</Pill>)}</div>
      <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 10 }}><strong>{chosen.key}</strong> — {chosen.mood}</p>
      <button className="btn" style={{ width: "100%" }}>🎼 Generate MIDI · {genre} · {bpm} BPM · {chosen.key}</button>
      <IntelNote role="Beat Producer" reusable />
    </div>
  );
}

function MixConnectZ() {
  const [mode, setMode] = useState(MIX_MODES[2]);
  const [target, setTarget] = useState(MIX_TARGETS[0].name);
  const [extras, setExtras] = useState(["Vocal tuning"]);
  const tg = MIX_TARGETS.find((x) => x.name === target);
  const toggle = (e) => setExtras((s) => (s.includes(e) ? s.filter((x) => x !== e) : [...s, e]));
  return (
    <div className="card">
      <div className="card-header">🎚️ Mix ConnectZ</div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Mode</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{MIX_MODES.map((m) => <Pill key={m} active={mode === m} onClick={() => setMode(m)}>{m}</Pill>)}</div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Loudness target</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{MIX_TARGETS.map((x) => <Pill key={x.name} active={target === x.name} onClick={() => setTarget(x.name)}>{x.name} · {x.lufs}</Pill>)}</div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Enhancements</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{MIX_EXTRAS.map((e) => <Pill key={e} active={extras.includes(e)} onClick={() => toggle(e)}>{e}</Pill>)}</div>
      <button className="btn" style={{ width: "100%" }}>🎛️ {mode} → {tg.lufs}</button>
      <IntelNote role="Mix Engineer" />
    </div>
  );
}

function VideoConnectZ() {
  const [type, setType] = useState(VIDEO_TYPES[0].name);
  const [mood, setMood] = useState("");
  const [prompt, setPrompt] = useState("");
  const t = VIDEO_TYPES.find((x) => x.name === type);
  return (
    <div className="card">
      <div className="card-header">📺 Video ConnectZ <span className="tag">{t.ratio}</span></div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Video type</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{VIDEO_TYPES.map((x) => <Pill key={x.name} active={type === x.name} onClick={() => setType(x.name)}>{x.name}</Pill>)}</div>
      <MoodPicker mood={mood} setMood={setMood} />
      <div className="form-group"><label>Concept</label><CappedTextarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ height: 56 }} placeholder={`Concept for your ${mood ? mood.toLowerCase() + " " : ""}${type.toLowerCase()}`} /></div>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>🙂 Built from your saved FaceZ. StatZ can lipsync it to a supplied audio track and finish it in VideoZ / DirectZ (ReelZ · EpisodeZ · MovieZ).</p>
      <button className="btn" style={{ width: "100%" }} disabled={!prompt.trim()}>🎬 Generate {mood ? `${mood} ` : ""}{type} ({t.ratio})</button>
      <IntelNote role="Videographer" reusable />
    </div>
  );
}

function SentenceConnectZ() {
  const { state } = useAppState();
  // Contracts & royalty agreements are gated to Manager / A&R Scout personas.
  const isBiz = isBizPersona(state.personas);
  const [doc, setDoc] = useState(DOC_TYPES[0].name);
  const [rhyme, setRhyme] = useState(2);
  const [genre, setGenre] = useState(INSTR_GENRES[0]);
  const [prompt, setPrompt] = useState("");
  const isLyrics = doc === "Lyrics";
  const isLegal = DOC_TYPES.find((d) => d.name === doc)?.gated;
  return (
    <div className="card">
      <div className="card-header">📃 Sentence ConnectZ <span className="tag">Corey voice</span></div>
      <label style={{ fontSize: 11, color: "var(--text-light)" }}>Document type</label>
      <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>
        {DOC_TYPES.map((d) => {
          const locked = d.gated && !isBiz;
          return (
            <Pill key={d.name} active={doc === d.name} onClick={() => !locked && setDoc(d.name)}>
              {locked ? "🔒 " : ""}{d.name}
            </Pill>
          );
        })}
      </div>
      {DOC_TYPES.find((d) => d.name === doc)?.gated && !isBiz && (
        <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginBottom: 8 }}>🔒 Contracts &amp; royalty agreements need a Manager or A&amp;R Scout persona.</p>
      )}
      <div className="form-group"><label>Describe the topic (text or paste media link)</label>
        <CappedTextarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ height: 52 }} placeholder={isLyrics ? "What's the song about?" : `Brief for your ${doc.toLowerCase()}`} /></div>
      {isLyrics && (
        <>
          <label style={{ fontSize: 11, color: "var(--text-light)" }}>Genre</label>
          <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>{INSTR_GENRES.map((g) => <Pill key={g} active={genre === g} onClick={() => setGenre(g)}>{g}</Pill>)}</div>
          <div className="form-group"><label>Rhyme scheme: last {rhyme} syllable{rhyme === 1 ? "" : "s"} of each line must rhyme</label>
            <input type="range" min="1" max="6" value={rhyme} onChange={(e) => setRhyme(+e.target.value)} /></div>
        </>
      )}
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 10 }}>Written in Corey voice · toggles for language, Explicit / Slang / Emoji.</p>
      {isLegal && <LegalDisclaimer />}
      <button className="btn" style={{ width: "100%" }} disabled={!prompt.trim()}>✍️ Generate {doc}</button>
      <IntelNote role="Ghostwriter" reusable />
    </div>
  );
}

// OCC's Corey-voice replies — keyword-aware, Claude Code-style: acknowledge,
// lay out the plan, offer the next move. Returns { text, action? }.
function occReply(text, t, knowledge = []) {
  const q = text.toLowerCase();
  const plan = (steps) => steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  // If the member has taught Corey GPT something relevant, lead with it.
  const taught = (knowledge || []).find((k) => k.text && q.split(/\s+/).some((w) => w.length > 3 && k.text.toLowerCase().includes(w)));
  // College-course questions: teach from the built-in curriculum.
  const course = courseForQuery(text);
  if (course && /(teach|learn|explain|what is|how do|course|lesson|help me with|study)/.test(q)) {
    const lessons = course.modules.flatMap((m) => m.lessons).slice(0, 6);
    return {
      text: `${course.emoji} ${course.name} — I got you.${taught ? `\n\n📝 You taught me: ${taught.text}` : ""}\n\nHere's the track I'd run you through:\n${lessons.map((l, i) => `${i + 1}. ${l}`).join("\n")}\n\nOpen the 🎓 LearnZ tab for the full course, or ask me about any one of these and I'll break it down.`,
    };
  }
  if (taught) {
    return { text: `📝 From what you taught me: ${taught.text}\n\nWant me to go deeper or apply it to what you're building?` };
  }
  if (/game|arcade|platformer|shooter|puzzle|rpg/.test(q)) {
    return {
      text: `Say less — a ${t.complexity.toLowerCase()} game is right in my lane on the ${t.label} tier (${t.languages[0]}).\n\nHere's the play:\n${plan(["Lock the core loop — one mechanic that's actually fun", "Build the scene + controls", "Add scoring, juice, and a win/lose state", "Ship it straight to GameZ so people can play"])}\n\nWant me to spin it up and drop it on GameZ?`,
      action: { kind: "game", label: "🎮 Publish it to GameZ" },
    };
  }
  if (/bug|error|broken|fix|crash|not work/.test(q)) {
    return { text: `Aight, let's squash it. Paste me the error and the file it's screaming about. I'll:\n${plan(["Read the stack trace top-down — the real cause is usually near the top", "Reproduce it in my head, then in code", "Patch the smallest thing that fixes it — no shotgun edits", "Re-run and prove it's dead"])}\n\nDrop the error when you're ready.` };
  }
  if (/site|website|landing|page|html|css/.test(q)) {
    return { text: `Bet. A clean site's a quick W. My move:\n${plan(["Nail the one message above the fold", "Mobile-first layout — most of your traffic is on a phone", "Neon it up to match your brand", "Wire the CTA to something real"])}\n\nTell me what it's for and who's landing on it.` };
  }
  if (/api|backend|server|database|endpoint/.test(q)) {
    return { text: `Backend work — my favorite kind of quiet. Plan:\n${plan(["Define the data shape first, everything hangs off that", "Endpoints that do one thing each", "Validate every input server-side — never trust the client", "Enforce the dev tax on any money path"])}\n\nWhat's it gotta do?` };
  }
  return { text: `I got you. Give me the goal in one line and I'll break it down like this:\n${plan(["What we're actually building", "The simplest version that works", "Ship it, then make it nice"])}\n\nOn the ${t.label} tier I can go ${t.complexity.toLowerCase()} — ${t.desc}` };
}

// OCC tab set — the Claude-Code-style workspace. Each is name + emoji + panel.
const OCC_TABS = [
  { key: "editor", label: "Editor", emoji: "👁️‍🗨️" },
  { key: "learnz", label: "LearnZ", emoji: "🎓" },
  { key: "exportz", label: "ExportZ", emoji: "📤" },
  { key: "gitz", label: "GitZ", emoji: "🐙" },
  { key: "taskz", label: "TaskZ", emoji: "📑" },
  { key: "codez", label: "CodeZ", emoji: "🧩" },
  { key: "pathz", label: "PathZ", emoji: "🛤️" },
  { key: "mistakez", label: "MistakeZ", emoji: "😢" },
  { key: "habitz", label: "HabitZ", emoji: "🫠" },
  { key: "console", label: "Console", emoji: "🖥️" },
  { key: "tellz", label: "TellZ", emoji: "🗣️" },
  { key: "logz", label: "LogZ", emoji: "🪵" },
  { key: "search", label: "Search", emoji: "🔍" },
  { key: "settings", label: "Settings", emoji: "⚙️" },
];

const OCC_TASK_STATUS = {
  queued: { label: "Queued", emoji: "🕒" },
  running: { label: "In progress", emoji: "⚙️" },
  done: { label: "Done", emoji: "✅" },
};
const UNDO_WINDOW_MS = 60000; // members can undo an OCC edit within a minute.

// OCC's AI voices/models + curricula live in aiModels.js (shared with billing).
const OCC_MODELS = OCC_AI_MODELS;
const occModel = aiModel;

function OccWorkspace({ tier, onOpen, serverOk, syncEconomy }) {
  const t = occTierFor(tier);
  const { state, update } = useAppState();
  const author = state.user?.name || "you";
  const occ = state.occ || { tasks: [], codez: [], paths: [], mistakes: [], habits: [], tell: [], log: [], knowledge: [], settings: { automated: false, suggestions: true } };
  const [tab, setTab] = useState("editor");

  // Persist a partial patch into state.occ.
  const patch = (p) => update({ occ: { ...occ, ...p } });
  const now = () => Date.now();
  const logAction = (kind, text) => patch({ log: [{ id: now(), kind, text, at: now() }, ...(occ.log || [])].slice(0, 300) });

  return (
    <div className="card">
      <div className="card-header">
        <span>👁️‍🗨️ Ocular Code ConnectZ <span className="tag">{t.label} · {t.complexity}</span></span>
        <span style={{ display: "flex", gap: 6 }}>
          <span className="tag">{occModel(occ.settings?.model).emoji} {occModel(occ.settings?.model).label}</span>
          {occ.settings?.automated && <span className="tag" style={{ color: "var(--gold, #ffcf3f)" }}>🤖 auto</span>}
          {occ.settings?.suggestions && <span className="tag">💭 tips</span>}
        </span>
      </div>

      {/* Tab bar */}
      <div className="chip-wrap" style={{ marginBottom: 12 }}>
        {OCC_TABS.map((x) => (
          <button key={x.key} className={`heritage-chip${tab === x.key ? " sel" : ""}`} onClick={() => setTab(x.key)}>{x.emoji} {x.label}</button>
        ))}
        <button className="heritage-chip" onClick={() => onOpen?.("callz")}>📞 CallZ</button>
        <button className="heritage-chip" onClick={() => onOpen?.("filez")}>📁 FileZ</button>
      </div>

      {tab === "editor" && <OccEditor t={t} author={author} occ={occ} patch={patch} logAction={logAction} onOpen={onOpen} serverOk={serverOk} syncEconomy={syncEconomy} />}
      {tab === "learnz" && <OccLearnZ occ={occ} patch={patch} />}
      {tab === "exportz" && <OccExportZ occ={occ} patch={patch} logAction={logAction} onOpen={onOpen} />}
      {tab === "gitz" && <OccGitZ occ={occ} patch={patch} logAction={logAction} />}
      {tab === "taskz" && <OccTaskZ occ={occ} patch={patch} logAction={logAction} />}
      {tab === "codez" && <OccCodeZ occ={occ} patch={patch} />}
      {tab === "pathz" && <OccPathZ occ={occ} patch={patch} />}
      {tab === "mistakez" && <OccNotes occ={occ} patch={patch} field="mistakes" title="😢 MistakeZ" hint="Errors OCC made — logged so it doesn't repeat them." />}
      {tab === "habitz" && <OccNotes occ={occ} patch={patch} field="habits" title="🫠 HabitZ" hint="Things you repeat — OCC notes the pattern and adapts." />}
      {tab === "console" && <OccLog rows={occ.log} title="🖥️ Output / Console" empty="No output yet — OCC logs every action it takes here." />}
      {tab === "tellz" && <OccTellZ occ={occ} patch={patch} />}
      {tab === "logz" && <OccLogZ rows={occ.log} />}
      {tab === "search" && <OccSearch occ={occ} />}
      {tab === "settings" && <OccSettings occ={occ} patch={patch} logAction={logAction} tier={tier} />}

      <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 10 }}>🔐 Any attempt to access Music ConnectZ repos is flagged, prevented, and alerts the owner — unless it's the owner. Media requests route to the matching Intelligence app.</p>
      <IntelNote role="Developer" />
    </div>
  );
}

// --- Editor tab: the chat + game publish + git-as-a-task ---
function OccEditor({ t, author, occ, patch, logAction, onOpen, serverOk, syncEconomy }) {
  const { state, addTo } = useAppState();
  const [notice, setNotice] = useState("");
  const model = occModel(occ.settings?.model);
  const greeting = model.id === "corey-gpt"
    ? `Yo — I'm OCC, your code hand. Tell me what you're building and I'll break it down, write it, and ship it. On the ${t.label} tier we're going ${t.complexity.toLowerCase()}.`
    : model.id === "technical"
      ? `OCC ready. ${t.label} tier · ${t.complexity} complexity. State the goal; I'll return a plan and code.`
      : `Hi, I'm OCC. Tell me what you'd like to build and I'll plan it, write it, and ship it. You're on the ${t.label} tier (${t.complexity.toLowerCase()}).`;
  const [msgs, setMsgs] = useState([{ role: "occ", text: greeting }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, thinking]);

  const addTask = (text, eta) => patch({ tasks: [{ id: Date.now(), text, status: "queued", eta, at: Date.now() }, ...(occ.tasks || [])] });

  // Templated fallback when the live LLM backend is unavailable.
  const localReply = (text) => {
    const r = occReply(text, t, occ.knowledge);
    setMsgs((m) => [...m, { role: "occ", text: r.text, action: r.action }]);
  };
  const afterReply = (text) => {
    // SuggestionZ: OCC proposes the work as a task. Automated: it also logs a start.
    if (occ.settings?.suggestions) addTask(`OCC: ${text.slice(0, 60)}`, "~5 min");
    if (occ.settings?.automated) logAction("auto", `Auto-started work on: ${text.slice(0, 60)}`);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    // Every prompt is remembered in TellZ.
    patch({ tell: [{ id: Date.now(), tab: "OCC Editor", text, at: Date.now() }, ...(occ.tell || [])].slice(0, 200) });
    setThinking(true);

    if (serverOk) {
      try {
        // Live LLM reply — server charges the minimum model cost on success.
        const hist = msgs.filter((m) => m.text).slice(-8).map((m) => ({ role: m.role, text: m.text }));
        const acronyms = (occ.codez || []).map((x) => ({ term: x.term, means: x.means }));
        const r = await occChatApi({ model: model.id, prompt: text, knowledge: occ.knowledge || [], history: hist, slang: !!state.settings?.coreySlang, acronyms, suggest: !!occ.settings?.suggestions });
        setMsgs((m) => [...m, { role: "occ", text: r.text }]);
        setNotice(`${model.emoji} ${model.label} · ${centsLabel(r.cost_cents)} · balance ${money(r.money)}`);
        syncEconomy?.();
        afterReply(text);
        setThinking(false);
        return;
      } catch (e) {
        const msg = String(e?.message || e);
        if (msg.includes("402") || e?.status === 402) {
          setMsgs((m) => [...m, { role: "occ", text: `You're short on balance for ${model.label} (${centsLabel(model.costCents)}/message). Add funds in Money, or switch to Corey GPT — it's the cheapest.` }]);
          setThinking(false);
          return;
        }
        // 503 / offline → fall back to the built-in templated reply (no charge).
        setNotice(`${model.emoji} ${model.label} · offline replies (set ANTHROPIC_API_KEY on the backend for live Corey GPT)`);
      }
    } else {
      setNotice(`${model.emoji} ${model.label} · ${centsLabel(model.costCents)}/message — live when connected`);
    }
    setTimeout(() => { localReply(text); afterReply(text); setThinking(false); }, 400);
  };

  const publishGame = () => {
    const name = `OCC Build ${Math.floor(Math.random() * 900 + 100)}`;
    addTo("games", {
      id: `g-${Date.now()}`, title: name, author, genre: "Casual / Idle", subgenre: "Hyper-Casual", lang: t.languages[0],
      plays: 0, rating: null, mine: true, desc: `A ${t.complexity.toLowerCase()} game built in ${t.languages[0]} via Ocular Code ConnectZ.`,
    });
    logAction("ship", `Published "${name}" to GameZ`);
    onOpen?.("gamez");
  };

  const commitGit = () => {
    // Git integration is itself a task — surfaced with why/what/how.
    const def = (occ.repos || []).find((r) => r.id === occ.defaultRepo);
    const target = def ? `${def.owner}/${def.name} (${def.branch})` : "the default repo — set one in GitZ";
    addTask(`Git: commit + push to ${target}`, "~1 min");
    logAction("git", `Queued git commit + push → ${target}`);
  };

  return (
    <>
      <div style={{ background: "#0c0a16", borderRadius: 12, padding: 10, maxHeight: 340, overflowY: "auto", marginBottom: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
            <div style={{
              maxWidth: "85%", padding: "8px 11px", borderRadius: 12, fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap",
              background: m.role === "user" ? "var(--accent, #22e6ff)" : "rgba(255,255,255,0.06)",
              color: m.role === "user" ? "#04121a" : "var(--text, #eee)",
              border: m.role === "user" ? "none" : "1px solid var(--border)",
            }}>
              {m.role === "occ" && <div style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 2 }}>👁️‍🗨️ OCC</div>}
              {m.text}
              {m.action?.kind === "game" && (
                <div style={{ marginTop: 8 }}><button className="btn btn-small" onClick={publishGame}>{m.action.label}</button></div>
              )}
            </div>
          </div>
        ))}
        {thinking && <div style={{ fontSize: 11, color: "var(--text-light)", padding: "2px 4px" }}>👁️‍🗨️ OCC is thinking…</div>}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Tell OCC what to build…" style={{ flex: 1 }} />
        <button className="btn btn-small" onClick={send} disabled={!input.trim() || thinking}>Send</button>
      </div>
      {serverOk && <MediaCapture onUploaded={(m) => { if (m?.url) setInput((t) => `${t}${t ? " " : ""}[reference clip: ${m.url}]`); }} compact />}
      <p style={{ fontSize: 10, color: notice ? "var(--success)" : "var(--text-light)", marginTop: 4 }}>
        {notice || `${model.emoji} ${model.label} · ${centsLabel(model.costCents)}/message — you're only charged the minimum to cover the model. Corey GPT is the cheapest.`}
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button className="btn btn-small btn-secondary" onClick={commitGit}>🔀 Git commit (as task)</button>
        <button className="btn btn-small btn-secondary" onClick={() => onOpen?.("gamez")}>👾 Open GameZ</button>
      </div>
      <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>
        💻 On {t.label} you can build in: {t.languages.join(", ")}.
        {" "}{/statz|stat|debug/i.test(t.label) ? "C++ / Unreal is unlocked." : "C++ / Unreal is StatZ-only (Unreal is reserved for StatZ)."}
      </p>
      <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 4 }}>OCC plans and ships in Corey voice. Git integration runs as a task in TaskZ. Live code-writing/running turns on when the AI backend key is set.</p>
    </>
  );
}

// --- LearnZ: the college courses Corey GPT teaches + what you teach it back ---
function OccLearnZ({ occ, patch }) {
  const [open, setOpen] = useState(null); // expanded course id
  const [course, setCourse] = useState(CURRICULA[0].id);
  const [text, setText] = useState("");
  const knowledge = occ.knowledge || [];
  const teach = () => {
    if (!text.trim()) return;
    patch({ knowledge: [{ id: Date.now(), course, text: text.trim(), at: Date.now() }, ...knowledge] });
    setText("");
  };
  const forget = (id) => patch({ knowledge: knowledge.filter((k) => k.id !== id) });
  return (
    <>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>🎓 Corey GPT is taught these college courses — and it learns from what you teach it. Ask about any of these in the Editor.</p>
      {CURRICULA.map((c) => (
        <div key={c.id} className="card" style={{ marginBottom: 8 }}>
          <div className="card-header" style={{ cursor: "pointer" }} onClick={() => setOpen(open === c.id ? null : c.id)}>
            <span>{c.emoji} {c.name}</span>
            <span className="tag">{open === c.id ? "▲" : "▼"}</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-light)" }}>{c.blurb}</p>
          {open === c.id && c.modules.map((m) => (
            <div key={m.title} style={{ marginTop: 8 }}>
              <div className="modal-sub-title">{m.title}</div>
              {m.lessons.map((l) => <div key={l} className="skill-item"><span className="skill-item-name" style={{ fontSize: 12 }}>• {l}</span></div>)}
            </div>
          ))}
        </div>
      ))}

      <div className="card">
        <div className="card-header">📝 Teach Corey GPT</div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Add your own knowledge — a fact, a rule, how you like things done. OCC folds it into its answers.</p>
        <div className="chip-wrap" style={{ marginBottom: 8 }}>
          {CURRICULA.map((c) => <button key={c.id} className={`heritage-chip${course === c.id ? " sel" : ""}`} onClick={() => setCourse(c.id)}>{c.emoji} {c.name}</button>)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && teach()} placeholder="Teach OCC something…" style={{ flex: 1 }} />
          <button className="btn btn-small" onClick={teach} disabled={!text.trim()}>Teach</button>
        </div>
      </div>

      {knowledge.length > 0 && (
        <div className="card">
          <div className="card-header">🧠 What you've taught it <span className="tag">{knowledge.length}</span></div>
          {knowledge.map((k) => {
            const c = CURRICULA.find((x) => x.id === k.course);
            return (
              <div key={k.id} className="post-card">
                <div className="post-user">{c ? `${c.emoji} ${c.name}` : "General"}</div>
                <div className="post-content">{k.text}</div>
                <button className="btn btn-small btn-secondary" style={{ marginTop: 6 }} onClick={() => forget(k.id)}>🗑 Forget</button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// --- ExportZ: route OCC media exports to the matching Intelligence app ---
function OccExportZ({ occ, patch, logAction, onOpen }) {
  const [name, setName] = useState("");
  const exports = occ.exports || [];
  const route = name.trim() ? routeForFile(name.trim()) : null;
  const doExport = (fileName) => {
    const nm = (fileName || name).trim();
    if (!nm) return;
    const r = routeForFile(nm);
    const rec = { id: Date.now(), name: nm, ext: extOf(nm) || "—", category: r.category, app: r.app, at: Date.now() };
    patch({ exports: [rec, ...exports].slice(0, 200) });
    logAction("export", `Exported ${nm} → ${r.label} (${r.category})`);
    setName("");
  };
  const pickFile = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => doExport(f.name));
    e.target.value = "";
  };
  const remove = (id) => patch({ exports: exports.filter((x) => x.id !== id) });
  return (
    <>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>
        📤 OCC sends every export to the matching Intelligence app by media type — images (all types, incl. <strong>.ico</strong>) → ImageConnectZ, video → VideoConnectZ, audio → InstrumentalConnectZ, text/docs → SentenceConnectZ, code stays in OCC. Exports are delivered to every other member's matching app (not the owner's).
      </p>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doExport()} placeholder="filename.ext (e.g. cover.ico, track.wav, hook.mp4)" style={{ flex: 1 }} />
        <button className="btn btn-small" onClick={() => doExport()} disabled={!name.trim()}>📤 Export</button>
      </div>
      {route && <p style={{ fontSize: 11, color: "var(--accent, #22e6ff)", marginBottom: 8 }}>→ routes to {route.emoji} {route.label} ({route.category})</p>}
      <label className="btn btn-small btn-secondary" style={{ display: "inline-block", marginBottom: 10, cursor: "pointer" }}>
        📁 Pick file(s) to export<input type="file" multiple onChange={pickFile} style={{ display: "none" }} />
      </label>

      <div className="chip-wrap" style={{ marginBottom: 10 }}>
        {MEDIA_ROUTES.map((r) => (
          <button key={r.app} className="heritage-chip" onClick={() => onOpen?.("intelligence")}>{r.emoji} {r.label}</button>
        ))}
      </div>

      {exports.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No exports yet — export a file and OCC routes it to the right Intelligence app.</p>
        : exports.map((x) => {
          const r = ROUTE_BY_APP[x.app] || { emoji: "📄", label: x.app };
          return (
            <div key={x.id} className="post-card">
              <div className="post-user">{r.emoji} {x.name} <span className="tag">.{x.ext}</span> <span className="tag" style={{ color: "var(--success)" }}>→ {r.label}</span></div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button className="btn btn-small" onClick={() => onOpen?.("intelligence")}>Open {r.label}</button>
                <button className="btn btn-small btn-secondary" onClick={() => remove(x.id)}>🗑</button>
              </div>
            </div>
          );
        })}
    </>
  );
}

// Strip shown at the top of an Intelligence sub-app listing OCC exports routed
// to it. `appId` matches the IntelligencePage sub-app (image/video/instrumental/…).
function OccExportsStrip({ appId }) {
  const { state } = useAppState();
  const mine = (state.occ?.exports || []).filter((x) => x.app === appId);
  if (mine.length === 0) return null;
  const r = ROUTE_BY_APP[appId] || {};
  return (
    <div className="card" style={{ border: "1px dashed var(--primary)" }}>
      <div className="card-header"><span>📤 OCC exports {r.emoji}</span><span className="tag">{mine.length}</span></div>
      <p style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 6 }}>Media OCC routed here by type. On other members' accounts these arrive automatically.</p>
      <div className="chip-wrap">
        {mine.slice(0, 12).map((x) => <span key={x.id} className="tag">{x.name}</span>)}
      </div>
    </div>
  );
}

// --- GitZ: the GitHub repos OCC commits to, with a default target ---
const OCC_SUGGESTED_REPOS = [
  { owner: "ctkoth", name: "-music-connectz-frontend-", branch: "main" },
  { owner: "ctkoth", name: "music-connectz-backend", branch: "main" },
];
function OccGitZ({ occ, patch, logAction }) {
  const repos = occ.repos || [];
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("main");
  const addRepo = (o, n, b) => {
    const owner2 = (o ?? owner).trim(); const name2 = (n ?? name).trim(); const branch2 = (b ?? branch).trim() || "main";
    if (!owner2 || !name2) return;
    if (repos.some((r) => r.owner === owner2 && r.name === name2)) return;
    const id = Date.now();
    const next = [{ id, owner: owner2, name: name2, branch: branch2 }, ...repos];
    patch({ repos: next, defaultRepo: occ.defaultRepo || id });
    logAction("git", `Connected repo ${owner2}/${name2}`);
    setOwner(""); setName(""); setBranch("main");
  };
  const setDefault = (id) => { patch({ defaultRepo: id }); logAction("git", `Default commit target set to ${id}`); };
  const remove = (id) => patch({ repos: repos.filter((r) => r.id !== id), defaultRepo: occ.defaultRepo === id ? null : occ.defaultRepo });
  const def = repos.find((r) => r.id === occ.defaultRepo);
  return (
    <>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>🐙 The GitHub repositories OCC commits to. Set a default and every 🔀 git task ships there.</p>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="card-header">🎯 Default commit target</div>
        {def ? <p style={{ fontSize: 13 }}>{def.owner}/<strong>{def.name}</strong> <span className="tag">{def.branch}</span></p>
          : <p style={{ fontSize: 12, color: "var(--text-light)" }}>No default yet — add a repo and pin it.</p>}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="owner" style={{ flex: 1, minWidth: 90 }} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="repo" style={{ flex: 1.3, minWidth: 110 }} />
        <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="branch" style={{ width: 90 }} />
        <button className="btn btn-small" onClick={() => addRepo()} disabled={!owner.trim() || !name.trim()}>+ Add</button>
      </div>
      {OCC_SUGGESTED_REPOS.filter((s) => !repos.some((r) => r.owner === s.owner && r.name === s.name)).length > 0 && (
        <div className="chip-wrap" style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 10, color: "var(--text-light)", alignSelf: "center" }}>Quick add:</span>
          {OCC_SUGGESTED_REPOS.filter((s) => !repos.some((r) => r.owner === s.owner && r.name === s.name)).map((s) => (
            <button key={s.name} className="heritage-chip" onClick={() => addRepo(s.owner, s.name, s.branch)}>➕ {s.name}</button>
          ))}
        </div>
      )}
      {repos.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No repos connected yet.</p>
        : repos.map((r) => (
          <div key={r.id} className="post-card">
            <div className="post-user">🐙 {r.owner}/{r.name} <span className="tag">{r.branch}</span> {occ.defaultRepo === r.id && <span className="tag" style={{ color: "var(--success)" }}>● default</span>}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {occ.defaultRepo !== r.id && <button className="btn btn-small" onClick={() => setDefault(r.id)}>🎯 Make default</button>}
              <button className="btn btn-small btn-secondary" onClick={() => remove(r.id)}>🗑 Remove</button>
            </div>
          </div>
        ))}
      <p style={{ fontSize: 10, color: "var(--text-light)", marginTop: 8 }}>Connecting here tells OCC where to commit. Live push runs through the platform's GitHub integration once your account's authorized.</p>
    </>
  );
}

// --- TaskZ: OCC's task queue with status, ETA and a 60s undo window ---
function OccTaskZ({ occ, patch, logAction }) {
  const [text, setText] = useState("");
  const tasks = occ.tasks || [];
  const add = () => { if (!text.trim()) return; patch({ tasks: [{ id: Date.now(), text: text.trim(), status: "queued", eta: "~5 min", at: Date.now() }, ...tasks] }); setText(""); };
  const setStatus = (id, status) => {
    patch({ tasks: tasks.map((x) => (x.id === id ? { ...x, status, undoUntil: status === "done" ? Date.now() + UNDO_WINDOW_MS : x.undoUntil } : x)) });
    if (status === "done") logAction("task", `Completed task ${id}`);
  };
  const undo = (id) => { patch({ tasks: tasks.map((x) => (x.id === id ? { ...x, status: "queued", undoUntil: null } : x)) }); logAction("undo", `Undid task ${id}`); };
  const remove = (id) => patch({ tasks: tasks.filter((x) => x.id !== id) });
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add a task for OCC…" style={{ flex: 1 }} />
        <button className="btn btn-small" onClick={add} disabled={!text.trim()}>Add</button>
      </div>
      {tasks.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No tasks yet. Ask OCC in the Editor and it queues the work here with live status + ETA.</p>
        : tasks.map((x) => {
          const s = OCC_TASK_STATUS[x.status] || OCC_TASK_STATUS.queued;
          const canUndo = x.status === "done" && x.undoUntil && x.undoUntil > Date.now();
          return (
            <div key={x.id} className="post-card">
              <div className="post-user">{s.emoji} {x.text} <span className="tag">{s.label}</span> {x.eta && x.status !== "done" && <span className="tag">ETA {x.eta}</span>}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {x.status === "queued" && <button className="btn btn-small" onClick={() => setStatus(x.id, "running")}>▶ Start</button>}
                {x.status === "running" && <button className="btn btn-small btn-success" onClick={() => setStatus(x.id, "done")}>✅ Done</button>}
                {canUndo && <button className="btn btn-small btn-secondary" onClick={() => undo(x.id)}>↩ Undo (60s)</button>}
                <button className="btn btn-small btn-secondary" onClick={() => remove(x.id)}>🗑 Remove</button>
              </div>
            </div>
          );
        })}
    </>
  );
}

// --- CodeZ: acronyms/typos/slang the user types, with tallies + sort ---
function OccCodeZ({ occ, patch }) {
  const [term, setTerm] = useState("");
  const [means, setMeans] = useState("");
  const [desc, setDesc] = useState(true); // sort by count descending
  const rows = [...(occ.codez || [])].sort((a, b) => (desc ? b.count - a.count : a.count - b.count));
  const add = () => {
    if (!term.trim()) return;
    const existing = (occ.codez || []).find((x) => x.term.toLowerCase() === term.trim().toLowerCase());
    if (existing) patch({ codez: occ.codez.map((x) => (x.id === existing.id ? { ...x, count: x.count + 1, means: means.trim() || x.means } : x)) });
    else patch({ codez: [{ id: Date.now(), term: term.trim(), means: means.trim(), count: 1 }, ...(occ.codez || [])] });
    setTerm(""); setMeans("");
  };
  return (
    <>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Acronyms, typos and slang you type that mean something else — OCC tallies each so it learns your shorthand.</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="term (e.g. 'occ')" style={{ flex: 1 }} />
        <input value={means} onChange={(e) => setMeans(e.target.value)} placeholder="means…" style={{ flex: 1.4 }} />
        <button className="btn btn-small" onClick={add} disabled={!term.trim()}>+ / tally</button>
      </div>
      <div className="chip-wrap" style={{ marginBottom: 8 }}>
        <button className={`heritage-chip${desc ? " sel" : ""}`} onClick={() => setDesc(true)}>▼ Most used</button>
        <button className={`heritage-chip${!desc ? " sel" : ""}`} onClick={() => setDesc(false)}>▲ Least used</button>
      </div>
      {rows.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>Nothing tracked yet.</p>
        : rows.map((x) => (
          <div key={x.id} className="settings-toggle">
            <label>{x.term}{x.means && <span style={{ color: "var(--text-light)" }}> → {x.means}</span>}</label>
            <span className="tag">×{x.count}</span>
          </div>
        ))}
    </>
  );
}

// --- PathZ: cross-device user paths, full CRUD ---
function OccPathZ({ occ, patch }) {
  const [device, setDevice] = useState("");
  const [path, setPath] = useState("");
  const paths = occ.paths || [];
  const add = () => { if (!device.trim() || !path.trim()) return; patch({ paths: [{ id: Date.now(), device: device.trim(), path: path.trim() }, ...paths] }); setDevice(""); setPath(""); };
  const remove = (id) => patch({ paths: paths.filter((x) => x.id !== id) });
  return (
    <>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Your working paths across devices — OCC keeps them in sync so a build picks up where you left off.</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input value={device} onChange={(e) => setDevice(e.target.value)} placeholder="device (Phone / Laptop)" style={{ flex: 1 }} />
        <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/path/to/project" style={{ flex: 1.6 }} />
        <button className="btn btn-small" onClick={add} disabled={!device.trim() || !path.trim()}>Add</button>
      </div>
      {paths.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No paths yet.</p>
        : paths.map((x) => (
          <div key={x.id} className="post-card">
            <div className="post-user">🛤️ {x.device}</div>
            <div className="post-meta" style={{ wordBreak: "break-all" }}>{x.path}</div>
            <button className="btn btn-small btn-secondary" style={{ marginTop: 6 }} onClick={() => remove(x.id)}>🗑 Remove</button>
          </div>
        ))}
    </>
  );
}

// --- Generic notes tab (MistakeZ / HabitZ) ---
function OccNotes({ occ, patch, field, title, hint }) {
  const [text, setText] = useState("");
  const rows = occ[field] || [];
  const add = () => { if (!text.trim()) return; patch({ [field]: [{ id: Date.now(), text: text.trim(), at: Date.now() }, ...rows] }); setText(""); };
  const remove = (id) => patch({ [field]: rows.filter((x) => x.id !== id) });
  return (
    <>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>{hint}</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={`Add to ${title.replace(/^\S+\s/, "")}…`} style={{ flex: 1 }} />
        <button className="btn btn-small" onClick={add} disabled={!text.trim()}>Add</button>
      </div>
      {rows.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>Nothing noted yet.</p>
        : rows.map((x) => (
          <div key={x.id} className="post-card">
            <div className="post-content">{x.text}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span className="post-meta">{new Date(x.at).toLocaleString()}</span>
              <button className="btn btn-small btn-secondary" onClick={() => remove(x.id)}>🗑</button>
            </div>
          </div>
        ))}
    </>
  );
}

// --- TellZ: prompts/posts log ---
function OccTellZ({ occ }) {
  const { state, update } = useAppState();
  const rows = occ.tell || [];
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState("");
  const saveEdit = (x) => {
    const tell = (state.occ?.tell || []).map((t) => t.id === x.id
      ? { ...t, text: draft.trim(), editedAt: Date.now(), edit_history: [...(t.edit_history || []), { body: t.text, at: new Date().toISOString() }] }
      : t);
    update({ occ: { ...state.occ, tell } });
    setEditId(null);
  };
  return (
    <>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>🗣️ Everything you've prompted OCC — a running record across the workspace. Edit a prompt while your tier's edit window is open.</p>
      {rows.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>Nothing logged yet.</p>
        : rows.map((x) => (
          <div key={x.id} className="post-card">
            <div className="post-user">{x.tab}</div>
            {editId === x.id ? (
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-small btn-success" onClick={() => saveEdit(x)} disabled={!draft.trim()}>Save</button>
                <button className="btn btn-small btn-secondary" onClick={() => setEditId(null)}>✕</button>
              </div>
            ) : <div className="post-content">{x.text}</div>}
            <div className="post-meta" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {new Date(x.at).toLocaleString()}
              {editId !== x.id && <EditCountdown createdAt={x.at} mine onEdit={() => { setEditId(x.id); setDraft(x.text); }} />}
              <EditZHistory history={x.edit_history} editedAt={x.editedAt} field="body" />
            </div>
          </div>
        ))}
    </>
  );
}

// --- Console / raw action log ---
function OccLog({ rows, title, empty }) {
  const list = rows || [];
  return (
    <>
      {title && <div className="modal-sub-title" style={{ marginBottom: 8 }}>{title}</div>}
      {list.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>{empty || "Nothing logged yet."}</p>
        : <div style={{ background: "#0c0a16", borderRadius: 10, padding: 10, fontFamily: "monospace", fontSize: 12, maxHeight: 340, overflowY: "auto" }}>
          {list.map((x) => (
            <div key={x.id} style={{ color: "var(--text-light)", marginBottom: 4 }}>
              <span style={{ color: "var(--accent, #22e6ff)" }}>[{new Date(x.at).toLocaleTimeString()}]</span> {x.kind ? `${x.kind}: ` : ""}{x.text}
            </div>
          ))}
        </div>}
    </>
  );
}

// --- LogZ: filter the action log by range ---
function OccLogZ({ rows }) {
  const [range, setRange] = useState("day");
  const spans = { day: 864e5, week: 6048e5, month: 2592e6 };
  const cutoff = range === "all" ? 0 : Date.now() - (spans[range] || 864e5);
  const list = (rows || []).filter((x) => x.at >= cutoff);
  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 8 }}>
        {[["day", "Today"], ["week", "This week"], ["month", "This month"], ["all", "All time"]].map(([k, l]) => (
          <button key={k} className={`heritage-chip${range === k ? " sel" : ""}`} onClick={() => setRange(k)}>{l}</button>
        ))}
      </div>
      <OccLog rows={list} title={`🪵 ${list.length} entr${list.length === 1 ? "y" : "ies"}`} empty="Nothing in this range." />
    </>
  );
}

// --- Search across every OCC tab ---
function OccSearch({ occ }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const hits = !query ? [] : [
    ...(occ.tasks || []).map((x) => ({ where: "TaskZ", text: x.text })),
    ...(occ.codez || []).map((x) => ({ where: "CodeZ", text: `${x.term} → ${x.means}` })),
    ...(occ.paths || []).map((x) => ({ where: "PathZ", text: `${x.device}: ${x.path}` })),
    ...(occ.mistakes || []).map((x) => ({ where: "MistakeZ", text: x.text })),
    ...(occ.habits || []).map((x) => ({ where: "HabitZ", text: x.text })),
    ...(occ.tell || []).map((x) => ({ where: "TellZ", text: x.text })),
    ...(occ.log || []).map((x) => ({ where: "Log", text: x.text })),
  ].filter((r) => r.text.toLowerCase().includes(query));
  return (
    <>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search across TaskZ, CodeZ, PathZ, logs…" style={{ marginBottom: 10 }} />
      {!query ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>Type to search everything OCC knows.</p>
        : hits.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No matches.</p>
          : hits.map((r, i) => (
            <div key={i} className="post-card"><div className="post-user">{r.where}</div><div className="post-content">{r.text}</div></div>
          ))}
    </>
  );
}

// --- Settings: Automated + SuggestionZ toggles ---
function OccSettings({ occ, patch, logAction, tier }) {
  const { state, updateSettings } = useAppState();
  const appSettings = state.settings || {};
  const s = occ.settings || {};
  const toggle = (k) => { const next = { ...s, [k]: !s[k] }; patch({ settings: next }); logAction("settings", `${k} → ${next[k] ? "on" : "off"}`); };
  const setModel = (id) => { patch({ settings: { ...s, model: id } }); logAction("settings", `voice → ${id}`); };
  const setLang = (lang) => { patch({ settings: { ...s, language: lang } }); logAction("settings", `default language → ${lang}`); };
  return (
    <>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="card-header">🎙️ OCC voice / language</div>
        <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>How OCC talks to you. Corey GPT is the house voice — how all MCZ speaks.</p>
        <div className="chip-wrap">
          {OCC_MODELS.map((m) => (
            <button key={m.id} className={`heritage-chip${(s.model || "corey-gpt") === m.id ? " sel" : ""}`} onClick={() => setModel(m.id)} title={m.note}>{m.emoji} {m.label} · {centsLabel(m.costCents)}</button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--accent, #22e6ff)", marginTop: 6 }}>{occModel(s.model).note} You're charged only the minimum to cover the model — {centsLabel(occModel(s.model).costCents)}/message.</p>
        <div className="settings-toggle" style={{ marginTop: 8 }}>
          <label>🗣️ AAVE colloquialisms (Corey GPT) — off keeps professional docs clean</label>
          <div role="switch" aria-checked={!!appSettings.coreySlang} onClick={() => updateSettings({ coreySlang: !appSettings.coreySlang })} className={`toggle-switch${appSettings.coreySlang ? " active" : ""}`} />
        </div>
        <div className="modal-sub-title" style={{ margin: "12px 0 6px" }}>💻 Default coding language</div>
        <div className="chip-wrap">
          {langsForTier(tier).map((l) => (
            <button key={l.name} className={`heritage-chip${(s.language || "JavaScript / HTML5") === l.name ? " sel" : ""}`} disabled={l.locked} onClick={() => setLang(l.name)} title={l.locked ? `${l.tier}-tier only` : ""} style={l.locked ? { opacity: 0.45 } : undefined}>
              {l.name}{l.locked ? " 🔒" : ""}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-toggle">
        <label>🤖 Automated — OCC performs taskz without asking, just updates you live in LogZ</label>
        <div role="switch" aria-checked={!!s.automated} onClick={() => toggle("automated")} className={`toggle-switch${s.automated ? " active" : ""}`} />
      </div>
      <div className="settings-toggle">
        <label>💭 SuggestionZ — OCC adds taskz explaining the what, why &amp; how before doing them</label>
        <div role="switch" aria-checked={!!s.suggestions} onClick={() => toggle("suggestions")} className={`toggle-switch${s.suggestions ? " active" : ""}`} />
      </div>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 8 }}>
        {s.automated
          ? "🤖 Automated is on — OCC will just do the work and log it. Watch LogZ for the play-by-play."
          : "💭 Suggestion mode — OCC proposes taskz (with why/how) and waits for your go. Flip Automated on to let it run."}
      </p>
    </>
  );
}

// Read an image file and downscale it to a small square thumbnail dataURL so
// it fits in localStorage. Used by FaceZ to bank faces from the user's media.
function fileToThumb(file, size = 128) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = size; c.height = size;
        const ctx = c.getContext("2d");
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function FaceCard({ f, live, onRate, onDelete }) {
  const median = live ? f.median : (f.ratings?.length ? f.ratings.reduce((s, n) => s + n, 0) / f.ratings.length : null);
  const count = live ? f.count : (f.ratings?.length || 0);
  const src = live ? f.url : f.img;
  return (
    <div className="post-card" style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <img src={src} alt={f.name} style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", border: "1px solid var(--border)" }} />
        <div style={{ flex: 1 }}>
          <div className="post-user">{f.name || "Untitled face"} {live && !f.mine && <span style={{ fontSize: 11, color: "var(--text-light)" }}>· @{f.owner}</span>}{f.tagged && <span className="tag" title="Tagged member">🏷️ @{f.tagged}</span>}</div>
          <div style={{ fontSize: 12, color: "var(--gold, #ffcf3f)" }}>
            {median != null ? `💯 ${Number(median).toFixed(1)}/10` : "unrated"} <span style={{ color: "var(--text-light)" }}>· {count} rating{count === 1 ? "" : "s"}</span>
            {live && f.my_rating ? <span style={{ color: "var(--text-light)" }}> · you: {f.my_rating}</span> : null}
          </div>
        </div>
        {onDelete && <button className="btn btn-small btn-secondary" onClick={() => onDelete(f.id)} title="Remove">🗑️</button>}
      </div>
      {onRate && (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 10, color: "var(--text-light)" }}>Rate attractiveness (RateZ)</label>
          <div className="chip-wrap" style={{ marginTop: 4 }}>
            {[1,2,3,4,5,6,7,8,9,10].map((n) => (
              <button key={n} className={`heritage-chip${live && f.my_rating === n ? " sel" : ""}`} style={{ padding: "2px 8px" }} onClick={() => onRate(f.id, n)}>{n}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FaceZTab({ serverOk }) {
  const { state, setList } = useAppState();
  const faces = state.facez || [];
  const [name, setName] = useState("");
  const [tagged, setTagged] = useState("");
  const [busy, setBusy] = useState(false);
  const [server, setServer] = useState(null); // { mine, feed } when live
  const [view, setView] = useState("mine"); // mine | rate

  const reload = () => getFacezApi().then(setServer).catch(() => setServer(null));
  useEffect(() => { if (serverOk) reload(); else setServer(null); }, [serverOk]);

  const add = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      if (server) { await createFaceApi(file, name.trim(), tagged.trim().replace(/^@/, "")); await reload(); }
      else {
        const img = await fileToThumb(file);
        setList("facez", [{ id: `f-${Date.now()}`, name: name.trim() || "Untitled face", tagged: tagged.trim().replace(/^@/, ""), img, ratings: [], at: Date.now() }, ...faces]);
      }
      setName(""); setTagged("");
    } catch { /* ignore bad image */ }
    setBusy(false);
  };

  const rateLocal = (id, score) => setList("facez", faces.map((f) => (f.id === id ? { ...f, ratings: [...(f.ratings || []), score] } : f)));
  const delLocal = (id) => setList("facez", faces.filter((f) => f.id !== id));
  const rateServer = async (id, score) => { try { await rateFaceApi(id, score); reload(); } catch { /* ignore */ } };
  const delServer = async (id) => { try { await deleteFaceApi(id); reload(); } catch { /* ignore */ } };

  const intro = (
    <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 10 }}>
      Bank faces from your media — Image &amp; Video ConnectZ pull from here for likeness. The community rates each face's attractiveness out of 10, and that median feeds your RateZ score / venue filter.
    </p>
  );
  const adder = (
    <>
      <div className="form-group"><label>Name this face (optional)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., My promo look" /></div>
      <div className="form-group"><label>🏷️ Tag the member in it (optional)</label>
        <input value={tagged} onChange={(e) => setTagged(e.target.value)} placeholder="@username — who's in this media" /></div>
      <label className="btn" style={{ width: "100%", display: "block", textAlign: "center", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}>
        {busy ? "Adding…" : "＋ Add face from your media"}
        <input type="file" accept="image/*" style={{ display: "none" }} disabled={busy} onChange={add} />
      </label>
    </>
  );

  // Live: two sub-views — your faces (with community medians) and a feed to rate.
  if (server) {
    return (
      <div className="card">
        <div className="card-header">🙂 FaceZ <span className="tag" style={{ color: "var(--success)" }}>● live</span></div>
        {intro}
        <div className="chip-wrap" style={{ marginBottom: 8 }}>
          <button className={`heritage-chip${view === "mine" ? " sel" : ""}`} onClick={() => setView("mine")}>My FaceZ ({server.mine.length})</button>
          <button className={`heritage-chip${view === "rate" ? " sel" : ""}`} onClick={() => setView("rate")}>Rate faces ({server.feed.length})</button>
        </div>
        {view === "mine" ? (
          <>
            {adder}
            {server.mine.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 12 }}>No faces banked yet.</p>
              : server.mine.map((f) => <FaceCard key={f.id} f={f} live onDelete={delServer} />)}
          </>
        ) : (
          server.feed.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No community faces to rate yet.</p>
            : server.feed.map((f) => <FaceCard key={f.id} f={f} live onRate={rateServer} />)
        )}
      </div>
    );
  }

  // Offline fallback: local face bank with self-ratings.
  return (
    <div className="card">
      <div className="card-header">🙂 FaceZ <span className="tag">offline</span></div>
      {intro}
      {adder}
      {faces.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 12 }}>No faces banked yet.</p>
      ) : faces.map((f) => <FaceCard key={f.id} f={f} live={false} onRate={rateLocal} onDelete={delLocal} />)}
    </div>
  );
}

function IntelligencePage({ tier, onOpen, serverOk, syncEconomy }) {
  const [app, setApp] = useState("facez");
  const Body = { facez: FaceZTab, image: ImageConnectZ, instrumental: InstrumentalConnectZ, mix: MixConnectZ, video: VideoConnectZ, sentence: SentenceConnectZ, occ: OccWorkspace }[app];
  return (
    <>
      <div className="launch-grid" style={{ marginBottom: 14 }}>
        {INTEL_APPS.map((a) => (
          <button key={a.id} className={`app-tile${app === a.id ? " active" : ""}`} onClick={() => setApp(a.id)}>
            <span className="tile-icon"><IconImg icon={a.icon} alt={a.name} /></span>
            <span className="tile-name">{a.name.replace(" ConnectZ", "")}</span>
          </button>
        ))}
      </div>
      <OccExportsStrip appId={app} />
      <Body tier={tier} onOpen={onOpen} serverOk={serverOk} syncEconomy={syncEconomy} />
    </>
  );
}

function FileZPage({ serverOk }) {
  const [state, setState] = useState(null); // { uploads, storage_used_mb, storage_mb, upload_mb, storage_free_mb }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [offline, setOffline] = useState(false);

  const load = () => {
    getUploadsApi().then((r) => { setState(r); setOffline(false); }).catch(() => setOffline(true));
  };
  useEffect(() => { if (serverOk) load(); else setOffline(true); }, [serverOk]);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setErr(""); setBusy(true);
    try {
      const r = await uploadFileApi(file); // server enforces size (413) + quota (409)
      setState(r.upload ? { ...r, uploads: [r.upload, ...(state?.uploads || [])] } : r);
      load();
    } catch (e2) {
      setErr(e2.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setErr("");
    try { const r = await deleteUploadApi(id); setState((s) => ({ ...s, ...r, uploads: (s?.uploads || []).filter((u) => u.id !== id) })); }
    catch (e2) { setErr(e2.message || "Delete failed"); }
  };

  if (offline || !serverOk) {
    return (
      <div className="card">
        <div className="card-header">📁 FileZ <span className="tag">offline</span></div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          🔌 File uploads need a live connection to the storage backend. Storage caps by tier: Free 400MB · Premium 5GB · StatZ 100GB — enforced server-side once connected.
        </p>
      </div>
    );
  }

  const usedMb = state?.storage_used_mb ?? 0;
  const capMb = state?.storage_mb ?? 0;
  const pct = capMb ? Math.min(100, (usedMb / capMb) * 100) : 0;
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">📁 FileZ <span className="tag" style={{ color: "var(--success)" }}>● live</span></div>
        <div className="balance-info">
          Storage: <strong>{mbLabel(usedMb)}</strong> of {mbLabel(capMb)} used · {mbLabel(state?.storage_free_mb ?? 0)} free · max {mbLabel(state?.upload_mb ?? 0)}/file
        </div>
        <div style={{ height: 8, borderRadius: 6, background: "rgba(255,255,255,0.08)", overflow: "hidden", margin: "10px 0" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct > 90 ? "var(--danger)" : "var(--accent, #22e6ff)", transition: "width .3s" }} />
        </div>
        <label className="btn" style={{ width: "100%", display: "block", textAlign: "center", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? "⏳ Uploading…" : "⬆️ Upload file"}
          <input type="file" style={{ display: "none" }} disabled={busy} onChange={pick} />
        </label>
        {err && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 8 }}>⚠️ {err}</p>}
      </div>
      <div className="card">
        <div className="card-header">🗂️ Your Files</div>
        {(!state?.uploads || state.uploads.length === 0) ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No files yet — upload one above.</p>
        ) : state.uploads.map((u) => (
          <div key={u.id} className="skill-item">
            <span className="skill-item-name">
              {u.url ? <a href={u.url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>📄 {u.name}</a> : `📄 ${u.name}`}
            </span>
            <span className="skill-item-exp" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {mbLabel(u.size_mb)}
              <button className="btn btn-small btn-secondary" onClick={() => remove(u.id)} title="Delete">🗑️</button>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function GameZPage() {
  const { state, setList } = useAppState();
  const [genre, setGenre] = useState("All");
  const [sub, setSub] = useState("All");
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState(null);

  // User-made games (published from OCC) sit on top of the seed catalog.
  const all = [...(state.games || []), ...SEED_GAMES];
  const subs = genre === "All" ? [] : subgenresFor(genre);
  const query = q.trim().toLowerCase();
  const games = all.filter((g) => {
    if (genre !== "All" && g.genre !== genre) return false;
    if (sub !== "All" && g.subgenre !== sub) return false;
    if (query && !(`${g.title} ${g.author} ${g.desc || ""}`.toLowerCase().includes(query))) return false;
    return true;
  });

  const pickGenre = (name) => { setGenre(name); setSub("All"); };
  const play = (g) => {
    setPlaying(g);
    // Count the play on user-made games (seed games are static demo data).
    if ((state.games || []).some((x) => x.id === g.id)) {
      setList("games", state.games.map((x) => (x.id === g.id ? { ...x, plays: (x.plays || 0) + 1 } : x)));
    }
  };

  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">👾 GameZ</div>
        <div className="balance-info">{all.length} user-made games from Ocular Code ConnectZ · sorted by genre &amp; subgenre</div>
        <div className="form-group" style={{ marginTop: 10 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Search games, creators…" />
        </div>
      </div>

      <div className="card">
        <div className="card-header">🎮 Genre</div>
        <div className="chip-wrap">
          <button className={`heritage-chip${genre === "All" ? " sel" : ""}`} onClick={() => pickGenre("All")}>All</button>
          {GAME_GENRES.map((g) => (
            <button key={g.name} className={`heritage-chip${genre === g.name ? " sel" : ""}`} onClick={() => pickGenre(g.name)}>{g.emoji} {g.name}</button>
          ))}
        </div>
        {subs.length > 0 && (
          <>
            <div className="modal-sub-title" style={{ margin: "12px 0 6px" }}>Subgenre</div>
            <div className="chip-wrap">
              <button className={`heritage-chip${sub === "All" ? " sel" : ""}`} onClick={() => setSub("All")}>All</button>
              {subs.map((s) => (
                <button key={s} className={`heritage-chip${sub === s ? " sel" : ""}`} onClick={() => setSub(s)}>{s}</button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-header"><span>🕹️ {genre === "All" ? "All Games" : genre}{sub !== "All" ? ` · ${sub}` : ""}</span><span className="tag">{games.length}</span></div>
        {games.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No games match — try a different genre or search.</p>
        ) : games.map((g) => (
          <div key={g.id} className="post-card">
            <div className="post-user">{genreEmoji(g.genre)} {g.title} {g.mine && <span className="tag" style={{ color: "var(--success)" }}>yours</span>}</div>
            <div className="post-content">{g.desc}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
              <span className="tag">{g.genre}</span>
              {g.subgenre && <span className="tag">{g.subgenre}</span>}
              <span className="tag">💻 {g.lang}</span>
              <span className="tag">▶ {(g.plays || 0).toLocaleString()}</span>
              {g.rating != null && <span className="tag">⭐ {g.rating}</span>}
            </div>
            <div className="post-meta" style={{ marginBottom: 8 }}>by @{g.author}</div>
            <button className="btn btn-small" onClick={() => play(g)}>▶ Play</button>
          </div>
        ))}
      </div>

      {playing && (
        <div className="modal" onClick={() => setPlaying(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title"><h2>{genreEmoji(playing.genre)} {playing.title}</h2></div><button className="close-btn" onClick={() => setPlaying(null)}>×</button></div>
            <div style={{ padding: 4 }}>
              <div style={{ height: 160, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(34,230,255,0.25))", fontSize: 40 }}>
                {genreEmoji(playing.genre)}
              </div>
              <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 12 }}>
                {playing.desc}
              </p>
              <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 8 }}>
                {playing.genre} · {playing.subgenre} · built in {playing.lang} by @{playing.author}. The in-browser player streams from the creator's OCC build — real playable builds land with the GameZ runtime.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DawZPage({ onOpen }) {
  const { state, update } = useAppState();
  const votes = state.dawVotes || {};
  const vote = (id) => update({ dawVotes: { ...votes, [id]: (votes[id] || 0) + 1 } });
  // Most-voted first so the crowd's pick floats to the top of the build queue.
  const ranked = [...DAWS].sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0));
  const totalVotes = Object.values(votes).reduce((s, n) => s + n, 0);
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">🎛️ DawZ — Build Queue</div>
        <div className="balance-info">
          The engines aren't built yet. Tap <strong>Vote</strong> to push a DAW up the queue — most-voted gets built first. {totalVotes} vote{totalVotes === 1 ? "" : "s"} cast.
        </div>
      </div>
      {ranked.map((d) => {
        const count = votes[d.id] || 0;
        return (
          <div key={d.id} className="post-card">
            <div className="post-user" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconImg icon={d.icon} alt={d.name} style={{ width: 30, height: 30, borderRadius: 8 }} />
              {d.emoji} {d.name}
              {d.built ? <span className="tag" style={{ color: "var(--success)" }}>● built</span> : <span className="tag">🔨 coming soon</span>}
            </div>
            <div className="post-content" style={{ margin: "6px 0" }}>{d.desc}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              <span className="tag">knockoff of {d.knockoff}</span>
              <span className="tag">🗳️ {count} vote{count === 1 ? "" : "s"}</span>
            </div>
            {d.built ? (
              <button className="btn btn-small btn-success" onClick={() => onOpen?.(d.id)}>▶ Open {d.name}</button>
            ) : (
              <button className="btn btn-small" onClick={() => vote(d.id)}>🗳️ Vote to build</button>
            )}
          </div>
        );
      })}
    </>
  );
}

// Rich-text (Microsoft Word-style) editor for SentenceZ.
const SZ_TOOLS = [
  { cmd: "bold", label: "B", style: { fontWeight: 800 } },
  { cmd: "italic", label: "I", style: { fontStyle: "italic" } },
  { cmd: "underline", label: "U", style: { textDecoration: "underline" } },
  { cmd: "insertUnorderedList", label: "• List" },
  { cmd: "insertOrderedList", label: "1. List" },
  { cmd: "justifyLeft", label: "⬅" },
  { cmd: "justifyCenter", label: "⬌" },
  { cmd: "justifyRight", label: "➡" },
];
function SentenceZPage() {
  const { state, setList } = useAppState();
  const docs = state.sentenceDocs || [];
  const [openId, setOpenId] = useState(null);
  const [title, setTitle] = useState("");
  const [saved, setSaved] = useState("");
  const bodyRef = useRef(null);

  const exec = (cmd) => { document.execCommand(cmd, false, null); bodyRef.current?.focus(); };
  const block = (tag) => { document.execCommand("formatBlock", false, tag); bodyRef.current?.focus(); };

  const openDoc = (d) => { setOpenId(d.id); setTitle(d.title); setSaved(""); setTimeout(() => { if (bodyRef.current) bodyRef.current.innerHTML = d.html || ""; }, 0); };
  const newDoc = () => { setOpenId("new"); setTitle(""); setSaved(""); setTimeout(() => { if (bodyRef.current) bodyRef.current.innerHTML = ""; }, 0); };

  const save = () => {
    const html = bodyRef.current?.innerHTML || "";
    const text = bodyRef.current?.innerText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const name = title.trim() || "Untitled";
    if (openId && openId !== "new") {
      setList("sentenceDocs", docs.map((d) => (d.id === openId ? { ...d, title: name, html, words, at: Date.now() } : d)));
    } else {
      const id = `doc-${Date.now()}`;
      setList("sentenceDocs", [{ id, title: name, html, words, at: Date.now() }, ...docs]);
      setOpenId(id);
    }
    setSaved("Saved ✓");
    setTimeout(() => setSaved(""), 1500);
  };

  const del = (id) => { setList("sentenceDocs", docs.filter((d) => d.id !== id)); if (openId === id) setOpenId(null); };

  if (openId) {
    return (
      <>
        <div className="stripe-section">
          <button className="btn btn-secondary btn-small" onClick={() => setOpenId(null)} style={{ marginBottom: 8 }}>‹ Documents</button>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" style={{ fontWeight: 700 }} />
        </div>
        <div className="card" style={{ padding: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
            <button className="btn btn-small btn-secondary" onClick={() => block("H1")}>H1</button>
            <button className="btn btn-small btn-secondary" onClick={() => block("H2")}>H2</button>
            <button className="btn btn-small btn-secondary" onClick={() => block("P")}>¶</button>
            {SZ_TOOLS.map((t) => (
              <button key={t.cmd} className="btn btn-small btn-secondary" style={t.style} onClick={() => exec(t.cmd)}>{t.label}</button>
            ))}
          </div>
          <div
            ref={bodyRef}
            contentEditable
            suppressContentEditableWarning
            className="sz-editor"
            style={{ minHeight: 260, outline: "none", background: "#fff", color: "#111", padding: 16, borderRadius: 8, lineHeight: 1.6, overflowY: "auto" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <span style={{ fontSize: 11, color: "var(--text-light)" }}>{saved || "Autosaves to your account on Save"}</span>
            <button className="btn btn-small btn-success" onClick={save}>💾 Save</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">📝 SentenceZ</div>
        <div className="balance-info">A Word-style text editor — write, format, and save documents right here.</div>
        <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={newDoc}>＋ New document</button>
      </div>
      <div className="card">
        <div className="card-header"><span>🗂️ Your Documents</span><span className="tag">{docs.length}</span></div>
        {docs.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No documents yet — start one above.</p>
        ) : docs.map((d) => (
          <div key={d.id} className="skill-item">
            <span className="skill-item-name" style={{ cursor: "pointer" }} onClick={() => openDoc(d)}>📄 {d.title} <span style={{ fontSize: 11, color: "var(--text-light)" }}>· {d.words || 0} words</span></span>
            <span className="skill-item-exp" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {new Date(d.at).toLocaleDateString()}
              <button className="btn btn-small btn-secondary" onClick={() => del(d.id)} title="Delete">🗑️</button>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// VideoZ — a Sony Vegas-style multitrack timeline editor.
const VZ_CLIP_TYPES = [
  { id: "video", label: "🎬 Video", track: "video", color: "#7c5cff" },
  { id: "image", label: "🖼️ Image", track: "video", color: "#22a7ff" },
  { id: "text", label: "🔤 Title", track: "video", color: "#ff8f3f" },
  { id: "transition", label: "✨ Transition", track: "video", color: "#ff2bd1" },
  { id: "audio", label: "🎵 Audio", track: "audio", color: "#22e6ff" },
];
function fmtSecs(s) { const m = Math.floor(s / 60), r = s % 60; return `${m}:${String(r).padStart(2, "0")}`; }

function VideoZPage() {
  const { state, setList } = useAppState();
  const projects = state.videoProjects || [];
  const [openId, setOpenId] = useState(null);
  const [name, setName] = useState("");
  const [clips, setClips] = useState([]);
  const [form, setForm] = useState({ label: "", type: "video", seconds: 5 });
  const [saved, setSaved] = useState("");

  const openProj = (p) => { setOpenId(p.id); setName(p.name); setClips(p.clips || []); setSaved(""); };
  const newProj = () => { setOpenId("new"); setName(""); setClips([]); setSaved(""); };

  const addClip = () => {
    const label = form.label.trim() || VZ_CLIP_TYPES.find((t) => t.id === form.type).label.replace(/^\S+\s/, "");
    const track = VZ_CLIP_TYPES.find((t) => t.id === form.type).track;
    setClips((c) => [...c, { id: `c-${Date.now()}`, label, type: form.type, track, seconds: Math.max(1, Number(form.seconds) || 1) }]);
    setForm({ ...form, label: "" });
  };
  const trim = (id, delta) => setClips((c) => c.map((x) => (x.id === id ? { ...x, seconds: Math.max(1, x.seconds + delta) } : x)));
  const move = (id, dir) => setClips((c) => {
    const track = c.find((x) => x.id === id).track;
    const lane = c.filter((x) => x.track === track);
    const i = lane.findIndex((x) => x.id === id);
    const j = i + dir;
    if (j < 0 || j >= lane.length) return c;
    [lane[i], lane[j]] = [lane[j], lane[i]];
    const other = c.filter((x) => x.track !== track);
    return track === "video" ? [...lane, ...other] : [...other, ...lane];
  });
  const del = (id) => setClips((c) => c.filter((x) => x.id !== id));

  const save = () => {
    const proj = { id: openId !== "new" ? openId : `vp-${Date.now()}`, name: name.trim() || "Untitled Project", clips, at: Date.now() };
    if (openId !== "new") setList("videoProjects", projects.map((p) => (p.id === openId ? proj : p)));
    else { setList("videoProjects", [proj, ...projects]); setOpenId(proj.id); }
    setSaved("Saved ✓"); setTimeout(() => setSaved(""), 1500);
  };

  const lane = (track) => clips.filter((c) => c.track === track);
  const runtime = Math.max(lane("video").reduce((s, c) => s + c.seconds, 0), lane("audio").reduce((s, c) => s + c.seconds, 0));

  const Track = ({ track, title }) => {
    const items = lane(track);
    const total = items.reduce((s, c) => s + c.seconds, 0) || 1;
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 4 }}>{title} · {fmtSecs(items.reduce((s, c) => s + c.seconds, 0))}</div>
        <div style={{ display: "flex", gap: 3, background: "#0c0a16", borderRadius: 8, padding: 4, minHeight: 46, overflowX: "auto" }}>
          {items.length === 0 ? <span style={{ fontSize: 11, color: "var(--text-light)", alignSelf: "center", padding: 6 }}>empty</span> :
            items.map((c) => {
              const col = VZ_CLIP_TYPES.find((t) => t.id === c.type)?.color || "#7c5cff";
              return (
                <div key={c.id} onClick={() => setForm((f) => ({ ...f }))}
                  style={{ flex: `0 0 ${Math.max(48, (c.seconds / total) * 240)}px`, background: `${col}33`, border: `1px solid ${col}`, borderRadius: 6, padding: "4px 6px", fontSize: 10, color: "#fff", position: "relative" }}>
                  <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</div>
                  <div style={{ color: "var(--text-light)" }}>{fmtSecs(c.seconds)}</div>
                  <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
                    <button className="btn btn-small btn-secondary" style={{ padding: "0 5px", fontSize: 10 }} onClick={() => move(c.id, -1)}>‹</button>
                    <button className="btn btn-small btn-secondary" style={{ padding: "0 5px", fontSize: 10 }} onClick={() => trim(c.id, -1)}>−</button>
                    <button className="btn btn-small btn-secondary" style={{ padding: "0 5px", fontSize: 10 }} onClick={() => trim(c.id, 1)}>+</button>
                    <button className="btn btn-small btn-secondary" style={{ padding: "0 5px", fontSize: 10 }} onClick={() => move(c.id, 1)}>›</button>
                    <button className="btn btn-small btn-secondary" style={{ padding: "0 5px", fontSize: 10 }} onClick={() => del(c.id)}>🗑️</button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  if (openId) {
    return (
      <>
        <div className="stripe-section">
          <button className="btn btn-secondary btn-small" onClick={() => setOpenId(null)} style={{ marginBottom: 8 }}>‹ Projects</button>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" style={{ fontWeight: 700 }} />
          <div className="balance-info" style={{ marginTop: 6 }}>Total runtime: <strong>{fmtSecs(runtime)}</strong> · {clips.length} clip{clips.length === 1 ? "" : "s"}</div>
        </div>
        <div className="card">
          <div className="card-header">➕ Add clip</div>
          <div className="chip-wrap" style={{ marginBottom: 8 }}>
            {VZ_CLIP_TYPES.map((t) => (
              <button key={t.id} className={`heritage-chip${form.type === t.id ? " sel" : ""}`} onClick={() => setForm({ ...form, type: t.id })}>{t.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Clip name" style={{ flex: 2 }} />
            <input type="number" min="1" value={form.seconds} onChange={(e) => setForm({ ...form, seconds: e.target.value })} placeholder="sec" style={{ flex: 1 }} />
          </div>
          <button className="btn btn-small" style={{ width: "100%", marginTop: 8 }} onClick={addClip}>➕ Add to timeline</button>
        </div>
        <div className="card">
          <div className="card-header">🎞️ Timeline</div>
          <Track track="video" title="🎬 Video / Titles" />
          <Track track="audio" title="🎵 Audio" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 10, color: "var(--text-light)" }}>{saved || "Export/render arrives with the render backend."}</span>
            <button className="btn btn-small btn-success" onClick={save}>💾 Save project</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">🎬 VideoZ <span className="tag">Sony Vegas-style</span></div>
        <div className="balance-info">Build videos on a multitrack timeline — clips, titles, and audio.</div>
        <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={newProj}>＋ New project</button>
      </div>
      <div className="card">
        <div className="card-header"><span>🗂️ Your Projects</span><span className="tag">{projects.length}</span></div>
        {projects.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No projects yet — start one above.</p>
        ) : projects.map((p) => {
          const rt = (p.clips || []).filter((c) => c.track === "video").reduce((s, c) => s + c.seconds, 0);
          return (
            <div key={p.id} className="skill-item">
              <span className="skill-item-name" style={{ cursor: "pointer" }} onClick={() => openProj(p)}>🎬 {p.name} <span style={{ fontSize: 11, color: "var(--text-light)" }}>· {(p.clips || []).length} clips · {fmtSecs(rt)}</span></span>
              <span className="skill-item-exp" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {new Date(p.at).toLocaleDateString()}
                <button className="btn btn-small btn-secondary" onClick={() => setList("videoProjects", projects.filter((x) => x.id !== p.id))} title="Delete">🗑️</button>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

const VENUE_TYPES = [
  { id: "party", label: "🎉 Party" },
  { id: "openmic", label: "🎙️ Open mic" },
  { id: "theater", label: "🏟️ Theater" },
  { id: "show", label: "🎞️ Show" },
  { id: "custom", label: "❓ Custom" },
];
const SEED_VENUES = [
  { id: "v-seed-1", title: "Rooftop Cypher", mode: "collaborative", type: "openmic", host: "Kaya", hostPrice: 10, visitorPay: 8, minAttract: 6, seed: true },
  { id: "v-seed-2", title: "Neon Nights Showcase", mode: "performance", type: "show", host: "Azrael", hostPrice: 15, minAttract: 0, seed: true },
  { id: "v-seed-3", title: "Midnight Theater Set", mode: "performance", type: "theater", host: "Lilith", hostPrice: 25, minAttract: 7, seed: true },
];

// Normalize a server venue (cents/host_price_cents) to the local shape.
function fromServerVenue(v) {
  return {
    id: v.id, title: v.title, mode: v.mode, type: v.vtype, customName: v.custom_name,
    host: v.host, mine: v.mine, hostPrice: v.host_price_cents / 100,
    visitorPay: v.visitor_pay_cents / 100, minAttract: v.min_attract, attending: v.attending, live: true,
  };
}

function VenueZPage({ tier, serverOk, syncEconomy }) {
  const { state, updateWallet, addTo, setList } = useAppState();
  const [tab, setTab] = useState("discover"); // discover | host
  const [form, setForm] = useState({ title: "", mode: "collaborative", type: "party", custom: "", hostPrice: 10, hostUnit: "work", visitorPay: 5, visitorUnit: "work", hours: "", minAttract: 0 });
  const [msg, setMsg] = useState("");
  const [serverVenues, setServerVenues] = useState(null); // null = not loaded / offline
  const [myAttractServer, setMyAttractServer] = useState(null);

  // Live data when the backend is reachable; local fallback otherwise.
  useEffect(() => {
    if (!serverOk) { setServerVenues(null); return; }
    getVenuesApi().then((r) => setServerVenues(r.venues.map(fromServerVenue))).catch(() => setServerVenues(null));
    getAttractivenessApi().then((r) => setMyAttractServer(r.median)).catch(() => {});
  }, [serverOk]);

  const localAttract = (() => {
    const r = (state.facez || []).flatMap((f) => f.ratings || []);
    return r.length ? r.reduce((s, n) => s + n, 0) / r.length : null;
  })();
  const myAttract = serverVenues ? myAttractServer : localAttract;

  const venues = serverVenues ? serverVenues : [...(state.venues || []), ...SEED_VENUES];

  const hostTotal = rateTotal({ rate: form.hostPrice, unit: form.hostUnit, hours: form.hours });
  const visitorTotal = rateTotal({ rate: form.visitorPay, unit: form.visitorUnit, hours: form.hours });
  const create = async () => {
    if (!form.title.trim()) return;
    if (serverVenues) {
      try {
        await createVenueApi({
          title: form.title.trim(), mode: form.mode, vtype: form.type,
          custom_name: form.type === "custom" ? form.custom.trim() : "",
          host_price_cents: Math.round(hostTotal * 100),
          visitor_pay_cents: Math.round((form.mode === "collaborative" ? visitorTotal : 0) * 100),
          min_attract: Number(form.minAttract) || 0,
        });
        const r = await getVenuesApi();
        setServerVenues(r.venues.map(fromServerVenue));
        setForm({ title: "", mode: "collaborative", type: "party", custom: "", hostPrice: 10, hostUnit: "work", visitorPay: 5, visitorUnit: "work", hours: "", minAttract: 0 });
        setTab("discover");
        return;
      } catch (e) { setMsg(e.message || "Could not publish venue"); return; }
    }
    const v = {
      id: `v-${Date.now()}`, title: form.title.trim(), mode: form.mode,
      type: form.type, customName: form.type === "custom" ? form.custom.trim() : "",
      host: state.user?.name || "you", hostPrice: hostTotal,
      visitorPay: form.mode === "collaborative" ? visitorTotal : 0,
      hostUnit: form.hostUnit, visitorUnit: form.visitorUnit, hours: Number(form.hours) || 0,
      minAttract: Number(form.minAttract) || 0, at: Date.now(),
    };
    setList("venues", [v, ...(state.venues || [])]);
    setForm({ title: "", mode: "collaborative", type: "party", custom: "", hostPrice: 10, hostUnit: "work", visitorPay: 5, visitorUnit: "work", hours: "", minAttract: 0 });
    setTab("discover");
  };

  const join = async (v) => {
    setMsg("");
    if (v.live) {
      try {
        const r = await joinVenueApi(v.id); // server moves money between wallets + enforces gate/tax
        updateWallet({ balance: r.wallet.money });
        addTo("paymentHistory", { amount: -(r.paid_cents / 100), at: Date.now(), note: `VenueZ: ${v.title} (attend)` });
        if (r.earned_cents) addTo("paymentHistory", { amount: r.earned_cents / 100, at: Date.now(), note: `VenueZ: ${v.title} (skill payout)` });
        setMsg(`✅ Joined ${v.title}${r.earned_cents ? ` · earned ${money(r.earned_cents / 100)}` : ""}.`);
        getVenuesApi().then((rr) => setServerVenues(rr.venues.map(fromServerVenue))).catch(() => {});
        syncEconomy?.();
        return;
      } catch (e) { setMsg(e.message || "Could not join"); return; }
    }
    if (myAttract != null && v.minAttract > 0 && myAttract < v.minAttract) {
      setMsg(`🔒 ${v.title} needs an attractiveness of ${v.minAttract}+ — yours is ${myAttract.toFixed(1)}.`);
      return;
    }
    const bal = Number(state.wallet.balance) || 0;
    if (bal < v.hostPrice) { setMsg(`Need ${money(v.hostPrice)} to attend — add funds.`); return; }
    const paid = splitTransaction(v.hostPrice, tier);
    let newBal = bal - v.hostPrice;
    addTo("paymentHistory", { amount: -v.hostPrice, dev: paid.dev, at: Date.now(), note: `VenueZ: ${v.title} (attend)` });
    let earnNote = "";
    if (v.mode === "collaborative" && v.visitorPay > 0) {
      const earn = splitTransaction(v.visitorPay, tier);
      newBal += earn.net;
      addTo("paymentHistory", { amount: earn.net, dev: earn.dev, at: Date.now(), note: `VenueZ: ${v.title} (skill payout)` });
      earnNote = ` · earned ${money(earn.net)} for your skill`;
    }
    updateWallet({ balance: Number(newBal.toFixed(2)) });
    setMsg(`✅ Joined ${v.title} — paid ${money(v.hostPrice)} to ${v.host}${earnNote}.`);
    syncEconomy?.();
  };

  const typeLabel = (v) => v.type === "custom" ? `❓ ${v.customName || "Custom"}` : VENUE_TYPES.find((t) => t.id === v.type)?.label || v.type;

  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">🏛️ VenueZ</div>
        <div className="balance-info">Go places with your music · Balance {money(state.wallet.balance)} · your attractiveness {myAttract != null ? myAttract.toFixed(1) : "—"}/10</div>
        <div className="chip-wrap" style={{ marginTop: 8 }}>
          <button className={`heritage-chip${tab === "discover" ? " sel" : ""}`} onClick={() => setTab("discover")}>🔎 Discover</button>
          <button className={`heritage-chip${tab === "host" ? " sel" : ""}`} onClick={() => setTab("host")}>🏛️ Host a venue</button>
        </div>
        {msg && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>{msg}</p>}
      </div>

      {tab === "host" ? (
        <div className="card">
          <div className="card-header">🏛️ Host a venue</div>
          <div className="form-group"><label>Event name</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Name your event" /></div>
          <label style={{ fontSize: 11, color: "var(--text-light)" }}>Mode</label>
          <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
            <button className={`heritage-chip${form.mode === "collaborative" ? " sel" : ""}`} onClick={() => setForm({ ...form, mode: "collaborative" })}>🤝 Collaborative</button>
            <button className={`heritage-chip${form.mode === "performance" ? " sel" : ""}`} onClick={() => setForm({ ...form, mode: "performance" })}>🤩 Performance</button>
          </div>
          <p style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 8 }}>
            {form.mode === "collaborative" ? "Visitors get paid their skill price and pay you yours." : "Visitors pay you (your SkillZ or a custom price) to attend."}
          </p>
          <label style={{ fontSize: 11, color: "var(--text-light)" }}>Type</label>
          <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
            {VENUE_TYPES.map((t) => <button key={t.id} className={`heritage-chip${form.type === t.id ? " sel" : ""}`} onClick={() => setForm({ ...form, type: t.id })}>{t.label}</button>)}
          </div>
          {form.type === "custom" && (
            <div className="form-group"><label>Custom type name</label><input value={form.custom} onChange={(e) => setForm({ ...form, custom: e.target.value })} placeholder="Name your event type" /></div>
          )}
          <div className="form-group">
            <label>Host price — per work or per hour</label>
            <RatePricer value={{ rate: form.hostPrice, unit: form.hostUnit, hours: form.hours }} skillRates={mySkillRates(state)}
              onChange={(v) => setForm({ ...form, hostPrice: v.rate, hostUnit: v.unit, hours: v.hours })} />
            {form.hostUnit === "hour" && <div style={{ fontSize: 11, color: "var(--gold, #ffcf3f)" }}>Attendees pay {money(hostTotal)} total.</div>}
          </div>
          {form.mode === "collaborative" && (
            <div className="form-group">
              <label>Visitor payout — per work or per hour</label>
              <RatePricer value={{ rate: form.visitorPay, unit: form.visitorUnit, hours: form.hours }} skillRates={mySkillRates(state)}
                onChange={(v) => setForm({ ...form, visitorPay: v.rate, visitorUnit: v.unit, hours: v.hours })} />
              {form.visitorUnit === "hour" && <div style={{ fontSize: 11, color: "var(--gold, #ffcf3f)" }}>Collaborators earn {money(visitorTotal)} total.</div>}
            </div>
          )}
          <div className="form-group"><label>Min attractiveness filter: {form.minAttract}/10</label><input type="range" min="0" max="10" value={form.minAttract} onChange={(e) => setForm({ ...form, minAttract: e.target.value })} /></div>
          <p style={{ fontSize: 10, color: "var(--text-light)", marginBottom: 8 }}>Developer tax ({devTaxFor(tier).label} {Math.round(devTaxFor(tier).rate * 100)}%) is applied to every VenueZ payment.</p>
          <button className="btn btn-success" style={{ width: "100%" }} disabled={!form.title.trim()} onClick={create}>➕ Publish venue</button>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <span>🔎 Venues {serverVenues ? <span className="tag" style={{ color: "var(--success)" }}>● live</span> : <span className="tag">offline</span>}</span>
            <span className="tag">{venues.length}</span>
          </div>
          {venues.length === 0 && <p style={{ fontSize: 12, color: "var(--text-light)" }}>No venues yet — host one.</p>}
          {venues.map((v) => {
            const mine = v.live ? v.mine : !v.seed;
            const locked = !mine && myAttract != null && v.minAttract > 0 && myAttract < v.minAttract;
            return (
              <div key={v.id} className="post-card">
                <div className="post-user">{typeLabel(v)} · {v.title} {mine ? <span className="tag" style={{ color: "var(--success)" }}>yours</span> : ""}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0" }}>
                  <span className="tag">{v.mode === "collaborative" ? "🤝 Collaborative" : "🤩 Performance"}</span>
                  <span className="tag">host @{v.host}</span>
                  <span className="tag" style={{ color: FLOW_RED }}>attend {money(v.hostPrice)}</span>
                  {v.mode === "collaborative" && v.visitorPay > 0 && <span className="tag" style={{ color: FLOW_GREEN }}>earn {money(v.visitorPay)}</span>}
                  {(v.hostUnit === "hour" || v.visitorUnit === "hour") && v.hours > 0 && <span className="tag" title="Priced per hour">⏱️ {v.hours}h</span>}
                  {v.minAttract > 0 && <span className="tag" style={{ color: locked ? "var(--danger)" : undefined }}>💯 {v.minAttract}+</span>}
                </div>
                {!mine && <CostBreakdown amount={v.hostPrice} tier={tier} recipient={`@${v.host}`} payLabel="You pay to attend" />}
                {mine ? (
                  <span className="tag">🏛️ You're hosting this</span>
                ) : v.attending ? (
                  <span className="tag" style={{ color: "var(--success)" }}>✓ Attending</span>
                ) : (
                  <button className="btn btn-small" style={{ marginTop: 6, opacity: locked ? 0.5 : 1 }} disabled={locked} onClick={() => join(v)}>
                    {locked ? `🔒 Needs ${v.minAttract}+ attractiveness` : v.mode === "collaborative" ? "🤝 Join & collaborate" : "🎟️ Pay & attend"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function CallZPage({ tier, onOpen }) {
  const { state, updateWallet, addTo } = useAppState();
  const isStatz = /stat[sz]/i.test(tier || "");
  const [mode, setMode] = useState("ai"); // ai | user
  const [method, setMethod] = useState("cash"); // cash | spinaz
  const [aiModel, setAiModel] = useState(AI_MODELS[0].id);
  const [callee, setCallee] = useState(CALLABLE_USERS[0].id);
  const [session, setSession] = useState(null); // { startedAt, seconds }
  const balance = Number(state.wallet.balance || 0);

  // Live call timer: tick once a second while a call is active.
  useEffect(() => {
    if (!session) return undefined;
    const t = setInterval(() => setSession((s) => (s ? { ...s, seconds: s.seconds + 1 } : s)), 1000);
    return () => clearInterval(t);
  }, [session?.startedAt]);

  // Auto-hang-up when the running cost reaches the wallet balance (calls are
  // billed from cash, so you can't run a negative balance).
  useEffect(() => {
    if (session && callCost(session.seconds, session.rate, session.unit) >= balance) {
      endCall(session, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.seconds, balance]);

  if (!isStatz) {
    return (
      <div className="card">
        <div className="card-header">📞 CallZ — StatZ only</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          🔒 CallZ is a <strong>StatZ</strong> feature. Upgrade to place live AI calls (billed per minute) and user calls
          (billed per hour) straight from your cash balance.
        </p>
        <UpgradeCTA onOpen={onOpen} label="👑 Upgrade to StatZ" />
      </div>
    );
  }

  const aiPick = AI_MODELS.find((m) => m.id === aiModel);
  const userPick = CALLABLE_USERS.find((u) => u.id === callee);
  const rate = mode === "ai" ? aiPick.perMin : userPick.perHour;
  const unit = mode === "ai" ? AI_UNIT_SECONDS : USER_UNIT_SECONDS;
  const rateLabel = mode === "ai" ? `${money(rate)}/min` : `${money(rate)}/hr`;

  const start = () => {
    if (method === "spinaz" || balance <= 0 || session) return;
    setSession({
      startedAt: Date.now(), seconds: 0, rate, unit,
      who: mode === "ai" ? aiPick.name : userPick.name,
      mode,
    });
  };

  const endCall = (s = session, autoEnded = false) => {
    if (!s) return;
    const gross = Math.min(Number(callCost(s.seconds, s.rate, s.unit).toFixed(2)), balance);
    if (gross > 0) {
      const { dev } = splitTransaction(gross, tier); // developer tax on the call spend
      updateWallet({ balance: Number((balance - gross).toFixed(2)) });
      addTo("paymentHistory", { amount: -gross, dev, at: Date.now(), note: `CallZ · ${s.mode === "ai" ? "AI" : "User"}: ${s.who}` });
      addTo("callLog", { id: Date.now(), who: s.who, mode: s.mode, seconds: s.seconds, cost: gross, autoEnded, at: Date.now() });
    }
    setSession(null);
  };

  const runningCost = session ? callCost(session.seconds, session.rate, session.unit) : 0;
  const canCall = method === "cash" && balance > 0 && !session;

  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">📞 CallZ <span className="tag" style={{ color: "var(--gold, #ffcf3f)" }}>StatZ</span></div>
        <div className="balance-info">Balance: <strong>{money(balance)}</strong> · Calls bill your cash wallet · {devTaxFor(tier).label} developer tax {Math.round(devTaxFor(tier).rate * 100)}% on every call</div>
      </div>

      {/* Active call panel */}
      {session && (
        <div className="card" style={{ textAlign: "center", border: "1px solid var(--accent, #22e6ff)" }}>
          <div className="card-header" style={{ justifyContent: "center" }}>🟢 On call — {session.who}</div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 1 }}>{fmtDuration(session.seconds)}</div>
          <div style={{ fontSize: 12, color: "var(--text-light)", margin: "6px 0 12px" }}>
            {rateLabel} · running {money(runningCost)} · {money(Math.max(balance - runningCost, 0))} left
          </div>
          <button className="btn btn-danger" style={{ width: "100%" }} onClick={() => endCall()}>📴 End call</button>
        </div>
      )}

      {!session && (
        <div className="card">
          <div className="chip-wrap" style={{ marginBottom: 12 }}>
            <button className={`heritage-chip${mode === "ai" ? " sel" : ""}`} onClick={() => setMode("ai")}>🤖 AI</button>
            <button className={`heritage-chip${mode === "user" ? " sel" : ""}`} onClick={() => setMode("user")}>🗣️ User</button>
          </div>

          {mode === "ai" ? (
            <>
              <label style={{ fontSize: 11, color: "var(--text-light)" }}>AI model — cost varies by model</label>
              <div style={{ margin: "6px 0 12px" }}>
                {AI_MODELS.map((m) => (
                  <div key={m.id} className={`skill-item${aiModel === m.id ? "" : ""}`} onClick={() => setAiModel(m.id)}
                    style={{ cursor: "pointer", border: `1px solid ${aiModel === m.id ? "var(--accent, #22e6ff)" : "var(--border)"}`, borderRadius: 10, padding: 10, marginBottom: 6 }}>
                    <span className="skill-item-name">{m.emoji} {m.name} <span style={{ fontSize: 11, color: "var(--text-light)" }}>— {m.desc}</span></span>
                    <span className="skill-item-exp">{money(m.perMin)}/min</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <label style={{ fontSize: 11, color: "var(--text-light)" }}>Call a user — hourly rate scales with skill</label>
              <div style={{ margin: "6px 0 12px" }}>
                {CALLABLE_USERS.map((u) => (
                  <div key={u.id} className="skill-item" onClick={() => setCallee(u.id)}
                    style={{ cursor: "pointer", border: `1px solid ${callee === u.id ? "var(--accent, #22e6ff)" : "var(--border)"}`, borderRadius: 10, padding: 10, marginBottom: 6 }}>
                    <span className="skill-item-name">🗣️ {u.name} <span style={{ fontSize: 11, color: "var(--text-light)" }}>— {u.skill}</span></span>
                    <span className="skill-item-exp">{money(u.perHour)}/hr</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <label style={{ fontSize: 11, color: "var(--text-light)" }}>Payment</label>
          <div className="chip-wrap" style={{ margin: "6px 0 12px" }}>
            <button className={`heritage-chip${method === "cash" ? " sel" : ""}`} onClick={() => setMethod("cash")}>💵 Cash balance</button>
            <button className={`heritage-chip${method === "spinaz" ? " sel" : ""}`} onClick={() => setMethod("spinaz")}>🍥 SpinAZ</button>
          </div>

          {method === "spinaz" ? (
            <div className="card" style={{ margin: 0, background: "rgba(255,207,63,0.08)" }}>
              <p style={{ fontSize: 12, color: "var(--text-light)" }}>🍥 SpinAZ calling is <strong>coming soon</strong>. For now, add a cash balance via Stripe/PayPal to place calls.</p>
              <button className="btn btn-small" style={{ marginTop: 8 }} onClick={() => onOpen?.("money")}>➕ Add balance</button>
            </div>
          ) : balance <= 0 ? (
            <div className="card" style={{ margin: 0, background: "rgba(255,43,209,0.08)" }}>
              <p style={{ fontSize: 12, color: "var(--text-light)" }}>💸 Calls require a cash balance. Add funds to start calling.</p>
              <button className="btn btn-small" style={{ marginTop: 8 }} onClick={() => onOpen?.("money")}>➕ Add balance</button>
            </div>
          ) : (
            <>
              <div className="balance-info" style={{ marginBottom: 8 }}>
                Rate: <strong>{rateLabel}</strong> · you can talk ~<strong>{fmtDuration(Math.floor((balance / rate) * unit))}</strong> on {money(balance)}
              </div>
              <button className="btn btn-success" style={{ width: "100%" }} disabled={!canCall} onClick={start}>
                📞 Call {mode === "ai" ? aiPick.name : userPick.name} — {rateLabel}
              </button>
            </>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-header">🧾 Call History</div>
        {(!state.callLog || state.callLog.length === 0) ? (
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>No calls yet.</p>
        ) : [...state.callLog].reverse().map((c) => (
          <div key={c.id} className="skill-item">
            <span className="skill-item-name">{c.mode === "ai" ? "🤖" : "🗣️"} {c.who} · {fmtDuration(c.seconds)}{c.autoEnded ? " · ⚠️ funds" : ""}</span>
            <span className="skill-item-exp">{money(c.cost)} · {new Date(c.at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// SingZ / RapZ — functional training. Each drill runs a quick scored session
// and tracks your best, so tapping the app actually does something.
const TRAINING = {
  singz: { emoji: "🎤", title: "SingZ", note: "Voice health first — warm up before you belt.", drills: ["Warmups", "Range Detection", "Pitch Match", "Breath Control", "Boss SongZ"] },
  rapz: { emoji: "🎙️", title: "RapZ", note: "Flow, breath, and bars — build the combo.", drills: ["Flow Pockets", "Breath Control", "Punchlines", "Combo Meter", "Boss Mode"] },
};
function TrainingZ({ appKey }) {
  const { state, update } = useAppState();
  const cfg = TRAINING[appKey];
  const best = state.trainingBest?.[appKey] || {};
  const [active, setActive] = useState(null); // { drill, secs } during a session
  const [result, setResult] = useState(null);

  const practice = (drill) => {
    setResult(null);
    setActive({ drill, secs: 3 });
    const iv = setInterval(() => {
      setActive((a) => {
        if (!a) return a;
        if (a.secs <= 1) {
          clearInterval(iv);
          const score = Math.floor(60 + Math.random() * 41); // 60-100
          const prev = best[drill] || 0;
          const isBest = score > prev;
          update({ trainingBest: { ...state.trainingBest, [appKey]: { ...best, [drill]: Math.max(prev, score) } } });
          setResult({ drill, score, isBest });
          return null;
        }
        return { ...a, secs: a.secs - 1 };
      });
    }, 700);
  };

  const scored = Object.values(best);
  const avg = scored.length ? Math.round(scored.reduce((s, n) => s + n, 0) / scored.length) : null;
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">{cfg.emoji} {cfg.title} Training</div>
        <div className="balance-info">{cfg.note}{avg != null ? ` · overall ${toTen(avg)}/10` : ""}</div>
      </div>
      {active && (
        <div className="card" style={{ textAlign: "center" }}>
          <div className="card-header" style={{ justifyContent: "center" }}>🔴 {active.drill}</div>
          <div style={{ fontSize: 34, fontWeight: 800 }}>{active.secs}</div>
          <p style={{ fontSize: 12, color: "var(--text-light)" }}>Hold the note / keep the flow…</p>
        </div>
      )}
      {result && (
        <div className="card" style={{ textAlign: "center", border: "1px solid var(--accent, #22e6ff)" }}>
          <div className="card-header" style={{ justifyContent: "center" }}>{result.drill} — {toTen(result.score)}/10</div>
          <p style={{ fontSize: 12, color: result.isBest ? "var(--success)" : "var(--text-light)" }}>{result.isBest ? "🏆 New personal best!" : "Keep grinding — beat your best."}</p>
        </div>
      )}
      <div className="card">
        <div className="card-header">🎯 Drills</div>
        {cfg.drills.map((d) => (
          <div key={d} className="skill-item">
            <span className="skill-item-name">{d} {best[d] ? <span style={{ fontSize: 11, color: "var(--gold, #ffcf3f)" }}>· best {toTen(best[d])}/10</span> : ""}</span>
            <button className="btn btn-small" disabled={!!active} onClick={() => practice(d)}>▶ Practice</button>
          </div>
        ))}
      </div>
    </>
  );
}
// Templated Corey-voice feedback from real audio scores (fallback / offline).
// Human-readable tips per meter, so the coach can speak to whatever the
// instrument profile actually measured.
const METER_TIPS = {
  pitch: "pitch — you're drifting off the note; lock a reference tone and match it",
  range: "range — you're staying in a narrow band; slide gently to the edges of your range to open it up safely",
  breath: "breath support — your phrases run long without a real breath; mark breath points",
  tone: "tone — your resonance is thin; open the throat, drop the jaw, aim the sound forward",
  cadence: "cadence — your timing's uneven; practice to a metronome and ride the pocket",
  flow: "flow — your pocket wanders; keep the gaps between hits even and lean on the beat",
  clarity: "clarity — your words smear together; over-enunciate consonants, then relax it back",
  timing: "timing — your notes rush and drag; play to a click and lock the downbeats",
  control: "dynamic control — your volume jumps around; keep the level steady, then add dynamics on purpose",
};

function localCoreyFeedback(result, context) {
  const s = result.scores; const m = result.metrics;
  const meters = (result.profile?.metrics || ["pitch", "breath", "cadence", "control"]).filter((id) => id in s);
  const weak = meters.map((id) => [id, s[id], METER_TIPS[id] || `${id} — tighten this up`]).sort((a, b) => a[1] - b[1]);
  const rangeLine = m.vocalClass
    ? ` Your range reads ${m.vocalClassEmoji || ""} ${m.vocalClass} — ${m.lowNote} to ${m.highNote} (${m.rangeOctaves} octaves).`
    : (m.rangeSemitones ? ` You covered ${m.lowNote}–${m.highNote} (${m.rangeOctaves} oct).` : "");
  return `🎧 Aight, real talk on your ${context} — I clocked ${m.note} at ${m.pitchHz}Hz.${rangeLine}\n\n` +
    `🔧 Top two to work on:\n1. ${weak[0][2]}.\n2. ${weak[1][2]}.\n\n` +
    `💪 Drill: ${weak[0][0] === "pitch" ? "hum a steady note, then slide up a 5th and back — 5 clean reps." : weak[0][0] === "range" ? "sirens: glide low to high on an 'ng', 8 easy passes — never push past comfort." : weak[0][0] === "breath" ? "4-count inhale, 8-count phrase, repeat 8 rounds." : weak[0][0] === "flow" || weak[0][0] === "cadence" ? "spit the same 4 bars to a metronome, then again a hair behind the beat." : "record the same 8 bars 3x and keep the best."}\n\n` +
    `${s.overall >= 80 ? "🔥 Overall you're solid — polish these and it's a wrap." : "You got the bones — tighten these two and it levels up fast. 💯"}`;
}

// Label pack for every possible meter across instrument profiles.
const METER_LABELS = {
  pitch: "🎯 Pitch", range: "📏 Range", breath: "🫁 Breath", tone: "🌈 Tone",
  cadence: "🌪️ Cadence", flow: "🌊 Flow", clarity: "🗣️ Clarity", timing: "⏱️ Timing", control: "🎚️ Control",
};

// Scores are computed internally on a /100 scale but shown to members out of 10
// (one decimal) — Corey wants ratings out of 10 everywhere.
const toTen = (n) => (Math.max(0, Math.min(100, Number(n) || 0)) / 10).toFixed(1);

// InstrumentZ audio lab — record from mic or upload a file, get real scores + Corey feedback.
// A scored take keeps its media so it can be saved as a PostZ (mp3/webm/video),
// then rated / commented / shared and cross-pollinated into CollabZ or a DAW.
function AudioLab({ context = "take", onResult, kind = "voice", onOpen, skill = "" }) {
  const { addXP, state } = useAppState();
  const signedIn = isSignedIn();
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const recRef = useRef(null); const chunksRef = useRef([]); const streamRef = useRef(null);
  const [media, setMedia] = useState(null); // { blob, type:"audio"|"video", name }
  const [save, setSave] = useState(null);    // save-as-post UI state

  const run = async (blob, mediaMeta) => {
    setStatus("analyzing"); setFeedback(""); setSave(null);
    if (mediaMeta) setMedia({ blob, ...mediaMeta });
    try { const buf = await decodeBlob(blob); const r = analyzeAudioBuffer(buf, kind); setResult(r); onResult?.(r); if (r.ok) addXP(4, "InstrumentZ take"); }
    catch { setResult({ ok: false }); }
    setStatus("");
  };
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream); chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => { const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" }); streamRef.current?.getTracks().forEach((t) => t.stop()); run(blob, { type: "audio", name: `${skill || context || "take"}.webm` }); };
      recRef.current = mr; mr.start(); setStatus("recording");
    } catch { setStatus("denied"); }
  };
  const stopRec = () => { if (recRef.current?.state === "recording") recRef.current.stop(); setStatus("analyzing"); };
  const onFile = (e) => { const f = e.target.files?.[0]; if (f) run(f, { type: (f.type || "").startsWith("video") ? "video" : "audio", name: f.name }); e.target.value = ""; };

  const askCorey = async () => {
    if (!result?.ok) return;
    const m = result.metrics, s = result.scores;
    const meterLine = (result.profile?.metrics || []).filter((id) => id in s).map((id) => `${id} ${s[id]}/100`).join(", ");
    const rangeLine = m.vocalClass ? ` Range class ${m.vocalClass}, ${m.lowNote}–${m.highNote} (${m.rangeOctaves} octaves).` : (m.rangeSemitones ? ` Range ${m.lowNote}–${m.highNote} (${m.rangeOctaves} oct).` : "");
    const prompt = `Coach me on my ${context} (${result.profile?.label || "voice"}). Analysis: detected pitch ${m.note} (${m.pitchHz}Hz).${rangeLine} Scores: ${meterLine}. Emphasis for this instrument: ${result.profile?.emphasis}. Give me the top 2 things to work on and one concrete drill. Keep it tight.`;
    setBusy(true); setFeedback("");
    if (signedIn) {
      try { const r = await occChatApi({ model: "corey-gpt", prompt, knowledge: [], history: [], slang: true, acronyms: [], suggest: !!state.occ?.settings?.suggestions }); setFeedback(r.text); }
      catch { setFeedback(localCoreyFeedback(result, context)); }
    } else setFeedback(localCoreyFeedback(result, context));
    setBusy(false);
  };

  const shownMeters = result?.ok ? (result.profile?.metrics || ["pitch", "breath", "cadence", "control"]) : [];
  const m = result?.metrics;
  return (
    <div className="card">
      <div className="card-header"><span>🎙️ InstrumentZ Lab{result?.ok && result.profile ? ` · ${result.profile.label}` : ""}</span>{status === "recording" && <span className="tag" style={{ color: "var(--danger)" }}>● REC</span>}</div>
      <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Record live or drop an audio/video file — the lab analyzes your real pitch, range, breath &amp; cadence (tuned to this instrument), then Corey coaches you.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {status !== "recording"
          ? <button className="btn btn-small btn-success" onClick={startRec}>🎙️ Record</button>
          : <button className="btn btn-small btn-danger" onClick={stopRec}>⏹ Stop &amp; analyze</button>}
        <label className="btn btn-small btn-secondary" style={{ cursor: "pointer" }}>📁 Upload audio/video<input type="file" accept="audio/*,video/*" onChange={onFile} style={{ display: "none" }} /></label>
      </div>
      {status === "analyzing" && <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 8 }}>⏳ Analyzing…</p>}
      {status === "denied" && <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>🎤 Mic blocked — allow microphone access, or upload a file instead.</p>}
      {result && !result.ok && status !== "analyzing" && <p style={{ fontSize: 12, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>Couldn't read enough voiced audio — record a few seconds louder, or upload a clearer clip.</p>}
      {result?.ok && (
        <>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, marginBottom: 6 }}>Detected: <strong>{m.note}</strong> · {m.pitchHz}Hz · {m.durationSec}s · overall <strong style={{ color: "var(--primary)" }}>{toTen(result.scores.overall)}/10</strong></div>
            {/* Pitch range panel — low→high span + detected vocal class */}
            {m.rangeSemitones > 0 && (
              <div style={{ marginBottom: 8, padding: 8, borderRadius: 10, background: "rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span>📏 Range</span>
                  <strong>{m.lowNote} → {m.highNote} · {m.rangeOctaves} oct ({m.rangeSemitones} st)</strong>
                </div>
                {m.vocalClass && <div style={{ fontSize: 11, color: "var(--accent, #22e6ff)", marginTop: 3 }}>{m.vocalClassEmoji} Reads as <strong>{m.vocalClass}</strong> (center {m.note})</div>}
              </div>
            )}
            {shownMeters.filter((id) => id in result.scores).map((id) => (
              <div key={id} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>{METER_LABELS[id] || id}</span><strong>{toTen(result.scores[id])}/10</strong></div>
                <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.1)" }}><div style={{ width: `${result.scores[id]}%`, height: "100%", borderRadius: 3, background: "var(--primary)" }} /></div>
              </div>
            ))}
          </div>
          <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={askCorey} disabled={busy}>{busy ? "🎤 Corey's listening…" : "🎤 Get Corey feedback"}</button>
          {feedback && <p style={{ fontSize: 12, whiteSpace: "pre-wrap", marginTop: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 10 }}>{feedback}</p>}
          {media && signedIn && (
            <SaveTakeAsPost
              media={media}
              result={result}
              context={context}
              skill={skill}
              onOpen={onOpen}
              save={save}
              setSave={setSave}
            />
          )}
        </>
      )}
    </div>
  );
}

// Turn a scored take into a nameable PostZ carrying its audio/video + the /10
// score, then rate / comment / share it — and cross-pollinate to CollabZ or a DAW.
function SaveTakeAsPost({ media, result, context, skill, onOpen, save, setSave }) {
  const [name, setName] = useState("");
  const [vis, setVis] = useState("public");
  const [busy, setBusy] = useState(false);
  const [budget, setBudget] = useState(null); // { used, cap, remaining }
  const [err, setErr] = useState("");
  const posted = save?.post;

  useEffect(() => { getSubmissionsApi().then(setBudget).catch(() => {}); }, []);

  const savePost = async () => {
    setBusy(true); setErr("");
    try {
      const up = await uploadFileApi(new File([media.blob], media.name || "take.webm", { type: media.blob.type || "audio/webm" }));
      const url = up?.upload?.url || up?.url || "";
      const scores10 = Object.fromEntries(Object.entries(result.scores || {}).map(([k, v]) => [k, Number(toTen(v))]));
      const post = await createPostzApi({
        title: (name || `${skill || context || "Take"}`).slice(0, 160),
        description: `🎙️ ${skill || context} take · overall ${toTen(result.scores.overall)}/10`,
        media_url: url,
        media_type: media.type,
        score: { overall: Number(toTen(result.scores.overall)), meters: scores10, note: result.metrics?.note },
        visibility: vis,
      });
      setSave({ post, url });
    } catch (e) {
      const msg = e?.message || "";
      setErr(/limit|429/i.test(msg) ? "Daily submission limit reached — upgrade for more submits." : (msg || "Couldn't save the take."));
    }
    setBusy(false);
  };

  if (posted) {
    return (
      <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(46,213,115,0.1)", border: "1px solid var(--success)" }}>
        <div style={{ fontSize: 13, color: "var(--success)", fontWeight: 700 }}>✅ Saved as PostZ — “{posted.title}”</div>
        <p style={{ fontSize: 11, color: "var(--text-light)", margin: "4px 0 8px" }}>It's on the feed now — others can rate it out of 10, comment, and share. Cross-pollinate it:</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {onOpen && <button className="btn btn-small btn-secondary" onClick={() => onOpen("collabz")}>🤝 Send to CollabZ</button>}
          {onOpen && <button className="btn btn-small btn-secondary" onClick={() => onOpen("dawz")}>🎛️ Open in DAW</button>}
          {onOpen && <button className="btn btn-small btn-secondary" onClick={() => onOpen("postz")}>📣 View in PostZ</button>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>💾 Save this take as a PostZ</div>
      {budget && <div style={{ fontSize: 11, color: budget.remaining > 0 ? "var(--text-light)" : "var(--danger)", marginBottom: 6 }}>Submits left today: <strong>{budget.remaining}/{budget.cap}</strong>{budget.remaining <= 0 ? " — upgrade for more" : ""}</div>}
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Name your take (e.g. "${skill || "Verse"} v1")`} style={{ width: "100%", marginBottom: 6 }} maxLength={160} />
      <select value={vis} onChange={(e) => setVis(e.target.value)} style={{ width: "100%", marginBottom: 6 }}>
        <option value="public">🌐 Public — anyone can rate &amp; share</option>
        <option value="restricted">🔒 Members only</option>
        <option value="private">🙈 Private (just me)</option>
      </select>
      {err && <p style={{ fontSize: 11, color: "var(--danger)", margin: "0 0 6px" }}>{err}</p>}
      <button className="btn btn-small btn-success" style={{ width: "100%" }} onClick={savePost} disabled={busy || (budget && budget.remaining <= 0)}>{busy ? "Saving…" : "💾 Save take → PostZ"}</button>
    </div>
  );
}

// Reusable record-or-upload → hosted URL + inline preview. Used anywhere a
// member can attach audio/video: CollabZ, BattleZ, Social ConnectZ, MessageZ, OCC.
// Media player that degrades gracefully — if the URL 404s (e.g. media host not
// yet serving), it shows a note instead of a broken <video>/<img>.
function SmartMedia({ url, type, style }) {
  const [broken, setBroken] = useState(false);
  if (!url) return null;
  if (broken) {
    return <div style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.05)" }}>⏳ Media still processing or unavailable — refresh in a moment.</div>;
  }
  return type === "video"
    ? <video src={url} controls onError={() => setBroken(true)} style={{ width: "100%", maxHeight: 260, borderRadius: 8, ...style }} />
    : <audio src={url} controls onError={() => setBroken(true)} style={{ width: "100%", ...style }} />;
}

// Read a media blob's duration (seconds) off a temporary element — best-effort.
function probeDuration(blob, type) {
  return new Promise((resolve) => {
    try {
      const el = document.createElement(type === "video" ? "video" : "audio");
      el.preload = "metadata";
      const url = URL.createObjectURL(blob);
      const done = (d) => { URL.revokeObjectURL(url); resolve(Number.isFinite(d) && d > 0 ? d : 0); };
      el.onloadedmetadata = () => done(el.duration);
      el.onerror = () => done(0);
      el.src = url;
      setTimeout(() => done(el.duration), 4000); // safety timeout
    } catch { resolve(0); }
  });
}

function MediaCapture({ onUploaded, accept = "audio/*,video/*", allowVideo = true, compact = false }) {
  const [status, setStatus] = useState("");   // "", "recording", "uploading", "denied"
  const [preview, setPreview] = useState(null); // { url, type }
  const [err, setErr] = useState("");
  const recRef = useRef(null); const chunksRef = useRef([]); const streamRef = useRef(null);

  const upload = async (blob, type, name) => {
    setStatus("uploading"); setErr("");
    try {
      const duration = await probeDuration(blob, type);
      const file = new File([blob], name || `clip.${type === "video" ? "webm" : "webm"}`, { type: blob.type || (type === "video" ? "video/webm" : "audio/webm") });
      const r = await uploadFileApi(file);
      const url = r?.upload?.url || r?.url || "";
      const info = { url, type, duration };
      setPreview(info); onUploaded?.(info);
    } catch (e) {
      const msg = e?.message || "";
      setErr(/413|too large/i.test(msg) ? "File's too big for your tier — upgrade for larger uploads." : /409|storage/i.test(msg) ? "Storage full — free some space or upgrade." : (msg || "Upload failed."));
    }
    setStatus("");
  };

  const startRec = async (wantVideo) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(wantVideo ? { audio: true, video: true } : { audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream); chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || (wantVideo ? "video/webm" : "audio/webm") });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        upload(blob, wantVideo ? "video" : "audio");
      };
      recRef.current = { mr, video: wantVideo }; mr.start(); setStatus("recording");
    } catch { setStatus("denied"); }
  };
  const stopRec = () => { if (recRef.current?.mr?.state === "recording") recRef.current.mr.stop(); };
  const onFile = (e) => { const f = e.target.files?.[0]; if (f) upload(f, (f.type || "").startsWith("video") ? "video" : "audio", f.name); e.target.value = ""; };

  return (
    <div style={{ marginTop: compact ? 4 : 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {status !== "recording" ? (
          <>
            <button type="button" className="btn btn-small btn-success" onClick={() => startRec(false)}>🎙️ Record</button>
            {allowVideo && <button type="button" className="btn btn-small btn-secondary" onClick={() => startRec(true)}>🎥 Video</button>}
            <label className="btn btn-small btn-secondary" style={{ cursor: "pointer" }}>📁 Attach<input type="file" accept={accept} onChange={onFile} style={{ display: "none" }} /></label>
          </>
        ) : (
          <button type="button" className="btn btn-small btn-danger" onClick={stopRec}>⏹ Stop &amp; upload</button>
        )}
        {status === "uploading" && <span style={{ fontSize: 11, color: "var(--text-light)" }}>⏳ Uploading…</span>}
        {status === "recording" && <span className="tag" style={{ color: "var(--danger)" }}>● REC</span>}
      </div>
      {status === "denied" && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 4 }}>🎤 Mic/camera blocked — allow access or attach a file.</p>}
      {err && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 4 }}>{err}</p>}
      {preview?.url && (
        <div style={{ marginTop: 6 }}>
          <SmartMedia url={preview.url} type={preview.type} style={{ maxHeight: 220 }} />
          <button type="button" className="btn btn-small btn-secondary" style={{ marginTop: 4 }} onClick={() => { setPreview(null); onUploaded?.(null); }}>✕ Remove</button>
        </div>
      )}
    </div>
  );
}

// ---- SingZ vocal game engine (loop: check-in → warmup → mission → boss → cooldown → reward) ----
function SingZPage({ tier, onOpen }) {
  const { state, update, addXP, awardBadge } = useAppState();
  const sz = state.singz || { onboarded: false, sessions: [], badges: [], quests: {}, strain: 0 };
  const setSz = (patch) => update({ singz: { ...sz, ...patch } });
  const isStatz = /stat[sz]/i.test(tier || "");

  const [tab, setTab] = useState("session");
  const [stage, setStage] = useState(null); // active session stage
  const [checkin, setCheckin] = useState({ condition: 3, hydration: 3, rest: 3, energy: 3 });
  const [skill, setSkill] = useState("Pitch");
  const [scores, setScores] = useState(null);
  const [labResult, setLabResult] = useState(null); // real audio analysis, if recorded

  const diff = DIFFICULTIES.find((d) => d.id === sz.difficulty) || DIFFICULTIES[0];
  const sessions = sz.sessions || [];
  const recoveryMode = (sz.strain || 0) >= 2; // repeated strain → recovery-first

  // ---- Onboarding ----
  if (!sz.onboarded) {
    const detect = () => setSz({ range: RANGE_CLASSES[Math.floor(Math.random() * RANGE_CLASSES.length)].name });
    return (
      <>
        <div className="stripe-section"><div className="stripe-title">🎤 SingZ — set up your voice</div><div className="balance-info">Baseline test → confirm range → pick a goal. Voice-health first, always.</div></div>
        <div className="card">
          <div className="card-header">🎙️ Baseline range test</div>
          <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 8 }}>Hum low to high; SingZ auto-detects your likely class. Confirm or change it.</p>
          <button className="btn btn-small" onClick={detect}>🔎 Auto-detect range</button>
          {sz.range && <p style={{ fontSize: 12, color: "var(--accent, #22e6ff)", marginTop: 8 }}>Detected: {RANGE_CLASSES.find((r) => r.name === sz.range)?.emoji} <strong>{sz.range}</strong></p>}
          <div className="chip-wrap" style={{ marginTop: 8 }}>
            {RANGE_CLASSES.map((r) => <button key={r.name} className={`heritage-chip${sz.range === r.name ? " sel" : ""}`} onClick={() => setSz({ range: r.name })}>{r.emoji} {r.name}</button>)}
          </div>
        </div>
        <div className="card">
          <div className="card-header">🎯 Goal range</div>
          <div className="chip-wrap">{RANGE_CLASSES.map((r) => <button key={r.name} className={`heritage-chip${sz.goalRange === r.name ? " sel" : ""}`} onClick={() => setSz({ goalRange: r.name })}>{r.emoji} {r.name}</button>)}</div>
        </div>
        <div className="card">
          <div className="card-header">🧭 Goal path</div>
          {GOAL_PATHS.map((g) => <button key={g.id} className={`persona-btn${sz.goalPath === g.id ? " sel-pref" : ""}`} style={{ width: "100%", marginBottom: 6, ...(sz.goalPath === g.id ? { borderColor: "var(--primary)" } : {}) }} onClick={() => setSz({ goalPath: g.id })}>{g.emoji} {g.name} — {g.note}</button>)}
        </div>
        <div className="card">
          <div className="card-header">🎚️ Starting difficulty</div>
          <div className="chip-wrap">{DIFFICULTIES.filter((d) => d.id !== "boss").map((d) => <button key={d.id} className={`heritage-chip${sz.difficulty === d.id ? " sel" : ""}`} onClick={() => setSz({ difficulty: d.id })}>{d.emoji} {d.name}</button>)}</div>
        </div>
        <button className="btn btn-success" style={{ width: "100%" }} disabled={!sz.range || !sz.goalRange} onClick={() => setSz({ onboarded: true })}>✅ Start training</button>
      </>
    );
  }

  // ---- Session flow ----
  const startSession = () => { setStage("checkin"); setScores(null); setTab("session"); };
  const wellness = wellnessOf(checkin);
  const runMission = () => {
    const lab = labResult?.ok ? labResult.scores : null;
    const lm = labResult?.ok ? labResult.metrics : null;
    // If the take clearly detected a vocal class, remember/confirm it.
    if (lm?.vocalClass && lm.vocalClass !== sz.range) setSz({ detectedRange: lm.vocalClass });
    const s = {};
    SCORE_METERS.forEach((m) => {
      // Real audio maps onto the meters when a take was recorded/uploaded.
      if (lab) {
        const map = { pitch: lab.pitch, tone: lab.tone ?? lab.control, breath: lab.breath, range: lab.range ?? lab.pitch, agility: lab.cadence ?? lab.control, consistency: lab.control };
        if (m.id in map) { s[m.id] = map[m.id]; return; }
      }
      let b = diff.base;
      if (m.id === "health") b = 60 + wellness * 8;
      if (m.id === "goal") b = (lab ? lab.overall : diff.base) - (sz.goalPath === "bridge" ? 6 : 0);
      s[m.id] = lab && m.id === "goal" ? Math.max(30, Math.min(100, Math.round(b))) : simScore(b, wellness);
    });
    setScores(s);
    setStage("boss");
  };
  const finishSession = () => {
    const overall = Math.round(SCORE_METERS.reduce((t, m) => t + scores[m.id], 0) / SCORE_METERS.length);
    const strained = scores.health < 55 || wellness <= 2;
    const rec = { id: Date.now(), at: Date.now(), skill, difficulty: diff.id, overall, scores, range: sz.range };
    const badges = [...(sz.badges || [])];
    if (scores.pitch >= 92 && !badges.includes("Pitch Sniper")) { awardBadge("SingZ: Pitch Sniper"); badges.push("Pitch Sniper"); }
    if (scores.breath >= 90 && !badges.includes("Breath Keeper")) { awardBadge("SingZ: Breath Keeper"); badges.push("Breath Keeper"); }
    setSz({ sessions: [rec, ...sessions].slice(0, 100), badges, strain: strained ? (sz.strain || 0) + 1 : 0 });
    addXP(8 + Math.round(overall / 10), `SingZ ${skill}`);
    setStage("reward");
  };

  const TABS = [["session", "🎮 Session"], ["progress", "📈 Progress"], ["badgez", "🏅 BadgeZ"], ["setup", "⚙️ Setup"]];

  return (
    <>
      <div className="chip-wrap" style={{ marginBottom: 12 }}>
        {TABS.map(([id, l]) => <button key={id} className={`heritage-chip${tab === id ? " sel" : ""}`} onClick={() => setTab(id)}>{l}</button>)}
      </div>

      {tab === "session" && <HabitStrip appKey="singz" appName="SingZ" onOpen={onOpen} />}

      {tab === "session" && (
        <>
          {recoveryMode && <div className="card" style={{ border: "1px solid var(--gold, #ffcf3f)" }}><p style={{ fontSize: 12, color: "var(--gold, #ffcf3f)" }}>🚨 Recovery-first mode — repeated strain detected. Stage Boss &amp; advanced range work are paused until you log a healthy check-in. Protect the voice.</p></div>}
          {!stage && (
            <div className="card">
              <div className="card-header"><span>🎤 {RANGE_CLASSES.find((r) => r.name === sz.range)?.emoji} {sz.range} → {sz.goalRange}</span><span className="tag">{diff.emoji} {diff.name}</span></div>
              <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 8 }}>Goal path: {GOAL_PATHS.find((g) => g.id === sz.goalPath)?.emoji} {GOAL_PATHS.find((g) => g.id === sz.goalPath)?.name}. The loop: check-in → warmup → skill mission → boss take → cooldown → reward.</p>
              <button className="btn btn-success" style={{ width: "100%" }} onClick={startSession}>▶️ Start session</button>
            </div>
          )}

          {stage === "checkin" && (
            <div className="card">
              <div className="card-header">🎤 Check-in</div>
              {CHECKIN.map((c) => (
                <div key={c.id} style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12 }}>{c.label}</label>
                  <div className="chip-wrap">{[1, 2, 3, 4, 5].map((n) => <button key={n} className={`heritage-chip${checkin[c.id] === n ? " sel" : ""}`} onClick={() => setCheckin((s) => ({ ...s, [c.id]: n }))}>{n}</button>)}</div>
                </div>
              ))}
              <p style={{ fontSize: 11, color: wellness <= 2 ? "var(--danger)" : "var(--text-light)" }}>{wellness <= 2 ? "⚠️ Low readiness — SingZ will keep it gentle and recovery-focused." : "✅ Good to train."}</p>
              <button className="btn" style={{ width: "100%" }} onClick={() => setStage("warmup")}>Next → Warmup</button>
            </div>
          )}

          {stage === "warmup" && (
            <div className="card">
              <div className="card-header">🔥 Warmup Quest</div>
              <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 8 }}>Lip trills, sirens, and gentle scales to open the voice. Complete before advanced work unlocks.</p>
              <button className="btn btn-success" style={{ width: "100%" }} onClick={() => setStage("mission")}>✅ Warmup done</button>
            </div>
          )}

          {stage === "mission" && (
            <>
              <div className="card">
                <div className="card-header">🎯 Skill Mission</div>
                <div className="form-group"><label>Train a skill</label>
                  <div className="chip-wrap">{SINGZ_SKILLS.map((s) => <button key={s} className={`heritage-chip${skill === s ? " sel" : ""}`} onClick={() => setSkill(s)}>{s}</button>)}</div>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-light)" }}>Record or upload your take below for real pitch/breath/cadence scoring — or skip the lab to run a guided (simulated) mission.</p>
              </div>
              <AudioLab context={`singing take (${skill})`} kind="voice" onResult={setLabResult} onOpen={onOpen} skill={`SingZ ${skill}`} />
              <button className="btn btn-success" style={{ width: "100%" }} onClick={runMission}>{labResult?.ok ? "👑 Score my take as the Boss Take" : "🎙️ Run guided mission"}</button>
            </>
          )}

          {stage === "boss" && scores && (
            <div className="card">
              <div className="card-header">👑 Boss Take — scored</div>
              {SCORE_METERS.map((m) => (
                <div key={m.id} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>{m.emoji} {m.name}</span><strong style={{ color: scores[m.id] >= 80 ? "var(--success)" : scores[m.id] >= 65 ? "var(--accent, #22e6ff)" : "var(--gold, #ffcf3f)" }}>{toTen(scores[m.id])}/10</strong></div>
                  <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.1)" }}><div style={{ width: `${scores[m.id]}%`, height: "100%", borderRadius: 3, background: "var(--primary)" }} /></div>
                </div>
              ))}
              <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={() => setStage("cooldown")}>Next → Cooldown</button>
            </div>
          )}

          {stage === "cooldown" && (
            <div className="card">
              <div className="card-header">🛌 Recovery Cooldown</div>
              <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 8 }}>Descending hums and rest — required before you finish. This is what keeps your voice healthy long-term.</p>
              <button className="btn btn-success" style={{ width: "100%" }} onClick={finishSession}>🏆 Complete &amp; claim reward</button>
            </div>
          )}

          {stage === "reward" && scores && (
            <div className="card" style={{ border: "1px solid var(--primary)" }}>
              <div className="card-header">🏆 Reward</div>
              <p style={{ fontSize: 13 }}>Session complete — <strong>{toTen(Math.round(SCORE_METERS.reduce((t, m) => t + scores[m.id], 0) / SCORE_METERS.length))}/10</strong> overall on {skill}. XP earned, streak advanced. {scores.health < 55 ? "⚠️ Voice health was low — logged for recovery." : "Voice health solid 💪"}</p>
              <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={() => { setStage(null); setTab("session"); }}>Done</button>
            </div>
          )}
        </>
      )}

      {tab === "progress" && (
        <>
          <div className="stripe-section"><div className="stripe-title">📈 Progress</div><div className="balance-info">{sessions.length} sessions · avg {sessions.length ? toTen(Math.round(sessions.reduce((t, s) => t + s.overall, 0) / sessions.length)) : "0.0"}/10 · 🔥 {state.progression?.streak || 0}</div></div>
          <div className="card">
            <div className="card-header">🗺️ VoiceMap (averages)</div>
            {SCORE_METERS.map((m) => { const vals = sessions.map((s) => s.scores[m.id]).filter(Boolean); const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0; return (
              <div key={m.id} className="settings-toggle"><label>{m.emoji} {m.name}</label><span className="tag">{avg ? `${toTen(avg)}/10` : "—"}</span></div>
            ); })}
          </div>
          <div className="card">
            <div className="card-header">🧾 Recent sessions</div>
            {sessions.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No sessions yet.</p>
              : sessions.slice(0, 10).map((s) => <div key={s.id} className="post-card"><div className="post-user">{s.skill} · {toTen(s.overall)}/10</div><div className="post-meta">{new Date(s.at).toLocaleString()} · {DIFFICULTIES.find((d) => d.id === s.difficulty)?.name}</div></div>)}
          </div>
        </>
      )}

      {tab === "badgez" && (
        <div className="card">
          <div className="card-header">🏅 BadgeZ</div>
          {(sz.badges || []).length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>Earn badges like Pitch Sniper 🎯 and Breath Keeper 🫁 by scoring high.</p>
            : <div className="chip-wrap">{sz.badges.map((b) => <span key={b} className="tag">🏅 {b}</span>)}</div>}
        </div>
      )}

      {tab === "setup" && (
        <>
          <div className="card">
            <div className="card-header">🎚️ Difficulty</div>
            <div className="chip-wrap">{DIFFICULTIES.map((d) => <button key={d.id} className={`heritage-chip${sz.difficulty === d.id ? " sel" : ""}`} disabled={d.id === "boss" && recoveryMode} onClick={() => setSz({ difficulty: d.id })}>{d.emoji} {d.name}</button>)}</div>
            <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 6 }}>{diff.note}</p>
          </div>
          <div className="card">
            <div className="card-header">🎯 Range &amp; goal</div>
            <p style={{ fontSize: 12 }}>Current: {sz.range} → Goal: {sz.goalRange} · {GOAL_PATHS.find((g) => g.id === sz.goalPath)?.name}</p>
            <button className="btn btn-small btn-secondary" style={{ marginTop: 8 }} onClick={() => setSz({ onboarded: false })}>Re-run onboarding</button>
          </div>
          <div className="card">
            <div className="card-header"><span>🤖 AI Vocal Coach</span>{!isStatz && <span className="tag">🔒 StatZ</span>}</div>
            <p style={{ fontSize: 12, color: "var(--text-light)" }}>{isStatz ? "StatZ: deeper feedback on weak notes/transitions, advanced range mapping, auto weekly vocal plan, and smart song breakdowns." : "🔒 The AI Vocal Coach, advanced range mapping, and auto weekly plans are a StatZ feature."}</p>
          </div>
        </>
      )}
    </>
  );
}
function RapZPage({ onOpen }) {
  return (
    <>
      <div className="stripe-section"><div className="stripe-title">🎧 RapZ</div><div className="balance-info">Drop a verse live or upload it — get real flow/breath/cadence scoring + Corey feedback.</div></div>
      <HabitStrip appKey="rapz" appName="RapZ" onOpen={onOpen} />
      <AudioLab context="rap verse" kind="rap" onOpen={onOpen} skill="RapZ verse" />
      <TrainingZ appKey="rapz" />
    </>
  );
}

const MERCH_CATS = [
  { id: "apparel", label: "👕 Apparel" },
  { id: "art", label: "🖼️ Art / Prints" },
  { id: "beats", label: "🎹 Beats" },
  { id: "samples", label: "🎛️ Sample Packs" },
  { id: "accessories", label: "🧢 Accessories" },
  { id: "digital", label: "💾 Digital" },
  { id: "routines", label: "🏋️ Routines" },
];
function MerchZPage({ tier, serverOk, syncEconomy }) {
  const { state, updateWallet, addTo } = useAppState();
  const [tab, setTab] = useState("shop");
  const [items, setItems] = useState(null); // null = offline/not loaded
  const [form, setForm] = useState({ title: "", description: "", category: "apparel", price: "" });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => getMerchApi().then((r) => setItems(r.items)).catch(() => setItems(null));
  useEffect(() => { if (serverOk) reload(); else setItems(null); }, [serverOk]);

  const publish = async () => {
    if (!form.title.trim() || !(Number(form.price) > 0)) { setMsg("Title and a price are required."); return; }
    setBusy(true); setMsg("");
    try {
      await createMerchApi({ title: form.title.trim(), description: form.description.trim(), category: form.category, priceCents: Math.round(Number(form.price) * 100), image: file });
      setForm({ title: "", description: "", category: "apparel", price: "" }); setFile(null);
      await reload(); setTab("mine");
    } catch (e) { setMsg(e.message || "Could not publish"); }
    setBusy(false);
  };
  const buy = async (it) => {
    setMsg("");
    try {
      const r = await buyMerchApi(it.id);
      updateWallet({ balance: r.wallet.money });
      addTo("paymentHistory", { amount: -(it.price_cents / 100), dev: r.dev_tax_cents / 100, at: Date.now(), note: `MerchZ: ${it.title}` });
      setMsg(`✅ Bought ${it.title} from @${it.seller}.`); reload(); syncEconomy?.();
    } catch (e) { setMsg(e.message || "Purchase failed"); }
  };
  const del = async (id) => { try { await deleteMerchApi(id); reload(); } catch { /* ignore */ } };

  if (!serverOk || items === null) {
    return (
      <div className="card">
        <div className="card-header">🛍️ MerchZ <span className="tag">offline</span></div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>The creator marketplace needs a live connection. Sell &amp; buy legal goods — apparel, art, beats, sample packs — with the developer tax on every sale.</p>
      </div>
    );
  }

  const shop = items.filter((i) => !i.mine);
  const mine = items.filter((i) => i.mine);
  const catLabel = (id) => MERCH_CATS.find((c) => c.id === id)?.label || id;
  const list = tab === "mine" ? mine : shop;

  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">🛍️ MerchZ <span className="tag" style={{ color: "var(--success)" }}>● live</span></div>
        <div className="balance-info">Creator marketplace · Balance {money(state.wallet.balance)} · {devTaxFor(tier).label} developer tax {Math.round(devTaxFor(tier).rate * 100)}% on every sale</div>
        <div className="chip-wrap" style={{ marginTop: 8 }}>
          <button className={`heritage-chip${tab === "shop" ? " sel" : ""}`} onClick={() => setTab("shop")}>🛒 Shop ({shop.length})</button>
          <button className={`heritage-chip${tab === "sell" ? " sel" : ""}`} onClick={() => setTab("sell")}>🏷️ Sell</button>
          <button className={`heritage-chip${tab === "mine" ? " sel" : ""}`} onClick={() => setTab("mine")}>📦 My Listings ({mine.length})</button>
        </div>
        {msg && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>{msg}</p>}
      </div>

      {tab === "sell" ? (
        <div className="card">
          <div className="card-header">🏷️ List an item</div>
          <div className="form-group"><label>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Neon Logo Hoodie" /></div>
          <div className="form-group"><label>Description</label><CappedTextarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ height: 50 }} /></div>
          <label style={{ fontSize: 11, color: "var(--text-light)" }}>Category</label>
          <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
            {MERCH_CATS.map((c) => <button key={c.id} className={`heritage-chip${form.category === c.id ? " sel" : ""}`} onClick={() => setForm({ ...form, category: c.id })}>{c.label}</button>)}
          </div>
          <div className="form-group"><label>Price ($)</label><input type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="20.00" /></div>
          <label className="btn btn-secondary btn-small" style={{ display: "block", textAlign: "center", cursor: "pointer" }}>
            {file ? `📷 ${file.name}` : "📷 Add a photo (optional)"}
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <p style={{ fontSize: 10, color: "var(--text-light)", margin: "8px 0" }}>Legal goods only. Every sale takes the {devTaxFor(tier).label} developer tax; you keep the rest.</p>
          <button className="btn btn-success" style={{ width: "100%" }} disabled={busy || !form.title.trim() || !(Number(form.price) > 0)} onClick={publish}>{busy ? "Publishing…" : "🏷️ Publish listing"}</button>
        </div>
      ) : (
        <div className="card">
          <div className="card-header"><span>{tab === "mine" ? "📦 My Listings" : "🛒 Shop"}</span><span className="tag">{list.length}</span></div>
          {list.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-light)" }}>{tab === "mine" ? "You haven't listed anything yet." : "No items yet — be the first to sell."}</p>
          ) : list.map((it) => (
            <div key={it.id} className="post-card">
              {it.image_url && <img src={it.image_url} alt={it.title} style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 10, marginBottom: 8 }} />}
              <div className="post-user">{it.title} <span className="tag">{catLabel(it.category)}</span></div>
              {it.description && <div className="post-content">{it.description}</div>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0" }}>
                <span className="tag">by @{it.seller}</span>
                <span className="tag" style={{ color: it.mine ? FLOW_GREEN : undefined }}>{money(it.price_cents / 100)}</span>
                {it.sold > 0 && <span className="tag">🛒 {it.sold} sold</span>}
                {it.mine && it.sold > 0 && <span className="tag">earned <Amount value={(it.price_cents / 100) * it.sold} flow="in" sign bold /></span>}
              </div>
              {it.mine ? (
                <button className="btn btn-small btn-danger" onClick={() => del(it.id)}>🗑️ Remove</button>
              ) : it.bought ? (
                <span className="tag" style={{ color: "var(--success)" }}>✓ Purchased</span>
              ) : (
                <>
                  <CostBreakdown amount={it.price_cents / 100} tier={tier} recipient={`@${it.seller}`} payLabel="You pay" />
                  <button className="btn btn-small" onClick={() => buy(it)}>🛒 Buy <Amount value={it.price_cents / 100} flow="out" sign={false} bold /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// DirectZ — create collaborative ReelZ/EpisodeZ/MovieZ, pay every contributor
// their worth for the skills used, get an AI rating on submit that real user
// ratings take over once 3+ people rate.
function DirectZWorkCard({ w, onRated, mine }) {
  const [busy, setBusy] = useState(false);
  const rate = async (score) => {
    setBusy(true);
    try { const r = await rateDirectzApi(w.id, score); onRated?.(r); } catch { /* offline */ }
    setBusy(false);
  };
  const fmt = DIRECTZ_FORMATS.find((f) => f.id === w.fmt);
  return (
    <div className="post-card">
      <div className="post-user">{fmt?.emoji} {w.title} <span className="tag">{fmt?.name}</span></div>
      <div className="post-meta">{w.genre && `🎞️ ${w.genre} · `}{w.video_type && `${w.video_type} · `}{w.mood && `🫥 ${w.mood} · `}by @{w.owner}{w.duration_sec ? ` · ${fmtDur(w.duration_sec)}` : ""}</div>
      {w.media_url && <div style={{ margin: "6px 0" }}><SmartMedia url={w.media_url} type={w.media_type === "audio" ? "audio" : "video"} style={{ maxHeight: 260 }} /></div>}
      {w.description && <div className="post-content" style={{ fontSize: 12 }}>{w.description}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: "var(--gold, #ffcf3f)" }}>⭐ {w.rating != null ? `${w.rating}/10` : "—"}</span>
        <span className="tag" style={{ color: w.source === "users" ? "var(--success)" : "var(--accent, #22e6ff)" }}>{w.source === "users" ? `👥 ${w.count} user ratings` : `🤖 AI rating${w.count ? ` · ${w.count}/3 user` : ""}`}</span>
      </div>
      {(w.contributors || []).length > 0 && (
        <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 6 }}>
          🤝 {w.contributors.map((c) => c.name).filter(Boolean).join(", ")} — paid their worth for skills used
        </div>
      )}
      {!mine && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 11, marginBottom: 3 }}>Rate this work{w.my_rating ? ` · you: ${w.my_rating}` : ""}:</div>
          <StarRow value={w.my_rating || 0} size={20} showEnds onRate={(n) => !busy && rate(n)} />
        </div>
      )}
      <SocialBar id={`directz:${w.id}`} shareText={`${w.title} on DirectZ`} />
    </div>
  );
}

function DirectZPage({ tier, serverOk }) {
  const { state } = useAppState();
  const me = state.user?.name || state.user?.username || "You";
  const [tab, setTab] = useState("feed");
  const [fmtFilter, setFmtFilter] = useState("");
  const [works, setWorks] = useState([]);
  const [msg, setMsg] = useState("");
  // create form
  const [form, setForm] = useState({ fmt: "reelz", video_type: VIDEO_TYPES[0].name, genre: "", mood: "", title: "", description: "", minutes: 2, media: null });
  const [rows, setRows] = useState([{ id: 1, name: me, tier: tier || "free", skills: [{ name: "Direction", price: 60 }] }]);
  const setF = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  // A video's real duration drives the category. When one's attached, its length
  // must fit the selected format's band (backend enforces too).
  const vidDur = form.media?.duration ? Math.round(form.media.duration) : 0;
  const detectedFmt = vidDur ? directzFormatForSec(vidDur)?.id || null : null;
  const durationSec = vidDur || Math.round((Number(form.minutes) || 0) * 60);
  const fmtMismatch = !!form.media && detectedFmt !== form.fmt; // includes out-of-all-bands (null)
  const onMedia = (m) => {
    setForm((s) => {
      const next = { ...s, media: m };
      if (m?.duration) { const f = directzFormatForSec(Math.round(m.duration)); if (f) next.fmt = f.id; }
      return next;
    });
  };
  const fmtRange = (id) => DIRECTZ_FORMATS.find((f) => f.id === id)?.label || "";

  const load = () => { if (serverOk) getDirectzApi(fmtFilter).then((r) => setWorks(r.works || [])).catch(() => setWorks([])); };
  useEffect(load, [serverOk, fmtFilter]);

  const worthOf = (r) => r.skills.reduce((t, s) => t + (Number(s.price) || 0), 0);
  const setRow = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const setSkill = (id, si, patch) => setRow(id, { skills: rows.find((r) => r.id === id).skills.map((s, i) => (i === si ? { ...s, ...patch } : s)) });
  const addSkill = (id) => setRow(id, { skills: [...rows.find((r) => r.id === id).skills, { name: "", price: "" }] });
  const addPerson = () => setRows((rs) => [...rs, { id: Date.now(), name: "", tier: "free", skills: [{ name: "", price: "" }] }]);
  const participants = rows.filter((r) => r.name.trim()).map((r) => ({ id: r.id, name: r.name.trim(), tier: r.tier, worth: worthOf(r) }));
  const settled = participants.length >= 2 ? collabSettlement(participants) : [];

  const submit = async () => {
    if (!form.title.trim()) return;
    setMsg("");
    if (fmtMismatch) { setMsg("⛔ The video's length doesn't fit the selected category — switch to the suggested one first."); return; }
    const contributors = rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), tier: r.tier, skills: r.skills.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), price: Number(s.price) || 0 })) }));
    const body = { fmt: form.fmt, video_type: form.video_type, genre: form.genre, mood: form.mood, title: form.title.trim(), description: form.description.trim(), duration_sec: durationSec, media_url: form.media?.url || "", media_type: form.media?.type || "", contributors };
    try {
      const w = await createDirectzApi(body);
      setMsg(`🤖 Submitted — AI rated it ${w.rating}/10. Real user ratings take over once 3 people rate it.`);
      setForm((s) => ({ ...s, title: "", description: "", media: null }));
      setTab("feed"); load();
    } catch (e) {
      setMsg(/duration_out_of_band|doesn't fit/i.test(e?.message || "") ? (e.message || "That length doesn't fit the category.") : "Couldn't submit — sign in and connect to post a DirectZ work.");
    }
  };

  const onRated = (updated) => setWorks((ws) => ws.map((w) => (w.id === updated.id ? updated : w)));

  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">🎬 DirectZ</div>
        <div className="balance-info">Direct collaborative video — ReelZ, EpisodeZ &amp; MovieZ. Every contributor is paid their worth for the skills used. AI rates your submission, then real members' ratings take over.</div>
        <div className="chip-wrap" style={{ marginTop: 8 }}>
          <button className={`heritage-chip${tab === "feed" ? " sel" : ""}`} onClick={() => setTab("feed")}>🎞️ Feed</button>
          <button className={`heritage-chip${tab === "create" ? " sel" : ""}`} onClick={() => setTab("create")}>➕ Create</button>
        </div>
      </div>

      {tab === "create" ? (
        <>
          <div className="card">
            <div className="card-header">🎬 New work</div>
            <label style={{ fontSize: 11, color: "var(--text-light)" }}>Category <span style={{ opacity: 0.7 }}>— each accepts a set length</span></label>
            <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
              {DIRECTZ_FORMATS.map((f) => <button key={f.id} className={`heritage-chip${form.fmt === f.id ? " sel" : ""}`} onClick={() => setF("fmt", f.id)} title={f.note}>{f.emoji} {f.name} <span style={{ opacity: 0.7 }}>({f.label})</span></button>)}
            </div>

            <div className="form-group"><label>🎥 Upload the video <span style={{ color: "var(--text-light)", fontSize: 10 }}>— category is set by its length</span></label>
              <MediaCapture onUploaded={onMedia} accept="video/*" />
              {form.media?.url && (
                <div style={{ fontSize: 11, marginTop: 4, color: fmtMismatch ? "var(--danger)" : "var(--success)" }}>
                  {vidDur ? `⏱️ ${fmtDur(vidDur)} — ` : ""}
                  {detectedFmt
                    ? (fmtMismatch
                        ? <>this fits <strong>{DIRECTZ_FORMATS.find((f) => f.id === detectedFmt)?.name}</strong> ({fmtRange(detectedFmt)}), not {DIRECTZ_FORMATS.find((f) => f.id === form.fmt)?.name}. <button className="btn-link" style={{ background: "none", border: "none", color: "var(--gold, #ffcf3f)", cursor: "pointer", padding: 0, textDecoration: "underline", font: "inherit" }} onClick={() => setF("fmt", detectedFmt)}>Switch to {DIRECTZ_FORMATS.find((f) => f.id === detectedFmt)?.name}</button></>
                        : <>✅ fits {DIRECTZ_FORMATS.find((f) => f.id === form.fmt)?.name} ({fmtRange(form.fmt)})</>)
                    : <>⛔ {vidDur ? "outside all DirectZ length bands (30s–3h)." : "couldn't read the length — set it manually below."}</>}
                </div>
              )}
            </div>

            <label style={{ fontSize: 11, color: "var(--text-light)" }}>Video type</label>
            <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
              {VIDEO_TYPES.map((x) => <Pill key={x.name} active={form.video_type === x.name} onClick={() => setF("video_type", x.name)}>{x.name}</Pill>)}
            </div>
            <label style={{ fontSize: 11, color: "var(--text-light)" }}>
              {form.fmt === "moviez" ? "🎬 Movie genre" : form.fmt === "episodez" ? "📺 TV genre" : "🎞️ Short genre"}
            </label>
            <div className="chip-wrap" style={{ margin: "6px 0 10px" }}>
              {(DIRECTZ_GENRES[form.fmt] || []).map((g) => <Pill key={g.name} active={form.genre === g.name} onClick={() => setF("genre", form.genre === g.name ? "" : g.name)}>{g.emoji} {g.name}</Pill>)}
            </div>
            <MoodPicker mood={form.mood} setMood={(m) => setF("mood", m)} />
            <div className="form-group"><label>Title</label><input value={form.title} onChange={(e) => setF("title", e.target.value)} placeholder="Name your work" /></div>
            <div className="form-group"><label>Concept / description</label><CappedTextarea value={form.description} onChange={(e) => setF("description", e.target.value)} style={{ height: 56 }} placeholder="What's the vision? The AI rating rewards a clear, well-staffed concept." /></div>
            {!form.media?.url && <div className="form-group"><label>Length (minutes) <span style={{ color: "var(--text-light)", fontSize: 10 }}>— used when no video is attached</span></label><input type="number" min="0" value={form.minutes} onChange={(e) => setF("minutes", e.target.value)} style={{ width: 100 }} /></div>}
          </div>

          <div className="card">
            <div className="card-header"><span>🤝 Contributors — paid their worth</span><span className="tag">{participants.length}</span></div>
            <p style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>Add everyone who works on it and the skills they bring. Each person's worth is funded by the others who use it (developer tax per payer's tier).</p>
            {rows.map((r) => (
              <div key={r.id} className="post-card" style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input value={r.name} onChange={(e) => setRow(r.id, { name: e.target.value })} placeholder="Name" style={{ flex: 1 }} />
                  <select value={r.tier} onChange={(e) => setRow(r.id, { tier: e.target.value })} style={{ width: 100 }}>{TIER_OPTS.map(([v, l]) => <option key={v} value={v}>{TIER_EMOJI[v]} {l}</option>)}</select>
                </div>
                {r.skills.map((s, si) => (
                  <div key={si} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                    <input value={s.name} onChange={(e) => setSkill(r.id, si, { name: e.target.value })} placeholder="Skill" style={{ flex: 1 }} />
                    <input type="number" value={s.price} onChange={(e) => setSkill(r.id, si, { price: e.target.value })} placeholder="$ worth" style={{ width: 90 }} />
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <button className="btn-link" style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0, fontSize: 11 }} onClick={() => addSkill(r.id)}>+ add skill</button>
                  <span style={{ fontSize: 11, color: "var(--text-light)" }}>worth <strong>{money(worthOf(r))}</strong></span>
                </div>
              </div>
            ))}
            <button className="btn btn-small btn-secondary" onClick={addPerson}>➕ Add contributor</button>
            {settled.length >= 2 && (
              <div className="txn" style={{ marginTop: 10 }}>
                {settled.map((p) => (
                  <div key={p.id} className="txn-row"><span>{p.name}</span><span><Amount value={p.receives} flow="in" /> in · <Amount value={p.pays} flow="out" /> out</span></div>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-success" style={{ width: "100%" }} disabled={!form.title.trim() || fmtMismatch} onClick={submit}>🤖 Submit for AI rating</button>
          {fmtMismatch && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 6 }}>⛔ Fix the category to match the video's length to submit.</p>}
          {msg && <p style={{ fontSize: 12, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>{msg}</p>}
        </>
      ) : (
        <>
          <div className="chip-wrap" style={{ marginBottom: 10 }}>
            <button className={`heritage-chip${fmtFilter === "" ? " sel" : ""}`} onClick={() => setFmtFilter("")}>All</button>
            {DIRECTZ_FORMATS.map((f) => <button key={f.id} className={`heritage-chip${fmtFilter === f.id ? " sel" : ""}`} onClick={() => setFmtFilter(f.id)}>{f.emoji} {f.name}</button>)}
          </div>
          {msg && <p style={{ fontSize: 12, color: "var(--gold, #ffcf3f)", marginBottom: 8 }}>{msg}</p>}
          {works.length === 0
            ? <div className="card"><p style={{ fontSize: 12, color: "var(--text-light)" }}>{serverOk ? "No works yet — hit Create to direct the first ReelZ." : "Sign in + connect to see the DirectZ feed."}</p></div>
            : works.map((w) => <DirectZWorkCard key={w.id} w={w} mine={w.mine} onRated={onRated} />)}
        </>
      )}
    </>
  );
}

// ---- Parcel Primate: Mailchimp-style campaigns (post paradigm + email) ----
function ParcelPrimatePage({ serverOk }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("followers");
  const [channels, setChannels] = useState({ post: true, message: false, email: false });
  const [info, setInfo] = useState(null); // { audiences, email_ready }
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (serverOk) getParcelApi().then(setInfo).catch(() => setInfo(null)); }, [serverOk]);
  const toggle = (c) => setChannels((s) => ({ ...s, [c]: !s[c] }));
  const chosen = Object.entries(channels).filter(([, v]) => v).map(([k]) => k);
  const size = info?.audiences?.[audience] ?? null;
  const send = async () => {
    if (!subject.trim() || !chosen.length) { setMsg("Add a subject and pick at least one channel."); return; }
    setBusy(true); setMsg(""); setResult(null);
    try {
      const r = await sendParcelApi({ subject: subject.trim(), body: body.trim(), audience, channels: chosen });
      setResult(r); setMsg("📣 Campaign sent!");
    } catch (e) { setMsg(e?.message || "Couldn't send — try again."); }
    setBusy(false);
  };
  const AUD = [["followers", "👥 All followers"], ["fans", "⭐ Fans"], ["friends", "🤝 Friends"]];
  const CH = [["post", "📣 Post to feed", "Publishes a public PostZ from you."], ["message", "📨 Direct message", "DMs every recipient + notifies them."], ["email", "✉️ Email", "Emails recipients who have an address on file."]];
  return (
    <>
      <div className="card">
        <div className="card-header"><span>🐵 Parcel Primate — campaigns</span><span className="tag">e-mail marketing</span></div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          Write it once like a post, blast it to <strong>your</strong> audience. Every channel follows the same post paradigm — publish to the feed, slide into DMs, and hit inboxes. This reaches the people who follow you, never the whole platform. 📬
        </p>
        {!serverOk && <p style={{ fontSize: 11, color: "var(--gold, #ffcf3f)" }}>Sign in to load your audience and send.</p>}
      </div>

      <div className="card">
        <div className="form-group"><label>✍️ Subject</label><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="New drop, show announcement, ask…" /></div>
        <div className="form-group"><label>📝 Message</label><CappedTextarea value={body} onChange={(e) => setBody(e.target.value)} style={{ height: 90 }} placeholder="What do you want your people to know?" /></div>

        <label style={{ fontSize: 11, color: "var(--text-light)" }}>🎯 Audience</label>
        <div className="chip-wrap" style={{ marginBottom: 8 }}>
          {AUD.map(([v, l]) => (
            <button key={v} className={`heritage-chip${audience === v ? " sel" : ""}`} onClick={() => setAudience(v)}>
              {l}{info?.audiences ? ` (${info.audiences[v] ?? 0})` : ""}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 11, color: "var(--text-light)" }}>📡 Channels</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "6px 0 10px" }}>
          {CH.map(([v, l, hint]) => (
            <label key={v} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={channels[v]} onChange={() => toggle(v)} />
              <span>{l} <span style={{ color: "var(--text-light)", fontSize: 10 }}>— {hint}</span>
                {v === "email" && info && !info.email_ready && <span style={{ color: "var(--gold, #ffcf3f)", fontSize: 10 }}> · not wired up yet</span>}
              </span>
            </label>
          ))}
        </div>

        {size != null && <p style={{ fontSize: 11, color: "var(--text-light)" }}>This will reach up to <strong>{size}</strong> {audience}.</p>}
        <button className="btn btn-success" style={{ width: "100%" }} disabled={busy || !serverOk || !subject.trim() || !chosen.length} onClick={send}>{busy ? "Sending…" : "🚀 Send campaign"}</button>
        {msg && <p style={{ fontSize: 12, color: "var(--gold, #ffcf3f)", marginTop: 8 }}>{msg}</p>}
        {result && (
          <div className="post-card" style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12 }}>Reached <strong>{result.recipients}</strong> · 📣 posted {result.posted} · 📨 messaged {result.messaged} · ✉️ emailed {result.emailed}</div>
            {result.email_note && <div style={{ fontSize: 10, color: "var(--text-light)", marginTop: 4 }}>{result.email_note}</div>}
          </div>
        )}
      </div>
    </>
  );
}

// ---- AdZ: Watch & Earn — watch a commercial, earn SpinAZ = the cents the
// platform is paid per view. Genuine full watches (>= min seconds) are rewarded.
function AdWatcher({ ad, onRewarded }) {
  const vidRef = useRef(null);
  const [watched, setWatched] = useState(0);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const need = ad.min_watch_seconds || 15;

  const claim = async () => {
    try {
      const r = await rewardAdApi(ad.id, Math.round(watched));
      if (r.rewarded) { setMsg(`✅ +${r.reward_spinaz} 🍥 — thanks for watching!`); setDone(true); onRewarded?.(r); }
      else setMsg(r.reason === "watch_more" ? `⏳ Watch ${r.need_seconds}s to earn (you're at ${r.watched}s).`
        : r.reason === "ad_daily_cap" ? "You've earned the daily max on this ad — come back tomorrow."
        : r.reason === "daily_cap" ? "You've hit today's Watch & Earn cap — back tomorrow."
        : r.reason === "own_ad" ? "You can't earn from your own ad." : "No reward this time.");
    } catch (e) { setMsg(e?.message || "Couldn't claim — try again."); }
  };

  return (
    <div className="post-card">
      <div className="post-user">📺 {ad.title}{ad.sponsor ? <span style={{ fontSize: 11, color: "var(--text-light)" }}> · sponsored by {ad.sponsor}</span> : ""}</div>
      <div style={{ fontSize: 11, color: "var(--gold, #ffcf3f)", marginBottom: 4 }}>Earn <strong>{ad.reward_spinaz} 🍥</strong> · watch {need}s</div>
      {ad.media_type === "video"
        ? <video ref={vidRef} src={ad.media_url} controls playsInline onTimeUpdate={(e) => setWatched(Math.max(watched, e.target.currentTime))} onError={() => setMsg("⏳ Ad unavailable right now.")} style={{ width: "100%", maxHeight: 260, borderRadius: 8 }} />
        : <audio ref={vidRef} src={ad.media_url} controls onTimeUpdate={(e) => setWatched(Math.max(watched, e.target.currentTime))} style={{ width: "100%" }} />}
      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "6px 0", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, (watched / need) * 100)}%`, height: "100%", background: watched >= need ? "var(--success)" : "var(--primary)" }} />
      </div>
      {ad.link_url && <a href={ad.link_url} target="_blank" rel="noreferrer" className="tag" style={{ color: "var(--accent, #22e6ff)", textDecoration: "none" }}>🔗 Visit sponsor</a>}
      {!done && <button className="btn btn-success btn-small" style={{ width: "100%", marginTop: 6 }} disabled={watched < need} onClick={claim}>{watched < need ? `Keep watching… ${Math.floor(watched)}/${need}s` : `Claim ${ad.reward_spinaz} 🍥`}</button>}
      {msg && <p style={{ fontSize: 11, color: /✅/.test(msg) ? "var(--success)" : "var(--gold, #ffcf3f)", marginTop: 6 }}>{msg}</p>}
    </div>
  );
}

function AdZPage({ serverOk, isOwner, syncEconomy }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ title: "", sponsor: "", link_url: "", payout_cents: 1, min_watch_seconds: 15, daily_cap_per_user: 3, media: null });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const setF = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const load = () => { if (serverOk) getAdzApi().then(setData).catch(() => setData(null)); };
  useEffect(load, [serverOk]);

  const post = async () => {
    if (!form.title.trim() || !form.media?.url) { setMsg("Add a title and upload the commercial."); return; }
    setBusy(true); setMsg("");
    try {
      await createCommercialApi({ title: form.title.trim(), sponsor: form.sponsor.trim(), link_url: form.link_url.trim(), media_url: form.media.url, media_type: form.media.type, payout_cents: Number(form.payout_cents) || 1, min_watch_seconds: Number(form.min_watch_seconds) || 15, daily_cap_per_user: Number(form.daily_cap_per_user) || 3 });
      setMsg("✅ Commercial posted."); setForm({ title: "", sponsor: "", link_url: "", payout_cents: 1, min_watch_seconds: 15, daily_cap_per_user: 3, media: null }); load();
    } catch (e) { setMsg(e?.message || "Couldn't post."); }
    setBusy(false);
  };
  const remove = async (id) => { try { await deleteCommercialApi(id); load(); } catch { /* ignore */ } };

  if (!serverOk) return <div className="card"><p style={{ fontSize: 12, color: "var(--text-light)" }}>📺 Sign in + connect to watch commercials and earn SpinAZ.</p></div>;
  const ads = data?.ads || [];
  return (
    <>
      <div className="stripe-section">
        <div className="stripe-title">📺 AdZ — Watch &amp; Earn</div>
        <div className="balance-info">Watch a sponsor's commercial → earn <strong>SpinAZ = the cents</strong> the platform is paid for your view. Full, genuine watches only; daily caps keep it fair.</div>
        <div style={{ marginTop: 6, fontSize: 13 }}>
          <span style={{ color: "var(--success)", fontWeight: 800 }}>🍥 {data?.earned || 0}</span>
          <span style={{ color: "var(--text-light)", fontSize: 11 }}> SpinAZ earned watching{data?.earned_today ? ` · +${data.earned_today} today` : ""}</span>
        </div>
      </div>

      {isOwner && (
        <div className="card" style={{ border: "1px solid var(--gold, #ffcf3f)" }}>
          <div className="card-header">🛠️ Post a commercial (owner)</div>
          {data?.owner && <p style={{ fontSize: 11, color: "var(--success)", marginBottom: 6 }}>💰 Earnings: {data.owner.total_views} rewarded views · {money((data.owner.total_cents || 0) / 100)} paid out in views</p>}
          <div className="form-group"><label>Title</label><input value={form.title} onChange={(e) => setF("title", e.target.value)} placeholder="Commercial title" /></div>
          <div className="grid-2">
            <div className="form-group"><label>Sponsor</label><input value={form.sponsor} onChange={(e) => setF("sponsor", e.target.value)} placeholder="Brand" /></div>
            <div className="form-group"><label>Sponsor link</label><input value={form.link_url} onChange={(e) => setF("link_url", e.target.value)} placeholder="https://…" /></div>
          </div>
          <div className="grid-3">
            <div className="form-group"><label>Payout ¢/view = 🍥</label><input type="number" min="0" value={form.payout_cents} onChange={(e) => setF("payout_cents", e.target.value)} /></div>
            <div className="form-group"><label>Min watch (s)</label><input type="number" min="1" value={form.min_watch_seconds} onChange={(e) => setF("min_watch_seconds", e.target.value)} /></div>
            <div className="form-group"><label>Daily cap/user</label><input type="number" min="1" value={form.daily_cap_per_user} onChange={(e) => setF("daily_cap_per_user", e.target.value)} /></div>
          </div>
          <div className="form-group"><label>🎬 Upload the commercial</label><MediaCapture onUploaded={(m) => setF("media", m)} accept="video/*" /></div>
          <button className="btn btn-success" style={{ width: "100%" }} disabled={busy} onClick={post}>{busy ? "Posting…" : "📤 Post commercial"}</button>
          {msg && <p style={{ fontSize: 11, color: /✅/.test(msg) ? "var(--success)" : "var(--danger)", marginTop: 6 }}>{msg}</p>}
          {(data?.owner?.mine || []).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div className="modal-sub-title" style={{ marginBottom: 4 }}>Your commercials</div>
              {data.owner.mine.map((a) => (
                <div key={a.id} className="skill-item">
                  <span className="skill-item-name">📺 {a.title} · {a.reward_spinaz}🍥/view</span>
                  <button className="btn btn-danger btn-small" onClick={() => remove(a.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-header">🎬 Commercials</div>
        {ads.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-light)" }}>No commercials to watch right now — check back soon.</p>
          : ads.map((a) => <AdWatcher key={a.id} ad={a} onRewarded={() => { syncEconomy?.(); load(); }} />)}
      </div>
    </>
  );
}

// ---- LegendZ: "what every indicator means" in Corey voice ----
function LegendZRow({ emoji, term, children, cta, onOpen }) {
  return (
    <div className="post-card" style={{ marginBottom: 6 }}>
      <div style={{ fontWeight: 800, fontSize: 13 }}>{emoji} {term}</div>
      <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 2 }}>{children}</div>
      {cta && <button className="btn btn-small btn-secondary" style={{ marginTop: 6 }} onClick={() => onOpen?.(cta.to)}>{cta.label}</button>}
    </div>
  );
}

function LegendZPage({ onOpen }) {
  return (
    <>
      <div className="card">
        <div className="card-header">🗺️ LegendZ — what everything means</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>
          Real talk — every number on this app <em>does</em> something. No mystery meters, no fake hype. 💯 Here's what each one means and exactly how to move it. If a chip's got a number, this page tells you the <b>what</b>, the <b>why</b>, and the <b>move</b>.
        </p>
      </div>
      <div className="card">
        <div className="card-header">🔥 Streak &amp; progress</div>
        <LegendZRow emoji="🔥" term="Streak" onOpen={onOpen} cta={{ to: "quest", label: "🎯 Keep it alive" }}>
          Consecutive active days. Show up daily and it compounds — miss a day and it resets to zero. Think training: the gains come from the streak, not the one big session. Keep it warm.
        </LegendZRow>
        <LegendZRow emoji="🎮" term="Level &amp; XP" onOpen={onOpen}>
          Every real action feeds XP; XP fills the bar under your name and rolls you to the next Level. It's proof-of-work — the more you actually build, the higher it climbs. No shortcuts, no buying it.
        </LegendZRow>
      </div>
      <div className="card">
        <div className="card-header">👥 Reach &amp; social</div>
        <LegendZRow emoji="👥" term="Followers / Total" onOpen={onOpen} cta={{ to: "social_connectz", label: "🌐 Connect accounts" }}>
          People following you on Music ConnectZ plus your <b>verified</b> outside accounts. This is your audience — it feeds your ⚡ energy and shows on your profile so collaborators find you.
        </LegendZRow>
        <LegendZRow emoji="📏" term="Reach median" onOpen={onOpen} cta={{ to: "social_connectz", label: "✅ Verify accounts" }}>
          The <b>median</b> follower count across your verified sources — not the sum. Median, so one giant account can't fake your whole reach; it's your <em>typical</em> pull. Only verified accounts count (we read your live count + a code in your bio), so nobody games it with someone else's numbers.
        </LegendZRow>
        <LegendZRow emoji="🤝" term="Friends / ⭐ Fans" onOpen={onOpen}>
          Friends = mutual follows (you both follow each other). Fans = folks who follow you and you haven't followed back. Fans are your audience; friends are your circle.
        </LegendZRow>
      </div>
      <div className="card">
        <div className="card-header">💲 Currency &amp; energy</div>
        <LegendZRow emoji="⚡" term="Energy" onOpen={onOpen} cta={{ to: "energy", label: "⚡ Earn / buy energy" }}>
          Fuel for actions. Two ways to get it, both transparent:<br />
          • <b>Passive/hour</b> off your reach median — Free <b>median/10</b> · <span style={{ color: "var(--gold, #ffcf3f)" }}>Premium median/5</span> · <span style={{ color: "var(--success)" }}>StatZ median/1</span>.<br />
          • <b>On top-up</b> you also get energy = the cents you add × your tier: Free <b>×1</b> ($1 = 100⚡) · <span style={{ color: "var(--gold, #ffcf3f)" }}>Premium ×2 (200⚡)</span> · <span style={{ color: "var(--success)" }}>StatZ ×4 (400⚡)</span>.
        </LegendZRow>
        <LegendZRow emoji="🍥" term="SpinAZ" onOpen={onOpen} cta={{ to: "spinaz", label: "🍥 Get SpinAZ" }}>
          The reward currency — you earn it from wins (squash a BugZ = 200 🍥) and spend it on perks. Real spendable value, not vanity points.
        </LegendZRow>
        <LegendZRow emoji="💲" term="Money &amp; dev tax" onOpen={onOpen} cta={{ to: "money", label: "💲 Wallet" }}>
          Your real wallet balance. Member-to-member deals (CollabZ, MerchZ, VenueZ) run through it; the platform takes a small <b>developer tax</b> as its cut and hands you the rest. Every split is shown before you commit — no hidden skim.
        </LegendZRow>
        <LegendZRow emoji="👑" term="RoyaltieZ" onOpen={onOpen} cta={{ to: "royaltiez", label: "👑 RoyaltieZ" }}>
          Ongoing earnings from work that keeps paying — accrue them, then cash out. This is the long game: build once, collect forever.
        </LegendZRow>
      </div>
      <div className="card">
        <div className="card-header">🔒 Trust &amp; escrow</div>
        <LegendZRow emoji="🔒" term="Escrow (CollabZ)" onOpen={onOpen} cta={{ to: "collabz", label: "🤝 Start a collab" }}>
          Here's the honest truth about doing a deal with someone you don't know yet: your money doesn't go straight to them. When you start a CollabZ deal, what you pay gets <b>held by the platform</b> — locked, safe — and only releases to your collaborator <em>when you approve the work</em>. Ghost you? You get it back. It even auto-releases after the window so <em>they're</em> not stuck either, and either side can open a dispute to freeze it. That's how a stranger takes the first leap without getting burned.
        </LegendZRow>
        <LegendZRow emoji="🍥" term="Good-faith stake" onOpen={onOpen}>
          Optional. Both sides can put up a small refundable SpinAZ stake when a deal starts — skin in the game that scares off flakes and spammers. Follow through and you get every bit of it back. It costs an honest creator nothing; it just filters out the people who were never serious.
        </LegendZRow>
      </div>
      <div className="card">
        <div className="card-header">⭐ Ratings &amp; vibe</div>
        <LegendZRow emoji="⭐" term="Rating (1–10)" onOpen={onOpen}>
          Real members rate the work; AI seeds a fair starting score, then human ratings take over. Ratings drive value and price — higher-rated work commands more. It's a median so a couple of haters (or homers) can't swing it.
        </LegendZRow>
        <LegendZRow emoji="✨" term="Vibe (👍 − 👎)" onOpen={onOpen}>
          Likes minus dislikes on a post = its reach. Positive vibe pushes it up the feed; negative buries it. Honest signal, both directions.
        </LegendZRow>
        <LegendZRow emoji="🛑" term="Restricted joins" onOpen={onOpen}>
          Some posts pay you to join — but only for <b>real</b> engagement (anti-fraud caps + dedup). Genuine activity earns; farming it doesn't.
        </LegendZRow>
      </div>
      <div className="card">
        <div className="card-header">🏅 Tiers &amp; status</div>
        <LegendZRow emoji="🎟️" term="Tier badges (Free / Premium / StatZ)" onOpen={onOpen} cta={{ to: "membership", label: "🎟️ Compare tiers" }}>
          Your membership. Higher tiers unlock bigger limits, faster energy, longer edit windows, and more upload room. StatZ is the top — full throttle. Every tier's exact perks are on MembershipZ, and upgrades have a 10-day refund window.
        </LegendZRow>
        <LegendZRow emoji="🟢" term="Online / 👥 Total members" onOpen={onOpen}>
          Live headcount — who's on right now and how big the community is. Higher online = better odds for real-time CollabZ and CallZ.
        </LegendZRow>
      </div>
      <div className="card">
        <div className="card-header">🤔 Still unsure?</div>
        <p style={{ fontSize: 12, color: "var(--text-light)" }}>Ask OCC — it talks you through anything in plain English. 🎧</p>
        <button className="btn btn-success" style={{ width: "100%" }} onClick={() => onOpen?.("occ")}>🤖 Ask OCC</button>
      </div>
    </>
  );
}

const FN_PAGES = {
  legendz: LegendZPage,
  parcel: ParcelPrimatePage,
  merchz: MerchZPage,
  directz: DirectZPage,
  singz: SingZPage,
  rapz: RapZPage,
  dawz: DawZPage,
  sentencez: SentenceZPage,
  videoz: VideoZPage,
  venuez: VenueZPage,
  callz: CallZPage,
  gamez: GameZPage,
  filez: FileZPage,
  onboardz: OnboardZPage,
  groupz: GroupZPage,
  bodiez: BodieZPage,
  zodiacz: ZodiacZPage,
  battlez: BattleZPage,
  spinaz: SpinaZPage,
  energy: EnergyPage,
  adz: AdZPage,
  ratez: RateConnectZPage,
  distributez: DistributeZPage,
  royaltiez: RoyaltieZPage,
  messagez: MessageZPage,
  collabz: CollabZPage,
  legalz: LegalZPage,
  labelz: LabelZPage,
  lilith: LilithPage,
  intelligence: IntelligencePage,
  occ: OccWorkspace,
  nationalitiez: NationalitieZPage,
  substancez: SubstanceZPage,
  preferencez: PreferenceZPage,
  languagez: LanguageZPage,
  social_connectz: SocialConnectZPage,
  setup: SetupPage,
  personas: PersonasPage,
  examples: PostZPage,
  profile: ProfilePage,
  money: MoneyPage,
  membership: MembershipZPage,
  specz: SpecZPage,
  settings: SettingsPage,
};

// ---- Notifications bell (header) ----
const NOTIF_EMOJI = { follow: "👥", rate: "⭐", like: "👍", comment: "💬", join: "🛑", pay: "💸", system: "🔔" };
function NotificationsBell({ serverOk, onOpen }) {
  const signedIn = isSignedIn();
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const load = () => { if (signedIn && serverOk) getNotificationsApi().then(setData).catch(() => {}); };
  useEffect(() => {
    if (!signedIn || !serverOk) return undefined;
    load();
    const t = setInterval(load, 45000); // poll every 45s
    return () => clearInterval(t);
  }, [signedIn, serverOk]);
  if (!signedIn || !serverOk) return null;

  const markAll = () => { markNotificationApi({ all: true }).then(() => load()).catch(() => {}); };
  const click = (n) => {
    markNotificationApi({ id: n.id }).then(() => load()).catch(() => {});
    if (n.item_id?.startsWith("post:")) onOpen?.("examples");
    setOpen(false);
  };
  const ago = (iso) => {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "now"; if (s < 3600) return `${Math.floor(s / 60)}m`; if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };
  return (
    <div style={{ position: "relative" }}>
      <button className="theme-toggle" onClick={() => { setOpen((v) => !v); if (!open) load(); }} title="Notifications" style={{ position: "relative" }}>
        🔔
        {data.unread > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "var(--danger)", color: "#fff", borderRadius: 10, fontSize: 9, minWidth: 15, height: 15, lineHeight: "15px", textAlign: "center", padding: "0 3px", fontWeight: 700 }}>{data.unread > 99 ? "99+" : data.unread}</span>}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 34, width: 280, maxHeight: 380, overflowY: "auto", background: "var(--panel, #12101c)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 8, zIndex: 50, boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <strong style={{ fontSize: 13 }}>🔔 Notifications</strong>
            {data.unread > 0 && <button className="btn-link" style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0, fontSize: 11 }} onClick={markAll}>Mark all read</button>}
          </div>
          {data.notifications.length === 0
            ? <p style={{ fontSize: 12, color: "var(--text-light)", padding: 8 }}>Nothing yet — follows, ratings, likes and joins show up here.</p>
            : data.notifications.map((n) => (
              <div key={n.id} onClick={() => click(n)} style={{ display: "flex", gap: 8, padding: "6px 4px", cursor: "pointer", borderRadius: 8, background: n.read ? "transparent" : "rgba(168,85,247,0.10)" }}>
                <span style={{ fontSize: 15 }}>{NOTIF_EMOJI[n.kind] || "🔔"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12 }}>{n.text}</div>
                  <div style={{ fontSize: 10, color: "var(--text-light)" }}>{ago(n.created_at)}</div>
                </div>
                {!n.read && <span style={{ width: 7, height: 7, borderRadius: 4, background: "var(--primary)", alignSelf: "center" }} />}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// Where an app opens: a floating "window" (modal over the current page) or a
// full "tab" (its own page). These fn apps default to a full tab because they're
// immersive workspaces; every other fn app defaults to a window. Users override
// per app and it's remembered.
const TAB_DEFAULT = new Set([
  "directz", "singz", "rapz", "bodiez", "dawz", "sentencez", "videoz", "gamez",
  "intelligence", "occ", "collabz", "battlez", "venuez", "social_connectz", "onboardz",
]);
const OPEN_MODE_KEY = "mcz2_open_mode";

// Segmented Window/Tab control — lets the user pick how any app opens.
function OpenModeToggle({ mode, onSetMode }) {
  return (
    <div className="open-mode-toggle" title="Open this app as a floating window or a full tab">
      <button type="button" className={mode === "modal" ? "sel" : ""} onClick={() => onSetMode("modal")}>🪟 Window</button>
      <button type="button" className={mode === "tab" ? "sel" : ""} onClick={() => onSetMode("tab")}>📑 Tab</button>
    </div>
  );
}

// A functional app opened as a modal window over whatever page is underneath.
function AppWindow({ appKey, onClose, onSetMode, pageProps }) {
  const { state } = useAppState();
  if (!appKey) return null;
  const Page = FN_PAGES[appKey];
  if (!Page) return null;
  const app = APPS_BY_KEY[appKey];
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content app-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {app?.icon && <IconImg icon={iconFor(state.settings?.appIcons, appKey, app.icon)} alt={app?.name || appKey} />}
            <h2>{app?.emoji} {app?.name || appKey}</h2>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <OpenModeToggle mode="modal" onSetMode={(m) => onSetMode(appKey, m)} />
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="app-window-body">
          <Page {...pageProps} />
        </div>
      </div>
    </div>
  );
}

// ---- App description modal (blueprint "click icon → Corey voice" pattern) ----
function AppModal({ app, onClose, onOpen }) {
  const { state } = useAppState();
  if (!app) return null;
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <IconImg icon={iconFor(state.settings?.appIcons, app.key, app.icon)} alt={app.name} />
            <h2>{app.emoji} {app.name}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <p className="modal-desc">{app.desc}</p>
        {app.children?.length > 0 && (
          <div className="modal-sub">
            <div className="modal-sub-title">Inside {app.name}</div>
            {app.children.map((c) => (
              <div key={c.name} className="modal-sub-row">
                <IconImg icon={c.icon} alt={c.name} />
                <div>
                  <div className="s-name">{c.emoji} {c.name}</div>
                  <div className="s-desc">{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {app.fn && <button className="btn" style={{ marginTop: 16, width: "100%" }} onClick={() => onOpen(app.key)}>Open {app.name} →</button>}
      </div>
    </div>
  );
}

// A post opened as a modal overlay — persists over whatever page is underneath,
// so it stays put regardless of navigation until you close it. Carries the
// media + /10 score and the full SocialBar (rate 1–10 / comment / share +5⚡).
function PostModal({ post, onClose, onOpen }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "" });
  const [live, setLive] = useState(null); // updated post after an edit
  const p = live || post;
  if (!post) return null;
  const v = POST_VIS.find((x) => x.id === (p.visibility)) || POST_VIS[0];
  const startEdit = () => { setDraft({ title: p.title, description: p.description ?? p.desc ?? "" }); setEditing(true); };
  const saveEdit = async () => {
    try {
      const r = await editPostApi(p.id, { title: draft.title.trim(), description: draft.description });
      setLive(r); setEditing(false);
    } catch (e) { alert(e?.message?.includes("window") ? `⏳ Edit window passed — upgrade for a longer edit window (${EDIT_WINDOW_LABEL}).` : "Couldn't save the edit."); }
  };
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><h2>🎵 {p.title}</h2></div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 6, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span className="tag" title={v.note}>{v.emoji} {v.label}</span>
          {p.author && <span>· @{p.author}</span>}
          {p.rating != null && <span>· ⭐ {p.rating}/10</span>}
          {p.score?.overall != null && <span>· 🎯 scored {p.score.overall}/10</span>}
          {p.mine && !editing && p.id != null && <EditCountdown createdAt={p.created_at} mine onEdit={startEdit} />}
          <EditZHistory history={p.edit_history} editedAt={p.edited_at} field="title" />
        </div>
        {editing ? (
          <div style={{ marginBottom: 8 }}>
            <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} style={{ width: "100%", marginBottom: 6 }} maxLength={160} />
            <CappedTextarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} style={{ width: "100%", height: 70 }} />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button className="btn btn-small btn-success" onClick={saveEdit} disabled={!draft.title.trim()}>💾 Save</button>
              <button className="btn btn-small btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (p.description || p.desc) && <Translatable tag="p" className="modal-desc" text={p.description ?? p.desc} />}
        {post.is_album && (post.items || []).length > 0 ? (
          <div style={{ margin: "8px 0" }}>
            <div style={{ fontSize: 12, color: "var(--gold, #ffcf3f)", marginBottom: 6 }}>💿 Album · {(post.items || []).length} tracks</div>
            {(post.items || []).map((it, k) => (
              <div key={k} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, marginBottom: 2 }}>{k + 1}. {it.title || (it.type === "video" ? "Clip" : "Track")}</div>
                {it.type === "video"
                  ? <video src={it.url} controls style={{ width: "100%", maxHeight: 300, borderRadius: 10 }} />
                  : <audio src={it.url} controls style={{ width: "100%" }} />}
              </div>
            ))}
          </div>
        ) : post.media_url && (
          <div style={{ margin: "8px 0" }}>
            {post.media_type === "video"
              ? <video src={post.media_url} controls style={{ width: "100%", maxHeight: 340, borderRadius: 10 }} />
              : <audio src={post.media_url} controls style={{ width: "100%" }} />}
          </div>
        )}
        <LinksRow links={post.links} owner={post.author || ""} />
        <SocialBar id={`post:${post.id}`} shareText={`${post.title} on Music ConnectZ`} />
        {onOpen && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button className="btn btn-small btn-secondary" onClick={() => { onClose(); onOpen("collabz"); }}>🤝 CollabZ</button>
            <button className="btn btn-small btn-secondary" onClick={() => { onClose(); onOpen("dawz"); }}>🎛️ DAW</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- PickConnectZ dock ----
function Dock({ usage, pins, tier, current, onOpen, onTogglePin, onHome }) {
  const { state } = useAppState();
  const dockIcon = (a) => iconFor(state.settings?.appIcons, a.key, a.icon);
  const [editing, setEditing] = useState(false);
  const { label: tierLabel, limit } = tierInfo(tier);
  const pinnedApps = pins.map((k) => APPS_BY_KEY[k]).filter(Boolean);
  const aiPicks = TOP_APPS
    .filter((a) => !pins.includes(a.key) && (usage[a.key] || 0) > 0)
    .sort((a, b) => (usage[b.key] || 0) - (usage[a.key] || 0))
    .slice(0, AI_PICK_COUNT);
  const atLimit = pins.length >= limit;

  return (
    <div className="dock-wrap">
      {editing && (
        <div className="dock" style={{ display: "block", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="dock-hint">
              {limit === Infinity ? `${tierLabel} · unlimited pins (${pins.length})` : `${tierLabel} · ${pins.length}/${limit} pinned`}
              {limit !== Infinity && atLimit && " · upgrade for more"}
            </span>
            <button className="close-btn" onClick={() => setEditing(false)}>×</button>
          </div>
          <div className="pin-grid">
            {TOP_APPS.map((a) => {
              const pinned = pins.includes(a.key);
              const disabled = !pinned && atLimit;
              return (
                <div key={a.key} className={`pin-cell${pinned ? " pinned" : ""}${disabled ? " disabled" : ""}`}
                  onClick={() => !disabled && onTogglePin(a.key)} title={a.name}>
                  <IconImg icon={a.icon} alt={a.name} />
                  {pinned && <span className="pin-check">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="dock">
        <button className="dock-brand" onClick={onHome} title="PickConnectZ — home">
          <IconImg icon="pickconz.png" alt="PickConnectZ" />
          <span>PickConnectZ</span>
        </button>
        <div className="dock-sep" />
        <div className="dock-scroll">
          {aiPicks.length === 0 && pinnedApps.length === 0 ? (
            <span className="dock-hint">Open apps to build your quick nav →</span>
          ) : (
            <>
              {aiPicks.map((a) => (
                <div key={a.key} className={`dock-icon${current === a.key ? " active" : ""}`} onClick={() => onOpen(a.key)} title={`${a.name} · AI pick`}>
                  <IconImg icon={dockIcon(a)} alt={a.name} /><span className="ai-dot" />
                </div>
              ))}
              {aiPicks.length > 0 && pinnedApps.length > 0 && <div className="dock-sep" />}
              {pinnedApps.map((a) => (
                <div key={a.key} className={`dock-icon${current === a.key ? " active" : ""}`} onClick={() => onOpen(a.key)} title={a.name}>
                  <IconImg icon={dockIcon(a)} alt={a.name} />
                </div>
              ))}
            </>
          )}
        </div>
        <button className="dock-edit" onClick={() => onOpen("occ")} title="Ask OCC — help & code">❓</button>
        <button className={`dock-edit${editing ? " active" : ""}`} onClick={() => setEditing((v) => !v)} title="Customize slots">⚙</button>
      </div>
    </div>
  );
}

// A URL slug is a valid tab if it maps to a functional page. /home = launcher.
const tabToView = (slug) => {
  if (!slug || slug === "home" || slug === "v2") return null;
  return FN_PAGES[slug] ? slug : null;
};

function Shell() {
  const { user, logout } = useAuth();
  const { state, update, setTab, toggleLightDark, touchStreak } = useAppState();
  const { settings, wallet } = state;
  const prog = state.progression || { xp: 0, level: 1, streak: 0 };
  useEffect(() => { touchStreak(); }, []); // daily streak bookkeeping on load
  const navigate = useNavigate();
  const { tab } = useParams(); // the /:tab URL segment, if any
  // Live community tallies + owner flag from /api/auth/stats/.
  const [community, setCommunity] = useState({ total: null, online: null });
  const isOwner = !!(user?.is_owner || community.isOwner);

  // Brand-new users land in the OnboardZ guided first session.
  const isNewUser = !state.user.name && state.personas.length === 0 && state.examples.length === 0 && !state.onboardDismissed;
  // Returning from a Stripe/PayPal checkout lands on /v2?checkout=… — open the
  // wallet so MoneyPage can capture/confirm the payment.
  const returningFromCheckout = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("checkout");
  // Initial view: a deep-linked tab wins, then checkout, then onboarding.
  const [view, setView] = useState(tabToView(tab) || (returningFromCheckout ? "money" : (isNewUser ? "onboardz" : null)));

  // Keep the view in sync with the URL for back/forward + deep links. Skip the
  // first render so the checkout/onboarding initial view isn't clobbered.
  const firstNav = useRef(true);
  useEffect(() => {
    if (firstNav.current) { firstNav.current = false; return; }
    const v = tabToView(tab);
    setView(v);
    setModalApp(null);
    if (v) setTab(v);
  }, [tab]);
  const [modalApp, setModalApp] = useState(null);
  const [windowApp, setWindowApp] = useState(null); // fn app open as a floating window
  const { post: postModal, closePost } = usePostModal();
  const [usage, setUsage] = useState(() => readStore(USAGE_KEY) || {});
  const [pins, setPins] = useState(() => readStore(PINS_KEY) || []);
  const [openMode, setOpenMode] = useState(() => readStore(OPEN_MODE_KEY) || {});
  // How an app opens: user override, else the sensible default (window unless it's an immersive workspace).
  const openModeFor = (key) => openMode[key] || (TAB_DEFAULT.has(key) ? "tab" : "modal");
  const setAppMode = (key, mode) => setOpenMode((m) => { const next = { ...m, [key]: mode }; writeStore(OPEN_MODE_KEY, next); return next; });
  // Dev default StatZ (editable in Settings); the server's real tier overrides on load.
  const [tier, setTier] = useState("statz");
  const [serverOk, setServerOk] = useState(false);

  // Hydrate money/energy/spinaz + tier from the backend economy when signed in;
  // silently stay on local state if the API is unavailable.
  const syncEconomy = () => {
    getWallet()
      .then((r) => {
        setServerOk(true);
        update({ wallet: { ...state.wallet, balance: r.wallet.money }, energy: r.wallet.energy, spinaz: r.wallet.spinaz });
      })
      .catch(() => setServerOk(false));
  };
  useEffect(() => {
    let on = true;
    api("/api/auth/stats/").then((s) => {
      if (!on) return;
      setTier(s?.my_tier || "");
      setCommunity({ total: s?.total_members ?? null, online: s?.online_now ?? null, isOwner: !!s?.is_owner });
    }).catch(() => {});
    if (isSignedIn()) syncEconomy();
    return () => { on = false; };
  }, []);

  // Auto-publish the public profile to the backend (debounced) so other members
  // can view and search you. Fires when profile/personas change while signed in.
  useEffect(() => {
    if (!isSignedIn()) return undefined;
    const t = setTimeout(() => { saveProfileApi(buildProfilePayload(state)).catch(() => {}); }, 1200);
    return () => clearTimeout(t);
  }, [state.user, state.personas]);

  const recordUsage = (key) =>
    setUsage((u) => {
      const next = { ...u, [key]: (u[key] || 0) + 1 };
      writeStore(USAGE_KEY, next);
      return next;
    });

  // Open a functional app either as a floating window (over the current page) or
  // as its own full tab, per the user's per-app preference.
  const openFn = (key) => {
    recordUsage(key);
    setModalApp(null);
    if (openModeFor(key) === "modal") { setWindowApp(key); }
    else { setWindowApp(null); navigate(`/${key}`); }
  };
  const openApp = (key) => {
    const app = APPS_BY_KEY[key];
    if (!app) {
      // Functional pages without a launcher tile (e.g. legalz) obey the same mode.
      if (FN_PAGES[key]) openFn(key);
      return;
    }
    // Functional apps open as window/tab; description-only apps open the info modal.
    if (app.fn) openFn(key);
    else { setModalApp(app); }
  };
  // Flip an app between window and tab, remember it, and re-present accordingly.
  const switchMode = (key, mode) => {
    setAppMode(key, mode);
    if (mode === "tab") { setWindowApp(null); navigate(`/${key}`); }
    else { setWindowApp(key); if (view === key) navigate("/"); }
  };

  const togglePin = (key) =>
    setPins((p) => {
      const next = p.includes(key) ? p.filter((k) => k !== key) : [...p, key];
      writeStore(PINS_KEY, next);
      return next;
    });

  const goHome = () => { setModalApp(null); setWindowApp(null); navigate("/"); };
  const FnPage = view ? FN_PAGES[view] : null;
  const activeApp = view ? APPS_BY_KEY[view] : null;
  const balance = Number(wallet.balance || 0).toFixed(2);

  return (
    <LimitsProvider tier={tier} serverOk={serverOk}>
    <div className="mcz2-root" data-theme={dataThemeFor(settings)} style={accentStyle(settings.accent)}>
      <div className="container">
        <div className="header">
          <button className="dock-brand" onClick={goHome} title="Home">
            <IconImg icon="logo.png" alt="Music ConnectZ" style={{ width: 34, height: 34, borderRadius: 9 }} />
          </button>
          <div className="header-center">
            <div className="header-title">🎵 Music ConnectZ</div>
            <div className="header-subtitle">
              {user?.username ? `@${user.username}` : "Signed in"}
              <span title={`${prog.xp} XP`}> · 🎮 Lv {prog.level}</span>
              {prog.streak > 0 && <span title="Streak — consecutive active days. Keep it alive; it compounds your rewards. Tap for the Legend." style={{ color: "var(--gold, #ffcf3f)", cursor: "pointer" }} onClick={() => openApp("legendz")}> · 🔥 {prog.streak} Streak</span>}
              {community.total != null && <span title="Total members"> · Total 👥 {community.total}</span>}
              {community.online != null && <span title="Online now" style={{ color: "var(--success)" }}> · Online 🟢 {community.online}</span>}
              {isOwner && <span title="Owner" style={{ color: "var(--gold, #ffcf3f)" }}> · 🛠️ owner</span>}
            </div>
            <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.15)", marginTop: 3, overflow: "hidden" }} title={`${prog.xp % 100}/100 XP to next level`}>
              <div style={{ width: `${prog.xp % 100}%`, height: "100%", background: "var(--primary)" }} />
            </div>
          </div>
          <div className="header-right">
            <NotificationsBell serverOk={serverOk} onOpen={openApp} />
            <button className="theme-toggle" onClick={toggleLightDark} title="Panel depth">
              {settings.lightDark === "dark" ? "🌙" : "☀️"}
            </button>
            <div className="balances">
              <div className="balance" onClick={() => openApp("money")} title="Money">💲{balance}</div>
              <div className="balance" onClick={() => openApp("energy")} title="Energy">⚡{state.energy || 0}</div>
              <div className="balance" onClick={() => openApp("spinaz")} title="SpinAZ">🍥{state.spinaz || 0}</div>
            </div>
            <div className="profile-pic" onClick={() => openApp("profile")}>
              {(user?.username || "?").charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="content">
          {FnPage ? (
            <>
              <button className="btn btn-secondary btn-small" onClick={goHome} style={{ marginBottom: 12 }}>‹ Home</button>
              <div className="card-header" style={{ borderBottom: "none" }}>
                <span>{activeApp?.emoji} {activeApp?.name}</span>
                {FN_PAGES[view] && <OpenModeToggle mode="tab" onSetMode={(m) => switchMode(view, m)} />}
              </div>
              <FnPage tier={tier} onOpen={openApp} serverOk={serverOk} syncEconomy={syncEconomy} onTierChange={setTier} isOwner={isOwner} />
            </>
          ) : (
            CATALOG.map((group) => (
              <div key={group.label} className="launch-group">
                <div className="launch-label">{group.label}</div>
                <div className="launch-grid">
                  {group.apps.map((a) => (
                    <button key={a.key} className="app-tile" onClick={() => openApp(a.key)}>
                      <span className="tile-icon"><IconImg icon={iconFor(settings.appIcons, a.key, a.icon)} alt={a.name} /></span>
                      <span className="tile-name">{a.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button className="btn btn-secondary btn-small" onClick={() => openApp("legalz")}>⚖️ Terms &amp; Policies</button>
            <button className="btn btn-secondary btn-small" onClick={logout}>🚪 Log out</button>
          </div>
        </div>

        <Dock usage={usage} pins={pins} tier={tier} current={view} onOpen={openApp} onTogglePin={togglePin} onHome={goHome} />
      </div>

      <AppModal app={modalApp} onClose={() => setModalApp(null)} onOpen={openApp} />
      <AppWindow appKey={windowApp} onClose={() => setWindowApp(null)} onSetMode={switchMode}
        pageProps={{ tier, onOpen: openApp, serverOk, syncEconomy, onTierChange: setTier, isOwner }} />
      <PostModal post={postModal} onClose={closePost} onOpen={openApp} />
      <AutoTranslate uiLang={settings.uiLang} serverOk={serverOk} onCharge={syncEconomy} />
    </div>
    </LimitsProvider>
  );
}

export default function Mcz2App() {
  return (
    <AppStateProvider>
      <PostModalProvider>
        <Shell />
      </PostModalProvider>
    </AppStateProvider>
  );
}
