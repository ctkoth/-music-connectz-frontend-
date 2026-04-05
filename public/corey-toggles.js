// Corey-Voice Toggles: Emoji and Vernacular (User Autonomy)
// Add this to your main app JS (vanilla or React)

// Save user preferences in localStorage
function setCoreyVernacular(enabled) {
  localStorage.setItem('corey_vernacular', enabled ? '1' : '0');
}
function getCoreyVernacular() {
  return localStorage.getItem('corey_vernacular') === '1';
}

function setCoreyEmoji(enabled) {
  localStorage.setItem('corey_emoji', enabled ? '1' : '0');
}
function getCoreyEmoji() {
  return localStorage.getItem('corey_emoji') === '1';
}

// Example toggles UI (vanilla JS, adapt for React if needed)
function renderCoreyToggles() {
  const container = document.getElementById('corey-toggles');
  if (!container) return;
  const vernacular = getCoreyVernacular();
  const emoji = getCoreyEmoji();
  container.innerHTML = `
    <label style="font-weight:600; margin-right:16px;">
      <input type="checkbox" id="corey-vernacular-checkbox" ${vernacular ? 'checked' : ''} />
      Use Corey-voice (vernacular)
    </label>
    <label style="font-weight:600;">
      <input type="checkbox" id="corey-emoji-checkbox" ${emoji ? 'checked' : ''} />
      Show emojis in Corey-voice
    </label>
  `;
  document.getElementById('corey-vernacular-checkbox').addEventListener('change', e => {
    setCoreyVernacular(e.target.checked);
  });
  document.getElementById('corey-emoji-checkbox').addEventListener('change', e => {
    setCoreyEmoji(e.target.checked);
  });
}

document.addEventListener('DOMContentLoaded', renderCoreyToggles);

// Usage in dialogue rendering:
// let line = coreyLine;
// if (!getCoreyVernacular()) line = toFormal(line); // implement toFormal to convert to standard English
// if (!getCoreyEmoji()) line = stripEmojis(line);
