# @tourkit/cli

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
