# Type ConnectZ Integration: Profile & Filters

## Profile Display
- Add a toggle in user profile settings: “Show my Type ConnectZ type on my profile” (default: off)
- If enabled, display user’s Type ConnectZ type, emoji, and Corey-voice description on their public profile
- If disabled, type is private (only user sees it)

## Filters in Pre-Apps
- Add Type ConnectZ type as a filter in collab search, Beat ConnectZ, and other pre-apps
- Users can filter/search by type (e.g., “Show me ENFPs”)
- Option to show/hide type in user lists/cards

## Backend/API
- UserProfile: add `type_connectz_type` (string), `type_connectz_public` (bool)
- API: update endpoints to save/retrieve type and privacy setting
- Pre-app APIs: support filtering by type

## Frontend/UI
- Profile: toggle for type visibility, display type/emoji/description if public
- Pre-apps: filter UI for type, show/hide type in user cards

## Version History (addendum for v15.7)
- Users can display their Type ConnectZ type on their profile (privacy toggle)
- Type ConnectZ type can be used as a filter in collab search and other pre-apps
