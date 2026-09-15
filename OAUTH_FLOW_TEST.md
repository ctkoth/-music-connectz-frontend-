# OAuth Login Flow - Complete Test Guide

## Overview
This document describes the complete OAuth authentication flow implemented for Music ConnectZ, specifically addressing the scenario where a user with an existing account tries to sign in using an OAuth provider (like SoundCloud) with an unverified email.

## The Problem
- Trial users could start OAuth signin but would get stuck if their OAuth email wasn't verified
- The system couldn't auto-link unverified emails to existing accounts (to prevent duplicate account exploitation)
- But there was no way for users to manually link their OAuth account to their existing account

## The Solution
Implemented a complete "I already have one" flow that allows users to:
1. Start OAuth signin → get offered a choice if email can't auto-match
2. Choose "I already have one" and sign in with credentials
3. OAuth account automatically linked after login
4. Continue as authenticated user with both credential and OAuth access

---

## Test Scenarios

### Scenario 1: Returning User with Unverified Email (THE FIX)
**User**: Has existing Music ConnectZ account, trying SoundCloud OAuth with unverified email

**Expected Flow**:
1. Click "Sign in with SoundCloud"
2. Redirected to SoundCloud consent screen
3. Browser redirected back to `/oauth/callback?code=...&state=...`
4. OAuthCallback.jsx:
   - Validates state (CSRF protection) ✓
   - Exchanges code for OAuth info
   - Backend can't auto-match (email_verified=false)
   - Returns `{ needs_choice: true, pending: "...", provider: "soundcloud", email: "..." }`
5. Frontend shows AccountChoice screen
6. User clicks "I already have one"
7. OAuthCallback stores pending token + provider in sessionStorage
8. Redirects to `/login`
9. User enters username/password and clicks "Log in"
10. Login.jsx:
    - Authenticates user
    - Checks sessionStorage for pending OAuth
    - Calls `POST /api/auth/oauth/soundcloud/link/` with `{ pending: <token> }`
    - Backend OAuthLinkView:
      - Reads the token under its own `pending` key — the same key the
        register path uses. Never `code`: the authorization code was spent
        on the first exchange and cannot be replayed
      - Decodes and verifies the signature with `_read_pending()`
      - Verifies provider matches
      - Creates OAuthIdentity linking SoundCloud to authenticated user
    - Frontend clears sessionStorage
    - User redirected to home as authenticated user with both credential + SoundCloud access

**What gets tested**:
- ✓ Email verification check prevents auto-linking
- ✓ SessionStorage safely stores pending tokens
- ✓ OAuthCallback properly handles CSRF checks
- ✓ AccountChoice component renders with two buttons
- ✓ Pending token survives navigation to login
- ✓ Login.jsx correctly detects and processes pending OAuth
- ✓ OAuthLinkView accepts and processes pending tokens
- ✓ OAuthIdentity created linking provider to user
- ✓ User successfully authenticated with both auth methods

### Scenario 2: New User (Also Fixed)
**User**: No existing account, starting OAuth signin

**Expected Flow**:
1. Click "Sign in with SoundCloud"
2. OAuth callback same as Scenario 1
3. Backend returns `needs_choice: true`
4. User clicks "I'm new"
5. OAuthCallback navigates to:
   ```
   /register?pending=...&provider=soundcloud&email=...&suggested=...
   ```
6. Register.jsx:
   - Shows signup form with email pre-filled (if available)
   - User completes registration
   - On submit, passes pending token to backend
   - Backend creates account and links OAuth
7. User continues to home as new authenticated user

**What gets tested**:
- ✓ Pending token passed to Register correctly
- ✓ Register.jsx pre-fills email from OAuth
- ✓ New account created with OAuth linked

### Scenario 3: Auto-Signin (Existing Path, Unaffected)
**User**: Has existing account with verified email from same provider

**Expected Flow**:
1. Click "Sign in with SoundCloud"
2. Redirected to SoundCloud and back to `/oauth/callback`
3. OAuthCallback exchanges code
4. Backend finds matching verified email
5. Auto-creates OAuthIdentity and returns authenticated user
6. OAuthCallback redirects to home
7. User immediately logged in

**What gets tested**:
- ✓ Verified emails still auto-link
- ✓ Auto-signin path unchanged
- ✓ OAuthIdentity created automatically

---

## Implementation Details

### Backend Changes

#### 1. _user_from_oauth() [apps/accounts/views.py:128-141]
```python
# Only auto-link if email is verified
if info.get("email") and info.get("email_verified"):
    match = User.objects.filter(email__iexact=info["email"]).first()
    user = match
```
- Changed from: raising error on unverified email
- Now: Only matches verified emails, lets unverified fall through to "ask user" flow

#### 2. OAuthLinkView Enhancement [apps/accounts/views.py]
- Accepts a pending token under its own `pending` key, beside the existing
  fresh-exchange path
- `_read_pending()` verifies the signature and decodes the OAuth info
- Allows authenticated users to link pending OAuth identities

**This shipped broken once, and the shape of the mistake is worth keeping.**
The first version smuggled the token in as `code` and guessed which one it
had by testing the string for a `.` and a `:`. `signing.dumps` only prefixes
a `.` when it compresses, which it does not at this size — so every real
token tested False, fell through to the fresh-exchange branch, and was
posted to the provider as an authorization code it had never issued. A
shape heuristic cannot answer "is this ours"; a signature can.

### Frontend Changes

#### 1. OAuthCallback.jsx [NEW]
- Handles `/oauth/callback` route
- Exchanges code for OAuth info
- Shows AccountChoice on `needs_choice` response
- For "I already have one": stores pending token in sessionStorage
- For "I'm new": passes pending token to Register

#### 2. Login.jsx [UPDATED]
- After successful authentication
- Checks sessionStorage for `mcz_oauth_pending` and `mcz_oauth_provider`
- Calls `POST /api/auth/oauth/{provider}/link/` with pending token
- Silently continues to home (login already succeeded)

#### 3. App.jsx [UPDATED]
- Removed old non-functional OAuthCallback
- Imported new OAuthCallback.jsx
- Routes `/oauth/callback` to imported component

---

## Security Considerations

### CSRF Protection
- State parameter generated and validated (existing, unaffected)
- Prevents redirects from malicious sites

### Signature Verification
- Pending tokens are Django-signed with salt + max_age
- Cannot be forged or replayed after 15 minutes
- Signature checked by `_read_pending()`

### Email Verification
- Unverified emails don't trigger auto-linking
- Requires user to prove they own the account (login credentials)
- Prevents duplicate account exploitation

### Provider Matching
- Pending token must be for same provider as URL
- Prevents using a SoundCloud token with Spotify endpoint

### One Account Per Person
- OAuthIdentity unique constraint prevents linking to multiple users
- Returns error if OAuth account already linked elsewhere

---

## Manual Testing Checklist

When testing with real OAuth credentials:

### Before OAuth
- [ ] Login page loads
- [ ] OAuth buttons visible (SoundCloud, Spotify, etc.)
- [ ] Buttons have correct styling

### OAuth Callback
- [ ] State parameter present in callback URL
- [ ] Redirects properly handled
- [ ] Error messages clear if provider denies

### Choice Screen (Key Test)
- [ ] "Do you already have an account?" screen appears
- [ ] Email displayed (if available)
- [ ] Two buttons visible with clear labels
- [ ] "I'm new" button works
- [ ] "I already have one" button works

### "I'm new" Path
- [ ] Redirects to register with pending token
- [ ] Email pre-filled
- [ ] Suggested username displayed
- [ ] Registration completes successfully
- [ ] Account created with OAuth linked

### "I already have one" Path (THE CRITICAL TEST)
- [ ] Redirects to login
- [ ] Login page loads normally
- [ ] Username/password fields work
- [ ] Submit button submits form
- [ ] Shows loading spinner
- [ ] Redirects to home after login completes
- [ ] User is authenticated
- [ ] OAuth account linked to user account
  - Verify by checking if user can login again with OAuth button

### Repeat OAuth with Same Account
- [ ] After first OAuth link, try same OAuth again
- [ ] Should auto-signin (no choice screen)
- [ ] Redirects directly to home

### Error Cases
- [ ] Deny provider access → error message
- [ ] Invalid state → error message
- [ ] Session storage cleared → error message
- [ ] Different provider on pending token → error message
- [ ] OAuth account already linked to another user → error message

---

## Code Review Checklist

- [ ] OAuthCallback.jsx:
  - [ ] Validates state parameter against stored value
  - [ ] Checks for required code parameter
  - [ ] Handles all three response types (auto-signin, needs_choice, error)
  - [ ] Stores pending token only on needs_choice + "I already have one"
  - [ ] Properly navigates to register/login with correct parameters

- [ ] Login.jsx:
  - [ ] Checks sessionStorage after successful auth
  - [ ] Calls link endpoint with pending token
  - [ ] Handles link success (clears storage, continues to home)
  - [ ] Handles link failure gracefully (logs warning, continues to home)
  - [ ] Login still succeeds even if linking fails

- [ ] App.jsx:
  - [ ] Correctly imports OAuthCallback from ./auth/OAuthCallback.jsx
  - [ ] Route configured for /oauth/callback
  - [ ] Old OAuthCallback removed (no duplicates)

- [ ] Backend OAuthLinkView:
  - [ ] Requires authentication (IsAuthenticated permission)
  - [ ] Reads the pending token from the `pending` key, never `code`
  - [ ] Rejects a tampered or expired token on the signature
  - [ ] Validates provider matches token
  - [ ] Checks for existing OAuthIdentity
  - [ ] Creates OAuthIdentity on success
  - [ ] Returns proper error messages

Verified against a running API, with a real signed token:

| Case | Expected |
|---|---|
| `pending` token, first time | linked; `OAuthIdentity` row written |
| same token again | "already linked to your account" |
| SoundCloud token at `/spotify/link/` | "that sign-in was for a different provider" |
| tampered signature | "could not be verified. Start again." |

- [ ] Backend _user_from_oauth():
  - [ ] Only auto-links if email_verified=True
  - [ ] Lets unverified emails fall through to needs_choice
  - [ ] Still auto-creates account on first OAuth with verified email

---

## Expected Behavior Summary

| Scenario | Email | Auto-Link? | Route | Outcome |
|----------|-------|-----------|-------|---------|
| First OAuth, verified email | user@provider.com | Yes | Auto → Home | User created + authenticated |
| First OAuth, unverified email | user@example.com | No | Choice → Register | User created + OAuth linked + authenticated |
| Existing user, unverified OAuth email | user@example.com | No | Choice → Login → Link | OAuth linked to existing account + authenticated |
| Existing user, verified email match | user@example.com | Yes | Auto → Home | Authenticated immediately |
| Re-login same OAuth, already linked | Same as above | Yes | Auto → Home | Authenticated immediately |

---

## Deployment Notes

- Backend must be deployed BEFORE frontend (as per CLAUDE.md)
- Both repos auto-deploy from `main` when merged
- No database migrations required
- No environment variable changes required
- Existing accounts unaffected

---

## Additional Resources

- Backend CLAUDE.md: OAuth flow architecture
- Frontend CLAUDE.md: Cross-pollination rules
- Login.jsx: Email-based authentication
- Register.jsx: Account creation with pending tokens
- OAuthButtons.jsx: OAuth initiation
- AccountChoice.jsx: User choice screen
