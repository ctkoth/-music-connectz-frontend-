import React, { useState } from 'react';

const faces = [
  { name: 'Corey', user: 'corey', aiRating: 9.5, userRatings: [10, 9, 9] },
  { name: 'Lilith', user: 'lilith', aiRating: 9, userRatings: [8, 9, 10] },
  { name: 'Stat', user: 'stat', aiRating: 7.5, userRatings: [7, 8] },
  { name: 'Custom', user: null, aiRating: null, userRatings: [] }
];
const voices = ['Voice 1', 'Voice 2', 'Voice 3', 'Custom'];

export default function VideoConnectZAI() {
  const [subject, setSubject] = useState('');
  const [royalty, setRoyalty] = useState(60);
  const [videoUrl, setVideoUrl] = useState('');
  const [lipsync, setLipsync] = useState(false);
  const [faceVoiceMap, setFaceVoiceMap] = useState([{ face: 'Corey', voice: 'Voice 1', start: 0, end: 10 }]);

  const handleAddMapping = () => {
    setFaceVoiceMap([...faceVoiceMap, { face: 'Corey', voice: 'Voice 1', start: 0, end: 10 }]);
  };

  // Helper to get face object
  const [userRatingsState, setUserRatingsState] = useState({}); // {faceName: [ratings]}
  const [userRatingInput, setUserRatingInput] = useState({}); // {faceName: value}
  const getFaceObj = (faceName) => {
    const base = faces.find(f => f.name === faceName) || { name: faceName, aiRating: null, userRatings: [] };
    // Merge in any new ratings from state
    const extraRatings = userRatingsState[faceName] || [];
    return { ...base, userRatings: [...(base.userRatings || []), ...extraRatings] };
  };

  // Handle user rating submission
  const handleUserRating = (faceName) => {
    const val = Number(userRatingInput[faceName]);
    if (val >= 1 && val <= 10) {
      setUserRatingsState(prev => ({
        ...prev,
        [faceName]: [...(prev[faceName] || []), val]
      }));
      setUserRatingInput(prev => ({ ...prev, [faceName]: '' }));
    }
  };

  const handleMappingChange = (idx, field, value) => {
    setFaceVoiceMap(faceVoiceMap.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleGenerate = async () => {
    // TODO: Integrate with AI video backend
    setVideoUrl('https://placehold.co/400x300?text=AI+Video');
  };

  return (
    <div style={{ marginBottom: 32, padding: 24, background: '#f4fff0', borderRadius: 12 }}>
      <h2>🎬 vVdeo ConnectZ AI</h2>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Video subject..." style={{ flex: 1 }} />
        <label>Lipsync (premium) <input type="checkbox" checked={lipsync} onChange={e => setLipsync(e.target.checked)} /></label>
        <label>Royalty % <input type="number" min={0} max={100} value={royalty} onChange={e => setRoyalty(Number(e.target.value))} /></label>
        <button onClick={handleGenerate}>Generate Video</button>
      </div>

      {lipsync && (
        <div style={{ marginTop: 24, background: '#fffbe6', borderRadius: 8, padding: 16 }}>
          <strong>🧑‍🎤 Face/Voice Mapping (Lipsync):</strong>
          {faceVoiceMap.map((m, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <label>Face:
                <select value={m.face} onChange={e => handleMappingChange(idx, 'face', e.target.value)}>
                  {faces.map(f => <option key={f.name}>{f.name}</option>)}
                </select>
                {/* Show user tag and rating if available */}
                {(() => {
                  const faceObj = getFaceObj(m.face);
                  const userAvg = faceObj.userRatings.length > 0 ? (faceObj.userRatings.reduce((a, b) => a + b, 0) / faceObj.userRatings.length).toFixed(1) : null;
                  let combined = null;
                  if (faceObj.aiRating !== null && userAvg !== null) {
                    combined = ((Number(faceObj.aiRating) + Number(userAvg)) / 2).toFixed(1);
                  }
                  return (
                    <span style={{ marginLeft: 8, fontSize: 13, color: '#888', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      {faceObj.user && <span>👤 User: <b>{faceObj.user}</b></span>}
                      {faceObj.aiRating !== null && (
                        <span>🤖 AI: <b>{faceObj.aiRating}/10</b></span>
                      )}
                      {userAvg !== null && (
                        <span>🧑 Users: <b>{userAvg}/10</b> ({faceObj.userRatings.length} ratings)</span>
                      )}
                      {combined !== null && (
                        <span>🌟 Combined: <b>{combined}/10</b></span>
                      )}
                      {/* User rating input */}
                      <span style={{ marginTop: 4 }}>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={userRatingInput[m.face] || ''}
                          onChange={e => setUserRatingInput(prev => ({ ...prev, [m.face]: e.target.value }))}
                          placeholder="Rate 1-10"
                          style={{ width: 60, fontSize: 13, borderRadius: 4, border: '1px solid #ccc', marginRight: 4 }}
                        />
                        <button
                          onClick={() => handleUserRating(m.face)}
                          style={{ fontSize: 13, borderRadius: 4, border: 'none', background: '#4caf50', color: '#fff', padding: '2px 8px', cursor: 'pointer' }}
                        >Submit</button>
                      </span>
                    </span>
                  );
                })()}
              </label>
              <label>Voice:
                <select value={m.voice} onChange={e => handleMappingChange(idx, 'voice', e.target.value)}>
                  {voices.map(v => <option key={v}>{v}</option>)}
                </select>
              </label>
              <label>Start (s):
                <input type="number" min={0} value={m.start} onChange={e => handleMappingChange(idx, 'start', Number(e.target.value))} style={{ width: 60 }} />
              </label>
              <label>End (s):
                <input type="number" min={m.start} value={m.end} onChange={e => handleMappingChange(idx, 'end', Number(e.target.value))} style={{ width: 60 }} />
              </label>
            </div>
          ))}
          <button onClick={handleAddMapping} style={{ marginTop: 8, padding: '4px 12px', borderRadius: 6, background: '#b07d2c', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>+ Add Mapping</button>
          <div style={{ marginTop: 8, color: '#b07d2c', fontWeight: 500 }}>
            Assign different faces to different voices, or switch voices by time for advanced lipsync.
          </div>
        </div>
      )}

      {videoUrl && <video src={videoUrl} controls style={{ marginTop: 16, maxWidth: '100%' }} />}
    </div>
  );
}
