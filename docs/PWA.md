# Install Bay Studies (PWA)

Bay Studies is a Progressive Web App. You can add it to your phone’s home screen for one-tap access — no App Store / Play Store required.

Theme / brand color: `#5F6F52` (sage).

## iPhone (Safari)

1. Open the site in **Safari** (Chrome on iOS cannot Add to Home Screen the same way).
2. Tap the **Share** button (square with an arrow).
3. Scroll and tap **Add to Home Screen**.
4. Confirm the name **Bay Studies** → **Add**.

Notes:
- Use your deployed **HTTPS** URL for a real phone test (service worker + install criteria need a secure context; `localhost` works on desktop Chrome, not on a physical iPhone).
- The in-app tip explains Share → Add to Home Screen and can be dismissed (saved in `localStorage`).

## Android (Chrome)

1. Open the site in **Chrome**.
2. Either:
   - Tap the **Install** button in the Bay Studies tip banner, or
   - Use Chrome’s menu (**⋮**) → **Install app** / **Add to Home Screen**.
3. Confirm. The app opens in standalone mode (no browser chrome).

## Desktop Chrome (local test)

```bash
npm run build && npm start
# open http://localhost:3000
```

DevTools → **Application** → **Manifest** / **Service Workers** to verify. Chromium treats `localhost` as a secure origin, so install UI can appear on desktop too.

During `next dev`, the service worker is **not** registered (avoids HMR weirdness). To force it in development:

```bash
NEXT_PUBLIC_ENABLE_SW=1 npm run dev
```

## What’s included

| Asset / piece | Path |
|---------------|------|
| Web app manifest | `public/manifest.webmanifest` |
| Icons 192 / 512 / maskable / apple-touch | `public/icon-*.png`, `public/apple-touch-icon.png` |
| Service worker | `public/sw.js` |
| Registration | `src/components/ServiceWorkerRegister.tsx` |
| Install tip UI | `src/components/InstallPrompt.tsx` (via `AppShell`) |

## Out of scope (later)

- Real **push notifications** (Web Push + VAPID keys) — not wired yet; in-app toast / alerts remain localStorage-based.
- Store listing / TWA packaging.
