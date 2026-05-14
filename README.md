# Music ConnectZ — React Frontend

> The neon-drenched career platform for indie artists, producers, designers, videographers, ghostwriters, and managers. **v0.7** React rewrite.

🌐 **Live:** [musicconnectz.net](https://musicconnectz.net) (vanilla HTML build) · TBD (React build)
🔌 **Backend:** [music-connectz-backend-2.onrender.com](https://music-connectz-backend-2.onrender.com)

---

## What this is

A **React + Vite + Tailwind** rewrite of Music ConnectZ. The original vanilla-JS `index.html` ships in [`Musicconnectz-solo-front`](https://github.com/ctkoth/Musicconnectz-solo-front) and remains the production build. This repo is the **v2 architecture experiment** — same product, modern stack, room to grow.

The neon palette, Corey voice, ZodiacZ logic, PersonaZ system, and Lilith taskZ engine are all ported.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | React 18 + Vite 5 |
| Styling | Tailwind CSS 3.4 + custom neon palette |
| Icons | Lucide React (placeholders) + emoji-first design |
| Fonts | Space Grotesk (UI) · Audiowide (display) |
| Storage | `window.storage` shim (localStorage for now; API-backed later) |
| AI | Anthropic Claude API direct calls (Corey GPT, RateZ, Parcel Primate) — will proxy through backend |

---

## Quick start

```bash
git clone https://github.com/ctkoth/<this-repo>.git
cd <this-repo>
npm install
npm run dev
# → http://localhost:5173
```

Build for production:

```bash
npm run build
npm run preview   # serves dist on :4173
```

Deploy to Vercel:

```bash
vercel        # or just connect the repo in the Vercel dashboard
```

`vercel.json` handles SPA rewrites + security headers.

---

## What's live in the React build (v0.7)

✅ **Login screen** (demo mode + guest entry, styled to original CSS)
✅ **HomeZ** dashboard
✅ **Profile** with ZodiacZ auto-detect (12-sign mapping)
✅ **Lilith** — full Inbox/Today/Upcoming/Anytime/Someday/Logbook/Trash taskZ suite
✅ **OCC** with Corey GPT (5 domain modes: Build/Code/Music/Art/Writing) — direct Claude API calls
✅ **SettingZ** with casualMode AAVE substitution
✅ **PersonaZ** — 8 persona types, full skill database, multi-select + batched start dates
✅ **Examples** — title/description/genre/skills-used/public-private toggle
✅ **CollabZ** — functional feed with persona+city filters
✅ **MessageZ** — Inbox/Outbox + **Parcel Primate** AI email campaign drafter

🔴 Scaffolded but not yet functional: BattleZ · RateZ · LogZ · Money · DistributeZ · RoyaltieZ · LabelZ · GroupZ · GameZ · CallZ · BugZ · Social ConnectZ · SingZ/RapZ/BodieZ · 11 of 14 ToolZ sub-apps

---

## Architecture notes

- **Single-file architecture (for now).** `src/App.jsx` is one ~2250-line file. Easy to navigate, easy to hot-reload. Will split into `components/`, `hooks/`, `data/` modules in a future refactor.
- **Storage shim.** `window.storage` is a Promise-returning localStorage wrapper. When the Django backend is wired in, swap the shim's implementation — call sites don't change.
- **Hash-based routing.** `#/tab?modal=name` — no React Router needed, works offline, easy to deep-link.
- **Theme tokens.** All colors in the `T` object inside App.jsx. Match Tailwind's `mcz.*` palette in `tailwind.config.js`.
- **Anthropic calls.** Currently direct `fetch('https://api.anthropic.com/v1/messages')` from the browser. **For production, proxy through the Django backend** (better security, hides API key, can swap providers).

---

## Env vars

Create `.env.local` (gitignored):

```bash
VITE_API_BASE=https://music-connectz-backend-2.onrender.com
VITE_ANTHROPIC_KEY=sk-ant-xxxxx   # TEMPORARY — move to backend ASAP
```

Access in code: `import.meta.env.VITE_API_BASE`

---

## Roadmap

| Phase | Goal | ETA |
|---|---|---|
| **0.7** ✓ | Single-file artifact + PersonaZ/CollabZ/MessageZ functional | shipped |
| **0.8** | BattleZ + RateZ functional with Corey GPT scoring | 2 prompts |
| **0.9** | SingZ + RapZ + BodieZ tab maps | 3 prompts |
| **1.0** | Money + DistributeZ + LabelZ + RoyaltieZ connected w/ Stripe K-Oth 10% split | 4 prompts |
| **1.1** | Wire to Django backend — replace `window.storage` with API calls | 4-6 prompts |
| **1.2** | Replace Lucide placeholders with native iconZ from IconZ folder | rolling |
| **1.3** | Split App.jsx into modules | 2-3 prompts |

---

## License

All rights reserved · © ctkoth

---

Built one drop at a time with Claude.
