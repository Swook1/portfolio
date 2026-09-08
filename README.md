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
    ui/                   # CertificateModal, YouTubeFacade
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

## Deploy

Vercel, framework preset Vite, build `npm run build`, output `dist`, base path `/`.
Production domain: `rayyanzafier.web.id`.
