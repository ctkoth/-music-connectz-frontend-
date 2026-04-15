import React from 'react';

const PremiumToolCard = ({ tool, isPremiumUser, onUpgrade }) => (
  <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 24, background: '#fafbfc', display: 'flex', alignItems: 'center', gap: 16 }}>
    <span style={{ fontSize: 32 }}>{tool.icon}</span>
    <div style={{ flex: 1 }}>
      <h2 style={{ margin: 0 }}>{tool.name} {tool.premium && <span style={{ color: '#f5b700' }}>★</span>}</h2>
      <p style={{ margin: '8px 0 0 0', color: '#555' }}>{tool.description}</p>
    </div>
    {tool.premium && !isPremiumUser ? (
      <button onClick={onUpgrade} style={{ background: '#f5b700', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}>
        Unlock
      </button>
    ) : (
      <button style={{ background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: isPremiumUser ? 'pointer' : 'not-allowed' }} disabled={!isPremiumUser}>
        Open
      </button>
    )}
  </div>
);

export default PremiumToolCard;
