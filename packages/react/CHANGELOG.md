# @tourkit/react

## 0.2.0

### Minor Changes

- 4c96fc6: The recorder finds the CLI by itself, and React Native can record too.

  `tourkit record` now answers `GET /status`, and `<TourRecorder />` polls it. Mount the recorder
  once in development and the panel appears when you start the CLI and disappears when you stop it,
  instead of sitting there whether or not anything is listening. Pass `autoShow={false}` for the old
  behaviour, which is what you want for the clipboard flow with no server.

  `tourkit init` now mounts the recorder in the provider it writes, and wraps your root layout in
  `<Tours>` when it can do so unambiguously, printing the diff when it cannot. `--no-wire` opts out.

  The scaffolded provider is `provider.tsx` rather than `Tours.tsx`: a case-insensitive filesystem
  cannot tell `Tours.tsx` from the `tours.ts` beside it, and TypeScript then resolves an import of
  one to the other. It also imports `React` explicitly, so it compiles under the classic JSX
  transform as well as the automatic one.

  `@tourkit/native` ships a `TourRecorder`. It hit-tests taps against mounted `TourTarget`s, so it
  records registered ids only — there are no selectors to fall back to — and finds the machine
  running the CLI through Metro's script URL. `tourkit record --host` binds every interface so a
  physical device can reach it.

  The web recorder also consults the provider registry, so an element registered with
  `useTourTarget` records as that id rather than as a CSS selector.

  Fixes found while integrating this into a real Expo app and a real Next site:

  - `tourkit init` skipped wiring a layout whose only import sat on the first line, reporting it as
    having nowhere to put the import.
  - The web recorder resolved a click inside nested registered targets by registration order. The
    innermost registered ancestor now wins.
  - `tourkit record --host=` with nothing after the equals sign bound to an empty host, and binding
    to every interface now says out loud that anyone on the network can write a tour file.

### Patch Changes

- @tourkit/core@0.2.0

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

- Add the DOM renderer: a portalled overlay with an animated `clip-path` cutout, Floating UI
  positioning with flip and shift, target resolution by registry, `data-tour-id` or CSS selector,
  event-driven tracking through `autoUpdate` and a `MutationObserver`, focus trap with Escape and
  arrow-key navigation, and a `@tourkit/react/unstyled` entry that ships structural styles only.
- Add `@tourkit/ai`: a user's question becomes a tour of the real interface. The client sends only
  the question and the ids of the targets currently on screen; the consumer's own server calls the
  model with the consumer's own key. A step naming a target absent from that manifest is rejected
  on the server and again in the browser, so the model can never point at something that does not
  exist.

  Core: `start()` now accepts a `TourConfig` directly, so a generated tour runs without being
  registered, and exports `TargetDescriptor` and `TargetManifest`.

  Both renderers export `useTargetManifest()`, and `TourTarget` on native takes a `label`.

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @tourkit/core@0.1.0
