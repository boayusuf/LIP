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
    <!-- black-translucent, not black. Under "black" iOS keeps the web view out
         of the safe areas, which makes every env(safe-area-inset-*) resolve to
         zero and leaves iOS itself drawing the strips above and below the app.
         Translucent hands the whole screen to the page, so those values become
         real and the layout can reserve the space itself. -->
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="LockInPhase" />
    <meta name="theme-color" content="#171614" />

    <link rel="manifest" href="/manifest.json?v=2" />
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png?v=2" />
    <!-- Versioned: browsers cache favicons far more aggressively than pages,
         so the icon would not change without a new URL. -->
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png?v=2" />

    <style id="pwa-shell">
      /* Match the app canvas so there is no white flash before the bundle
         paints, and no white gap behind a scroll overshoot. */
      html, body, #root { background-color: #0D0C0B; }

      /* Height stays 100%, never 100dvh: dvh once reported more than the
         container actually was, which pushed the tab bar off the bottom. */
      html, body, #root {
        height: 100%;
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

    <script id="pwa-layout-debug">
      // Append ?debug=layout to the URL to overlay the real viewport and inset
      // numbers. Diagnosing this from a screenshot alone does not work.
      if (location.search.indexOf('debug=layout') !== -1) {
        window.addEventListener('load', function () {
          var probe = document.createElement('div');
          probe.style.cssText =
            'position:fixed;visibility:hidden;' +
            'padding-top:env(safe-area-inset-top,0px);' +
            'padding-bottom:env(safe-area-inset-bottom,0px)';
          document.body.appendChild(probe);
          var cs = getComputedStyle(probe);
          var box = document.createElement('pre');
          box.style.cssText =
            'position:fixed;left:0;right:0;bottom:0;z-index:99999;margin:0;' +
            'background:rgba(232,179,60,.95);color:#000;font:11px/1.35 monospace;' +
            'padding:6px;white-space:pre-wrap';
          box.textContent =
            'innerH ' + window.innerHeight +
            '  clientH ' + document.documentElement.clientHeight +
            '  visualH ' + (window.visualViewport ? Math.round(window.visualViewport.height) : 'n/a') +
            '
screenH ' + window.screen.height + '  dpr ' + window.devicePixelRatio +
            '
inset top ' + cs.paddingTop + '  bottom ' + cs.paddingBottom +
            '
standalone ' + (window.navigator.standalone === true) +
            '  rootH ' + (document.getElementById('root') || {}).clientHeight;
          probe.remove();
          document.body.appendChild(box);
        });
      }
    </script>

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
