# PWA Setup

## What Was Implemented

### Service Worker
- **`sw.ts`** — Service worker source compiled by `@serwist/next` into `public/sw.js`
  - Precaches all Next.js build assets (JS, CSS, HTML) with revision hashes
  - Runtime caching via `defaultCache` for: fonts, images, JS/CSS, pages, API routes, cross-origin requests
  - `skipWaiting: true` — activates new SW immediately after install
  - `clientsClaim: true` — takes control of all open tabs on activation
  - `navigationPreload: true` — speeds up navigation requests
- **`@serwist/next`** — Next.js integration plugin (wraps `next.config.ts`)
- **`@serwist/window`** — Client-side service worker registration (`PwaRegister` component)
- **Build-time manifest injection** via `self.__SW_MANIFEST` placeholder replaced by Serwist webpack plugin

### Web App Manifest
- **`public/manifest.json`** — Static manifest file with:
  - `display: standalone` — app launches without browser chrome
  - `orientation: portrait` — locks to portrait mode
  - `theme_color: #6366F1`, `background_color: #fcfbf8`
  - `192x192` and `512x512` icons

### Apple-specific Metadata
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
- `<link rel="apple-touch-icon">` for 192×192 and 512×512

### Install Prompt
- **`components/pwa-prompt.tsx`** — Listens for `beforeinstallprompt` event, shows floating "Install App" button (bottom-right, fixed position)
- Prompt only appears when the browser fires the event (Chrome on desktop/Android)

### Registration
- **`components/pwa-register.tsx`** — Registers `/sw.js` via `@serwist/window`'s `Serwist` class on page load (client-side only, `useEffect`)

## Icon Requirements

The app ships with **placeholder icons** that must be replaced before production:

| File | Required Size | Current | Status |
|---|---|---|---|
| `public/icon-192x192.png` | 192×192 px, PNG | 1 KB stub | ⚠ Replace |
| `public/icon-512x512.png` | 512×512 px, PNG | 3 KB stub | ⚠ Replace |

**Recommendations:**
- Use `purpose: "any maskable"` — icons should have safe zones (adaptable to device masks)
- Brand color `#6366F1` (indigo) with `#8B5CF6` (violet) accent
- Minimum: 192×192 for Apple touch icon, 512×512 for Play Store / Chrome install
- For the best experience, generate a full icon set: 48×48, 72×72, 96×96, 128×128, 144×144, 152×152, 192×192, 384×384, 512×512

## Installation Instructions

### Build
```bash
# Production build (requires --webpack flag, Serwist needs webpack)
npm run build --webpack

# Build also works via the package script
npm run build
```

The build output:
- `public/sw.js` — Generated service worker (auto-generated, do not edit)
- All Next.js static assets are hash-versioned and added to the SW precache manifest

### Start
```bash
npm run start
```

### Development
```bash
# With webpack (Serwist SW works)
next dev --webpack

# With Turbopack (Serwist SW disabled — set `disable: process.env.NODE_ENV !== "production"`)
next dev
```

### Verification
1. Open DevTools → Application → Manifest — verify manifest loads correctly
2. Open DevTools → Application → Service Workers — verify `/sw.js` is registered and activated
3. Open DevTools → Network — reload page, verify assets are served from `ServiceWorker`
4. Check the "Install App" button appears (Chrome desktop/Android)

## Testing Instructions

### Manual PWA Checks
- [ ] App installs when tapping "Install App" button (Chrome)
- [ ] App launches in standalone mode (no browser URL bar)
- [ ] App loads offline after initial visit (airplane mode test)
- [ ] Apple touch icon works when saving to home screen (iOS Safari)
- [ ] Status bar color matches theme on iOS
- [ ] Splash screen appears on iOS (generated automatically by iOS from the icon)

### Lighthouse Audit
```bash
# Install Lighthouse globally
npm i -g lighthouse

# Run audit on deployed URL
lighthouse https://your-app.vercel.app --view --preset=desktop

# Or use Chrome DevTools → Audits → Lighthouse → PWA category
```

### Build Verification
```bash
# Clear caches and rebuild
Remove-Item -Recurse -Force .next
npm run build

# Verify files
Test-Path public/sw.js                # Should be True
Test-Path public/manifest.json        # Should be True
Test-Path public/icon-192x192.png     # Should be True
Test-Path public/icon-512x512.png     # Should be True
```

## Deployment Requirements

### HTTPS
Service workers **only register on HTTPS** (or `localhost`). Ensure:
- Vercel deployment has HTTPS enabled (automatic)
- No mixed content warnings
- Custom domains have valid SSL certificates

### Vercel (Recommended)
1. Connect GitHub repo to Vercel
2. Add `NEXT_PUBLIC_FIREBASE_*` environment variables in Vercel Dashboard
3. Deploy — `public/sw.js` is part of the build output and served automatically
4. Add Vercel domain to **Firebase Console → Authentication → Settings → Authorized domains**

### Firebase Console
- **Authentication → Sign-in method**: Enable Google + Email/Password providers
- **Authentication → Settings → Authorized domains**: Add your Vercel domain

### Post-Deployment Checklist
- [ ] Verify manifest loads: `https://your-app.vercel.app/manifest.json`
- [ ] Verify SW loads: `https://your-app.vercel.app/sw.js`
- [ ] Run Lighthouse PWA audit — target 90+ score
- [ ] Test install on Chrome Android
- [ ] Test "Add to Home Screen" on iOS Safari
- [ ] Test offline navigation (turn off network, reload)
- [ ] Test app launches from home screen icon

### Important Notes
- `public/sw.js` and `public/swe-worker*` are gitignored (generated at build time)
- Next.js 16 defaults to Turbopack — Serwist requires webpack, so `--webpack` flag is needed
- The build script in `package.json` already includes `--webpack`
- For `next dev` with Turbopack, set `disable: process.env.NODE_ENV !== "production"` in Serwist config to suppress warnings
