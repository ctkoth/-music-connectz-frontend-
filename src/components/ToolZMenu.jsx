import React, { useState } from 'react';
import { goToSpot } from '../goto.js';
import './ToolZMenu.css';

// Icon mapping for SVG and emoji fallbacks
const ICON_MAP = {
  singz: { svg: '/icons/singz.svg', emoji: '🎤' },
  rapz: { svg: '/icons/rapz.svg', emoji: '🎙️' },
  guitarz: { svg: '/icons/guitarz.svg', emoji: '🎸' },
  bassz: { svg: '/icons/bassz.svg', emoji: '🎸' },
  keyz: { svg: '/icons/keyz.svg', emoji: '🎹' },
  drumz: { svg: '/icons/drumz.svg', emoji: '🥁' },
  violinz: { svg: '/icons/violinz.svg', emoji: '🎻' },
  battlez: { svg: '/icons/battlez.svg', emoji: '⚔️' },
  collabz: { svg: '/icons/collabz.svg', emoji: '🤝' },
  infernoz: { svg: '/icons/infernoz.svg', emoji: '🔥' },
  socialiZeZ: { svg: '/icons/socialiZez.svg', emoji: '👥' },
  vybez: { svg: '/icons/vybez.svg', emoji: '💫' },
  postz: { svg: '/icons/postz.svg', emoji: '📝' },
  messagez: { svg: '/icons/messagez.svg', emoji: '💬' },
  skillz: { svg: '/icons/skillz.svg', emoji: '⭐' },
  occ: { svg: '/icons/occ.svg', emoji: '👨‍🏫' },
  bosttake: { svg: '/icons/bosttake.svg', emoji: '🎬' },
  onboardz: { svg: '/icons/onboardz.svg', emoji: '🚀' },
  logz: { svg: '/icons/logz.svg', emoji: '📊' },
  profilez: { svg: '/icons/profilez.svg', emoji: '👤' },
  widgetz: { svg: '/icons/widgetz.svg', emoji: '🔗' },
  keyconnectz: { svg: '/icons/keyconnectz.svg', emoji: '🔑' },
  venuez: { svg: '/icons/venuez.svg', emoji: '🎪' },
  directz: { svg: '/icons/directz.svg', emoji: '🎥' },
  statez: { svg: '/icons/statez.svg', emoji: '📈' },
  funnelz: { svg: '/icons/funnelz.svg', emoji: '📉' },
  groupz: { svg: '/icons/groupz.svg', emoji: '👫' },
  merchz: { svg: '/icons/merchz.svg', emoji: '🛍️' },
  lilith: { svg: '/icons/lilith.png', emoji: '💃' },
  bodiez: { svg: '/icons/bodiez.svg', emoji: '💪' },
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
    {
      group: 'Progress & Analytics',
      apps: [
        { key: 'skillz', label: 'SkillZ', color: 'gold', desc: 'Track progression & badges' },
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
        { key: 'directz', label: 'DirectZ', color: 'cyan', desc: 'Video recording & feedback' },
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

// Category info for the main grid
const CATEGORIES = [
  { key: 'SocialiZeZ', label: 'SocialiZeZ', color: 'magenta', emoji: '👥' },
  { key: 'CollabZ', label: 'CollabZ', color: 'cyan', emoji: '🤝' },
  { key: 'BattleZ', label: 'BattleZ', color: 'red', emoji: '⚔️' },
  { key: 'GroupZ', label: 'GroupZ', color: 'cyan', emoji: '👫' },
  { key: 'ToolZ', label: 'ToolZ', color: 'yellow', emoji: '🔧' },
  { key: 'IntelligenceZ', label: 'IntelligenceZ', color: 'magenta', emoji: '🧠' },
  { key: 'ProfileZ', label: 'ProfileZ', color: 'cyan', emoji: '👤' },
  { key: 'VenueZ', label: 'VenueZ', color: 'orange', emoji: '🎪' },
  { key: 'MercheZ', label: 'MercheZ', color: 'magenta', emoji: '🛍️' },
  { key: 'Lilith', label: 'Lilith', color: 'magenta', emoji: '💃' },
  { key: 'BodieZ', label: 'BodieZ', color: 'orange', emoji: '💪' },
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
            <span className="category-emoji">{category.emoji}</span>
          </div>
          <h1>{category.label}</h1>
        </div>

        <div className="apps-detail-grid">
          {apps.map((app) => (
            <div key={app.key} className={`app-detail-card ${app.color}`}>
              <div className="app-detail-header">
                <div className="app-icon-small">
                  {ICON_MAP[app.key] ? (
                    ICON_MAP[app.key].svg.endsWith('.png') ? (
                      <img src={ICON_MAP[app.key].svg} alt={app.label} />
                    ) : (
                      <svg className="icon-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                        <image href={ICON_MAP[app.key].svg} width="200" height="200" />
                      </svg>
                    )
                  ) : (
                    <span>{ICON_MAP[app.key]?.emoji || '🎵'}</span>
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
          <svg className="icon-svg-main" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <image href="/icons/toolz-main.svg" width="200" height="200" />
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
            <div className="category-icon">{category.emoji}</div>
            <div className="category-label">{category.label}</div>
          </button>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="toolz-stats">
        <div className="stat-item">
          <span className="stat-icon">🎵</span>
          <span>11 Categories</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">👥</span>
          <span>30+ Apps</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">⭐</span>
          <span>Explore & Create</span>
        </div>
      </div>
    </div>
  );
}
