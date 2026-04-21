
import React, { useState } from 'react';
import { RAP_SUBGENRES } from '../../models/rapSubgenres';

const genres = ['Rap', 'Pop', 'Rock', 'Country', 'EDM', 'Other'];


export default function MusicWriterConnectZ() {
  const [genre, setGenre] = useState('Rap');
  const [subgenre, setSubgenre] = useState('Any Rapping');
  const [syllableScheme, setSyllableScheme] = useState('1');
  const [rp, setRp] = useState(false);
  const [slang, setSlang] = useState(false);
  const [emoji, setEmoji] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [royalty, setRoyalty] = useState(15);

  const handleGenerate = async () => {
    // TODO: Integrate with Corey GPT backend
    setLyrics(`(AI lyrics for ${genre} - ${RAP_SUBGENRES[subgenre] || subgenre}, Syllable Rhyme Scheme: ${syllableScheme}, RP: ${rp}, Slang: ${slang}, Emoji: ${emoji}, Royalty: ${royalty}%)\n\n15% of royalties go to Corey Knap as visual designer if distributed with MC.`);
  };

  return (
    <div style={{ marginBottom: 32, padding: 24, background: '#f0f4ff', borderRadius: 12 }}>
      <h2>🎤 Music Writer ConnectZ (Ghostwriter) 🤖</h2>
      <div style={{ background: '#e6f7ff', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 }}>
        <strong>🎶 Welcome to Corey GPT Ghostwriter! 🎤</strong><br/>
        <span>📝 Every lyric you generate here is powered by Corey GPT, your AI ghostwriter with real Corey vibes!<br/><br/>
        💸 To unlock and distribute your lyrics, pay a one-time $10 fee. This removes all watermarks and gives you full distribution rights.<br/><br/>
        🧑‍🎤 15% of all royalties from distributed music go to Corey Knap as the visual designer. This is ongoing and based on your actual sales, not just the unlock fee.<br/><br/>
        📜 By unlocking, you agree to the sync license and royalty terms. Corey GPT will help you track and manage your royalties.<br/><br/>
        🚀 Let’s make some hits—choose your genre, style, and let Corey GPT do the rest!</span>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>Genre:
          <select value={genre} onChange={e => setGenre(e.target.value)}>{genres.map(g => <option key={g}>{g}</option>)}</select>
        </label>
        {genre === 'Rap' && (
          <>
            <label>Rap Skill/Subgenre:
              <select value={subgenre} onChange={e => setSubgenre(e.target.value)}>
                {Object.keys(RAP_SUBGENRES).map((sg) => (
                  <option key={sg} value={sg}>{RAP_SUBGENRES[sg]}</option>
                ))}
              </select>
            </label>
            <label>Syllable Rhyme Scheme:
              <select value={syllableScheme} onChange={e => setSyllableScheme(e.target.value)}>
                <option value="1">1 (lowest)</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4 (most complex)</option>
                <option value="1-4">1-4 (varied)</option>
              </select>
            </label>
          </>
        )}
        <label>RP <input type="checkbox" checked={rp} onChange={e => setRp(e.target.checked)} /></label>
        <label>Slang <input type="checkbox" checked={slang} onChange={e => setSlang(e.target.checked)} /></label>
        <label>Emoji <input type="checkbox" checked={emoji} onChange={e => setEmoji(e.target.checked)} /></label>
        <label>Royalty % <input type="number" min={0} max={100} value={royalty} onChange={e => setRoyalty(Number(e.target.value))} /></label>
        <button onClick={handleGenerate}>Generate Lyrics</button>
      </div>
      <textarea style={{ width: '100%', marginTop: 16, minHeight: 100 }} value={lyrics} readOnly placeholder="AI-generated lyrics will appear here..." />
      <div style={{ marginTop: 8, color: '#b07d2c', fontWeight: 500 }}>
        {lyrics && '15% of royalties go to Corey Knap as visual designer if distributed with MC.'}
      </div>
    </div>
  );
}
