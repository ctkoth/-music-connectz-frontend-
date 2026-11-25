#!/usr/bin/env bash
# Sync the web build into the iOS project WITHOUT the AdMob pod.
#
# iOS 1.0 ships without ads (play/apple-decisions-memo.md), but the Android bundle still uses
# @capacitor-community/admob, so the package has to stay in package.json — and `cap sync`
# adds every installed plugin to ios/App/Podfile. A linked Google Mobile Ads SDK with no
# GADApplicationIdentifier is a launch crash, and with one it is a tracking disclosure. So:
# sync, strip the AdMob pod from the Podfile, then install pods.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
npx cap sync ios || true        # runs pod install itself on a Mac; harmless to fail on Linux
sed -i.bak '/[Aa]dmob/d' ios/App/Podfile && rm -f ios/App/Podfile.bak
if grep -qi admob ios/App/Podfile; then echo "AdMob is still in the Podfile" >&2; exit 1; fi
if command -v pod >/dev/null; then (cd ios/App && pod install); fi
echo "iOS synced without AdMob."
