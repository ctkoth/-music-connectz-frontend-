const fs = require('fs');
const path = require('path');

const outPath = path.join(__dirname, '..', 'config.js');
const mapsKey = process.env.GOOGLE_MAPS_API_KEY || '';
const mapId = process.env.GOOGLE_MAP_ID || '';

const content = `// Auto-generated config.js (build-time)
window.GOOGLE_MAPS_API_KEY = ${JSON.stringify(mapsKey)};
// Optional Map ID
window.GOOGLE_MAP_ID = ${JSON.stringify(mapId)};
`;

try {
  if (!mapsKey) {
    console.log('No GOOGLE_MAPS_API_KEY set; leaving existing config.js (if any) unchanged.');
    process.exit(0);
  }
  fs.writeFileSync(outPath, content, { encoding: 'utf8' });
  console.log('Wrote', outPath);
} catch (err) {
  console.error('Failed to write config.js', err);
  process.exit(1);
}
