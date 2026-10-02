import React, { useState } from 'react';
import { goToSpot } from '../goto.js';
import { IconImg } from '../App.jsx';
import './ToolZMenu.css';

// Each tile draws through the SAME registry key the tab strip uses (App.jsx
// TABS), via IconImg — Corey's own artwork first, the generated glyph only as
// the backup. This menu used to keep its own path list, which pointed VenueZ
// at the OpportunitieZ glyph and MercheZ at SoundZ's, and never saw the custom
// art at all. A third copy of "which picture is this app" is how that happens.
const ICON_KEY = {
  singz: "singz.png", rapz: "rapz.png", guitarz: "guitarz.png", bassz: "bassz.png",
  keyz: "keyz.png", drumz: "drumz.png", violinz: "violinz.png",
  battlez: "battlez.png", collabz: "collabz.png", infernoz: "offerz.png",
  socialiZeZ: "social_connectz.png", vybez: "vybez.png", postz: "postz.png",
  messagez: "messagez.png", skillz: "skillz.png", occ: "occ.png", bosttake: "coachz.jpg",
  onboardz: "onboardz.png", logz: "logz.png", profilez: "profilez.png",
  widgetz: "playlistz.png", keyconnectz: "keyconnectz.png", venuez: "venuez.png",
  directz: "directz.png", statez: "statsz.png", funnelz: "funnelz.png", groupz: "groupz.png",
  merchz: "merchz.png", lilith: "lilithz.png", bodiez: "bodiez.png",
  journalz: "journalz.jpg", metz: "metz.jpg", tunerz: "tunerz.jpg", chordz: "chordz.jpg",
};
const EMOJI = {
  singz: "🎤", rapz: "🎙️", guitarz: "🎸", bassz: "🎸", keyz: "🎹", drumz: "🥁", violinz: "🎻",
  battlez: "⚔️", collabz: "🤝", infernoz: "🔥", socialiZeZ: "👥", vybez: "💫", postz: "📝",
  messagez: "💬", skillz: "⭐", occ: "👨‍🏫", bosttake: "🎬", onboardz: "🚀", logz: "📊",
  profilez: "👤", widgetz: "🔗", keyconnectz: "🔑", venuez: "🎪", directz: "🎥", statez: "📈",
  funnelz: "📉", groupz: "👫", merchz: "🛍️", lilith: "💃", bodiez: "💪", journalz: "📔",
  metz: "🎚️", tunerz: "🎯", chordz: "🎼",
};

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
        { key: 'socialiZeZ', label: 'SocialiZeZ', color: 'magenta', desc: 'Connect & find your level' },
        { key: 'vybez', label: 'VybeZ', color: 'cyan', desc: 'Find your frequency' },
      ]
    },
    {
      group: 'Quick Connect',
      apps: [
        { key: 'infernoz', label: 'InfernoZ', color: 'orange', desc: 'Short-term projects & dating' },
      ]
    },
    {
      group: 'Share & Communicate',
      apps: [
        { key: 'postz', label: 'PostZ', color: 'green', desc: 'Share & connect' },
        { key: 'messagez', label: 'MessageZ', color: 'yellow', desc: 'Connect meaningfully' },
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
        { key: 'directz', label: 'DirectZ', color: 'cyan', desc: 'Video recording & feedback' },
      ]
    },
    {
      group: 'Progress & Analytics',
      apps: [
        { key: 'logz', label: 'LogZ', color: 'yellow', desc: 'Transaction history & ledger' },
      ]
    },
    {
      group: 'Utilities',
      apps: [
        { key: 'widgetz', label: 'WidgetZ', color: 'magenta', desc: 'Embed & share links' },
        { key: 'keyconnectz', label: 'KeyConnectZ', color: 'green', desc: 'Transcribe & read-aloud' },
      ]
    },
  ],
  'SkillZ': [
    ...COACH_GROUPS,
    {
      group: 'Progression',
      apps: [
        { key: 'skillz', label: 'SkillZ', color: 'gold', desc: 'Track progression & badges' },
      ]
    },
  ],
  'IntelligenceZ': [
    {
      group: 'AI Coaching',
      apps: [
        { key: 'occ', label: 'OCC', color: 'magenta', desc: 'One-on-one coaching' },
        { key: 'bosttake', label: 'BossTake', color: 'cyan', desc: 'Record & submit takes' },
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
  ],
  'VenueZ': [
    { key: 'venuez', label: 'VenueZ', color: 'orange', desc: 'Discover venues' },
  ],
  'MercheZ': [
    { key: 'merchz', label: 'MercheZ', color: 'magenta', desc: 'Shop merchandise & items' },
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
  ProfileZ: "profilez.png", VenueZ: "venuez.png", MercheZ: "merchz.png",
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
  { key: 'VenueZ', label: 'VenueZ', color: 'orange' },
  { key: 'MercheZ', label: 'MercheZ', color: 'magenta' },
  { key: 'Lilith', label: 'Lilith', color: 'magenta' },
  { key: 'BodieZ', label: 'BodieZ', color: 'orange' },
];

export default function ToolZMenu() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [hoveredApp, setHoveredApp] = useState(null);

  const handleAppClick = (appKey) => {
    goToSpot(appKey, `${appKey}:main`);
  };

  const handleOpenOption = (appKey, openType) => {
    // openType: 'window', 'page', 'split'
    if (openType === 'window') {
      window.open(`//${appKey}`, appKey);
    } else if (openType === 'page') {
      goToSpot(appKey, `${appKey}:main`);
    } else if (openType === 'split') {
      // Split window behavior - would need layout management
      goToSpot(appKey, `${appKey}:main`);
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

              <div className="app-open-options">
                <button
                  className="open-btn open-default"
                  onClick={() => handleAppClick(app.key)}
                  title="Open in current view"
                >
                  ▶ Open
                </button>
                <button
                  className="open-btn open-window"
                  onClick={() => handleOpenOption(app.key, 'window')}
                  title="Open in new window"
                >
                  ⧉ Window
                </button>
                <button
                  className="open-btn open-split"
                  onClick={() => handleOpenOption(app.key, 'split')}
                  title="Open in split view"
                >
                  ⊞ Split
                </button>
              </div>
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
        <div className="toolz-icon-main">
          <svg className="icon-svg-main" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <image href="/icons/toolz-main-neon.svg" width="512" height="512" />
          </svg>
        </div>
        <h1>ToolZ</h1>
        <p className="toolz-subtitle">Audio, Visual & App ToolZ</p>
      </div>

      {/* Category Grid */}
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

      {/* Quick Stats */}
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
    </div>
  );
}
