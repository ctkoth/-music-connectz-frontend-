# Cross-Pollination & Cohesion Audit
Music ConnectZ Platform Integration Analysis

## Guiding Principle
From CLAUDE.md: "Nothing is a dead end. Something created, recorded or noticed in one app opens in another to edit or analyse."

---

## 1. CURRENT CROSS-POLLINATION FEATURES

### ✅ Implemented
- **Transaction Logs** (New)
  - Energy ⚡, SpinaZ 🍥, PromptZ 🏷️, Money 💵 pills are clickable
  - Navigate to LogZ with resource filtered
  
- **Profile Navigation** (New)
  - Global event `mcz-goto-profile` opens member cards
  - @mentions system ready for integration

- **Post References** (New)
  - `post:#id` syntax supported
  - Post modal opens with referenced post

- **Tab Navigation** (Existing)
  - `mcz-goto-tab` event dispatched by OnboardZ steps
  - Intelligent scroll behavior on tab change

### ❌ Not Yet Implemented
- @mention parsing in user-generated content
- post:#id references in descriptions/bios
- #hashtag search navigation
- "Open in" links on LogZ entries
- Cross-app content discovery

---

## 2. INTEGRATION POINTS (Priority Order)

### PRIORITY 1: User Mentions (High Impact)
**Where to apply MentionText:**

1. **User Bios** 
   - `src/apps/PublicProfile.jsx` - line 73
   - `src/apps/ProfileZ.jsx` - member's own profile
   - `src/apps/MemberProfile.jsx` - profile cards

2. **Post Content**
   - `src/apps/PostZ.jsx` - post.text/description
   - `src/apps/PublicPost.jsx` - shared post display

3. **Comments/Messages**
   - `src/apps/MessageZ.jsx` - message threads
   - Any comment/reply component

4. **Collaboration Descriptions**
   - `src/apps/CollabZ.jsx` - project descriptions
   - `src/apps/LabelZ.jsx` - label/group descriptions

### PRIORITY 2: Resource References
**Log "Open In" Links:**

When a LogZ entry references another resource:
- Spent on a skill → open InstrumentZ/SkillZ
- Earned from a post → open PostZ
- From a collab → open CollabZ
- Course credit → open LessonZ

### PRIORITY 3: Post References
**post:#id syntax:**

- Existing in descriptions → make clickable
- Enable in comments
- Show post preview on hover

### PRIORITY 4: Hashtag Discovery
**#hashtag navigation:**

- Parse from user content
- Link to search results (when search exists)
- Aggregate posts by tag

---

## 3. COMPONENTS TO UPDATE

### Global Components
- `MentionText` - primary renderer (✓ created)
- `TransactionModal` - add "Open In" context (TODO)

### By App
| App | Component | Content Type | Status |
|-----|-----------|--------------|--------|
| PublicProfile | bio | User text | TODO |
| ProfileZ | bio, location | User text | TODO |
| MemberProfile | bio, intro | User text | TODO |
| PostZ | description, caption | Post text | TODO |
| PublicPost | description, caption | Post text | TODO |
| MessageZ | message body | Message | TODO |
| CollabZ | description, notes | Collab text | TODO |
| LabelZ | bio, description | Group text | TODO |
| DirectZ | brief, direction | Direction text | TODO |
| LogZ | description | Transaction | TODO |
| BattleZ | description | Battle text | TODO |
| LessonZ | description | Lesson text | TODO |

---

## 4. COHESION CHECKLIST

### Navigation Consistency
- [ ] All user names are clickable and open profiles
- [ ] All post references navigate to posts
- [ ] Tab switching uses consistent `mcz-goto-tab` event
- [ ] Back/forward navigation works across apps

### Visual Consistency
- [ ] Mentions use same color: `text-mcz-cyan` 
- [ ] Post refs use same color: `text-mcz-pink`
- [ ] Hashtags use same color: `text-mcz-gold`
- [ ] All interactive text has hover state
- [ ] All use `active:scale-95` for feedback

### Data Consistency
- [ ] LogZ entries carry source information
- [ ] Posts carry destination apps
- [ ] User profiles carry links to content
- [ ] Collaborations reference members

### Error Handling
- [ ] Broken mentions show gracefully (✓ not clickable)
- [ ] Deleted posts don't crash reference
- [ ] Removed users don't break mentions
- [ ] Missing resources fail silently

### API Alignment
- [ ] LogZ returns full transaction context
- [ ] Profiles return member data for mentions
- [ ] Posts return all referenced data
- [ ] Search supports hashtag filtering

---

## 5. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Current)
- ✅ TransactionModalContext
- ✅ MentionParser component
- ✅ Profile navigation event
- TODO: Update TransactionModal with "open_in" links

### Phase 2: Content Integration
- TODO: Apply MentionText to top 5 priority locations
- TODO: Add mention parsing to API responses
- TODO: Update backend to include `open_in` hints

### Phase 3: Comprehensive Coverage
- TODO: Apply to all remaining text content
- TODO: Add hashtag discovery UI
- TODO: Implement post preview on hover

### Phase 4: Polish & Audit
- TODO: Visual/behavioral consistency check
- TODO: Mobile responsiveness audit
- TODO: Accessibility audit (WCAG)
- TODO: Performance check (render cost)

---

## 6. NOTES FOR MAINTAINERS

### Key Files
- `MentionParser.jsx` - core parsing logic
- `TransactionModalContext.jsx` - global modal state
- `CLAUDE.md` - cross-pollination philosophy

### Backend Requirements
Each content endpoint should return:
```json
{
  "content": "...",
  "mentions": ["user1", "user2"],
  "post_refs": ["post-id-1"],
  "hashtags": ["tag1", "tag2"],
  "open_in": {
    "app": "singz",
    "target": "singz:coach",
    "reason": "rated here"
  }
}
```

### Testing Considerations
- Test broken links (user deleted, post removed)
- Test mention parsing with special characters
- Test on mobile touch devices
- Verify no infinite loops in navigation

---

## 7. METRICS FOR SUCCESS

- 100% of user mentions are clickable
- 100% of post references navigate correctly
- 0 dead ends in user-generated content
- All apps link to each other where relevant
- Cohesion score: All text styling uses same palette

