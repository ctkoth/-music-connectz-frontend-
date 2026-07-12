#!/usr/bin/env bash
set -e
REPO="${1:-https://github.com/ctkoth/-music-connectz-frontend-.git}"
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO"
git push --force origin HEAD:main
echo "==> VERIFY Vercel log: Branch: main + index-*.js ≈ 414.49 kB │ gzip 122.88"
