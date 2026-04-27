import React, { useState } from 'react';
import GoogleMapWithRadius from './GoogleMapWithRadius';

export default function CollabLocationOptions() {
  const [mode, setMode] = useState('local');
  const [radius, setRadius] = useState(1000);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001' }}>
      <h2 style={{ fontSize: 24, marginBottom: 16 }}>Collab Location Options</h2>
      <div style={{ marginBottom: 16 }}>
        <label>
          <input
            type="radio"
            name="collab-mode"
            value="local"
            checked={mode === 'local'}
            onChange={() => setMode('local')}
          />{' '}
          Local (by distance or state)
        </label>
        <label style={{ marginLeft: 24 }}>
          <input
            type="radio"
            name="collab-mode"
            value="global"
            checked={mode === 'global'}
            onChange={() => setMode('global')}
          />{' '}
          Global (anywhere)
        </label>
      </div>
      {mode === 'local' && (
        <div style={{ marginBottom: 16 }}>
          <label>
            Radius (meters):
            <input
              type="number"
              min={100}
              max={50000}
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              style={{ marginLeft: 8, width: 100 }}
            />
          </label>
          <GoogleMapWithRadius radiusMeters={radius} />
        </div>
      )}
      {mode === 'local' && (
        <div style={{ color: '#555', fontSize: 15 }}>
          <b>Local collabs</b> will match you with users within your chosen radius or state.<br />
          <b>State-based</b> matching coming soon!
        </div>
      )}
      {mode === 'global' && (
        <div style={{ color: '#555', fontSize: 15 }}>
          <b>Global collabs</b> will match you with users anywhere in the world.
        </div>
      )}
    </div>
  );
}
