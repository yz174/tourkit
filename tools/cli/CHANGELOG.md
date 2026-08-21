# @tourkit/cli

## 0.1.0

### Minor Changes

- Add self-healing targets. A step can carry a `fingerprint` describing the element by tag, text,
  label, role, nearest heading and sibling position. When its selector stops matching, the element
  is found by fingerprint and the tour continues, with one warning naming the step and the stale
  selector.

  Matching is comparison logic in the browser with no model call, and it refuses to choose between
  two equally plausible candidates rather than guessing. `tourkit record` writes a fingerprint for
  every step that fell back to a CSS selector.

- Add the recorder. `npx tourkit record` starts a local server; `<TourRecorder />` rendered in
  development captures the elements you click and writes a normal tour file into your repo. The CLI
  reports which steps fell back to a CSS selector rather than a `data-tour-id`, because those are
  the ones that break on a refactor.

  `--draft` sends the recorded elements to a model to write the titles and bodies, through
  `anthropicDrafter` in `@tourkit/ai/server`. Without it, titles come from each element's label.

- Add `createNavAdapter` and `routeMatches` for cross-route tours, with `exact`, `prefix` and
  `includes` matching. `includes` exists because Expo Router is inconsistent about whether group
  segments appear in `usePathname()`.

  Add `@tourkit/cli`, whose `tourkit init` detects a Next, React, Expo or bare React Native project,
  names the packages to install, and scaffolds a tour config and a provider.

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @tourkit/ai@1.0.0
