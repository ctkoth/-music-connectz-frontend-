// This script writes the latest git commit info to public/version.json
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getGitInfo() {
  try {
    const hash = execSync('git rev-parse --short HEAD').toString().trim();
    const date = execSync('git log -1 --format=%cd --date=iso-strict').toString().trim();
    return { hash, date };
  } catch (e) {
    return { hash: 'unknown', date: new Date().toISOString() };
  }
}

const info = getGitInfo();
const version = require('../package.json').version || 'dev';
const versionData = {
  version,
  commit: info.hash,
  commitDate: info.date
};

const outPath = path.join(__dirname, '../public/version.json');
fs.writeFileSync(outPath, JSON.stringify(versionData, null, 2));
console.log('Wrote version info to', outPath);
