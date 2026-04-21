import React from 'react';

function capitalizeZ(word) {
  return word.replace(/z\b/g, 'Z');
}
function addEmojiToTitle(title, emoji) {
  return `${emoji} ${capitalizeZ(title)}`;
}

const GamesTab = () => (
  <div style={{ padding: 32 }}>
    <h1>{addEmojiToTitle('Gamez', '🎮')}</h1>
    <p>🎲 Discover and play gamez, ConnectZ style! Add your favorite gamez here.</p>
    {/* Add game cards/components here */}
  </div>
);

export default GamesTab;
