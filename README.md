# Balls

A ball sorting puzzle. Tap a tube to pick up its top ball, then tap another tube to drop it on the same color or into an empty tube. Fill every tube with one color to win.

Play at [balls.ihtfy.com](https://balls.ihtfy.com). Install it from the browser menu ("Install app" or "Add to Home Screen") to play offline.

## Features

- **Endless levels** in named chapters of 20. Boards grow from 2 to 14 colors, with boss levels every tenth level, mystery levels that hide balls until they are uncovered, tall five-ball tubes, and tight one-spare-tube boards.
- **Every puzzle is proven solvable.** A solver checks each generated board and sets its par. Finish near par for three stars; beat it for a bonus.
- **Modes:** a daily challenge that is the same for everyone (with streaks and sharing), relaxed Zen puzzles at four difficulties, and 90-second Blitz runs where each solve adds time.
- **Progress:** points, ranks, coins, 27 trophies, stats with a daily calendar, and a daily gift with a seven-day streak.
- **Shop:** 10 themes with animated backgrounds and 9 ball sets (glossy, billiards, neon, gems, marbles, fruit, sports, critters, pastel), plus hints and extra tubes.
- **Helpers:** free undo and restart, hints from the solver, extra tubes, dead-end warnings, stack moves, and color-blind symbols.
- Synthesized sound effects and generative music, vibration, keyboard controls (`1`–`0`, `Z`, `R`, `H`, `Esc`), and a reduced-motion setting.

## Offline play and updates

The service worker precaches every built file, so after the first visit the game loads and plays with no network. Progress is saved in local storage.

An installed copy keeps itself current without a visit to the website: it checks for a new version when it opens, whenever it comes back to the foreground, every hour, and from **Settings → Check for updates**. A new version downloads in the background; the home screen then offers **Update**, so a game in progress is never interrupted. The build adds a content hash of every file to `service-worker.js` (see `vite.config.js`), so any change to the app produces an update.

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
