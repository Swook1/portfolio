# Portfolio — v2

Personal portfolio of Rayyan Zafier Leksono. Single page, dark theme, animated with anime.js.

## Stack

- React 19 + Vite 6
- Tailwind CSS 3 (colors and fonts come from CSS variables in `src/index.css`)
- anime.js v4 for every animation (entrance timelines, scroll reveals, carousel transitions)

## Structure

```
src/
  App.jsx                 # section composition
  index.css               # theme tokens, component classes, reduced-motion rules
  data/                   # skills, projects, certificates, socials, icons
  hooks/useAnimeScope.js  # anime.js scope + scroll-reveal helper
  components/             # Navbar, Hero, About, Skills, Projects, Certificates, Footer
    chat/                 # ChatWidget and its panel, composer, bubbles
    ui/                   # CertificateModal, YouTubeFacade
  hooks/useChat.js        # transcript state for the widget
  lib/chatService.js      # posts to /api/chat
api/
  chat.js                 # serverless chat route (holds the model key)
  _inferhub.js            # provider adapter
  _knowledge.js           # what the bot is allowed to know
  assets/                 # WebP images + SVG icons
```

## Scripts

```bash
npm run dev              # dev server
npm run build            # production build to dist/
npm run preview          # preview the build
npm run lint             # eslint
npm run assets:optimize  # re-encode src/assets to WebP (needs raster originals)
npm run assets:og        # regenerate public/og-image.jpg
```

## Theming

All colors live as CSS variables on `:root` in `src/index.css`. Changing `--accent`
re-skins the whole site.

## Chat

The floating chat widget answers through `api/chat.js`, a Vercel serverless
function in this same project — so it lives at `rayyanzafier.web.id/api/chat`,
on one domain, with no CORS and no second deployment. The model API key stays on
the server; the browser only ever talks to that route.

Requests go to [InferHub](https://inferhub.dev) over its OpenAI-compatible
endpoint. Swapping providers means editing `api/_inferhub.js` and nothing else.

### Setup

```bash
cp .env.example .env    # then fill in INFERHUB_API_KEY and INFERHUB_MODEL
```

`npm run dev` serves the site but not `api/` — Vite knows nothing about
serverless functions, so the widget will 404. To run both together:

```bash
npm i -g vercel
vercel dev              # site + /api/chat, reads .env
```

For production, the same two variables go in the Vercel dashboard under
Settings -> Environment Variables. Do **not** prefix them with `VITE_`: that
inlines a value into the browser bundle, which for an API key means handing it
to every visitor.

### When it fails

There is no canned fallback anywhere in the path — if the model does not answer,
the widget says so rather than inventing a reply in the bot's voice. InferHub is
prepaid, so `api/_inferhub.js` tells a spent balance apart from a busy model
(402, or a 403/429 whose body mentions credit or quota) and the visitor is told
plainly to email instead of being asked to try again. The server log shouts
`[chat] OUT OF CREDIT` for that case.

### What the bot knows

`api/_knowledge.js` holds the profile, projects, certificates and contact
details as prose, plus the system prompt that pins the bot to them. It is
maintained by hand rather than imported from `src/data`, because those modules
import `.webp` assets that the Node runtime cannot resolve — so when a project
or a contact changes in `src/data`, change it there too.

## Deploy

Vercel, framework preset Vite, build `npm run build`, output `dist`, base path `/`.
Production domain: `rayyanzafier.web.id`.
