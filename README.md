# tourkit

One app tour, running on web and React Native from the same steps file.

Status: pre-alpha, feature complete against the plan. One steps file drives a browser tour end to
end in Chromium and typechecks against the React Native app.

Not done, and none of it is implementation: nothing is published (the `@tourkit` npm scope does
not exist yet), the React Native renderer has never run on a device, no live model call has been
made, the docs exist as markdown without a site, and only Chromium has been tested. `FINDINGS.md`
has one entry per milestone with what was verified, what was not, and every trap that cost time.

Docs live in [`docs/`](./docs/README.md).

## Packages

| Package | What it is |
| --- | --- |
| `@tourkit/core` | The engine. No React, no DOM, no React Native, no dependencies. |
| `@tourkit/react` | DOM renderer, plus the recorder overlay. Verified in Chromium. |
| `@tourkit/native` | React Native renderer. Built, not yet device-verified. |
| `@tourkit/ai` | Optional. Turns a question into a tour, and drafts recorded tour copy. No live model call verified yet. |
| `@tourkit/cli` | Dev tool. `tourkit init` scaffolds a tour; `tourkit record` writes one from clicks, paired with the `TourRecorder` from the renderer package. |

## Development

```bash
bun install
bun run lint          # biome
bun run check:peers   # publishable peer ranges and no workspace protocol
bun run typecheck     # builds first, then tsc across packages
bun test              # engine and pure renderer logic
bun run test:dom      # vitest + happy-dom, React behaviour
bun run test:e2e      # playwright, real Chromium layout
bun run build
```

## Layout

```
packages/core          the engine: no React, no DOM, no React Native, no dependencies
packages/react         DOM renderer, plus a /unstyled entry
packages/native        React Native renderer
packages/ai            optional: a question becomes a tour
tools/cli              tourkit init, tourkit record
examples/shared-tour   one steps file, imported by both examples
examples/native-app    a React Native app built on it
examples/docs-samples  every doc snippet, typechecked in CI
docs/                  the documentation
```

MIT.
