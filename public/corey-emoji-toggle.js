// Corey-Voice Emoji Toggle for ConnectZ App Only
// Add this to your main app JS (not AI app)

// Save user preference in localStorage
function setCoreyEmojiPreference(enabled) {
  localStorage.setItem('corey_voice_emoji', enabled ? '1' : '0');
}

function getCoreyEmojiPreference() {
  return localStorage.getItem('corey_voice_emoji') === '1';
}

// Example toggle UI (vanilla JS, adapt for React if needed)
function renderCoreyEmojiToggle() {
  const container = document.getElementById('corey-emoji-toggle');
  if (!container) return;
  const checked = getCoreyEmojiPreference();
  container.innerHTML = `
    <label style="font-weight:600;">
      <input type="checkbox" id="corey-emoji-checkbox" ${checked ? 'checked' : ''} />
      Show emojis in Corey-voice dialogue
    </label>
  `;
  document.getElementById('corey-emoji-checkbox').addEventListener('change', e => {
    setCoreyEmojiPreference(e.target.checked);
  });
}

document.addEventListener('DOMContentLoaded', renderCoreyEmojiToggle);

// Usage in dialogue rendering:
// If getCoreyEmojiPreference() is false, strip emojis from Corey lines before displaying.
// Example:
function stripEmojis(text) {
  // Simple regex to remove most emojis
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
}

// When displaying Corey dialogue:
// let line = coreyLine;
// if (!getCoreyEmojiPreference()) line = stripEmojis(line);
