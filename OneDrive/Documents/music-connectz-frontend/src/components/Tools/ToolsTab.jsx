import React from 'react';

import PremiumToolCard from './PremiumToolCard';
import { premiumTools } from './toolsList';

const ToolsTab = ({ isPremiumUser, onUpgrade }) => (
  <div style={{ padding: 32 }}>
    <h1>💡 Tools</h1>
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
