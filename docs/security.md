# Security notes

Security stage: public. The game is a static site with no server, accounts, or secrets.

## Dependency audit

CI runs `pnpm audit` and fails on any advisory. Both advisories below are in build-time tools; neither package is in the built site that players load.

### minimatch (GHSA-g3hv-75wg-m249), fixed

Reached only through eslint. No eslint release uses a patched minimatch yet (eslint 10.14.0 still asks for `^10.2.6`), so `pnpm-workspace.yaml` overrides `minimatch` to `^11.0.1`. Remove the override once eslint depends on minimatch 11 or later.

### deepmerge (GHSA-gcqx-w48m-w2h4), ignored

Reached only through `@sveltejs/vite-plugin-svelte`. Every deepmerge version is affected (`>=4.2.0 <=4.3.1`, and 4.3.1 is the latest), so no patched version exists. The prototype-poisoning risk is in `mergeObject()` on objects the plugin merges from this repository's own Svelte config at build time, which no outside input reaches.

`pnpm-workspace.yaml` ignores this one advisory by its ID under `auditConfig.ignoreGhsas`. Nothing else is ignored, and the audit stays on.

Recheck when deepmerge or the Svelte Vite plugin releases a fix, and remove the ignore then.

## Content security policy and AdSense hosts

Fix before: the next change to the ad setup, and no later than the next periodic audit (the site is already public).

The policy in `index.html` covers the shared ad loader, the AdSense script, and the hosts AdSense and Google's consent message are known to use. Whether AdSense also fetches or frames a host outside that list shows only on a live page with a real ad request, which the browser tests block on purpose (`tests/browser/pwa.spec.js`, "nothing loads from other sites until a game over"). A missing host would leave an ad box empty or the consent message unshown, not open a hole. Check once on the live site with `?adtest=on` at phone size: finish a level, then look for Content Security Policy errors in the console, and add any blocked Google host to the matching directive.
