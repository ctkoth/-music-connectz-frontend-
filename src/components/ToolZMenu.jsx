import React, { useState } from 'react';
import { goToSpot } from '../goto.js';
import { presetDirectzFormat } from '../directzPreset.js';
import { canMini, slugFor } from '../App.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { IconImg } from '../App.jsx';
import { FOCUS_MODE, FOCUS_COACHES, FOCUS_SUPPORT } from '../focus.js';
import './ToolZMenu.css';

// Each tile draws through the SAME registry key the tab strip uses (App.jsx
// TABS), via IconImg — Corey's own artwork first, the generated glyph only as
// the backup. This menu used to keep its own path list, which pointed VenueZ
// at the OpportunitieZ glyph and MercheZ at SoundZ's, and never saw the custom
// art at all. A third copy of "which picture is this app" is how that happens.
const ICON_KEY = {
  singz: "singz.png", rapz: "rapz.png", guitarz: "guitarz.png", bassz: "bassz.png",
  keyz: "keyz.png", drumz: "drumz.png", violinz: "violinz.png",
  battlez: "battlez.png", collabz: "collabz.png", infernoz: "infernoz.png",
  socialiZeZ: "social_connectz.png", vybez: "vybez.png", postz: "postz.png",
  messagez: "messagez.png", skillz: "skillz.png", occ: "occ.png", bosttake: "coachz.jpg",
  onboardz: "onboardz.png", logz: "logz.png", profilez: "profilez.png",
  widgetz: "playlistz.png", keyconnectz: "keyconnectz.png", venuez: "venuez.png",
  directz: "directz.png", statez: "statsz.png", funnelz: "funnelz.png", groupz: "groupz.png",
  merchz: "merchz.png", beatz: "beatz.png", lilith: "lilithz.png", bodiez: "bodiez.png",
  journalz: "journalz.jpg", metz: "metz.jpg", tunerz: "tunerz.jpg", chordz: "chordz.jpg", viewz: "viewz.png",
  mixconnectz: "mixconnectz.png", imageconnectz: "imageconnectz.png", videoconnectz: "videoconnectz.png",
  instrumentalconnectz: "instrumentalconnectz.png", sentenceconnectz: "sentencez.png",
  membershipz: "money.png", preferencez: "preferencez.png", substancez: "substancez.png", zodiacz: "zodiacz.png", facez: "facez.png", personaz: "personaz.png", distributez: "distributez.png", ratez: "ratez.png", sonday: "sonday.png", parcel: "parcel.png", royaltiez: "royaltiez.png",
  reelz: "reelz.png", episodez: "episodez.png", moviez: "moviez.png",
  mangaz: "mangaz.png", characterz: "characterz.png", voicezstylez: "voicezstylez.png",
};
const EMOJI = {
  singz: "🎤", rapz: "🎙️", guitarz: "🎸", bassz: "🎸", keyz: "🎹", drumz: "🥁", violinz: "🎻",
  battlez: "⚔️", collabz: "🤝", infernoz: "🔥", socialiZeZ: "👥", vybez: "💫", postz: "📝",
  messagez: "💬", skillz: "⭐", occ: "👨‍🏫", bosttake: "🎬", onboardz: "🚀", logz: "📊",
  profilez: "👤", widgetz: "🔗", keyconnectz: "🔑", venuez: "🎪", directz: "🎥", statez: "📈",
  funnelz: "📉", groupz: "👫", merchz: "🛍️", beatz: "🎹", lilith: "💃", bodiez: "💪", journalz: "📔",
  membershipz: "💳", metz: "🎚️", tunerz: "🎯", chordz: "🎼", viewz: "👁️",
  mixconnectz: "🎛️", imageconnectz: "🖼️", videoconnectz: "🎬", instrumentalconnectz: "🎹", sentenceconnectz: "✍️",
  preferencez: "💞", substancez: "🧠", zodiacz: "♈", reelz: "🎞️", episodez: "📺", moviez: "🎥",
  mangaz: "📚", characterz: "🦁", voicezstylez: "🗣️",
};

// One app, several doors: CharacterZ and VoiceZ StyleZ sit under DesignZ AND
// DirectZ (and VoiceZ StyleZ under MangaZ's group), because a character is
// drawn in one place and directed in another. Same key, same app — listing it
// twice is a second door, never a second copy.
const CHARACTERZ = { key: 'characterz', label: 'CharacterZ', color: 'cyan', desc: 'FaceZ with PersonalitieZ', soon: true };
const VOICEZ_STYLEZ = { key: 'voicezstylez', label: 'VoiceZ StyleZ', color: 'magenta', desc: 'Voices for your CharacterZ', soon: true };

// Flatten apps from grouped structure
const flattenApps = (categoryData) => {
  if (!Array.isArray(categoryData)) return [];

  const result = [];
  categoryData.forEach(item => {
    if (item.group && item.apps) {
      result.push(...item.apps);
    } else if (item.key) {
      result.push(item);
    }
  });
  return result;
};

// App categories and configuration
// The instrument coaches live under BOTH ToolZ and SkillZ — one list, so
// the two menus can never disagree about what a coach is.
const COACH_GROUPS = [
    {
      group: 'Vocal Instruments',
      apps: [
        { key: 'singz', label: 'SingZ', color: 'cyan', desc: 'Reach your voice' },
        { key: 'rapz', label: 'RapZ', color: 'magenta', desc: 'Flow with purpose' },
      ]
    },
    {
      group: 'String & Keys',
      apps: [
        { key: 'guitarz', label: 'GuitarZ', color: 'yellow', desc: 'Guitar coaching' },
        { key: 'bassz', label: 'BassZ', color: 'green', desc: 'Bass coaching' },
        { key: 'keyz', label: 'KeyZ', color: 'cyan', desc: 'Keyboard coaching' },
        { key: 'violinz', label: 'ViolinZ', color: 'yellow', desc: 'String instrument coaching' },
      ]
    },
    {
      group: 'Percussion',
      apps: [
        { key: 'drumz', label: 'DrumZ', color: 'magenta', desc: 'Drums coaching' },
      ]
    },
];

const TOOLZ_MENU = {
  'SocialiZeZ': [
    {
      group: 'Discovery',
      apps: [
        { key: 'socialiZeZ', tab: 'social', label: 'SocialiZeZ', color: 'magenta', desc: 'Connect & find your level' },
        { key: 'vybez', label: 'VybeZ', color: 'cyan', desc: 'Find your frequency' },
        { key: 'ratez', label: 'Rate ConnectZ', color: 'gold', desc: 'Rate work and earn ⚡ — and see every rating you have, by kind' },
      ]
    },
    {
      group: 'Quick Connect',
      apps: [
        { key: 'infernoz', label: 'InfernoZ', color: 'orange', desc: 'Short-term projects & dating', soon: true },
      ]
    },
    {
      group: 'Share & Communicate',
      apps: [
        { key: 'postz', label: 'PostZ', color: 'green', desc: 'Share & connect' },
        { key: 'messagez', label: 'MessageZ', color: 'yellow', desc: 'Connect meaningfully' },
        { key: 'parcel', label: 'Parcel Primate', color: 'orange', desc: 'A newsletter to your followers — post, DM, and email for whoever wants it' },
      ]
    },
  ],
  'CollabZ': [
    { key: 'collabz', label: 'CollabZ', color: 'cyan', desc: 'Build together, get better' },
  ],
  'BattleZ': [
    { key: 'battlez', label: 'BattleZ', color: 'red', desc: 'Face off & level up' },
  ],
  'GroupZ': [
    { key: 'groupz', label: 'GroupZ', color: 'cyan', desc: 'Belong & grow together' },
  ],
  'ToolZ': [
    ...COACH_GROUPS,
    {
      group: 'Practice Tools',
      apps: [
        { key: 'metz', label: 'MetZ', color: 'gold', desc: 'Metronome — tempo, time signature, subdivisions' },
        { key: 'tunerz', label: 'TunerZ', color: 'cyan', desc: 'Tune any instrument by ear' },
        { key: 'chordz', label: 'ChordZ', color: 'magenta', desc: 'Chords, progressions & voicings' },
        { key: 'journalz', label: 'JournalZ', color: 'yellow', desc: 'A private practice diary' },
      ]
    },
    {
      group: 'DirectZ',
      apps: [
        { key: 'directz', label: 'DirectZ', color: 'cyan', desc: 'Post a video into its length band' },
        // DirectZ's children BY LENGTH — the three bands the server enforces.
        { key: 'reelz', tab: 'directz', preset: 'reelz', label: 'ReelZ', color: 'magenta', desc: '30 seconds to 30 minutes' },
        { key: 'episodez', tab: 'directz', preset: 'episodez', label: 'EpisodeZ', color: 'cyan', desc: '30 to 60 minutes' },
        { key: 'moviez', tab: 'directz', preset: 'moviez', label: 'MovieZ', color: 'magenta', desc: '1 to 3 hours' },
        CHARACTERZ,
        VOICEZ_STYLEZ,
      ]
    },
    {
      group: 'Release & Earn',
      apps: [
        { key: 'beatz', label: 'BeatZ', color: 'purple', desc: 'License beats from producers, or sell your own' },
        { key: 'distributez', label: 'DistributeZ', color: 'cyan', desc: 'Your posts and collabs become releases — Free sends 1 a month' },
        { key: 'royaltiez', label: 'RoyaltieZ', color: 'gold', desc: 'What your releases earn, and cashing it out' },
      ]
    },
    {
      group: 'Progress & Analytics',
      apps: [
        { key: 'sonday', label: 'Sonday', color: 'gold', desc: 'Boards for your projects — drafts to released, shared with your team' },
        { key: 'logz', label: 'LogZ', color: 'yellow', desc: 'Transaction history & ledger' },
        { key: 'viewz', label: 'ViewZ', color: 'cyan', desc: 'Who viewed your posts & profile — a DAW timeline (StatZ)' },
      ]
    },
    {
      group: 'Utilities',
      apps: [
        { key: 'widgetz', tab: 'profilez', label: 'WidgetZ', color: 'magenta', desc: 'Your links open on screen — add them in ProfileZ' },
        { key: 'keyconnectz', label: 'KeyConnectZ', color: 'green', desc: 'Transcribe & read-aloud' },
      ]
    },
  ],
  'SkillZ': [
    ...COACH_GROUPS,
    {
      group: 'Progression',
      apps: [
        { key: 'skillz', category: 'SkillZ', label: 'SkillZ', color: 'gold', desc: 'Every coach and its skill tree' },
      ]
    },
  ],
  'IntelligenceZ': [
    {
      // Not built yet: listed so the suite is visible, never as a door that
      // opens onto nothing. `soon` replaces the Open buttons with a label.
      group: 'AI Creation',
      apps: [
        { key: 'mixconnectz', label: 'Mix ConnectZ', color: 'cyan', desc: 'AI mixing & mastering for your songs', soon: true },
        { key: 'imageconnectz', label: 'Image ConnectZ', color: 'magenta', desc: 'Covers, profile & promo pictures, banners and backgrounds from your FaceZ', soon: true },
        { key: 'facez', label: 'FaceZ', color: 'cyan', desc: 'The faces Video ConnectZ can star' },
        { key: 'videoconnectz', label: 'Video ConnectZ', color: 'cyan', desc: 'Music, bio & promo videos, starring your FaceZ' },
        { key: 'instrumentalconnectz', label: 'Instrumental ConnectZ', color: 'yellow', desc: 'MIDI by genre, instruments, BPM & key — StatZ searches keys by mood' },
        { key: 'sentenceconnectz', label: 'Sentence ConnectZ', color: 'magenta', desc: 'Lyrics, captions, posts, essays & agreements' },
      ]
    },
    {
      group: 'AI Coaching',
      apps: [
        { key: 'occ', label: 'Ocular Code ConnectZ', color: 'magenta', desc: 'OCC — AI that builds with you' },
        { key: 'bosttake', tab: 'singz', label: 'BossTake', color: 'cyan', desc: 'Record & submit takes to a coach' },
      ]
    },
    {
      group: 'Getting Started',
      apps: [
        { key: 'onboardz', label: 'OnboardZ', color: 'green', desc: 'Get started guide' },
      ]
    },
  ],
  'ProfileZ': [
    {
      group: 'Your Profile',
      apps: [
        { key: 'profilez', label: 'ProfileZ', color: 'cyan', desc: 'Edit your profile' },
      ]
    },
    {
      group: 'Members by metric',
      apps: [
        { key: 'preferencez', label: 'PreferenceZ', color: 'magenta', desc: 'Who members are attracted to (18+)' },
        { key: 'substancez', label: 'SubstanceZ', color: 'green', desc: 'What members use, and how often (18+)' },
        { key: 'personaz', label: 'PersonaZ', color: 'magenta', desc: 'Every persona and skill — yours with start dates, or find who else has them' },
        { key: 'facez', label: 'FaceZ', color: 'cyan', desc: 'Faces for your AI videos — and rate others (18+)' },
        { key: 'zodiacz', label: 'ZodiacZ', color: 'yellow', desc: 'Every sign, its members, and today\'s horoscope' },
      ]
    },
  ],
  'DesignZ': [
    {
      group: 'Draw & create',
      apps: [
        { key: 'mangaz', label: 'MangaZ', color: 'magenta', desc: 'Comics and manga from your CharacterZ', soon: true },
        CHARACTERZ,
        VOICEZ_STYLEZ,
      ]
    },
  ],
  'VenueZ': [
    { key: 'venuez', label: 'VenueZ', color: 'orange', desc: 'Discover venues' },
  ],
  'MercheZ': [
    { key: 'merchz', label: 'MercheZ', color: 'magenta', desc: 'Sell and buy from other creators — legal goods only' },
  ],
  'Lilith': [
    { key: 'lilith', label: 'Lilith', color: 'magenta', desc: 'Apple Things-style productivity with XP-based streaks' },
  ],
  'BodieZ': [
    { key: 'bodiez', label: 'BodieZ', color: 'orange', desc: 'Strength training, body transformation & workout planning' },
  ],
};

const CATEGORY_ICON_KEY = {
  SocialiZeZ: "social_connectz.png", CollabZ: "collabz.png", BattleZ: "battlez.png",
  GroupZ: "groupz.png", SkillZ: "skillz.png", ToolZ: "toolz.png", IntelligenceZ: "intelligencez.png",
  ProfileZ: "profilez.png", DesignZ: "designz.png", VenueZ: "venuez.png", MercheZ: "merchz.png",
  Lilith: "lilithz.png", BodieZ: "bodiez.png",
};

// Category info for the main grid
const CATEGORIES = [
  { key: 'SocialiZeZ', label: 'SocialiZeZ', color: 'magenta' },
  { key: 'CollabZ', label: 'CollabZ', color: 'cyan' },
  { key: 'BattleZ', label: 'BattleZ', color: 'red' },
  { key: 'GroupZ', label: 'GroupZ', color: 'cyan' },
  { key: 'SkillZ', label: 'SkillZ', color: 'magenta' },
  { key: 'ToolZ', label: 'ToolZ', color: 'yellow' },
  { key: 'IntelligenceZ', label: 'IntelligenceZ', color: 'magenta' },
  { key: 'ProfileZ', label: 'ProfileZ', color: 'cyan' },
  { key: 'DesignZ', label: 'DesignZ', color: 'magenta' },
  { key: 'VenueZ', label: 'VenueZ', color: 'orange' },
  { key: 'MercheZ', label: 'MercheZ', color: 'magenta' },
  { key: 'Lilith', label: 'Lilith', color: 'magenta' },
  { key: 'BodieZ', label: 'BodieZ', color: 'orange' },
];

// Labels for the focus tiles that no ToolZ category names (see focus.js).
const FOCUS_LABEL = {
  singz: 'SingZ', rapz: 'RapZ', guitarz: 'GuitarZ', bassz: 'BassZ', keyz: 'KeyZ',
  drumz: 'DrumZ', violinz: 'ViolinZ', postz: 'PostZ', profilez: 'ProfileZ',
  messagez: 'MessageZ', battlez: 'BattleZ', metz: 'MetZ', tunerz: 'TunerZ',
  chordz: 'ChordZ', membershipz: 'MembershipZ', onboardz: 'OnboardZ', logz: 'LogZ',
  bodiez: 'BodieZ',
};

function FocusTile({ appKey, onOpen, big }) {
  return (
    <button className={`category-card ${big ? 'cyan' : 'magenta'}`} onClick={() => onOpen(appKey)}>
      {ICON_KEY[appKey] ? (
        <IconImg icon={ICON_KEY[appKey]} alt={FOCUS_LABEL[appKey]} className="category-icon-img"
                 fallback={<span>{EMOJI[appKey] || '🎵'}</span>} />
      ) : (
        <span style={{ fontSize: 28 }}>{EMOJI[appKey] || '🎵'}</span>
      )}
      <div className="category-label">{FOCUS_LABEL[appKey] || appKey}</div>
    </button>
  );
}

export default function ToolZMenu() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(null);
  // Focus mode: the coach leads and the thirteen categories wait behind one
  // tap. They are all still here — see focus.js for why they are not offered.
  const [showMore, setShowMore] = useState(!FOCUS_MODE);
  const openFocus = (key) => goToSpot(key, `${key}:main`);
  const [hoveredApp, setHoveredApp] = useState(null);

  // Where a tile goes. Most tiles ARE a tab; some are a door into one (a
  // DirectZ length band, the coach that takes a Boss Take) or into another
  // ToolZ category. Every key here was checked against App.jsx's TABS — a
  // tile whose key is not a tab is a button that does nothing.
  const tabOf = (app) => app.tab || app.key;
  const handleAppClick = (app) => {
    if (app.category) { setSelectedCategory(app.category); return; }
    if (app.preset) presetDirectzFormat(app.preset);
    goToSpot(tabOf(app), `${tabOf(app)}:main`);
  };

  const handleOpenOption = (app, openType) => {
    if (openType === 'window') {
      // `//rapz` is a protocol-relative URL — it opened a HOST called rapz.
      if (app.preset) presetDirectzFormat(app.preset);
      window.open(`/${slugFor(tabOf(app))}`, '_blank', 'noopener');
    } else if (openType === 'split') {
      if (app.preset) presetDirectzFormat(app.preset);
      window.dispatchEvent(new CustomEvent('mcz-split', { detail: tabOf(app) }));
    } else {
      handleAppClick(app);
    }
  };

  if (selectedCategory) {
    const apps = flattenApps(TOOLZ_MENU[selectedCategory]);
    const category = CATEGORIES.find(c => c.key === selectedCategory);

    return (
      <div className="toolz-menu-container">
        <div className="toolz-header">
          <button
            className="back-button"
            onClick={() => setSelectedCategory(null)}
          >
            ← Back
          </button>
          <div className="toolz-icon-main">
            <IconImg icon={CATEGORY_ICON_KEY[category.key]} alt={category.label} className="category-icon-img" />
          </div>
          <h1>{category.label}</h1>
        </div>

        <div className="apps-detail-grid">
          {apps.map((app) => (
            <div key={app.key} className={`app-detail-card ${app.color}`}>
              <div className="app-detail-header">
                <div className="app-icon-small">
                  {ICON_KEY[app.key] ? (
                    <IconImg icon={ICON_KEY[app.key]} alt={app.label}
                      fallback={<span>{EMOJI[app.key] || "🎵"}</span>} />
                  ) : (
                    <span>{EMOJI[app.key] || "🎵"}</span>
                  )}
                </div>
                <div className="app-detail-info">
                  <h3>{app.label}</h3>
                  <p>{app.desc}</p>
                </div>
              </div>

              {app.soon ? (
                <div className="app-open-options">
                  <span className="open-btn" aria-disabled="true">Coming soon</span>
                </div>
              ) : (
              <div className="app-open-options">
                <button
                  className="open-btn open-default"
                  onClick={() => handleAppClick(app)}
                  title="Open in current view"
                >
                  ▶ Open
                </button>
                <button
                  className="open-btn open-window"
                  onClick={() => handleOpenOption(app, 'window')}
                  title="Open in new window"
                >
                  ⧉ Window
                </button>
                <button
                  className="open-btn open-split"
                  onClick={() => handleOpenOption(app, 'split')}
                  title="Open in split view"
                >
                  ⊞ Split
                </button>
                {canMini(tabOf(app), user?.tier) && (
                  <button
                    className="open-btn open-split"
                    onClick={() => window.dispatchEvent(new CustomEvent('mcz-mini', { detail: tabOf(app) }))}
                    title="Dock it small beside any app — up to three at once"
                  >
                    ◱ Mini
                  </button>
                )}
              </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="toolz-stats">
          <div className="stat-item">
            <span className="stat-icon">📱</span>
            <span>{apps.length} Tools</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">⚡</span>
            <span>Ready to use</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="toolz-menu-container">
      <div className="toolz-header">
        <img src="/logo.png?v=2" alt="Music ConnectZ" className="toolz-mcz-logo" />
        <h1>Music ConnectZ</h1>
        <p className="toolz-subtitle">
          {FOCUS_MODE ? 'Score a take. Send it again. Watch the number move.' : 'Every app, one place'}
        </p>
      </div>

      {FOCUS_MODE && (
        <>
          <p className="toolz-subtitle" style={{ marginBottom: 8 }}>Your coach — pick an instrument</p>
          <div className="category-grid">
            {FOCUS_COACHES.map((k) => <FocusTile key={k} appKey={k} onOpen={openFocus} big />)}
          </div>
          <p className="toolz-subtitle" style={{ margin: '20px 0 8px' }}>Around the coach</p>
          <div className="category-grid">
            {FOCUS_SUPPORT.map((k) => <FocusTile key={k} appKey={k} onOpen={openFocus} />)}
          </div>
          <button
            className="toolz-more-button"
            onClick={() => setShowMore((v) => !v)}
          >
            {showMore ? 'Hide the other apps' : `More apps (${CATEGORIES.length} categories)`}
          </button>
        </>
      )}

      {/* Category Grid */}
      {showMore && (
      <div className="category-grid">
        {CATEGORIES.map((category) => (
          <button
            key={category.key}
            className={`category-card ${category.color}`}
            onClick={() => setSelectedCategory(category.key)}
          >
            <IconImg icon={CATEGORY_ICON_KEY[category.key]} alt={category.label} className="category-icon-img" />
            <div className="category-label">{category.label}</div>
          </button>
        ))}
      </div>
      )}

      {/* Quick Stats */}
      {showMore && (
      <div className="toolz-stats">
        <div className="stat-item">
          <span className="stat-icon">🎵</span>
          <span>{CATEGORIES.length} Categories</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">👥</span>
          <span>{new Set(Object.values(TOOLZ_MENU).flatMap((c) => flattenApps(c).map((a) => a.key))).size} Apps</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">⭐</span>
          <span>Explore & Create</span>
        </div>
      </div>
      )}
    </div>
  );
}
