# ToolZ Menu System — Music ConnectZ

## Overview

The **ToolZ Menu** is a comprehensive, categorized navigation hub for all Music ConnectZ applications. It provides organized access to 30+ apps across 6 major categories, with a neon-inspired design aesthetic and custom SVG icons.

## Architecture

### Core Files

- **`src/components/ToolZMenu.jsx`** — Main React component with app configuration and navigation logic
- **`src/components/ToolZMenu.css`** — Neon-styled CSS with animations and responsive design
- **`public/icons/`** — SVG icon library for all apps

### App Categories

The ToolZ menu organizes all applications into 6 categories:

#### 1. **Music Production** (7 apps)
For recording, coaching, and performance across all supported instruments.

- **SingZ** — Voice coaching with AI feedback on performance metrics
  - Dimensions: Pitch, Breath, Tone, Intonation, Rhythm
  - Features: Live scoring, progress tracking, style matching

- **RapZ** — Rap-specific coaching and feedback
  - Dimensions: Flow 🌊, Timing ⏱️, Breath 🫁, Clarity 🔍, Delivery 🔥
  - Features: Register detection, style matching, lyricism scoring

- **GuitarZ, BassZ, KeyZ, DrumZ, ViolinZ** — Instrument-specific coaching
  - Each has custom dimensions based on instrument characteristics
  - All support progression tracking and achievement badges

#### 2. **Collaboration & Competition** (3 apps)
Build connections and test skills through battles and creative partnerships.

- **BattleZ** — Head-to-head music competitions
  - Judge-rated scoring system
  - Battle entry fees with prize pools
  - Leaderboard and achievement tracking

- **CollabZ** — Managed collaboration deals
  - Escrow system with dispute resolution
  - Role-based participation (payer/payee)
  - PartnerZ status with benefits for repeat collaborators

- **InfernoZ** — Short-term projects and dating
  - Quick connections for temporary work
  - Fast-track matching and deal setup

#### 3. **Social & Discovery** (4 apps)
Connect with members, discover content, and engage with the community.

- **SocialiZeZ** — Member directory and connection hub
  - Browse profiles with custom filters
  - Send messages and build network
  - Follow/follower system

- **VybeZ** — Advanced member search with personality filtering
  - Geographic search (distance-based)
  - Personality axis filtering (I/E, N/S, T/F, J/P)
  - Zodiac and substance preferences
  - Age and gender filters

- **PostZ** — Social feed for sharing music and updates
  - Share takes and performances
  - Comment and engagement system
  - Cross-post to multiple apps
  - Media player inline

- **MessageZ** — Direct messaging between members
  - One-on-one conversations
  - File sharing and media
  - Message history

#### 4. **Learning & Progress** (4 apps)
Track development, access training, and celebrate achievements.

- **SkillZ** — Progression tracking system
  - XP (experience points) for actions
  - Badge and achievement system
  - Skill trees per instrument
  - Leaderboards and rankings

- **OCC** — One-on-one coaching with human coaches
  - Book sessions with experienced coaches
  - Per-minute billing during active calls
  - Real-time feedback and guidance

- **BossTake** — Primary recording and submission interface
  - Record performances on any instrument
  - Auto-submit to coaching
  - Take history and versioning
  - Integration with other apps

- **OnboardZ** — Getting started guide
  - Tutorial for new members
  - Quest-based onboarding
  - Welcome bonuses and starter resources

#### 5. **Tools & Economy** (6 apps)
Manage resources, payments, profiles, and integrate external content.

- **LogZ** — Transaction ledger and history
  - View all resource movements (⚡, 🍥, 🏷️, 💵)
  - Reason codes for each transaction
  - Dispute history and resolutions

- **ProfileZ** — User profile editor
  - Edit bio, avatar, links, personas
  - Manage social media connections
  - Birthday and zodiac settings
  - Skills and experience listing

- **WidgetZ** — Link embedding and framing system
  - Frame provider embeds (YouTube, SoundCloud, etc.)
  - Internal app linking
  - Tier-based frame availability
  - Scan status for malware

- **KeyConnectZ** — Voice tools for accessibility
  - Transcription (clips → text)
  - Read-aloud (text → voice)
  - Speech input (voice → text)
  - Multi-language support

- **VenueZ** — Venue and performance space discovery
  - Find performance opportunities
  - Book venues
  - Calendar integration

- **DirectZ** — Video coaching and feedback
  - Upload video performances
  - AI-powered video analysis
  - Specific technique feedback
  - Style matching for video

#### 6. **Analytics & Curation** (2 apps, Owner-only)
Platform metrics and content management.

- **StatZ** — Personal analytics dashboard
  - Performance trends
  - Engagement metrics
  - Progress visualization
  - Goal tracking

- **FunnelZ** — Platform conversion funnel (Owner-only)
  - Landing → Trial → Score → Register pipeline
  - Device breakdown (mobile/tablet/desktop)
  - Channel attribution
  - Offer performance metrics

## Design System

### Neon Color Palette

The ToolZ menu uses a vibrant neon color scheme:

| Color | Hex | Usage |
|-------|-----|-------|
| Cyan | `#00ffff` | Primary accent, connections |
| Magenta | `#ff00ff` | Secondary accent, social |
| Yellow | `#ffff00` | Highlights, progress |
| Green | `#00ff00` | Growth, achievements |
| Gold | `#ffd700` | Premium, skills |
| Red | `#ff3333` | Battles, competition |
| Orange | `#ff9900` | Inferno, hot topics |

### Neon Effects

- **Glow filters** on all icons and text
- **Text shadows** for depth
- **Hover animations** with scale and glow intensification
- **Dark gradient background** for contrast
- **Glassmorphism** cards with backdrop blur

## Component Props

The `ToolZMenu` component accepts no props—it's self-contained.

```jsx
import ToolZMenu from './components/ToolZMenu';

export default function App() {
  return <ToolZMenu />;
}
```

## Navigation Flow

### Current Implementation

The component uses `goToSpot(tab, target)` to navigate:

```javascript
goToSpot(appKey, `${appKey}:main`);
```

This navigates to the specified app's main view. To extend this:

1. Update `src/goto.js` to handle new app routing
2. Ensure app components render at their target routes
3. Apps already mounted: all 30+ Z-apps

### Adding New Apps

To add a new app to the menu:

1. **Create an entry** in `TOOLZ_MENU` constant:
   ```javascript
   { key: 'newapz', label: 'NewAPZ', color: 'cyan', desc: 'App description' }
   ```

2. **Add an icon** to `ICON_MAP`:
   ```javascript
   newapz: { svg: '/icons/newapz.svg', emoji: '📱' }
   ```

3. **Create SVG icon** in `public/icons/newapz.svg` (200×200 viewBox)

4. **Implement the app component** at the route handler

## Responsive Design

The menu adapts to different screen sizes:

### Desktop (768px+)
- 6 columns grid
- Full category labels
- Hover descriptions visible
- Stat bar displayed

### Tablet (480px-768px)
- 4 columns grid
- Category nav in flex row
- Abbreviated labels
- Compact stats

### Mobile (< 480px)
- 3 columns grid
- Vertical category nav
- Stacked stat items
- Touch-optimized tap targets

## Icon Guidelines

### SVG Icon Standards

All icons use a 200×200 viewBox and follow these rules:

1. **Stroke-based design** — outlines, not fills
2. **Neon glow filters** — `<filter id="glow-*">` with feGaussianBlur
3. **Color mapping** — icon color matches category color
4. **Simplicity** — recognizable at 50px rendering size
5. **Consistency** — proportional stroke widths (2-3px typical)

### Existing Icons

| Icon | File | Color | App |
|------|------|-------|-----|
| ToolZ Main | `toolz-main.svg` | Cyan | Menu header |
| SingZ | `singz.svg` | Cyan | Voice coaching |
| RapZ | `rapz.svg` | Magenta | Rap coaching |
| BattleZ | `battlez.svg` | Red | Music battles |
| CollabZ | `collabz.svg` | Cyan | Collaborations |
| SocialiZeZ | `socialiZez.svg` | Magenta | Connections |
| InfernoZ | `infernoz.svg` | Orange | Hot topics |
| PostZ | `postz.svg` | Green | Social feed |
| SkillZ | `skillz.svg` | Gold | Progression |

### Creating New Icons

Use the neon filter pattern:

```svg
<defs>
  <filter id="glow-name" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
    <feMerge>
      <feMergeNode in="coloredBlur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
</defs>

<!-- Icon paths with filter="url(#glow-name)" -->
<path d="..." fill="none" stroke="#00ffff" stroke-width="2.5" filter="url(#glow-name)"/>
```

## Integration Points

### Cross-App Navigation

Apps handle navigation via `goToSpot()`:

```javascript
// From any app, jump to another
goToSpot('singz', 'singz:coach');  // To coach view
goToSpot('postz', 'postz:feed');   // To feed
goToSpot('battlez', 'battlez:enter');  // To battle entry
```

### Resource Display

The ToolZ menu never displays live wallet balances—that's per-app responsibility. Each app shows its own cost/gain before actions.

## Styling Customization

### Theme Colors

Edit colors in `ToolZMenu.css`:

```css
.app-card.cyan {
  color: #00ffff;
  /* Modify as needed */
}
```

### Animations

Adjust animation timing in CSS:

```css
.app-card:hover {
  transition: all 0.3s ease; /* Change duration here */
}
```

### Glow Intensity

Modify filter blur value in SVGs:

```svg
<feGaussianBlur stdDeviation="2.5" /> <!-- Increase for more blur -->
```

## Performance Considerations

- **SVG icons**: Loaded as image refs (fast, scalable)
- **Grid rendering**: CSS Grid auto-fill (efficient layout)
- **Category switching**: State-based, no network calls
- **No analytics by default**: Apps handle their own tracking

## Known Limitations & Future Work

### Current Limitations
1. Icons load via `<image>` tags in SVG—may have CORS issues in some environments
2. Mobile UX could use touch-optimized hover states
3. No keyboard shortcuts for app navigation
4. Search/filter functionality not yet implemented

### Potential Enhancements
1. **App search** — Find apps by name or keyword
2. **Keyboard shortcuts** — Quick access (Alt+S for SingZ, etc.)
3. **Favorites** — Pin frequently-used apps
4. **Recent apps** — Quick access to last 3 opened
5. **Notifications** — Show pending actions per app
6. **Dark/light mode toggle** — Respect system preference

## Troubleshooting

### Icons Not Displaying

**Problem**: SVG icons show as blank or fall back to emoji

**Solution**:
1. Verify `public/icons/` contains the SVG file
2. Check browser console for CORS errors
3. Ensure `ICON_MAP` references match filenames exactly
4. SVG files should be in same domain (no external URLs)

### Colors Appearing Wrong

**Problem**: Neon glow not visible or colors muted

**Solution**:
1. Ensure dark background is being applied (check CSS cascade)
2. Verify filter IDs are unique (no duplicates across icons)
3. Check browser support for CSS filters
4. Test in Chrome/Firefox (Safari may have older filter support)

### Navigation Not Working

**Problem**: Clicking apps doesn't navigate

**Solution**:
1. Verify `goToSpot()` is imported correctly
2. Check app routes are mounted in router config
3. Confirm app components exist at target locations
4. Review browser console for navigation errors

## Related Documentation

- **Frontend CLAUDE.md** — Design system rules and cross-pollination patterns
- **Backend CLAUDE.md** — API endpoints and data models
- **Icon Guidelines** — Detailed neon design standards
- **GoTo Routing** — Navigation system deep-dive

---

**Last Updated:** 2026-09-24  
**Maintained By:** Music ConnectZ Development Team  
**Version:** 1.0
