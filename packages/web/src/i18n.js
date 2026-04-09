// i18n.js
// Centralized i18n setup for MusicConnectZ web

export const languages = {
  en: { label: 'English 🇺🇸', region: 'Global' },
  es: { label: 'Español 🇪🇸', region: 'Latinoamérica, España' },
  fr: { label: 'Français 🇫🇷', region: 'France, Canada' },
  de: { label: 'Deutsch 🇩🇪', region: 'Deutschland, Österreich' },
  pt: { label: 'Português 🇧🇷', region: 'Brasil, Portugal' },
  zh: { label: '中文 🇨🇳', region: 'China, Taiwan' },
  ja: { label: '日本語 🇯🇵', region: 'Japan' },
  ko: { label: '한국어 🇰🇷', region: 'Korea' },
  ru: { label: 'Русский 🇷🇺', region: 'Russia' },
  ar: { label: 'العربية 🇸🇦', region: 'MENA' },
  hi: { label: 'हिन्दी 🇮🇳', region: 'India' },
  tr: { label: 'Türkçe 🇹🇷', region: 'Türkiye' },
  it: { label: 'Italiano 🇮🇹', region: 'Italia' },
  nl: { label: 'Nederlands 🇳🇱', region: 'Nederland, België' },
  pl: { label: 'Polski 🇵🇱', region: 'Polska' },
  sv: { label: 'Svenska 🇸🇪', region: 'Sverige' },
  th: { label: 'ไทย 🇹🇭', region: 'Thailand' },
  vi: { label: 'Tiếng Việt 🇻🇳', region: 'Vietnam' },
  fa: { label: 'فارسی 🇮🇷', region: 'Iran' },
  he: { label: 'עברית 🇮🇱', region: 'Israel' },
};

export function getUserLanguage() {
  const lang = navigator.language.split('-')[0];
  return languages[lang] ? lang : 'en';
}

export function t(dict, lang) {
  return dict[lang] || dict['en'];
}
