# Balls

A ball sorting puzzle. Tap a tube to pick up its top ball, then tap another tube to drop it on the same color or into an empty tube. Fill every tube with one color to win.

Play at [balls.ihtfy.com](https://balls.ihtfy.com). Install it from the browser menu ("Install app" or "Add to Home Screen") to play offline.

## Features

- **Endless levels** in named chapters of 20. Boards grow from 2 to 14 colors, with boss levels every tenth level, mystery levels that hide balls until they are uncovered, tall five-ball tubes, and tight one-spare-tube boards.
- **Every puzzle is proven solvable.** A solver checks each generated board and sets its par. Finish near par for three stars; beat it for a bonus.
- **Modes:** a daily challenge that is the same for everyone (with streaks and sharing), relaxed Zen puzzles at four difficulties, and 90-second Blitz runs where each solve adds time.
- **Progress:** points, ranks, coins, 30 trophies, stats with a daily calendar, and a daily gift with a seven-day streak.
- **Shop:** 10 themes with animated backgrounds and 9 ball sets (glossy, billiards, neon, gems, marbles, fruit, sports, critters, pastel), plus hints and extra tubes.
- **Helpers:** free undo and restart, hints from the solver, extra tubes, dead-end warnings, stack moves, color-blind symbols, highlighted target tubes, and optional settings that drop a ball with only one place to go and play out the last matching moves.
- Synthesized sound effects and generative music, vibration, keyboard controls (`1`–`0`, `Z`, `R`, `H`, `Esc`), a reduced-motion setting, and an Android back button that steps back through the app.

## Offline play and updates

The service worker precaches every built file, so after the first visit the game loads and plays with no network. Progress is saved in local storage.

An installed copy keeps itself current without a visit to the website: it checks for a new version when it opens, whenever it comes back to the foreground, every hour, and from **Settings → Check for updates**. A new version downloads in the background; the home screen then offers **Update**, so a game in progress is never interrupted. The build adds a content hash of every file to `service-worker.js` (see `vite.config.js`), so any change to the app produces an update.

## Ads

The result dialog (after a solved level, daily challenge, or Zen puzzle, and at the end of a Blitz run) shows one 300×250 ad below its buttons, labeled "Advertisements", with a link to the [privacy page](https://ihtfy.com/privacy). On a window at least 700 px tall, the play screen also shows one ad beside the puzzle, 150 px past its controls: 300×600 from 1566 px wide, 160×600 from 1426 px (`PLAY_AD_SIZES` in `src/lib/ads.js`). It sits in the layout, so the puzzle keeps its size, and dialogs and confetti stop 150 px short of it. That ad changes only when a game starts at least a minute after the last one was requested, or when the window crosses into another size; never on a timer. Ad-free buyers get neither box. Nothing ad-related loads before the first result, or with the ad beside the puzzle, before the first tap or key press: `src/lib/ads.js` then loads the shared IHTFY loader (`https://ihtfy.com/ads/v1.js`, source in the IHTFY/com.ihtfy repository), which loads Google AdSense and asks for one ad per game over and per new key beside the puzzle. Offline, or when the loader fails, the box stays empty. The service worker only handles this site's own files, so ad and consent requests always go to the network. Any host other than `ihtfy.com` (local builds, previews) gets test ads.

### Content Security Policy

The policy is a `<meta>` tag in `index.html`, since GitHub Pages can't set headers, so it can't use the nonce-based policy Google recommends and lists hosts instead. Google publishes no host list, and creatives vary from ad to ad, so a host Google starts using is blocked silently and that ad doesn't show. Check the browser console for `Content Security Policy` errors on the result screen, and on the play screen in a wide window, after a change.

| Directive     | Allows                                                                                                                                                  | Why                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `script-src`  | `ihtfy.com/ads/`, `pagead2.googlesyndication.com`, `tpc.googlesyndication.com`, `ep2.adtrafficquality.google`, `fundingchoicesmessages.google.com`      | The loader, AdSense, AdSense's ad-quality script, and the consent message                                                                                     |
| `connect-src` | `pagead2.googlesyndication.com`, `googleads.g.doubleclick.net`, `ep1.adtrafficquality.google`, `fundingchoicesmessages.google.com`                      | AdSense and consent-message requests                                                                                                                          |
| `frame-src`   | `googleads.g.doubleclick.net`, `ep2.adtrafficquality.google`, `www.google.com`                                                                          | The ad and AdSense's helper frames                                                                                                                            |
| `img-src`     | `pagead2.googlesyndication.com`, `tpc.googlesyndication.com`, `ep1.adtrafficquality.google`, `ep2.adtrafficquality.google`, `lh3.googleusercontent.com` | AdSense pixels; the consent message's site logo                                                                                                               |
| `style-src`   | `fonts.googleapis.com`                                                                                                                                  | The consent message's fonts (`'unsafe-inline'` is unchanged and needed: without it the consent message renders under the result dialog and can't be answered) |
| `font-src`    | `fonts.gstatic.com`                                                                                                                                     | The consent message's fonts                                                                                                                                   |

`frame-src` replaces the old `'none'`. Everything else stays `'self'`.

## Development

Use Node.js 24 and pnpm 12.8.1 (pinned in `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm dev          # http://localhost:5420
```

`pnpm icons` regenerates the app icons in `public/icons` with Playwright.

## Checks

```sh
pnpm check        # types
pnpm lint         # Prettier and ESLint
pnpm test         # rules, solver, generator, scoring, saves, layout
pnpm build
pnpm exec playwright install chromium firefox webkit
pnpm test:browser # plays the built game on port 4273
```

Unit tests compare the solver with an exhaustive search on small boards and check that generated levels are deterministic and solvable. Browser tests play through levels, blitz, the daily challenge, the shop, and saved-game recovery in Chromium, Firefox, and WebKit; check offline play in Chromium and Firefox (Playwright cannot emulate offline service workers in WebKit); and check that an installed copy finds and applies a new version in Chromium.

## Deploy

Pushing to `master` runs the Checks workflow, which publishes the build to GitHub Pages after every check passes. Pull requests run the checks without deploying. The repository's Pages source must be set to **GitHub Actions**.
