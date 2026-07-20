// NationalitieZ — flag-rich heritage picker. Continents gate their countries;
// a Top-20 default + search covers the rest. Continent groupings carry the
// self-identification descriptor the platform uses for heritage matching.

// country → ISO-3166 alpha-2, so we can render a flag emoji from regional
// indicator letters (no image assets needed).
export const ISO2 = {
  // Africa
  Nigeria: "NG", Ethiopia: "ET", Egypt: "EG", "DR Congo": "CD", Tanzania: "TZ", "South Africa": "ZA",
  Kenya: "KE", Uganda: "UG", Algeria: "DZ", Sudan: "SD", Morocco: "MA", Angola: "AO", Ghana: "GH",
  Mozambique: "MZ", Madagascar: "MG", Cameroon: "CM", "Côte d'Ivoire": "CI", Niger: "NE", Mali: "ML",
  Senegal: "SN", Zimbabwe: "ZW", Zambia: "ZM", Somalia: "SO", Tunisia: "TN", Rwanda: "RW", Benin: "BJ",
  Burundi: "BI", Togo: "TG", "Sierra Leone": "SL", Libya: "LY", Liberia: "LR", Congo: "CG", Namibia: "NA",
  Botswana: "BW", Gabon: "GA", Gambia: "GM", Mauritius: "MU", Eswatini: "SZ", Lesotho: "LS", Guinea: "GN",
  Chad: "TD", Malawi: "MW",
  // Europe
  "United Kingdom": "GB", Ireland: "IE", France: "FR", Germany: "DE", Italy: "IT", Spain: "ES", Portugal: "PT",
  Netherlands: "NL", Belgium: "BE", Switzerland: "CH", Austria: "AT", Poland: "PL", Ukraine: "UA", Russia: "RU",
  Sweden: "SE", Norway: "NO", Denmark: "DK", Finland: "FI", Iceland: "IS", Greece: "GR", Czechia: "CZ",
  Hungary: "HU", Romania: "RO", Bulgaria: "BG", Serbia: "RS", Croatia: "HR", "Bosnia & Herzegovina": "BA",
  Albania: "AL", Slovakia: "SK", Slovenia: "SI", Lithuania: "LT", Latvia: "LV", Estonia: "EE", Belarus: "BY",
  Moldova: "MD", Georgia: "GE", Armenia: "AM", Cyprus: "CY", Malta: "MT", Luxembourg: "LU",
  // Asia
  China: "CN", India: "IN", Japan: "JP", "South Korea": "KR", "North Korea": "KP", Vietnam: "VN", Thailand: "TH",
  Philippines: "PH", Indonesia: "ID", Malaysia: "MY", Singapore: "SG", Myanmar: "MM", Cambodia: "KH", Laos: "LA",
  Nepal: "NP", Bangladesh: "BD", Pakistan: "PK", "Sri Lanka": "LK", Afghanistan: "AF", Kazakhstan: "KZ",
  Uzbekistan: "UZ", Mongolia: "MN", Bhutan: "BT", Taiwan: "TW", Maldives: "MV",
  // Middle East
  "Saudi Arabia": "SA", Iran: "IR", Iraq: "IQ", Israel: "IL", Palestine: "PS", Jordan: "JO", Lebanon: "LB",
  Syria: "SY", Turkey: "TR", "United Arab Emirates": "AE", Qatar: "QA", Kuwait: "KW", Bahrain: "BH", Oman: "OM",
  Yemen: "YE",
  // North / Central America + Caribbean
  "United States": "US", Canada: "CA", Mexico: "MX", Guatemala: "GT", Belize: "BZ", Honduras: "HN",
  "El Salvador": "SV", Nicaragua: "NI", "Costa Rica": "CR", Panama: "PA", Jamaica: "JM", Haiti: "HT",
  "Dominican Republic": "DO", Cuba: "CU", "Trinidad & Tobago": "TT", Bahamas: "BS", Barbados: "BB",
  "Puerto Rico": "PR", Grenada: "GD", "Saint Lucia": "LC", Dominica: "DM", "Antigua & Barbuda": "AG",
  "Saint Vincent": "VC", "Saint Kitts & Nevis": "KN",
  // South America
  Brazil: "BR", Argentina: "AR", Colombia: "CO", Peru: "PE", Venezuela: "VE", Chile: "CL", Ecuador: "EC",
  Bolivia: "BO", Paraguay: "PY", Uruguay: "UY", Guyana: "GY", Suriname: "SR",
  // Oceania
  Australia: "AU", "New Zealand": "NZ", "Papua New Guinea": "PG", Fiji: "FJ", Samoa: "WS", Tonga: "TO",
  "Solomon Islands": "SB", Vanuatu: "VU",
};

export function flagOf(country) {
  const iso = ISO2[country];
  if (!iso) return "🏳️";
  return iso.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// Continent groupings. `descriptor` is the platform's self-identification tag
// shown in parentheses; picking a continent gates its countries for selection
// and search.
export const CONTINENTS = [
  { id: "africa", name: "African", descriptor: "Black", emoji: "🌍", region: "Africa" },
  { id: "europe", name: "European", descriptor: "White", emoji: "🏰", region: "Europe" },
  { id: "asia", name: "Asian", descriptor: "", emoji: "🌏", region: "Asia" },
  { id: "south_america", name: "South American", descriptor: "Hispanic", emoji: "🗺️", region: "South America" },
  { id: "middle_east", name: "Middle Eastern", descriptor: "", emoji: "🕌", region: "Middle East" },
  { id: "north_america", name: "North American", descriptor: "", emoji: "🌎", region: "North America" },
  { id: "central_america", name: "Central American", descriptor: "Hispanic", emoji: "🌴", region: "Central America" },
  { id: "caribbean", name: "Caribbean", descriptor: "", emoji: "🏝️", region: "Caribbean" },
  { id: "oceania", name: "Oceania", descriptor: "", emoji: "🌊", region: "Oceania" },
];

// Top 20 nationalities by population — the default flag grid before searching.
export const TOP_20 = [
  "India", "China", "United States", "Indonesia", "Pakistan", "Nigeria", "Brazil", "Bangladesh",
  "Russia", "Mexico", "Japan", "Ethiopia", "Philippines", "Egypt", "Vietnam", "DR Congo",
  "Germany", "Iran", "Turkey", "United Kingdom",
];
