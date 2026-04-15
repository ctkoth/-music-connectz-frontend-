import React, { useState } from 'react';

export default function ImageConnectZAI() {
  const [prompt, setPrompt] = useState('');
  const [explicit, setExplicit] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [unlocked, setUnlocked] = useState(false);

  const handleGenerate = async () => {
    // TODO: Integrate with AI image backend
    setImageUrl('https://placehold.co/400x300?text=AI+Image');
    setUnlocked(false);
  };

  const handleUnlock = () => {
    // TODO: Integrate payment logic
    setUnlocked(true);
  };

  return (
    <div style={{ marginBottom: 32, padding: 24, background: '#fff0f4', borderRadius: 12 }}>
      <h2>🖼️ Image ConnectZ AI</h2>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your image..." style={{ flex: 1 }} />
        <label>Explicit <input type="checkbox" checked={explicit} onChange={e => setExplicit(e.target.checked)} /></label>
        <button onClick={handleGenerate}>Generate Image</button>
      </div>
      {imageUrl && (
        <div style={{ position: 'relative', marginTop: 16, display: 'inline-block', maxWidth: '100%' }}>
          <img src={imageUrl} alt="AI result" style={{ maxWidth: '100%', opacity: unlocked ? 1 : 0.7, filter: unlocked ? 'none' : 'blur(1px)' }} />
          {!unlocked && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 32,
              background: 'rgba(0,0,0,0.35)',
              pointerEvents: 'none',
              textShadow: '0 2px 8px #000, 0 0 2px #000',
              zIndex: 2
            }}>
              WATERMARK — UNLOCK TO REMOVE
            </div>
          )}
          {!unlocked && (
            <button onClick={handleUnlock} style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 3, background: '#f5b700', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}>
              Unlock Image
            </button>
          )}
        </div>
      )}
      {imageUrl && (
        <div style={{ marginTop: 8, color: '#b07d2c', fontWeight: 500 }}>
          15% of royalties go to Corey Knap as visual designer if distributed with MC.
        </div>
      )}
    </div>
  );
}
