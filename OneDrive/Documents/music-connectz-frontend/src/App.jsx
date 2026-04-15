import React, { useState, useEffect } from 'react';
import ToolsTab from './components/Tools/ToolsTab';
import KeyConnectZApp from './components/Tools/KeyConnectZApp';

export default function App() {
  const [showKeyConnectZ, setShowKeyConnectZ] = useState(false);
  const [showTools, setShowTools] = useState(false);
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
        <button onClick={() => setShowTools(true)} style={{ fontSize: 18 }}>💡 Tools</button>
      </nav>
      {showTools && (
        <div style={{ position: 'fixed', top: 60, left: 0, right: 0, zIndex: 10, background: '#fff', boxShadow: '0 2px 8px #0001' }}>
          <ToolsTab isPremiumUser={isPremiumUser} onUpgrade={() => alert('Upgrade to premium!')} />
          <button onClick={() => setShowTools(false)} style={{ position: 'absolute', top: 8, right: 16 }}>Close</button>
        </div>
      )}
      {showKeyConnectZ && (
        <div style={{ position: 'fixed', bottom: 40, right: 40, zIndex: 20, background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #0002', minWidth: 400 }}>
          <KeyConnectZApp />
          <button onClick={() => setShowKeyConnectZ(false)} style={{ position: 'absolute', top: 8, right: 16 }}>Close</button>
        </div>
      )}
    </div>
  );
}
