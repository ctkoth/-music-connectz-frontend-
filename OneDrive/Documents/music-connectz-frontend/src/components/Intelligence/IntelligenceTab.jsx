import React from 'react';
import MusicWriterConnectZ from './MusicWriterConnectZ';
import ImageConnectZAI from './ImageConnectZAI';
import VideoConnectZAI from './VideoConnectZAI';

const IntelligenceTab = () => (
  <div style={{ padding: 32 }}>
    <h1>🧠 Intelligence</h1>
    <MusicWriterConnectZ />
    <ImageConnectZAI />
    <VideoConnectZAI />
  </div>
);

export default IntelligenceTab;
