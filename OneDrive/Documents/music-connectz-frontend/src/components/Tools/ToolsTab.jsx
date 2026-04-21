import React from 'react';

import PremiumToolCard from './PremiumToolCard';
import { premiumTools } from './toolsList';
import PromoBanner from '../PromoBanner';

function capitalizeZ(word) {
  return word.replace(/z\b/g, 'Z');
}
function addEmojiToTitle(title, emoji) {
  return `${emoji} ${capitalizeZ(title)}`;
}

const ToolsTab = ({ isPremiumUser, onUpgrade, isActiveUser }) => (
  <div style={{ padding: 32 }}>
    <PromoBanner isActiveUser={isActiveUser} />
    <h1><span role="img" aria-label="lightbulb">💡</span> {capitalizeZ('Toolz')}</h1>
    <button
      onClick={() => alert('Codebanks coming soon!')}
      style={{
        marginBottom: 16,
        background: '#f5b700',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '10px 24px',
        fontWeight: 700,
        fontSize: 18,
        cursor: 'pointer',
        boxShadow: '0 2px 8px #0001'
      }}
    >
      🏦 Codebanks
    </button>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {premiumTools.map(tool => (
        <PremiumToolCard
          key={tool.name}
          tool={tool}
          isPremiumUser={isPremiumUser}
          onUpgrade={onUpgrade}
        />
      ))}
    </div>
  </div>
);

export default ToolsTab;
