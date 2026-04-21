import React, { useState, useEffect } from 'react';

import ToolsTab from './components/Tools/ToolsTab';
import KeyConnectZApp from './components/Tools/KeyConnectZApp';
import DistributionSubmission from './components/DistributionSubmission';
import BugsTab from './components/BugsTab';
import SpinazTab from './components/SpinazTab';
import RoyaltiesTab from './components/RoyaltiesTab';

function capitalizeZ(word) {
  return word.replace(/z\b/g, 'Z');
}
function addEmojiToTitle(title, emoji) {
  return `${emoji} ${capitalizeZ(title)}`;
}

export default function App() {
  const [showKeyConnectZ, setShowKeyConnectZ] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showDistribution, setShowDistribution] = useState(false);
  const [showBugs, setShowBugs] = useState(false);
  const [showSpinaz, setShowSpinaz] = useState(false);
  const [showRoyalties, setShowRoyalties] = useState(false);
  const isPremiumUser = true; // TODO: Replace with real auth logic

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'k') {
        setShowKeyConnectZ(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div>
      <nav style={{ display: 'flex', gap: 24, padding: 16, background: '#f5f5f5' }}>
        <button onClick={() => setShowTools(true)} style={{ fontSize: 18 }}>{addEmojiToTitle('Toolz', '💡')}</button>
        <button onClick={() => setShowDistribution(true)} style={{ fontSize: 18 }}>{addEmojiToTitle('Distribute', '🚀')}</button>
        <button onClick={() => setShowBugs(true)} style={{ fontSize: 18 }}>{addEmojiToTitle('Bugz', '🐞')}</button>
        <button onClick={() => setShowSpinaz(true)} style={{ fontSize: 18 }}>{addEmojiToTitle('Spinaz', '🌀')}</button>
        <button onClick={() => setShowRoyalties(true)} style={{ fontSize: 18, background: '#e6c200', color: '#fff', borderRadius: 8, padding: '6px 18px', fontWeight: 600 }}>👑 Royalties</button>
        <button onClick={() => alert('Codebanks coming soon!')} style={{ fontSize: 18, background: '#f5b700', color: '#fff', borderRadius: 8, padding: '6px 18px', fontWeight: 600 }}>🏦 Codebanks</button>
      </nav>
      {showTools && (
        <div style={{ position: 'fixed', top: 60, left: 0, right: 0, zIndex: 10, background: '#fff', boxShadow: '0 2px 8px #0001' }}>
          <ToolsTab isPremiumUser={isPremiumUser} onUpgrade={() => alert('Upgrade to premium!')} />
          <button onClick={() => setShowTools(false)} style={{ position: 'absolute', top: 8, right: 16 }}>Close</button>
        </div>
      )}
      {showDistribution && (
        <div style={{ position: 'fixed', top: 80, left: 0, right: 0, zIndex: 15, background: '#fff', boxShadow: '0 2px 16px #0002', display: 'flex', justifyContent: 'center' }}>
          <DistributionSubmission isPremiumUser={isPremiumUser} />
          <button onClick={() => setShowDistribution(false)} style={{ position: 'absolute', top: 8, right: 16 }}>Close</button>
        </div>
      )}
      {showKeyConnectZ && (
        <div style={{ position: 'fixed', bottom: 40, right: 40, zIndex: 20, background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #0002', minWidth: 400 }}>
          <KeyConnectZApp />
          <button onClick={() => setShowKeyConnectZ(false)} style={{ position: 'absolute', top: 8, right: 16 }}>Close</button>
        </div>
      )}
      {showBugs && (
        <div style={{ position: 'fixed', top: 100, left: 0, right: 0, zIndex: 25, display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.98)' }}>
          <BugsTab onClose={() => setShowBugs(false)} isAdmin={true} />
        </div>
      )}
      {showSpinaz && (
        <div style={{ position: 'fixed', top: 120, left: 0, right: 0, zIndex: 30, display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.98)' }}>
          <SpinazTab onClose={() => setShowSpinaz(false)} />
        </div>
      )}
      {showRoyalties && (
        <div style={{ position: 'fixed', top: 140, left: 0, right: 0, zIndex: 35, display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.98)' }}>
          <div style={{ background: '#fffbe6', border: '2px solid #e6c200', borderRadius: 16, padding: 32, minWidth: 400, boxShadow: '0 2px 16px #e6c20033' }}>
            <h2 style={{ fontSize: 28, color: '#e6c200', marginBottom: 16 }}>👑 Royalties Dashboard</h2>
            <p>Track your earnings, payouts, and royalty splits here. (Coming soon: instant payouts and detailed analytics!)</p>
            <button onClick={() => setShowRoyalties(false)} style={{ marginTop: 24, background: '#e6c200', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 18, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
