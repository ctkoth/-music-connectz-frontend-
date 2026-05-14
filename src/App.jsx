import React, { useState, useEffect, useRef } from 'react';
import {
  Home, Handshake, Swords, Heart, Mail, Phone, Bug, Send, Crown, Users,
  Tag, Lightbulb, Gamepad2, User, Wallet, Settings, ChevronRight,
  Info, X, LogIn, Mic, Calendar, HelpCircle, Trash2, RotateCcw, Check, Plus,
  Image as ImageIcon, Video, Music, Sliders, Mic2, Eye, Flame, AudioWaveform,
  HardHat, Brain, MapPin, Dumbbell, Infinity as InfinityIcon, Zap, Sparkles,
  Edit3, Save, ExternalLink, Activity, FileText, KeyRound, MessageCircle,
  Inbox as InboxIcon, Star, ShieldCheck, Skull, BookOpen, Globe, ArrowLeft, GitBranch,
} from 'lucide-react';

// ============================================================================
// MUSIC CONNECTZ — v0.9 · login → main · purple/cyan/pink theme · Corey voice
// ============================================================================

const T = {
  bgDeep: '#0a0118', bgMid: '#1a0b2e', purple: '#a855f7', purpleDark: '#7c3aed',
  cyan: '#22d3ee', pink: '#ec4899', white: '#ffffff', textSec: '#c4b5fd',
  textMuted: '#9ca3af', borderSoft: 'rgba(168,85,247,0.2)', borderStrong: 'rgba(168,85,247,0.4)',
  surface: 'rgba(168,85,247,0.06)', surfaceHover: 'rgba(168,85,247,0.12)',
  success: '#10b981', error: '#ef4444',
  green: '#10b981', orange: '#f97316', yellow: '#eab308', red: '#ef4444', lime: '#84cc16',
};

// ============================================================================
// OWNER GATE — only these accounts see PathZ, GitZ, and admin tooling
// ============================================================================
const OWNER_USERNAMES = ['ctkoth', 'corey', 'owner'];  // lower-cased match

const isOwner = (profile) => {
  if (!profile) return false;
  const name = (profile.artistName || profile.realName || profile.email || '').toLowerCase();
  return OWNER_USERNAMES.some(o => name.includes(o));
};

// ============================================================================
// TIER GATE — paywall helpers for Premium / StatZ features
// ============================================================================
const TIER_RANK = { free: 0, premium: 1, statz: 2 };
const hasTier = (membership, required) => {
  // Owner accounts get implicit StatZ access for testing
  const tier = membership?.tier || 'free';
  return TIER_RANK[tier] >= TIER_RANK[required];
};
const canAccess = (membership, feature) => {
  if (!membership || !membership.limits) return false;
  const map = {
    callz: membership.limits.can_use_callz,
    automations: membership.limits.can_use_automations,
    suggestions: membership.limits.can_use_suggestions,
    create_label: membership.limits.can_create_label,
    premium: membership.is_premium,
    statz: membership.is_statz,
  };
  return Boolean(map[feature]);
};
const tierLimits = (membership) => membership?.limits || {
  // Defaults match Free tier
  char_limit: 400, file_upload_mb: 40, storage_mb: 400, developer_tax_pct: 10,
  can_use_callz: false, can_use_automations: false, can_use_suggestions: false,
};

// ============================================================================
// CHAR LIMIT — enforces tier caps on messages, posts, comments, AI prompts
// ============================================================================
/** Hook: track text length vs tier limit. Returns { count, limit, pct, warn, locked }. */
const useCharLimit = (text, membership) => {
  const limit = tierLimits(membership).char_limit;
  const count = (text || '').length;
  const pct = limit > 0 ? count / limit : 0;
  return {
    count, limit, pct,
    warn: pct >= 0.85 && pct < 1,
    locked: pct >= 1,
  };
};

/** CharLimitBar: tiny visual indicator below any input. Yellow at 85%, red over. */
const CharLimitBar = ({ text, membership, onUpgrade }) => {
  const { count, limit, pct, warn, locked } = useCharLimit(text, membership);
  if (count === 0) return null;
  const color = locked ? '#ef4444' : warn ? '#fbbf24' : 'rgba(255,255,255,0.4)';
  const triggerUpgrade = onUpgrade || (() => {
    if (typeof window !== 'undefined' && window.__mczShowLimit) {
      window.__mczShowLimit('char', `${count.toLocaleString()} / ${limit.toLocaleString()} chars`);
    }
  });
  return (
    <div className="flex items-center justify-between mt-1 font-ui text-[9px]" style={{ color }}>
      <div className="flex-1 h-0.5 rounded mr-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded transition-all" style={{
          width: `${Math.min(100, pct * 100)}%`,
          background: color,
          boxShadow: pct > 0.85 ? `0 0 8px ${color}` : 'none',
        }} />
      </div>
      <span>{count.toLocaleString()} / {limit.toLocaleString()}</span>
      {locked && (
        <button onClick={triggerUpgrade} className="ml-2 underline font-bold">UPGRADE →</button>
      )}
    </div>
  );
};

// ============================================================================
// PROMO CASCADE — 20% → 40% → 80% off, with 15min + 60sec timers
// Backend creates PromoOffer rows; frontend just renders + handles accept/decline
// ============================================================================
const usePromoCascade = (membership) => {
  const [promo, setPromo] = useState(null); // { discount_pct, expires_at, target_tier }
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    // Free users only — fetch any active promo offer
    if (!membership || membership.tier !== 'free') { setPromo(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const { api } = await import('./lib/api.js');
        const res = await api.get('/api/membership/promos/active/').catch(() => null);
        if (!cancelled && res?.promo) setPromo(res.promo);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [membership?.tier]);

  // Countdown timer
  useEffect(() => {
    if (!promo?.expires_at) return;
    const tick = () => {
      const ms = new Date(promo.expires_at).getTime() - Date.now();
      setTimeLeft(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [promo?.expires_at]);

  return { promo, timeLeft, setPromo };
};

const PromoCascadeBanner = ({ membership, onSubscribe, onDismiss }) => {
  const { promo, timeLeft } = usePromoCascade(membership);
  if (!promo || timeLeft <= 0) return null;

  const isFinal = promo.discount_pct === 80;
  const color = isFinal ? T.pink : promo.discount_pct === 40 ? T.orange : T.cyan;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed bottom-4 left-3 right-3 z-40 p-3 rounded-2xl"
      style={{
        background: `linear-gradient(135deg, ${color}33, ${color}11)`,
        border: `2px solid ${color}`,
        backdropFilter: 'blur(12px)',
        boxShadow: `0 0 24px ${color}66`,
        maxWidth: 420, margin: '0 auto',
      }}>
      <div className="flex items-center justify-between mb-1">
        <div className="font-display text-sm" style={{ color, textShadow: `0 0 8px ${color}66` }}>
          {isFinal ? '⚡ FINAL OFFER' : '🎟️ LIMITED PROMO'}
        </div>
        <button onClick={onDismiss} className="font-ui text-[10px] opacity-50">✕</button>
      </div>
      <div className="font-ui text-xs mb-2" style={{ color: T.white }}>
        <span style={{ color, fontWeight: 800 }}>{promo.discount_pct}% OFF</span> {promo.target_tier === 'statz' ? 'StatZ' : 'Premium'}
        {isFinal && ' — last chance'}
      </div>
      <div className="font-ui text-[10px] opacity-70 mb-2" style={{ color: T.textSec }}>
        Expires in <span style={{ color, fontWeight: 700 }}>
          {isFinal ? `${seconds}s` : `${minutes}m ${seconds}s`}
        </span>
      </div>
      <button onClick={() => onSubscribe(promo.target_tier, false, promo.stripe_coupon_id || `mcz${promo.discount_pct}`)}
        className="w-full py-2 rounded-lg font-ui text-xs tracking-widest font-bold"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)`, color: '#000' }}>
        🚀 CLAIM {promo.discount_pct}% OFF
      </button>
    </div>
  );
};

// ============================================================================
// TRIAL LOGIC
// Free users: 4 hours/day of Premium features
// Premium users: 4 minutes/day of StatZ features (CallZ/Automations/Suggestions)
// ============================================================================
const TRIAL_QUOTAS = {
  free_to_premium: { duration_sec: 4 * 60 * 60, warn_sec: 15 * 60, name: 'Premium' },     // 4hr, warn at 15min left
  premium_to_statz: { duration_sec: 4 * 60,      warn_sec: 15,      name: 'StatZ' },        // 4min, warn at 15s left
};

const useTrial = (membership, targetTier = 'premium') => {
  const tier = membership?.tier || 'free';
  const trialType = tier === 'free' && targetTier === 'premium' ? 'free_to_premium'
                   : tier === 'premium' && targetTier === 'statz' ? 'premium_to_statz'
                   : null;
  const quota = trialType ? TRIAL_QUOTAS[trialType] : null;

  const today = new Date().toISOString().slice(0, 10);
  const trialKey = `mcz:trial:${trialType}:${today}`;

  const [usedSec, setUsedSec] = useState(0);
  const [active, setActive] = useState(false);

  // Load today's usage on mount
  useEffect(() => {
    if (!quota) return;
    try { setUsedSec(parseInt(localStorage.getItem(trialKey) || '0', 10)); } catch {}
  }, [trialKey, quota]);

  const remaining = quota ? Math.max(0, quota.duration_sec - usedSec) : 0;
  const exhausted = quota && remaining <= 0;

  // While trial active, tick every second
  useEffect(() => {
    if (!active || !quota) return;
    const id = setInterval(() => {
      setUsedSec(s => {
        const ns = s + 1;
        try { localStorage.setItem(trialKey, String(ns)); } catch {}
        if (ns >= quota.duration_sec) setActive(false);
        return ns;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active, quota, trialKey]);

  return {
    available: !!quota && !exhausted,
    active,
    remaining,
    used: usedSec,
    total: quota?.duration_sec || 0,
    warnSec: quota?.warn_sec || 0,
    targetName: quota?.name,
    start: () => { if (!exhausted) setActive(true); },
    stop: () => setActive(false),
    exhausted,
  };
};

const TrialCountdown = ({ trial, onUpgrade }) => {
  if (!trial.active) return null;
  const m = Math.floor(trial.remaining / 60);
  const s = trial.remaining % 60;
  const isWarning = trial.remaining <= trial.warnSec;
  const color = isWarning ? T.orange : T.cyan;

  return (
    <div className="fixed top-3 left-3 right-3 z-40 mx-auto p-2 rounded-xl"
      style={{
        background: `linear-gradient(135deg, ${color}22, ${color}11)`,
        border: `1px solid ${color}66`,
        backdropFilter: 'blur(8px)',
        maxWidth: 360,
      }}>
      <div className="flex items-center justify-between">
        <div className="font-ui text-[10px] tracking-widest" style={{ color }}>
          🕒 {trial.targetName} TRIAL · {m}m {String(s).padStart(2, '0')}s left
        </div>
        {isWarning && onUpgrade && (
          <button onClick={onUpgrade} className="font-ui text-[10px] tracking-widest font-bold underline" style={{ color }}>
            UPGRADE →
          </button>
        )}
      </div>
      <div className="h-0.5 mt-1 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded transition-all" style={{
          width: `${(trial.remaining / trial.total) * 100}%`,
          background: color,
        }} />
      </div>
    </div>
  );
};

// ============================================================================
// FILE UPLOADER — reusable component, tier-aware, talks to /api/storage/upload/
// ============================================================================
/**
 * <FileUploader
 *   accept="image/*"        // standard accept attr
 *   appOrigin="profile"     // UploadedFile.app_origin choice
 *   relatedId={postId}      // optional FK link
 *   membership={membership} // for showing tier limit
 *   onUploaded={(rec) => setUrl(rec.url)}
 *   onUpgrade={() => onJump('money')}
 *   label="📸 Upload profile picture"
 * />
 */
const FileUploader = ({
  accept = '*/*', appOrigin = 'filez', relatedId = '',
  membership, onUploaded, onUpgrade, label = 'Upload file', isPublic = false, className = '',
}) => {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState(null);
  const fileLimit = tierLimits(membership).file_upload_mb;
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setErr(null);

    // Pre-flight size check (client-side, matches backend)
    const sizeMb = file.size / 1024 / 1024;
    if (sizeMb > fileLimit) {
      setErr({
        msg: `File is ${sizeMb.toFixed(1)} MB — your tier max is ${fileLimit} MB.`,
        upgrade: true,
      });
      return;
    }

    setBusy(true); setProgress(0);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('app_origin', appOrigin);
      if (relatedId) fd.append('related_id', String(relatedId));
      if (isPublic) fd.append('is_public', 'true');

      // Use XHR for upload progress
      const rec = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/storage/upload/');
        const token = (() => { try { return localStorage.getItem('mcz:token'); } catch { return ''; } })();
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status === 402) {
            try { reject(JSON.parse(xhr.responseText)); }
            catch { reject({ message: 'Over tier limit' }); }
          } else if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); } catch { reject({ message: 'Bad response' }); }
          } else {
            reject({ message: `HTTP ${xhr.status}` });
          }
        };
        xhr.onerror = () => reject({ message: 'Network error — backend not reachable' });
        xhr.send(fd);
      });

      onUploaded?.(rec);
    } catch (e) {
      setErr({
        msg: e.message || 'Upload failed',
        upgrade: e.upgrade_required || e.error === 'storage_full' || e.error === 'file_too_large',
      });
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full px-3 py-2.5 rounded-lg font-ui text-xs tracking-wider"
        style={{
          background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`,
          color: '#000', fontWeight: 700,
          opacity: busy ? 0.5 : 1,
          boxShadow: `0 0 12px ${T.purple}55`,
        }}>
        {busy ? `⏳ ${progress}%` : label}
      </button>
      <div className="font-ui text-[9px] opacity-50 mt-1 text-center" style={{ color: T.textSec }}>
        Up to {fileLimit} MB · {membership?.tier === 'statz' ? 'StatZ tier' : membership?.tier === 'premium' ? 'Premium tier' : 'Free tier'}
      </div>
      {err && (
        <div className="mt-2 p-2 rounded-lg font-ui text-[10px]"
          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
          {err.msg}
          {err.upgrade && onUpgrade && (
            <button onClick={onUpgrade} className="ml-2 underline font-bold">UPGRADE →</button>
          )}
        </div>
      )}
    </div>
  );
};


// ============================================================================
// CUSTOM ICONS — drop PNGs in /public/icons/ to use them. All paths below are
// pre-registered. If a PNG doesn't exist at the path, TabIcon gracefully
// falls back to its Lucide icon (no broken image).
//
// HAIKU WORKFLOW: in a Haiku thread, paste a tab's emoji + Corey voice desc,
// ask Haiku for the best Midjourney prompt, generate, drop the PNG in
// /public/icons/<tabkey>.png (sub-apps use <tabkey>.<subkey>.png).
// ============================================================================
const CUSTOM_ICONS = {
  // Top-level tabs
  home:         '/icons/home.png',
  collabz:      '/icons/collabz.png',
  battlez:      '/icons/battlez.png',
  social:       '/icons/social.png',
  messagez:     '/icons/messagez.png',
  callz:        '/icons/callz.png',
  bugz:         '/icons/bugz.png',          // ← shipped
  distributez:  '/icons/distributez.png',
  royaltiez:    '/icons/royaltiez.png',
  groupz:       '/icons/groupz.png',
  labelz:       '/icons/labelz.png',
  toolz:        '/icons/toolz.png',
  intelligence: '/icons/intelligence.png',
  dawz:         '/icons/dawz.png',
  filez:        '/icons/filez.png',
  gamez:        '/icons/gamez.png',
  ratez:        '/icons/ratez.png',
  analytics:    '/icons/analytics.png',
  logz:         '/icons/logz.png',
  profile:      '/icons/profile.png',
  money:        '/icons/money.png',
  pickconz:     '/icons/pickconz.png',
  onboarding:   '/icons/onboarding.png',
  settingz:     '/icons/settingz.png',
  pathz:        '/icons/occ.png',      // OCC-style icon for owner admin
  gitz:         '/icons/gitz.png',

  // CollabZ sub-apps
  'collabz.coverz':   '/icons/collabz.coverz.png',
  'collabz.remixez':  '/icons/collabz.remixez.png',

  // BattleZ sub-apps
  'battlez.freestyle':'/icons/battlez.freestyle.png',
  'battlez.onevone':  '/icons/battlez.onevone.png',
  'battlez.cypher':   '/icons/battlez.cypher.png',

  // Social ConnectZ sub-apps
  'social.vibez':         '/icons/social.vibez.png',
  'social.inferno':       '/icons/social.inferno.png',
  'social.boardz':        '/icons/social.boardz.png',
  'social.personalitiez': '/icons/social.personalitiez.png',

  // MessageZ sub-apps
  'messagez.inbox':   '/icons/messagez.inbox.png',
  'messagez.outbox':  '/icons/messagez.outbox.png',
  'messagez.parcel':  '/icons/messagez.parcel.png',

  // CallZ sub-apps
  'callz.ai':         '/icons/callz.ai.png',
  'callz.user':       '/icons/callz.user.png',

  // ToolZ sub-apps
  'toolz.keyconz':    '/icons/toolz.keyconz.png',
  'toolz.sentencez':  '/icons/toolz.sentencez.png',
  'toolz.imagez':     '/icons/toolz.imagez.png',
  'toolz.videoz':     '/icons/toolz.videoz.png',
  'toolz.lilith':     '/icons/toolz.lilith.png',
  'toolz.ocular':     '/icons/toolz.ocular.png',
  'toolz.sing':       '/icons/toolz.sing.png',
  'toolz.rap':        '/icons/toolz.rap.png',
  'toolz.bodies':     '/icons/toolz.bodies.png',
  'toolz.energy':     '/icons/toolz.energy.png',
  'toolz.builder':    '/icons/toolz.builder.png',
  'toolz.ghostwriter':'/icons/toolz.ghostwriter.png',
  'toolz.sonday':     '/icons/toolz.sonday.png',
  'toolz.cleanconz':  '/icons/toolz.cleanconz.png',

  // Intelligence sub-apps
  'intelligence.sentencez':'/icons/intelligence.sentencez.png',
  'intelligence.imageconz':'/icons/intelligence.imageconz.png',
  'intelligence.instconz': '/icons/intelligence.instconz.png',
  'intelligence.mixconz':  '/icons/intelligence.mixconz.png',
  'intelligence.videoconz':'/icons/intelligence.videoconz.png',
  'intelligence.ocular':   '/icons/intelligence.ocular.png',

  // DawZ sub-apps
  'dawz.fruity':      '/icons/dawz.fruity.png',
  'dawz.arsenal':     '/icons/dawz.arsenal.png',
  'dawz.witch':       '/icons/dawz.witch.png',
  'dawz.trump':       '/icons/dawz.trump.png',
  'dawz.azrael':      '/icons/dawz.azrael.png',
  'dawz.intuition':   '/icons/dawz.intuition.png',
  'dawz.formulawon':  '/icons/dawz.formulawon.png',
};

// Track icon paths that 404'd in the current session so we don't retry
const _missingIcons = new Set();

/** TabIcon: renders custom PNG if registered AND loads OK; falls back to Lucide on missing/error. */
const TabIcon = ({ tabKey, subKey, fallback: Icon, size = 56, color = '#fff', style = {}, strokeWidth = 1.4 }) => {
  const key = subKey ? `${tabKey}.${subKey}` : tabKey;
  const src = CUSTOM_ICONS[key];
  const [errored, setErrored] = useState(_missingIcons.has(src));

  // If no registered path OR known-missing OR errored, use Lucide fallback
  if (!src || errored) {
    return <Icon size={size} color={color} style={style} strokeWidth={strokeWidth} />;
  }
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      onError={() => { _missingIcons.add(src); setErrored(true); }}
      style={{
        width: size, height: size, objectFit: 'contain',
        filter: `drop-shadow(0 0 14px ${color})`,
        ...style,
      }}
    />
  );
};

// ============================================================================
// MEDIA ROUTER — incoming content routes to its Intelligence App
// (audio → Azrael, image → ImageZ, video → VideoZ, text → SentenceZ)
// ============================================================================
const MEDIA_ROUTES = {
  audio:  { app: 'azrael',    label: 'Azrael DAW',  emoji: '💀' },
  image:  { app: 'imagez',    label: 'ImageZ',      emoji: '🖼️' },
  video:  { app: 'videoz',    label: 'VideoZ',      emoji: '📹' },
  text:   { app: 'sentencez', label: 'SentenceZ',   emoji: '📃' },
  lyrics: { app: 'sentencez', label: 'SentenceZ',   emoji: '📃' },
};
const routeMedia = (mimeType) => {
  if (!mimeType) return null;
  if (mimeType.startsWith('audio/')) return MEDIA_ROUTES.audio;
  if (mimeType.startsWith('image/')) return MEDIA_ROUTES.image;
  if (mimeType.startsWith('video/')) return MEDIA_ROUTES.video;
  if (mimeType.startsWith('text/'))  return MEDIA_ROUTES.text;
  return null;
};

// ============================================================================
// ZODIACZ — birthday auto-detect
// ============================================================================
const ZODIAC = [
  { sign: 'Capricorn',  symbol: '♑', emoji: '🐐', start: [12,22], end: [1,19] },
  { sign: 'Aquarius',   symbol: '♒', emoji: '🌊', start: [1,20],  end: [2,18] },
  { sign: 'Pisces',     symbol: '♓', emoji: '🐟', start: [2,19],  end: [3,20] },
  { sign: 'Aries',      symbol: '♈', emoji: '🐏', start: [3,21],  end: [4,19] },
  { sign: 'Taurus',     symbol: '♉', emoji: '🐂', start: [4,20],  end: [5,20] },
  { sign: 'Gemini',     symbol: '♊', emoji: '👯', start: [5,21],  end: [6,20] },
  { sign: 'Cancer',     symbol: '♋', emoji: '🦀', start: [6,21],  end: [7,22] },
  { sign: 'Leo',        symbol: '♌', emoji: '🦁', start: [7,23],  end: [8,22] },
  { sign: 'Virgo',      symbol: '♍', emoji: '👩', start: [8,23],  end: [9,22] },
  { sign: 'Libra',      symbol: '♎', emoji: '⚖️', start: [9,23],  end: [10,22] },
  { sign: 'Scorpio',    symbol: '♏', emoji: '🦂', start: [10,23], end: [11,21] },
  { sign: 'Sagittarius',symbol: '♐', emoji: '🏹', start: [11,22], end: [12,21] },
];
function detectZodiac(birthday) {
  if (!birthday) return null;
  const [, m, d] = birthday.split('-').map(Number);
  if (!m || !d) return null;
  for (const z of ZODIAC) {
    const [sm, sd] = z.start, [em, ed] = z.end;
    if (sm > em) { // year wrap (Capricorn)
      if ((m === sm && d >= sd) || m > sm || (m === em && d <= ed) || (m < em && m !== sm)) return z;
    } else {
      if ((m === sm && d >= sd) || (m > sm && m < em) || (m === em && d <= ed)) return z;
    }
  }
  return null;
}
const zodiacRange = (z) => `${z.start[0]}/${z.start[1]}-${z.end[0]}/${z.end[1]}`;

// ============================================================================
// TAB REGISTRY — every =tab + its +sub-apps + Corey voice
// ============================================================================
const TABS = {
  home:        { emoji: '🏡', label: 'HomeZ',          icon: Home,         color: T.purple,
                 purpose: 'Your launchpad — everything starts here.',
                 voice: `Real talk — HomeZ is where you land when you open Music ConnectZ. It's not trying to be busy, it's trying to be useful. Today's pulse, what's next up, quick-jump to every other zone. No menus buried in menus.`,
                 howto: `Tap a pulse card to jump to that section. Tap any tab to dive in. Tap the 🎙️ℹ️ on any tab — like you did to land here — and I'll explain that zone the same way.` },
  collabz:     { emoji: '🤝', label: 'CollabZ',        icon: Handshake,    color: T.purple,
                 purpose: 'Collaborate with other users, manage collab projectZ.',
                 voice: `CollabZ is where work gets made together. Cover an existing song, redraw existing art, remix somebody else's post — that's all here. Two flavors: CoverZ for covers and redraws, RemixeZ for taking a post and flipping it.`,
                 howto: `Pick CoverZ or RemixeZ, attach the original you're building off, drop your version, tag the collaborators.`,
                 subs: { coverz: { emoji: '🫴🏼', label: 'CoverZ', desc: `Covers of songs — redraw existing art, perform existing covers. You're saying "I respect the original, here's my take."`, icon: BookOpen },
                          remixez: { emoji: '🔄', label: 'RemixeZ', desc: `Remixing postZ and songZ. Same DNA, new energy. Tag the original, claim your flip.`, icon: Music } } },
  battlez:     { emoji: '🪖', label: 'BattleZ',        icon: Swords,       color: T.red,
                 purpose: `Post vs post. Winner decided by Corey GPT rating — no popularity contest.`,
                 voice: `BattleZ is the arena, but it's not Twitter — winners aren't decided by popularity alone. **Corey GPT scores both entries** on 5 dimensions (audio, visual, creativity, engagement, overall), each out of 10. **Users can also rate each side 2/4/6/8/10** — those user scores get averaged in 50/50 with Corey's, and the winner can flip as more votes come in. Three modes: Freestyle for live no-prep battles, 1v1 for clean head-to-head, Battle Cypher for crews. Verified 18+? Real money stakes. Not verified? SpinaZ only. K-Oth takes 10% of the pot, winner takes the rest.`,
                 howto: `Profile → Examples → make one public. Then BattleZ → "START BATTLE" → pick example + mode + SpinaZ stake. Corey GPT scores both entries on 5 dimensions out of 10. Users add their own 2-10 ratings — combined avg decides the winner. Pot minus K-Oth's 10% goes to the higher combined score.`,
                 subs: { freestyle: { emoji: '🆓', label: 'Freestyle', desc: `Live sporadic battles — no prep, no second takes. Mic on, beat drops, you go. Fastest way to find out if you've actually got it or if you've just been editing yourself into competence.`, icon: Flame },
                          oneone: { emoji: '1⃣', label: '1v1', desc: `One artist vs one artist. Doesn't matter who ghostwrote, who produced, who mixed — your name's on the card, you take the W or the L.`, icon: User },
                          cypher: { emoji: '🧑‍🤝‍🧑', label: 'Battle Cypher', desc: `Crew vs crew. Alpha team vs Omega team. Multiple artists, producers, even managers stacking on one side. Bigger pot, more chaos.`, icon: Users } } },
  social:      { emoji: '💓', label: 'Social ConnectZ',icon: Heart,        color: T.pink,
                 purpose: 'Find collaborators. Find someone to vibe with. Both, sometimes.',
                 voice: `Social ConnectZ is the "who you connecting with" zone. Clear intent flags so nobody's wasting time — romance, collab, or both. VibeZ is the deep-vibes one. Inferno is quick swipes. BoardZ for open conversations. PersonalitieZ for MBTI breakdowns.`,
                 howto: `Set your intent in PreferenceZ first, then pick the app that matches your energy.`,
                 subs: { vibez: { emoji: '♥️', label: 'VibeZ', desc: `Plenty Of Fish style — slower, deeper, clear intent (romance or partnership collab).`, icon: Heart },
                          inferno: { emoji: '❤️‍🔥', label: 'Inferno', desc: `Tinder style — quick swipes, clear intent (romance or quick collab).`, icon: Flame },
                          boardz: { emoji: '🪧', label: 'BoardZ', desc: `Message boards. Open threads, public energy.`, icon: MessageCircle },
                          personalitiez: { emoji: '😶', label: 'PersonalitieZ', desc: `MBTI tests, simple and complex. Find your type so the matching gets smarter.`, icon: Brain } } },
  messagez:    { emoji: '📨', label: 'MessageZ',       icon: Mail,         color: T.cyan,
                 purpose: 'Inbox, outbox, and the email blaster all in one zone.',
                 voice: `MessageZ runs three lanes. Inbox is where DMs from collaborators, A&R scouts, and label folks land — unread ones pulse cyan so you know what's fresh. Outbox is your sent log, in case you forgot what you fired off last week. Then there's Parcel Primate 🐒 — the email marketing engine. Tell it your goal (EP drop, show announcement, merch launch), describe your audience, pick a tone, and Corey GPT writes the campaign. You edit, you schedule, it queues. Cost is ~$0.01 a draft.`,
                 howto: `Tap Inbox for incoming. Tap a message to read + reply inline. Tap Outbox for what you've sent. Tap Parcel Primate to draft a campaign — fill the goal/audience/tone, hit "DRAFT WITH COREY GPT", edit the result, schedule it.`,
                 subs: { inbox: { emoji: '📥', label: 'Inbox', desc: `Incoming — DMs from matches, collaborators, A&R scouts, label folks. Unread ones pulse cyan. Tap to read and reply inline.`, icon: InboxIcon },
                          outbox: { emoji: '📤', label: 'Outbox', desc: `Sent log. What you fired off, when, to who. Useful when you forget what you already said.`, icon: Send },
                          parcelprimate: { emoji: '🐒', label: 'Parcel Primate', desc: `The AI email-marketing engine — Corey GPT writes campaigns based on your goal, audience, and tone. Edit, schedule, blast. Like Mailchimp but Corey-voiced and music-career-tuned.`, icon: Mail } } },
  callz:       { emoji: '📞', label: 'CallZ',          icon: Phone,        color: T.cyan,
                 purpose: 'Actually talk to people. Or to an AI.',
                 voice: `CallZ runs on cash balance — needs StatZ tier and money in the wallet. Two flavors: AI calls (cost depends on the model you pick) and User calls (cost depends on the other person's hourly skill rate). SpinaZ won't work here yet — tap to add balance via Stripe or PayPal, K-Oth handles the tax logic.`,
                 howto: `Top up balance first. Pick AI for model-based calls, User for human skill sessions.`,
                 subs: { ai: { emoji: '🤖', label: 'AI Call', desc: `Voice call with the model you choose. Per-minute pricing varies by model.`, icon: Sparkles },
                          user: { emoji: '🗣️', label: 'User Call', desc: `Call another user. Their hourly skill rate applies.`, icon: User } } },
  bugz:        { emoji: '🐞', label: 'BugZ',           icon: Bug,          color: T.red,
                 purpose: 'Spot a bug, post it, get paid.',
                 voice: `BugZ uses your normal post format — drop a screenshot, describe what broke. Only admin can change status. "In progress 💭" means somebody's working on it. "Squashed 🪦" means it's fixed, and the original poster gets 200 SpinaZ. Real bounty system, no fluff.`,
                 howto: `Hit "Submit Bug", upload evidence, describe steps to reproduce. Then watch the status flip.`,
                 subs: {} },
  distributez: { emoji: '🎶', label: 'DistributeZ',    icon: Send,         color: T.pink,
                 purpose: 'Push your work to streaming platforms.',
                 voice: `DistributeZ pulls metadata straight from your post type. Audio post becomes the track. Image post becomes the cover. Text post becomes lyrics. Album posts roll up as album submissions — all still editable before submit. Free users get 1 submission a month — Premium and StatZ get unlimited, plus StatZ can submit for licensing.`,
                 howto: `Tag a post as a release candidate, fill the gaps, hit submit. Stays editable until distribution accepts it.`,
                 subs: {} },
  royaltiez:   { emoji: '👑', label: 'RoyaltieZ',      icon: Crown,        color: T.yellow,
                 purpose: 'Current balance, every dollar logged with a source and a timestamp.',
                 voice: `RoyaltieZ is the receipts page. Current balance up top, full log below — where the money came from, when it landed, what platform. No black box. If you got paid, you can see why.`,
                 howto: `Browse the log. Filter by source. Export when tax season hits.`,
                 subs: {} },
  groupz:      { emoji: '👥', label: 'GroupZ',         icon: Users,        color: T.cyan,
                 purpose: 'Sort the people in your orbit. Editable, local to you.',
                 voice: `GroupZ lets you organize who's who in your network. Defaults are Friends 🙂 (mutual benefits), Fans 👋🏽 (love them but different relationship), Partners 👏🏽 (the ones you actually work with), Blocked 🤚🏽 (cannot reach you), and Custom — make your own.`,
                 howto: `Drop people in groups from their profile. Custom groups, name 'em what you want.`,
                 subs: { friends: { emoji: '🙂', label: 'Friends', desc: `Mutual benefits. Two-way street.`, icon: Heart },
                          fans: { emoji: '👋🏽', label: 'Fans', desc: `Love your work — you don't need to reach back as often.`, icon: Star },
                          partners: { emoji: '👏🏽', label: 'Partners', desc: `Frequent collaborators. Your work network.`, icon: Handshake },
                          blocked: { emoji: '🤚🏽', label: 'Blocked', desc: `Cannot contact you. Cannot see you.`, icon: ShieldCheck },
                          custom: { emoji: '❓', label: 'Custom', desc: `Make your own group, name it what you want.`, icon: Plus } } },
  labelz:      { emoji: '🏷️', label: 'LabelZ',         icon: Tag,          color: T.lime,
                 purpose: 'Public groupZ that act like a record label.',
                 voice: `LabelZ is essentially public groups with contract teeth. Needs Premium plus A&R Scout or Manager persona to create or edit one. Real label logic: advances with terms, e-signed contracts, royalty splits.`,
                 howto: `Spin up a label with your A&R or Manager persona, define your terms, sign artists with real e-signed deals.`,
                 subs: {} },
  toolz:       { emoji: '💡', label: 'ToolZ',          icon: Lightbulb,    color: T.green,
                 purpose: 'Productivity appZ for music careerZ.',
                 voice: `ToolZ is the utility belt. Every tool you need to actually make stuff — keyboards, doc editor, image editor, video editor — plus the deep-cut productivity systems: Lilith (Apple Things-style task manager), SingZ for vocal practice, RapZ for bars and flow, BodieZ for fitness tracking. Plus the wild ones — Azrael, Witchcraft, Trump Toupee, Fruity Möbius.`,
                 howto: `Tap any tool to open it. Lilith's the most polished — start there.`,
                 subs: {
                   keyz:     { emoji: '⌨️', label: 'Key ConnectZ', desc: `System keyboard on mobile, floating on desktop. Ctrl+Shift+K to open. Custom backgrounds, custom keys, speech-to-text + live translation for Premium.`, icon: KeyRound },
                   sentencez:{ emoji: '📃', label: 'SentenceZ',    desc: `Word knockoff. All text media opens here.`, icon: FileText },
                   imagez:   { emoji: '🖼️', label: 'ImageZ',       desc: `Photoshop knockoff. All image media opens here.`, icon: ImageIcon },
                   videoz:   { emoji: '📹', label: 'VideoZ',       desc: `Sony Vegas knockoff. All video media opens here.`, icon: Video },
                   lilith:   { emoji: '💃🏽', label: 'Lilith',       desc: `Apple Things-style productivity. Inbox, Today, Upcoming, Anytime, Someday, Logbook, Trash. The one I built first — fully working.`, icon: Sparkles },
                   singz:    { emoji: '👩🏼‍🎤', label: 'SingZ',     desc: `Vocal practice with pitch detection, range tracking, daily warmups, recordingZ.`, icon: Mic2 },
                   rapz:     { emoji: '👨🏼‍🎤', label: 'RapZ',      desc: `Bar writing, flow training, rhyme stacks, style-by-style practice from Boom Bap to Drill to Cloud.`, icon: Mic },
                   bodiez:   { emoji: '💪🏽', label: 'BodieZ',      desc: `Jefit-style training tracker. Routines, sessions, BodyMap, Coach. Vocals need stamina — track it.`, icon: Dumbbell },
                   azrael:   { emoji: '💀', label: 'Azrael',        desc: `In-house DAW. Reaper-style but darker. Multitrack, FX racks, mastering, stem export.`, icon: Skull },
                   witchcraft:{emoji: '🔮', label: 'Witchcraft',    desc: `The weird creative module. Mood-board sound design, sigil-style preset packs, occult-themed FX. Use when you wanna go somewhere uncanny.`, icon: Sparkles },
                   trump:    { emoji: '🎤', label: 'Trump Toupee',  desc: `Voice FX engine — preset profiles, pitch/formant fx, layer stacks. Bounce one-shots fast.`, icon: Mic },
                   fruity:   { emoji: '🍑', label: 'Fruity Möbius', desc: `Infinite-loop collab tool. Slots open, partners cycle through, the song never really ends.`, icon: InfinityIcon },
                   energy:   { emoji: '⚡', label: 'Energy',        desc: `PostZ creator — captions, hooks, post copy. Cross-platform one-click.`, icon: Zap },
                   builder:  { emoji: '🏗️', label: 'Builder',       desc: `PostZ management — the queue. Approve, schedule, publish across IG/TikTok/X/YT.`, icon: HardHat },
                   sonday:   { emoji: '🌞', label: 'Sonday',        desc: `Monday.com knockoff. Project board for collab tracking — kanban columns, due dates, assignees, time logs.`, icon: Activity },
                   cleanconz:{ emoji: '🧹', label: 'Clean ConnectZ', desc: `Device cleaner. StatZ users: AI looks at device storage, picks low-frequency-of-use + high-size files to delete first. Two modes: Target Percent (free space goal) + Target Size (specific MB/GB). Three sort filters: Priority (size DESC + frequency ASC), Size (DESC), Frequency (ASC). User reviews & approves before deletion.`, icon: Trash2 },
                   ocular:   { emoji: '👁️', label: 'OCC',           desc: `Ocular Code ConnectZ — the meta tool. Powered by Claude, it generates code, specs, and prompts for building Music ConnectZ from inside Music ConnectZ. Real talk, this is how this whole app gets coded faster.`, icon: Eye },
                   originalz:{ emoji: '🧬', label: 'OriginalZ',     desc: `Unique SongZ — original music creation flow. Drop a concept, pick a style, get a fingerprinted original — separate from CoverZ and RemixeZ.`, icon: Sparkles },
                 } },
  gamez:       { emoji: '🎮', label: 'GameZ',          icon: Gamepad2,     color: T.pink,
                 purpose: 'Play user-made gameZ, sorted by genre.',
                 voice: `GameZ is exactly what it sounds like — browser games made by other users, sorted by genre. Top-rated leaderboards. Submit your own.`,
                 howto: `Browse by genre, hit play. Bored? Build one and submit.`,
                 subs: {} },
  ratez:       { emoji: '⭐', label: 'RateZ',           icon: Star,         color: T.yellow,
                 purpose: 'Corey GPT scores your work before the world does.',
                 voice: `RateZ is the honest mirror — pick an example from your Profile, send it through, and Corey GPT scores it on five dimensions: audio quality, visual impact, creativity, engagement, and an overall. Plus a 2-sentence verdict in Corey voice — not "this is great!" filler, actual critique with em dashes. Use it as a gut-check before you release — if RateZ says your audio's 60/100, maybe push the master one more round before you DistributeZ it.`,
                 howto: `Profile → Examples → add a public one. Then RateZ → pick it from the dropdown → "ASK COREY GPT TO SCORE". You get stars per dimension, a percentage, and the verdict. ~$0.01 per rating.`,
                 subs: {} },
  logz:        { emoji: '🪵', label: 'LogZ',            icon: FileText,     color: T.orange,
                 purpose: 'Every action, timestamped. The audit trail.',
                 voice: `LogZ is the receipt book — every taskZ you completed, every post you fired, every collab you joined, every dollar that moved. Sorted newest first, filterable by type. Useful for two things: spotting your own patterns (oh, I haven't shipped anything in 3 weeks?) and proving what happened if a collab dispute pops up.`,
                 howto: `Browse the feed. Filter by action type or date range. Export when tax season hits or you need to show a label your release timeline.`,
                 subs: {} },
  profile:     { emoji: '👤', label: 'Profile',        icon: User,         color: T.cyan,
                 purpose: 'Present yourself to Music ConnectZ.',
                 voice: `Profile is your public face. Artist name, role, bio, links, genres, and now — ZodiacZ. Drop your birthday and the app auto-detects your sign and surfaces it on your card. Affects nothing critical, just flavor for matching and vibes.`,
                 howto: `Hit Edit, fill it out, save. Profile strength bar tells you how complete you are.`,
                 subs: {} },
  money:       { emoji: '💰', label: 'Money',          icon: Wallet,       color: T.green,
                 purpose: 'Wallet, balance, Stripe checkout.',
                 voice: `Money is the wallet. Current balance up top, total earned, full payment history below. Stripe handles checkout — K-Oth keeps 10%, the rest routes straight to the collaborator's account. Test card: 4242 4242 4242 4242.`,
                 howto: `Add a collaborator account ID, enter amount, run checkout. Watch the history populate.`,
                 subs: {} },
  settingz:    { emoji: '⚙️', label: 'SettingZ',       icon: Settings,     color: T.purple,
                 purpose: 'Personalize your experience.',
                 voice: `SettingZ is where you tune the app to you. Themes, notifications, location sharing, sound, vibration, and the language toggle. Casual mode swaps in some everyday slang for the Corey voice tour modals — keep it off for professional documents.`,
                 howto: `Flip toggles. Pick a theme. Test sound. Done.`,
                 subs: {} },
  pathz:       { emoji: '🌐', label: 'PathZ',          icon: Globe,        color: T.cyan,    ownerOnly: true,
                 purpose: 'Cross-device sync + admin paths. Owner-only.',
                 voice: `PathZ is the admin nerve center — only the owner sees this tab. It controls cross-device sync, deep-link routing, and the master path map for every other zone in Music ConnectZ. Regular users get sync without ever seeing the controls; the owner sees the full graph and can override anything.`,
                 howto: `Browse the path map. Edit sync rules. Trigger manual cross-device pushes. Audit which devices are connected.`,
                 subs: {} },
  gitz:        { emoji: '🐙', label: 'GitZ',           icon: GitBranch,    color: T.purple,  ownerOnly: true,
                 purpose: 'Git operations + commit history. Owner-only.',
                 voice: `GitZ is the in-app git UI — only the owner sees it. Browse the commit log, see file diffs, check CI status, push from your phone. Built so you can keep coding Music ConnectZ from inside Music ConnectZ. Reads from both the front-end and back-end repos.`,
                 howto: `Pick a repo, see recent commits, view diffs, push changes. CI status pulled from GitHub Actions.`,
                 subs: {} },
  intelligence:{ emoji: '🧠', label: 'Intelligence',   icon: Brain,        color: T.cyan,
                 purpose: 'AI media creators. Lyrics, beats, mixes, covers, videos, code.',
                 voice: `Intelligence is the AI workshop — every ConnectZ creator lives here. Sentence ConnectZ writes lyrics/essays/contracts. Image ConnectZ generates covers/portraits. Instrumental ConnectZ makes beats. Mix ConnectZ mixes them. Video ConnectZ stitches the visuals. OCC writes code. Every output gets watermarked, attributes Corey to the right role (Ghostwriter / Designer / Engineer / Producer), splits 15% royalty to K-Oth + 15% to upstream post contributors. Transparent receipts on every generation.`,
                 howto: `Pick a creator, give it a prompt + source posts, get back a post. The output post stays inside Music ConnectZ — no external download — so users can't steal it.`,
                 subs: {
                   sentencez: { emoji: '📃', label: 'Sentence ConnectZ', desc: `AI text creator — lyrics, essays, contracts, guitar tabs, sheet music. CGPT toggles for language, explicit, slang, emoji. LyricZ mode has genre/mood/topic/metaphor/simile/double-meaning/triple-meaning/pun controls + syllable-rhyme range for majority vs minority of lines.`, icon: FileText },
                   imageconz: { emoji: '👨🏽‍🎨', label: 'Image ConnectZ', desc: `AI image creator — song covers, album covers, portraits, profile pictures, promo art. Watermarked with low-gradient MCZ logo.`, icon: ImageIcon },
                   instconz:  { emoji: '🎹', label: 'Instrumental ConnectZ', desc: `AI beat creator. Generated instrumentals attribute to Beat Producer role for royalty splits.`, icon: Music },
                   mixconz:   { emoji: '🎚️', label: 'Mix ConnectZ', desc: `AI mix engineer — takes your stems, returns balanced mix. Attributes to Mix Engineer role.`, icon: Sliders },
                   videoconz: { emoji: '📺', label: 'Video ConnectZ', desc: `AI video creator — music videos, intros, promos. Watermarked.`, icon: Video },
                   ocular:    { emoji: '👁️', label: 'Ocular Code ConnectZ (OCC)', desc: `In-app VS Code knockoff. Code editor + TaskZ + CodeZ + PathZ + MistakeZ + HabitZ + Console + CallZ + Search + TellZ + LogZ + FileZ + Welcome. Built to code Music ConnectZ from inside Music ConnectZ.`, icon: Eye },
                 } },
  dawz:        { emoji: '🎛️', label: 'DawZ',           icon: Sliders,      color: T.purple,
                 purpose: 'In-app DAW family. VST support filtered by what you own.',
                 voice: `DawZ is the digital audio workstation family — seven flavors so you can pick the workflow that matches the DAW you came from. VST support across all of them with filtering by what's actually installed on your machine. Sub-apps below are knockoffs of the big DAWs.`,
                 howto: `Pick the DAW that matches your muscle memory. Project files cross-compatible.`,
                 subs: {
                   fruity:   { emoji: '🍑', label: 'Fruity Möbius',  desc: `FL Studio knockoff — infinite-loop collab tool. Pattern-based step sequencing.`, icon: InfinityIcon },
                   arsenal:  { emoji: '⚔️', label: 'Arsenal',         desc: `Pro Tools knockoff — industry-grade tracking, mixing, mastering.`, icon: Mic },
                   witch:    { emoji: '🔮', label: 'Witchcraft',      desc: `Acoustica Mixcraft knockoff — mood-board sound design, occult-themed FX.`, icon: Sparkles },
                   trump:    { emoji: '🎤', label: 'Trump Toupee',    desc: `Bitwig knockoff — voice FX engine with pitch/formant stacks.`, icon: Mic },
                   azrael:   { emoji: '💀', label: 'Azrael',          desc: `Reaper knockoff — darker, leaner, infinitely customizable.`, icon: Skull },
                   intuition:{ emoji: '🤔', label: 'Intuition',       desc: `Logic Pro knockoff — built for melodic composition.`, icon: Brain },
                   formulawon:{emoji: '🚦', label: 'FormulaWon',      desc: `GarageBand knockoff — beginner-friendly entry point.`, icon: Music },
                 } },
  filez:       { emoji: '📁', label: 'FileZ',          icon: FileText,     color: T.lime,
                 purpose: 'File management + uploads, tier-limited storage.',
                 voice: `FileZ is the master file browser. Free: 400mb total + 40mb per upload. Premium: 5gb + 400mb. StatZ: 100gb + 4gb. Warnings at 80% full, hard lock at 100% with upgrade CTA. Browse by app, type, date, size. All Intelligence App outputs land here automatically.`,
                 howto: `Tap any file to open in its Intelligence App. Long-press to share, rename, delete, or move.`,
                 subs: {} },
  analytics:   { emoji: '📈', label: 'Analytics',      icon: Activity,     color: T.orange,
                 purpose: 'Deep dive into your usage + performance.',
                 voice: `Analytics is the truth mirror — what you actually do vs what you say you do. Time per tab, posts per week, royalties per source, BattleZ win-rate, RateZ median, follower growth, top-performing personas. Premium gets the deep cuts; Free gets the headlines.`,
                 howto: `Pick a metric, pick a time range, see the chart. Export as CSV (Premium) or PDF (StatZ).`,
                 subs: {} },
  pickconz:    { emoji: '📌', label: 'Pick ConnectZ',  icon: Star,         color: T.yellow,
                 purpose: 'Footer customization — pin favorite features.',
                 voice: `Pick ConnectZ controls what shows up in your bottom-bar footer. Free users pick 2 things, AI fills the rest based on usage. Premium and StatZ pin unlimited. Drag to reorder.`,
                 howto: `Tap to add a tab to your footer. Long-press to remove.`,
                 subs: {} },
  onboarding:  { emoji: '🛂', label: 'Onboarding',     icon: ShieldCheck,  color: T.green,
                 purpose: 'Account setup + 18+ verification + KYC for paying users.',
                 voice: `Onboarding handles the legally hard pieces — age verification for BattleZ money betting, identity verification for Stripe Connect payouts, Premium/StatZ upgrades. Free users skip most of it; Premium does ID; StatZ does full KYC for higher payout limits.`,
                 howto: `Follow the steps when prompted. Onboarding can also be reopened from Profile.`,
                 subs: {} },
};
// Populate the ALL_TAB_KEYS set now that TABS is defined (for path-routing)
Object.keys(TABS).forEach(k => ALL_TAB_KEYS.add(k));
const TAB_ORDER = ['home','collabz','battlez','social','messagez','callz','bugz','distributez','royaltiez','groupz','labelz','toolz','intelligence','dawz','filez','gamez','ratez','analytics','logz','profile','money','pickconz','onboarding','settingz','pathz','gitz'];

// ============================================================================
// TAB STATUS — honest labeling of what works vs what's "voting open"
// LIVE = fully functional · BETA = works, limited · PREVIEW = concept + vote
// ============================================================================
const TAB_STATUS = {
  home: 'live', profile: 'live', settingz: 'live', collabz: 'live',
  messagez: 'live', battlez: 'live', ratez: 'live', money: 'live',
  toolz: 'live',  // because Lilith + OCC work inside it
  bugz: 'beta', distributez: 'beta', royaltiez: 'beta',
  analytics: 'beta', logz: 'beta',
  social: 'preview', callz: 'preview', groupz: 'preview', labelz: 'preview',
  intelligence: 'beta', dawz: 'preview', filez: 'preview', gamez: 'preview',
  pickconz: 'preview', onboarding: 'preview',
  pathz: 'owner', gitz: 'owner',
};

const STATUS_COLORS = {
  live:    { color: '#22c55e', label: 'LIVE',    glow: '#22c55e' },
  beta:    { color: '#fbbf24', label: 'BETA',    glow: '#fbbf24' },
  preview: { color: '#9b59ff', label: 'PREVIEW', glow: '#9b59ff' },
  owner:   { color: '#4dffea', label: 'OWNER',   glow: '#4dffea' },
};

const StatusPill = ({ status, size = 'sm' }) => {
  const cfg = STATUS_COLORS[status];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center font-ui font-bold tracking-widest rounded
      ${size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'}`}
      style={{
        background: `${cfg.color}22`,
        color: cfg.color,
        border: `1px solid ${cfg.color}66`,
        boxShadow: `0 0 8px ${cfg.glow}44`,
      }}>
      {cfg.label}
    </span>
  );
};

// ============================================================================
// LILITH — Tasks suite (was the original neon-os)
// ============================================================================
const LILITH_TABS = ['inbox','today','upcoming','anytime','someday','logbook','trash'];
const LILITH_DEF = {
  inbox:    { label: 'Inbox',    emoji: '📥', icon: InboxIcon,   color: T.cyan },
  today:    { label: 'Today',    emoji: '‼️', icon: Mic,         color: T.pink },
  upcoming: { label: 'Upcoming', emoji: '❗', icon: Calendar,    color: T.purple },
  anytime:  { label: 'Anytime',  emoji: '👐🏼', icon: Activity,   color: T.cyan },
  someday:  { label: 'Someday',  emoji: '❓', icon: HelpCircle,  color: T.orange },
  logbook:  { label: 'Logbook',  emoji: '🧾', icon: FileText,    color: T.green },
  trash:    { label: 'Trash',    emoji: '🚮', icon: Trash2,      color: T.red },
};

// ============================================================================
// STORAGE
// ============================================================================
const KEYS = { auth: 'mcz:auth:v1', tasks: 'mcz:tasks:v1', profile: 'mcz:profile:v1', settings: 'mcz:settings:v1' };

// Smart storage — uses Django backend if VITE_API_BASE is set + user is logged in,
// otherwise falls back to localStorage. Same call signature either way.
// See src/lib/storage.js for the routing logic.
// ============================================================================
// INLINE LIB STUBS — keeps App.jsx as a single-file artifact-renderable unit.
// In your real Vite project, you can REPLACE this block with:
//   import { load as storageLoad, save as storageSave } from './lib/storage.js';
//   import { isBackendConfigured, getToken, login as apiLogin, signup as apiSignup,
//            logout as apiLogout, ai as aiClient, memberships as apiMemberships }
//     from './lib/api.js';
// to get the full backend-routing behavior. These stubs fall back to localStorage
// + safe no-op API responses so the file works standalone.
// ============================================================================

// --- storage.js stub: localStorage with sync API ---
const storageLoad = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch (e) { return fallback; }
};
const storageSave = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { return false; }
};

// --- api.js stub: detects backend, manages JWT, exposes domain clients ---
const _isBrowser = typeof window !== 'undefined';
const isBackendConfigured = () => {
  if (!_isBrowser) return false;
  const host = window.location.hostname;
  return host !== 'localhost' && host !== '127.0.0.1' && host !== '';
};
const getToken = () => { try { return localStorage.getItem('mcz:token'); } catch (e) { return null; } };
const setTokens = (a, r) => {
  try { if (a) localStorage.setItem('mcz:token', a); if (r) localStorage.setItem('mcz:refresh', r); } catch (e) {}
};
const clearTokens = () => {
  try { localStorage.removeItem('mcz:token'); localStorage.removeItem('mcz:refresh'); } catch (e) {}
};

async function _request(path, opts = {}) {
  if (!isBackendConfigured()) throw new Error('Backend not reachable');
  const { method = 'GET', body, headers = {} } = opts;
  const token = getToken();
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.status === 204 ? null : res.json();
}

const apiLogin = async (username, password) => {
  try {
    const data = await _request('/api/auth/login/', { method: 'POST', body: { username, password } });
    if (data?.access) setTokens(data.access, data.refresh);
    return data;
  } catch (e) { return null; }
};
const apiSignup = async (username, email, password) => {
  try {
    const data = await _request('/api/auth/register/', { method: 'POST', body: { username, email, password } });
    if (data?.access) setTokens(data.access, data.refresh);
    return data;
  } catch (e) { return null; }
};
const apiLogout = () => clearTokens();

const aiClient = {
  corey: async (domain, message, history = []) => {
    try { return await _request('/api/ai/corey/', { method: 'POST', body: { domain, message, history } }); }
    catch (e) { return { reply: '', error: e.message }; }
  },
  rate: async (payload) => {
    try { return await _request('/api/ai/rate/', { method: 'POST', body: payload }); }
    catch (e) { return null; }
  },
};

const apiMemberships = {
  me: async () => {
    try { return await _request('/api/membership/'); }
    catch (e) { return null; }
  },
  subscribe: async (priceId) => {
    try { return await _request('/api/membership/subscribe/', { method: 'POST', body: { price_id: priceId } }); }
    catch (e) { return null; }
  },
  activePromo: async () => {
    try { return await _request('/api/membership/promos/active/'); }
    catch (e) { return null; }
  },
};

// ============================================================================

const load = (key, fallback) => storageLoad(key, fallback);
const save = (key, val) => storageSave(key, val);
const uid = () => Math.random().toString(36).slice(2,10);

// ============================================================================
// PATH ROUTING — musicconnectz.net/tab?modal=foo (with hash fallback for static hosts)
// ============================================================================
const ALL_TAB_KEYS = new Set(); // populated after TABS is defined
function parseHash() {
  // Prefer real path (e.g. /home), fall back to hash (#/home) for legacy
  let raw = '';
  const path = window.location.pathname.replace(/^\//, '');
  if (path && ALL_TAB_KEYS.has(path.split('?')[0].split('/')[0])) {
    raw = window.location.pathname.slice(1) + window.location.search.replace('?', '&').replace('&', '?');
    if (window.location.search) raw = path + window.location.search;
    else raw = path;
  } else {
    raw = window.location.hash.replace(/^#\/?/, '') || 'home';
  }
  const [tabPath, query] = raw.split('?');
  const params = {};
  if (query) query.split('&').forEach(p => { const [k, v] = p.split('='); params[k] = decodeURIComponent(v || ''); });
  return { tab: tabPath || 'home', modal: params.modal || null, inner: params.inner || null };
}
function setHash({ tab, modal, inner }) {
  const params = [];
  if (modal) params.push(`modal=${modal}`);
  if (inner) params.push(`inner=${inner}`);
  const queryStr = params.length ? `?${params.join('&')}` : '';
  // Try path routing first (requires Vercel rewrite or similar) — fall back to hash
  const usePath = window.history && window.history.pushState && ALL_TAB_KEYS.has(tab);
  if (usePath) {
    try {
      window.history.pushState({}, '', `/${tab}${queryStr}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    } catch (e) { /* fall through */ }
  }
  window.location.hash = `#/${tab}${queryStr}`;
}

// ============================================================================
// PRIMITIVES
// ============================================================================
const Card = ({ children, color = T.purple, className = '', onClick, style = {} }) => (
  <div onClick={onClick}
    className={`rounded-2xl ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
    style={{
      background: 'rgba(10,1,24,0.7)', backdropFilter: 'blur(8px)',
      border: `1px solid ${color}33`, boxShadow: `0 4px 16px rgba(0,0,0,0.4), inset 0 0 24px ${color}08`,
      ...style,
    }}>{children}</div>
);

const Btn = ({ children, onClick, kind = 'primary', className = '', disabled, type = 'button' }) => {
  const styles = {
    primary: { background: `linear-gradient(135deg, ${T.purple}, ${T.purpleDark})`, color: '#fff', boxShadow: `0 4px 12px ${T.purple}40` },
    ghost: { background: T.surface, color: T.textSec, border: `1px solid ${T.borderSoft}` },
    cyan: { background: T.cyan, color: '#000', fontWeight: 700, boxShadow: `0 0 12px ${T.cyan}55` },
    danger: { background: 'transparent', color: T.error, border: `1px solid ${T.error}88` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`px-3 py-2 rounded-lg font-ui text-xs tracking-wider transition-all active:scale-95 disabled:opacity-40 ${className}`}
      style={{ fontWeight: 600, ...styles[kind] }}
    >{children}</button>
  );
};

const Pill = ({ children, color }) => (
  <span className="font-ui text-[9px] tracking-widest px-2 py-0.5 rounded-full"
    style={{ border: `1px solid ${color}`, color, background: `${color}15` }}>{children}</span>
);

// ============================================================================
// COREY VOICE INFO MODAL — 🎙️ℹ️
// ============================================================================
const CoreyInfoModal = ({ tabKey, onClose, casualMode }) => {
  const t = TABS[tabKey];
  if (!t) return null;
  // light AAVE substitution layer when casualMode is on (safe vocab only)
  const swap = (s) => casualMode ? s
    .replace(/\babout\b/g, 'bout')
    .replace(/\byes\b/g, 'ite')
    .replace(/\bI understand\b/g, 'I got you')
    .replace(/\bthanks\b/g, 'good looks')
    .replace(/\bfriend\b/g, 'fam')
    : s;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${T.bgMid}, ${T.bgDeep})`,
          border: `1px solid ${T.borderStrong}`,
          boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 40px ${t.color}22`,
        }}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎙️</span>
              <span className="text-xs font-ui tracking-widest opacity-60" style={{ color: T.textSec }}>COREY VOICE · INFO</span>
            </div>
            <button onClick={onClose} className="p-1 rounded-full" style={{ color: T.textMuted }}><X size={18} /></button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-3xl">{t.emoji}</span>
            <h2 className="font-display text-xl" style={{ color: t.color, textShadow: `0 0 12px ${t.color}66` }}>{t.label}</h2>
          </div>
          <div className="font-ui text-xs uppercase tracking-widest opacity-60 mb-1" style={{ color: t.color }}>// Purpose</div>
          <div className="font-ui text-sm mb-4 leading-relaxed" style={{ color: T.white }}>{swap(t.purpose)}</div>
          <div className="font-ui text-xs uppercase tracking-widest opacity-60 mb-1" style={{ color: t.color }}>// Real Talk 🎙️</div>
          <div className="font-ui text-sm mb-4 leading-relaxed" style={{ color: T.textSec }}>{swap(t.voice)}</div>
          <div className="font-ui text-xs uppercase tracking-widest opacity-60 mb-1" style={{ color: t.color }}>// How to use ✌🏽</div>
          <div className="font-ui text-sm leading-relaxed" style={{ color: T.textSec }}>{swap(t.howto)}</div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-APP MODAL — Corey voice description of any +sub-app
// ============================================================================
// ============================================================================
// SUB-APP INNER TABS — for sub-apps that have their own tab maps (SingZ/RapZ/BodieZ)
// Each inner tab opens a detail "coming soon · vote priority" view.
// Add functional implementations one-by-one in future prompts.
// ============================================================================
const SUB_APP_INNER = {
  singz: [
    { key: 'pitch',     emoji: '🎯', label: 'Pitch',      desc: 'Real-time pitch detection. See if you\'re sharp or flat as you sing.' },
    { key: 'range',     emoji: '📏', label: 'Range',      desc: 'Tracks your vocal range over time. Find your sweet spot, push the edges safely.' },
    { key: 'warmup',    emoji: '🔥', label: 'WarmupZ',    desc: 'Daily vocal warmups. 5-15 min routines from lip trills to scales to runs.' },
    { key: 'vibrato',   emoji: '〰️', label: 'Vibrato',    desc: 'Vibrato trainer. Visual feedback on speed + width. Build the natural waver.' },
    { key: 'breath',    emoji: '💨', label: 'Breath',     desc: 'Breath control exercises. Long-tone drills + diaphragm work.' },
    { key: 'falsetto',  emoji: '🪶', label: 'Falsetto',   desc: 'Head voice + falsetto trainer. Smooth the break, find the flip.' },
    { key: 'belting',   emoji: '📢', label: 'Belting',    desc: 'Belt technique. Safe pressure, mixed voice, sustained high notes.' },
    { key: 'harmony',   emoji: '🎼', label: 'Harmony',    desc: 'Harmony builder. Sing against an auto-generated harmony line. Build the ear.' },
    { key: 'riff',      emoji: '🌊', label: 'RiffZ',      desc: 'Riffs + runs library. Slow them down, loop the hard parts, sing along.' },
    { key: 'tone',      emoji: '🎨', label: 'Tone',       desc: 'Vocal tone analysis. Bright, dark, warm, nasal — see your color and reshape it.' },
    { key: 'diction',   emoji: '👄', label: 'Diction',    desc: 'Diction drills. Tongue twisters, vowel shapes, consonant clarity.' },
    { key: 'micz',      emoji: '🎤', label: 'MicZ',       desc: 'Mic technique. Distance, plosives, proximity effect — drilled into your hands.' },
    { key: 'recordz',   emoji: '⏺️', label: 'RecordZ',    desc: 'Take recorder. Quick captures, A/B compare, mark best takes for the comp.' },
    { key: 'karaoke',   emoji: '🎙️', label: 'Karaoke',    desc: 'Sing along to your library. Backing track + lyrics + record your version.' },
    { key: 'lyricz',    emoji: '📝', label: 'LyricZ',     desc: 'Lyric generator + holder. Hold the doc as you sing. Auto-scroll to bpm.' },
    { key: 'battle',    emoji: '🪖', label: 'Battle',     desc: 'Vocal battles. Pick a melody, sing it your way, get rated. Winner takes the pot.' },
    { key: 'coach',     emoji: '👩‍🏫', label: 'Coach',     desc: 'AI vocal coach (Corey-trained). Diagnoses what you\'re doing wrong + drills.' },
  ],
  rapz: [
    { key: 'rhymez',     emoji: '🎯', label: 'RhymeZ',      desc: 'Rhyme finder. Perfect, near, slant, multi. Filter by syllable count + meter.' },
    { key: 'flow',       emoji: '🌊', label: 'Flow',        desc: 'Flow analyzer. Drop a verse, see your cadence map, find the dead spots.' },
    { key: 'cadence',    emoji: '🥁', label: 'Cadence',     desc: 'Cadence builder. Lock a pattern, write to it. Practice different pockets.' },
    { key: 'bars',       emoji: '📏', label: 'Bars',        desc: 'Bar counter + structure tool. 8s, 16s, 32s. Mark hooks, bridges, breakdowns.' },
    { key: 'punchlinez', emoji: '👊', label: 'PunchlineZ',  desc: 'Punchline generator. Setup + payoff. Reverse-engineer your own from greats.' },
    { key: 'wordplay',   emoji: '🎲', label: 'WordPlay',    desc: 'Homophones, double meanings, entendre stacker. The technician\'s tools.' },
    { key: 'internal',   emoji: '🔄', label: 'Internal',    desc: 'Internal rhyme analyzer. Highlights internals, suggests denser ones.' },
    { key: 'assonance',  emoji: '🔁', label: 'Assonance',   desc: 'Vowel pattern matcher. The Eminem stack — chain assonance across bars.' },
    { key: 'beatz',      emoji: '🥁', label: 'BeatZ',       desc: 'Beat browser. Filter by BPM, key, vibe. License or use type-beats.' },
    { key: 'acapella',   emoji: '🎤', label: 'Acapella',    desc: 'Acapella mode. Record your rap dry, isolate it, drop on any beat later.' },
    { key: 'freestyle',  emoji: '🔥', label: 'Freestyle',   desc: 'Freestyle prompts. Random word, random beat, 30-second timer. Go.' },
    { key: 'cypher',     emoji: '🔁', label: 'Cypher',      desc: 'Live cypher rooms. 4-8 rappers, 16 bars each, community votes the W.' },
    { key: 'battle',     emoji: '🪖', label: 'Battle',      desc: '1v1 rap battles. 3 rounds, judges score. Real money pots or SpinaZ.' },
    { key: 'topicz',     emoji: '💭', label: 'TopicZ',      desc: 'Topic generator. Stuck? Roll the dice for a theme + constraint to write to.' },
    { key: 'disstrack',  emoji: '⚔️', label: 'DissTrack',   desc: 'Diss track builder. Structure, escalation curve, history of greats to study.' },
    { key: 'story',      emoji: '📖', label: 'Story',       desc: 'Narrative builder. Setup-conflict-resolution mapping. Like Storytelling rap.' },
    { key: 'hookz',      emoji: '🪝', label: 'HookZ',       desc: 'Hook generator + library. The 4-bar earworm engine.' },
    { key: 'bridgez',    emoji: '🌉', label: 'BridgeZ',     desc: 'Bridge builder. The departure section. Key changes, perspective shifts.' },
    { key: 'outroz',     emoji: '🎬', label: 'OutroZ',      desc: 'Outro builder. How you land the plane. Fade, hard stop, hook callback.' },
    { key: 'adlibz',     emoji: '💬', label: 'AdlibZ',      desc: 'Adlib library + recorder. Yeahs, skrrts, hahs. Layer them in.' },
    { key: 'doublez',    emoji: '⏩', label: 'DoubleZ',     desc: 'Doubling tool. Auto-stack your vocal, slight detune, the wall effect.' },
    { key: 'tripletz',   emoji: '3️⃣', label: 'TripletZ',    desc: 'Triplet flow builder. Migos-style. Practice the timing.' },
    { key: 'doubletime', emoji: '⏱️', label: 'DoubleTime',  desc: 'Double-time trainer. Half-speed → full → 1.5x. Build the breath.' },
    { key: 'sixteenz',   emoji: '1️⃣6️⃣', label: 'SixteenZ',  desc: '16-bar templates. The standard verse. Multiple structural patterns.' },
    { key: 'eightz',     emoji: '8️⃣', label: 'EightZ',     desc: '8-bar templates. Tight, punchy, feature-ready.' },
    { key: 'mumble',     emoji: '🤐', label: 'Mumble',      desc: 'Mumble flow. Melody-first rapping. Practice slurring intentionally.' },
    { key: 'consciousz', emoji: '🧠', label: 'ConsciousZ',  desc: 'Conscious themes. Social commentary, message-driven verses.' },
    { key: 'trapz',      emoji: '💎', label: 'TrapZ',       desc: 'Trap-specific tools. 808 patterns, hi-hat triplets, double-time flow.' },
    { key: 'drillz',     emoji: '🔫', label: 'DrillZ',      desc: 'Drill-specific tools. Sliding 808s, dark melodies, Brooklyn vs Chicago vs UK.' },
    { key: 'boombap',    emoji: '🥊', label: 'BoomBap',     desc: 'Classic hip-hop tools. Sample chops, dusty drums, mid-tempo pocket.' },
    { key: 'cloud',      emoji: '☁️', label: 'Cloud',       desc: 'Cloud rap. Ambient pads, slow tempos, dreamy delivery. Yung Lean territory.' },
    { key: 'ghostwriter',emoji: '👻', label: 'Ghostwriter', desc: 'AI ghostwriter. Co-write with Corey. Style-match a reference artist.' },
  ],
  bodiez: [
    { key: 'routinez',  emoji: '📋', label: 'RoutineZ',    desc: 'Workout routines. Performer-specific: stamina, posture, breath, presence.' },
    { key: 'sessionz',  emoji: '💪', label: 'SessionZ',    desc: 'Active session tracker. Log sets/reps/weight live during workouts.' },
    { key: 'bodymap',   emoji: '🗺️', label: 'BodyMap',     desc: 'Visual body map. Tap a muscle, see what hits it + your training history.' },
    { key: 'coach',     emoji: '👨‍🏫', label: 'Coach',      desc: 'AI fitness coach. Adapts to your goals, injuries, schedule, equipment.' },
    { key: 'cardio',    emoji: '❤️', label: 'Cardio',      desc: 'Cardio tracking. Runs, cycles, jump rope. Heart rate zones + recovery.' },
    { key: 'strength',  emoji: '🏋️', label: 'Strength',    desc: 'Strength training. Progressive overload, 1RM calc, plate math.' },
    { key: 'flexibility',emoji:'🤸', label: 'Flexibility', desc: 'Mobility work. Stretches, yoga flows, range-of-motion tests over time.' },
    { key: 'stamina',   emoji: '🏃', label: 'Stamina',     desc: 'Endurance training. The thing that lets you do a 90-min set without dying.' },
    { key: 'core',      emoji: '🎯', label: 'Core',        desc: 'Core training. Essential for breath support + stage presence.' },
    { key: 'recovery',  emoji: '😴', label: 'Recovery',    desc: 'Rest tracking. HRV, sleep score, soreness map. When to push, when to chill.' },
    { key: 'nutrition', emoji: '🥗', label: 'Nutrition',   desc: 'Meal logs + macro tracking. Performer-specific timing (pre-show, post-show).' },
    { key: 'hydration', emoji: '💧', label: 'Hydration',   desc: 'Water tracking. Singers/rappers — your voice lives on hydration.' },
    { key: 'sleep',     emoji: '🌙', label: 'Sleep',       desc: 'Sleep tracking. Tour life = sleep destruction. Defend it.' },
    { key: 'weight',    emoji: '⚖️', label: 'Weight',      desc: 'Weight tracking. Trend lines, not daily noise. Body fat estimation.' },
    { key: 'measure',   emoji: '📐', label: 'Measure',     desc: 'Body measurements. Chest, arms, waist, hips. Track changes monthly.' },
    { key: 'progress',  emoji: '📈', label: 'Progress',    desc: 'Visual progress. Photo timeline + before/after comparisons.' },
    { key: 'battle',    emoji: '🪖', label: 'Battle',      desc: 'Fitness battles. Pushup contests, plank-offs, run challenges with other creators.' },
  ],
};

/** SubAppInnerGrid: renders the tile grid for sub-apps with inner tabs (SingZ/RapZ/BodieZ). */
const SubAppInnerGrid = ({ items, color, onPick }) => (
  <div className="grid grid-cols-3 gap-2 mt-3">
    {items.map(it => (
      <button key={it.key} onClick={() => onPick(it)}
        className="p-3 rounded-xl text-left flex flex-col items-center gap-1 transition-transform active:scale-95"
        style={{
          background: `${color}11`,
          border: `1px solid ${color}33`,
          minHeight: 78,
        }}>
        <div className="text-xl leading-none">{it.emoji}</div>
        <div className="font-ui text-[10px] tracking-wider text-center leading-tight" style={{ color: T.white }}>
          {it.label}
        </div>
      </button>
    ))}
  </div>
);

/** SubAppInnerDetail: detail view when user taps an inner-tab tile. "Coming soon · vote priority". */
const SubAppInnerDetail = ({ item, color, onBack, onVote }) => (
  <div>
    <button onClick={onBack} className="flex items-center gap-1 font-ui text-xs tracking-widest opacity-70 mb-3"
      style={{ color }}><ArrowLeft size={14} /> back to grid</button>
    <div className="flex items-center justify-center py-5 mb-3" style={{
      background: `radial-gradient(circle, ${color}22, transparent 70%)`, borderRadius: 18,
    }}>
      <div className="text-5xl">{item.emoji}</div>
    </div>
    <h3 className="font-display text-lg mb-2" style={{ color, textShadow: `0 0 10px ${color}66` }}>{item.label}</h3>
    <div className="font-ui text-sm leading-relaxed mb-4" style={{ color: T.textSec }}>{item.desc}</div>
    <div className="p-3 rounded-xl mb-3" style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
      <div className="font-ui text-[10px] tracking-widest uppercase opacity-60 mb-1" style={{ color }}>// status</div>
      <div className="font-ui text-xs" style={{ color: T.textSec }}>
        In development. Vote it up if this is one of the first tools you want functional.
      </div>
    </div>
    <button onClick={() => onVote(item.key)}
      className="w-full py-2.5 rounded-lg font-ui text-xs tracking-widest font-bold"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)`, color: '#000' }}>
      🚀 VOTE PRIORITY
    </button>
  </div>
);

const SubAppModal = ({ tabKey, subKey, onClose }) => {
  const t = TABS[tabKey]; const s = t?.subs?.[subKey];
  const [innerPick, setInnerPick] = useState(null);
  if (!s) return null;
  const Icon = s.icon;
  const inner = SUB_APP_INNER[subKey];   // 17/32/17-tab map for SingZ/RapZ/BodieZ

  const handleVote = async (innerKey) => {
    const featureKey = `${subKey}.${innerKey}`;
    // Optimistic localStorage update for immediate UX
    try {
      const stored = JSON.parse(localStorage.getItem('mcz:votes') || '{}');
      stored[featureKey] = (stored[featureKey] || 0) + 1;
      localStorage.setItem('mcz:votes', JSON.stringify(stored));
    } catch {}
    // Hit backend (fire-and-forget — don't block UX on network)
    try {
      const token = (() => { try { return localStorage.getItem('mcz:token'); } catch { return ''; } })();
      fetch('/api/votes/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ feature_key: featureKey, source: 'subapp_modal' }),
      }).catch(() => { /* silent — vote saved locally */ });
    } catch {}
    setInnerPick(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{
          background: `linear-gradient(180deg, ${T.bgMid}, ${T.bgDeep})`,
          border: `1px solid ${t.color}55`,
          boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 40px ${t.color}33`,
        }}>
        <div className="p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={onClose} className="flex items-center gap-1 font-ui text-xs tracking-widest opacity-70"
              style={{ color: t.color }}><ArrowLeft size={14} /> back</button>
            <Pill color={inner ? T.cyan : T.purple}>{inner ? `${inner.length} TOOLS` : 'STUB'}</Pill>
          </div>

          {innerPick ? (
            <SubAppInnerDetail item={innerPick} color={t.color}
              onBack={() => setInnerPick(null)} onVote={handleVote} />
          ) : (
            <>
              <div className="flex items-center justify-center py-6" style={{
                background: `radial-gradient(circle, ${t.color}22, transparent 70%)`, borderRadius: 20,
              }}>
                <TabIcon tabKey={tabKey} subKey={subKey} fallback={Icon} size={64} color={t.color}
                  style={{ filter: `drop-shadow(0 0 16px ${t.color})` }} strokeWidth={1.3} />
              </div>
              <div className="flex items-center gap-2 mt-4 mb-2">
                <span className="text-2xl">{s.emoji}</span>
                <h2 className="font-display text-xl" style={{ color: t.color, textShadow: `0 0 10px ${t.color}66` }}>{s.label}</h2>
              </div>
              <div className="font-ui text-sm leading-relaxed" style={{ color: T.textSec }}>{s.desc}</div>

              {inner ? (
                <>
                  <div className="font-ui text-[10px] tracking-widest uppercase opacity-60 mt-5 mb-1" style={{ color: t.color }}>
                    // {inner.length} tools — tap to learn + vote priority
                  </div>
                  <SubAppInnerGrid items={inner} color={t.color} onPick={setInnerPick} />
                </>
              ) : (
                <div className="mt-5 p-3 rounded-xl" style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
                  <div className="font-ui text-[10px] tracking-widest uppercase opacity-60 mb-1" style={{ color: t.color }}>// next ship</div>
                  <div className="font-ui text-xs" style={{ color: T.textSec }}>
                    Coming in the next 1-4 prompts — ETA depends on which path you pick after this one.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TASK CARD + PANEL (Lilith)
// ============================================================================
const TaskCard = ({ task, bucket, color, onComplete, onTrash, onRestore, onPurge, onMove }) => {
  const [expanded, setExpanded] = useState(false);
  const isTrash = bucket === 'trash'; const done = !!task.completedAt;
  return (
    <div className="p-3 mb-2 rounded-xl"
      style={{
        background: 'rgba(168,85,247,0.06)', border: `1px solid ${color}44`,
        boxShadow: `0 0 6px ${color}22`, opacity: done ? 0.55 : 1,
      }} onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start gap-2">
        {!isTrash && (
          <button onClick={(e) => { e.stopPropagation(); onComplete(task.id); }}
            className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ border: `1.5px solid ${color}`, boxShadow: done ? `0 0 10px ${color}` : 'none', background: done ? color : 'transparent' }}>
            {done && <Check size={14} color="#000" strokeWidth={3} />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-ui text-base leading-tight"
            style={{ color: T.white, textDecoration: done ? 'line-through' : 'none', textDecorationColor: color }}>{task.title}</div>
          {task.notes && expanded && <div className="font-ui text-sm mt-1.5 opacity-70" style={{ color: T.textSec }}>{task.notes}</div>}
          {expanded && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {!isTrash && ['today','upcoming','anytime','someday'].filter(b => b !== bucket).map(b => (
                <button key={b} onClick={(e) => { e.stopPropagation(); onMove(task.id, b); }}
                  className="px-2 py-0.5 rounded-md font-ui text-[10px]"
                  style={{ border: `1px solid ${LILITH_DEF[b].color}88`, color: LILITH_DEF[b].color, background: 'rgba(0,0,0,0.4)' }}
                >→ {LILITH_DEF[b].label}</button>
              ))}
              {!isTrash ? (
                <button onClick={(e) => { e.stopPropagation(); onTrash(task.id); }}
                  className="px-2 py-0.5 rounded-md font-ui text-[10px] flex items-center gap-1"
                  style={{ border: `1px solid ${T.error}88`, color: T.error, background: 'rgba(0,0,0,0.4)' }}
                ><Trash2 size={10} /> trash</button>
              ) : (
                <>
                  <button onClick={(e) => { e.stopPropagation(); onRestore(task.id); }}
                    className="px-2 py-0.5 rounded-md font-ui text-[10px] flex items-center gap-1"
                    style={{ border: `1px solid ${T.success}88`, color: T.success, background: 'rgba(0,0,0,0.4)' }}
                  ><RotateCcw size={10} /> restore</button>
                  <button onClick={(e) => { e.stopPropagation(); onPurge(task.id); }}
                    className="px-2 py-0.5 rounded-md font-ui text-[10px] flex items-center gap-1"
                    style={{ border: `1px solid ${T.error}`, color: T.error, background: 'rgba(0,0,0,0.4)' }}
                  ><X size={10} /> purge</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COREY GPT — powers OCC. Multi-domain. Memory-aware. Cost-transparent.
// ============================================================================
const OCC_KEY = 'mcz:occ:history:v1';

// Domain-specific system prompts — like RAG-lite without a vector DB.
// Each domain seeds Corey GPT with curriculum-level context.
const COREY_DOMAINS = {
  build: {
    label: '🏗️ Build Music ConnectZ',
    color: '#22d3ee',
    sys: `You are Corey GPT in BUILD mode — the in-app code assistant for Music ConnectZ, a music-career platform built in React. Stack: React + Tailwind, palette purple #a855f7 / cyan #22d3ee / pink #ec4899, Space Grotesk UI font, Audiowide display font, persistent storage via window.storage, hash routing #/tab?modal=foo. Code in \`\`\`jsx blocks. TABS registry pattern: { emoji, label, icon, color, purpose, voice, howto, subs }. Write in Corey voice: conversational, em dashes for asides, contractions, real talk, light cursing OK.`,
  },
  code: {
    label: '💻 Code (general)',
    color: '#84cc16',
    sys: `You are Corey GPT in CODE mode — like a CS professor crossed with a senior engineer who actually ships. You explain code patterns, data structures, system design, algorithm tradeoffs, and language-specific idioms. Pull from CS curriculum: CS50, MIT 6.001/6.006, Berkeley CS61A, plus practical engineering blogs. Always show working code in fenced blocks. Corey voice: explain like you're talking to a smart friend who's catching up, em dashes for asides.`,
  },
  music: {
    label: '🎵 Music Theory',
    color: '#ec4899',
    sys: `You are Corey GPT in MUSIC mode — like a Berklee/Juilliard professor who also runs a working studio. Pull from: music theory (Schoenberg, Persichetti), production (Mixerman, Bobby Owsinski), genre history (hip-hop, jazz, classical, electronic). Cover composition, harmony, voice leading, mixing, mastering, production workflow, genre conventions, recording techniques. Corey voice: ground theory in real songs and gear. Em dashes for asides.`,
  },
  art: {
    label: '🎨 Visual Art',
    color: '#a855f7',
    sys: `You are Corey GPT in ART mode — like a RISD/Parsons professor who's worked in branding, illustration, and game art. Pull from: color theory, composition, typography, art history (Renaissance through digital), graphic design (Bauhaus, Swiss, modern), UI/UX. Cover technique, software (Photoshop, Procreate, Figma, Blender), critique, and creative process. Corey voice: practical, anchored in real examples, em dashes for asides.`,
  },
  writing: {
    label: '✍️ Writing',
    color: '#f97316',
    sys: `You are Corey GPT in WRITING mode — like an MFA prof crossed with a working ghostwriter. Pull from: rhetoric (Aristotle, Burke), creative writing (Saunders, Le Guin), journalism (AP/Chicago style), copywriting (Ogilvy, Sugarman), songwriting (Pat Pattison). Cover structure, voice, line edits, hooks, narrative arc, lyric craft, persuasion. Corey voice: show don't tell, em dashes for asides, examples over rules.`,
  },
};

const OCC_PRESETS = [
  { label: '🏗️ Build a tab', domain: 'build', tpl: 'Build a new top-level tab for Music ConnectZ called [NAME]. Purpose: [PURPOSE]. Generate TABS entry with Corey voice purpose/voice/howto and sub-app cards.' },
  { label: '➕ Add feature', domain: 'build', tpl: 'Add this feature to the [TAB] tab in Music ConnectZ: [FEATURE]. React component + any storage schema changes.' },
  { label: '🎵 Explain theory', domain: 'music', tpl: 'Explain [CONCEPT, e.g. modal interchange, sidechain compression, voice leading] like I\'m a working producer who knows the basics but wants the next level.' },
  { label: '✍️ Write hook', domain: 'writing', tpl: 'Write a 4-line hook for a [GENRE] song about [TOPIC]. Make the rhyme scheme interesting and the imagery specific.' },
  { label: '🎨 Color palette', domain: 'art', tpl: 'Suggest a color palette for [PROJECT/MOOD]. Give hex codes, talk about why each color works, and one alternate palette for contrast.' },
];

// Token-cost estimate. Sonnet 4 ≈ $3/M input, $15/M output. Average OCC query ≈ 800 in + 600 out ≈ $0.012.
const COST_PER_QUERY_USD = 0.012;

const OCCModal = ({ onClose, membership }) => {
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [err, setErr] = useState(null);
  const [domain, setDomain] = useState('code');  // Default to code mode
  const [fileContext, setFileContext] = useState('');
  const [showContext, setShowContext] = useState(false);

  useEffect(() => { load(OCC_KEY, []).then(setHistory); }, []);

  /** Call backend Corey endpoint (NOT Anthropic directly — that fails in browser).
   *  Backend at /api/ai/corey/ handles auth, throttling, cost tracking, API key. */
  const callClaude = async (userPrompt) => {
    setBusy(true); setErr(null); setOutput('');
    try {
      const token = (() => { try { return localStorage.getItem('mcz:token'); } catch { return ''; } })();
      if (!token) throw new Error('not logged in — sign in first');

      // Build context-rich prompt for coding mode
      let fullMessage = userPrompt;
      if (domain === 'code' && fileContext.trim()) {
        fullMessage = `CURRENT FILE/CONTEXT:\n\`\`\`\n${fileContext.trim().slice(0, 8000)}\n\`\`\`\n\nTASK: ${userPrompt}\n\nReturn updated code in fenced code blocks. Be precise about what to change.`;
      } else if (domain === 'code') {
        fullMessage = `${userPrompt}\n\nReturn working code in fenced code blocks (\`\`\`language ... \`\`\`). Include brief explanation. Default to React + Django when ambiguous.`;
      }

      // Memory: feed last 3 same-domain interactions back
      const memory = history.filter(h => h.domain === domain).slice(0, 3);
      const apiHistory = [];
      memory.reverse().forEach(m => {
        apiHistory.push({ role: 'user', content: m.prompt });
        apiHistory.push({ role: 'assistant', content: (m.output || '').slice(0, 800) });
      });

      const res = await fetch('/api/ai/corey/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ domain, message: fullMessage, history: apiHistory }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`backend ${res.status}: ${txt.slice(0, 120)}`);
      }
      const data = await res.json();
      const text = data.reply || data.error || '';
      if (!text) throw new Error('empty reply from backend');

      setOutput(text);
      const next = [{ id: uid(), prompt: userPrompt, output: text, at: Date.now(), domain }, ...history].slice(0, 20);
      setHistory(next); save(OCC_KEY, next);
    } catch (e) {
      setErr(e.message || 'Corey GPT tripped — try again.');
    } finally { setBusy(false); }
  };

  const generate = () => { if (prompt.trim()) callClaude(prompt.trim()); };
  const copyOutput = () => navigator.clipboard.writeText(output);

  const copyToCodespaces = () => {
    // One-shot paste bundle: file context + prompt + output. Drop into Claude Code or Codespaces.
    const wrap = [
      domain === 'code' ? '## CODING TASK FROM OCC' : '## OCC OUTPUT',
      '',
      fileContext.trim() ? `### Current file context:\n\`\`\`\n${fileContext.trim()}\n\`\`\`\n` : '',
      `### Prompt:\n${prompt}`,
      '',
      `### Claude's output:\n${output}`,
      '',
      '### Next step: review code blocks, apply via Codespaces, commit + push.',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(wrap);
  };

  /** Extract fenced code blocks from output for individual handling. */
  const codeBlocks = (() => {
    if (!output) return [];
    const blocks = [];
    const re = /```(\w*)\n([\s\S]*?)```/g;
    let m;
    while ((m = re.exec(output)) !== null) {
      blocks.push({ lang: m[1] || 'text', code: m[2].trim() });
    }
    return blocks;
  })();

  /** Strip code blocks from output to get just the explanation. */
  const explanation = output ? output.replace(/```[\s\S]*?```/g, '').trim() : '';

  const dom = COREY_DOMAINS[domain];
  const memCount = history.filter(h => h.domain === domain).slice(0, 3).length;
  const totalSpent = (history.length * COST_PER_QUERY_USD).toFixed(2);
  const presets = OCC_PRESETS.filter(p => p.domain === domain || domain === 'build');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md h-[92vh] rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: `linear-gradient(180deg, ${T.bgMid}, ${T.bgDeep})`,
          border: `1px solid ${dom.color}55`,
          boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 40px ${dom.color}33`,
        }}>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b" style={{ borderColor: T.borderSoft }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">👁️</span>
            <h2 className="font-display text-lg" style={{ color: dom.color, textShadow: `0 0 10px ${dom.color}` }}>OCC</h2>
            <span className="font-ui text-[9px] tracking-widest opacity-50" style={{ color: T.textSec }}>· Corey GPT</span>
            <Pill color={T.success}>LIVE</Pill>
          </div>
          <button onClick={onClose} className="p-1 rounded-full" style={{ color: T.textMuted }}><X size={20} /></button>
        </div>

        <div className="px-3 pt-2 pb-1.5 border-b" style={{ borderColor: T.borderSoft }}>
          <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1.5" style={{ color: dom.color }}>// DOMAIN — picks the curriculum</div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {Object.entries(COREY_DOMAINS).map(([k, d]) => (
              <button key={k} onClick={() => setDomain(k)}
                className="shrink-0 px-2 py-1 rounded-md font-ui text-[10px] whitespace-nowrap"
                style={{
                  background: domain === k ? d.color : 'rgba(0,0,0,0.3)',
                  color: domain === k ? '#000' : d.color,
                  border: `1px solid ${d.color}${domain === k ? 'ff' : '55'}`,
                  fontWeight: domain === k ? 700 : 500,
                }}>{d.label}</button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="font-ui text-[9px] opacity-50" style={{ color: T.textSec }}>
              🧠 memory: {memCount} prior turns · ~${COST_PER_QUERY_USD.toFixed(3)}/query
            </span>
            <span className="font-ui text-[9px] opacity-50" style={{ color: T.textSec }}>
              session: ~${totalSpent}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {/* CODE MODE: file context input */}
          {domain === 'code' && (
            <div className="mb-3">
              <button onClick={() => setShowContext(s => !s)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-ui text-[10px] tracking-widest"
                style={{ background: T.surface, border: `1px solid ${T.borderSoft}`, color: dom.color }}>
                <span>📎 FILE CONTEXT {fileContext.trim() && `(${fileContext.length} chars)`}</span>
                <span>{showContext ? '▾' : '▸'}</span>
              </button>
              {showContext && (
                <div className="mt-2">
                  <textarea value={fileContext} onChange={e => setFileContext(e.target.value)}
                    placeholder="Paste the file/component you're working on. Claude reads this before answering."
                    rows={5}
                    className="w-full font-mono text-[11px] p-2 rounded-lg outline-none resize-none"
                    style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${T.borderSoft}`, color: T.textSec }} />
                  <div className="flex items-center justify-between font-ui text-[9px] opacity-50 mt-0.5">
                    <span style={{ color: T.textSec }}>up to ~8,000 chars sent · trimmed if longer</span>
                    <button onClick={() => setFileContext('')} style={{ color: T.pink }}>clear</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {presets.length > 0 && (
            <>
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1.5" style={{ color: dom.color }}>// PRESETS</div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {presets.map((p, i) => (
                  <button key={i} onClick={() => setPrompt(p.tpl)}
                    className="px-2 py-1 rounded-md font-ui text-[10px]"
                    style={{ border: `1px solid ${dom.color}55`, color: dom.color, background: 'rgba(0,0,0,0.3)' }}
                  >{p.label}</button>
                ))}
              </div>
            </>
          )}
          <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1.5" style={{ color: dom.color }}>// PROMPT 🎙️</div>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder={domain === 'build' ? 'e.g. Build CalendarZ tab for show dates + release dates.' :
                          domain === 'code' ? 'e.g. Refactor this textarea to also accept drag-and-drop file uploads.' :
                          domain === 'music' ? 'e.g. Explain modal interchange like I\'m a working producer.' :
                          domain === 'writing' ? 'e.g. Write 4 bars of trap about studio loneliness.' :
                          domain === 'art' ? 'e.g. Palette for a moody nighttime album cover.' :
                          'e.g. Explain dynamic programming with a music-related example.'}
            rows={4} className="w-full font-ui text-sm p-2.5 rounded-lg outline-none resize-none mb-1"
            style={{ background: T.surface, border: `1px solid ${T.borderSoft}`, color: T.white }} />
          <CharLimitBar text={prompt} membership={membership}
            onUpgrade={() => { onClose(); window.history.pushState({}, '', '/money'); window.dispatchEvent(new PopStateEvent('popstate')); }} />
          <div className="flex gap-2 mt-2 mb-3">
            <Btn onClick={generate} kind="cyan" className="flex-1 !py-2.5" disabled={busy || !prompt.trim()}>
              {busy ? '⚡ Corey thinking…' : '⚡ ASK COREY GPT'}
            </Btn>
            <Btn onClick={() => { setPrompt(''); setOutput(''); setErr(null); setFileContext(''); }} kind="ghost">clear</Btn>
          </div>
          {err && (
            <div className="p-2.5 rounded-lg mb-3 font-ui text-xs"
              style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`, color: '#fca5a5' }}>
              ⚠️ {err}
            </div>
          )}

          {/* CODE MODE OUTPUT: separated code blocks + explanation */}
          {output && domain === 'code' && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-ui text-[10px] tracking-widest opacity-60" style={{ color: dom.color }}>
                  // CODE OUTPUT · {codeBlocks.length} block{codeBlocks.length === 1 ? '' : 's'}
                </span>
                <button onClick={copyToCodespaces} className="px-2 py-0.5 rounded-md font-ui text-[10px]"
                  style={{ border: `1px solid ${T.purple}55`, color: T.purple, background: 'rgba(0,0,0,0.3)' }}>
                  📨 BUNDLE → CODESPACES
                </button>
              </div>

              {explanation && (
                <div className="p-2.5 rounded-lg mb-2 font-ui text-xs"
                  style={{ background: T.surface, border: `1px solid ${T.borderSoft}`, color: T.textSec }}>
                  {explanation}
                </div>
              )}

              {codeBlocks.map((block, i) => (
                <div key={i} className="mb-2">
                  <div className="flex items-center justify-between px-2 py-1 rounded-t-lg"
                    style={{ background: 'rgba(0,0,0,0.6)', border: `1px solid ${dom.color}55`, borderBottom: 'none' }}>
                    <span className="font-ui text-[9px] tracking-widest opacity-60" style={{ color: dom.color }}>
                      {block.lang} · block #{i + 1}
                    </span>
                    <button onClick={() => navigator.clipboard.writeText(block.code)}
                      className="px-1.5 py-0.5 rounded font-ui text-[9px]"
                      style={{ background: `${dom.color}22`, color: dom.color, border: `1px solid ${dom.color}66` }}>
                      📋 copy block
                    </button>
                  </div>
                  <pre className="p-2.5 overflow-x-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      border: `1px solid ${dom.color}55`,
                      borderTop: 'none',
                      borderBottomLeftRadius: 8,
                      borderBottomRightRadius: 8,
                      color: T.textSec,
                      maxHeight: 280,
                    }}>{block.code}</pre>
                </div>
              ))}

              {codeBlocks.length === 0 && (
                <pre className="p-3 rounded-lg overflow-x-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
                  style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${dom.color}33`, color: T.textSec, maxHeight: 320 }}>
                  {output}
                </pre>
              )}
            </div>
          )}

          {/* NON-CODE OUTPUT: plain text */}
          {output && domain !== 'code' && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-ui text-[10px] tracking-widest opacity-60" style={{ color: dom.color }}>// OUTPUT 🎙️</span>
                <div className="flex gap-1.5">
                  <button onClick={copyOutput} className="px-2 py-0.5 rounded-md font-ui text-[10px]"
                    style={{ border: `1px solid ${dom.color}55`, color: dom.color, background: 'rgba(0,0,0,0.3)' }}>📋 copy</button>
                  <button onClick={copyToCodespaces} className="px-2 py-0.5 rounded-md font-ui text-[10px]"
                    style={{ border: `1px solid ${T.purple}55`, color: T.purple, background: 'rgba(0,0,0,0.3)' }}>📨 → Claude chat</button>
                </div>
              </div>
              <pre className="p-3 rounded-lg overflow-x-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
                style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${dom.color}33`, color: T.textSec, maxHeight: 320 }}>
                {output}
              </pre>
            </div>
          )}

          {history.length > 0 && (
            <div>
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1.5" style={{ color: dom.color }}>// HISTORY · {history.length}</div>
              <div className="space-y-1.5">
                {history.slice(0, 5).map(h => {
                  const hd = COREY_DOMAINS[h.domain] || COREY_DOMAINS.build;
                  return (
                    <button key={h.id} onClick={() => { setPrompt(h.prompt); setOutput(h.output); setDomain(h.domain || 'build'); }}
                      className="w-full p-2 rounded-lg text-left"
                      style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-ui text-[9px]" style={{ color: hd.color }}>{hd.label}</span>
                        <span className="font-ui text-[9px] opacity-50" style={{ color: T.textSec }}>{new Date(h.at).toLocaleString()}</span>
                      </div>
                      <div className="font-ui text-xs truncate" style={{ color: T.white }}>{h.prompt}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="p-2 border-t font-ui text-[9px] opacity-60 text-center" style={{ borderColor: T.borderSoft, color: dom.color }}>
          👁️ Corey GPT · Backend Claude · review code before pushing
        </div>
      </div>
    </div>
  );
};

const LilithModal = ({ tasks, setTasks, onClose }) => {
  const [bucket, setBucket] = useState('today');
  const [draft, setDraft] = useState('');
  const def = LILITH_DEF[bucket];
  const list = tasks.filter(t => t.bucket === bucket).sort((a,b) => (b.createdAt||0)-(a.createdAt||0));
  const counts = {};
  LILITH_TABS.forEach(b => { counts[b] = tasks.filter(t => t.bucket === b && (b === 'trash' || b === 'logbook' || !t.completedAt)).length; });

  const update = (fn) => { const n = fn(tasks); setTasks(n); save(KEYS.tasks, n); };
  const addTask = () => {
    if (!draft.trim()) return;
    update(ts => [{ id: uid(), title: draft.trim(), bucket, createdAt: Date.now(), completedAt: null }, ...ts]);
    setDraft('');
  };
  const onComplete = (id) => update(ts => ts.map(t => t.id === id ? { ...t, completedAt: t.completedAt ? null : Date.now(), bucket: t.completedAt ? t.bucket : 'logbook' } : t));
  const onTrash = (id) => update(ts => ts.map(t => t.id === id ? { ...t, bucket: 'trash', prevBucket: t.bucket } : t));
  const onRestore = (id) => update(ts => ts.map(t => t.id === id ? { ...t, bucket: t.prevBucket || 'inbox' } : t));
  const onPurge = (id) => update(ts => ts.filter(t => t.id !== id));
  const onMove = (id, b) => update(ts => ts.map(t => t.id === id ? { ...t, bucket: b } : t));
  const isTerm = bucket === 'trash' || bucket === 'logbook';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md h-[88vh] rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: `linear-gradient(180deg, ${T.bgMid}, ${T.bgDeep})`,
          border: `1px solid ${T.borderStrong}`,
          boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 40px ${T.purple}33`,
        }}>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b" style={{ borderColor: T.borderSoft }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">💃🏽</span>
            <h2 className="font-display text-lg" style={{ color: T.purple, textShadow: `0 0 10px ${T.purple}` }}>LILITH</h2>
            <span className="font-ui text-[9px] tracking-widest opacity-50" style={{ color: T.textSec }}>productivity</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full" style={{ color: T.textMuted }}><X size={20} /></button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 px-1 pt-1.5">
          {LILITH_TABS.map(b => {
            const d = LILITH_DEF[b]; const Ic = d.icon; const active = bucket === b;
            return (
              <button key={b} onClick={() => setBucket(b)}
                className="flex flex-col items-center py-1.5 rounded-md relative"
                style={{ background: active ? `${d.color}22` : 'transparent', border: `1px solid ${active ? d.color : 'transparent'}`, color: active ? d.color : `${d.color}77` }}>
                <Ic size={13} strokeWidth={active ? 2.2 : 1.7} />
                <span className="font-ui text-[7px] tracking-widest mt-0.5" style={{ fontWeight: active ? 700 : 500 }}>{d.label.slice(0, 4).toUpperCase()}</span>
                {counts[b] > 0 && (
                  <span className="absolute top-0 right-0 min-w-[12px] h-[12px] px-0.5 rounded-full font-ui text-[7px] flex items-center justify-center font-bold"
                    style={{ background: d.color, color: '#000' }}>{counts[b]}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{def.emoji}</span>
            <span className="font-display text-base" style={{ color: def.color, textShadow: `0 0 8px ${def.color}66` }}>{def.label.toUpperCase()}</span>
            <span className="font-ui text-[10px] opacity-50" style={{ color: def.color }}>· {list.length}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {list.length === 0 ? (
            <div className="text-center py-8 opacity-40 font-ui text-sm" style={{ color: def.color }}>
              {isTerm ? `// no items` : `// no ${def.label.toLowerCase()} taskZ yet`}
            </div>
          ) : list.map(t => (
            <TaskCard key={t.id} task={t} bucket={bucket} color={def.color}
              onComplete={onComplete} onTrash={onTrash} onRestore={onRestore} onPurge={onPurge} onMove={onMove} />
          ))}
        </div>
        {!isTerm && (
          <div className="p-3 border-t" style={{ borderColor: T.borderSoft }}>
            <div className="flex items-center gap-2 p-1.5 rounded-xl" style={{ background: T.surface, border: `1px solid ${def.color}55` }}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder={`add to ${def.label.toLowerCase()}…`}
                className="flex-1 bg-transparent outline-none font-ui text-sm px-2"
                style={{ color: T.white, caretColor: def.color }} />
              <button onClick={addTask} disabled={!draft.trim()}
                className="px-3 py-1.5 rounded-lg font-ui text-xs flex items-center gap-1"
                style={{
                  background: draft.trim() ? def.color : 'transparent',
                  color: draft.trim() ? '#000' : `${def.color}66`,
                  border: `1px solid ${def.color}`, fontWeight: 700,
                }}><Plus size={12} strokeWidth={3} /> ADD</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// LOGIN SCREEN
// ============================================================================
// ============================================================================
// OAUTH PROVIDER LOGOS — official brand SVGs (small, no external deps)
// ============================================================================
const OAuthLogos = {
  google: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  apple: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#fff" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  ),
  spotify: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1DB954"/>
      <path fill="#000" d="M17.9 16.2c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1-.4.1-.7-.2-.8-.5-.1-.4.2-.7.5-.8 4-.9 7.5-.5 10.3 1.2.3.2.4.6.2.9zm1.6-3.2c-.3.4-.8.5-1.2.3-2.8-1.7-7.1-2.2-10.5-1.2-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.9-1.2 8.7-.7 11.9 1.3.4.2.5.7.3 1.1zm.1-3.3c-3.4-2-9-2.2-12.2-1.2-.5.1-1-.1-1.2-.6-.1-.5.1-1 .6-1.2 3.7-1.1 9.9-.9 13.8 1.4.4.3.6.9.3 1.3-.2.4-.8.6-1.3.3z"/>
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#1877F2" d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85V15.47H7.08V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.95h-1.51c-1.49 0-1.96.93-1.96 1.88V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z"/>
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#fff" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#fff" d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57v-2c-3.34.72-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.08 1.83 2.81 1.3 3.5.99.1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .31.21.69.83.57A12 12 0 0 0 12 .3"/>
    </svg>
  ),
  discord: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#5865F2" d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#fff" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"/>
      <path fill="#FF0050" d="M21.43 5.69a4.83 4.83 0 0 1-3.77-4.25V1h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V8.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 7.64 19.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" opacity="0.6"/>
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80"/>
          <stop offset="25%" stopColor="#FCAF45"/>
          <stop offset="50%" stopColor="#F77737"/>
          <stop offset="75%" stopColor="#E1306C"/>
          <stop offset="100%" stopColor="#833AB4"/>
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)"/>
      <circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="2"/>
      <circle cx="18" cy="6" r="1.2" fill="#fff"/>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="#fff" strokeWidth="1.8"/>
    </svg>
  ),
  microsoft: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z"/>
      <path fill="#7FBA00" d="M13 1h10v10H13z"/>
      <path fill="#00A4EF" d="M1 13h10v10H1z"/>
      <path fill="#FFB900" d="M13 13h10v10H13z"/>
    </svg>
  ),
};

const OAUTH_PROVIDERS = [
  { id: 'google',    label: 'Google',    logo: OAuthLogos.google,    bg: '#fff',    text: '#000' },
  { id: 'apple',     label: 'Apple',     logo: OAuthLogos.apple,     bg: '#000',    text: '#fff' },
  { id: 'spotify',   label: 'Spotify',   logo: OAuthLogos.spotify,   bg: '#1DB954', text: '#fff' },
  { id: 'facebook',  label: 'Facebook',  logo: OAuthLogos.facebook,  bg: '#1877F2', text: '#fff' },
  { id: 'twitter',   label: 'X',         logo: OAuthLogos.twitter,   bg: '#000',    text: '#fff' },
  { id: 'tiktok',    label: 'TikTok',    logo: OAuthLogos.tiktok,    bg: '#000',    text: '#fff' },
  { id: 'instagram', label: 'Instagram', logo: OAuthLogos.instagram, bg: '#fff',    text: '#000' },
  { id: 'github',    label: 'GitHub',    logo: OAuthLogos.github,    bg: '#24292F', text: '#fff' },
  { id: 'discord',   label: 'Discord',   logo: OAuthLogos.discord,   bg: '#5865F2', text: '#fff' },
  { id: 'microsoft', label: 'Microsoft', logo: OAuthLogos.microsoft, bg: '#fff',    text: '#000' },
];

const LoginScreen = ({ onLogin }) => {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setMsg(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        // Login needs username/email + password
        if (!username.trim() && !email.trim()) {
          setMsg({ type: 'error', text: 'Username or email required.' }); setBusy(false); return;
        }
        if (!pwd) { setMsg({ type: 'error', text: 'Password required.' }); setBusy(false); return; }
        if (isBackendConfigured()) {
          // Backend wired — try real login
          try {
            const data = await apiLogin(username.trim() || email.trim(), pwd);
            onLogin({ email: data.email || email.trim(), username: data.username || username.trim(), via: 'password', access: data.access });
            return;
          } catch (err) {
            // Fall through to demo mode if backend not reachable
            setMsg({ type: 'info', text: 'Backend not reachable — entering demo mode.' });
          }
        }
        setTimeout(() => { onLogin({ email: email.trim() || `${username.trim()}@musicconnectz.net`, username: username.trim(), via: 'email-demo' }); }, 400);
      } else {
        // Register: needs username + email + phone + 2 matching passwords
        if (!username.trim()) { setMsg({ type: 'error', text: 'Username required.' }); setBusy(false); return; }
        if (!email.trim()) { setMsg({ type: 'error', text: 'Email required.' }); setBusy(false); return; }
        if (!phone.trim()) { setMsg({ type: 'error', text: 'Phone required.' }); setBusy(false); return; }
        if (!pwd) { setMsg({ type: 'error', text: 'Password required.' }); setBusy(false); return; }
        if (pwd !== pwdConfirm) { setMsg({ type: 'error', text: 'Passwords don\'t match.' }); setBusy(false); return; }
        if (pwd.length < 8) { setMsg({ type: 'error', text: 'Password must be 8+ characters.' }); setBusy(false); return; }
        if (isBackendConfigured()) {
          try {
            const data = await apiSignup({ username: username.trim(), email: email.trim(), password: pwd, artistName: username.trim() });
            onLogin({ email: data.email || email.trim(), username: data.username || username.trim(), via: 'register', access: data.access });
            return;
          } catch (err) {
            setMsg({ type: 'info', text: 'Backend not reachable — entering demo mode.' });
          }
        }
        setTimeout(() => { onLogin({ email: email.trim(), username: username.trim(), phone: phone.trim(), via: 'register-demo' }); }, 400);
      }
    } finally {
      setTimeout(() => setBusy(false), 500);
    }
  };

  const handleOAuth = (provider) => {
    // OAuth flow: redirect to backend OAuth start endpoint, which redirects to provider,
    // which redirects back to /api/auth/oauth/<provider>/callback with code,
    // backend exchanges code for token + creates/updates user, returns JWT.
    if (isBackendConfigured()) {
      const returnTo = encodeURIComponent(window.location.origin + '/home');
      window.location.href = `/api/auth/oauth/${provider}/start/?return_to=${returnTo}`;
    } else {
      // Demo mode — just sign in with a fake provider identity
      setMsg({ type: 'info', text: `Demo mode — pretending you signed in with ${provider}…` });
      setTimeout(() => onLogin({
        email: `demo@${provider}.local`,
        username: `${provider}_user`,
        via: provider,
      }), 600);
    }
  };

  const guestLogin = () => {
    setBusy(true);
    setMsg({ type: 'info', text: 'Hopping in as guest. Profile will be empty until you fill it out.' });
    setTimeout(() => onLogin({ email: 'guest@musicconnectz.net', via: 'guest' }), 500);
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-5 relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at top, ${T.bgMid} 0%, ${T.bgDeep} 50%, #000 100%)`,
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 15% 25%, ${T.purple}26 0%, transparent 35%), radial-gradient(circle at 85% 75%, ${T.cyan}1a 0%, transparent 35%)`,
        }} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl p-6 my-4"
        style={{
          background: 'rgba(10,1,24,0.85)', backdropFilter: 'blur(20px)',
          border: `1px solid ${T.borderSoft}`, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
        <div className="text-center mb-5">
          <div className="text-4xl mb-2" style={{ filter: `drop-shadow(0 0 12px ${T.purple})` }}>🏡</div>
          <div className="font-ui text-xs tracking-[0.15em] uppercase font-bold"
            style={{ background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            Music ConnectZ
          </div>
        </div>

        <div className="flex p-1 rounded-xl mb-4" style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
          {[['login', t('signIn')],['register', t('register')]].map(([k, label]) => (
            <button key={k} onClick={() => setMode(k)}
              className="flex-1 py-2 rounded-lg font-ui text-xs tracking-wide transition-all"
              style={{
                background: mode === k ? `linear-gradient(135deg, ${T.purple}, ${T.purpleDark})` : 'transparent',
                color: mode === k ? T.white : T.textSec, fontWeight: mode === k ? 700 : 600,
                boxShadow: mode === k ? `0 4px 12px ${T.purple}4D` : 'none',
              }}>{label}</button>
          ))}
        </div>

        {/* OAUTH PROVIDERS — official logos */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {OAUTH_PROVIDERS.map(p => (
            <button key={p.id} onClick={() => handleOAuth(p.id)} disabled={busy}
              title={`Continue with ${p.label}`}
              className="aspect-square rounded-xl flex items-center justify-center transition-transform active:scale-95"
              style={{
                background: p.bg, border: `1px solid ${T.borderSoft}`,
                opacity: busy ? 0.5 : 1,
              }}>
              {p.logo}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px" style={{ background: T.borderSoft }} />
          <span className="font-ui text-[10px] tracking-widest uppercase opacity-60" style={{ color: T.textMuted }}>or {mode === 'login' ? 'sign in' : 'register'} with email</span>
          <div className="flex-1 h-px" style={{ background: T.borderSoft }} />
        </div>

        {msg && (
          <div className="p-2.5 rounded-lg mb-3 font-ui text-xs"
            style={{
              background: msg.type === 'error' ? 'rgba(239,68,68,0.1)' : msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
              border: `1px solid ${msg.type === 'error' ? 'rgba(239,68,68,0.3)' : msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
              color: msg.type === 'error' ? '#fca5a5' : msg.type === 'success' ? '#6ee7b7' : '#93c5fd',
            }}>{msg.text}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {/* Username (always shown — register requires it, login accepts username OR email) */}
          <div>
            <div className="font-ui text-[10px] tracking-widest uppercase mb-1 font-semibold" style={{ color: T.textSec }}>
              Username
            </div>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="yourname"
              className="w-full px-3 py-2 rounded-lg font-ui text-sm outline-none"
              style={{ background: T.surface, border: `1px solid ${T.borderSoft}`, color: T.white }} />
          </div>

          {/* Email (always shown) */}
          <div>
            <div className="font-ui text-[10px] tracking-widest uppercase mb-1 font-semibold" style={{ color: T.textSec }}>Email</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@musicconnectz.net"
              className="w-full px-3 py-2 rounded-lg font-ui text-sm outline-none"
              style={{ background: T.surface, border: `1px solid ${T.borderSoft}`, color: T.white }} />
          </div>

          {/* Phone (only for register) */}
          {mode === 'register' && (
            <div>
              <div className="font-ui text-[10px] tracking-widest uppercase mb-1 font-semibold" style={{ color: T.textSec }}>Phone</div>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 123 4567"
                className="w-full px-3 py-2 rounded-lg font-ui text-sm outline-none"
                style={{ background: T.surface, border: `1px solid ${T.borderSoft}`, color: T.white }} />
            </div>
          )}

          {/* Password */}
          <div>
            <div className="font-ui text-[10px] tracking-widest uppercase mb-1 font-semibold" style={{ color: T.textSec }}>Password</div>
            <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg font-ui text-sm outline-none"
              style={{ background: T.surface, border: `1px solid ${T.borderSoft}`, color: T.white }} />
          </div>

          {/* Confirm password (only for register) */}
          {mode === 'register' && (
            <div>
              <div className="font-ui text-[10px] tracking-widest uppercase mb-1 font-semibold" style={{ color: T.textSec }}>Confirm Password</div>
              <input type="password" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg font-ui text-sm outline-none"
                style={{ background: T.surface, border: `1px solid ${T.borderSoft}`, color: T.white }} />
            </div>
          )}

          <Btn type="submit" kind="primary" className="w-full !py-3 mt-2" disabled={busy}>
            {mode === 'login' ? t('signIn') : t('createAccount')} →
          </Btn>
        </form>

        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px" style={{ background: T.borderSoft }} />
          <span className="font-ui text-[10px] tracking-widest uppercase opacity-60" style={{ color: T.textMuted }}>or</span>
          <div className="flex-1 h-px" style={{ background: T.borderSoft }} />
        </div>

        <Btn onClick={guestLogin} kind="ghost" className="w-full !py-2.5" disabled={busy}>
          {t('guest')} (demo)
        </Btn>

        <div className="font-ui text-[10px] text-center mt-4 leading-relaxed" style={{ color: T.textMuted }}>
          By continuing, you agree to our Terms and Privacy Policy.
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ONBOARDING FLOW — 4-step guided setup (Wave 1)
// Modal that appears on first login if profile incomplete.
// Steps: name+role → personas → first example → first post.
// ============================================================================
const ONBOARDING_ROLES = [
  { key: 'artist',    label: 'Artist · Vocalist',    emoji: '🎤' },
  { key: 'producer',  label: 'Producer · Beatmaker', emoji: '🎹' },
  { key: 'engineer',  label: 'Audio Engineer',       emoji: '🎛️' },
  { key: 'songwriter',label: 'Songwriter',           emoji: '✍️' },
  { key: 'designer',  label: 'Cover Designer',       emoji: '🎨' },
  { key: 'manager',   label: 'A&R · Manager',        emoji: '🕵️' },
  { key: 'label',     label: 'Label Founder',        emoji: '🏷️' },
  { key: 'multi',     label: 'Multi-hyphenate',      emoji: '✨' },
];

const ONBOARDING_GENRES = ['Trap', 'R&B', 'Drill', 'Hip-Hop', 'Pop', 'EDM', 'Indie', 'Country', 'Latin', 'Afrobeats', 'Reggae', 'Rock', 'Lo-fi', 'House', 'Other'];

const OnboardingFlow = ({ profile, setProfile, onComplete, onJump }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(profile?.artistName || '');
  const [role, setRole] = useState(profile?.role || '');
  const [genres, setGenres] = useState([]);
  const [example, setExample] = useState({ title: '', url: '' });
  const [busy, setBusy] = useState(false);

  const totalSteps = 4;
  const pct = (step / totalSteps) * 100;

  const skip = () => {
    if (step < totalSteps) setStep(step + 1);
    else finish();
  };

  const finish = async () => {
    setBusy(true);
    try {
      const updated = { ...(profile || {}), artistName: name || profile?.artistName, role: role || profile?.role, genres, onboarded: true };
      setProfile(updated);
      try { localStorage.setItem('mcz:profile', JSON.stringify(updated)); } catch (e) {}
      try { localStorage.setItem('mcz:onboarded', 'true'); } catch (e) {}
      onComplete();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)' }}>
      <div className="w-full max-w-md max-h-[94vh] rounded-3xl overflow-hidden flex flex-col"
        style={{ background: `linear-gradient(180deg, ${T.bgMid}, ${T.bgDeep})`, border: `1px solid ${T.purple}66`, boxShadow: `0 24px 60px rgba(0,0,0,0.7), 0 0 50px ${T.purple}44` }}>

        {/* Progress bar */}
        <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: T.borderSoft }}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-ui text-[10px] tracking-widest opacity-70" style={{ color: T.purple }}>
              // STEP {step} of {totalSteps}
            </div>
            <button onClick={skip} className="font-ui text-[10px] underline opacity-60" style={{ color: T.textSec }}>
              skip →
            </button>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(155,89,255,0.15)' }}>
            <div className="h-full transition-all duration-300"
              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${T.purple}, ${T.cyan})`, boxShadow: `0 0 10px ${T.purple}` }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {step === 1 && (
            <>
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">👋</div>
                <h2 className="font-display text-xl mb-1" style={{ color: T.purple, textShadow: `0 0 12px ${T.purple}` }}>
                  Welcome to Music ConnectZ
                </h2>
                <div className="font-ui text-xs opacity-70" style={{ color: T.textSec }}>
                  60-second setup · skip anything · 100% editable later
                </div>
              </div>

              <div className="mb-3">
                <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.cyan }}>// ARTIST NAME</div>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="@your.handle" maxLength={40} autoFocus
                  className="w-full px-3 py-2.5 rounded-lg font-ui text-base outline-none"
                  style={{ background: T.surface, border: `1px solid ${T.cyan}55`, color: T.white }} />
              </div>

              <div className="mb-3">
                <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.purple }}>// YOUR ROLE</div>
                <div className="grid grid-cols-2 gap-2">
                  {ONBOARDING_ROLES.map(r => (
                    <button key={r.key} onClick={() => setRole(r.key)}
                      className="p-2 rounded-lg flex items-center gap-2 font-ui text-xs text-left"
                      style={{
                        background: role === r.key ? `${T.purple}44` : 'rgba(0,0,0,0.3)',
                        border: `1px solid ${role === r.key ? T.purple : T.borderSoft}`,
                        color: role === r.key ? T.white : T.textSec,
                      }}>
                      <span className="text-base">{r.emoji}</span>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Btn onClick={() => setStep(2)} kind="primary" className="w-full !py-2.5 mt-2" disabled={!name.trim() || !role}>
                CONTINUE →
              </Btn>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">🎯</div>
                <h2 className="font-display text-xl mb-1" style={{ color: T.cyan, textShadow: `0 0 12px ${T.cyan}` }}>
                  What's your sound?
                </h2>
                <div className="font-ui text-xs opacity-70" style={{ color: T.textSec }}>
                  Pick 1-3 genres · drives your CollabZ matches + BattleZ pool
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {ONBOARDING_GENRES.map(g => (
                  <button key={g} onClick={() => {
                      if (genres.includes(g)) setGenres(genres.filter(x => x !== g));
                      else if (genres.length < 3) setGenres([...genres, g]);
                    }}
                    className="px-2.5 py-1.5 rounded-md font-ui text-xs"
                    style={{
                      background: genres.includes(g) ? T.cyan : 'rgba(0,0,0,0.3)',
                      color: genres.includes(g) ? '#000' : T.cyan,
                      border: `1px solid ${T.cyan}55`,
                      fontWeight: genres.includes(g) ? 700 : 500,
                    }}>
                    {g}
                  </button>
                ))}
              </div>

              <div className="font-ui text-[10px] opacity-60 mb-3 text-center" style={{ color: T.textSec }}>
                {genres.length === 0 ? 'Pick at least 1 to continue' : `${genres.length}/3 selected · ${genres.join(' · ')}`}
              </div>

              <Btn onClick={() => setStep(3)} kind="primary" className="w-full !py-2.5" disabled={genres.length === 0}>
                CONTINUE →
              </Btn>
            </>
          )}

          {step === 3 && (
            <>
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">🎵</div>
                <h2 className="font-display text-xl mb-1" style={{ color: T.lime, textShadow: `0 0 12px ${T.lime}` }}>
                  Drop your first example
                </h2>
                <div className="font-ui text-xs opacity-70" style={{ color: T.textSec }}>
                  Link to your best work · SoundCloud / YouTube / Spotify · so people see what you do
                </div>
              </div>

              <div className="mb-3">
                <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.lime }}>// TITLE</div>
                <input value={example.title} onChange={e => setExample({ ...example, title: e.target.value })}
                  placeholder="e.g. Latest single · best beat"
                  className="w-full px-3 py-2 rounded-lg font-ui text-sm outline-none"
                  style={{ background: T.surface, border: `1px solid ${T.lime}55`, color: T.white }} />
              </div>
              <div className="mb-3">
                <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.lime }}>// URL</div>
                <input value={example.url} onChange={e => setExample({ ...example, url: e.target.value })}
                  placeholder="https://soundcloud.com/..."
                  className="w-full px-3 py-2 rounded-lg font-ui text-sm outline-none"
                  style={{ background: T.surface, border: `1px solid ${T.lime}55`, color: T.white }} />
              </div>

              <div className="font-ui text-[10px] opacity-60 mb-3 text-center" style={{ color: T.textSec }}>
                💡 You can add more anytime in Profile → Examples
              </div>

              <Btn onClick={() => setStep(4)} kind="primary" className="w-full !py-2.5">
                {example.url && example.title ? 'CONTINUE →' : 'SKIP FOR NOW →'}
              </Btn>
            </>
          )}

          {step === 4 && (
            <>
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">🎉</div>
                <h2 className="font-display text-xl mb-1" style={{ color: T.pink, textShadow: `0 0 12px ${T.pink}` }}>
                  You're all set!
                </h2>
                <div className="font-ui text-xs opacity-70" style={{ color: T.textSec }}>
                  Here's what you can do now
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {[
                  { tab: 'collabz', emoji: '🤝', label: 'Post a CollabZ', sub: 'Find your next collaborator' },
                  { tab: 'battlez', emoji: '🪖', label: 'Enter a BattleZ',  sub: 'Compete · win SpinaZ' },
                  { tab: 'toolz',   emoji: '💡', label: 'Open ToolZ',       sub: 'Lilith · OCC · ImageZ · VideoZ' },
                  { tab: 'money',   emoji: '🥇', label: 'Unlock Premium',   sub: 'First 50 payers = lifetime 50% off' },
                ].map(t => (
                  <button key={t.tab} onClick={() => { finish(); setTimeout(() => onJump(t.tab), 300); }}
                    className="w-full p-3 rounded-lg flex items-center gap-3 text-left"
                    style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
                    <span className="text-2xl">{t.emoji}</span>
                    <div className="flex-1">
                      <div className="font-display text-sm" style={{ color: T.white }}>{t.label}</div>
                      <div className="font-ui text-[10px] opacity-60" style={{ color: T.textSec }}>{t.sub}</div>
                    </div>
                    <ChevronRight size={18} color={T.textMuted} />
                  </button>
                ))}
              </div>

              <Btn onClick={finish} kind="primary" className="w-full !py-2.5" disabled={busy}>
                {busy ? 'saving...' : '🏡 GO TO HOMEZ'}
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// NOTIFICATIONS — bell icon + slide panel (Wave 1)
// Polls /api/notifications/ every 30s · localStorage fallback if backend down
// ============================================================================
const NOTIF_KINDS = {
  message:   { emoji: '💬', color: '#4dffea' },
  battle:    { emoji: '🪖', color: '#ff4d6e' },
  collab:    { emoji: '🤝', color: '#9b59ff' },
  vote:      { emoji: '🚀', color: '#ffd84d' },
  rate:      { emoji: '⭐', color: '#b3ff4d' },
  follow:    { emoji: '👤', color: '#ff9b4d' },
  payment:   { emoji: '💰', color: '#22c55e' },
  system:    { emoji: '🔔', color: '#ffffff' },
};

const NotificationBell = ({ onOpen, count }) => {
  return (
    <button onClick={onOpen} className="relative p-2 rounded-full"
      style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
      <span style={{ fontSize: 16 }}>🔔</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-ui font-bold"
          style={{ background: T.pink, color: '#000', fontSize: 10, boxShadow: `0 0 8px ${T.pink}` }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
};

const NotificationsPanel = ({ notifications, setNotifications, onClose }) => {
  const markAllRead = async () => {
    const updated = notifications.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }));
    setNotifications(updated);
    try { localStorage.setItem('mcz:notifications', JSON.stringify(updated)); } catch (e) {}
    try {
      const token = localStorage.getItem('mcz:token');
      if (token) {
        await fetch('/api/notifications/mark-all-read/', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch (e) {}
  };

  const unread = notifications.filter(n => !n.read_at);

  return (
    <div className="fixed inset-0 z-40 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm h-full flex flex-col"
        style={{ background: `linear-gradient(180deg, ${T.bgMid}, ${T.bgDeep})`, borderLeft: `1px solid ${T.purple}55`, boxShadow: `-20px 0 50px rgba(0,0,0,0.6)` }}>
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b" style={{ borderColor: T.borderSoft }}>
          <div>
            <h2 className="font-display text-lg" style={{ color: T.purple, textShadow: `0 0 8px ${T.purple}66` }}>🔔 Notifications</h2>
            <div className="font-ui text-[10px] opacity-60" style={{ color: T.textSec }}>
              {unread.length > 0 ? `${unread.length} unread` : 'all caught up'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unread.length > 0 && (
              <button onClick={markAllRead} className="font-ui text-[10px] underline opacity-70" style={{ color: T.cyan }}>
                mark all read
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-full" style={{ color: T.textMuted }}><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-5xl mb-2 opacity-50">📭</div>
              <div className="font-ui text-sm opacity-60" style={{ color: T.textSec }}>
                No notifications yet · come back after you post your first CollabZ or BattleZ
              </div>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: T.borderSoft }}>
              {notifications.map(n => {
                const k = NOTIF_KINDS[n.kind] || NOTIF_KINDS.system;
                return (
                  <div key={n.id} className="p-3 flex items-start gap-3"
                    style={{ borderColor: T.borderSoft, background: n.read_at ? 'transparent' : 'rgba(155,89,255,0.05)' }}>
                    <div className="text-xl shrink-0 mt-0.5">{k.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-ui text-sm" style={{ color: T.white }}>{n.title}</div>
                      {n.body && <div className="font-ui text-xs mt-0.5 opacity-70" style={{ color: T.textSec }}>{n.body}</div>}
                      <div className="font-ui text-[10px] opacity-50 mt-1" style={{ color: T.textSec }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                    {!n.read_at && <div className="w-2 h-2 rounded-full mt-2" style={{ background: k.color, boxShadow: `0 0 6px ${k.color}` }} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Time-ago helper
function timeAgo(iso) {
  if (!iso) return 'just now';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ============================================================================
// ACTIVITY FEED — "LIVE NOW" card on HomeZ (Wave 1)
// Shows last 5-10 platform-wide events to drive FOMO + return visits
// ============================================================================
const ActivityFeed = ({ activities, onJump }) => {
  if (!activities || activities.length === 0) {
    return (
      <Card color={T.lime} className="p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">🌊</span>
          <div className="font-ui text-[10px] tracking-widest opacity-70" style={{ color: T.lime }}>// LIVE NOW</div>
          <span className="ml-auto inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: T.lime, boxShadow: `0 0 8px ${T.lime}` }} />
        </div>
        <div className="font-ui text-xs opacity-60 text-center py-3" style={{ color: T.textSec }}>
          Be the first to post · CollabZ · BattleZ · examples · everyone sees it here
        </div>
      </Card>
    );
  }

  return (
    <Card color={T.lime} className="p-3 mb-4">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-base">🌊</span>
        <div className="font-ui text-[10px] tracking-widest opacity-70" style={{ color: T.lime }}>// LIVE NOW</div>
        <span className="ml-auto inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: T.lime, boxShadow: `0 0 8px ${T.lime}` }} />
      </div>
      <div className="space-y-2">
        {activities.slice(0, 5).map(a => {
          const k = NOTIF_KINDS[a.kind] || NOTIF_KINDS.system;
          return (
            <button key={a.id} onClick={() => a.tab && onJump(a.tab)}
              className="w-full flex items-start gap-2 text-left">
              <span className="text-base shrink-0 mt-0.5">{k.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-ui text-xs" style={{ color: T.white }}>
                  <span className="font-bold" style={{ color: k.color }}>@{a.actor || 'someone'}</span> {a.verb}
                </div>
                <div className="font-ui text-[10px] opacity-50" style={{ color: T.textSec }}>
                  {timeAgo(a.created_at)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

// ============================================================================
// WAVE 3 — SMART PAYWALLS + USAGE WARNINGS (Prompts 7, 8, 9)
// ============================================================================

// Limit-hit modal: shows when user tries an action above their tier cap.
// Highlights the specific limit they hit + shows 3-tier comparison.
const LimitHitModal = ({ limitType, currentValue, onClose, onUpgrade, membership }) => {
  const tier = membership?.tier || 'free';
  const limits = {
    char: {
      title: 'Message too long',
      free: '400 chars',
      premium: '4,000 chars',
      statz: '40,000 chars',
      icon: '💬',
    },
    file: {
      title: 'File too large',
      free: '40 MB',
      premium: '400 MB',
      statz: '4 GB',
      icon: '📦',
    },
    storage: {
      title: 'Storage full',
      free: '400 MB total',
      premium: '5 GB total',
      statz: '100 GB total',
      icon: '💾',
    },
    release: {
      title: 'Release limit hit',
      free: '1 per month',
      premium: 'Unlimited',
      statz: 'Unlimited + priority distro',
      icon: '🎵',
    },
  };
  const cfg = limits[limitType] || limits.char;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-3xl overflow-hidden flex flex-col max-h-[94vh]"
        style={{ background: `linear-gradient(180deg, ${T.bgMid}, ${T.bgDeep})`, border: `1px solid ${T.cyan}66`, boxShadow: `0 24px 60px rgba(0,0,0,0.7), 0 0 50px ${T.cyan}44` }}>
        <div className="px-4 pt-4 pb-3 border-b text-center" style={{ borderColor: T.borderSoft }}>
          <div className="text-5xl mb-2">{cfg.icon}</div>
          <h2 className="font-display text-lg" style={{ color: T.cyan, textShadow: `0 0 12px ${T.cyan}` }}>{cfg.title}</h2>
          {currentValue && (
            <div className="font-ui text-[10px] opacity-60 mt-1" style={{ color: T.textSec }}>{currentValue}</div>
          )}
        </div>

        <div className="p-4 overflow-y-auto">
          <div className="space-y-2 mb-4">
            {[
              { key: 'free',    color: T.textSec, label: 'Free',           sub: cfg.free,    active: tier === 'free',    cta: null },
              { key: 'premium', color: T.cyan,    label: 'Premium $10/mo', sub: cfg.premium, active: tier === 'premium', cta: tier === 'free' },
              { key: 'statz',   color: T.purple,  label: 'StatZ +$5/mo',   sub: cfg.statz,   active: tier === 'statz',   cta: tier === 'premium' },
            ].map(t => (
              <div key={t.key} className="p-3 rounded-lg"
                style={{
                  background: t.active ? `${t.color}22` : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${t.active ? t.color : T.borderSoft}`,
                  boxShadow: t.cta ? `0 0 16px ${t.color}33` : 'none',
                }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-sm" style={{ color: t.color }}>{t.label}</div>
                    <div className="font-ui text-xs opacity-80 mt-0.5" style={{ color: T.white }}>{t.sub}</div>
                  </div>
                  {t.active && <span className="font-ui text-[10px] px-2 py-0.5 rounded" style={{ background: t.color, color: '#000', fontWeight: 700 }}>YOU</span>}
                  {t.cta && (
                    <button onClick={() => onUpgrade(t.key)} className="px-3 py-1.5 rounded font-ui text-xs font-bold"
                      style={{ background: t.color, color: '#000' }}>
                      UPGRADE →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 rounded-lg mb-3 font-ui text-[10px] text-center"
            style={{ background: 'rgba(255,77,157,0.1)', border: `1px solid ${T.pink}44`, color: T.pink }}>
            🎟️ First 50 paying members lock in <b>50% off lifetime</b> · code <b>FOUNDER50</b>
          </div>

          <Btn onClick={onClose} kind="ghost" className="w-full !py-2">MAYBE LATER</Btn>
        </div>
      </div>
    </div>
  );
};

// Storage / quota usage banner — shows when 80%+ of any limit
const QuotaWarningBanner = ({ usage, limit, label, unit, onUpgrade }) => {
  if (!usage || !limit) return null;
  const pct = (usage / limit) * 100;
  if (pct < 80) return null;
  const isCritical = pct >= 95;

  return (
    <Card color={isCritical ? T.red : T.orange} className="p-2.5 mb-3" onClick={onUpgrade}>
      <div className="flex items-center gap-2">
        <span className="text-base shrink-0">{isCritical ? '🚨' : '⚠️'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-ui text-[11px]" style={{ color: isCritical ? T.red : T.orange }}>
              <b>{Math.round(pct)}% of {label} used</b>
            </span>
            <span className="font-ui text-[10px] opacity-70" style={{ color: T.textSec }}>
              {usage}{unit} / {limit}{unit}
            </span>
          </div>
          <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <div className="h-full transition-all duration-500"
              style={{
                width: `${Math.min(100, pct)}%`,
                background: isCritical ? T.red : T.orange,
                boxShadow: `0 0 6px ${isCritical ? T.red : T.orange}`,
              }} />
          </div>
          <div className="font-ui text-[9px] opacity-60 mt-0.5" style={{ color: T.textSec }}>
            {isCritical ? 'Upgrade to keep posting · tap →' : 'Upgrade now to never see this · tap →'}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Premium taste test — one-time free trial of a Premium feature
const TasteTestModal = ({ feature, onClose, onUseOnce, onUpgrade }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-3xl p-5"
        style={{ background: `linear-gradient(180deg, ${T.bgMid}, ${T.bgDeep})`, border: `1px solid ${T.cyan}66`, boxShadow: `0 0 40px ${T.cyan}33` }}>
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">🎁</div>
          <h2 className="font-display text-lg" style={{ color: T.cyan }}>Free taste test</h2>
          <div className="font-ui text-xs opacity-70 mt-1" style={{ color: T.textSec }}>
            Try <b>{feature}</b> once — see if it's worth Premium
          </div>
        </div>
        <Btn onClick={() => { onUseOnce(); onClose(); }} kind="cyan" className="w-full !py-2.5 mb-2">
          🎁 USE ONCE FREE
        </Btn>
        <Btn onClick={() => { onUpgrade(); onClose(); }} kind="primary" className="w-full !py-2.5 mb-2">
          🥇 UPGRADE FOR UNLIMITED
        </Btn>
        <button onClick={onClose} className="w-full py-2 font-ui text-[11px] opacity-60" style={{ color: T.textSec }}>
          Not interested
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// WAVE 2 — DAILY STREAK + REWARDS (Prompt 4)
// Visible on HomeZ. Tap to claim. Resets if missed day. Premium = 2x bonus.
// ============================================================================
const STREAK_REWARDS = [
  { day: 1,  spinaz: 10,  bonus: '' },
  { day: 2,  spinaz: 15,  bonus: '' },
  { day: 3,  spinaz: 20,  bonus: '' },
  { day: 4,  spinaz: 25,  bonus: '' },
  { day: 5,  spinaz: 30,  bonus: '' },
  { day: 6,  spinaz: 40,  bonus: '' },
  { day: 7,  spinaz: 50,  bonus: '🔥 week 1!' },
  { day: 14, spinaz: 100, bonus: '🔥 2 weeks!' },
  { day: 21, spinaz: 200, bonus: '⚡ 3 weeks!' },
  { day: 30, spinaz: 500, bonus: '🏆 1 MONTH + Premium 7d free' },
  { day: 60, spinaz: 1000, bonus: '👑 2 months' },
  { day: 100, spinaz: 5000, bonus: '🌟 LEGEND status' },
];

const getRewardForDay = (day) => {
  let last = STREAK_REWARDS[0];
  for (const r of STREAK_REWARDS) {
    if (r.day <= day) last = r;
    else break;
  }
  return last;
};

const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  const a = new Date(d1), b = new Date(d2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const daysBetween = (d1, d2) => {
  const a = new Date(d1), b = new Date(d2);
  a.setHours(0,0,0,0); b.setHours(0,0,0,0);
  return Math.round((b - a) / 86400000);
};

const DailyStreakCard = ({ streak, setStreak, membership, onClaim }) => {
  const today = new Date().toISOString();
  const lastClaim = streak?.lastClaim;
  const currentDay = streak?.currentDay || 0;
  const claimedToday = isSameDay(lastClaim, today);
  const reward = getRewardForDay(currentDay + (claimedToday ? 0 : 1));
  const isPremium = membership?.tier === 'premium' || membership?.tier === 'statz';
  const finalSpinaz = isPremium ? reward.spinaz * 2 : reward.spinaz;

  const claim = () => {
    let newDay;
    if (!lastClaim) {
      newDay = 1;
    } else {
      const gap = daysBetween(lastClaim, today);
      if (gap === 0) return;  // already claimed today
      if (gap === 1) newDay = currentDay + 1;  // streak continues
      else newDay = 1;  // broke streak, reset
    }
    const newStreak = { currentDay: newDay, lastClaim: today, totalSpinaz: (streak?.totalSpinaz || 0) + finalSpinaz };
    setStreak(newStreak);
    storageSave('mcz:streak:v1', newStreak);
    onClaim?.(finalSpinaz, newDay);
  };

  return (
    <Card color={T.orange} className="p-3 mb-4" onClick={claimedToday ? undefined : claim}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl shrink-0">🔥</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-base" style={{ color: T.orange, textShadow: `0 0 8px ${T.orange}66` }}>
                Day {claimedToday ? currentDay : (currentDay + 1)} streak
              </span>
              {reward.bonus && <span className="font-ui text-[9px] opacity-80" style={{ color: T.yellow }}>{reward.bonus}</span>}
            </div>
            <div className="font-ui text-[10px] opacity-70 mt-0.5" style={{ color: T.textSec }}>
              {claimedToday
                ? `Claimed · come back tomorrow for Day ${currentDay + 1}`
                : `Tap to claim ${finalSpinaz} SpinaZ ${isPremium ? '(2× Premium bonus!)' : ''}`}
            </div>
          </div>
        </div>
        {!claimedToday && (
          <button className="px-3 py-1.5 rounded-md font-ui text-xs font-bold shrink-0"
            style={{ background: T.orange, color: '#000', boxShadow: `0 0 12px ${T.orange}66` }}>
            CLAIM +{finalSpinaz}
          </button>
        )}
        {claimedToday && <span className="text-xl shrink-0">✓</span>}
      </div>
      {/* Streak dots — last 7 days visualizer */}
      <div className="flex gap-1 mt-2">
        {Array.from({ length: 7 }, (_, i) => {
          const dayNum = Math.max(1, currentDay - 6) + i;
          const active = dayNum <= currentDay;
          const isToday = active && dayNum === currentDay && claimedToday;
          return (
            <div key={i} className="flex-1 h-1.5 rounded-full"
              style={{
                background: active ? T.orange : 'rgba(255,155,77,0.15)',
                boxShadow: isToday ? `0 0 8px ${T.orange}` : 'none',
              }} />
          );
        })}
      </div>
    </Card>
  );
};

// ============================================================================
// WAVE 2 — BATTLE SCHEDULING (Prompt 5)
// "Schedule for [date/time]" instead of immediate post. Countdown until live.
// ============================================================================
const ScheduledBattlesCard = ({ scheduled, onJump }) => {
  if (!scheduled || scheduled.length === 0) return null;
  const next = scheduled[0];
  const ms = new Date(next.start_time).getTime() - Date.now();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);

  return (
    <Card color={T.red} className="p-3 mb-4" onClick={() => onJump('battlez')}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">⏰</span>
        <div className="font-ui text-[10px] tracking-widest opacity-70" style={{ color: T.red }}>// SCHEDULED BATTLE</div>
        <span className="ml-auto inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: T.red, boxShadow: `0 0 8px ${T.red}` }} />
      </div>
      <div className="font-display text-sm mb-0.5" style={{ color: T.white }}>{next.title || 'Untitled Battle'}</div>
      <div className="font-ui text-xs" style={{ color: T.red }}>
        Starts in {days > 0 ? `${days}d ` : ''}{hours}h {minutes}m
      </div>
      <div className="font-ui text-[10px] opacity-60 mt-1" style={{ color: T.textSec }}>
        {scheduled.length > 1 && `+ ${scheduled.length - 1} more scheduled · `}
        Tap to view all
      </div>
    </Card>
  );
};

// ============================================================================
// WAVE 2 — DAILY COREY CRITIQUE (Prompt 6)
// Auto-generated daily AI rating + feedback on user's latest public example.
// Free: 1/week. Premium: 1/day. StatZ: unlimited on-demand.
// ============================================================================
const DailyCritiqueCard = ({ critique, membership, onJump, onRefresh }) => {
  const isPremium = membership?.tier === 'premium' || membership?.tier === 'statz';
  const isStatz = membership?.tier === 'statz';

  if (!critique) {
    return (
      <Card color={T.cyan} className="p-3 mb-4" onClick={() => onRefresh?.()}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">💬</span>
          <div className="font-ui text-[10px] tracking-widest opacity-70" style={{ color: T.cyan }}>// COREY CRITIQUE</div>
          {!isPremium && <StatusPill status="preview" />}
        </div>
        <div className="font-display text-sm" style={{ color: T.cyan }}>
          {isPremium ? "Tap to get today's critique" : 'Premium · daily AI feedback on your work'}
        </div>
        <div className="font-ui text-[10px] opacity-60 mt-1" style={{ color: T.textSec }}>
          {isPremium ? '5-dim score + 2 sentences of real talk on your latest drop' : 'Free = 1/week · Premium = 1/day · StatZ = on-demand'}
        </div>
      </Card>
    );
  }

  return (
    <Card color={T.cyan} className="p-3 mb-4" onClick={() => onJump('ratez')}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">💬</span>
        <div className="font-ui text-[10px] tracking-widest opacity-70" style={{ color: T.cyan }}>// COREY'S DAILY TAKE</div>
        <span className="ml-auto font-ui text-[10px] opacity-60" style={{ color: T.textSec }}>{timeAgo(critique.created_at)}</span>
      </div>
      <div className="font-ui text-xs mb-2 italic" style={{ color: T.white }}>
        "{critique.feedback}"
      </div>
      <div className="flex gap-2">
        {['mix','flow','lyrics','energy','originality'].map(dim => (
          <div key={dim} className="flex-1 text-center">
            <div className="font-display text-sm" style={{ color: T.cyan, textShadow: `0 0 6px ${T.cyan}66` }}>
              {critique[dim] || '—'}
            </div>
            <div className="font-ui text-[8px] opacity-60 tracking-widest" style={{ color: T.textSec }}>{dim.toUpperCase()}</div>
          </div>
        ))}
      </div>
      {isStatz && (
        <button onClick={(e) => { e.stopPropagation(); onRefresh?.(); }}
          className="mt-2 w-full py-1 rounded font-ui text-[10px] tracking-widest"
          style={{ background: 'rgba(0,0,0,0.3)', color: T.cyan, border: `1px solid ${T.cyan}55` }}>
          🔄 GET NEW CRITIQUE (StatZ unlimited)
        </button>
      )}
    </Card>
  );
};

// ============================================================================
// Shows on HomeZ if email or phone unverified. Drives reachability.
// ============================================================================
const VerificationBanner = ({ verification, onVerifyEmail, onVerifyPhone }) => {
  if (!verification) return null;
  const emailDone = verification.email_verified;
  const phoneDone = verification.phone_verified;
  if (emailDone && phoneDone) return null;  // all done, hide

  return (
    <Card color={T.orange} className="p-3 mb-4">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg shrink-0">📬</span>
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm" style={{ color: T.orange }}>
            Verify to never miss a beat
          </div>
          <div className="font-ui text-[10px] opacity-70 mt-0.5" style={{ color: T.textSec }}>
            Get notified on collabs · battle invites · payments · streak reminders
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button onClick={onVerifyEmail} disabled={emailDone}
          className="p-2 rounded-lg flex items-center gap-2 font-ui text-xs"
          style={{
            background: emailDone ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.3)',
            border: `1px solid ${emailDone ? '#22c55e' : T.cyan}55`,
            color: emailDone ? '#22c55e' : T.cyan,
          }}>
          <span>{emailDone ? '✓' : '✉️'}</span>
          <span>{emailDone ? 'Email verified' : 'Verify email'}</span>
        </button>
        <button onClick={onVerifyPhone} disabled={phoneDone}
          className="p-2 rounded-lg flex items-center gap-2 font-ui text-xs"
          style={{
            background: phoneDone ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.3)',
            border: `1px solid ${phoneDone ? '#22c55e' : T.pink}55`,
            color: phoneDone ? '#22c55e' : T.pink,
          }}>
          <span>{phoneDone ? '✓' : '📱'}</span>
          <span>{phoneDone ? 'Phone verified' : 'Verify phone'}</span>
        </button>
      </div>
    </Card>
  );
};

// Modal for email verification flow
const VerifyEmailModal = ({ user, onClose, onVerified }) => {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const send = async () => {
    setBusy(true); setErr(null);
    try {
      const token = localStorage.getItem('mcz:token');
      const res = await fetch('/api/auth/verify/email/send/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`backend ${res.status}`);
      const data = await res.json();
      if (data.already_verified) onVerified();
      else setSent(true);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-3xl p-5"
        style={{ background: `linear-gradient(180deg, ${T.bgMid}, ${T.bgDeep})`, border: `1px solid ${T.cyan}66` }}>
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">✉️</div>
          <h2 className="font-display text-lg" style={{ color: T.cyan }}>Verify Email</h2>
        </div>
        {!sent ? (
          <>
            <div className="font-ui text-sm text-center mb-4" style={{ color: T.textSec }}>
              We'll send a verification link to:
            </div>
            <div className="text-center font-mono text-sm mb-4 p-2 rounded" style={{ background: 'rgba(0,0,0,0.3)', color: T.cyan }}>
              {user?.email || '(no email on account)'}
            </div>
            {err && <div className="font-ui text-xs mb-3 text-center" style={{ color: '#fca5a5' }}>{err}</div>}
            <Btn onClick={send} kind="cyan" className="w-full !py-2.5" disabled={busy || !user?.email}>
              {busy ? 'sending...' : '📧 SEND VERIFICATION LINK'}
            </Btn>
          </>
        ) : (
          <>
            <div className="font-ui text-sm text-center mb-2" style={{ color: T.lime }}>✓ Sent!</div>
            <div className="font-ui text-xs text-center mb-4 opacity-80" style={{ color: T.textSec }}>
              Check your inbox at <b>{user?.email}</b>. Click the link to verify. Expires in 24h.
            </div>
            <Btn onClick={onClose} kind="ghost" className="w-full !py-2">CLOSE</Btn>
          </>
        )}
      </div>
    </div>
  );
};

// Modal for phone verification flow
const VerifyPhoneModal = ({ onClose, onVerified }) => {
  const [step, setStep] = useState('phone'); // phone → code
  const [phone, setPhone] = useState('+1');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const sendCode = async () => {
    setBusy(true); setErr(null);
    try {
      const token = localStorage.getItem('mcz:token');
      const res = await fetch('/api/auth/verify/phone/send/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `backend ${res.status}`);
      }
      setStep('code');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const confirmCode = async () => {
    setBusy(true); setErr(null);
    try {
      const token = localStorage.getItem('mcz:token');
      const res = await fetch('/api/auth/verify/phone/confirm/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `backend ${res.status}`);
      }
      onVerified();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-3xl p-5"
        style={{ background: `linear-gradient(180deg, ${T.bgMid}, ${T.bgDeep})`, border: `1px solid ${T.pink}66` }}>
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">📱</div>
          <h2 className="font-display text-lg" style={{ color: T.pink }}>Verify Phone</h2>
          <div className="font-ui text-[10px] opacity-60 mt-1" style={{ color: T.textSec }}>
            E.164 format · +1[10 digits] · US example: +14155551234
          </div>
        </div>
        {step === 'phone' ? (
          <>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+14155551234" autoFocus
              className="w-full px-3 py-2.5 rounded-lg font-mono text-base outline-none mb-3"
              style={{ background: T.surface, border: `1px solid ${T.pink}55`, color: T.white }} />
            {err && <div className="font-ui text-xs mb-3 text-center" style={{ color: '#fca5a5' }}>{err}</div>}
            <Btn onClick={sendCode} kind="primary" className="w-full !py-2.5" disabled={busy || phone.length < 8}>
              {busy ? 'sending...' : '📤 SEND CODE'}
            </Btn>
          </>
        ) : (
          <>
            <div className="font-ui text-xs text-center mb-3 opacity-80" style={{ color: T.textSec }}>
              Enter the 6-digit code sent to <b>{phone}</b>
            </div>
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456" maxLength={6} inputMode="numeric" autoFocus
              className="w-full px-3 py-2.5 rounded-lg font-mono text-2xl outline-none mb-3 text-center tracking-widest"
              style={{ background: T.surface, border: `1px solid ${T.pink}55`, color: T.white }} />
            {err && <div className="font-ui text-xs mb-3 text-center" style={{ color: '#fca5a5' }}>{err}</div>}
            <Btn onClick={confirmCode} kind="primary" className="w-full !py-2.5" disabled={busy || code.length !== 6}>
              {busy ? 'verifying...' : '✓ VERIFY'}
            </Btn>
            <button onClick={() => setStep('phone')} className="w-full mt-2 font-ui text-[10px] underline opacity-60" style={{ color: T.textSec }}>
              ← back to phone entry
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PREMIUM TEASER — wrapper that shows locked Premium/StatZ features
// (Wave 1 conversion driver — visible everywhere users browse)
// ============================================================================
const PremiumTeaser = ({ tier = 'premium', label, preview, onUpgrade, compact = false }) => {
  const tierConfig = {
    premium: { color: T.cyan, label: 'PREMIUM', emoji: '🥇' },
    statz:   { color: T.purple, label: 'STATZ', emoji: '📈' },
  };
  const cfg = tierConfig[tier];
  return (
    <div className="rounded-xl overflow-hidden mb-3"
      style={{
        background: `linear-gradient(135deg, ${cfg.color}11, ${cfg.color}22)`,
        border: `1px dashed ${cfg.color}66`,
      }}>
      <div className={`${compact ? 'p-2.5' : 'p-3'} flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-lg shrink-0">{cfg.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-xs" style={{ color: cfg.color }}>{label}</span>
              <span className="px-1.5 py-0.5 rounded font-ui text-[8px] tracking-widest"
                style={{ background: `${cfg.color}33`, color: cfg.color, border: `1px solid ${cfg.color}66` }}>
                🔒 {cfg.label}
              </span>
            </div>
            {preview && <div className="font-ui text-[10px] opacity-70 mt-0.5 truncate" style={{ color: T.textSec }}>{preview}</div>}
          </div>
        </div>
        <button onClick={onUpgrade} className="shrink-0 px-2.5 py-1 rounded font-ui text-[10px] font-bold"
          style={{ background: cfg.color, color: '#000' }}>
          UNLOCK →
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// VERIFICATION BANNER + PREMIUM TEASER — end (Wave 1)
// ============================================================================

// ============================================================================
// PAGE: HOME — upgraded dashboard for conversion
// ============================================================================
const HomePage = ({ tasks, profile, onJump, onOpenInfo, membership, activities, verification, onVerifyEmail, onVerifyPhone, streak, setStreak, scheduledBattles, dailyCritique, refreshCritique }) => {
  const todayCount = tasks.filter(t => t.bucket === 'today' && !t.completedAt).length;
  const upcomingCount = tasks.filter(t => t.bucket === 'upcoming' && !t.completedAt).length;
  const inboxCount = tasks.filter(t => t.bucket === 'inbox').length;
  const greeting = (() => { const h = new Date().getHours(); return h < 5 ? 'late night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; })();
  const z = profile?.birthday ? detectZodiac(profile.birthday) : null;

  const isFree = !membership || membership.tier === 'free';
  const profileIncomplete = !profile?.artistName || !profile?.role;
  const liveTabs = Object.entries(TAB_STATUS).filter(([, s]) => s === 'live').map(([k]) => k);
  const betaCount = Object.values(TAB_STATUS).filter(s => s === 'beta').length;
  const previewCount = Object.values(TAB_STATUS).filter(s => s === 'preview').length;

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-ui text-xs tracking-widest opacity-60" style={{ color: T.purple }}>// {greeting} 🌙</div>
          <h1 className="font-display text-2xl mt-1" style={{ color: T.purple, textShadow: `0 0 14px ${T.purple}66` }}>
            🏡 HomeZ
          </h1>
          {profile?.artistName && (
            <div className="font-ui text-sm mt-1" style={{ color: T.cyan }}>
              @{profile.artistName} {z && <span className="opacity-70 ml-1">· {z.symbol} {z.emoji}</span>}
            </div>
          )}
        </div>
        <button onClick={() => onOpenInfo('home')} className="p-2 rounded-full"
          style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
          <span style={{ fontSize: 14 }}>🎙️ℹ️</span>
        </button>
      </div>

      {/* NEW USER ONBOARDING — only shows if profile incomplete */}
      {profileIncomplete && (
        <Card color={T.pink} className="p-3 mb-4" onClick={() => onJump('profile')}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="font-ui text-[10px] tracking-widest opacity-70 mb-1" style={{ color: T.pink }}>// FINISH SETUP · 30 SEC</div>
              <div className="font-display text-base" style={{ color: T.pink }}>👤 Complete your profile</div>
              <div className="font-ui text-[11px] mt-0.5 opacity-70" style={{ color: T.textSec }}>
                Add artist name + role · unlock CollabZ + BattleZ posting
              </div>
            </div>
            <ChevronRight size={20} color={T.pink} />
          </div>
        </Card>
      )}

      {/* FREE → PREMIUM CTA — only for free users · uses promo cascade if active */}
      {isFree && (
        <Card color={T.cyan} className="p-3 mb-4" onClick={() => onJump('money')}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="font-ui text-[10px] tracking-widest opacity-70 mb-1" style={{ color: T.cyan }}>
                // FIRST 50 PAYERS · LIFETIME 50% OFF
              </div>
              <div className="font-display text-base" style={{ color: T.cyan }}>🥇 Upgrade to Premium</div>
              <div className="font-ui text-[11px] mt-0.5 opacity-80" style={{ color: T.textSec }}>
                $10/mo · 10× messages · 10× storage · unlimited releases · half the K-Oth cut
              </div>
            </div>
            <ChevronRight size={20} color={T.cyan} />
          </div>
        </Card>
      )}

      {/* WAVE 3 — Storage quota warning if approaching limit */}
      {membership?.storage_used_mb !== undefined && (
        <QuotaWarningBanner usage={membership.storage_used_mb}
          limit={tierLimits(membership).storage_mb} label="storage" unit=" MB"
          onUpgrade={() => onJump('money')} />
      )}

      {/* VERIFICATION BANNER — Wave 1 retention driver */}
      <VerificationBanner verification={verification}
        onVerifyEmail={onVerifyEmail} onVerifyPhone={onVerifyPhone} />

      {/* WAVE 2 — Daily Streak (top of HomeZ to lock in habit) */}
      <DailyStreakCard streak={streak} setStreak={setStreak} membership={membership} />

      {/* WAVE 2 — Scheduled BattleZ countdown (only if any) */}
      <ScheduledBattlesCard scheduled={scheduledBattles} onJump={onJump} />

      {/* WAVE 2 — Daily Corey Critique (Premium-gated) */}
      {(membership?.tier === 'premium' || membership?.tier === 'statz') && (
        <DailyCritiqueCard critique={dailyCritique} membership={membership}
          onJump={onJump} onRefresh={refreshCritique} />
      )}

      {/* LIVE ACTIVITY FEED — Wave 1 retention driver */}
      <ActivityFeed activities={activities} onJump={onJump} />

      {/* PREMIUM TEASER #1 — daily AI critique (Premium feature preview) */}
      {isFree && (
        <PremiumTeaser tier="premium" label="Daily Corey Critique"
          preview="See Corey's 5-dim score + feedback on your latest drop · 1× per day"
          onUpgrade={() => onJump('money')} />
      )}

      {/* TODAY · NEXT · INBOX — Lilith stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { k: 'today', label: '‼️ TODAY', count: todayCount, color: T.pink },
          { k: 'upcoming', label: '❗ NEXT', count: upcomingCount, color: T.purple },
          { k: 'inbox', label: '📥 IN', count: inboxCount, color: T.cyan },
        ].map(s => (
          <Card key={s.k} color={s.color} className="p-3" onClick={() => onJump('toolz', 'lilith', s.k)}>
            <div className="font-ui text-[9px] tracking-widest opacity-70 mb-1" style={{ color: s.color }}>{s.label}</div>
            <div className="font-display text-2xl" style={{ color: s.color, textShadow: `0 0 10px ${s.color}` }}>{s.count}</div>
          </Card>
        ))}
      </div>

      {/* QUICK LAUNCH — only LIVE features (trust-building) */}
      <div className="flex items-center justify-between mb-2">
        <div className="font-ui text-[10px] tracking-widest opacity-60" style={{ color: T.purple }}>// LIVE FEATURES ⚡</div>
        <StatusPill status="live" />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {liveTabs.filter(k => k !== 'home' && k !== 'settingz').slice(0, 9).map(k => {
          const t = TABS[k]; const Ic = t.icon;
          return (
            <Card key={k} color={t.color} className="p-2.5 flex flex-col items-start gap-1.5" onClick={() => onJump(k)}>
              <div className="flex items-center justify-between w-full">
                <Ic size={18} color={t.color} style={{ filter: `drop-shadow(0 0 6px ${t.color}66)` }} strokeWidth={1.8} />
                <span style={{ fontSize: 11 }}>{t.emoji}</span>
              </div>
              <div className="font-display text-[11px] tracking-wider" style={{ color: t.color }}>{t.label}</div>
            </Card>
          );
        })}
      </div>

      {/* IN-DEVELOPMENT — show what's coming (transparent + builds anticipation) */}
      <Card color={T.purple} className="p-3 mb-4" onClick={() => onJump('toolz')}>
        <div className="flex items-center justify-between mb-1">
          <div className="font-ui text-[10px] tracking-widest opacity-70" style={{ color: T.purple }}>// IN DEVELOPMENT</div>
          <div className="flex gap-1">
            <StatusPill status="beta" />
            <StatusPill status="preview" />
          </div>
        </div>
        <div className="font-display text-sm" style={{ color: T.purple }}>
          🟡 {betaCount} BETA · 🔵 {previewCount} PREVIEW
        </div>
        <div className="font-ui text-[11px] mt-1 opacity-70" style={{ color: T.textSec }}>
          Vote on which sub-apps ship next · open ToolZ → tap any tile → 🚀 VOTE PRIORITY
        </div>
      </Card>

      {/* PREMIUM TEASER #2 — schedule BattleZ (Premium feature preview) */}
      {isFree && (
        <PremiumTeaser tier="premium" label="Schedule BattleZ"
          preview="Set a date/time · auto-notify opponents · 24h voting window · livestream-ready"
          onUpgrade={() => onJump('money')} />
      )}

      {/* PREMIUM TEASER #3 — StatZ Lip-Sync (highest tier feature preview) */}
      {(!membership || membership.tier !== 'statz') && (
        <PremiumTeaser tier="statz" label="Lip-Sync AI"
          preview="Sync any face to any voice · audio→video in seconds · watermarked + royalty-attributed"
          onUpgrade={() => onJump('money')} />
      )}

      {/* FULL TOOL BELT — Lilith + OCC entry point */}
      <Card color={T.cyan} className="p-3 mb-4" onClick={() => onJump('toolz')}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-ui text-[10px] tracking-widest opacity-60" style={{ color: T.cyan }}>// FULL TOOL BELT</div>
            <div className="font-display text-base mt-0.5" style={{ color: T.cyan }}>💡 Open ToolZ</div>
            <div className="font-ui text-[11px] opacity-60 mt-0.5" style={{ color: T.textSec }}>
              💃🏽 Lilith + 👁️ OCC live · 14 more in active development
            </div>
          </div>
          <ChevronRight size={20} color={T.cyan} />
        </div>
      </Card>

      <div className="font-ui text-[9px] text-center opacity-30 pt-2" style={{ color: T.cyan }}>
        MUSIC CONNECTZ · v0.32 · {liveTabs.length}/{TAB_ORDER.length} LIVE · {betaCount} BETA · {previewCount} PREVIEW
      </div>
    </div>
  );
};

// ============================================================================
// PAGE: PROFILE (with ZodiacZ + Personas + Examples)
// ============================================================================
const ROLES = ['Independent Artist', 'Producer', 'Mix Engineer', 'Designer', 'Videographer', 'Manager', 'Ghostwriter', 'Developer'];
const GENRES = ['Hip-Hop','R&B','Pop','EDM','Rock','Indie','Country','Jazz','Soul','Latin','Afro','Lo-Fi','Metal','Trap','Drill','Cloud Rap'];
const EMPTY_PROFILE = { artistName: '', realName: '', role: '', bio: '', city: '', birthday: '', genres: [], links: { spotify: '', soundcloud: '', instagram: '', youtube: '' } };

// PersonaZ types — 8 from the v5.7 spec
const PERSONA_TYPES = [
  { key: 'artist',       emoji: '🎤', label: 'Independent Artist', color: T.pink },
  { key: 'producer',     emoji: '🎚️', label: 'Beat Producer',      color: T.purple },
  { key: 'engineer',     emoji: '🎛️', label: 'Mix Engineer',       color: T.cyan },
  { key: 'designer',     emoji: '🎨', label: 'Designer',            color: T.orange },
  { key: 'videographer', emoji: '🎬', label: 'Videographer',        color: T.lime },
  { key: 'manager',      emoji: '🕴🏼', label: 'Manager',             color: T.yellow },
  { key: 'ar_scout',     emoji: '🎯', label: 'A&R Scout',           color: T.red },
  { key: 'ghostwriter',  emoji: '👻', label: 'Ghostwriter',         color: T.purple },
  { key: 'developer',    emoji: '👾', label: 'Developer',           color: T.green },
];

// ============================================================================
// REFERRAL CARD — shows user's code, share buttons, stats
// Used inside ProfilePage view mode
// ============================================================================
const ReferralCard = () => {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = (() => { try { return localStorage.getItem('mcz:token'); } catch { return ''; } })();
    if (!token) { setLoading(false); return; }
    fetch('/api/referrals/my-code/', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyLink = () => {
    if (!data?.share_url) return;
    navigator.clipboard?.writeText(data.share_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareTwitter = () => {
    if (!data) return;
    const text = `i'm using Music ConnectZ — the platform for independent music creators. battles, collabs, distribution, AI tools all in one app. join with my code: ${data.code}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(data.share_url)}`, '_blank');
  };

  if (loading) return null;
  if (!data) return null;

  return (
    <Card color={T.lime} className="p-4">
      <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1.5" style={{ color: T.lime }}>
        // INVITE FRIENDZ — EARN SPINAZ + FREE MONTHZ 🎁
      </div>

      {/* Code display */}
      <div className="mb-3 p-3 rounded-xl text-center"
        style={{ background: `${T.lime}11`, border: `1px solid ${T.lime}44` }}>
        <div className="font-display text-2xl tracking-widest" style={{ color: T.lime, textShadow: `0 0 12px ${T.lime}77` }}>
          {data.code}
        </div>
        <div className="font-ui text-[10px] opacity-50 mt-1 truncate" style={{ color: T.textSec }}>
          {data.share_url}
        </div>
      </div>

      {/* Share buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button onClick={copyLink}
          className="py-2 rounded-lg font-ui text-xs tracking-widest font-bold"
          style={{
            background: copied ? T.success : `${T.lime}22`,
            color: copied ? '#000' : T.lime,
            border: `1px solid ${T.lime}55`,
          }}>
          {copied ? '✓ COPIED' : '📋 COPY LINK'}
        </button>
        <button onClick={shareTwitter}
          className="py-2 rounded-lg font-ui text-xs tracking-widest font-bold"
          style={{
            background: `${T.cyan}22`,
            color: T.cyan,
            border: `1px solid ${T.cyan}55`,
          }}>
          𝕏 TWEET
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="font-display text-lg" style={{ color: T.lime }}>{data.stats.signups}</div>
          <div className="font-ui text-[9px] opacity-60" style={{ color: T.textSec }}>SIGNUPS</div>
        </div>
        <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="font-display text-lg" style={{ color: T.cyan }}>{data.stats.premium_subs + data.stats.statz_subs}</div>
          <div className="font-ui text-[9px] opacity-60" style={{ color: T.textSec }}>SUBSCRIBED</div>
        </div>
        <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="font-display text-lg" style={{ color: T.yellow }}>{data.stats.spinaz_earned.toLocaleString()}</div>
          <div className="font-ui text-[9px] opacity-60" style={{ color: T.textSec }}>SPINAZ</div>
        </div>
      </div>

      {/* Reward hint */}
      <div className="font-ui text-[10px] opacity-70 leading-relaxed" style={{ color: T.textSec }}>
        💰 You get: <b style={{ color: T.lime }}>500 SpinaZ</b> per signup ·
        <b style={{ color: T.cyan }}> 1 month free Premium</b> when they subscribe ·
        <b style={{ color: T.yellow }}> 5,000 SpinaZ + 2 weeks free StatZ</b> if they go StatZ
      </div>
    </Card>
  );
};

// Skill database — instrumentDatabase ported from v5.7 HTML, expanded for all 8 personas
const SKILLS_DB = {
  artist: {
    'String': ['Any String 🎸','Acoustic Guitar','Electric Guitar','Bass Guitar','Ukulele','Banjo','Mandolin','Violin','Viola','Cello','Double Bass','Harp'],
    'Keyboard': ['Any Keyboard 🎹','Acoustic Piano','Digital Piano','Synthesizer','Organ','Harpsichord','Accordion'],
    'Percussion': ['Any Percussion 🥁','Snare','Bass Drum','Bongo','Cymbals','Congas','Timpani'],
    'Rapping': ['Any Rapping 🎤','Alternative Rap','Boom Bap','Chopper','Cloud Rap','Conscious','Crunk','Drill','Emo Rap','G-Funk','Gangsta','Hardcore','Jazz Rap','Mumble','Old School','Snap','Trap'],
    'Singing': ['Any Singing 🎶','Bass','Baritone','Tenor','Countertenor','Contralto','Alto','Mezzo-Soprano','Soprano'],
  },
  producer: {
    'DAWs': ['Any DAW 🎛️','Ableton Live','Adobe Audition','Audacity','Bitwig','Cubase','FL Studio','GarageBand','Logic Pro','Pro Tools','Reaper','Reason','Studio One','Azrael'],
    'Production': ['Any Production 🎚️','Beat Making','Sampling','Sound Design','Arrangement','Synthesis','Sequencing'],
  },
  engineer: {
    'DAWs': ['Any DAW 🎛️','Pro Tools','Logic Pro','Ableton Live','Studio One','Reaper','Cubase','Adobe Audition','Azrael'],
    'Engineering': ['Any Eng 🎛️','Mixing','Mastering','EQ','Compression','Reverb/FX','Stem Splitting','Vocal Tuning'],
  },
  designer: {
    'Software': ['Any Design 🎨','Photoshop','Illustrator','Figma','Canva','Affinity Designer','InDesign','Sketch','Procreate'],
    'Skills': ['Any Skill 🎨','UI/UX','Graphic Design','Branding','Typography','Color Theory','Icon Design','Album Art'],
  },
  videographer: {
    'Software': ['Any Video 🎬','Adobe Premiere','DaVinci Resolve','Final Cut Pro','Sony Vegas','Filmora','After Effects','OBS','CapCut'],
    'Skills': ['Any Skill 🎬','Editing','Color Grading','Motion Graphics','Cinematography','Drone','Lighting','Sound Design'],
  },
  manager: {
    'Business': ['Any Mgmt 🕴🏼','Artist Mgmt','Booking','Marketing','Branding','Negotiation','PR','Strategy','A&R'],
  },
  ar_scout: {
    'Scouting': ['Any Scout 🎯','Talent Spotting','Demo Review','Show Hunting','Online Discovery','Local Scene','Genre Specialist','Trend Spotting'],
    'Deals': ['Any Deal 📝','Deal Negotiation','Contract Knowledge','Royalty Splits','Advance Structuring','Distribution Deals','Sync Licensing','Publishing Deals'],
    'Roster': ['Any Roster 📋','Roster Building','Artist Development','Career Planning','Brand Strategy','Industry Connections','Label Operations'],
  },
  ghostwriter: {
    'Writing': ['Any Writing 👻','Bars','Hooks','Verses','Songwriting','Topline','Poetry','Storytelling','Concept'],
  },
  developer: {
    'Languages': ['Any Lang 👾','JavaScript','TypeScript','Python','React','Node.js','Django','Swift','Kotlin','Rust','Go'],
    'Skills': ['Any Skill 👾','Frontend','Backend','Mobile','DevOps','Database','APIs','AI/ML'],
  },
};

const PERSONAS_KEY = 'mcz:personas:v1';
const EXAMPLES_KEY = 'mcz:examples:v1';
const COLLABS_KEY  = 'mcz:collabs:v1';
const TX_KEY       = 'mcz:transactions:v1';
const RELEASES_KEY = 'mcz:releases:v1';

// K-Oth platform fee on inbound payments
const KOTH_FEE_PCT = 0.10;

const ProfilePage = ({ profile, setProfile, onOpenInfo, membership }) => {
  const [draft, setDraft] = useState(profile || EMPTY_PROFILE);
  const [editing, setEditing] = useState(!profile?.artistName);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => { if (profile) setDraft(profile); }, [profile]);

  const z = detectZodiac(draft.birthday);

  const saveIt = () => {
    setProfile(draft); save(KEYS.profile, draft);
    setEditing(false); setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const toggleGenre = (g) => setDraft(d => ({ ...d, genres: d.genres.includes(g) ? d.genres.filter(x => x !== g) : [...d.genres, g].slice(0, 5) }));

  const completion = (() => {
    let c = 0;
    if (draft.artistName) c += 20;
    if (draft.role) c += 12;
    if (draft.bio) c += 18;
    if (draft.city) c += 10;
    if (draft.birthday) c += 10;
    if (draft.genres.length) c += 15;
    if (Object.values(draft.links).some(Boolean)) c += 15;
    return c;
  })();

  const inputCls = "w-full bg-transparent outline-none font-ui text-sm px-3 py-2 rounded-lg";
  const inputStyle = { border: `1px solid ${T.borderSoft}`, color: T.white, background: T.surface };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-ui text-xs tracking-widest opacity-60" style={{ color: T.cyan }}>// PROFILE 👤</div>
          <h1 className="font-display text-2xl mt-1" style={{ color: T.cyan, textShadow: `0 0 14px ${T.cyan}66` }}>
            {editing ? 'EDIT PROFILE' : (draft.artistName || 'UNNAMED')}
          </h1>
          {!editing && draft.role && (
            <div className="font-ui text-sm opacity-80 mt-0.5" style={{ color: T.purple }}>
              {draft.role}{draft.city && ` · ${draft.city}`}
            </div>
          )}
        </div>
        <div className="flex gap-1.5">
          {!editing && <Btn onClick={() => setEditing(true)} kind="ghost"><Edit3 size={12} /> EDIT</Btn>}
          {editing && <Btn onClick={saveIt} kind="cyan"><Save size={12} strokeWidth={3} /> SAVE</Btn>}
          <button onClick={() => onOpenInfo('profile')} className="p-2 rounded-full"
            style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
            <span style={{ fontSize: 14 }}>🎙️ℹ️</span>
          </button>
        </div>
      </div>

      {savedFlash && <div className="mb-3 font-ui text-xs" style={{ color: T.success }}>✓ saved · good looks</div>}

      <Card color={completion === 100 ? T.success : T.cyan} className="p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-ui text-[10px] tracking-widest" style={{ color: completion === 100 ? T.success : T.cyan }}>PROFILE STRENGTH</span>
          <span className="font-display text-sm" style={{ color: completion === 100 ? T.success : T.cyan }}>{completion}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${completion}%`, background: completion === 100 ? T.success : T.cyan, boxShadow: `0 0 8px ${completion === 100 ? T.success : T.cyan}` }} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Card color={T.cyan} className="p-3" onClick={() => { window.location.hash = '#/profile?modal=personas'; }}>
          <div className="flex items-center justify-between">
            <span className="text-xl">🎭</span>
            <ChevronRight size={16} color={T.cyan} />
          </div>
          <div className="font-display text-[11px] mt-1.5" style={{ color: T.cyan }}>PERSONAZ</div>
          <div className="font-ui text-[9px] opacity-60 mt-0.5" style={{ color: T.textSec }}>roles + skillZ</div>
        </Card>
        <Card color={T.pink} className="p-3" onClick={() => { window.location.hash = '#/profile?modal=examples'; }}>
          <div className="flex items-center justify-between">
            <span className="text-xl">🎵</span>
            <ChevronRight size={16} color={T.pink} />
          </div>
          <div className="font-display text-[11px] mt-1.5" style={{ color: T.pink }}>EXAMPLES</div>
          <div className="font-ui text-[9px] opacity-60 mt-0.5" style={{ color: T.textSec }}>your work</div>
        </Card>
      </div>

      {editing ? (
        <div className="space-y-3">
          {/* PROFILE PIC UPLOAD */}
          <div>
            <div className="font-ui text-[10px] tracking-widest uppercase mb-1 opacity-70" style={{ color: T.purple }}>Profile Picture 📸</div>
            <div className="flex items-center gap-3">
              {draft.profilePic ? (
                <img src={draft.profilePic} alt="" className="w-16 h-16 rounded-full object-cover"
                  style={{ border: `2px solid ${T.cyan}`, boxShadow: `0 0 12px ${T.cyan}55` }} />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center font-display text-2xl"
                  style={{ background: T.surface, border: `1px dashed ${T.borderSoft}`, color: T.textMuted }}>?</div>
              )}
              <div className="flex-1">
                <FileUploader
                  accept="image/*"
                  appOrigin="profile"
                  membership={membership}
                  label="📸 Upload picture"
                  onUploaded={(rec) => setDraft({ ...draft, profilePic: rec.url })}
                  onUpgrade={() => { window.history.pushState({}, '', '/money'); window.dispatchEvent(new PopStateEvent('popstate')); }}
                />
              </div>
            </div>
          </div>
          <div>
            <div className="font-ui text-[10px] tracking-widest uppercase mb-1 opacity-70" style={{ color: T.cyan }}>Artist Name</div>
            <input className={inputCls} style={inputStyle} value={draft.artistName}
              onChange={e => setDraft({ ...draft, artistName: e.target.value })} placeholder="NEONHEART" />
          </div>
          <div>
            <div className="font-ui text-[10px] tracking-widest uppercase mb-1 opacity-70" style={{ color: T.purple }}>Real Name (private)</div>
            <input className={inputCls} style={inputStyle} value={draft.realName}
              onChange={e => setDraft({ ...draft, realName: e.target.value })} />
          </div>
          <div>
            <div className="font-ui text-[10px] tracking-widest uppercase mb-1 opacity-70" style={{ color: T.purple }}>Birthday 🎂 → unlocks ZodiacZ</div>
            <input type="date" className={inputCls} style={inputStyle} value={draft.birthday || ''}
              onChange={e => setDraft({ ...draft, birthday: e.target.value })} />
            {z && (
              <div className="mt-2 p-2.5 rounded-lg" style={{ background: T.surface, border: `1px solid ${T.purple}55` }}>
                <div className="font-display text-base" style={{ color: T.purple, textShadow: `0 0 8px ${T.purple}66` }}>
                  {z.symbol} {z.sign} {z.emoji} {zodiacRange(z)}
                </div>
                <div className="font-ui text-[10px] mt-1 opacity-70" style={{ color: T.cyan }}>
                  🤖 AI DetectZ: Based on your birthday, your ZodiacZ is {z.symbol} {z.sign} {z.emoji}.
                </div>
              </div>
            )}
            {!draft.birthday && (
              <div className="mt-2 font-ui text-[10px] opacity-60" style={{ color: T.textSec }}>
                Add your birthday to unlock ZodiacZ.
              </div>
            )}
          </div>
          <div>
            <div className="font-ui text-[10px] tracking-widest uppercase mb-1 opacity-70" style={{ color: T.pink }}>Primary Role 🎭</div>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map(r => (
                <button key={r} onClick={() => setDraft({ ...draft, role: r })}
                  className="px-2.5 py-1 rounded-md font-ui text-[11px]"
                  style={{
                    border: `1px solid ${T.pink}${draft.role === r ? 'ff' : '55'}`,
                    color: draft.role === r ? '#000' : T.pink,
                    background: draft.role === r ? T.pink : 'rgba(0,0,0,0.3)',
                    fontWeight: draft.role === r ? 700 : 500,
                  }}>{r}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="font-ui text-[10px] tracking-widest uppercase mb-1 opacity-70" style={{ color: T.purple }}>Bio 📝</div>
            <textarea rows={3} className={inputCls} style={{ ...inputStyle, resize: 'none' }} value={draft.bio}
              onChange={e => setDraft({ ...draft, bio: e.target.value })}
              placeholder="who you are, what you make — real talk" maxLength={240} />
            <div className="font-ui text-[9px] opacity-40 text-right" style={{ color: T.purple }}>{draft.bio.length}/240</div>
          </div>
          <div>
            <div className="font-ui text-[10px] tracking-widest uppercase mb-1 opacity-70" style={{ color: T.cyan }}>City 📍</div>
            <input className={inputCls} style={inputStyle} value={draft.city}
              onChange={e => setDraft({ ...draft, city: e.target.value })} placeholder="Brooklyn, NY" />
          </div>
          <div>
            <div className="font-ui text-[10px] tracking-widest uppercase mb-1 opacity-70" style={{ color: T.pink }}>Genres 🎵 ({draft.genres.length}/5)</div>
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map(g => {
                const on = draft.genres.includes(g);
                return (
                  <button key={g} onClick={() => toggleGenre(g)} disabled={!on && draft.genres.length >= 5}
                    className="px-2 py-1 rounded-md font-ui text-[11px]"
                    style={{
                      border: `1px solid ${T.pink}${on ? 'ff' : '55'}`,
                      color: on ? '#000' : T.pink,
                      background: on ? T.pink : 'rgba(0,0,0,0.3)',
                      fontWeight: on ? 700 : 500,
                      opacity: !on && draft.genres.length >= 5 ? 0.3 : 1,
                    }}>{g}</button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="font-ui text-[10px] tracking-widest uppercase mb-1 opacity-70" style={{ color: T.success }}>Links 🔗</div>
            <div className="space-y-1.5">
              {Object.keys(draft.links).map(k => (
                <input key={k} className={inputCls} style={inputStyle} value={draft.links[k]}
                  onChange={e => setDraft({ ...draft, links: { ...draft.links, [k]: e.target.value } })}
                  placeholder={`${k} url or handle`} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Referral card — top of view mode for visibility */}
          <ReferralCard />

          {z && (
            <Card color={T.purple} className="p-4">
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1.5" style={{ color: T.purple }}>// ZODIACZ ✨</div>
              <div className="font-display text-2xl" style={{ color: T.purple, textShadow: `0 0 12px ${T.purple}` }}>
                {z.symbol} {z.sign} {z.emoji}
              </div>
              <div className="font-ui text-xs mt-1 opacity-80" style={{ color: T.cyan }}>{zodiacRange(z)}</div>
              <div className="font-ui text-[10px] mt-2 opacity-60" style={{ color: T.textSec }}>
                🤖 AI DetectZ: based on your birthday.
              </div>
            </Card>
          )}
          {draft.bio && (
            <Card color={T.purple} className="p-3">
              <div className="font-ui text-[10px] tracking-widest opacity-50 mb-1" style={{ color: T.purple }}>// BIO 📝</div>
              <div className="font-ui text-sm" style={{ color: T.white }}>{draft.bio}</div>
            </Card>
          )}
          {draft.genres.length > 0 && (
            <div>
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1.5" style={{ color: T.pink }}>// GENRES 🎵</div>
              <div className="flex flex-wrap gap-1.5">
                {draft.genres.map(g => <Pill key={g} color={T.pink}>{g}</Pill>)}
              </div>
            </div>
          )}
          {Object.entries(draft.links).filter(([, v]) => v).length > 0 && (
            <div>
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1.5" style={{ color: T.success }}>// LINKS 🔗</div>
              <div className="space-y-1.5">
                {Object.entries(draft.links).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 font-ui text-sm">
                    <ExternalLink size={12} color={T.success} />
                    <span className="opacity-50" style={{ color: T.success }}>{k}:</span>
                    <span className="truncate" style={{ color: T.white }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PAGE: SETTINGZ
// ============================================================================
// ============================================================================
// LANGUAGEZ — 27 languages, v5.7 parity. Core UI strings translated.
// Brand terms (CollabZ, BattleZ, Lilith, ZodiacZ, etc.) stay as-is across langs.
// ============================================================================
const LANG_KEY = 'mcz:lang:v1';

const LANGUAGES = [
  { code: 'en', name: 'English',     native: 'English',     flag: '🇺🇸' },
  { code: 'es', name: 'Spanish',     native: 'Español',     flag: '🇪🇸' },
  { code: 'fr', name: 'French',      native: 'Français',    flag: '🇫🇷' },
  { code: 'de', name: 'German',      native: 'Deutsch',     flag: '🇩🇪' },
  { code: 'it', name: 'Italian',     native: 'Italiano',    flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese',  native: 'Português',   flag: '🇧🇷' },
  { code: 'zh', name: 'Chinese',     native: '中文',         flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese',    native: '日本語',       flag: '🇯🇵' },
  { code: 'ko', name: 'Korean',      native: '한국어',        flag: '🇰🇷' },
  { code: 'ru', name: 'Russian',     native: 'Русский',     flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic',      native: 'العربية',     flag: '🇸🇦', rtl: true },
  { code: 'hi', name: 'Hindi',       native: 'हिन्दी',         flag: '🇮🇳' },
  { code: 'tr', name: 'Turkish',     native: 'Türkçe',      flag: '🇹🇷' },
  { code: 'nl', name: 'Dutch',       native: 'Nederlands',  flag: '🇳🇱' },
  { code: 'pl', name: 'Polish',      native: 'Polski',      flag: '🇵🇱' },
  { code: 'sv', name: 'Swedish',     native: 'Svenska',     flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian',   native: 'Norsk',       flag: '🇳🇴' },
  { code: 'da', name: 'Danish',      native: 'Dansk',       flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish',     native: 'Suomi',       flag: '🇫🇮' },
  { code: 'el', name: 'Greek',       native: 'Ελληνικά',    flag: '🇬🇷' },
  { code: 'he', name: 'Hebrew',      native: 'עברית',       flag: '🇮🇱', rtl: true },
  { code: 'vi', name: 'Vietnamese',  native: 'Tiếng Việt',  flag: '🇻🇳' },
  { code: 'th', name: 'Thai',        native: 'ไทย',          flag: '🇹🇭' },
  { code: 'id', name: 'Indonesian',  native: 'Bahasa',      flag: '🇮🇩' },
  { code: 'tl', name: 'Filipino',    native: 'Filipino',    flag: '🇵🇭' },
  { code: 'cs', name: 'Czech',       native: 'Čeština',     flag: '🇨🇿' },
  { code: 'hu', name: 'Hungarian',   native: 'Magyar',      flag: '🇭🇺' },
];

// Translation dictionary — core UI strings. Brand terms (CollabZ, BattleZ etc) untranslated.
const TRANSLATIONS = {
  en: { signIn: 'Sign In', register: 'Register', guest: 'Continue as guest', email: 'Email or username', password: 'Password', createAccount: 'Create Account', signOut: 'Sign Out', save: 'Save', edit: 'Edit', add: 'Add', delete: 'Delete', cancel: 'Cancel', back: 'back', loading: 'loading…', today: 'Today', upcoming: 'Upcoming', someday: 'Someday', anytime: 'Anytime', inbox: 'Inbox', logbook: 'Logbook', trash: 'Trash', profile: 'Profile', settings: 'Settings', home: 'Home', language: 'Language', notifications: 'Notifications', privacy: 'Privacy', account: 'Account', sound: 'Sound', welcome: 'Welcome', morning: 'morning', afternoon: 'afternoon', evening: 'evening', lateNight: 'late night', casualMode: 'Casual Mode', search: 'Search', filter: 'Filter', genre: 'Genre', city: 'City', bio: 'Bio', birthday: 'Birthday', artistName: 'Artist Name', realName: 'Real Name', links: 'Links', new: 'New', open: 'Open', close: 'Close', reply: 'Reply', send: 'Send', post: 'Post' },
  es: { signIn: 'Iniciar sesión', register: 'Registrarse', guest: 'Continuar como invitado', email: 'Email o usuario', password: 'Contraseña', createAccount: 'Crear cuenta', signOut: 'Cerrar sesión', save: 'Guardar', edit: 'Editar', add: 'Añadir', delete: 'Eliminar', cancel: 'Cancelar', back: 'atrás', loading: 'cargando…', today: 'Hoy', upcoming: 'Próximo', someday: 'Algún día', anytime: 'Cualquier momento', inbox: 'Bandeja', logbook: 'Registro', trash: 'Papelera', profile: 'Perfil', settings: 'Ajustes', home: 'Inicio', language: 'Idioma', notifications: 'Notificaciones', privacy: 'Privacidad', account: 'Cuenta', sound: 'Sonido', welcome: 'Bienvenido', morning: 'mañana', afternoon: 'tarde', evening: 'noche', lateNight: 'madrugada', casualMode: 'Modo casual', search: 'Buscar', filter: 'Filtrar', genre: 'Género', city: 'Ciudad', bio: 'Bio', birthday: 'Cumpleaños', artistName: 'Nombre artístico', realName: 'Nombre real', links: 'Enlaces', new: 'Nuevo', open: 'Abrir', close: 'Cerrar', reply: 'Responder', send: 'Enviar', post: 'Publicar' },
  fr: { signIn: 'Se connecter', register: "S'inscrire", guest: 'Continuer en invité', email: 'Email ou nom', password: 'Mot de passe', createAccount: 'Créer un compte', signOut: 'Déconnexion', save: 'Sauver', edit: 'Modifier', add: 'Ajouter', delete: 'Supprimer', cancel: 'Annuler', back: 'retour', loading: 'chargement…', today: "Aujourd'hui", upcoming: 'À venir', someday: 'Un jour', anytime: 'Quand', inbox: 'Boîte', logbook: 'Journal', trash: 'Corbeille', profile: 'Profil', settings: 'Réglages', home: 'Accueil', language: 'Langue', notifications: 'Notifications', privacy: 'Vie privée', account: 'Compte', sound: 'Son', welcome: 'Bienvenue', morning: 'matin', afternoon: 'après-midi', evening: 'soir', lateNight: 'nuit', casualMode: 'Mode décontracté', search: 'Rechercher', filter: 'Filtrer', genre: 'Genre', city: 'Ville', bio: 'Bio', birthday: 'Anniversaire', artistName: 'Nom artiste', realName: 'Vrai nom', links: 'Liens', new: 'Nouveau', open: 'Ouvrir', close: 'Fermer', reply: 'Répondre', send: 'Envoyer', post: 'Poster' },
  de: { signIn: 'Anmelden', register: 'Registrieren', guest: 'Als Gast fortfahren', email: 'E-Mail oder Name', password: 'Passwort', createAccount: 'Konto erstellen', signOut: 'Abmelden', save: 'Speichern', edit: 'Bearbeiten', add: 'Hinzufügen', delete: 'Löschen', cancel: 'Abbrechen', back: 'zurück', loading: 'lädt…', today: 'Heute', upcoming: 'Bald', someday: 'Irgendwann', anytime: 'Jederzeit', inbox: 'Eingang', logbook: 'Logbuch', trash: 'Papierkorb', profile: 'Profil', settings: 'Einstellungen', home: 'Start', language: 'Sprache', notifications: 'Benachr.', privacy: 'Privatsphäre', account: 'Konto', sound: 'Sound', welcome: 'Willkommen', morning: 'Morgen', afternoon: 'Nachmittag', evening: 'Abend', lateNight: 'spät', casualMode: 'Lässig', search: 'Suchen', filter: 'Filter', genre: 'Genre', city: 'Stadt', bio: 'Bio', birthday: 'Geburtstag', artistName: 'Künstlername', realName: 'Echter Name', links: 'Links', new: 'Neu', open: 'Öffnen', close: 'Schließen', reply: 'Antworten', send: 'Senden', post: 'Posten' },
  it: { signIn: 'Accedi', register: 'Registrati', guest: 'Continua come ospite', email: 'Email o nome', password: 'Password', createAccount: 'Crea account', signOut: 'Esci', save: 'Salva', edit: 'Modifica', add: 'Aggiungi', delete: 'Elimina', cancel: 'Annulla', back: 'indietro', loading: 'caricamento…', today: 'Oggi', upcoming: 'Prossimi', someday: 'Un giorno', anytime: 'Sempre', inbox: 'Posta', logbook: 'Registro', trash: 'Cestino', profile: 'Profilo', settings: 'Impostazioni', home: 'Home', language: 'Lingua', notifications: 'Notifiche', privacy: 'Privacy', account: 'Account', sound: 'Suono', welcome: 'Benvenuto', morning: 'mattina', afternoon: 'pomeriggio', evening: 'sera', lateNight: 'notte', casualMode: 'Modo casuale', search: 'Cerca', filter: 'Filtra', genre: 'Genere', city: 'Città', bio: 'Bio', birthday: 'Compleanno', artistName: 'Nome artista', realName: 'Nome reale', links: 'Link', new: 'Nuovo', open: 'Apri', close: 'Chiudi', reply: 'Rispondi', send: 'Invia', post: 'Pubblica' },
  pt: { signIn: 'Entrar', register: 'Cadastrar', guest: 'Continuar como convidado', email: 'Email ou usuário', password: 'Senha', createAccount: 'Criar conta', signOut: 'Sair', save: 'Salvar', edit: 'Editar', add: 'Adicionar', delete: 'Excluir', cancel: 'Cancelar', back: 'voltar', loading: 'carregando…', today: 'Hoje', upcoming: 'Próximos', someday: 'Algum dia', anytime: 'Qualquer hora', inbox: 'Entrada', logbook: 'Registro', trash: 'Lixeira', profile: 'Perfil', settings: 'Ajustes', home: 'Início', language: 'Idioma', notifications: 'Notificações', privacy: 'Privacidade', account: 'Conta', sound: 'Som', welcome: 'Bem-vindo', morning: 'manhã', afternoon: 'tarde', evening: 'noite', lateNight: 'madrugada', casualMode: 'Modo casual', search: 'Buscar', filter: 'Filtrar', genre: 'Gênero', city: 'Cidade', bio: 'Bio', birthday: 'Aniversário', artistName: 'Nome artístico', realName: 'Nome real', links: 'Links', new: 'Novo', open: 'Abrir', close: 'Fechar', reply: 'Responder', send: 'Enviar', post: 'Postar' },
  zh: { signIn: '登录', register: '注册', guest: '游客模式', email: '邮箱或用户名', password: '密码', createAccount: '创建账户', signOut: '退出', save: '保存', edit: '编辑', add: '添加', delete: '删除', cancel: '取消', back: '返回', loading: '加载中…', today: '今天', upcoming: '即将', someday: '将来', anytime: '随时', inbox: '收件箱', logbook: '日志', trash: '垃圾桶', profile: '个人资料', settings: '设置', home: '首页', language: '语言', notifications: '通知', privacy: '隐私', account: '账户', sound: '声音', welcome: '欢迎', morning: '早上', afternoon: '下午', evening: '晚上', lateNight: '深夜', casualMode: '随意模式', search: '搜索', filter: '筛选', genre: '类型', city: '城市', bio: '简介', birthday: '生日', artistName: '艺名', realName: '真名', links: '链接', new: '新建', open: '打开', close: '关闭', reply: '回复', send: '发送', post: '发布' },
  ja: { signIn: 'ログイン', register: '登録', guest: 'ゲストで続行', email: 'メール / 名前', password: 'パスワード', createAccount: 'アカウント作成', signOut: 'ログアウト', save: '保存', edit: '編集', add: '追加', delete: '削除', cancel: 'キャンセル', back: '戻る', loading: '読み込み中…', today: '今日', upcoming: '今後', someday: 'いつか', anytime: 'いつでも', inbox: '受信箱', logbook: 'ログ', trash: 'ゴミ箱', profile: 'プロフィール', settings: '設定', home: 'ホーム', language: '言語', notifications: '通知', privacy: 'プライバシー', account: 'アカウント', sound: 'サウンド', welcome: 'ようこそ', morning: '朝', afternoon: '午後', evening: '夜', lateNight: '深夜', casualMode: 'カジュアル', search: '検索', filter: 'フィルター', genre: 'ジャンル', city: '街', bio: 'バイオ', birthday: '誕生日', artistName: 'アーティスト名', realName: '本名', links: 'リンク', new: '新規', open: '開く', close: '閉じる', reply: '返信', send: '送信', post: '投稿' },
  ko: { signIn: '로그인', register: '가입', guest: '게스트로 계속', email: '이메일/이름', password: '비밀번호', createAccount: '계정 만들기', signOut: '로그아웃', save: '저장', edit: '편집', add: '추가', delete: '삭제', cancel: '취소', back: '뒤로', loading: '로딩…', today: '오늘', upcoming: '예정', someday: '언젠가', anytime: '언제든', inbox: '받은편지함', logbook: '로그', trash: '휴지통', profile: '프로필', settings: '설정', home: '홈', language: '언어', notifications: '알림', privacy: '개인정보', account: '계정', sound: '소리', welcome: '환영합니다', morning: '아침', afternoon: '오후', evening: '저녁', lateNight: '심야', casualMode: '캐주얼', search: '검색', filter: '필터', genre: '장르', city: '도시', bio: '소개', birthday: '생일', artistName: '활동명', realName: '본명', links: '링크', new: '새', open: '열기', close: '닫기', reply: '답장', send: '보내기', post: '게시' },
  ru: { signIn: 'Войти', register: 'Регистрация', guest: 'Гость', email: 'Email/имя', password: 'Пароль', createAccount: 'Создать', signOut: 'Выйти', save: 'Сохранить', edit: 'Изменить', add: 'Добавить', delete: 'Удалить', cancel: 'Отмена', back: 'назад', loading: 'загрузка…', today: 'Сегодня', upcoming: 'Скоро', someday: 'Когда-то', anytime: 'Когда', inbox: 'Входящие', logbook: 'Журнал', trash: 'Корзина', profile: 'Профиль', settings: 'Настройки', home: 'Дом', language: 'Язык', notifications: 'Уведомл.', privacy: 'Приватность', account: 'Аккаунт', sound: 'Звук', welcome: 'Привет', morning: 'утро', afternoon: 'день', evening: 'вечер', lateNight: 'ночь', casualMode: 'Кэжуал', search: 'Поиск', filter: 'Фильтр', genre: 'Жанр', city: 'Город', bio: 'Био', birthday: 'ДР', artistName: 'Псевдоним', realName: 'Имя', links: 'Ссылки', new: 'Новый', open: 'Открыть', close: 'Закрыть', reply: 'Ответ', send: 'Отпр.', post: 'Пост' },
  ar: { signIn: 'تسجيل الدخول', register: 'التسجيل', guest: 'متابعة كضيف', email: 'البريد/الاسم', password: 'كلمة المرور', createAccount: 'إنشاء حساب', signOut: 'تسجيل خروج', save: 'حفظ', edit: 'تعديل', add: 'إضافة', delete: 'حذف', cancel: 'إلغاء', back: 'رجوع', loading: 'تحميل…', today: 'اليوم', upcoming: 'قادم', someday: 'يوماً', anytime: 'متى', inbox: 'الوارد', logbook: 'السجل', trash: 'المهملات', profile: 'الملف', settings: 'إعدادات', home: 'الرئيسية', language: 'اللغة', notifications: 'إشعارات', privacy: 'الخصوصية', account: 'الحساب', sound: 'الصوت', welcome: 'مرحباً', morning: 'صباح', afternoon: 'مساء', evening: 'ليل', lateNight: 'فجر', casualMode: 'عادي', search: 'بحث', filter: 'تصفية', genre: 'النوع', city: 'المدينة', bio: 'نبذة', birthday: 'الميلاد', artistName: 'الاسم الفني', realName: 'الاسم', links: 'روابط', new: 'جديد', open: 'فتح', close: 'إغلاق', reply: 'رد', send: 'إرسال', post: 'نشر' },
  hi: { signIn: 'साइन इन', register: 'रजिस्टर', guest: 'अतिथि', email: 'ईमेल/नाम', password: 'पासवर्ड', createAccount: 'खाता बनाएं', signOut: 'साइन आउट', save: 'सहेजें', edit: 'संपादित करें', add: 'जोड़ें', delete: 'हटाएं', cancel: 'रद्द', back: 'वापस', loading: 'लोड हो रहा…', today: 'आज', upcoming: 'आगामी', someday: 'कभी', anytime: 'कभी भी', inbox: 'इनबॉक्स', logbook: 'लॉग', trash: 'कचरा', profile: 'प्रोफ़ाइल', settings: 'सेटिंग्स', home: 'होम', language: 'भाषा', notifications: 'सूचनाएं', privacy: 'गोपनीयता', account: 'खाता', sound: 'ध्वनि', welcome: 'स्वागत', morning: 'सुबह', afternoon: 'दोपहर', evening: 'शाम', lateNight: 'रात', casualMode: 'सामान्य', search: 'खोज', filter: 'फ़िल्टर', genre: 'शैली', city: 'शहर', bio: 'बायो', birthday: 'जन्मदिन', artistName: 'कलाकार नाम', realName: 'असली नाम', links: 'लिंक', new: 'नया', open: 'खोलें', close: 'बंद', reply: 'जवाब', send: 'भेजें', post: 'पोस्ट' },
  tr: { signIn: 'Giriş', register: 'Kayıt', guest: 'Misafir devam', email: 'E-posta/ad', password: 'Şifre', createAccount: 'Hesap aç', signOut: 'Çıkış', save: 'Kaydet', edit: 'Düzenle', add: 'Ekle', delete: 'Sil', cancel: 'İptal', back: 'geri', loading: 'yükleniyor…', today: 'Bugün', upcoming: 'Yaklaşan', someday: 'Bir gün', anytime: 'Her zaman', inbox: 'Gelen', logbook: 'Kayıt', trash: 'Çöp', profile: 'Profil', settings: 'Ayarlar', home: 'Ana', language: 'Dil', notifications: 'Bildirim', privacy: 'Gizlilik', account: 'Hesap', sound: 'Ses', welcome: 'Hoşgeldin', morning: 'sabah', afternoon: 'öğleden', evening: 'akşam', lateNight: 'gece', casualMode: 'Rahat', search: 'Ara', filter: 'Filtre', genre: 'Tür', city: 'Şehir', bio: 'Bio', birthday: 'Doğum', artistName: 'Sahne adı', realName: 'Gerçek ad', links: 'Linkler', new: 'Yeni', open: 'Aç', close: 'Kapat', reply: 'Yanıt', send: 'Gönder', post: 'Paylaş' },
  nl: { signIn: 'Inloggen', register: 'Registreren', guest: 'Als gast', email: 'Email/naam', password: 'Wachtwoord', createAccount: 'Account maken', signOut: 'Uitloggen', save: 'Opslaan', edit: 'Bewerken', add: 'Toevoegen', delete: 'Verwijderen', cancel: 'Annuleer', back: 'terug', loading: 'laden…', today: 'Vandaag', upcoming: 'Binnenkort', someday: 'Ooit', anytime: 'Altijd', inbox: 'Inbox', logbook: 'Logboek', trash: 'Prullenbak', profile: 'Profiel', settings: 'Instellingen', home: 'Thuis', language: 'Taal', notifications: 'Meldingen', privacy: 'Privacy', account: 'Account', sound: 'Geluid', welcome: 'Welkom', morning: 'ochtend', afternoon: 'middag', evening: 'avond', lateNight: 'nacht', casualMode: 'Casual', search: 'Zoeken', filter: 'Filter', genre: 'Genre', city: 'Stad', bio: 'Bio', birthday: 'Verjaardag', artistName: 'Artiestennaam', realName: 'Echte naam', links: 'Links', new: 'Nieuw', open: 'Open', close: 'Sluit', reply: 'Antwoord', send: 'Verzend', post: 'Plaats' },
  pl: { signIn: 'Zaloguj', register: 'Rejestracja', guest: 'Jako gość', email: 'Email/imię', password: 'Hasło', createAccount: 'Utwórz konto', signOut: 'Wyloguj', save: 'Zapisz', edit: 'Edytuj', add: 'Dodaj', delete: 'Usuń', cancel: 'Anuluj', back: 'wstecz', loading: 'ładowanie…', today: 'Dziś', upcoming: 'Nadchodzące', someday: 'Kiedyś', anytime: 'Kiedykolwiek', inbox: 'Odebrane', logbook: 'Dziennik', trash: 'Kosz', profile: 'Profil', settings: 'Ustawienia', home: 'Główna', language: 'Język', notifications: 'Powiadom.', privacy: 'Prywatność', account: 'Konto', sound: 'Dźwięk', welcome: 'Witamy', morning: 'rano', afternoon: 'popołudnie', evening: 'wieczór', lateNight: 'noc', casualMode: 'Luźny', search: 'Szukaj', filter: 'Filtr', genre: 'Gatunek', city: 'Miasto', bio: 'Bio', birthday: 'Urodziny', artistName: 'Pseudonim', realName: 'Imię', links: 'Linki', new: 'Nowy', open: 'Otwórz', close: 'Zamknij', reply: 'Odpowiedz', send: 'Wyślij', post: 'Opublikuj' },
  sv: { signIn: 'Logga in', register: 'Registrera', guest: 'Som gäst', email: 'E-post/namn', password: 'Lösenord', createAccount: 'Skapa konto', signOut: 'Logga ut', save: 'Spara', edit: 'Redigera', add: 'Lägg till', delete: 'Radera', cancel: 'Avbryt', back: 'tillbaka', loading: 'laddar…', today: 'Idag', upcoming: 'Snart', someday: 'Någon dag', anytime: 'Närsomhelst', inbox: 'Inkorg', logbook: 'Logg', trash: 'Papperskorg', profile: 'Profil', settings: 'Inställningar', home: 'Hem', language: 'Språk', notifications: 'Aviseringar', privacy: 'Sekretess', account: 'Konto', sound: 'Ljud', welcome: 'Välkommen', morning: 'morgon', afternoon: 'eftermiddag', evening: 'kväll', lateNight: 'natt', casualMode: 'Avslappnad', search: 'Sök', filter: 'Filter', genre: 'Genre', city: 'Stad', bio: 'Bio', birthday: 'Födelse', artistName: 'Artistnamn', realName: 'Riktigt namn', links: 'Länkar', new: 'Ny', open: 'Öppna', close: 'Stäng', reply: 'Svara', send: 'Skicka', post: 'Posta' },
  no: { signIn: 'Logg inn', register: 'Registrer', guest: 'Som gjest', email: 'E-post/navn', password: 'Passord', createAccount: 'Lag konto', signOut: 'Logg ut', save: 'Lagre', edit: 'Rediger', add: 'Legg til', delete: 'Slett', cancel: 'Avbryt', back: 'tilbake', loading: 'laster…', today: 'I dag', upcoming: 'Snart', someday: 'En dag', anytime: 'Alltid', inbox: 'Innboks', logbook: 'Logg', trash: 'Papirkurv', profile: 'Profil', settings: 'Innstillinger', home: 'Hjem', language: 'Språk', notifications: 'Varsler', privacy: 'Personvern', account: 'Konto', sound: 'Lyd', welcome: 'Velkommen', morning: 'morgen', afternoon: 'ettermiddag', evening: 'kveld', lateNight: 'natt', casualMode: 'Casual', search: 'Søk', filter: 'Filter', genre: 'Sjanger', city: 'By', bio: 'Bio', birthday: 'Bursdag', artistName: 'Artistnavn', realName: 'Navn', links: 'Lenker', new: 'Ny', open: 'Åpne', close: 'Lukk', reply: 'Svar', send: 'Send', post: 'Post' },
  da: { signIn: 'Log ind', register: 'Registrer', guest: 'Som gæst', email: 'Email/navn', password: 'Adgangskode', createAccount: 'Opret konto', signOut: 'Log ud', save: 'Gem', edit: 'Rediger', add: 'Tilføj', delete: 'Slet', cancel: 'Annuller', back: 'tilbage', loading: 'indlæser…', today: 'I dag', upcoming: 'Snart', someday: 'En dag', anytime: 'Altid', inbox: 'Indbakke', logbook: 'Log', trash: 'Papirkurv', profile: 'Profil', settings: 'Indstillinger', home: 'Hjem', language: 'Sprog', notifications: 'Notifikationer', privacy: 'Privatliv', account: 'Konto', sound: 'Lyd', welcome: 'Velkommen', morning: 'morgen', afternoon: 'eftermiddag', evening: 'aften', lateNight: 'nat', casualMode: 'Casual', search: 'Søg', filter: 'Filter', genre: 'Genre', city: 'By', bio: 'Bio', birthday: 'Fødselsdag', artistName: 'Kunstnernavn', realName: 'Navn', links: 'Links', new: 'Ny', open: 'Åbn', close: 'Luk', reply: 'Svar', send: 'Send', post: 'Post' },
  fi: { signIn: 'Kirjaudu', register: 'Rekisteröidy', guest: 'Vieras', email: 'Sähköposti', password: 'Salasana', createAccount: 'Luo tili', signOut: 'Ulos', save: 'Tallenna', edit: 'Muokkaa', add: 'Lisää', delete: 'Poista', cancel: 'Peru', back: 'takaisin', loading: 'ladataan…', today: 'Tänään', upcoming: 'Tuleva', someday: 'Joskus', anytime: 'Milloin vain', inbox: 'Saapuneet', logbook: 'Loki', trash: 'Roska', profile: 'Profiili', settings: 'Asetukset', home: 'Koti', language: 'Kieli', notifications: 'Ilmoitukset', privacy: 'Yksityisyys', account: 'Tili', sound: 'Ääni', welcome: 'Tervetuloa', morning: 'aamu', afternoon: 'iltapäivä', evening: 'ilta', lateNight: 'yö', casualMode: 'Rento', search: 'Etsi', filter: 'Suodatin', genre: 'Tyyli', city: 'Kaupunki', bio: 'Bio', birthday: 'Synttärit', artistName: 'Taiteilijanimi', realName: 'Nimi', links: 'Linkit', new: 'Uusi', open: 'Avaa', close: 'Sulje', reply: 'Vastaa', send: 'Lähetä', post: 'Julkaise' },
  el: { signIn: 'Σύνδεση', register: 'Εγγραφή', guest: 'Επισκέπτης', email: 'Email/Όνομα', password: 'Κωδικός', createAccount: 'Νέος λογαριασμός', signOut: 'Αποσύνδεση', save: 'Αποθήκευση', edit: 'Επεξεργασία', add: 'Προσθήκη', delete: 'Διαγραφή', cancel: 'Ακύρωση', back: 'πίσω', loading: 'φόρτωση…', today: 'Σήμερα', upcoming: 'Επόμενα', someday: 'Κάποτε', anytime: 'Οποτεδήποτε', inbox: 'Εισερχόμενα', logbook: 'Αρχείο', trash: 'Κάδος', profile: 'Προφίλ', settings: 'Ρυθμίσεις', home: 'Αρχική', language: 'Γλώσσα', notifications: 'Ειδοποιήσεις', privacy: 'Ιδιωτικότητα', account: 'Λογαριασμός', sound: 'Ήχος', welcome: 'Καλώς ήρθες', morning: 'πρωί', afternoon: 'απόγευμα', evening: 'βράδυ', lateNight: 'νύχτα', casualMode: 'Χαλαρό', search: 'Αναζήτηση', filter: 'Φίλτρο', genre: 'Είδος', city: 'Πόλη', bio: 'Βιο', birthday: 'Γενέθλια', artistName: 'Καλλιτεχνικό', realName: 'Όνομα', links: 'Σύνδεσμοι', new: 'Νέο', open: 'Άνοιγμα', close: 'Κλείσιμο', reply: 'Απάντηση', send: 'Αποστολή', post: 'Δημοσίευση' },
  he: { signIn: 'התחבר', register: 'הרשמה', guest: 'כאורח', email: 'אימייל/שם', password: 'סיסמה', createAccount: 'צור חשבון', signOut: 'התנתק', save: 'שמור', edit: 'ערוך', add: 'הוסף', delete: 'מחק', cancel: 'בטל', back: 'חזור', loading: 'טוען…', today: 'היום', upcoming: 'הקרובות', someday: 'יום אחד', anytime: 'בכל עת', inbox: 'דואר נכנס', logbook: 'יומן', trash: 'אשפה', profile: 'פרופיל', settings: 'הגדרות', home: 'בית', language: 'שפה', notifications: 'התראות', privacy: 'פרטיות', account: 'חשבון', sound: 'צליל', welcome: 'ברוך הבא', morning: 'בוקר', afternoon: 'צהריים', evening: 'ערב', lateNight: 'לילה', casualMode: 'רגיל', search: 'חיפוש', filter: 'מסנן', genre: 'סגנון', city: 'עיר', bio: 'ביו', birthday: 'יום הולדת', artistName: 'שם אמן', realName: 'שם אמיתי', links: 'קישורים', new: 'חדש', open: 'פתח', close: 'סגור', reply: 'הגב', send: 'שלח', post: 'פרסם' },
  vi: { signIn: 'Đăng nhập', register: 'Đăng ký', guest: 'Tiếp tục khách', email: 'Email/tên', password: 'Mật khẩu', createAccount: 'Tạo tài khoản', signOut: 'Đăng xuất', save: 'Lưu', edit: 'Sửa', add: 'Thêm', delete: 'Xóa', cancel: 'Hủy', back: 'quay lại', loading: 'đang tải…', today: 'Hôm nay', upcoming: 'Sắp tới', someday: 'Một ngày', anytime: 'Bất cứ lúc', inbox: 'Hộp thư', logbook: 'Nhật ký', trash: 'Thùng rác', profile: 'Hồ sơ', settings: 'Cài đặt', home: 'Trang chủ', language: 'Ngôn ngữ', notifications: 'Thông báo', privacy: 'Riêng tư', account: 'Tài khoản', sound: 'Âm thanh', welcome: 'Chào mừng', morning: 'sáng', afternoon: 'chiều', evening: 'tối', lateNight: 'khuya', casualMode: 'Thường', search: 'Tìm', filter: 'Lọc', genre: 'Thể loại', city: 'Thành phố', bio: 'Bio', birthday: 'Sinh nhật', artistName: 'Nghệ danh', realName: 'Tên thật', links: 'Liên kết', new: 'Mới', open: 'Mở', close: 'Đóng', reply: 'Trả lời', send: 'Gửi', post: 'Đăng' },
  th: { signIn: 'เข้าสู่ระบบ', register: 'สมัคร', guest: 'เป็นแขก', email: 'อีเมล/ชื่อ', password: 'รหัสผ่าน', createAccount: 'สร้างบัญชี', signOut: 'ออก', save: 'บันทึก', edit: 'แก้ไข', add: 'เพิ่ม', delete: 'ลบ', cancel: 'ยกเลิก', back: 'กลับ', loading: 'กำลังโหลด…', today: 'วันนี้', upcoming: 'เร็วๆ', someday: 'สักวัน', anytime: 'เมื่อไหร่ก็ได้', inbox: 'กล่องเข้า', logbook: 'บันทึก', trash: 'ถังขยะ', profile: 'โปรไฟล์', settings: 'ตั้งค่า', home: 'หน้าหลัก', language: 'ภาษา', notifications: 'การแจ้งเตือน', privacy: 'ความเป็นส่วนตัว', account: 'บัญชี', sound: 'เสียง', welcome: 'ยินดีต้อนรับ', morning: 'เช้า', afternoon: 'บ่าย', evening: 'เย็น', lateNight: 'ดึก', casualMode: 'สบายๆ', search: 'ค้นหา', filter: 'กรอง', genre: 'แนว', city: 'เมือง', bio: 'ประวัติ', birthday: 'วันเกิด', artistName: 'ชื่อศิลปิน', realName: 'ชื่อจริง', links: 'ลิงก์', new: 'ใหม่', open: 'เปิด', close: 'ปิด', reply: 'ตอบ', send: 'ส่ง', post: 'โพสต์' },
  id: { signIn: 'Masuk', register: 'Daftar', guest: 'Sebagai tamu', email: 'Email/nama', password: 'Kata sandi', createAccount: 'Buat akun', signOut: 'Keluar', save: 'Simpan', edit: 'Edit', add: 'Tambah', delete: 'Hapus', cancel: 'Batal', back: 'kembali', loading: 'memuat…', today: 'Hari ini', upcoming: 'Akan datang', someday: 'Suatu hari', anytime: 'Kapan saja', inbox: 'Kotak masuk', logbook: 'Log', trash: 'Sampah', profile: 'Profil', settings: 'Pengaturan', home: 'Beranda', language: 'Bahasa', notifications: 'Notifikasi', privacy: 'Privasi', account: 'Akun', sound: 'Suara', welcome: 'Selamat datang', morning: 'pagi', afternoon: 'siang', evening: 'malam', lateNight: 'larut', casualMode: 'Santai', search: 'Cari', filter: 'Filter', genre: 'Genre', city: 'Kota', bio: 'Bio', birthday: 'Ultah', artistName: 'Nama artis', realName: 'Nama asli', links: 'Tautan', new: 'Baru', open: 'Buka', close: 'Tutup', reply: 'Balas', send: 'Kirim', post: 'Posting' },
  tl: { signIn: 'Mag-sign in', register: 'Magparehistro', guest: 'Bilang panauhin', email: 'Email/pangalan', password: 'Password', createAccount: 'Gumawa ng account', signOut: 'Mag-sign out', save: 'I-save', edit: 'I-edit', add: 'Magdagdag', delete: 'Tanggalin', cancel: 'Kanselahin', back: 'bumalik', loading: 'naglo-load…', today: 'Ngayon', upcoming: 'Paparating', someday: 'Balang araw', anytime: 'Kahit kailan', inbox: 'Inbox', logbook: 'Log', trash: 'Basurahan', profile: 'Profile', settings: 'Settings', home: 'Bahay', language: 'Wika', notifications: 'Notipikasyon', privacy: 'Privacy', account: 'Account', sound: 'Tunog', welcome: 'Maligayang pagdating', morning: 'umaga', afternoon: 'hapon', evening: 'gabi', lateNight: 'madaling araw', casualMode: 'Casual', search: 'Hanapin', filter: 'Filter', genre: 'Genre', city: 'Lungsod', bio: 'Bio', birthday: 'Kaarawan', artistName: 'Pangalan', realName: 'Totoong pangalan', links: 'Links', new: 'Bago', open: 'Buksan', close: 'Isara', reply: 'Sagutin', send: 'Ipadala', post: 'I-post' },
  cs: { signIn: 'Přihlásit', register: 'Registrovat', guest: 'Jako host', email: 'Email/jméno', password: 'Heslo', createAccount: 'Vytvořit účet', signOut: 'Odhlásit', save: 'Uložit', edit: 'Upravit', add: 'Přidat', delete: 'Smazat', cancel: 'Zrušit', back: 'zpět', loading: 'načítání…', today: 'Dnes', upcoming: 'Brzy', someday: 'Někdy', anytime: 'Kdykoli', inbox: 'Doručené', logbook: 'Protokol', trash: 'Koš', profile: 'Profil', settings: 'Nastavení', home: 'Domů', language: 'Jazyk', notifications: 'Upozornění', privacy: 'Soukromí', account: 'Účet', sound: 'Zvuk', welcome: 'Vítej', morning: 'ráno', afternoon: 'odpoledne', evening: 'večer', lateNight: 'noc', casualMode: 'Casual', search: 'Hledat', filter: 'Filtr', genre: 'Žánr', city: 'Město', bio: 'Bio', birthday: 'Narozeniny', artistName: 'Umělecké', realName: 'Jméno', links: 'Odkazy', new: 'Nový', open: 'Otevřít', close: 'Zavřít', reply: 'Odpovědět', send: 'Odeslat', post: 'Zveřejnit' },
  hu: { signIn: 'Belépés', register: 'Regisztráció', guest: 'Vendég', email: 'Email/név', password: 'Jelszó', createAccount: 'Fiók létrehozása', signOut: 'Kijelentkezés', save: 'Mentés', edit: 'Szerkesztés', add: 'Hozzáad', delete: 'Törlés', cancel: 'Mégse', back: 'vissza', loading: 'töltés…', today: 'Ma', upcoming: 'Hamarosan', someday: 'Egyszer', anytime: 'Bármikor', inbox: 'Beérkező', logbook: 'Napló', trash: 'Kuka', profile: 'Profil', settings: 'Beállítások', home: 'Otthon', language: 'Nyelv', notifications: 'Értesítések', privacy: 'Adatvédelem', account: 'Fiók', sound: 'Hang', welcome: 'Üdv', morning: 'reggel', afternoon: 'délután', evening: 'este', lateNight: 'éjjel', casualMode: 'Lazább', search: 'Keresés', filter: 'Szűrő', genre: 'Műfaj', city: 'Város', bio: 'Bio', birthday: 'Szülinap', artistName: 'Művésznév', realName: 'Igazi név', links: 'Linkek', new: 'Új', open: 'Megnyit', close: 'Bezár', reply: 'Válasz', send: 'Küld', post: 'Posztol' },
};

// Translation helper. Reads current language from localStorage; falls back to English.
let _currentLang = 'en';
try { _currentLang = localStorage.getItem(LANG_KEY) || navigator.language?.slice(0, 2) || 'en'; } catch {}
if (!TRANSLATIONS[_currentLang]) _currentLang = 'en';

const t = (key) => (TRANSLATIONS[_currentLang]?.[key]) || TRANSLATIONS.en[key] || key;
const setLang = (code) => {
  if (!TRANSLATIONS[code]) return;
  _currentLang = code;
  try { localStorage.setItem(LANG_KEY, code); } catch {}
  // Force re-render by triggering a hash event
  window.dispatchEvent(new HashChangeEvent('hashchange'));
};
const getLang = () => _currentLang;

const SettingZPage = ({ settings, setSettings, onOpenInfo, onLogout }) => {
  const flip = (k) => { const n = { ...settings, [k]: !settings[k] }; setSettings(n); save(KEYS.settings, n); };
  const Toggle = ({ k, label, hint }) => (
    <div className="flex items-center justify-between p-3 rounded-xl mb-2"
      style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
      <div className="flex-1">
        <div className="font-ui text-sm" style={{ color: T.white }}>{label}</div>
        {hint && <div className="font-ui text-[10px] opacity-50 mt-0.5" style={{ color: T.textSec }}>{hint}</div>}
      </div>
      <button onClick={() => flip(k)}
        className="w-11 h-6 rounded-full relative transition-all"
        style={{ background: settings[k] ? T.success : T.surface, border: `1px solid ${settings[k] ? T.success : T.borderSoft}` }}>
        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
          style={{ left: settings[k] ? 22 : 2 }} />
      </button>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-ui text-xs tracking-widest opacity-60" style={{ color: T.purple }}>// SETTINGZ ⚙️</div>
          <h1 className="font-display text-2xl mt-1" style={{ color: T.purple, textShadow: `0 0 14px ${T.purple}66` }}>
            Personalize
          </h1>
        </div>
        <button onClick={() => onOpenInfo('settingz')} className="p-2 rounded-full"
          style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
          <span style={{ fontSize: 14 }}>🎙️ℹ️</span>
        </button>
      </div>

      <div className="font-ui text-[10px] tracking-widest uppercase mb-2 opacity-70" style={{ color: T.cyan }}>// {t('language')} 🌐</div>
      <Card color={T.cyan} className="p-3 mb-2">
        <div className="font-ui text-[10px] tracking-widest opacity-60 mb-2" style={{ color: T.cyan }}>// 27 LANGUAGEZ · CURRENT: {LANGUAGES.find(l => l.code === getLang())?.flag} {LANGUAGES.find(l => l.code === getLang())?.native}</div>
        <div className="grid grid-cols-3 gap-1.5 max-h-[280px] overflow-y-auto">
          {LANGUAGES.map(l => {
            const on = getLang() === l.code;
            return (
              <button key={l.code} onClick={() => setLang(l.code)}
                className="p-2 rounded-md font-ui text-[10px] text-left"
                style={{
                  background: on ? T.cyan : 'rgba(0,0,0,0.3)',
                  color: on ? '#000' : T.textSec,
                  border: `1px solid ${on ? T.cyan : T.borderSoft}`,
                  fontWeight: on ? 700 : 500,
                }}>
                <div className="flex items-center gap-1">
                  <span style={{ fontSize: 14 }}>{l.flag}</span>
                  <span className="truncate">{l.native}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="font-ui text-[9px] mt-2 opacity-50" style={{ color: T.textSec }}>
          Core UI strings translated. Brand terms (CollabZ, BattleZ, Lilith…) stay as-is across all languages.
        </div>
      </Card>
      <Toggle k="casualMode" label={`${t('casualMode')} 💬`} hint="Swaps some standard English for everyday slang in Corey voice modals (English only)." />

      <div className="font-ui text-[10px] tracking-widest uppercase mb-2 mt-4 opacity-70" style={{ color: T.cyan }}>// Notifications</div>
      <Toggle k="notifications" label="🔔 Push Notifications" />
      <Toggle k="collabAlerts" label="💬 Collab Alerts" />
      <Toggle k="paymentAlerts" label="💰 Payment Alerts" />

      <div className="font-ui text-[10px] tracking-widest uppercase mb-2 mt-4 opacity-70" style={{ color: T.cyan }}>// Privacy</div>
      <Toggle k="shareLocation" label="📍 Share Location" hint="Used for VenueZ + local matching." />
      <Toggle k="privateMode" label="🔒 Private Mode" />

      <div className="font-ui text-[10px] tracking-widest uppercase mb-2 mt-4 opacity-70" style={{ color: T.cyan }}>// Sound</div>
      <Toggle k="soundEffects" label="🔊 Sound Effects" />
      <Toggle k="vibration" label="📳 Vibration" />

      <div className="font-ui text-[10px] tracking-widest uppercase mb-2 mt-4 opacity-70" style={{ color: T.cyan }}>// Account</div>
      <Btn onClick={onLogout} kind="danger" className="w-full !py-2.5">{t('signOut')} ✌🏽</Btn>

      <div className="font-ui text-[9px] text-center mt-6 opacity-30" style={{ color: T.cyan }}>
        MUSIC CONNECTZ · v0.32 · made with real talk
      </div>
    </div>
  );
};

// ============================================================================
// GENERIC TAB PAGE — for tabs with +sub-apps but no custom logic yet
// ============================================================================
// ============================================================================
// PERSONA MANAGER MODAL — personas + skills + examples in one modal w/ inner tabs
// ============================================================================
const PersonaManagerModal = ({ onClose, initialTab = 'personas' }) => {
  const [inner, setInner] = useState(initialTab); // 'personas' | 'examples'
  const [personas, setPersonas] = useState([]);
  const [examples, setExamples] = useState([]);
  const [showSkillPicker, setShowSkillPicker] = useState(null); // persona key being edited
  const [showAddExample, setShowAddExample] = useState(false);
  const [skillDraft, setSkillDraft] = useState({ selected: new Set(), startDate: new Date().toISOString().slice(0, 7) });
  const [exDraft, setExDraft] = useState({ title: '', desc: '', genre: '', skills: [], privacy: 'public' });

  useEffect(() => {
    load(PERSONAS_KEY, []).then(setPersonas);
    load(EXAMPLES_KEY, []).then(setExamples);
  }, []);

  const savePersonas = (next) => { setPersonas(next); save(PERSONAS_KEY, next); };
  const saveExamples = (next) => { setExamples(next); save(EXAMPLES_KEY, next); };

  const addPersona = (key) => {
    if (personas.find(p => p.key === key)) { setShowSkillPicker(key); return; }
    const p = PERSONA_TYPES.find(x => x.key === key);
    savePersonas([...personas, { key, emoji: p.emoji, label: p.label, skills: [] }]);
    setShowSkillPicker(key);
  };
  const removePersona = (key) => savePersonas(personas.filter(p => p.key !== key));
  const removeSkill = (personaKey, idx) => {
    savePersonas(personas.map(p => p.key === personaKey ? { ...p, skills: p.skills.filter((_, i) => i !== idx) } : p));
  };
  const commitSkills = () => {
    if (skillDraft.selected.size === 0) return;
    const date = skillDraft.startDate;
    savePersonas(personas.map(p => p.key === showSkillPicker
      ? { ...p, skills: [...p.skills, ...Array.from(skillDraft.selected).map(name => ({ name, startDate: date }))] }
      : p));
    setSkillDraft({ selected: new Set(), startDate: skillDraft.startDate });
    setShowSkillPicker(null);
  };

  const addExample = () => {
    if (!exDraft.title.trim() || !exDraft.desc.trim() || !exDraft.genre) return;
    saveExamples([{ id: uid(), ...exDraft, createdAt: Date.now() }, ...examples]);
    setExDraft({ title: '', desc: '', genre: '', skills: [], privacy: 'public' });
    setShowAddExample(false);
  };
  const removeExample = (id) => saveExamples(examples.filter(e => e.id !== id));

  // All earned skills across all personas (for Example skill-tag picker)
  const allEarnedSkills = personas.flatMap(p => p.skills.map(s => s.name));

  const inputCls = "w-full bg-transparent outline-none font-ui text-sm px-3 py-2 rounded-lg";
  const inputStyle = { border: `1px solid ${T.borderSoft}`, color: T.white, background: T.surface };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md h-[92vh] rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: `linear-gradient(180deg, ${T.bgMid}, ${T.bgDeep})`,
          border: `1px solid ${T.cyan}55`,
          boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 40px ${T.cyan}33`,
        }}>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b" style={{ borderColor: T.borderSoft }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎭</span>
            <h2 className="font-display text-lg" style={{ color: T.cyan, textShadow: `0 0 10px ${T.cyan}` }}>PERSONAZ</h2>
            <span className="font-ui text-[9px] tracking-widest opacity-50" style={{ color: T.textSec }}>+ examples</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full" style={{ color: T.textMuted }}><X size={20} /></button>
        </div>

        <div className="flex gap-1 px-3 pt-2 pb-1 border-b" style={{ borderColor: T.borderSoft }}>
          {[['personas','🎭 PersonaZ', personas.length],['examples','🎵 Examples', examples.length]].map(([k, label, count]) => (
            <button key={k} onClick={() => setInner(k)}
              className="flex-1 px-2 py-2 rounded-lg font-ui text-xs tracking-wide"
              style={{
                background: inner === k ? `linear-gradient(135deg, ${T.cyan}, ${T.purple})` : T.surface,
                color: inner === k ? '#000' : T.textSec,
                border: `1px solid ${inner === k ? T.cyan : T.borderSoft}`,
                fontWeight: inner === k ? 700 : 500,
              }}>{label} · {count}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {inner === 'personas' && !showSkillPicker && (
            <>
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-2" style={{ color: T.cyan }}>// ADD A PERSONA — tap one</div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PERSONA_TYPES.map(p => {
                  const owned = personas.find(x => x.key === p.key);
                  return (
                    <button key={p.key} onClick={() => addPersona(p.key)}
                      className="p-2.5 rounded-xl text-left transition-all active:scale-95"
                      style={{
                        background: owned ? `${p.color}22` : T.surface,
                        border: `1px solid ${owned ? p.color : T.borderSoft}`,
                      }}>
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{p.emoji}</span>
                        {owned && <Pill color={p.color}>{owned.skills.length} skillZ</Pill>}
                      </div>
                      <div className="font-ui text-[11px] mt-1" style={{ color: owned ? p.color : T.textSec, fontWeight: 600 }}>{p.label}</div>
                    </button>
                  );
                })}
              </div>

              {personas.length > 0 && (
                <>
                  <div className="font-ui text-[10px] tracking-widest opacity-60 mb-2" style={{ color: T.cyan }}>// YOUR PERSONAZ</div>
                  {personas.map(p => {
                    const def = PERSONA_TYPES.find(t => t.key === p.key);
                    return (
                      <Card key={p.key} color={def.color} className="p-3 mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{def.emoji}</span>
                            <span className="font-display text-sm" style={{ color: def.color }}>{def.label}</span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => setShowSkillPicker(p.key)}
                              className="px-2 py-1 rounded-md font-ui text-[10px]"
                              style={{ border: `1px solid ${def.color}`, color: def.color, background: 'rgba(0,0,0,0.3)' }}>+ skillZ</button>
                            <button onClick={() => removePersona(p.key)}
                              className="px-2 py-1 rounded-md font-ui text-[10px]"
                              style={{ border: `1px solid ${T.error}88`, color: T.error, background: 'rgba(0,0,0,0.3)' }}>✕</button>
                          </div>
                        </div>
                        {p.skills.length === 0 ? (
                          <div className="font-ui text-[11px] opacity-50" style={{ color: T.textSec }}>// no skillZ logged yet — tap + skillZ</div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {p.skills.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md font-ui text-[10px] flex items-center gap-1"
                                style={{ background: `${def.color}15`, border: `1px solid ${def.color}55`, color: def.color }}>
                                {s.name} <span className="opacity-50">· since {s.startDate}</span>
                                <button onClick={() => removeSkill(p.key, i)} className="opacity-60 hover:opacity-100">✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </>
              )}
            </>
          )}

          {inner === 'personas' && showSkillPicker && (() => {
            const p = PERSONA_TYPES.find(x => x.key === showSkillPicker);
            const db = SKILLS_DB[showSkillPicker] || {};
            return (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setShowSkillPicker(null); setSkillDraft({ selected: new Set(), startDate: skillDraft.startDate }); }}
                      className="flex items-center gap-1 font-ui text-xs opacity-70" style={{ color: p.color }}><ArrowLeft size={14} /> back</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-ui text-[10px] opacity-60" style={{ color: T.textSec }}>{skillDraft.selected.size} selected</span>
                    <Btn onClick={commitSkills} kind="cyan" disabled={skillDraft.selected.size === 0}>✓ ADD</Btn>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: p.color }}>// START DATE 📅</div>
                  <input type="month" className={inputCls} style={inputStyle}
                    value={skillDraft.startDate}
                    onChange={e => setSkillDraft({ ...skillDraft, startDate: e.target.value })} />
                </div>
                {Object.entries(db).map(([cat, skills]) => (
                  <div key={cat} className="mb-3">
                    <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1.5" style={{ color: p.color }}>// {cat.toUpperCase()}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map(s => {
                        const on = skillDraft.selected.has(s);
                        const isAny = s.startsWith('Any ');
                        return (
                          <button key={s} onClick={() => {
                            const next = new Set(skillDraft.selected);
                            on ? next.delete(s) : next.add(s);
                            setSkillDraft({ ...skillDraft, selected: next });
                          }}
                            className="px-2 py-1 rounded-md font-ui text-[10px]"
                            style={{
                              background: on ? p.color : isAny ? `${T.orange}22` : 'rgba(0,0,0,0.3)',
                              color: on ? '#000' : isAny ? T.orange : p.color,
                              border: `1px solid ${on ? p.color : isAny ? T.orange : p.color + '55'}`,
                              fontWeight: on ? 700 : 500,
                            }}>{s}</button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            );
          })()}

          {inner === 'examples' && (
            <>
              {!showAddExample ? (
                <>
                  <Btn onClick={() => setShowAddExample(true)} kind="cyan" className="w-full mb-3 !py-2.5">+ NEW EXAMPLE 🎵</Btn>
                  {examples.length === 0 ? (
                    <div className="text-center py-8 font-ui text-sm opacity-50" style={{ color: T.cyan }}>
                      // no examples yet — drop your work to unlock CollabZ posts
                    </div>
                  ) : examples.map(ex => (
                    <Card key={ex.id} color={ex.privacy === 'public' ? T.success : T.purple} className="p-3 mb-2">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="font-display text-sm" style={{ color: T.white }}>{ex.title}</div>
                          <div className="font-ui text-[10px] mt-0.5 opacity-60" style={{ color: T.textSec }}>
                            🎵 {ex.genre} · {new Date(ex.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Pill color={ex.privacy === 'public' ? T.success : T.purple}>{ex.privacy === 'public' ? '🌐 PUB' : '🔒 PRIV'}</Pill>
                          <button onClick={() => removeExample(ex.id)}
                            className="px-1.5 py-0.5 rounded-md font-ui text-[10px]"
                            style={{ border: `1px solid ${T.error}88`, color: T.error }}>✕</button>
                        </div>
                      </div>
                      <div className="font-ui text-xs mt-1" style={{ color: T.textSec }}>{ex.desc}</div>
                      {ex.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {ex.skills.map((s, i) => <span key={i} className="px-1.5 py-0.5 rounded-md font-ui text-[9px]"
                            style={{ background: `${T.cyan}15`, border: `1px solid ${T.cyan}55`, color: T.cyan }}>{s}</span>)}
                        </div>
                      )}
                    </Card>
                  ))}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => setShowAddExample(false)}
                      className="flex items-center gap-1 font-ui text-xs opacity-70" style={{ color: T.cyan }}><ArrowLeft size={14} /> back</button>
                    <Btn onClick={addExample} kind="cyan" disabled={!exDraft.title.trim() || !exDraft.desc.trim() || !exDraft.genre}>✓ SAVE</Btn>
                  </div>
                  <div className="mb-2">
                    <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.cyan }}>// TITLE *</div>
                    <input className={inputCls} style={inputStyle} value={exDraft.title}
                      onChange={e => setExDraft({ ...exDraft, title: e.target.value })} placeholder="My Latest Beat" />
                  </div>
                  <div className="mb-2">
                    <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.cyan }}>// DESCRIPTION *</div>
                    <textarea rows={2} className={inputCls} style={{ ...inputStyle, resize: 'none' }} value={exDraft.desc}
                      onChange={e => setExDraft({ ...exDraft, desc: e.target.value })} placeholder="tell us about this work…" />
                  </div>
                  <div className="mb-2">
                    <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.cyan }}>// GENRE *</div>
                    <div className="flex flex-wrap gap-1">
                      {GENRES.map(g => (
                        <button key={g} onClick={() => setExDraft({ ...exDraft, genre: g })}
                          className="px-2 py-1 rounded-md font-ui text-[10px]"
                          style={{
                            background: exDraft.genre === g ? T.pink : 'rgba(0,0,0,0.3)',
                            color: exDraft.genre === g ? '#000' : T.pink,
                            border: `1px solid ${T.pink}${exDraft.genre === g ? 'ff' : '55'}`,
                            fontWeight: exDraft.genre === g ? 700 : 500,
                          }}>{g}</button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.cyan }}>// SKILLZ USED ({exDraft.skills.length})</div>
                    {allEarnedSkills.length === 0 ? (
                      <div className="font-ui text-[11px] opacity-50" style={{ color: T.textSec }}>// add a persona + skills first</div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(allEarnedSkills)].map(s => {
                          const on = exDraft.skills.includes(s);
                          return (
                            <button key={s} onClick={() => setExDraft({ ...exDraft, skills: on ? exDraft.skills.filter(x => x !== s) : [...exDraft.skills, s] })}
                              className="px-2 py-1 rounded-md font-ui text-[10px]"
                              style={{
                                background: on ? T.cyan : 'rgba(0,0,0,0.3)',
                                color: on ? '#000' : T.cyan,
                                border: `1px solid ${T.cyan}${on ? 'ff' : '55'}`,
                                fontWeight: on ? 700 : 500,
                              }}>{s}</button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="mb-2">
                    <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.cyan }}>// PRIVACY</div>
                    <div className="flex gap-2">
                      {[['public','🌐 Public — usable in CollabZ posts'],['private','🔒 Private — only you']].map(([v, label]) => (
                        <button key={v} onClick={() => setExDraft({ ...exDraft, privacy: v })}
                          className="flex-1 px-2 py-2 rounded-lg font-ui text-[10px]"
                          style={{
                            background: exDraft.privacy === v ? (v === 'public' ? T.success : T.purple) : T.surface,
                            color: exDraft.privacy === v ? '#000' : T.textSec,
                            border: `1px solid ${exDraft.privacy === v ? (v === 'public' ? T.success : T.purple) : T.borderSoft}`,
                            fontWeight: exDraft.privacy === v ? 700 : 500,
                          }}>{label}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PAGE: COLLABZ — functional collab feed
// ============================================================================
const CollabZPage = ({ onOpenInfo, profile, membership }) => {
  const [personas, setPersonas] = useState([]);
  const [examples, setExamples] = useState([]);
  const [collabs, setCollabs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filterPersona, setFilterPersona] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [draft, setDraft] = useState({ persona: '', exampleId: '', desc: '' });

  useEffect(() => {
    load(PERSONAS_KEY, []).then(setPersonas);
    load(EXAMPLES_KEY, []).then(setExamples);
    load(COLLABS_KEY, []).then(setCollabs);
  }, []);

  const publicExamples = examples.filter(e => e.privacy === 'public');

  const postCollab = () => {
    if (!draft.persona || !draft.exampleId || !draft.desc.trim()) return;
    const persona = personas.find(p => p.key === draft.persona);
    const example = examples.find(e => e.id === draft.exampleId);
    const post = {
      id: uid(),
      personaKey: draft.persona,
      personaLabel: persona ? persona.label : draft.persona,
      personaEmoji: PERSONA_TYPES.find(p => p.key === draft.persona)?.emoji || '🎭',
      exampleId: draft.exampleId,
      exampleTitle: example ? example.title : '',
      exampleGenre: example ? example.genre : '',
      desc: draft.desc.trim(),
      author: profile?.artistName || 'Anonymous',
      city: profile?.city || '',
      createdAt: Date.now(),
    };
    const next = [post, ...collabs];
    setCollabs(next); save(COLLABS_KEY, next);
    setDraft({ persona: '', exampleId: '', desc: '' });
    setShowForm(false);
  };
  const removeCollab = (id) => { const next = collabs.filter(c => c.id !== id); setCollabs(next); save(COLLABS_KEY, next); };

  const filtered = collabs.filter(c =>
    (!filterPersona || c.personaKey === filterPersona) &&
    (!filterLocation || (c.city || '').toLowerCase().includes(filterLocation.toLowerCase()))
  );

  const inputCls = "w-full bg-transparent outline-none font-ui text-sm px-3 py-2 rounded-lg";
  const inputStyle = { border: `1px solid ${T.borderSoft}`, color: T.white, background: T.surface };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-ui text-xs tracking-widest opacity-60" style={{ color: T.purple }}>// COLLABZ 🤝</div>
            <StatusPill status="live" />
          </div>
          <h1 className="font-display text-2xl" style={{ color: T.purple, textShadow: `0 0 14px ${T.purple}66` }}>CollabZ</h1>
          <div className="font-ui text-xs mt-1 opacity-70" style={{ color: T.textSec }}>Find producers · vocalists · designers by skill + city</div>
        </div>
        <button onClick={() => onOpenInfo('collabz')} className="p-2 rounded-full shrink-0 ml-2"
          style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
          <span style={{ fontSize: 14 }}>🎙️ℹ️</span>
        </button>
      </div>

      {!showForm ? (
        <Btn onClick={() => setShowForm(true)} kind="primary" className="w-full mb-4 !py-2.5"
          disabled={personas.length === 0 || publicExamples.length === 0}>
          + POST COLLAB REQUEST 🤝
        </Btn>
      ) : (
        <Card color={T.purple} className="p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-ui text-[10px] tracking-widest" style={{ color: T.purple }}>// NEW COLLAB POST</span>
            <button onClick={() => setShowForm(false)} className="font-ui text-[10px] opacity-60" style={{ color: T.textMuted }}>cancel</button>
          </div>
          <div className="mb-2">
            <div className="font-ui text-[10px] opacity-60 mb-1" style={{ color: T.purple }}>// AS WHICH PERSONA *</div>
            <select className={inputCls} style={inputStyle} value={draft.persona}
              onChange={e => setDraft({ ...draft, persona: e.target.value })}>
              <option value="">Choose persona</option>
              {personas.map(p => <option key={p.key} value={p.key}>{PERSONA_TYPES.find(t => t.key === p.key)?.emoji} {p.label}</option>)}
            </select>
          </div>
          <div className="mb-2">
            <div className="font-ui text-[10px] opacity-60 mb-1" style={{ color: T.purple }}>// ATTACH PUBLIC EXAMPLE *</div>
            <select className={inputCls} style={inputStyle} value={draft.exampleId}
              onChange={e => setDraft({ ...draft, exampleId: e.target.value })}>
              <option value="">Choose example</option>
              {publicExamples.map(ex => <option key={ex.id} value={ex.id}>{ex.title} · {ex.genre}</option>)}
            </select>
          </div>
          <div className="mb-2">
            <div className="font-ui text-[10px] opacity-60 mb-1" style={{ color: T.purple }}>// DESCRIPTION *</div>
            <textarea rows={3} className={inputCls} style={{ ...inputStyle, resize: 'none' }}
              value={draft.desc} onChange={e => setDraft({ ...draft, desc: e.target.value })}
              placeholder="What collaboration are you looking for?" />
            <CharLimitBar text={draft.desc} membership={membership}
              onUpgrade={() => { window.history.pushState({}, '', '/money'); window.dispatchEvent(new PopStateEvent('popstate')); }} />
          </div>
          <Btn onClick={postCollab} kind="primary" className="w-full !py-2.5"
            disabled={!draft.persona || !draft.exampleId || !draft.desc.trim() || (membership?.limits?.char_limit && draft.desc.length > membership.limits.char_limit)}>📤 POST</Btn>
        </Card>
      )}

      {(personas.length === 0 || publicExamples.length === 0) && (
        <Card color={T.orange} className="p-3 mb-4">
          <div className="font-ui text-[10px] tracking-widest opacity-70 mb-1" style={{ color: T.orange }}>// HEADS UP</div>
          <div className="font-ui text-xs" style={{ color: T.textSec }}>
            You need at least one persona AND one public example to post a collab. Open Profile → PersonaZ to set both up.
          </div>
        </Card>
      )}

      <div className="font-ui text-[10px] tracking-widest opacity-60 mb-2" style={{ color: T.purple }}>// FILTER</div>
      <div className="flex gap-2 mb-3">
        <select className="flex-1 font-ui text-xs px-2 py-1.5 rounded-lg outline-none"
          style={{ background: T.surface, border: `1px solid ${T.borderSoft}`, color: T.white }}
          value={filterPersona} onChange={e => setFilterPersona(e.target.value)}>
          <option value="">All personas</option>
          {PERSONA_TYPES.map(p => <option key={p.key} value={p.key}>{p.emoji} {p.label}</option>)}
        </select>
        <input className="flex-1 font-ui text-xs px-2 py-1.5 rounded-lg outline-none"
          style={{ background: T.surface, border: `1px solid ${T.borderSoft}`, color: T.white }}
          placeholder="city/state filter" value={filterLocation}
          onChange={e => setFilterLocation(e.target.value)} />
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="font-ui text-[10px] tracking-widest opacity-60" style={{ color: T.purple }}>// FEED · {filtered.length}</span>
        {(filterPersona || filterLocation) && (
          <button onClick={() => { setFilterPersona(''); setFilterLocation(''); }}
            className="font-ui text-[10px] opacity-60" style={{ color: T.textMuted }}>clear filterZ</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card color={T.purple} className="p-4">
          <div className="text-center font-ui text-sm opacity-60" style={{ color: T.textSec }}>
            // no collab postZ {collabs.length > 0 ? 'match your filterZ' : 'yet — be the first'}
          </div>
        </Card>
      ) : filtered.map(c => (
        <Card key={c.id} color={T.purple} className="p-3 mb-2">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{c.personaEmoji}</span>
              <div>
                <div className="font-display text-sm" style={{ color: T.purple }}>{c.personaLabel}</div>
                <div className="font-ui text-[10px] opacity-60" style={{ color: T.textSec }}>
                  @{c.author}{c.city && ` · ${c.city}`} · {new Date(c.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            {c.author === (profile?.artistName || 'Anonymous') && (
              <button onClick={() => removeCollab(c.id)}
                className="px-1.5 py-0.5 rounded-md font-ui text-[10px]"
                style={{ border: `1px solid ${T.error}88`, color: T.error }}>✕</button>
            )}
          </div>
          <div className="font-ui text-sm mt-2" style={{ color: T.white }}>{c.desc}</div>
          {c.exampleTitle && (
            <div className="mt-2 p-2 rounded-lg" style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
              <div className="font-ui text-[10px] opacity-60" style={{ color: T.cyan }}>🎵 attached:</div>
              <div className="font-ui text-xs" style={{ color: T.white }}>{c.exampleTitle} · {c.exampleGenre}</div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

// ============================================================================
// PAGE: MESSAGEZ — Inbox, Outbox, Parcel Primate (AI email campaign drafter)
// ============================================================================
const MSG_INBOX_KEY  = 'mcz:msg:inbox:v1';
const MSG_OUTBOX_KEY = 'mcz:msg:outbox:v1';
const CAMPAIGN_KEY   = 'mcz:campaigns:v1';

// Seed-load some sample inbox messages first-time only so the page isn't empty
const SAMPLE_INBOX = [
  { id: 'seed1', from: '@NeonGhost',  subject: 'Beat pack collab?',          body: 'Yo — heard your last drop. Got bars ready, you got beats? Lmk.',                preview: 'Yo — heard your last drop…', at: Date.now() - 86400000 * 2, unread: true },
  { id: 'seed2', from: '@TonalLabel', subject: 'A&R interest 🎯',             body: 'Hi — I run A&R at Tonal. Your "Midnight Run" caught the team\'s attention. Open to a quick chat?', preview: 'Hi — I run A&R at Tonal…',     at: Date.now() - 86400000,     unread: true },
  { id: 'seed3', from: '@MixerMike',  subject: 'Mix revision delivered',     body: 'Sent v3 to your Outbox tab. Pulled the kick back 2dB, brightened the vocal bus. LMK.', preview: 'Sent v3 to your Outbox…',     at: Date.now() - 3600000 * 6,  unread: false },
];

const MessageZPage = ({ onOpenInfo, profile, membership }) => {
  const [inner, setInner] = useState('inbox');
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [reading, setReading] = useState(null);
  const [composeReply, setComposeReply] = useState('');

  // Parcel Primate state
  const [ppDraft, setPpDraft] = useState({ goal: '', audience: '', tone: 'hype', subject: '', body: '' });
  const [ppBusy, setPpBusy] = useState(false);
  const [ppErr, setPpErr] = useState(null);

  useEffect(() => {
    load(MSG_INBOX_KEY, null).then(v => {
      if (v === null) { setInbox(SAMPLE_INBOX); save(MSG_INBOX_KEY, SAMPLE_INBOX); }
      else setInbox(v);
    });
    load(MSG_OUTBOX_KEY, []).then(setOutbox);
    load(CAMPAIGN_KEY, []).then(setCampaigns);
  }, []);

  const saveInbox = (next) => { setInbox(next); save(MSG_INBOX_KEY, next); };
  const saveOutbox = (next) => { setOutbox(next); save(MSG_OUTBOX_KEY, next); };
  const saveCampaigns = (next) => { setCampaigns(next); save(CAMPAIGN_KEY, next); };

  const openMsg = (m) => {
    setReading(m);
    if (m.unread) saveInbox(inbox.map(x => x.id === m.id ? { ...x, unread: false } : x));
  };
  const sendReply = () => {
    if (!reading || !composeReply.trim()) return;
    const sent = { id: uid(), to: reading.from, subject: 'Re: ' + reading.subject, body: composeReply.trim(), at: Date.now() };
    saveOutbox([sent, ...outbox]);
    setComposeReply(''); setReading(null);
  };
  const deleteMsg = (id, kind) => {
    if (kind === 'inbox') saveInbox(inbox.filter(m => m.id !== id));
    else saveOutbox(outbox.filter(m => m.id !== id));
    setReading(null);
  };

  const draftCampaign = async () => {
    if (!ppDraft.goal.trim() || !ppDraft.audience.trim()) { setPpErr('Goal + audience required'); return; }
    setPpBusy(true); setPpErr(null);
    try {
      const sys = `You are Parcel Primate, the email-marketing copywriter inside Music ConnectZ. Write short, punchy, conversion-focused email campaigns. Use Corey voice — conversational, em dashes for asides, contractions, concrete details over generic hype. Return ONLY valid JSON, no markdown: {"subject": "<8 words max, scroll-stopping>", "body": "<150-250 words, plain text with line breaks, ends with a clear CTA>"}.`;
      const userMsg = `Artist: ${profile?.artistName || 'an indie artist'}\nGoal: ${ppDraft.goal}\nAudience: ${ppDraft.audience}\nTone: ${ppDraft.tone}\n\nWrite the campaign.`;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          system: sys,
          messages: [{ role: 'user', content: userMsg }],
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const text = (data.content || []).map(b => b.text || '').join('').trim();
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setPpDraft({ ...ppDraft, subject: parsed.subject || '', body: parsed.body || '' });
    } catch (e) {
      setPpErr(e.message || 'Parcel Primate slipped — try again.');
    } finally { setPpBusy(false); }
  };

  const scheduleCampaign = () => {
    if (!ppDraft.subject.trim() || !ppDraft.body.trim()) return;
    const c = { id: uid(), ...ppDraft, scheduledAt: Date.now(), status: 'queued' };
    saveCampaigns([c, ...campaigns]);
    setPpDraft({ goal: '', audience: '', tone: 'hype', subject: '', body: '' });
  };

  const removeCampaign = (id) => saveCampaigns(campaigns.filter(c => c.id !== id));

  const unread = inbox.filter(m => m.unread).length;

  const inputCls = "w-full bg-transparent outline-none font-ui text-sm px-3 py-2 rounded-lg";
  const inputStyle = { border: `1px solid ${T.borderSoft}`, color: T.white, background: T.surface };

  const innerColor = inner === 'inbox' ? T.cyan : inner === 'outbox' ? T.purple : T.green;

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-ui text-xs tracking-widest opacity-60" style={{ color: T.cyan }}>// MESSAGEZ 📨</div>
          <h1 className="font-display text-2xl mt-1" style={{ color: T.cyan, textShadow: `0 0 14px ${T.cyan}66` }}>MessageZ</h1>
        </div>
        <button onClick={() => onOpenInfo('messagez')} className="p-2 rounded-full"
          style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
          <span style={{ fontSize: 14 }}>🎙️ℹ️</span>
        </button>
      </div>

      <div className="flex gap-1 mb-4">
        {[
          ['inbox',  '📥 Inbox',          inbox.length,    unread],
          ['outbox', '📤 Outbox',         outbox.length,   0],
          ['parcel', '🐒 Parcel Primate', campaigns.length, 0],
        ].map(([k, label, count, badge]) => (
          <button key={k} onClick={() => { setInner(k); setReading(null); }}
            className="flex-1 px-2 py-2 rounded-lg font-ui text-[11px] tracking-wide relative"
            style={{
              background: inner === k ? `linear-gradient(135deg, ${innerColor}, ${innerColor}aa)` : T.surface,
              color: inner === k ? '#000' : T.textSec,
              border: `1px solid ${inner === k ? innerColor : T.borderSoft}`,
              fontWeight: inner === k ? 700 : 500,
            }}>
            {label} · {count}
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full font-ui text-[9px] flex items-center justify-center font-bold"
                style={{ background: T.error, color: '#fff' }}>{badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* INBOX */}
      {inner === 'inbox' && !reading && (
        inbox.length === 0 ? (
          <Card color={T.cyan} className="p-4"><div className="text-center font-ui text-sm opacity-60" style={{ color: T.textSec }}>// no messageZ — wait for the first drop</div></Card>
        ) : inbox.map(m => (
          <Card key={m.id} color={m.unread ? T.cyan : T.borderSoft} className="p-3 mb-2" onClick={() => openMsg(m)}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-display text-xs" style={{ color: m.unread ? T.cyan : T.textSec, fontWeight: m.unread ? 700 : 400 }}>{m.from}</span>
              <span className="font-ui text-[9px] opacity-60" style={{ color: T.textSec }}>{new Date(m.at).toLocaleString()}</span>
            </div>
            <div className="font-ui text-sm" style={{ color: m.unread ? T.white : T.textMuted, fontWeight: m.unread ? 600 : 400 }}>{m.subject}</div>
            <div className="font-ui text-xs opacity-60 mt-0.5 truncate" style={{ color: T.textSec }}>{m.preview || m.body.slice(0, 60)}…</div>
            {m.unread && <Pill color={T.cyan}>UNREAD</Pill>}
          </Card>
        ))
      )}

      {/* MESSAGE DETAIL */}
      {inner === 'inbox' && reading && (
        <Card color={T.cyan} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setReading(null)} className="flex items-center gap-1 font-ui text-xs opacity-70" style={{ color: T.cyan }}><ArrowLeft size={14} /> back</button>
            <button onClick={() => deleteMsg(reading.id, 'inbox')} className="px-1.5 py-0.5 rounded-md font-ui text-[10px]" style={{ border: `1px solid ${T.error}88`, color: T.error }}>✕ delete</button>
          </div>
          <div className="font-display text-sm mb-1" style={{ color: T.cyan }}>{reading.from}</div>
          <div className="font-ui text-[9px] opacity-60 mb-2" style={{ color: T.textSec }}>{new Date(reading.at).toLocaleString()}</div>
          <div className="font-display text-base mb-3" style={{ color: T.white }}>{reading.subject}</div>
          <div className="font-ui text-sm mb-4 leading-relaxed" style={{ color: T.textSec }}>{reading.body}</div>
          <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.cyan }}>// REPLY</div>
          <textarea rows={3} className={inputCls + ' mb-1'} style={{ ...inputStyle, resize: 'none' }}
            value={composeReply} onChange={e => setComposeReply(e.target.value)}
            placeholder="write your reply…" />
          <CharLimitBar text={composeReply} membership={membership}
            onUpgrade={() => { window.history.pushState({}, '', '/money'); window.dispatchEvent(new PopStateEvent('popstate')); }} />
          <Btn onClick={sendReply} kind="cyan" className="w-full !py-2 mt-2" disabled={!composeReply.trim() || (membership?.limits?.char_limit && composeReply.length > membership.limits.char_limit)}>📤 SEND</Btn>
        </Card>
      )}

      {/* OUTBOX */}
      {inner === 'outbox' && (
        outbox.length === 0 ? (
          <Card color={T.purple} className="p-4"><div className="text-center font-ui text-sm opacity-60" style={{ color: T.textSec }}>// nothing sent yet</div></Card>
        ) : outbox.map(m => (
          <Card key={m.id} color={T.purple} className="p-3 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="font-display text-xs" style={{ color: T.purple }}>→ {m.to}</span>
              <span className="font-ui text-[9px] opacity-60" style={{ color: T.textSec }}>{new Date(m.at).toLocaleString()}</span>
            </div>
            <div className="font-ui text-sm" style={{ color: T.white }}>{m.subject}</div>
            <div className="font-ui text-xs opacity-60 mt-1" style={{ color: T.textSec }}>{m.body}</div>
            <button onClick={() => deleteMsg(m.id, 'outbox')} className="mt-2 px-1.5 py-0.5 rounded-md font-ui text-[10px]" style={{ border: `1px solid ${T.error}88`, color: T.error }}>✕</button>
          </Card>
        ))
      )}

      {/* PARCEL PRIMATE */}
      {inner === 'parcel' && (
        <>
          <Card color={T.green} className="p-3 mb-3">
            <div className="font-ui text-xs tracking-widest mb-2 font-bold" style={{ color: T.green }}>🐒 NEW CAMPAIGN · COREY GPT DRAFTING</div>
            <div className="mb-2">
              <div className="font-ui text-[10px] opacity-60 mb-1" style={{ color: T.green }}>// CAMPAIGN GOAL *</div>
              <input className={inputCls} style={inputStyle} value={ppDraft.goal}
                onChange={e => setPpDraft({ ...ppDraft, goal: e.target.value })}
                placeholder='e.g. "Announce my new EP dropping Friday"' />
            </div>
            <div className="mb-2">
              <div className="font-ui text-[10px] opacity-60 mb-1" style={{ color: T.green }}>// AUDIENCE *</div>
              <input className={inputCls} style={inputStyle} value={ppDraft.audience}
                onChange={e => setPpDraft({ ...ppDraft, audience: e.target.value })}
                placeholder='e.g. "Mailing list — 600 fans from the last show"' />
            </div>
            <div className="mb-2">
              <div className="font-ui text-[10px] opacity-60 mb-1" style={{ color: T.green }}>// TONE</div>
              <div className="flex gap-1 flex-wrap">
                {['hype','intimate','professional','playful','urgent'].map(t => (
                  <button key={t} onClick={() => setPpDraft({ ...ppDraft, tone: t })}
                    className="px-2 py-1 rounded-md font-ui text-[10px]"
                    style={{
                      background: ppDraft.tone === t ? T.green : 'rgba(0,0,0,0.3)',
                      color: ppDraft.tone === t ? '#000' : T.green,
                      border: `1px solid ${T.green}${ppDraft.tone === t ? 'ff' : '55'}`,
                      fontWeight: ppDraft.tone === t ? 700 : 500,
                    }}>{t}</button>
                ))}
              </div>
            </div>
            <Btn onClick={draftCampaign} kind="cyan" className="w-full !py-2" disabled={ppBusy || !ppDraft.goal.trim() || !ppDraft.audience.trim()}>
              {ppBusy ? '⚡ Primate writing…' : '🐒 DRAFT WITH COREY GPT'}
            </Btn>
            {ppErr && <div className="mt-2 p-2 rounded-lg font-ui text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`, color: '#fca5a5' }}>⚠️ {ppErr}</div>}
            <div className="font-ui text-[9px] mt-1 text-center opacity-50" style={{ color: T.textSec }}>~$0.01 per draft</div>
          </Card>

          {(ppDraft.subject || ppDraft.body) && (
            <Card color={T.cyan} className="p-3 mb-3">
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1.5" style={{ color: T.cyan }}>// DRAFTED · edit before scheduling</div>
              <div className="mb-2">
                <div className="font-ui text-[10px] opacity-60 mb-1" style={{ color: T.cyan }}>SUBJECT</div>
                <input className={inputCls} style={inputStyle} value={ppDraft.subject}
                  onChange={e => setPpDraft({ ...ppDraft, subject: e.target.value })} />
              </div>
              <div className="mb-2">
                <div className="font-ui text-[10px] opacity-60 mb-1" style={{ color: T.cyan }}>BODY</div>
                <textarea rows={10} className={inputCls} style={{ ...inputStyle, resize: 'vertical', minHeight: 160 }}
                  value={ppDraft.body} onChange={e => setPpDraft({ ...ppDraft, body: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Btn onClick={scheduleCampaign} kind="cyan" className="flex-1 !py-2">📅 SCHEDULE</Btn>
                <Btn onClick={() => setPpDraft({ goal: '', audience: '', tone: 'hype', subject: '', body: '' })} kind="ghost">clear</Btn>
              </div>
            </Card>
          )}

          <div className="font-ui text-[10px] tracking-widest opacity-60 mb-2" style={{ color: T.green }}>// QUEUED CAMPAIGNZ · {campaigns.length}</div>
          {campaigns.length === 0 ? (
            <Card color={T.green} className="p-4"><div className="text-center font-ui text-sm opacity-60" style={{ color: T.textSec }}>// no campaignZ scheduled yet</div></Card>
          ) : campaigns.map(c => (
            <Card key={c.id} color={T.green} className="p-3 mb-2">
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm" style={{ color: T.green }}>{c.subject}</div>
                  <div className="font-ui text-[10px] opacity-60 mt-0.5" style={{ color: T.textSec }}>
                    🎯 {c.goal} · 👥 {c.audience} · {c.tone}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <Pill color={T.green}>QUEUED</Pill>
                  <button onClick={() => removeCampaign(c.id)} className="px-1.5 py-0.5 rounded-md font-ui text-[10px]" style={{ border: `1px solid ${T.error}88`, color: T.error }}>✕</button>
                </div>
              </div>
              <div className="font-ui text-xs mt-2 opacity-80 whitespace-pre-wrap" style={{ color: T.textSec }}>{c.body.slice(0, 200)}{c.body.length > 200 && '…'}</div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};

// ============================================================================
// PAGE: BATTLEZ — post-vs-post voting with SpinaZ stakes
// ============================================================================
const BATTLES_KEY = 'mcz:battles:v1';
const SPINAZ_KEY  = 'mcz:spinaz:v1';

const BATTLE_MODES = [
  { key: 'freestyle', label: 'Freestyle 🆓', color: T.cyan },
  { key: '1v1',       label: '1v1 🥊',       color: T.pink },
  { key: 'cypher',    label: 'Cypher 🧑‍🤝‍🧑', color: T.purple },
];

// Sim opponents — used when no real opponent is available
const SIM_OPPONENTS = [
  { name: '@NeonGhost', city: 'Brooklyn, NY', title: 'Ghost In The Machine', desc: '4 bars about being seen but ignored' },
  { name: '@PixelKid',  city: 'LA',           title: 'Late Night Drive',     desc: 'Trap with 808s, midnight energy' },
  { name: '@VioletSky', city: 'Atlanta',      title: 'Velvet Sample Flip',   desc: 'R&B vocal over a 70s soul sample' },
  { name: '@SubBass',   city: 'Detroit',      title: '140 Switch Up',        desc: 'Drill at 140 bpm w/ a beat flip' },
  { name: '@WaveTokyo', city: 'Tokyo',        title: 'Cloud J-Pop',          desc: 'Cloud rap melody over j-pop interp' },
];

const BattleZPage = ({ onOpenInfo, profile }) => {
  const [examples, setExamples] = useState([]);
  const [battles, setBattles] = useState([]);
  const [spinaz, setSpinaz] = useState(1000);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ mode: '1v1', exampleId: '', stake: 50 });

  useEffect(() => {
    load(EXAMPLES_KEY, []).then(setExamples);
    load(BATTLES_KEY, []).then(setBattles);
    load(SPINAZ_KEY, 1000).then(v => setSpinaz(typeof v === 'number' ? v : 1000));
  }, []);

  const savePersist = (nextBattles, nextSpinaz) => {
    setBattles(nextBattles); save(BATTLES_KEY, nextBattles);
    if (nextSpinaz !== undefined) { setSpinaz(nextSpinaz); save(SPINAZ_KEY, nextSpinaz); }
  };

  const publicExamples = examples.filter(e => e.privacy === 'public');

  // Helper: get a 5-dim AI rating for an entry (uses backend proxy if wired, else direct).
  // Returns scores normalized to /10 scale.
  const rateEntry = async ({ title, genre, description, skills = [] }) => {
    try {
      let parsed;
      if (isBackendConfigured() && getToken()) {
        parsed = await aiClient.rate({ exampleId: null, title, genre, description, skills });
      } else {
        const sys = `You are RateZ inside Music ConnectZ scoring a BattleZ entry. Score the work 0-100 on five dimensions. Respond with ONLY valid JSON: {"audioQuality": <0-100>, "visualImpact": <0-100>, "creativity": <0-100>, "engagement": <0-100>, "overall": <0-100>, "verdict": "<one short Corey-voice line>"}.`;
        const userMsg = `Title: ${title}\nGenre: ${genre}\nDescription: ${description}\nSkills: ${skills.join(', ') || 'n/a'}`;
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 400, system: sys,
            messages: [{ role: 'user', content: userMsg }],
          }),
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        const text = (data.content || []).map(b => b.text || '').join('').trim();
        parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      }
      // Normalize to /10 scale, compute average of 5 dimensions
      const dims = {
        audio: parsed.audioQuality / 10,
        visual: parsed.visualImpact / 10,
        creativity: parsed.creativity / 10,
        engagement: parsed.engagement / 10,
        overall: parsed.overall / 10,
      };
      const avg = (dims.audio + dims.visual + dims.creativity + dims.engagement + dims.overall) / 5;
      return { ...dims, avg: Number(avg.toFixed(1)), verdict: parsed.verdict || '' };
    } catch (e) {
      // On failure, return a randomized fallback so battle still resolves
      const dims = ['audio','visual','creativity','engagement','overall'].reduce((acc, k) => {
        acc[k] = Number((5 + Math.random() * 4).toFixed(1)); return acc;
      }, {});
      const avg = Object.values(dims).reduce((a, b) => a + b, 0) / 5;
      return { ...dims, avg: Number(avg.toFixed(1)), verdict: '(AI scoring unavailable — fallback rating)' };
    }
  };

  const createBattle = async () => {
    const ex = examples.find(e => e.id === draft.exampleId);
    if (!ex) return;
    const stake = parseInt(draft.stake) || 0;
    if (stake > spinaz || stake < 10) return;
    const opp = SIM_OPPONENTS[Math.floor(Math.random() * SIM_OPPONENTS.length)];

    // Insert battle as 'rating' status first so UI shows the loading state
    const pendingId = uid();
    const pending = {
      id: pendingId, mode: draft.mode, stake, pot: stake * 2,
      mine: { author: profile?.artistName || 'You', city: profile?.city || '', title: ex.title, desc: ex.desc, genre: ex.genre, rating: null },
      opp:  { author: opp.name, city: opp.city, title: opp.title, desc: opp.desc, genre: ex.genre, rating: null },
      status: 'rating', createdAt: Date.now(),
    };
    savePersist([pending, ...battles], spinaz - stake);
    setShowForm(false);
    setDraft({ mode: '1v1', exampleId: '', stake: 50 });

    // Score both entries in parallel
    const [mineR, oppR] = await Promise.all([
      rateEntry({ title: ex.title, genre: ex.genre, description: ex.desc, skills: ex.skills || [] }),
      rateEntry({ title: opp.title, genre: ex.genre, description: opp.desc, skills: [] }),
    ]);

    const winner = mineR.avg > oppR.avg ? 'won' : mineR.avg < oppR.avg ? 'lost' : 'tie';
    let payout = 0;
    if (winner === 'won') payout = Math.floor(pending.pot * (1 - KOTH_FEE_PCT));
    else if (winner === 'tie') payout = stake;

    setBattles(prev => {
      const next = prev.map(b => b.id === pendingId ? {
        ...b, status: winner,
        mine: { ...b.mine, rating: mineR },
        opp:  { ...b.opp,  rating: oppR  },
      } : b);
      save(BATTLES_KEY, next);
      return next;
    });
    if (payout > 0) {
      setSpinaz(s => { const nx = s + payout; save(SPINAZ_KEY, nx); return nx; });
    }
  };

  const removeBattle = (id) => savePersist(battles.filter(b => b.id !== id), undefined);

  // Apply user rating to a side. score = 1-10.
  const userRate = (battleId, side, score) => {
    setBattles(prev => {
      const next = prev.map(b => {
        if (b.id !== battleId) return b;
        const ratings = { ...(b.userRatings || { mine: [], opp: [] }) };
        ratings[side] = [...(ratings[side] || []), score];
        const updated = { ...b, userRatings: ratings };
        // Recompute winner factoring in user ratings (50/50 with Corey)
        if (b.mine?.rating && b.opp?.rating) {
          const mineUserAvg = ratings.mine.length ? ratings.mine.reduce((a, b) => a + b, 0) / ratings.mine.length : null;
          const oppUserAvg  = ratings.opp.length  ? ratings.opp.reduce((a, b) => a + b, 0) / ratings.opp.length  : null;
          const mineCombined = mineUserAvg !== null ? (b.mine.rating.avg + mineUserAvg) / 2 : b.mine.rating.avg;
          const oppCombined  = oppUserAvg  !== null ? (b.opp.rating.avg  + oppUserAvg)  / 2 : b.opp.rating.avg;
          updated.finalMine = Number(mineCombined.toFixed(1));
          updated.finalOpp  = Number(oppCombined.toFixed(1));
          // Only flip status if user ratings tip it the other way
          const newStatus = mineCombined > oppCombined ? 'won' : mineCombined < oppCombined ? 'lost' : 'tie';
          updated.status = newStatus;
        }
        return updated;
      });
      save(BATTLES_KEY, next);
      return next;
    });
  };

  const inputCls = "w-full bg-transparent outline-none font-ui text-sm px-3 py-2 rounded-lg";
  const inputStyle = { border: `1px solid ${T.borderSoft}`, color: T.white, background: T.surface };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-ui text-xs tracking-widest opacity-60" style={{ color: T.red }}>// BATTLEZ 🪖</div>
            <StatusPill status="live" />
          </div>
          <h1 className="font-display text-2xl" style={{ color: T.red, textShadow: `0 0 14px ${T.red}66` }}>BattleZ</h1>
          <div className="font-ui text-xs mt-1 opacity-70" style={{ color: T.textSec }}>
            1v1 · cyphers · freestyle · stakes in SpinaZ · AI + community judged
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Card color={T.cyan} className="px-2 py-1">
            <div className="font-display text-sm" style={{ color: T.cyan }}>🪙 {spinaz}</div>
            <div className="font-ui text-[8px] opacity-60" style={{ color: T.textSec }}>spinaZ</div>
          </Card>
          <button onClick={() => onOpenInfo('battlez')} className="p-2 rounded-full"
            style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
            <span style={{ fontSize: 14 }}>🎙️ℹ️</span>
          </button>
        </div>
      </div>

      {/* HOW IT WORKS — 3-step explainer */}
      {battles.length === 0 && !showForm && (
        <Card color={T.red} className="p-3 mb-3">
          <div className="font-ui text-[10px] tracking-widest opacity-60 mb-2" style={{ color: T.red }}>// HOW IT WORKS</div>
          <div className="space-y-2 font-ui text-xs" style={{ color: T.textSec }}>
            <div className="flex gap-2"><span style={{ color: T.red, fontWeight: 800 }}>1.</span><span>Pick a public example from your Profile · stake SpinaZ</span></div>
            <div className="flex gap-2"><span style={{ color: T.red, fontWeight: 800 }}>2.</span><span>Opponents submit entries · 50% AI rating · 50% community votes</span></div>
            <div className="flex gap-2"><span style={{ color: T.red, fontWeight: 800 }}>3.</span><span>Winner takes the pot · loser earns Hardcourt points (rematch leverage)</span></div>
          </div>
        </Card>
      )}

      {publicExamples.length === 0 && !showForm && (
        <Card color={T.orange} className="p-3 mb-3">
          <div className="flex items-start gap-2">
            <span className="text-base shrink-0">⚠️</span>
            <div className="font-ui text-xs leading-relaxed" style={{ color: T.textSec }}>
              <b style={{ color: T.orange }}>You need a public example to battle.</b><br/>
              Profile → Examples → add work + set to public. Then come back.
            </div>
          </div>
        </Card>
      )}

      {!showForm ? (
        <Btn onClick={() => setShowForm(true)} kind="primary" className="w-full mb-4 !py-2.5"
          disabled={publicExamples.length === 0}>+ START BATTLE 🪖</Btn>
      ) : (
        <Card color={T.red} className="p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-ui text-[10px] tracking-widest" style={{ color: T.red }}>// NEW BATTLE</span>
            <button onClick={() => setShowForm(false)} className="font-ui text-[10px] opacity-60" style={{ color: T.textMuted }}>cancel</button>
          </div>
          <div className="mb-2">
            <div className="font-ui text-[10px] opacity-60 mb-1" style={{ color: T.red }}>// MODE</div>
            <div className="flex gap-1">
              {BATTLE_MODES.map(m => (
                <button key={m.key} onClick={() => setDraft({ ...draft, mode: m.key })}
                  className="flex-1 px-2 py-1.5 rounded-md font-ui text-[10px]"
                  style={{
                    background: draft.mode === m.key ? m.color : 'rgba(0,0,0,0.3)',
                    color: draft.mode === m.key ? '#000' : m.color,
                    border: `1px solid ${m.color}${draft.mode === m.key ? 'ff' : '55'}`,
                    fontWeight: draft.mode === m.key ? 700 : 500,
                  }}>{m.label}</button>
              ))}
            </div>
          </div>
          <div className="mb-2">
            <div className="font-ui text-[10px] opacity-60 mb-1" style={{ color: T.red }}>// YOUR ENTRY (public example) *</div>
            <select className={inputCls} style={inputStyle} value={draft.exampleId}
              onChange={e => setDraft({ ...draft, exampleId: e.target.value })}>
              <option value="">Choose example</option>
              {publicExamples.map(ex => <option key={ex.id} value={ex.id}>{ex.title} · {ex.genre}</option>)}
            </select>
          </div>
          <div className="mb-2">
            <div className="font-ui text-[10px] opacity-60 mb-1" style={{ color: T.red }}>// STAKE 🪙 (you have {spinaz})</div>
            <input type="number" min="10" max={spinaz} className={inputCls} style={inputStyle} value={draft.stake}
              onChange={e => setDraft({ ...draft, stake: e.target.value })} />
            <div className="font-ui text-[9px] mt-1 opacity-70" style={{ color: T.cyan }}>
              Win → pot {(parseInt(draft.stake) || 0) * 2} minus K-Oth 10% = +{Math.floor(((parseInt(draft.stake) || 0) * 2) * (1 - KOTH_FEE_PCT))} 🪙
            </div>
          </div>
          <Btn onClick={createBattle} kind="primary" className="w-full !py-2"
            disabled={!draft.exampleId || (parseInt(draft.stake) || 0) > spinaz || (parseInt(draft.stake) || 0) < 10}>🪖 LOCK IN</Btn>
        </Card>
      )}

      {publicExamples.length === 0 && (
        <Card color={T.orange} className="p-3 mb-4">
          <div className="font-ui text-xs" style={{ color: T.textSec }}>
            Need at least one <strong style={{ color: T.orange }}>public example</strong>. Profile → 🎵 Examples.
          </div>
        </Card>
      )}

      <div className="font-ui text-[10px] tracking-widest opacity-60 mb-2" style={{ color: T.red }}>// BATTLE FEED · {battles.length}</div>
      {battles.length === 0 ? (
        <Card color={T.red} className="p-4">
          <div className="text-center font-ui text-sm opacity-60" style={{ color: T.textSec }}>// no battleZ yet</div>
        </Card>
      ) : battles.slice(0, 20).map(b => {
        const mode = BATTLE_MODES.find(m => m.key === b.mode);
        const isRating = b.status === 'rating';
        const myWin = b.status === 'won';
        const myLose = b.status === 'lost';
        const isTie = b.status === 'tie';
        const settled = myWin || myLose || isTie;
        return (
          <Card key={b.id} color={mode.color} className="p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <Pill color={mode.color}>{mode.label}</Pill>
              <div className="flex items-center gap-1.5">
                <span className="font-ui text-[10px]" style={{ color: T.cyan }}>🪙 pot {b.pot}</span>
                {isRating && <Pill color={T.cyan}>⚡ Corey scoring…</Pill>}
                {settled && <Pill color={myWin ? T.success : myLose ? T.error : T.yellow}>{myWin ? '✓ WON' : myLose ? '✗ LOST' : '· TIE'}</Pill>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {['mine', 'opp'].map(side => {
                const p = b[side];
                const isWinner = settled && ((side === 'mine' && myWin) || (side === 'opp' && myLose));
                const r = p.rating;
                const userScores = b.userRatings?.[side] || [];
                const userAvg = userScores.length ? Number((userScores.reduce((a, b) => a + b, 0) / userScores.length).toFixed(1)) : null;
                const finalScore = side === 'mine' ? b.finalMine : b.finalOpp;
                return (
                  <div key={side}
                    className="p-2 rounded-lg"
                    style={{
                      background: isWinner ? `${T.success}22` : T.surface,
                      border: `1px solid ${isWinner ? T.success : T.borderSoft}`,
                    }}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="font-ui text-[9px] opacity-60" style={{ color: T.textSec }}>{side === 'mine' ? '🪖 YOU' : '⚔️ OPP'}</div>
                      {r && (
                        <div className="font-display text-base" style={{ color: isWinner ? T.success : mode.color, textShadow: `0 0 6px ${isWinner ? T.success : mode.color}66` }}>
                          {finalScore ?? r.avg}<span className="font-ui text-[10px] opacity-50">/10</span>
                        </div>
                      )}
                    </div>
                    <div className="font-display text-xs truncate" style={{ color: T.white }}>{p.title}</div>
                    <div className="font-ui text-[10px] opacity-60 mt-0.5 truncate" style={{ color: T.textSec }}>{p.author}{p.city && ` · ${p.city}`}</div>
                    {isRating && !r && (
                      <div className="font-ui text-[10px] mt-1 opacity-60 animate-pulse" style={{ color: T.cyan }}>scoring…</div>
                    )}
                    {r && (
                      <>
                        <div className="mt-1.5 space-y-0.5">
                          {[['🎧', r.audio],['🖼️', r.visual],['✨', r.creativity],['🔥', r.engagement]].map(([em, v], i) => (
                            <div key={i} className="flex items-center justify-between font-ui text-[9px]" style={{ color: T.textSec }}>
                              <span>{em}</span>
                              <span style={{ color: isWinner ? T.success : T.textMuted }}>{v.toFixed(1)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t" style={{ borderColor: T.borderSoft }}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-ui text-[9px] opacity-60" style={{ color: T.cyan }}>🎙️ Corey</span>
                            <span className="font-ui text-[9px]" style={{ color: T.cyan }}>{r.avg}/10</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-ui text-[9px] opacity-60" style={{ color: T.pink }}>👥 UserZ ({userScores.length})</span>
                            <span className="font-ui text-[9px]" style={{ color: T.pink }}>{userAvg !== null ? `${userAvg}/10` : '—'}</span>
                          </div>
                          <div className="mt-1 flex gap-0.5 justify-end">
                            {[2, 4, 6, 8, 10].map(score => (
                              <button key={score} onClick={() => userRate(b.id, side, score)}
                                className="font-ui text-[9px] px-1 py-0.5 rounded"
                                style={{
                                  background: 'rgba(0,0,0,0.3)',
                                  border: `1px solid ${T.pink}55`,
                                  color: T.pink,
                                }}>{score}</button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {b.mine?.rating?.verdict && (
              <div className="p-1.5 rounded-md font-ui text-[10px] mb-1" style={{ background: T.surface, border: `1px solid ${T.borderSoft}`, color: T.textSec }}>
                🎙️ {b.mine.rating.verdict}
              </div>
            )}
            {isRating && (
              <div className="font-ui text-[10px] text-center opacity-60" style={{ color: T.cyan }}>Corey GPT scoring both entries on 5 dimensions · winner = higher avg /10</div>
            )}
            <button onClick={() => removeBattle(b.id)} className="mt-1 ml-auto block px-1.5 py-0.5 rounded-md font-ui text-[10px]"
              style={{ border: `1px solid ${T.error}55`, color: T.error }}>✕ remove</button>
          </Card>
        );
      })}
    </div>
  );
};

// ============================================================================
// PAGE: RATEZ — Corey GPT 5-dim scoring (uses backend /api/ai/rate/ when wired)
// ============================================================================
const RATINGS_KEY = 'mcz:ratings:v1';

const RateZPage = ({ onOpenInfo }) => {
  const [examples, setExamples] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [picked, setPicked] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    load(EXAMPLES_KEY, []).then(setExamples);
    load(RATINGS_KEY, []).then(setRatings);
  }, []);

  const askCorey = async () => {
    const ex = examples.find(e => e.id === picked);
    if (!ex) return;
    setBusy(true); setErr(null);
    try {
      let parsed;
      // Prefer backend proxy if configured + logged in (keeps API key server-side)
      if (isBackendConfigured() && getToken()) {
        parsed = await aiClient.rate({
          exampleId: ex.id, title: ex.title, genre: ex.genre,
          description: ex.desc, skills: ex.skills,
        });
      } else {
        // Fallback to direct Anthropic call (dev / demo mode)
        const sys = `You are RateZ, the AI media scoring engine inside Music ConnectZ. Given a description of a music/art work, score it 0-100 on five dimensions. Respond with ONLY valid JSON, no markdown, no preamble. Format: {"audioQuality": <0-100>, "visualImpact": <0-100>, "creativity": <0-100>, "engagement": <0-100>, "overall": <0-100>, "verdict": "<2-sentence Corey-voice critique — em dashes welcome>"}. Score honestly based on the description, genre, and skills used.`;
        const userMsg = `Title: ${ex.title}\nGenre: ${ex.genre}\nDescription: ${ex.desc}\nSkills used: ${ex.skills.join(', ') || 'none'}`;
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 600, system: sys,
            messages: [{ role: 'user', content: userMsg }],
          }),
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        const text = (data.content || []).map(b => b.text || '').join('').trim();
        parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      }
      const rating = { id: uid(), exampleId: ex.id, title: ex.title, genre: ex.genre, ...parsed, at: Date.now() };
      const next = [rating, ...ratings].slice(0, 20);
      setRatings(next); save(RATINGS_KEY, next);
      setPicked('');
    } catch (e) {
      setErr(e.message || 'Corey tripped on the JSON — try again.');
    } finally { setBusy(false); }
  };

  const removeRating = (id) => { const next = ratings.filter(r => r.id !== id); setRatings(next); save(RATINGS_KEY, next); };

  const inputCls = "w-full bg-transparent outline-none font-ui text-sm px-3 py-2 rounded-lg";
  const inputStyle = { border: `1px solid ${T.borderSoft}`, color: T.white, background: T.surface };

  const StarBar = ({ score, color }) => {
    const stars = Math.round(score / 20);
    return (
      <div className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map(i => (
          <span key={i} style={{ color: i < stars ? color : 'rgba(255,255,255,0.15)', fontSize: 13 }}>★</span>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-ui text-xs tracking-widest opacity-60" style={{ color: T.yellow }}>// RATEZ ⭐</div>
          <h1 className="font-display text-2xl mt-1" style={{ color: T.yellow, textShadow: `0 0 14px ${T.yellow}66` }}>RateZ</h1>
          <div className="font-ui text-xs mt-1 opacity-70" style={{ color: T.textSec }}>AI media ratings via Corey GPT</div>
        </div>
        <button onClick={() => onOpenInfo('ratez')} className="p-2 rounded-full"
          style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
          <span style={{ fontSize: 14 }}>🎙️ℹ️</span>
        </button>
      </div>

      <Card color={T.yellow} className="p-3 mb-4">
        <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.yellow }}>// SCORE AN EXAMPLE</div>
        {examples.length === 0 ? (
          <div className="font-ui text-xs mt-1" style={{ color: T.textSec }}>// no examples — Profile → 🎵 Examples</div>
        ) : (
          <>
            <select className={inputCls} style={inputStyle} value={picked}
              onChange={e => setPicked(e.target.value)}>
              <option value="">Pick an example</option>
              {examples.map(ex => <option key={ex.id} value={ex.id}>{ex.title} · {ex.genre}</option>)}
            </select>
            <Btn onClick={askCorey} kind="cyan" className="w-full mt-2 !py-2"
              disabled={!picked || busy}>{busy ? '⚡ Corey scoring…' : '⭐ ASK COREY GPT TO SCORE'}</Btn>
            <div className="font-ui text-[9px] mt-1 text-center opacity-50" style={{ color: T.textSec }}>
              {isBackendConfigured() && getToken() ? '✓ routing via backend proxy (key safe)' : '~$0.01 per rating · direct API'}
            </div>
          </>
        )}
        {err && (
          <div className="mt-2 p-2 rounded-lg font-ui text-xs"
            style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`, color: '#fca5a5' }}>⚠️ {err}</div>
        )}
      </Card>

      <div className="font-ui text-[10px] tracking-widest opacity-60 mb-2" style={{ color: T.yellow }}>// PAST RATINGZ · {ratings.length}</div>
      {ratings.length === 0 ? (
        <Card color={T.yellow} className="p-4">
          <div className="text-center font-ui text-sm opacity-60" style={{ color: T.textSec }}>// nothing rated yet</div>
        </Card>
      ) : ratings.map(r => {
        const overallColor = r.overall >= 85 ? T.success : r.overall >= 70 ? T.yellow : r.overall >= 50 ? T.orange : T.error;
        const dims = [
          ['Audio',      r.audioQuality, '🎧'],
          ['Visual',     r.visualImpact, '🖼️'],
          ['Creativity', r.creativity,   '✨'],
          ['Engagement', r.engagement,   '🔥'],
        ];
        return (
          <Card key={r.id} color={overallColor} className="p-3 mb-2">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm" style={{ color: overallColor }}>{r.title}</div>
                <div className="font-ui text-[10px] opacity-60" style={{ color: T.textSec }}>{r.genre} · {new Date(r.at).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="text-right">
                  <div className="font-display text-2xl" style={{ color: overallColor, textShadow: `0 0 10px ${overallColor}` }}>{r.overall}</div>
                  <div className="font-ui text-[8px] opacity-60" style={{ color: T.textSec }}>OVERALL</div>
                </div>
                <button onClick={() => removeRating(r.id)} className="px-1.5 py-0.5 rounded-md font-ui text-[10px]"
                  style={{ border: `1px solid ${T.error}88`, color: T.error }}>✕</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {dims.map(([label, score, em]) => (
                <div key={label} className="flex items-center justify-between p-1.5 rounded-md" style={{ background: T.surface }}>
                  <span className="font-ui text-[10px] flex items-center gap-1" style={{ color: T.textSec }}>{em} {label}</span>
                  <div className="flex items-center gap-1.5">
                    <StarBar score={score} color={overallColor} />
                    <span className="font-ui text-[10px] opacity-70" style={{ color: T.textSec }}>{score}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 rounded-lg" style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
              <div className="font-ui text-[9px] tracking-widest opacity-60 mb-1" style={{ color: overallColor }}>// AI VERDICT 🎙️</div>
              <div className="font-ui text-xs leading-relaxed" style={{ color: T.white }}>{r.verdict}</div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// ============================================================================
// MONEYZ PAGE — Stripe Checkout for Premium / StatZ + SpinaZ purchases
// Built for Prompt 2 of 7 (paying-member viability path)
// ============================================================================
const PRICING = {
  premium: {
    monthly: { price: 10, label: '$10/mo', billed: 'monthly' },
    annual:  { price: 90, label: '$90/yr', billed: 'annually · save $30' },
  },
  statz: {
    monthly: { price: 5,  label: '$5/mo',  billed: 'monthly · on top of Premium' },
    annual:  { price: 40, label: '$40/yr', billed: 'annually · save $20' },
  },
};

const PlanCard = ({ tier, billing, current, recommended, onSubscribe, busy }) => {
  const p = PRICING[tier][billing];
  const color = tier === 'statz' ? T.pink : T.cyan;
  const accent = tier === 'statz' ? T.orange : T.lime;
  const tierEmoji = tier === 'statz' ? '📈' : '🥇';
  const tierLabel = tier === 'statz' ? 'StatZ' : 'Premium';

  return (
    <Card color={color} className="p-4 relative">
      {recommended && (
        <div className="absolute -top-2 right-3 px-2 py-0.5 rounded-full font-ui text-[9px] tracking-widest"
          style={{ background: `linear-gradient(135deg, ${accent}, ${color})`, color: '#000', fontWeight: 800 }}>
          BEST VALUE
        </div>
      )}
      <div className="flex items-baseline justify-between mb-2">
        <div className="font-display text-xl" style={{ color, textShadow: `0 0 10px ${color}55` }}>
          {tierEmoji} {tierLabel}
        </div>
        <div className="text-right">
          <div className="font-display text-2xl" style={{ color: '#fff' }}>${p.price}</div>
          <div className="font-ui text-[10px] opacity-60" style={{ color: T.textSec }}>{p.billed}</div>
        </div>
      </div>
      <div className="font-ui text-[11px] leading-relaxed mb-3" style={{ color: T.textSec }}>
        {tier === 'premium' ? (
          <>
            <div>✓ 4,000 char limit (10× free)</div>
            <div>✓ 400mb per upload · 5gb storage</div>
            <div>✓ 5% developer tax (vs 10% free)</div>
            <div>✓ Unlimited DistributeZ submissions</div>
            <div>✓ Unlimited ToolZ + DawZ usage</div>
            <div>✓ Incognito mode + custom themes</div>
            <div>✓ Can create LabelZ + sell record deals</div>
          </>
        ) : (
          <>
            <div>✓ 40,000 char limit (100× free)</div>
            <div>✓ 4gb per upload · 100gb storage</div>
            <div>✓ 3% developer tax (lowest)</div>
            <div>✓ AI CallZ (talk to Corey by voice)</div>
            <div>✓ Automations (OCC works autonomously)</div>
            <div>✓ SuggestionZ (AI proposes tasks)</div>
            <div>✓ Clean ConnectZ AI device cleaner</div>
            <div>✓ Sell your apps/UGC to other creators</div>
          </>
        )}
      </div>
      {current ? (
        <button disabled className="w-full py-2 rounded-lg font-ui text-xs tracking-widest"
          style={{ background: T.surface, color: T.textMuted, border: `1px solid ${T.borderSoft}` }}>
          ✓ YOUR CURRENT PLAN
        </button>
      ) : (
        <button onClick={() => onSubscribe(tier, billing === 'annual')} disabled={busy}
          className="w-full py-2.5 rounded-lg font-ui text-xs tracking-widest"
          style={{
            background: `linear-gradient(135deg, ${color}, ${accent})`,
            color: '#000', fontWeight: 800, opacity: busy ? 0.5 : 1,
            boxShadow: `0 0 16px ${color}55`,
          }}>
          {busy ? '⏳ LOADING...' : `🚀 SUBSCRIBE · ${p.label}`}
        </button>
      )}
    </Card>
  );
};

const MoneyZPage = ({ membership, refreshMembership, onOpenInfo }) => {
  const [billing, setBilling] = useState('monthly'); // 'monthly' | 'annual'
  const [promo, setPromo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [spinazBalance, setSpinazBalance] = useState(0);
  const [spinazAmount, setSpinazAmount] = useState(1000);

  const t = TABS.money;
  const currentTier = membership?.tier || 'free';
  const isPremium = currentTier === 'premium' || currentTier === 'statz';
  const isStatz = currentTier === 'statz';

  // Check Stripe redirect query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribe') === 'success') {
      setError('');
      // Refresh membership after Stripe checkout completes
      setTimeout(() => refreshMembership?.(), 1500);
    } else if (params.get('subscribe') === 'cancel') {
      setError('Checkout canceled. No charge made.');
    } else if (params.get('spinaz') === 'success') {
      const amount = params.get('amount');
      setError(`✓ ${amount} SpinaZ purchased! Balance updating...`);
    }
    // Fetch SpinaZ balance
    import('./lib/api.js').then(({ spinaz: spinazApi }) => {
      spinazApi.balance().then(d => setSpinazBalance(d.balance || 0));
    });
  }, [refreshMembership]);

  const handleSubscribe = async (tier, annual) => {
    setBusy(true); setError('');
    try {
      const { memberships: memApi } = await import('./lib/api.js');
      const res = await memApi.subscribe({ tier, annual, promoCode: promo || null });
      if (res?.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        setError(res?.error || 'Failed to create checkout session');
      }
    } catch (e) {
      setError(e.message || 'Subscription failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You\'ll keep Premium/StatZ until the period ends, then revert to Free.')) return;
    setBusy(true); setError('');
    try {
      const { memberships: memApi } = await import('./lib/api.js');
      const res = await memApi.cancel();
      if (res?.ok) {
        setError(`✓ ${res.message || 'Canceled. Reverts to Free at period end.'}`);
        setTimeout(() => refreshMembership?.(), 1000);
      } else {
        setError(res?.error || 'Cancel failed');
      }
    } catch (e) {
      setError(e.message || 'Cancel failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSpinazPurchase = async () => {
    if (spinazAmount < 100) { setError('Min 100 SpinaZ'); return; }
    setBusy(true); setError('');
    try {
      const { spinaz: spinazApi } = await import('./lib/api.js');
      const res = await spinazApi.purchase(spinazAmount);
      if (res?.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        setError(res?.error || 'Failed to create SpinaZ checkout');
      }
    } catch (e) {
      setError(e.message || 'SpinaZ purchase failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-ui text-xs tracking-widest opacity-60" style={{ color: t.color }}>// MONEY 💰</div>
          <h1 className="font-display text-2xl mt-1" style={{ color: t.color, textShadow: `0 0 14px ${t.color}66` }}>
            Money
          </h1>
          <div className="font-ui text-xs mt-1 opacity-70" style={{ color: T.textSec }}>
            Subscriptions · SpinaZ · payouts · K-Oth 10% split
          </div>
        </div>
        <button onClick={() => onOpenInfo('money')} className="p-2 rounded-full shrink-0 ml-2"
          style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
          <span style={{ fontSize: 14 }}>🎙️ℹ️</span>
        </button>
      </div>

      {/* CURRENT TIER STATUS */}
      <Card color={t.color} className="p-4 mb-4">
        <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: t.color }}>// CURRENT TIER</div>
        <div className="flex items-baseline justify-between">
          <div className="font-display text-2xl" style={{ color: isStatz ? T.pink : isPremium ? T.cyan : T.textSec }}>
            {isStatz ? '📈 StatZ' : isPremium ? '🥇 Premium' : '🤗 Free'}
          </div>
          {membership?.status && membership.status !== 'active' && (
            <span className="font-ui text-[10px] px-2 py-0.5 rounded-full" style={{ background: T.surface, color: T.orange }}>
              {membership.status.replace('_', ' ').toUpperCase()}
            </span>
          )}
        </div>
        {membership?.current_period_end && (
          <div className="font-ui text-[10px] opacity-60 mt-1" style={{ color: T.textSec }}>
            Renews: {new Date(membership.current_period_end).toLocaleDateString()}
            {membership.annual ? ' · annual billing' : ' · monthly billing'}
          </div>
        )}
        {isPremium && (
          <button onClick={handleCancel} disabled={busy}
            className="mt-3 font-ui text-[10px] tracking-widest opacity-60 underline" style={{ color: T.orange }}>
            cancel subscription
          </button>
        )}
      </Card>

      {/* ERROR/SUCCESS MSG */}
      {error && (
        <div className="mb-4 p-3 rounded-lg font-ui text-xs"
          style={{ background: T.surface, color: error.startsWith('✓') ? T.lime : T.orange, border: `1px solid ${error.startsWith('✓') ? T.lime : T.orange}55` }}>
          {error}
        </div>
      )}

      {/* FIRST-50 URGENCY BANNER — strong launch incentive for Free users */}
      {currentTier === 'free' && (
        <div className="mb-4 p-3 rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${T.pink}22, ${T.orange}11)`,
            border: `1px solid ${T.pink}55`,
            boxShadow: `0 0 20px ${T.pink}33`,
          }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🎟️</span>
            <span className="font-display text-sm" style={{ color: T.pink, textShadow: `0 0 8px ${T.pink}66` }}>
              FIRST 50 PAYING MEMBERS
            </span>
          </div>
          <div className="font-ui text-xs leading-relaxed" style={{ color: T.textSec }}>
            Lifetime <b style={{ color: T.pink }}>50% off</b> locked in.
            $5/mo Premium or $45/yr forever. Use promo code <span className="font-mono font-bold" style={{ color: T.lime }}>FOUNDER50</span> at checkout.
          </div>
        </div>
      )}

      {/* WHAT YOU GET — clear value prop above tier picker */}
      {currentTier === 'free' && (
        <div className="mb-4 p-3 rounded-xl" style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
          <div className="font-ui text-[10px] tracking-widest opacity-60 mb-2" style={{ color: T.cyan }}>// WHY UPGRADE</div>
          <div className="space-y-1.5">
            {[
              ['💬', '10× longer messages', '400 → 4,000 chars'],
              ['📦', '12× more storage', '400 MB → 5 GB'],
              ['🎶', 'Unlimited DistributeZ', 'vs 1 release/month'],
              ['🛡️', 'Create LabelZ + sign artists', 'Premium-only'],
              ['🎨', 'Custom themes + incognito mode', 'Premium-only'],
              ['💰', 'Half the K-Oth cut on royalties', '10% → 5%'],
            ].map(([emoji, head, sub]) => (
              <div key={head} className="flex items-start gap-2.5">
                <span className="shrink-0 text-base leading-tight">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-ui text-xs font-bold" style={{ color: T.white }}>{head}</span>
                  <span className="font-ui text-xs opacity-60 ml-1.5" style={{ color: T.textSec }}>· {sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MONTHLY/ANNUAL TOGGLE */}
      {!isStatz && (
        <div className="flex items-center justify-center mb-4 gap-1">
          <button onClick={() => setBilling('monthly')}
            className="px-4 py-1.5 rounded-l-lg font-ui text-xs tracking-widest"
            style={{
              background: billing === 'monthly' ? `linear-gradient(135deg, ${T.cyan}, ${T.lime})` : T.surface,
              color: billing === 'monthly' ? '#000' : T.textSec,
              fontWeight: billing === 'monthly' ? 800 : 600,
              border: `1px solid ${T.borderSoft}`,
            }}>
            MONTHLY
          </button>
          <button onClick={() => setBilling('annual')}
            className="px-4 py-1.5 rounded-r-lg font-ui text-xs tracking-widest"
            style={{
              background: billing === 'annual' ? `linear-gradient(135deg, ${T.pink}, ${T.orange})` : T.surface,
              color: billing === 'annual' ? '#000' : T.textSec,
              fontWeight: billing === 'annual' ? 800 : 600,
              border: `1px solid ${T.borderSoft}`,
            }}>
            ANNUAL · SAVE
          </button>
        </div>
      )}

      {/* PLANS */}
      {!isStatz && (
        <div className="grid gap-3 mb-4">
          {currentTier === 'free' && (
            <PlanCard tier="premium" billing={billing} current={false}
              recommended={billing === 'annual'}
              onSubscribe={handleSubscribe} busy={busy} />
          )}
          {isPremium && (
            <PlanCard tier="premium" billing={billing} current={true} onSubscribe={handleSubscribe} busy={busy} />
          )}
          <PlanCard tier="statz" billing={billing} current={isStatz}
            recommended={!isStatz && billing === 'annual' && isPremium}
            onSubscribe={handleSubscribe} busy={busy} />
        </div>
      )}

      {/* PROMO CODE INPUT */}
      {!isStatz && (
        <Card color={T.yellow} className="p-3 mb-4">
          <div className="font-ui text-[10px] tracking-widest opacity-60 mb-2" style={{ color: T.yellow }}>// PROMO CODE 🎟️</div>
          <input value={promo} onChange={e => setPromo(e.target.value.toUpperCase().trim())}
            placeholder="MCZ20 / MCZ40 / MCZ80"
            className="w-full px-3 py-2 rounded-lg font-ui text-xs uppercase tracking-wider"
            style={{ background: T.bgDeep, color: T.white, border: `1px solid ${T.yellow}55` }} />
          <div className="font-ui text-[10px] opacity-60 mt-1" style={{ color: T.textSec }}>
            Active users get a cascade: 20% → 40% → 80% off (one-time, first invoice).
          </div>
        </Card>
      )}

      {/* SPINAZ BALANCE + PURCHASE */}
      <Card color={T.lime} className="p-4 mb-4">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="font-ui text-[10px] tracking-widest opacity-60" style={{ color: T.lime }}>// SPINAZ 🍥</div>
            <div className="font-display text-2xl" style={{ color: T.lime, textShadow: `0 0 10px ${T.lime}55` }}>
              {spinazBalance.toLocaleString()}
            </div>
          </div>
          <div className="font-ui text-[10px] opacity-60 text-right" style={{ color: T.textSec }}>
            $1 = 100 SpinaZ<br/>(80% off: 100 SpinaZ = $0.80)
          </div>
        </div>
        <div className="flex gap-2 mb-2">
          {[500, 1000, 5000, 10000].map(amt => (
            <button key={amt} onClick={() => setSpinazAmount(amt)}
              className="flex-1 py-1.5 rounded font-ui text-[10px] tracking-wider"
              style={{
                background: spinazAmount === amt ? `linear-gradient(135deg, ${T.lime}, ${T.cyan})` : T.surface,
                color: spinazAmount === amt ? '#000' : T.textSec,
                fontWeight: spinazAmount === amt ? 800 : 600,
                border: `1px solid ${T.borderSoft}`,
              }}>
              {amt.toLocaleString()}
            </button>
          ))}
        </div>
        <button onClick={handleSpinazPurchase} disabled={busy}
          className="w-full py-2 rounded-lg font-ui text-xs tracking-widest"
          style={{
            background: `linear-gradient(135deg, ${T.lime}, ${T.cyan})`,
            color: '#000', fontWeight: 800, opacity: busy ? 0.5 : 1,
          }}>
          {busy ? '⏳' : `🛒 BUY ${spinazAmount.toLocaleString()} SPINAZ · $${(spinazAmount * 0.008).toFixed(2)}`}
        </button>
      </Card>

      {/* K-OTH SPLIT EXPLAINER */}
      <Card color={T.purple} className="p-3 mb-4">
        <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.purple }}>// K-OTH SPLIT 🪙</div>
        <div className="font-ui text-[11px] leading-relaxed" style={{ color: T.textSec }}>
          When users pay you on Music ConnectZ, K-Oth keeps {tierLimits(membership).developer_tax_pct}% (your tier rate).
          The other {100 - tierLimits(membership).developer_tax_pct}% lands in your connected Stripe account.
          Cash-out tax stacks on top: <span style={{ color: T.orange }}>instant 15%</span>,
          weekly = dev tax, monthly 1%, quarterly free.
        </div>
      </Card>
    </div>
  );
};


const GenericTabPage = ({ tabKey, onOpenInfo, onOpenSub, onOpenLilith, onOpenOcc, onOpenImageZ, onOpenVideoZ }) => {
  const t = TABS[tabKey];
  const Icon = t.icon;
  const subs = t.subs || {};
  const subKeys = Object.keys(subs);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-ui text-xs tracking-widest opacity-60" style={{ color: t.color }}>// {t.label.toUpperCase()} {t.emoji}</div>
            <StatusPill status={TAB_STATUS[tabKey] || 'preview'} />
          </div>
          <h1 className="font-display text-2xl" style={{ color: t.color, textShadow: `0 0 14px ${t.color}66` }}>
            {t.label}
          </h1>
          <div className="font-ui text-xs mt-1 opacity-70" style={{ color: T.textSec }}>{t.purpose}</div>
        </div>
        <button onClick={() => onOpenInfo(tabKey)} className="p-2 rounded-full shrink-0 ml-2"
          style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
          <span style={{ fontSize: 14 }}>🎙️ℹ️</span>
        </button>
      </div>

      {/* Preview/Beta banner — honest status messaging */}
      {(TAB_STATUS[tabKey] === 'preview' || TAB_STATUS[tabKey] === 'beta') && (
        <div className="mb-3 p-2.5 rounded-lg flex items-start gap-2"
          style={{
            background: TAB_STATUS[tabKey] === 'preview' ? 'rgba(155,89,255,0.08)' : 'rgba(251,191,36,0.08)',
            border: `1px solid ${TAB_STATUS[tabKey] === 'preview' ? '#9b59ff44' : '#fbbf2444'}`,
          }}>
          <span className="text-base shrink-0">{TAB_STATUS[tabKey] === 'preview' ? '🚧' : '🛠️'}</span>
          <div className="flex-1 font-ui text-[10px] leading-relaxed" style={{ color: T.textSec }}>
            {TAB_STATUS[tabKey] === 'preview' ? (
              <>
                <b style={{ color: '#9b59ff' }}>PREVIEW</b> — concept locked, features in active development.
                Vote on which sub-apps ship first below. Active builders shape what we build.
              </>
            ) : (
              <>
                <b style={{ color: '#fbbf24' }}>BETA</b> — core functionality works · UI + polish still incoming.
                Use it now, breaks fixed within hours.
              </>
            )}
          </div>
        </div>
      )}

      <Card color={t.color} className="p-4 mb-4">
        <div className="flex items-center justify-center py-6" style={{
          background: `radial-gradient(circle, ${t.color}22, transparent 70%)`, borderRadius: 16,
        }}>
          <TabIcon tabKey={tabKey} fallback={Icon} size={56} color={t.color}
            style={{ filter: `drop-shadow(0 0 14px ${t.color})` }} strokeWidth={1.4} />
        </div>
        <div className="font-ui text-xs mt-3 text-center opacity-80 leading-relaxed" style={{ color: T.textSec }}>
          {t.voice.length > 180 ? t.voice.slice(0, 180) + '…' : t.voice}
        </div>
        <div className="mt-3 text-center">
          <button onClick={() => onOpenInfo(tabKey)} className="font-ui text-[10px] tracking-widest opacity-70" style={{ color: t.color }}>
            🎙️ℹ️ tap for full Corey voice
          </button>
        </div>
      </Card>

      {subKeys.length > 0 && (
        <>
          <div className="font-ui text-[10px] tracking-widest opacity-60 mb-2" style={{ color: t.color }}>
            // SUB-APPZ ({subKeys.length})
          </div>
          <div className="grid grid-cols-2 gap-2">
            {subKeys.map(k => {
              const s = subs[k]; const SIcon = s.icon;
              const isLilith = tabKey === 'toolz' && k === 'lilith';
              const isOcular = tabKey === 'toolz' && k === 'ocular';
              const isImageZ = tabKey === 'toolz' && k === 'imagez';
              const isVideoZ = tabKey === 'toolz' && k === 'videoz';
              const isLive = isLilith || isOcular || isImageZ || isVideoZ;
              return (
                <Card key={k} color={t.color} className="p-3 flex flex-col items-start gap-1.5"
                  onClick={() =>
                    isLilith ? onOpenLilith() :
                    isOcular ? onOpenOcc() :
                    isImageZ ? onOpenImageZ() :
                    isVideoZ ? onOpenVideoZ() :
                    onOpenSub(tabKey, k)
                  }>
                  <div className="flex items-center justify-between w-full">
                    <SIcon size={20} color={t.color} style={{ filter: `drop-shadow(0 0 6px ${t.color}66)` }} strokeWidth={1.7} />
                    <span style={{ fontSize: 14 }}>{s.emoji}</span>
                  </div>
                  <div>
                    <div className="font-display text-[12px] tracking-wider" style={{ color: t.color }}>{s.label}</div>
                    {isLive && <Pill color={T.success}>LIVE</Pill>}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {subKeys.length === 0 && (
        <Card color={t.color} className="p-4">
          <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: t.color }}>// STATUS</div>
          <div className="font-ui text-sm" style={{ color: T.textSec }}>
            Tab structure is ready. Real flows ship in the next wave — see ETA at the top of this thread.
          </div>
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// TAB STRIP (horizontal scrollable)
// ============================================================================
const TabStrip = ({ active, onPick, profile }) => (
  <div className="flex overflow-x-auto px-1 py-2 border-b sticky top-0 z-30"
    style={{ background: 'rgba(10,1,24,0.92)', backdropFilter: 'blur(10px)', borderColor: T.borderSoft, scrollbarWidth: 'none' }}>
    {TAB_ORDER.filter(k => !TABS[k].ownerOnly || isOwner(profile)).map(k => {
      const t = TABS[k]; const isActive = active === k;
      return (
        <button key={k} onClick={() => onPick(k)}
          className="shrink-0 px-3 py-1.5 mx-0.5 rounded-lg font-ui text-[11px] tracking-wider whitespace-nowrap flex items-center gap-1"
          style={{
            background: isActive ? `linear-gradient(135deg, ${t.color}, ${t.color}aa)` : T.surface,
            color: isActive ? '#000' : t.color,
            border: `1px solid ${isActive ? t.color : T.borderSoft}`,
            fontWeight: isActive ? 700 : 600,
            boxShadow: isActive ? `0 0 12px ${t.color}55` : 'none',
          }}>
          <span>{t.emoji}</span>
          <span>{t.label}</span>
        </button>
      );
    })}
  </div>
);

// ============================================================================
// IMAGEZ — Image editor · Photoshop-lite in a modal
// Layers · filters · text · brush · crop · export to PNG or save to MCZ storage
// ============================================================================
const IMAGEZ_FILTERS = [
  { key: 'none',       label: 'Original',  fn: 'none' },
  { key: 'noir',       label: 'Noir',      fn: 'grayscale(100%) contrast(1.2)' },
  { key: 'vintage',    label: 'Vintage',   fn: 'sepia(60%) saturate(1.4) hue-rotate(-20deg)' },
  { key: 'cyberpunk',  label: 'Cyberpunk', fn: 'saturate(1.8) hue-rotate(220deg) contrast(1.2)' },
  { key: 'cold',       label: 'Cold',      fn: 'hue-rotate(180deg) saturate(0.8)' },
  { key: 'warm',       label: 'Warm',      fn: 'sepia(30%) saturate(1.4) brightness(1.1)' },
  { key: 'dramatic',   label: 'Dramatic',  fn: 'contrast(1.4) brightness(0.9) saturate(1.3)' },
  { key: 'dreamy',     label: 'Dreamy',    fn: 'blur(1px) saturate(1.3) brightness(1.1)' },
  { key: 'sharp',      label: 'Sharp',     fn: 'contrast(1.3) saturate(1.1)' },
];

const ImageZModal = ({ onClose, membership }) => {
  const fileRef = useRef(null);
  const canvasRef = useRef(null);
  const [img, setImg] = useState(null);
  const [filter, setFilter] = useState('none');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(48);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [saved, setSaved] = useState(false);

  const filterFn = IMAGEZ_FILTERS.find(f => f.key === filter)?.fn || 'none';
  const adjustments = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  const fullFilter = filterFn === 'none' ? adjustments : `${filterFn} ${adjustments}`;

  // Draw image + apply filter on every change
  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const maxW = 800;
    const scale = Math.min(1, maxW / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    ctx.filter = fullFilter;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Overlay text
    if (text.trim()) {
      ctx.filter = 'none';
      ctx.font = `bold ${textSize}px Audiowide, sans-serif`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      const x = canvas.width / 2;
      const y = canvas.height - 40;
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
  }, [img, fullFilter, text, textColor, textSize]);

  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const im = new Image();
      im.onload = () => setImg(im);
      im.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const exportPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `imagez-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const saveToMcz = async () => {
    if (!canvasRef.current) return;
    setBusy(true); setErr(null); setSaved(false);
    try {
      const blob = await new Promise(r => canvasRef.current.toBlob(r, 'image/png'));
      const fd = new FormData();
      fd.append('file', blob, `imagez-${Date.now()}.png`);
      fd.append('app_origin', 'intelligence');
      fd.append('is_public', 'true');
      const token = (() => { try { return localStorage.getItem('mcz:token'); } catch { return ''; } })();
      const res = await fetch('/api/storage/upload/', {
        method: 'POST', body: fd,
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (res.status === 402) {
        const j = await res.json();
        throw new Error(j.message || 'Tier limit hit — upgrade for more storage');
      }
      if (!res.ok) throw new Error(`upload failed (${res.status})`);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const reset = () => {
    setFilter('none'); setBrightness(100); setContrast(100); setSaturation(100);
    setText(''); setTextColor('#ffffff');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md h-[94vh] rounded-3xl overflow-hidden flex flex-col"
        style={{ background: `linear-gradient(180deg, ${T.bgMid}, ${T.bgDeep})`, border: `1px solid ${T.orange}66`, boxShadow: `0 24px 60px rgba(0,0,0,0.7), 0 0 50px ${T.orange}44` }}>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b" style={{ borderColor: T.borderSoft }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <h2 className="font-display text-lg" style={{ color: T.orange, textShadow: `0 0 10px ${T.orange}` }}>ImageZ</h2>
            <StatusPill status="beta" />
          </div>
          <button onClick={onClose} className="p-1 rounded-full" style={{ color: T.textMuted }}><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {!img ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <div className="text-6xl mb-3">🖼️</div>
              <div className="font-display text-base mb-1" style={{ color: T.orange }}>Drop an image to start</div>
              <div className="font-ui text-[11px] opacity-60 mb-4 text-center" style={{ color: T.textSec }}>
                JPG · PNG · WEBP up to {tierLimits(membership).file_upload_mb} MB
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
              <Btn onClick={() => fileRef.current?.click()} kind="cyan" className="!py-2.5 px-5">📸 UPLOAD IMAGE</Btn>
            </div>
          ) : (
            <>
              {/* CANVAS */}
              <div className="mb-3 rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.6)', border: `1px solid ${T.borderSoft}` }}>
                <canvas ref={canvasRef} className="w-full block" style={{ maxHeight: 320 }} />
              </div>

              {/* FILTERS */}
              <div className="mb-3">
                <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1.5" style={{ color: T.orange }}>// FILTERS</div>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {IMAGEZ_FILTERS.map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                      className="shrink-0 px-2.5 py-1 rounded-md font-ui text-[10px] whitespace-nowrap"
                      style={{ background: filter === f.key ? T.orange : 'rgba(0,0,0,0.3)', color: filter === f.key ? '#000' : T.orange, border: `1px solid ${T.orange}55`, fontWeight: filter === f.key ? 700 : 500 }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ADJUSTMENTS */}
              <div className="mb-3 space-y-2">
                {[
                  { label: 'Brightness', val: brightness, set: setBrightness, color: T.yellow },
                  { label: 'Contrast',   val: contrast,   set: setContrast,   color: T.cyan   },
                  { label: 'Saturation', val: saturation, set: setSaturation, color: T.pink   },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between font-ui text-[10px] mb-0.5" style={{ color: s.color }}>
                      <span>// {s.label.toUpperCase()}</span>
                      <span style={{ color: T.textSec }}>{s.val}%</span>
                    </div>
                    <input type="range" min="0" max="200" value={s.val} onChange={e => s.set(+e.target.value)}
                      className="w-full" style={{ accentColor: s.color }} />
                  </div>
                ))}
              </div>

              {/* TEXT OVERLAY */}
              <div className="mb-3">
                <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1.5" style={{ color: T.lime }}>// TEXT OVERLAY</div>
                <input value={text} onChange={e => setText(e.target.value)}
                  placeholder="Add text to image…" maxLength={60}
                  className="w-full px-2.5 py-1.5 rounded-lg font-ui text-sm outline-none"
                  style={{ background: T.surface, border: `1px solid ${T.borderSoft}`, color: T.white }} />
                <div className="flex gap-2 mt-1.5">
                  <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer" style={{ border: `1px solid ${T.borderSoft}`, background: 'transparent' }} />
                  <input type="range" min="16" max="120" value={textSize} onChange={e => setTextSize(+e.target.value)}
                    className="flex-1" style={{ accentColor: T.lime }} />
                  <span className="font-ui text-[10px] self-center" style={{ color: T.textSec, minWidth: 32, textAlign: 'right' }}>{textSize}px</span>
                </div>
              </div>

              {err && (
                <div className="p-2.5 rounded-lg mb-3 font-ui text-xs"
                  style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`, color: '#fca5a5' }}>⚠️ {err}</div>
              )}
              {saved && (
                <div className="p-2.5 rounded-lg mb-3 font-ui text-xs"
                  style={{ background: 'rgba(16,185,129,0.1)', border: `1px solid rgba(16,185,129,0.3)`, color: '#86efac' }}>
                  ✓ Saved to your MCZ storage
                </div>
              )}

              {/* ACTIONS */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Btn onClick={exportPNG} kind="cyan" className="!py-2">⬇️ EXPORT</Btn>
                <Btn onClick={saveToMcz} kind="primary" className="!py-2" disabled={busy}>
                  {busy ? '⏳ saving…' : '💾 SAVE TO MCZ'}
                </Btn>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Btn onClick={() => fileRef.current?.click()} kind="ghost" className="!py-2">📸 NEW IMAGE</Btn>
                <Btn onClick={reset} kind="ghost" className="!py-2">↺ RESET</Btn>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </>
          )}
        </div>
        <div className="p-2 border-t font-ui text-[9px] opacity-60 text-center" style={{ borderColor: T.borderSoft, color: T.orange }}>
          🎨 ImageZ · v0.1 · brush + crop + layers in next drop
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// VIDEOZ — Video editor · Sony Vegas knockoff (browser limits considered)
// Trim · speed · volume · filters · MediaRecorder export
// ============================================================================
const VIDEOZ_FILTERS = [
  { key: 'none',      label: 'Original',  fn: 'none' },
  { key: 'noir',      label: 'Noir',      fn: 'grayscale(100%) contrast(1.2)' },
  { key: 'vintage',   label: 'Vintage',   fn: 'sepia(60%) saturate(1.4) hue-rotate(-20deg)' },
  { key: 'cyberpunk', label: 'Cyberpunk', fn: 'saturate(1.8) hue-rotate(220deg) contrast(1.2)' },
  { key: 'dramatic',  label: 'Dramatic',  fn: 'contrast(1.4) brightness(0.9) saturate(1.3)' },
  { key: 'dreamy',    label: 'Dreamy',    fn: 'blur(0.5px) saturate(1.3) brightness(1.1)' },
];

const VideoZModal = ({ onClose, membership }) => {
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const recorderRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [filter, setFilter] = useState('none');
  const [speed, setSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [err, setErr] = useState(null);

  const filterFn = VIDEOZ_FILTERS.find(f => f.key === filter)?.fn || 'none';

  // Load video file
  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
    setTrimStart(0); setTrimEnd(0); setFilter('none'); setSpeed(1.0); setVolume(1.0);
  };

  // Wire video element events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => { setDuration(v.duration); setTrimEnd(v.duration); };
    const onTime = () => {
      setCurrentTime(v.currentTime);
      if (trimEnd > 0 && v.currentTime >= trimEnd) {
        v.pause();
        v.currentTime = trimStart;
        setPlaying(false);
      }
    };
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('timeupdate', onTime);
    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('timeupdate', onTime);
    };
  }, [videoUrl, trimStart, trimEnd]);

  // Apply speed + volume to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      videoRef.current.volume = volume;
    }
  }, [speed, volume]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else {
      if (v.currentTime < trimStart || v.currentTime >= trimEnd) v.currentTime = trimStart;
      v.play(); setPlaying(true);
    }
  };

  const seekTo = (t) => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(trimStart, Math.min(trimEnd, t));
  };

  // Export via MediaRecorder — captures filtered playback as new video
  const exportVideo = async () => {
    const v = videoRef.current;
    if (!v) return;
    setErr(null);
    try {
      if (!v.captureStream && !v.mozCaptureStream) {
        throw new Error('Your browser doesn\'t support captureStream() — try Chrome');
      }
      const stream = v.captureStream ? v.captureStream() : v.mozCaptureStream();
      const chunks = [];
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `videoz-${Date.now()}.webm`;
        link.href = url; link.click();
        URL.revokeObjectURL(url);
        setRecording(false);
      };
      recorderRef.current = recorder;
      v.currentTime = trimStart;
      v.play();
      recorder.start();
      setRecording(true); setPlaying(true);
      // Auto-stop at trimEnd
      const checkStop = () => {
        if (v.currentTime >= trimEnd - 0.05) {
          recorder.stop();
          v.pause();
          setPlaying(false);
        } else if (recorder.state === 'recording') {
          requestAnimationFrame(checkStop);
        }
      };
      requestAnimationFrame(checkStop);
    } catch (e) { setErr(e.message); setRecording(false); }
  };

  const fmtTime = (s) => {
    if (!Number.isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${m}:${String(ss).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md h-[94vh] rounded-3xl overflow-hidden flex flex-col"
        style={{ background: `linear-gradient(180deg, ${T.bgMid}, ${T.bgDeep})`, border: `1px solid ${T.pink}66`, boxShadow: `0 24px 60px rgba(0,0,0,0.7), 0 0 50px ${T.pink}44` }}>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b" style={{ borderColor: T.borderSoft }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎬</span>
            <h2 className="font-display text-lg" style={{ color: T.pink, textShadow: `0 0 10px ${T.pink}` }}>VideoZ</h2>
            <StatusPill status="beta" />
          </div>
          <button onClick={onClose} className="p-1 rounded-full" style={{ color: T.textMuted }}><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {!videoUrl ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <div className="text-6xl mb-3">🎞️</div>
              <div className="font-display text-base mb-1" style={{ color: T.pink }}>Drop a video to edit</div>
              <div className="font-ui text-[11px] opacity-60 mb-4 text-center" style={{ color: T.textSec }}>
                MP4 · WEBM · MOV up to {tierLimits(membership).file_upload_mb} MB
              </div>
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={onUpload} />
              <Btn onClick={() => fileRef.current?.click()} kind="primary" className="!py-2.5 px-5">🎬 UPLOAD VIDEO</Btn>
            </div>
          ) : (
            <>
              {/* VIDEO PREVIEW */}
              <div className="mb-3 rounded-xl overflow-hidden" style={{ background: '#000', border: `1px solid ${T.borderSoft}` }}>
                <video ref={videoRef} src={videoUrl} className="w-full block"
                  style={{ filter: filterFn === 'none' ? 'none' : filterFn, maxHeight: 240 }} />
              </div>

              {/* TIMELINE + PLAY */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={togglePlay} className="px-3 py-1 rounded-md font-ui text-xs"
                    style={{ background: T.pink, color: '#000', fontWeight: 700 }}>
                    {playing ? '⏸' : '▶'}
                  </button>
                  <input type="range" min="0" max={duration || 0} step="0.01" value={currentTime}
                    onChange={e => seekTo(+e.target.value)} className="flex-1" style={{ accentColor: T.pink }} />
                  <span className="font-mono text-[10px]" style={{ color: T.textSec, minWidth: 70, textAlign: 'right' }}>
                    {fmtTime(currentTime)} / {fmtTime(duration)}
                  </span>
                </div>
              </div>

              {/* TRIM */}
              <div className="mb-3">
                <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.orange }}>
                  // TRIM · {fmtTime(trimStart)} → {fmtTime(trimEnd)} · {fmtTime(trimEnd - trimStart)} long
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setTrimStart(currentTime)} className="flex-1 py-1.5 rounded-md font-ui text-[10px]"
                    style={{ background: 'rgba(0,0,0,0.3)', color: T.orange, border: `1px solid ${T.orange}55` }}>
                    ⊢ SET IN · {fmtTime(trimStart)}
                  </button>
                  <button onClick={() => setTrimEnd(currentTime)} className="flex-1 py-1.5 rounded-md font-ui text-[10px]"
                    style={{ background: 'rgba(0,0,0,0.3)', color: T.orange, border: `1px solid ${T.orange}55` }}>
                    SET OUT · {fmtTime(trimEnd)} ⊣
                  </button>
                </div>
              </div>

              {/* MULTITRACK TIMELINE — v0.2 scaffold */}
              <div className="mb-3">
                <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1.5" style={{ color: T.purple }}>// MULTITRACK · v0.2</div>
                <div className="space-y-1.5 p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${T.purple}33` }}>
                  {[
                    { id: 'V1', label: '🎬 VIDEO 1 (master)', color: T.pink, active: true },
                    { id: 'V2', label: '🎬 VIDEO 2 (overlay)', color: T.cyan, active: false },
                    { id: 'A1', label: '🎵 AUDIO 1 (music)', color: T.lime, active: false },
                  ].map(track => (
                    <div key={track.id} className="flex items-center gap-2">
                      <span className="font-ui text-[9px] tracking-widest" style={{ color: track.color, minWidth: 24 }}>{track.id}</span>
                      <div className="flex-1 h-6 rounded relative overflow-hidden"
                        style={{ background: `${track.color}11`, border: `1px solid ${track.color}33` }}>
                        {track.active && duration > 0 && (
                          <div className="absolute h-full"
                            style={{
                              background: `${track.color}66`,
                              left: `${(trimStart / duration) * 100}%`,
                              width: `${((trimEnd - trimStart) / duration) * 100}%`,
                              borderLeft: `2px solid ${track.color}`,
                              borderRight: `2px solid ${track.color}`,
                            }} />
                        )}
                        <div className="absolute inset-0 flex items-center px-2 font-ui text-[9px]" style={{ color: track.color, opacity: 0.8 }}>
                          {track.active ? `clip · ${fmtTime(trimEnd - trimStart)}` : 'drop file →'}
                        </div>
                      </div>
                      <button className="px-1.5 py-0.5 rounded font-ui text-[9px]"
                        style={{ background: 'rgba(0,0,0,0.3)', color: track.color, border: `1px solid ${track.color}55` }}>
                        +
                      </button>
                    </div>
                  ))}
                </div>
                <div className="font-ui text-[9px] opacity-50 mt-1.5" style={{ color: T.textSec }}>
                  💡 v0.2: track UI live · multi-stream compositing needs FFmpeg.wasm (~25MB) — next drop
                </div>
              </div>

              {/* LIP-SYNC — StatZ-gated AI feature */}
              <div className="mb-3">
                <button onClick={() => {
                    if ((membership?.tier || 'free') !== 'statz') {
                      setErr('Lip-Sync is a StatZ-tier feature ($5/mo extra). Upgrade in Money tab.');
                      return;
                    }
                    setErr('🚧 Lip-Sync UI ready · backend endpoint at /api/ai/lipsync/ scaffolded · needs REPLICATE_API_KEY in env to go live');
                  }}
                  className="w-full p-2.5 rounded-lg flex items-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${T.cyan}22, ${T.purple}22)`,
                    border: `1px solid ${T.cyan}55`,
                  }}>
                  <span className="text-xl">👄</span>
                  <div className="flex-1 text-left">
                    <div className="font-display text-sm" style={{ color: T.cyan }}>Lip-Sync (Face → Voice)</div>
                    <div className="font-ui text-[10px] opacity-70" style={{ color: T.textSec }}>
                      Sync a face from a pic/video to any voice in an audio/video clip
                    </div>
                  </div>
                  <StatusPill status={(membership?.tier || 'free') === 'statz' ? 'beta' : 'preview'} />
                </button>
              </div>

              {/* FILTERS */}
              <div className="mb-3">
                <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1.5" style={{ color: T.pink }}>// FILTERS</div>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {VIDEOZ_FILTERS.map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                      className="shrink-0 px-2.5 py-1 rounded-md font-ui text-[10px] whitespace-nowrap"
                      style={{ background: filter === f.key ? T.pink : 'rgba(0,0,0,0.3)', color: filter === f.key ? '#000' : T.pink, border: `1px solid ${T.pink}55`, fontWeight: filter === f.key ? 700 : 500 }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SPEED + VOLUME */}
              <div className="mb-3 space-y-2">
                <div>
                  <div className="flex justify-between font-ui text-[10px] mb-0.5" style={{ color: T.cyan }}>
                    <span>// SPEED</span><span style={{ color: T.textSec }}>{speed.toFixed(2)}×</span>
                  </div>
                  <input type="range" min="0.25" max="2" step="0.05" value={speed} onChange={e => setSpeed(+e.target.value)}
                    className="w-full" style={{ accentColor: T.cyan }} />
                </div>
                <div>
                  <div className="flex justify-between font-ui text-[10px] mb-0.5" style={{ color: T.lime }}>
                    <span>// VOLUME</span><span style={{ color: T.textSec }}>{Math.round(volume * 100)}%</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(+e.target.value)}
                    className="w-full" style={{ accentColor: T.lime }} />
                </div>
              </div>

              {err && (
                <div className="p-2.5 rounded-lg mb-3 font-ui text-xs"
                  style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`, color: '#fca5a5' }}>⚠️ {err}</div>
              )}

              {/* ACTIONS */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Btn onClick={exportVideo} kind="primary" className="!py-2" disabled={recording}>
                  {recording ? '⏺ recording…' : '⬇️ EXPORT WEBM'}
                </Btn>
                <Btn onClick={() => fileRef.current?.click()} kind="ghost" className="!py-2">🎬 NEW VIDEO</Btn>
              </div>
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={onUpload} />

              <div className="font-ui text-[10px] opacity-50 mt-3 text-center" style={{ color: T.textSec }}>
                💡 Export records the trimmed + filtered playback as a new WEBM file. Best in Chrome.
              </div>
            </>
          )}
        </div>
        <div className="p-2 border-t font-ui text-[9px] opacity-60 text-center" style={{ borderColor: T.borderSoft, color: T.pink }}>
          🎬 VideoZ · v0.2 · multitrack timeline · lip-sync StatZ-gated
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// INTELLIGENCE — AI media creators (BETA tab · 2 LIVE · 3 PREVIEW · 1 LINK)
// ============================================================================
const INTELLIGENCE_SUBS = [
  { key: 'sentencez', label: 'SentenceZ', emoji: '📃', status: 'live',    short: 'AI lyrics + bars + hooks',  desc: 'Generate lyrics, bars, hooks, captions. Style + mood + topic controls. Uses your Corey GPT quota.' },
  { key: 'imageconz', label: 'ImageConZ', emoji: '👨🏽‍🎨', status: 'live',    short: 'AI image prompt builder',  desc: 'Build crafted prompts for Midjourney / DALL-E / Stable Diffusion. Copy + paste anywhere. No API cost.' },
  { key: 'instconz',  label: 'InstConZ',  emoji: '🎹', status: 'preview', short: 'AI beat generator',         desc: 'Suno/Udio integration coming. Royalties auto-split to Beat Producer role.' },
  { key: 'mixconz',   label: 'MixConZ',   emoji: '🎚️', status: 'preview', short: 'AI mix engineer',           desc: 'Upload stems → balanced master. EQ + comp + verb decisions explained.' },
  { key: 'videoconz', label: 'VideoConZ', emoji: '📺', status: 'preview', short: 'AI music video',            desc: 'Runway/Pika integration coming. Audio-reactive cuts, watermarked output.' },
  { key: 'ocular',    label: 'OCC',       emoji: '👁️', status: 'live',    short: 'AI coding assistant',       desc: 'Already in ToolZ → Ocular. Code generation with file context.' },
];

const LYRIC_STYLES   = ['Trap', 'Drill', 'Boom-Bap', 'Cloud', 'R&B', 'Pop', 'Indie Folk', 'Country', 'Conscious', 'Mumble', 'Latin Trap', 'Afrobeats', 'EDM'];
const LYRIC_MOODS    = ['Dark', 'Triumphant', 'Lonely', 'Hype', 'Romantic', 'Reflective', 'Rebellious', 'Spiritual', 'Angry', 'Hopeful'];
const LYRIC_FORMATS  = ['16 bars', '8 bars', 'Hook (4 bars)', 'Verse + Hook', 'Full song'];

const SentenceZModal = ({ onClose, membership }) => {
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('Trap');
  const [mood, setMood]   = useState('Reflective');
  const [format, setFormat] = useState('16 bars');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const generate = async () => {
    if (!topic.trim()) return;
    setBusy(true); setErr(null); setOutput('');
    const prompt = `Write ${format} of ${style} lyrics. Mood: ${mood}. Topic: ${topic.trim()}.\n\nReturn ONLY the lyrics with clear bar breaks. Use rhyme + cadence appropriate to ${style}.`;
    try {
      const token = (() => { try { return localStorage.getItem('mcz:token'); } catch { return ''; } })();
      if (!token) throw new Error('sign in first');
      const res = await fetch('/api/ai/corey/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ domain: 'writing', message: prompt, history: [] }),
      });
      if (!res.ok) throw new Error(`backend ${res.status}`);
      const data = await res.json();
      setOutput(data.reply || '');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md h-[92vh] rounded-3xl overflow-hidden flex flex-col"
        style={{ background: `linear-gradient(180deg, ${T.bgMid}, ${T.bgDeep})`, border: `1px solid ${T.cyan}55`, boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 40px ${T.cyan}33` }}>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b" style={{ borderColor: T.borderSoft }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">📃</span>
            <h2 className="font-display text-lg" style={{ color: T.cyan, textShadow: `0 0 10px ${T.cyan}` }}>SentenceZ</h2>
            <StatusPill status="live" />
          </div>
          <button onClick={onClose} className="p-1 rounded-full" style={{ color: T.textMuted }}><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-3 mb-3">
            <div>
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.cyan }}>// STYLE</div>
              <div className="flex flex-wrap gap-1">
                {LYRIC_STYLES.map(s => (
                  <button key={s} onClick={() => setStyle(s)}
                    className="px-2 py-0.5 rounded-md font-ui text-[10px]"
                    style={{ background: style === s ? T.cyan : 'rgba(0,0,0,0.3)', color: style === s ? '#000' : T.cyan, border: `1px solid ${T.cyan}55`, fontWeight: style === s ? 700 : 500 }}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.purple }}>// MOOD</div>
              <div className="flex flex-wrap gap-1">
                {LYRIC_MOODS.map(m => (
                  <button key={m} onClick={() => setMood(m)}
                    className="px-2 py-0.5 rounded-md font-ui text-[10px]"
                    style={{ background: mood === m ? T.purple : 'rgba(0,0,0,0.3)', color: mood === m ? '#fff' : T.purple, border: `1px solid ${T.purple}55`, fontWeight: mood === m ? 700 : 500 }}>{m}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.pink }}>// FORMAT</div>
              <div className="flex flex-wrap gap-1">
                {LYRIC_FORMATS.map(f => (
                  <button key={f} onClick={() => setFormat(f)}
                    className="px-2 py-0.5 rounded-md font-ui text-[10px]"
                    style={{ background: format === f ? T.pink : 'rgba(0,0,0,0.3)', color: format === f ? '#fff' : T.pink, border: `1px solid ${T.pink}55`, fontWeight: format === f ? 700 : 500 }}>{f}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.cyan }}>// TOPIC</div>
              <textarea value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g. studio loneliness · being underestimated · the come-up"
                rows={3} className="w-full font-ui text-sm p-2.5 rounded-lg outline-none resize-none"
                style={{ background: T.surface, border: `1px solid ${T.borderSoft}`, color: T.white }} />
              <CharLimitBar text={topic} membership={membership} />
            </div>
          </div>

          <Btn onClick={generate} kind="cyan" className="w-full !py-2.5 mb-3" disabled={busy || !topic.trim()}>
            {busy ? '⚡ generating…' : `⚡ GENERATE ${format.toUpperCase()}`}
          </Btn>

          {err && (
            <div className="p-2.5 rounded-lg mb-3 font-ui text-xs"
              style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`, color: '#fca5a5' }}>⚠️ {err}</div>
          )}

          {output && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-ui text-[10px] tracking-widest opacity-60" style={{ color: T.cyan }}>// {format.toUpperCase()}</span>
                <button onClick={() => navigator.clipboard.writeText(output)}
                  className="px-2 py-0.5 rounded-md font-ui text-[10px]"
                  style={{ border: `1px solid ${T.cyan}55`, color: T.cyan, background: 'rgba(0,0,0,0.3)' }}>📋 copy</button>
              </div>
              <pre className="p-3 rounded-lg font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
                style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${T.cyan}33`, color: T.white }}>
                {output}
              </pre>
            </div>
          )}
        </div>
        <div className="p-2 border-t font-ui text-[9px] opacity-60 text-center" style={{ borderColor: T.borderSoft, color: T.cyan }}>
          📃 SentenceZ · Claude · royalties auto-attribute Ghostwriter role
        </div>
      </div>
    </div>
  );
};

// ImageConZ — prompt builder (no API cost · copy to Midjourney/DALL-E/SD)
const IMG_STYLES = ['Album Cover', 'Portrait', 'Promo Poster', 'Music Video Still', 'Logo / Wordmark', 'Single Art', 'Mixtape Cover'];
const IMG_AESTHETICS = ['Cyberpunk neon', 'Film noir', 'Vintage 70s', '90s grunge', 'Minimalist', 'Maximalist baroque', 'Cinematic dramatic', 'Lo-fi grainy', 'Y2K chrome', 'Cottagecore'];
const IMG_PALETTES = ['Purple + cyan neon', 'Black & white', 'Sepia / gold', 'Pastel dream', 'Blood red + black', 'Forest greens', 'Sunset gradient', 'Pure monochrome', 'Earthy desert'];

const ImageConZModal = ({ onClose, membership }) => {
  const [subject, setSubject] = useState('');
  const [imgStyle, setImgStyle] = useState('Album Cover');
  const [aesthetic, setAesthetic] = useState('Cyberpunk neon');
  const [palette, setPalette] = useState('Purple + cyan neon');
  const [aspect, setAspect] = useState('1:1');
  const [output, setOutput] = useState('');

  const buildPrompt = () => {
    if (!subject.trim()) return;
    const built = `${imgStyle} for "${subject.trim()}". Style: ${aesthetic}. Color palette: ${palette}. Aspect: ${aspect}. Cinematic lighting, sharp focus, professional photography composition, magazine quality. Highly detailed, 8k resolution, art-directed for music industry visual standards.`;
    setOutput(built);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md h-[92vh] rounded-3xl overflow-hidden flex flex-col"
        style={{ background: `linear-gradient(180deg, ${T.bgMid}, ${T.bgDeep})`, border: `1px solid ${T.orange}55`, boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 40px ${T.orange}33` }}>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b" style={{ borderColor: T.borderSoft }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">👨🏽‍🎨</span>
            <h2 className="font-display text-lg" style={{ color: T.orange, textShadow: `0 0 10px ${T.orange}` }}>ImageConZ</h2>
            <StatusPill status="live" />
          </div>
          <button onClick={onClose} className="p-1 rounded-full" style={{ color: T.textMuted }}><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="p-2.5 rounded-lg mb-3 font-ui text-[10px] leading-relaxed"
            style={{ background: 'rgba(155,89,255,0.08)', border: '1px solid rgba(155,89,255,0.3)', color: T.textSec }}>
            💡 Builds a crafted prompt — copy + paste into Midjourney, DALL-E, Stable Diffusion, or Leonardo.
            No API cost. We'll add direct generation once <b style={{ color: T.cyan }}>Premium</b> tier funds it.
          </div>

          <div className="space-y-3 mb-3">
            <div>
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.orange }}>// IMAGE TYPE</div>
              <div className="flex flex-wrap gap-1">
                {IMG_STYLES.map(s => (
                  <button key={s} onClick={() => setImgStyle(s)} className="px-2 py-0.5 rounded-md font-ui text-[10px]"
                    style={{ background: imgStyle === s ? T.orange : 'rgba(0,0,0,0.3)', color: imgStyle === s ? '#000' : T.orange, border: `1px solid ${T.orange}55`, fontWeight: imgStyle === s ? 700 : 500 }}>{s}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.cyan }}>// AESTHETIC</div>
              <div className="flex flex-wrap gap-1">
                {IMG_AESTHETICS.map(a => (
                  <button key={a} onClick={() => setAesthetic(a)} className="px-2 py-0.5 rounded-md font-ui text-[10px]"
                    style={{ background: aesthetic === a ? T.cyan : 'rgba(0,0,0,0.3)', color: aesthetic === a ? '#000' : T.cyan, border: `1px solid ${T.cyan}55`, fontWeight: aesthetic === a ? 700 : 500 }}>{a}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.purple }}>// COLOR PALETTE</div>
              <div className="flex flex-wrap gap-1">
                {IMG_PALETTES.map(p => (
                  <button key={p} onClick={() => setPalette(p)} className="px-2 py-0.5 rounded-md font-ui text-[10px]"
                    style={{ background: palette === p ? T.purple : 'rgba(0,0,0,0.3)', color: palette === p ? '#fff' : T.purple, border: `1px solid ${T.purple}55`, fontWeight: palette === p ? 700 : 500 }}>{p}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.pink }}>// ASPECT RATIO</div>
              <div className="flex flex-wrap gap-1">
                {['1:1','16:9','9:16','4:5','3:2'].map(r => (
                  <button key={r} onClick={() => setAspect(r)} className="px-2 py-0.5 rounded-md font-ui text-[10px]"
                    style={{ background: aspect === r ? T.pink : 'rgba(0,0,0,0.3)', color: aspect === r ? '#fff' : T.pink, border: `1px solid ${T.pink}55`, fontWeight: aspect === r ? 700 : 500 }}>{r}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-ui text-[10px] tracking-widest opacity-60 mb-1" style={{ color: T.orange }}>// SUBJECT / IDEA</div>
              <textarea value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="e.g. lonely producer at 3am with neon-lit MPC · dystopian skyline behind"
                rows={3} className="w-full font-ui text-sm p-2.5 rounded-lg outline-none resize-none"
                style={{ background: T.surface, border: `1px solid ${T.borderSoft}`, color: T.white }} />
              <CharLimitBar text={subject} membership={membership} />
            </div>
          </div>

          <Btn onClick={buildPrompt} kind="cyan" className="w-full !py-2.5 mb-3" disabled={!subject.trim()}>
            ✨ BUILD PROMPT
          </Btn>

          {output && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-ui text-[10px] tracking-widest opacity-60" style={{ color: T.orange }}>// CRAFTED PROMPT</span>
                <button onClick={() => navigator.clipboard.writeText(output)}
                  className="px-2 py-0.5 rounded-md font-ui text-[10px]"
                  style={{ border: `1px solid ${T.orange}55`, color: T.orange, background: 'rgba(0,0,0,0.3)' }}>📋 copy</button>
              </div>
              <pre className="p-3 rounded-lg font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
                style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${T.orange}33`, color: T.white }}>
                {output}
              </pre>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <a href="https://www.midjourney.com/" target="_blank" rel="noopener"
                  className="text-center py-1.5 rounded font-ui text-[10px] tracking-widest"
                  style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${T.purple}55`, color: T.purple, textDecoration: 'none' }}>
                  → Midjourney
                </a>
                <a href="https://labs.openai.com/" target="_blank" rel="noopener"
                  className="text-center py-1.5 rounded font-ui text-[10px] tracking-widest"
                  style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${T.cyan}55`, color: T.cyan, textDecoration: 'none' }}>
                  → DALL-E
                </a>
                <a href="https://stablediffusionweb.com/" target="_blank" rel="noopener"
                  className="text-center py-1.5 rounded font-ui text-[10px] tracking-widest"
                  style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${T.lime}55`, color: T.lime, textDecoration: 'none' }}>
                  → SD Web
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const IntelligencePage = ({ onOpenInfo, membership, onOpenOcc }) => {
  const t = TABS.intelligence;
  const [openSub, setOpenSub] = useState(null);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-ui text-xs tracking-widest opacity-60" style={{ color: t.color }}>// INTELLIGENCE 🧠</div>
            <StatusPill status="beta" />
          </div>
          <h1 className="font-display text-2xl" style={{ color: t.color, textShadow: `0 0 14px ${t.color}66` }}>🧠 Intelligence</h1>
          <div className="font-ui text-xs mt-1 opacity-70" style={{ color: T.textSec }}>
            AI media creators · 2 LIVE · 3 PREVIEW · 1 LINK
          </div>
        </div>
        <button onClick={() => onOpenInfo('intelligence')} className="p-2 rounded-full shrink-0 ml-2"
          style={{ background: T.surface, border: `1px solid ${T.borderSoft}` }}>
          <span style={{ fontSize: 14 }}>🎙️ℹ️</span>
        </button>
      </div>

      <div className="space-y-2 mb-3">
        {INTELLIGENCE_SUBS.map(s => (
          <Card key={s.key} color={t.color} className="p-3" onClick={() => {
            if (s.key === 'ocular') { onOpenOcc(); return; }
            if (s.status === 'live') setOpenSub(s.key);
            else setOpenSub(s.key);  // preview opens modal too — shows vote button
          }}>
            <div className="flex items-center gap-3">
              <div className="text-3xl shrink-0">{s.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-display text-sm" style={{ color: t.color }}>{s.label}</span>
                  <StatusPill status={s.status} />
                </div>
                <div className="font-ui text-xs opacity-90" style={{ color: T.white }}>{s.short}</div>
                <div className="font-ui text-[10px] opacity-60 mt-0.5" style={{ color: T.textSec }}>{s.desc}</div>
              </div>
              <ChevronRight size={18} color={t.color} className="shrink-0" />
            </div>
          </Card>
        ))}
      </div>

      <div className="font-ui text-[10px] opacity-50 text-center mt-4" style={{ color: T.textSec }}>
        Watermark + royalty attribution applied to every output 🛡️
      </div>

      {openSub === 'sentencez' && <SentenceZModal onClose={() => setOpenSub(null)} membership={membership} />}
      {openSub === 'imageconz' && <ImageConZModal onClose={() => setOpenSub(null)} membership={membership} />}
      {openSub && !['sentencez','imageconz','ocular'].includes(openSub) && (
        <SubAppModal tabKey="intelligence" subKey={openSub} onClose={() => setOpenSub(null)} />
      )}
    </div>
  );
};

// ============================================================================
// OWNER ADMIN PAGE — vote leaderboard, referral leaderboard, active promos
// Hidden tab, only owners see it (gated by isOwner(profile))
// ============================================================================
const OwnerAdminPage = ({ onOpenInfo }) => {
  const [topVoted, setTopVoted] = useState([]);
  const [refLeaders, setRefLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = (() => { try { return localStorage.getItem('mcz:token'); } catch { return ''; } })();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    Promise.allSettled([
      fetch('/api/votes/top/?limit=20', { headers }).then(r => r.ok ? r.json() : null),
      fetch('/api/referrals/leaders/?limit=20', { headers }).then(r => r.ok ? r.json() : null),
    ]).then(([votes, refs]) => {
      if (votes.status === 'fulfilled' && votes.value?.top) setTopVoted(votes.value.top);
      if (refs.status === 'fulfilled' && refs.value?.leaders) setRefLeaders(refs.value.leaders);
      setLoading(false);
    });
  }, []);

  return (
    <div className="h-full overflow-y-auto p-3 pb-24">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-display text-xl" style={{ color: T.cyan, textShadow: `0 0 12px ${T.cyan}55` }}>
            🌐 PathZ · Admin
          </div>
          <div className="font-ui text-[10px] opacity-50" style={{ color: T.textSec }}>
            Owner-only · monitoring + signals from live users
          </div>
        </div>
        <Pill color={T.lime}>OWNER</Pill>
      </div>

      {/* TOP VOTED FEATURES */}
      <Card color={T.purple} className="p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-ui text-[10px] tracking-widest opacity-70" style={{ color: T.purple }}>
            // TOP VOTED FEATURES 🗳️
          </div>
          <span className="font-ui text-[10px] opacity-50" style={{ color: T.textSec }}>
            {topVoted.length} · build in this order
          </span>
        </div>
        {loading ? (
          <div className="font-ui text-xs opacity-50 text-center py-4" style={{ color: T.textSec }}>loading…</div>
        ) : topVoted.length === 0 ? (
          <div className="font-ui text-xs opacity-50 text-center py-4" style={{ color: T.textSec }}>
            no votes yet — users vote in SubAppModal · SingZ/RapZ/BodieZ
          </div>
        ) : (
          <div className="space-y-1">
            {topVoted.map((v, i) => (
              <div key={v.feature_key} className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
                style={{ background: i < 5 ? `${T.purple}11` : 'rgba(255,255,255,0.03)' }}>
                <span className="font-display text-sm w-7" style={{ color: i < 5 ? T.purple : T.textSec }}>
                  #{i + 1}
                </span>
                <span className="flex-1 font-ui text-xs truncate" style={{ color: T.white }}>{v.feature_key}</span>
                <span className="font-display text-sm" style={{ color: T.lime }}>{v.vote_count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* TOP REFERRERS */}
      <Card color={T.lime} className="p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-ui text-[10px] tracking-widest opacity-70" style={{ color: T.lime }}>
            // TOP REFERRERS 🎁
          </div>
          <span className="font-ui text-[10px] opacity-50" style={{ color: T.textSec }}>
            {refLeaders.length}
          </span>
        </div>
        {loading ? (
          <div className="font-ui text-xs opacity-50 text-center py-4" style={{ color: T.textSec }}>loading…</div>
        ) : refLeaders.length === 0 ? (
          <div className="font-ui text-xs opacity-50 text-center py-4" style={{ color: T.textSec }}>
            no referrals yet — drop your link in DMs / tweets to start
          </div>
        ) : (
          <div className="space-y-1">
            {refLeaders.map((r, i) => (
              <div key={r.username} className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
                style={{ background: i < 3 ? `${T.lime}11` : 'rgba(255,255,255,0.03)' }}>
                <span className="font-display text-sm w-7" style={{ color: i < 3 ? T.lime : T.textSec }}>
                  #{i + 1}
                </span>
                <span className="flex-1 font-ui text-xs truncate" style={{ color: T.white }}>@{r.username}</span>
                <span className="font-display text-sm" style={{ color: T.cyan }}>{r.invites}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* QUICK LINKS */}
      <Card color={T.cyan} className="p-3 mb-3">
        <div className="font-ui text-[10px] tracking-widest opacity-70 mb-2" style={{ color: T.cyan }}>
          // QUICK ADMIN LINKZ
        </div>
        <div className="space-y-2">
          {[
            { label: '🗄️  Django admin (full)',    href: 'https://admin.musicconnectz.net/admin/' },
            { label: '💳 Stripe dashboard',         href: 'https://dashboard.stripe.com' },
            { label: '🔧 Render service logs',     href: 'https://dashboard.render.com' },
            { label: '📊 Vercel analytics',        href: 'https://vercel.com/dashboard' },
            { label: '🌐 Cloudflare (DNS + R2)',   href: 'https://dash.cloudflare.com' },
            { label: '👁️ GitHub repos',           href: 'https://github.com/ctkoth' },
          ].map(link => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener"
              className="flex items-center justify-between py-2 px-3 rounded-lg font-ui text-xs"
              style={{ background: `${T.cyan}11`, color: T.white, textDecoration: 'none' }}>
              {link.label}
              <ExternalLink size={12} style={{ opacity: 0.5, color: T.cyan }} />
            </a>
          ))}
        </div>
      </Card>

      {/* PROMO CASCADE SEED */}
      <Card color={T.orange} className="p-3 mb-3">
        <div className="font-ui text-[10px] tracking-widest opacity-70 mb-2" style={{ color: T.orange }}>
          // TRIGGER PROMO CASCADE 🎟️ (test)
        </div>
        <div className="font-ui text-[10px] opacity-60 mb-2" style={{ color: T.textSec }}>
          Seeds a 20% cascade for yourself. Use to verify the banner works without waiting for cron.
        </div>
        <button onClick={async () => {
          const token = (() => { try { return localStorage.getItem('mcz:token'); } catch { return ''; } })();
          try {
            await fetch('/api/membership/promos/seed/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({ target_tier: 'premium', start_pct: 20 }),
            });
            alert('Cascade seeded · refresh to see banner');
          } catch (e) { alert('Failed: ' + e.message); }
        }}
          className="w-full py-2 rounded-lg font-ui text-xs tracking-widest font-bold"
          style={{ background: `linear-gradient(135deg, ${T.orange}, ${T.pink})`, color: '#000' }}>
          🚀 SEED 20% CASCADE
        </button>
      </Card>

      <div className="font-ui text-[10px] text-center opacity-30 pt-2" style={{ color: T.cyan }}>
        ADMIN · PathZ · only you see this
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
  const [auth, setAuth] = useState(null);
  const [route, setRoute] = useState(parseHash());
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState({ casualMode: false, notifications: true, collabAlerts: true, paymentAlerts: true, shareLocation: true, privateMode: false, soundEffects: true, vibration: true });
  const [infoFor, setInfoFor] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [membership, setMembership] = useState(null); // { tier, status, limits, ... } or null

  // Wave 1 state — notifications, activity feed, onboarding
  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mcz:notifications') || '[]'); } catch (e) { return []; }
  });
  const [activities, setActivities] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mcz:activities') || '[]'); } catch (e) { return []; }
  });
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Verification (Wave 1)
  const [verification, setVerification] = useState(null);
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);
  const [showVerifyPhone, setShowVerifyPhone] = useState(false);

  // Wave 2 state — streak, scheduled battles, daily critique
  const [streak, setStreak] = useState(() => storageLoad('mcz:streak:v1', null));
  const [scheduledBattles, setScheduledBattles] = useState([]);
  const [dailyCritique, setDailyCritique] = useState(() => storageLoad('mcz:critique:v1', null));

  // Wave 3 state — limit-hit modal
  const [limitHit, setLimitHit] = useState(null);  // { type, value } or null

  // Expose globally so child components can trigger it
  useEffect(() => {
    window.__mczShowLimit = (type, value) => setLimitHit({ type, value });
    return () => { delete window.__mczShowLimit; };
  }, []);

  const refreshCritique = async () => {
    try {
      const token = localStorage.getItem('mcz:token');
      if (!token) return;
      const res = await fetch('/api/ai/critique/daily/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDailyCritique(data);
        storageSave('mcz:critique:v1', data);
      }
    } catch (e) { /* silent */ }
  };

  const refreshVerification = async () => {
    try {
      const token = localStorage.getItem('mcz:token');
      if (!token) return;
      const res = await fetch('/api/auth/verify/status/', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setVerification(await res.json());
    } catch (e) { /* silent */ }
  };

  useEffect(() => {
    if (!auth) { setVerification(null); return; }
    refreshVerification();
    // Re-check on interval — they may verify from another tab
    const t = setInterval(refreshVerification, 60000);
    return () => clearInterval(t);
  }, [auth?.username]);

  // Handle email verification token in URL (e.g. /#verify-email=abc123)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('verify-email=')) {
      const code = hash.slice('verify-email='.length);
      fetch('/api/auth/verify/email/confirm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code }),
      }).then(r => r.json()).then(data => {
        if (data.verified) { window.location.hash = 'home'; refreshVerification(); }
      }).catch(() => {});
    }
  }, []);

  const notifUnread = notifications.filter(n => !n.read_at).length;

  // Show onboarding if logged in but never completed
  useEffect(() => {
    if (!auth) { setShowOnboarding(false); return; }
    const completed = (() => { try { return localStorage.getItem('mcz:onboarded') === 'true'; } catch (e) { return false; } })();
    const hasProfile = profile?.artistName && profile?.role;
    if (!completed && !hasProfile) setShowOnboarding(true);
  }, [auth?.username, profile?.artistName, profile?.role]);

  // Poll notifications + activity every 30s
  useEffect(() => {
    if (!auth) return;
    const fetchAll = async () => {
      try {
        const token = localStorage.getItem('mcz:token');
        if (!token) return;
        // Notifications
        const nRes = await fetch('/api/notifications/', { headers: { 'Authorization': `Bearer ${token}` } });
        if (nRes.ok) {
          const data = await nRes.json();
          if (Array.isArray(data?.results || data)) {
            const list = data.results || data;
            setNotifications(list);
            try { localStorage.setItem('mcz:notifications', JSON.stringify(list)); } catch (e) {}
          }
        }
        // Activity feed
        const aRes = await fetch('/api/activity/feed/', { headers: { 'Authorization': `Bearer ${token}` } });
        if (aRes.ok) {
          const data = await aRes.json();
          if (Array.isArray(data?.results || data)) {
            const list = data.results || data;
            setActivities(list);
            try { localStorage.setItem('mcz:activities', JSON.stringify(list)); } catch (e) {}
          }
        }
      } catch (e) { /* silent — backend may be down */ }
    };
    fetchAll();
    const t = setInterval(fetchAll, 30000);
    return () => clearInterval(t);
  }, [auth?.username]);

  // Fetch membership tier when auth changes — silent fail if no backend
  useEffect(() => {
    if (!auth) { setMembership(null); return; }
    apiMemberships.me().then(m => { if (m) setMembership(m); });
  }, [auth?.username, auth?.access]);

  useEffect(() => {
    // Check for OAuth callback in URL hash (#access=jwt&refresh=jwt&via=google&username=foo)
    const hash = window.location.hash.slice(1);
    if (hash && hash.includes('access=')) {
      const params = new URLSearchParams(hash);
      const access = params.get('access');
      const refresh = params.get('refresh');
      const via = params.get('via');
      const username = params.get('username');
      if (access) {
        // Store JWT tokens
        try { localStorage.setItem('mcz:token', access); } catch {}
        if (refresh) { try { localStorage.setItem('mcz:refresh', refresh); } catch {} }
        const authObj = { access, username: username || 'user', via: via || 'oauth' };
        setAuth(authObj);
        save(KEYS.auth, authObj);
        // Strip the hash from URL so refresh doesn't re-trigger
        window.history.replaceState({}, '', window.location.pathname + window.location.search);
      }
    } else if (hash && hash.includes('oauth_error=')) {
      const params = new URLSearchParams(hash);
      console.warn('OAuth error:', params.get('oauth_error'));
      window.history.replaceState({}, '', window.location.pathname);
    }

    Promise.all([load(KEYS.auth, null), load(KEYS.tasks, []), load(KEYS.profile, null), load(KEYS.settings, null)])
      .then(([a, t, p, s]) => {
        if (a) setAuth(a);
        setTasks(t || []);
        setProfile(p);
        if (s) setSettings(s);
        setLoaded(true);
      });
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('popstate', onHash);
    };
  }, []);

  const onLogin = (a) => { setAuth(a); save(KEYS.auth, a); setHash({ tab: 'home' }); };
  const onLogout = () => { setAuth(null); save(KEYS.auth, null); setMembership(null); setHash({ tab: 'home' }); };
  const onJump = (tab, modal = null, inner = null) => setHash({ tab, modal, inner });
  const onOpenSub = (tab, modal) => setHash({ tab, modal });
  const onCloseModal = () => setHash({ tab: route.tab });
  const onOpenLilith = () => setHash({ tab: 'toolz', modal: 'lilith' });
  const onOpenOcc = () => setHash({ tab: 'toolz', modal: 'ocular' });
  const onOpenImageZ = () => setHash({ tab: 'toolz', modal: 'imagez' });
  const onOpenVideoZ = () => setHash({ tab: 'toolz', modal: 'videoz' });

  if (!loaded) {
    return <div className="w-full h-screen flex items-center justify-center" style={{ background: T.bgDeep, color: T.purple, fontFamily: 'Space Grotesk, sans-serif' }}>
      <div className="font-ui text-sm opacity-50">// loading Music ConnectZ…</div>
    </div>;
  }

  if (!auth) return <>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Audiowide&display=swap');
      .font-display { font-family: 'Audiowide', cursive; }
      .font-ui { font-family: 'Space Grotesk', sans-serif; }
      ::-webkit-scrollbar { width:0; height:0; }`}</style>
    <LoginScreen onLogin={onLogin} />
  </>;

  const tabDef = TABS[route.tab] || TABS.home;
  // Owner gate — if a non-owner hits an owner-only tab, bounce them home
  useEffect(() => {
    if (tabDef.ownerOnly && !isOwner(profile)) {
      setHash({ tab: 'home' });
    }
  }, [route.tab, profile]);
  const showLilith = route.tab === 'toolz' && route.modal === 'lilith';
  const showOcc = route.tab === 'toolz' && route.modal === 'ocular';
  const showImageZ = route.tab === 'toolz' && route.modal === 'imagez';
  const showVideoZ = route.tab === 'toolz' && route.modal === 'videoz';
  const showPersonas = route.tab === 'profile' && (route.modal === 'personas' || route.modal === 'examples');
  const personaInner = route.modal === 'examples' ? 'examples' : 'personas';
  const showSubModal = route.modal && route.tab !== 'home' && route.modal !== 'lilith' && route.modal !== 'ocular' && !showPersonas && TABS[route.tab]?.subs?.[route.modal];

  return (
    <div className="w-full h-screen flex flex-col relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at top, ${T.bgMid} 0%, ${T.bgDeep} 50%, #000 100%)`,
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Audiowide&display=swap');
        .font-display { font-family: 'Audiowide', cursive; }
        .font-ui { font-family: 'Space Grotesk', sans-serif; }
        ::-webkit-scrollbar { width:0; height:0; }
      `}</style>

      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 15% 25%, ${T.purple}22 0%, transparent 35%), radial-gradient(circle at 85% 75%, ${T.cyan}15 0%, transparent 35%)`,
        }} />

      <div className="px-4 pt-3 pb-1 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-1.5">
          <span className="text-lg" style={{ filter: `drop-shadow(0 0 8px ${T.purple})` }}>🏡</span>
          <span className="font-ui text-xs tracking-[0.15em] uppercase font-bold"
            style={{ background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            Music ConnectZ
          </span>
          <span className="font-ui text-[9px] opacity-50 ml-1" style={{ color: T.textMuted }}>v0.32</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isOwner(profile) && (
            <span className="font-ui text-[8px] tracking-widest px-1.5 py-0.5 rounded-full"
              style={{ background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`, color: '#000', fontWeight: 800 }}>
              OWNER
            </span>
          )}
          {membership && membership.tier && membership.tier !== 'free' && (
            <span className="font-ui text-[8px] tracking-widest px-1.5 py-0.5 rounded-full cursor-pointer"
              onClick={() => onJump('money')}
              title={`${membership.tier.toUpperCase()} · ${membership.status}${membership.annual ? ' · annual' : ''}`}
              style={{
                background: membership.tier === 'statz'
                  ? `linear-gradient(135deg, ${T.pink}, ${T.orange})`
                  : `linear-gradient(135deg, ${T.cyan}, ${T.lime})`,
                color: '#000', fontWeight: 800,
              }}>
              {membership.tier === 'statz' ? '📈 STATZ' : '🥇 PREMIUM'}
            </span>
          )}
          {profile?.artistName && (
            <span className="font-ui text-[10px] opacity-70 cursor-pointer" style={{ color: T.cyan }}
              onClick={() => onJump('profile')}>@{profile.artistName}</span>
          )}
          <span className="font-ui text-[9px] opacity-40" style={{ color: T.textMuted }}>{route.tab}</span>
        </div>
      </div>

      <TabStrip active={route.tab} onPick={onJump} profile={profile} />

      {/* Notification Bell — top right floating */}
      {auth && (
        <div className="absolute top-3 right-3 z-30">
          <NotificationBell onOpen={() => setShowNotifPanel(true)} count={notifUnread} />
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        {route.tab === 'home' && <HomePage tasks={tasks} profile={profile} onJump={onJump} onOpenInfo={setInfoFor} membership={membership} activities={activities} verification={verification} onVerifyEmail={() => setShowVerifyEmail(true)} onVerifyPhone={() => setShowVerifyPhone(true)} streak={streak} setStreak={setStreak} scheduledBattles={scheduledBattles} dailyCritique={dailyCritique} refreshCritique={refreshCritique} />}
        {route.tab === 'profile' && <ProfilePage profile={profile} setProfile={setProfile} onOpenInfo={setInfoFor} membership={membership} />}
        {route.tab === 'settingz' && <SettingZPage settings={settings} setSettings={setSettings} onOpenInfo={setInfoFor} onLogout={onLogout} />}
        {route.tab === 'collabz' && <CollabZPage profile={profile} membership={membership} onOpenInfo={setInfoFor} />}
        {route.tab === 'messagez' && <MessageZPage profile={profile} membership={membership} onOpenInfo={setInfoFor} />}
        {route.tab === 'battlez' && <BattleZPage profile={profile} onOpenInfo={setInfoFor} />}
        {route.tab === 'ratez' && <RateZPage onOpenInfo={setInfoFor} />}
        {route.tab === 'money' && <MoneyZPage membership={membership} refreshMembership={() => apiMemberships.me().then(m => m && setMembership(m))} onOpenInfo={setInfoFor} />}
        {route.tab === 'pathz' && isOwner(profile) && <OwnerAdminPage onOpenInfo={setInfoFor} />}
        {route.tab === 'intelligence' && <IntelligencePage onOpenInfo={setInfoFor} membership={membership} onOpenOcc={onOpenOcc} />}
        {!['home','profile','settingz','collabz','messagez','battlez','ratez','money','pathz','intelligence'].includes(route.tab) && (
          <GenericTabPage tabKey={route.tab} onOpenInfo={setInfoFor} onOpenSub={onOpenSub} onOpenLilith={onOpenLilith} onOpenOcc={onOpenOcc} onOpenImageZ={onOpenImageZ} onOpenVideoZ={onOpenVideoZ} />
        )}
      </div>

      {infoFor && <CoreyInfoModal tabKey={infoFor} onClose={() => setInfoFor(null)} casualMode={settings.casualMode} />}
      {showLilith && <LilithModal tasks={tasks} setTasks={setTasks} onClose={onCloseModal} />}
      {showOcc && <OCCModal onClose={onCloseModal} membership={membership} />}
      {showImageZ && <ImageZModal onClose={onCloseModal} membership={membership} />}
      {showVideoZ && <VideoZModal onClose={onCloseModal} membership={membership} />}
      {showPersonas && <PersonaManagerModal onClose={onCloseModal} initialTab={personaInner} />}
      {showSubModal && <SubAppModal tabKey={route.tab} subKey={route.modal} onClose={onCloseModal} />}

      {/* Wave 1 — onboarding + notifications modals */}
      {showOnboarding && (
        <OnboardingFlow profile={profile} setProfile={setProfile}
          onComplete={() => setShowOnboarding(false)}
          onJump={onJump} />
      )}
      {showNotifPanel && (
        <NotificationsPanel notifications={notifications} setNotifications={setNotifications}
          onClose={() => setShowNotifPanel(false)} />
      )}

      {/* Verification modals (Wave 1) */}
      {showVerifyEmail && (
        <VerifyEmailModal user={auth} onClose={() => setShowVerifyEmail(false)}
          onVerified={() => { setShowVerifyEmail(false); refreshVerification(); }} />
      )}
      {showVerifyPhone && (
        <VerifyPhoneModal onClose={() => setShowVerifyPhone(false)}
          onVerified={() => { setShowVerifyPhone(false); refreshVerification(); }} />
      )}

      {/* Wave 3 — Smart limit-hit paywall */}
      {limitHit && (
        <LimitHitModal limitType={limitHit.type} currentValue={limitHit.value}
          membership={membership}
          onClose={() => setLimitHit(null)}
          onUpgrade={(tier) => { setLimitHit(null); onJump('money'); }} />
      )}

      {/* Promo cascade banner — only shows for Free users with active offer */}
      <PromoCascadeBanner
        membership={membership}
        onSubscribe={async (tier, annual, promoCode) => {
          try {
            const { memberships: memApi } = await import('./lib/api.js');
            const res = await memApi.subscribe({ tier, annual, promoCode });
            if (res?.checkout_url) window.location.href = res.checkout_url;
          } catch (e) { console.error(e); }
        }}
        onDismiss={() => {}}
      />
    </div>
  );
}
