"""
Server-side OAuth for all ten providers (Google, Apple, GitHub, Spotify,
Microsoft, Facebook, Instagram, SoundCloud, TikTok, Twitter/X).

Each verifier/exchanger returns a normalized dict:
    {"provider", "uid", "email", "name", "avatar_url"}
or raises OAuthError with a user-safe message.

Enable a provider by setting its keys on the backend (Render). Either naming is
accepted: <PROVIDER>_OAUTH_CLIENT_ID or <PROVIDER>_CLIENT_ID (and the matching
..._CLIENT_SECRET). google/apple need only a client id (ID-token verify),
twitter uses PKCE; the rest also need a client secret. Examples:
    GOOGLE_OAUTH_CLIENT_ID
    GITHUB_OAUTH_CLIENT_ID + GITHUB_OAUTH_CLIENT_SECRET
    SPOTIFY_OAUTH_CLIENT_ID + SPOTIFY_OAUTH_CLIENT_SECRET
GET /api/auth/oauth/config/ reports which providers are configured + `ready`.
"""
import os

import requests


class OAuthError(Exception):
    pass


def _env(name):
    return os.environ.get(name, "").strip()


def _first_env(*names):
    for n in names:
        v = os.environ.get(n, "").strip()
        if v:
            return v
    return ""


def _cid(provider_upper):
    """Public client id — accepts <P>_OAUTH_CLIENT_ID or <P>_CLIENT_ID so keys
    named either way on the backend are picked up."""
    return _first_env(f"{provider_upper}_OAUTH_CLIENT_ID", f"{provider_upper}_CLIENT_ID")


def _secret(provider_upper):
    return _first_env(f"{provider_upper}_OAUTH_CLIENT_SECRET", f"{provider_upper}_CLIENT_SECRET")


# Every provider we support. Client IDs are PUBLIC (they ride in the browser's
# authorize redirect); secrets never leave the server. The frontend reads this
# via GET /api/auth/oauth/config/ so it needs no VITE_* build vars.
PROVIDERS_ALL = ["google", "apple", "github", "spotify", "microsoft",
                 "facebook", "instagram", "soundcloud", "tiktok", "twitter"]
# Providers whose server-side code exchange needs a client secret. google/apple
# verify an ID token (no secret); twitter uses PKCE (public client).
NEEDS_SECRET = {"github", "spotify", "microsoft", "facebook", "instagram",
                "soundcloud", "tiktok"}


def public_oauth_config():
    """Configured providers + PUBLIC client IDs (never secrets). `ready` is true
    when the server has everything it needs to complete sign-in (client id, plus
    a secret for the providers that require one)."""
    out = []
    for key in PROVIDERS_ALL:
        cid = _cid(key.upper())
        if not cid:
            continue
        ready = key not in NEEDS_SECRET or bool(_secret(key.upper()))
        out.append({"key": key, "client_id": cid, "ready": ready})
    return out


# ---------------------------------------------------------------- Google ----
def verify_google(credential: str):
    """Verify a Google ID token (the `credential` from Google Identity Services)."""
    if not credential:
        raise OAuthError("Missing Google credential.")
    client_id = _cid("GOOGLE")
    try:
        resp = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": credential},
            timeout=10,
        )
    except requests.RequestException:
        raise OAuthError("Could not reach Google to verify sign-in.")
    if resp.status_code != 200:
        raise OAuthError("Google rejected that sign-in token.")
    data = resp.json()
    if client_id and data.get("aud") != client_id:
        raise OAuthError("Google token audience mismatch.")
    if data.get("email_verified") in ("false", False):
        raise OAuthError("Google email is not verified.")
    return {
        "provider": "google",
        "uid": data["sub"],
        "email": (data.get("email") or "").lower(),
        "name": data.get("name") or "",
        "avatar_url": data.get("picture") or "",
    }


# ---------------------------------------------------------------- GitHub ----
def exchange_github(code: str, redirect_uri: str = ""):
    """Exchange a GitHub OAuth `code` for an access token, then load the user."""
    if not code:
        raise OAuthError("Missing GitHub code.")
    client_id = _cid("GITHUB")
    client_secret = _secret("GITHUB")
    if not client_id or not client_secret:
        raise OAuthError("GitHub sign-in is not configured on the server.")

    try:
        token_resp = requests.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            timeout=10,
        )
    except requests.RequestException:
        raise OAuthError("Could not reach GitHub to verify sign-in.")
    token = token_resp.json().get("access_token")
    if not token:
        raise OAuthError("GitHub did not return an access token.")

    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    user = requests.get("https://api.github.com/user", headers=headers, timeout=10).json()

    email = user.get("email") or ""
    if not email:
        emails = requests.get(
            "https://api.github.com/user/emails", headers=headers, timeout=10
        ).json()
        if isinstance(emails, list):
            primary = next(
                (e for e in emails if e.get("primary") and e.get("verified")), None
            )
            email = (primary or {}).get("email", "") if primary else ""

    return {
        "provider": "github",
        "uid": str(user.get("id")),
        "email": email.lower(),
        "name": user.get("name") or user.get("login") or "",
        "avatar_url": user.get("avatar_url") or "",
    }


# ----------------------------------------------------------------- Apple ----
def verify_apple(id_token: str):
    """Verify an Apple identity token (JWT) against Apple's public keys."""
    if not id_token:
        raise OAuthError("Missing Apple identity token.")
    try:
        import jwt
        from jwt import PyJWKClient
    except Exception:
        raise OAuthError("Apple sign-in requires PyJWT on the server.")

    client_id = _cid("APPLE")
    try:
        jwk_client = PyJWKClient("https://appleid.apple.com/auth/keys")
        signing_key = jwk_client.get_signing_key_from_jwt(id_token)
        data = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=client_id or None,
            issuer="https://appleid.apple.com",
            options={"verify_aud": bool(client_id)},
        )
    except Exception:
        raise OAuthError("Apple rejected that sign-in token.")

    return {
        "provider": "apple",
        "uid": data["sub"],
        "email": (data.get("email") or "").lower(),
        "name": "",
        "avatar_url": "",
    }


# ------------------------------------------------------- Generic providers
# Standard OAuth2 authorization-code exchange for the extended provider set.
# Env per provider (set on Render): <NAME>_OAUTH_CLIENT_ID / <NAME>_OAUTH_CLIENT_SECRET
# All are exchanged via POST /api/auth/oauth/<provider>/ with {code, redirect_uri}
# (+ code_verifier for twitter PKCE).

def _post_token(url, data, auth=None, headers=None):
    try:
        resp = requests.post(
            url, data=data, auth=auth,
            headers={"Accept": "application/json", **(headers or {})},
            timeout=10,
        )
    except requests.RequestException:
        raise OAuthError("Could not reach the sign-in provider.")
    if resp.status_code >= 400:
        raise OAuthError("The provider rejected that sign-in code.")
    tok = resp.json().get("access_token")
    if not tok:
        raise OAuthError("The provider did not return an access token.")
    return tok


def _get_json(url, token, params=None):
    try:
        r = requests.get(
            url, params=params or {},
            headers={"Authorization": f"Bearer {token}"}, timeout=10,
        )
    except requests.RequestException:
        raise OAuthError("Could not load your profile from the provider.")
    if r.status_code >= 400:
        raise OAuthError("The provider refused the profile request.")
    return r.json()


def exchange_spotify(code, redirect_uri):
    cid, sec = _cid("SPOTIFY"), _secret("SPOTIFY")
    if not cid or not sec:
        raise OAuthError("Spotify sign-in isn't configured on the server.")
    tok = _post_token(
        "https://accounts.spotify.com/api/token",
        {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri},
        auth=(cid, sec),
    )
    me = _get_json("https://api.spotify.com/v1/me", tok)
    return {"provider": "spotify", "uid": str(me.get("id")),
            "email": (me.get("email") or "").lower(),
            "name": me.get("display_name") or "", "avatar_url": (me.get("images") or [{}])[0].get("url", "")}


def exchange_microsoft(code, redirect_uri):
    cid, sec = _cid("MICROSOFT"), _secret("MICROSOFT")
    if not cid or not sec:
        raise OAuthError("Microsoft sign-in isn't configured on the server.")
    tok = _post_token(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri,
         "client_id": cid, "client_secret": sec, "scope": "User.Read"},
    )
    me = _get_json("https://graph.microsoft.com/v1.0/me", tok)
    email = (me.get("mail") or me.get("userPrincipalName") or "").lower()
    return {"provider": "microsoft", "uid": str(me.get("id")),
            "email": email, "name": me.get("displayName") or "", "avatar_url": ""}


def exchange_facebook(code, redirect_uri):
    cid, sec = _cid("FACEBOOK"), _secret("FACEBOOK")
    if not cid or not sec:
        raise OAuthError("Facebook sign-in isn't configured on the server.")
    tok = _post_token(
        "https://graph.facebook.com/v18.0/oauth/access_token",
        {"code": code, "redirect_uri": redirect_uri, "client_id": cid, "client_secret": sec},
    )
    me = _get_json("https://graph.facebook.com/me", tok, {"fields": "id,name,email,picture"})
    return {"provider": "facebook", "uid": str(me.get("id")),
            "email": (me.get("email") or "").lower(), "name": me.get("name") or "",
            "avatar_url": ((me.get("picture") or {}).get("data") or {}).get("url", "")}


def exchange_instagram(code, redirect_uri):
    cid, sec = _cid("INSTAGRAM"), _secret("INSTAGRAM")
    if not cid or not sec:
        raise OAuthError("Instagram sign-in isn't configured on the server.")
    try:
        resp = requests.post(
            "https://api.instagram.com/oauth/access_token",
            data={"client_id": cid, "client_secret": sec, "grant_type": "authorization_code",
                  "redirect_uri": redirect_uri, "code": code}, timeout=10)
    except requests.RequestException:
        raise OAuthError("Could not reach Instagram.")
    data = resp.json()
    if "access_token" not in data:
        raise OAuthError("Instagram rejected that sign-in code.")
    me = _get_json("https://graph.instagram.com/me", data["access_token"],
                   {"fields": "id,username"})
    return {"provider": "instagram", "uid": str(me.get("id")),
            "email": "", "name": me.get("username") or "", "avatar_url": ""}


def exchange_soundcloud(code, redirect_uri):
    cid, sec = _cid("SOUNDCLOUD"), _secret("SOUNDCLOUD")
    if not cid or not sec:
        raise OAuthError("SoundCloud sign-in isn't configured on the server.")
    tok = _post_token(
        "https://secure.soundcloud.com/oauth/token",
        {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri,
         "client_id": cid, "client_secret": sec},
    )
    me = _get_json("https://api.soundcloud.com/me", tok)
    return {"provider": "soundcloud", "uid": str(me.get("id")),
            "email": "", "name": me.get("username") or "", "avatar_url": me.get("avatar_url") or ""}


def exchange_tiktok(code, redirect_uri):
    cid, sec = _cid("TIKTOK"), _secret("TIKTOK")
    if not cid or not sec:
        raise OAuthError("TikTok sign-in isn't configured on the server.")
    tok = _post_token(
        "https://open.tiktokapis.com/v2/oauth/token/",
        {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri,
         "client_key": cid, "client_secret": sec},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    me = _get_json("https://open.tiktokapis.com/v2/user/info/", tok,
                   {"fields": "open_id,display_name,avatar_url"})
    user = (me.get("data") or {}).get("user") or {}
    return {"provider": "tiktok", "uid": str(user.get("open_id") or ""),
            "email": "", "name": user.get("display_name") or "",
            "avatar_url": user.get("avatar_url") or ""}


def exchange_twitter(code, redirect_uri, code_verifier=""):
    cid = _cid("TWITTER")
    sec = _secret("TWITTER")
    if not cid:
        raise OAuthError("Twitter/X sign-in isn't configured on the server.")
    if not code_verifier:
        raise OAuthError("Missing PKCE verifier for Twitter/X sign-in.")
    tok = _post_token(
        "https://api.twitter.com/2/oauth2/token",
        {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri,
         "client_id": cid, "code_verifier": code_verifier},
        auth=(cid, sec) if sec else None,
    )
    me = _get_json("https://api.twitter.com/2/users/me", tok)
    data = me.get("data") or {}
    return {"provider": "twitter", "uid": str(data.get("id") or ""),
            "email": "", "name": data.get("username") or "", "avatar_url": ""}


CODE_EXCHANGERS = {
    "github": lambda code, ru, cv="": exchange_github(code, ru),
    "spotify": lambda code, ru, cv="": exchange_spotify(code, ru),
    "microsoft": lambda code, ru, cv="": exchange_microsoft(code, ru),
    "facebook": lambda code, ru, cv="": exchange_facebook(code, ru),
    "instagram": lambda code, ru, cv="": exchange_instagram(code, ru),
    "soundcloud": lambda code, ru, cv="": exchange_soundcloud(code, ru),
    "tiktok": lambda code, ru, cv="": exchange_tiktok(code, ru),
    "twitter": exchange_twitter,
}
