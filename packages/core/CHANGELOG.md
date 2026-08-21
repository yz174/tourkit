# @tourkit/core

## 0.1.0

### Minor Changes

- Add the React Native renderer: an SVG-masked spotlight that morphs between targets on the UI
  thread, an anchored coach card that flips above or below the target, target measurement through
  `onLayout` plus a Reanimated frame loop, and theme, slot and headless customization.

  Core gains `setOptions` so a renderer can follow prop changes without rebuilding the engine, and
  `TextStyle.fontWeight` is now a literal union so theme text drops straight into a platform style.

- Add self-healing targets. A step can carry a `fingerprint` describing the element by tag, text,
  label, role, nearest heading and sibling position. When its selector stops matching, the element
  is found by fingerprint and the tour continues, with one warning naming the step and the stale
  selector.

  Matching is comparison logic in the browser with no model call, and it refuses to choose between
  two equally plausible candidates rather than guessing. `tourkit record` writes a fingerprint for
  every step that fell back to a CSS selector.

- Add the tour engine: step resolution with `when` predicates, promise-based gates with per-step
  timeout policies, route handling through a nav adapter, theme merging across provider, tour and
  step, resume from persisted progress, and a `useSyncExternalStore`-shaped subscription.
- Add the feature round: progress styles, auto contrast, an attention ring, blur, popover alignment,
  a dismissible flag, web class hooks, and web hints.

  `theme.progress.style` takes `dots`, `segmented`, `numbers` or `continuous`, with `activeColor` and
  `restColor` falling back to the accent. `text.contrast: "auto"` derives the title and body colours
  from the card background by contrast ratio rather than a luminance threshold, so a mid-tone card
  gets whichever text actually reads better. `theme.ring` draws a breathing outline around the hole,
  off by default and disabled under reduced motion. `theme.blur` uses `backdrop-filter` on web. On React Native,
  `createBlurBackdrop({ MaskedView, BlurView })` takes the two modules from the consumer and returns a
  backdrop slot; enabling blur without mounting it keeps the dim scrim and logs one warning naming
  what to install, rather than rendering nothing.

  Steps gain `align` for placing the card along a target's edge on both platforms, and `dismissible`,
  which stops Escape ending a tour and tells a custom card to hide its skip control. A tour can set it
  for every step.

  Web gains stable `tourkit-*` classes on every element plus a `classNames` provider prop, and
  `<TourHint />`: standalone pulsing markers that open a popover on click, coordinate so only one is
  open at a time, and remember their dismissal through the provider's storage adapter.

- Add per-step interaction policy (`block`, `passthrough`, `advance-on-press`) and honour the
  per-step `scroll` option on both renderers, with `scrollRef` on native for scrolling a target
  into view. Move screen-reader focus to the card on every native step change.

  The overlay now sits at `theme.zIndex`, defaulting to 10000. Without it any positioned element
  with a z-index above 0, such as a modal or a sticky header, rendered on top of the scrim and
  stayed clickable during a tour.

- Add `createNavAdapter` and `routeMatches` for cross-route tours, with `exact`, `prefix` and
  `includes` matching. `includes` exists because Expo Router is inconsistent about whether group
  segments appear in `usePathname()`.

  Add `@tourkit/cli`, whose `tourkit init` detects a Next, React, Expo or bare React Native project,
  names the packages to install, and scaffolds a tour config and a provider.

- Add `@tourkit/ai`: a user's question becomes a tour of the real interface. The client sends only
  the question and the ids of the targets currently on screen; the consumer's own server calls the
  model with the consumer's own key. A step naming a target absent from that manifest is rejected
  on the server and again in the browser, so the model can never point at something that does not
  exist.

  Core: `start()` now accepts a `TourConfig` directly, so a generated tour runs without being
  registered, and exports `TargetDescriptor` and `TargetManifest`.

  Both renderers export `useTargetManifest()`, and `TourTarget` on native takes a `label`.

### Patch Changes

- Scaffold the package: dual ESM and CJS build with type declarations, and the epsilon-based
  `rectsEqual` helper used to suppress no-op rect writes.
