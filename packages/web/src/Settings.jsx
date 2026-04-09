import React, { useState } from 'react';
import { languages, getUserLanguage } from './i18n';

export default function Settings({ onLanguageChange }) {
  const [lang, setLang] = useState(getUserLanguage());

  function handleLangChange(e) {
    setLang(e.target.value);
    if (onLanguageChange) onLanguageChange(e.target.value);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Settings</h2>
      <div style={{ margin: '24px 0' }}>
        <label htmlFor="lang-select" style={{ fontWeight: 500, marginRight: 12 }}>Language:</label>
        <select id="lang-select" value={lang} onChange={handleLangChange}>
          {Object.entries(languages).map(([code, { label }]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>
      {/* ...other settings... */}
    </div>
  );
}