#!/usr/bin/env bash
# Is the per-URL meta actually running in production?
#
# seo/meta.mjs is well tested, but the twelve lines of host plumbing around it
# — functions/_middleware.js on Cloudflare Pages, middleware.js on Vercel —
# have never executed anywhere. This repo deploys to both and only one of them
# serves the live domain, so "it works" is a claim nobody has checked.
#
# This checks it, and it finds its own test post: asking somebody to "try a
# public post id" is asking them to guess.
#
#   ./seo/check_live.sh                                  # production
#   ./seo/check_live.sh https://preview.pages.dev        # a preview deploy
#
# PASS means a crawler fetching a member's track sees that track's title.
# FAIL means it sees the site's title — which is exactly how the page behaved
# before any of this, so a FAIL is a no-op, never a breakage.

set -uo pipefail
SITE="${1:-https://musicconnectz.net}"; SITE="${SITE%/}"
API="${2:-https://admin.musicconnectz.net}"; API="${API%/}"
ok=0; bad=0
say() { printf '%s\n' "$*"; }
pass() { say "  ✓ $*"; ok=$((ok+1)); }
fail() { say "  ✗ $*"; bad=$((bad+1)); }

# The site-wide title, read from the deploy itself rather than hardcoded — it
# is the thing a per-URL title has to DIFFER from, and pinning a copy here
# would make this check start lying the day the tagline changes.
titleof() { sed -n 's:.*<title>\(.*\)</title>.*:\1:p' <<<"$1" | head -1; }
metaof()  { sed -n "s|.*<meta property=\"$2\" content=\"\([^\"]*\)\".*|\1|p" <<<"$1" | head -1; }

say "→ static SEO files on $SITE"
for p in /robots.txt /sitemap.xml /og-card.png; do
  code=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' "$SITE$p" 2>/dev/null)
  [ "$code" = "200" ] && pass "$p" || fail "$p returned $code"
done

say "→ finding a public post via $API"
POST_ID=""
for id in $(seq 1 80); do
  body=$(curl -sS -m 10 "$API/api/postz/$id/" 2>/dev/null) || continue
  case "$body" in *'"public": true'*|*'"public":true'*) POST_ID="$id"; break;; esac
done
if [ -z "$POST_ID" ]; then
  say "  ! no public post found in ids 1-80 — post something public, or pass an id:"
  say "    curl -s $SITE/p/<id> | grep '<title>'"
  exit 2
fi
pass "post $POST_ID is public"

HOME_HTML=$(curl -sS -m 20 "$SITE/" 2>/dev/null)
SITE_TITLE=$(titleof "$HOME_HTML")
say "→ site-wide title: ${SITE_TITLE:-<none>}"

say "→ fetching $SITE/p/$POST_ID as a crawler would"
PAGE_CODE=$(curl -sS -m 20 -H 'accept: text/html' -o /tmp/mcz_page.$$ -w '%{http_code}' \
            "$SITE/p/$POST_ID" 2>/dev/null)
PAGE=$(cat /tmp/mcz_page.$$ 2>/dev/null); rm -f /tmp/mcz_page.$$
if [ "$PAGE_CODE" != "200" ]; then
  fail "/p/$POST_ID returned HTTP $PAGE_CODE — the page itself is not being served"
  say; say "Nothing below is meaningful until that is fixed."; exit 1
fi
# An error page has a title too, and it differs from the site's. Judging the
# title before knowing the app arrived is how a 404 reads as a pass.
if ! grep -q '<div id="root">' <<<"$PAGE"; then
  fail "no app shell in the response — this is not the SPA, so its title proves nothing"
  say; exit 1
fi
pass "app shell intact — the SPA still boots"
PAGE_TITLE=$(titleof "$PAGE")
OG_TITLE=$(metaof "$PAGE" "og:title")
OG_URL=$(metaof "$PAGE" "og:url")
say "  <title>  ${PAGE_TITLE:-<none>}"
say "  og:title ${OG_TITLE:-<none>}"
say "  og:url   ${OG_URL:-<none>}"

if [ -z "$PAGE_TITLE" ]; then
  fail "no <title> at all — the shell itself did not arrive"
elif [ "$PAGE_TITLE" = "$SITE_TITLE" ]; then
  fail "the post is serving the SITE title — the middleware is not running here"
else
  pass "the post has its own title"
  case "$OG_URL" in *"/p/$POST_ID") pass "og:url points at this post" ;;
                    *) fail "og:url is '${OG_URL:-<none>}', expected .../p/$POST_ID" ;; esac
  grep -q 'application/ld+json' <<<"$PAGE" && pass "structured data present" \
    || fail "no JSON-LD on the post page"
fi

say
if [ "$bad" -eq 0 ]; then
  say "PASS — a crawler fetching /p/$POST_ID sees that post, not the site."
else
  say "$bad check(s) failed. If the only failure is the title, the middleware"
  say "is not running on this host: the page behaves exactly as it did before"
  say "the change, so nothing is broken — it just isn't switched on."
fi
exit $(( bad > 0 ))
