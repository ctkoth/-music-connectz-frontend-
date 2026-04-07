# Music ConnectZ Monorepo

This monorepo contains:
- **web**: The Music ConnectZ web app (React or static)
- **mobile**: The React Native app (Android/iOS)
- **shared**: Shared assets (icons, images) and code (utilities, API logic)

## Structure
```
packages/
  web/           # Web app code
  mobile/
    MusicConnectZ/  # React Native app code
  shared/
    assets/      # Shared images/icons
    ...          # Shared JS/TS code
```

## How to Use
- Install dependencies for all packages:
  ```
  yarn install
  # or
  npm install
  ```
- Run the web app:
  (see packages/web/README.md)
- Run the mobile app:
  (see packages/mobile/MusicConnectZ/README.md)

## Shared Assets
Import images/assets from `packages/shared/assets` in both apps.

---

For any questions or to add new shared code, just ask Corey! 😏🎤✨
