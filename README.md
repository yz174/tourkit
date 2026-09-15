# tourkit

One app tour, running on web and React Native from the same steps file.

Status: alpha. The `@tourkit` packages are published on npm at 0.2.0. One steps file
drives a browser tour end to end in Chromium and typechecks against the React Native app.

```bash
npm i @tourkit/react                                              # react
npm i @tourkit/core @floating-ui/dom                              # any other web framework
npm i @tourkit/native react-native-svg react-native-reanimated    # react native
```

Recording a tour is an agent skill, not a package. Install it once:

```
/plugin marketplace add yz174/tourkit
/plugin install tourkit@tourkit
```

Docs: <https://tourkit-chi.vercel.app>. The markdown behind the site lives in
[`docs/`](./docs/README.md).

## Packages

| Package | What it is |
| --- | --- |
| `@tourkit/core` | The engine. No React, no DOM, no React Native, zero dependencies. |
| `@tourkit/core/dom` | The framework-free player. Vue, Angular, Svelte, Ember, Astro, plain HTML, Electron, Tauri. Needs `@floating-ui/dom`. |
| `@tourkit/react` | React renderer, with slots for the card, backdrop and progress. Verified in Chromium. |
| `@tourkit/native` | React Native renderer, and the recorder panel for devices. Built, not yet device-verified. |
| `@tourkit/ai` | Optional. Turns a user's question into a tour of the real interface. No live model call verified yet. |
| the tourkit skill | An agent skill, in [`skills/tourkit`](./skills/tourkit). Records, authors, wires, heals and reviews tours in any framework. Replaces `@tourkit/cli`, which is discontinued. |

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
skills/tourkit         the agent skill: record, author, wire, heal, review
.claude-plugin         plugin manifests, so the skill installs from this repo
examples/shared-tour   one steps file, imported by both examples
examples/native-app    a React Native app built on it
examples/docs-samples  every doc snippet, typechecked in CI
docs/                  the documentation
```

MIT.
