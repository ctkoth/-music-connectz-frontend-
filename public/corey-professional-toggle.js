// Professional Mode Toggle for Corey-Voice (No Emoji)
// Add this to your main app JS (vanilla or React)

// Save user preference in localStorage
function setProfessionalMode(enabled) {
  localStorage.setItem('corey_professional_mode', enabled ? '1' : '0');
}

function getProfessionalMode() {
  return localStorage.getItem('corey_professional_mode') === '1';
}

// Example toggle UI (vanilla JS, adapt for React if needed)
function renderProfessionalModeToggle() {
  const container = document.getElementById('corey-professional-toggle');
  if (!container) return;
  const checked = getProfessionalMode();
  container.innerHTML = `
    <label style="font-weight:600;">
      <input type="checkbox" id="corey-professional-checkbox" ${checked ? 'checked' : ''} />
      Professional Mode (No Emoji, for school/legal docs)
    </label>
  `;
  document.getElementById('corey-professional-checkbox').addEventListener('change', e => {
    setProfessionalMode(e.target.checked);
  });
}

document.addEventListener('DOMContentLoaded', renderProfessionalModeToggle);

// Usage in dialogue rendering:
// If getProfessionalMode() is true, always strip emojis from Corey lines before displaying, regardless of emoji toggle.
// let line = coreyLine;
// if (getProfessionalMode()) line = stripEmojis(line);
// else if (!getCoreyEmojiPreference()) line = stripEmojis(line);
