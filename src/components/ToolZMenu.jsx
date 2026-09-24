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

// App categories and configuration with grouped apps
const TOOLZ_MENU = {
  'SocialiZeZ': [
    {
      group: 'Discovery',
      apps: [
        { key: 'socialiZeZ', label: 'SocialiZeZ', color: 'magenta', desc: 'Connect & explore members' },
        { key: 'vybez', label: 'VybeZ', color: 'cyan', desc: 'Search & filter by vibes' },
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
        { key: 'postz', label: 'PostZ', color: 'green', desc: 'Create & share music posts' },
        { key: 'messagez', label: 'MessageZ', color: 'yellow', desc: 'Direct messaging' },
      ]
    },
  ],
  'CollabZ': [
    { key: 'collabz', label: 'CollabZ', color: 'cyan', desc: 'Create & manage collaborations' },
  ],
  'BattleZ': [
    { key: 'battlez', label: 'BattleZ', color: 'red', desc: 'Music battles & competitions' },
  ],
  'GroupZ': [
    { key: 'groupz', label: 'GroupZ', color: 'cyan', desc: 'Create & join groups' },
  ],
  'ToolZ': [
    {
      group: 'Vocal Instruments',
      apps: [
        { key: 'singz', label: 'SingZ', color: 'cyan', desc: 'Voice coaching & performance' },
        { key: 'rapz', label: 'RapZ', color: 'magenta', desc: 'Rap coaching & feedback' },
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

// Flatten grouped apps for simple categories
const flattenMenuData = (data) => {
  if (!Array.isArray(data)) return data;
  const firstItem = data[0];
  // If it has a 'group' key, it's grouped data - return as is
  if (firstItem && firstItem.group) return data;
  // Otherwise it's flat - return as is
  return data;
};

export default function ToolZMenu() {
  const [activeCategory, setActiveCategory] = useState('SocialiZeZ');
  const [hoveredApp, setHoveredApp] = useState(null);

  const handleAppClick = (appKey) => {
    goToSpot(appKey, `${appKey}:main`);
  };

  const renderAppsContent = () => {
    const categoryData = TOOLZ_MENU[activeCategory];
    const firstItem = categoryData[0];

    // Check if this is grouped data
    if (firstItem && firstItem.group) {
      // Render with group headers
      return (
        <>
          {categoryData.map((groupSection, idx) => (
            <div key={idx} className="app-group">
              <h3 className="group-title">{groupSection.group}</h3>
              <div className="apps-grid">
                {groupSection.apps.map((app) => (
                  <AppCard
                    key={app.key}
                    app={app}
                    hoveredApp={hoveredApp}
                    setHoveredApp={setHoveredApp}
                    handleAppClick={handleAppClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      );
    } else {
      // Render flat apps
      return (
        <div className="apps-grid">
          {categoryData.map((app) => (
            <AppCard
              key={app.key}
              app={app}
              hoveredApp={hoveredApp}
              setHoveredApp={setHoveredApp}
              handleAppClick={handleAppClick}
            />
          ))}
        </div>
      );
    }
  };

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

      {/* Category Navigation */}
      <div className="category-nav">
        {Object.keys(TOOLZ_MENU).map((category) => (
          <button
            key={category}
            className={`category-btn ${activeCategory === category ? 'active' : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Apps Grid with Groups */}
      <div className="apps-content">
        {renderAppsContent()}
      </div>

      {/* Quick Stats */}
      <div className="toolz-stats">
        <div className="stat-item">
          <span className="stat-icon">🎵</span>
          <span>7 Instruments</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">👥</span>
          <span>Connect & Collab</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">⭐</span>
          <span>Track Progress</span>
        </div>
      </div>
    </div>
  );
}

// Separate component for app card
function AppCard({ app, hoveredApp, setHoveredApp, handleAppClick }) {
  const iconConfig = ICON_MAP[app.key];

  return (
    <div
      className={`app-card ${app.color} ${hoveredApp === app.key ? 'hovered' : ''}`}
      onClick={() => handleAppClick(app.key)}
      onMouseEnter={() => setHoveredApp(app.key)}
      onMouseLeave={() => setHoveredApp(null)}
    >
      <div className="app-icon">
        {iconConfig ? (
          <svg className="icon-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <image href={iconConfig.svg} width="200" height="200" />
          </svg>
        ) : (
          iconConfig?.emoji || '🎵'
        )}
      </div>
      <div className="app-label">{app.label}</div>
      <div className="app-desc">{app.desc}</div>
      {hoveredApp === app.key && <div className="app-glow" />}
    </div>
  );
}
