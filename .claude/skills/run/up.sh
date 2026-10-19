#!/usr/bin/env bash
# Bring both halves of Music ConnectZ up and seed enough to click through.
# Idempotent: re-run it to reset the data and restart the servers.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND="$(cd "$HERE/../../.." && pwd)"
BACKEND="${MCZ_BACKEND:-$(dirname "$FRONTEND")/music-connectz-backend}"
LOGS="${TMPDIR:-/tmp}/mcz-run"
mkdir -p "$LOGS"

if [ ! -f "$BACKEND/manage.py" ]; then
  echo "No backend at $BACKEND — set MCZ_BACKEND to its path." >&2
  exit 1
fi

# The password hasher needs cffi and a bare container has not got it. Skip this
# and every login answers 500, which reads as broken auth rather than a missing
# wheel. The test suite never notices: it uses force_login and hashes nothing.
python -c 'import _cffi_backend' 2>/dev/null || {
  echo "· installing cffi (the password hasher needs it)"
  pip install -q cffi
}

# Bracketed so the pattern cannot match this script's own command line.
pkill -f '[m]anage.py runserver 8000' 2>/dev/null || true
pkill -f '[v]ite --config .claude/skills/run' 2>/dev/null || true
sleep 1

echo "· migrating"
cd "$BACKEND"
python manage.py migrate --no-input >"$LOGS/migrate.log" 2>&1 || {
  echo "migrate failed — see $LOGS/migrate.log" >&2; exit 1; }

echo "· starting the API on :8000"
nohup python manage.py runserver 8000 --noreload >"$LOGS/django.log" 2>&1 &

for _ in $(seq 40); do
  # 401 is the healthy answer to an unauthenticated read; 000 means not up yet.
  [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/api/economy/venuez/ || true)" != "000" ] && break
  sleep 1
done
if [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/api/economy/venuez/ || true)" = "000" ]; then
  echo "API never came up — see $LOGS/django.log" >&2; exit 1
fi

echo "· seeding"
python manage.py shell <"$HERE/seed.py" 2>&1 | grep -v "objects imported automatically" | sed 's/^/  /'

echo "· starting the app on :5174"
cd "$FRONTEND"
[ -d node_modules ] || npm install --no-audit --no-fund >"$LOGS/npm.log" 2>&1
# 5174 with a proxy, NOT 5173 direct: cross-origin to :8000 drops connections
# under a real page load and surfaces as a CORS error. Same-origin has no
# preflight to fail. And VITE_API_BASE must be set — "" means production.
nohup env VITE_API_BASE=http://localhost:5174 \
  npx vite --config .claude/skills/run/vite.local.config.mjs \
  >"$LOGS/vite.log" 2>&1 &

for _ in $(seq 40); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5174/ || true)" = "200" ] && break
  sleep 1
done

cat <<EOF

  app   http://localhost:5174/login   (tabs drop the trailing z: /venue /collab /battle)
  api   http://localhost:8000
  logs  $LOGS
  login corey / pw12345!   ·   hostie / pw12345!

  drive it:  node .claude/skills/run/drive.mjs corey venue
EOF
