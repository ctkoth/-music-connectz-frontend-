import React, { useState } from 'react';
import SocialFeed from './SocialFeed';
import CollabLocationOptions from './CollabLocationOptions';
import OnboardingTour from './OnboardingTour';

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
      <CollabLocationOptions />
      {/* ...other homepage content... */}
    </div>
  );
}
