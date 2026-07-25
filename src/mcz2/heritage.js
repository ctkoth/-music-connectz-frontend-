// NationalitieZ heritage data. Users pick heritage by continent/region OR by
// specific country — so someone who doesn't know their exact nationality can
// still choose e.g. "Africa (anywhere)". Each region's `any` value is the
// continent-level choice; `countries` are the specific options.

export const REGIONS = [
  {
    name: "Africa", emoji: "🌍", any: "Africa (anywhere)",
    countries: ["Nigeria", "Ethiopia", "Egypt", "DR Congo", "Tanzania", "South Africa", "Kenya", "Uganda", "Algeria", "Sudan", "Morocco", "Angola", "Ghana", "Mozambique", "Madagascar", "Cameroon", "Côte d'Ivoire", "Niger", "Mali", "Senegal", "Zimbabwe", "Zambia", "Somalia", "Tunisia", "Rwanda", "Benin", "Burundi", "Togo", "Sierra Leone", "Libya", "Liberia", "Congo", "Namibia", "Botswana", "Gabon", "Gambia", "Mauritius", "Eswatini", "Lesotho", "Guinea", "Chad", "Malawi"],
  },
  {
    name: "Europe", emoji: "🏰", any: "Europe (anywhere)",
    countries: ["United Kingdom", "Ireland", "France", "Germany", "Italy", "Spain", "Portugal", "Netherlands", "Belgium", "Switzerland", "Austria", "Poland", "Ukraine", "Russia", "Sweden", "Norway", "Denmark", "Finland", "Iceland", "Greece", "Czechia", "Hungary", "Romania", "Bulgaria", "Serbia", "Croatia", "Bosnia & Herzegovina", "Albania", "Slovakia", "Slovenia", "Lithuania", "Latvia", "Estonia", "Belarus", "Moldova", "Georgia", "Armenia", "Cyprus", "Malta", "Luxembourg"],
  },
  {
    name: "Asia", emoji: "🌏", any: "Asia (anywhere)",
    countries: ["China", "India", "Japan", "South Korea", "North Korea", "Vietnam", "Thailand", "Philippines", "Indonesia", "Malaysia", "Singapore", "Myanmar", "Cambodia", "Laos", "Nepal", "Bangladesh", "Pakistan", "Sri Lanka", "Afghanistan", "Kazakhstan", "Uzbekistan", "Mongolia", "Bhutan", "Taiwan", "Maldives"],
  },
  {
    name: "Middle East", emoji: "🕌", any: "Middle East (anywhere)",
    countries: ["Saudi Arabia", "Iran", "Iraq", "Israel", "Palestine", "Jordan", "Lebanon", "Syria", "Turkey", "United Arab Emirates", "Qatar", "Kuwait", "Bahrain", "Oman", "Yemen"],
  },
  {
    name: "North America", emoji: "🌎", any: "North America (anywhere)",
    countries: ["United States", "Canada", "Mexico"],
  },
  {
    name: "Central America", emoji: "🌴", any: "Central America (anywhere)",
    countries: ["Guatemala", "Belize", "Honduras", "El Salvador", "Nicaragua", "Costa Rica", "Panama"],
  },
  {
    name: "Caribbean", emoji: "🏝️", any: "Caribbean (anywhere)",
    countries: ["Jamaica", "Haiti", "Dominican Republic", "Cuba", "Trinidad & Tobago", "Bahamas", "Barbados", "Puerto Rico", "Grenada", "Saint Lucia", "Dominica", "Antigua & Barbuda", "Saint Vincent", "Saint Kitts & Nevis"],
  },
  {
    name: "South America", emoji: "🗺️", any: "South America (anywhere)",
    countries: ["Brazil", "Argentina", "Colombia", "Peru", "Venezuela", "Chile", "Ecuador", "Bolivia", "Paraguay", "Uruguay", "Guyana", "Suriname"],
  },
  {
    name: "Oceania", emoji: "🌊", any: "Oceania (anywhere)",
    countries: ["Australia", "New Zealand", "Papua New Guinea", "Fiji", "Samoa", "Tonga", "Solomon Islands", "Vanuatu"],
  },
];
