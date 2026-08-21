# @tourkit/ai

## 0.1.0

### Minor Changes

- Add the recorder. `npx tourkit record` starts a local server; `<TourRecorder />` rendered in
  development captures the elements you click and writes a normal tour file into your repo. The CLI
  reports which steps fell back to a CSS selector rather than a `data-tour-id`, because those are
  the ones that break on a refactor.

  `--draft` sends the recorded elements to a model to write the titles and bodies, through
  `anthropicDrafter` in `@tourkit/ai/server`. Without it, titles come from each element's label.

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
