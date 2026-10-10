/**
 * Injects the PWA head tags into the exported web shell.
 *
 * `web.output` is "single", so Expo renders its own SPA index.html and never
 * consults app/+html.tsx (that hook only runs for static output). Rather than
 * switch the whole app to static rendering just to control six meta tags, we
 * patch the one file Expo produces.
 *
 * Runs after `expo export --platform web`, locally and on Vercel. Idempotent.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const INDEX = join(process.cwd(), 'dist', 'index.html');
const MARKER = 'data-pwa-head';

if (!existsSync(INDEX)) {
  console.error('inject-pwa-head: dist/index.html not found - did the export run?');
  process.exit(1);
}

let html = readFileSync(INDEX, 'utf8');

if (html.includes(MARKER)) {
  console.log('inject-pwa-head: already injected, nothing to do');
  process.exit(0);
}

const head = `
    <meta ${MARKER} name="description" content="Accountability and focus, tracked with the people you answer to." />

    <!-- Launch fullscreen from the home screen, with no Safari chrome. -->
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <meta name="apple-mobile-web-app-title" content="LockInPhase" />
    <meta name="theme-color" content="#0D0C0B" />

    <link rel="manifest" href="/manifest.json?v=2" />
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png?v=2" />
    <!-- Versioned: browsers cache favicons far more aggressively than pages,
         so the icon would not change without a new URL. -->
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png?v=2" />

    <style id="pwa-shell">
      /* Match the app canvas so there is no white flash before the bundle
         paints, and no white gap behind a scroll overshoot. */
      html, body, #root { background-color: #0D0C0B; }

      /* Height must stay 100%, NOT 100dvh.
         With apple-mobile-web-app-status-bar-style: black, iOS places the web
         view below the status bar, so the usable height is the screen minus
         that bar. dvh reports the whole screen, which made the app overflow by
         exactly the status bar height and clipped the tab bar labels off the
         bottom. 100% resolves against the real container. */
      html, body, #root {
        height: 100%;
      }

      /* Keep the tab bar clear of the home indicator. react-native-safe-area-
         context reports a zero bottom inset in this standalone web build, so
         the reservation is made here instead. The colour matches the tab bar so
         the reserved strip reads as part of it rather than a band beneath it. */
      #root {
        box-sizing: border-box;
        padding-bottom: env(safe-area-inset-bottom, 0px);
        background-color: #171614;
      }

      body {
        /* No rubber-band bounce past the top or bottom of the page. */
        overscroll-behavior: none;
        /* No grey flash when tapping a control. */
        -webkit-tap-highlight-color: transparent;
        /* No long-press callout, and no text selection while dragging a list. */
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
        /* Drops the 300ms tap delay and suppresses double-tap-to-zoom. */
        touch-action: manipulation;
      }

      /* Inputs opt back in to selection. */
      input, textarea, [contenteditable="true"] {
        -webkit-user-select: text;
        user-select: text;
      }
    </style>

    <script id="pwa-gestures">
      // Safari ignores user-scalable=no in a normal tab, so pinch-zoom is
      // blocked here too. The meta tag covers the installed standalone app;
      // this covers the browser.
      document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
      document.addEventListener('gesturechange', function (e) { e.preventDefault(); });
      document.addEventListener('gestureend', function (e) { e.preventDefault(); });
    </script>
`;

// Expo ships a viewport without zoom limits or notch handling; replace it.
const VIEWPORT =
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />';

const viewportRe = /<meta\s+name="viewport"[^>]*>/i;
if (viewportRe.test(html)) {
  html = html.replace(viewportRe, VIEWPORT);
} else {
  console.warn('inject-pwa-head: no viewport meta found, appending one');
  html = html.replace('</head>', `    ${VIEWPORT}\n</head>`);
}

html = html.replace('</head>', `${head}  </head>`);

writeFileSync(INDEX, html, 'utf8');
console.log('inject-pwa-head: head tags injected into dist/index.html');
