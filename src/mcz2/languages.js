// LanguageZ — the languages Music ConnectZ speaks. `code` is a BCP-47-ish short
// code sent to the translator; `name` is the English name, `endonym` the
// native name, `flag` a representative flag emoji. English is the source.
export const LANGUAGES = [
  { code: "en", name: "English", endonym: "English", flag: "🇬🇧" },
  { code: "es", name: "Spanish", endonym: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Portuguese", endonym: "Português", flag: "🇧🇷" },
  { code: "fr", name: "French", endonym: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", endonym: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", endonym: "Italiano", flag: "🇮🇹" },
  { code: "nl", name: "Dutch", endonym: "Nederlands", flag: "🇳🇱" },
  { code: "ru", name: "Russian", endonym: "Русский", flag: "🇷🇺" },
  { code: "uk", name: "Ukrainian", endonym: "Українська", flag: "🇺🇦" },
  { code: "pl", name: "Polish", endonym: "Polski", flag: "🇵🇱" },
  { code: "tr", name: "Turkish", endonym: "Türkçe", flag: "🇹🇷" },
  { code: "ar", name: "Arabic", endonym: "العربية", flag: "🇸🇦" },
  { code: "he", name: "Hebrew", endonym: "עברית", flag: "🇮🇱" },
  { code: "fa", name: "Persian", endonym: "فارسی", flag: "🇮🇷" },
  { code: "hi", name: "Hindi", endonym: "हिन्दी", flag: "🇮🇳" },
  { code: "ur", name: "Urdu", endonym: "اردو", flag: "🇵🇰" },
  { code: "bn", name: "Bengali", endonym: "বাংলা", flag: "🇧🇩" },
  { code: "zh", name: "Chinese", endonym: "中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", endonym: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", endonym: "한국어", flag: "🇰🇷" },
  { code: "vi", name: "Vietnamese", endonym: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "Thai", endonym: "ไทย", flag: "🇹🇭" },
  { code: "id", name: "Indonesian", endonym: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "tl", name: "Filipino", endonym: "Filipino", flag: "🇵🇭" },
  { code: "sw", name: "Swahili", endonym: "Kiswahili", flag: "🇰🇪" },
  { code: "yo", name: "Yoruba", endonym: "Yorùbá", flag: "🇳🇬" },
  { code: "ha", name: "Hausa", endonym: "Hausa", flag: "🇳🇬" },
  { code: "am", name: "Amharic", endonym: "አማርኛ", flag: "🇪🇹" },
];

const BY_CODE = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]));
export const langByCode = (code) => BY_CODE[code] || null;
export const langName = (code) => BY_CODE[code]?.name || code;
export const langLabel = (code) => { const l = BY_CODE[code]; return l ? `${l.flag} ${l.endonym}` : code; };

// Country (display name, matching heritage.js / nationalitiez.js) → likely
// language codes, most representative first. Used to suggest languages from a
// user's declared NationalitieZ. Not exhaustive — covers the common cases.
export const COUNTRY_LANG = {
  "United States": ["en", "es"], "United Kingdom": ["en"], "Canada": ["en", "fr"],
  "Australia": ["en"], "New Zealand": ["en"], "Ireland": ["en"],
  "Mexico": ["es"], "Spain": ["es"], "Argentina": ["es"], "Colombia": ["es"],
  "Chile": ["es"], "Peru": ["es"], "Venezuela": ["es"], "Cuba": ["es"],
  "Dominican Republic": ["es"], "Guatemala": ["es"], "Ecuador": ["es"], "Bolivia": ["es"],
  "Brazil": ["pt"], "Portugal": ["pt"], "Angola": ["pt"], "Mozambique": ["pt"],
  "France": ["fr"], "Belgium": ["fr", "nl"], "Switzerland": ["de", "fr", "it"],
  "Senegal": ["fr"], "Ivory Coast": ["fr"], "Cameroon": ["fr", "en"],
  "Germany": ["de"], "Austria": ["de"], "Italy": ["it"], "Netherlands": ["nl"],
  "Russia": ["ru"], "Ukraine": ["uk", "ru"], "Poland": ["pl"], "Turkey": ["tr"],
  "Saudi Arabia": ["ar"], "Egypt": ["ar"], "Morocco": ["ar", "fr"], "Algeria": ["ar", "fr"],
  "United Arab Emirates": ["ar", "en"], "Iraq": ["ar"], "Jordan": ["ar"], "Lebanon": ["ar", "fr"],
  "Israel": ["he", "ar"], "Iran": ["fa"],
  "India": ["hi", "en"], "Pakistan": ["ur", "en"], "Bangladesh": ["bn"],
  "China": ["zh"], "Taiwan": ["zh"], "Singapore": ["zh", "en"], "Hong Kong": ["zh", "en"],
  "Japan": ["ja"], "South Korea": ["ko"], "Vietnam": ["vi"], "Thailand": ["th"],
  "Indonesia": ["id"], "Philippines": ["tl", "en"], "Malaysia": ["id", "en"],
  "Kenya": ["sw", "en"], "Tanzania": ["sw"], "Uganda": ["sw", "en"],
  "Nigeria": ["en", "yo", "ha"], "Ghana": ["en"], "Ethiopia": ["am"], "South Africa": ["en"],
};

// Suggest language codes from a user's declared nationalities (country/region
// display names). Falls back to empty; English is always available in the app.
export function suggestLanguages(nationalities = []) {
  const out = [];
  (nationalities || []).forEach((n) => {
    (COUNTRY_LANG[n] || []).forEach((code) => { if (!out.includes(code)) out.push(code); });
  });
  return out;
}
