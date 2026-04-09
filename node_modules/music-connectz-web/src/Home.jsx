import React, { useState } from 'react';
import SocialFeed from './SocialFeed';
import CollabLocationOptions from './CollabLocationOptions';
import OnboardingTour from './OnboardingTour';

function CoreysPicks() {
  const handleClick = (feature) => {
    alert(`Go to ${feature}`); // Replace with real navigation
  };
  return (
    <div style={{ margin: '32px 0' }}>
      <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 18 }}>Corey’s Picks</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
        {([
          { label: "Music Rating ConnectZ", feature: "music-rating" },
          { label: "Epiffaniez Game", feature: "epiffaniez" },
          { label: "Battle of the Week", feature: "battle-week" },
          { label: "Collab Finder", feature: "collab-finder" },
        ]).map(({ label, feature }) => (
          <button
            key={feature}
            onClick={() => handleClick(label)}
            style={{
              background: '#e0e7ff',
              border: 'none',
              borderRadius: 12,
              padding: '18px 28px',
              fontWeight: 700,
              fontSize: 17,
              cursor: 'pointer',
              boxShadow: '0 2px 8px #0001',
              minWidth: 160,
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [showTour, setShowTour] = useState(true);
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 32 }}>
      {showTour && <OnboardingTour onFinish={() => setShowTour(false)} />}
      <SocialFeed />
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '32px 0 16px' }}>Welcome to MusicConnectZ</h1>
      <div style={{ fontSize: 18, color: '#444', marginBottom: 32 }}>
        Discover, collaborate, and compete in music battles. Try the new Battles feature and see what’s trending!
      </div>
      <CoreysPicks />
      <CollabLocationOptions />
      {/* ...other homepage content... */}
    </div>
  );
}
