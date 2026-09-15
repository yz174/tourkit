---
name: tourkit
description: Use when the user wants to record, write, wire up, fix, or review an in-app product tour, walkthrough, onboarding flow, coach marks, or guided steps built with tourkit. Records a tour by clicking through a running app in any web framework (React, Vue, Angular, Svelte, Ember, Astro, Qwik, Solid, plain HTML, Electron, Tauri) or in React Native, writes step copy grounded in the component source, mounts the player, repairs steps whose target moved, and critiques a tour against known anti-patterns. Not for marketing tours, video walkthroughs, or documentation sites.
---

Records and authors tourkit tours in any web framework. No component to mount, no framework lock.

## Setup (non-optional)

Run this first, every session, before any other command:

```bash
node <skill>/scripts/detect.mjs
```

Consume the whole JSON object. It reports the framework, the dev server URL, the HTML entry points, which player package to install, and where tours belong. Every command below assumes you have it.

If `framework` is `monorepo`, re-run with `--cwd <workspace>` pointed at the package that actually serves the UI. If it is `unknown`, ask the user for their dev server URL and their HTML entry point rather than guessing.

## Scripts

Every script is zero-dependency Node and prints exactly one JSON object to stdout. Read the whole object. Never pipe one through `head`, `grep`, or `jq`.

| Script | Purpose |
|---|---|
| `detect.mjs` | Read the project: framework, dev server, HTML entries, player, tour directory |
| `record-server.mjs` | `start` / `stop` the recorder server |
| `inject.mjs` | Put the recorder script tag into an HTML entry, and take it out |
| `poll.mjs` | Block until the browser sends a recording |
| `emit.mjs` | `.tour.json` to its sibling `.tour.ts` |
| `is-generated.mjs` | Is this file build output, and therefore unsafe to edit |
| `recorder-browser.js` | The injected capture bar. Generated; never edit it by hand |

## Commands

| Command | Description | Reference |
|---|---|---|
| `init` | Install the player, scaffold a tour module, mount it in the root component | [reference/init.md](reference/init.md) |
| `record` | Click through the running app and turn that into a tour | [reference/record.md](reference/record.md) |
| `author` | Write or rewrite step copy from the component source | [reference/author.md](reference/author.md) |
| `wire` | Mount the player in a project that already has tour files | [reference/wire.md](reference/wire.md) |
| `heal` | Find steps whose target no longer resolves and fix them | [reference/heal.md](reference/heal.md) |
| `review` | Critique a tour against known anti-patterns | [reference/review.md](reference/review.md) |

### Routing rules

1. **No argument.** Show the table above and ask what they want to do.
2. **First word matches a command.** Load that reference file and follow it. Everything after the command name is the target.
3. **First word matches nothing.** Treat the whole argument as context, run setup, and pick the command that fits. Say which one you picked.

Load one reference file per command. Do not preload them all.

## The laws of tour design

These bind every command. A tour that breaks them is worse than no tour.

**A step points at something the user can see.** If the target is off-screen, inside a collapsed panel, or behind a route the user has not reached, the step needs a `gate` or a `route`, not a bigger spotlight.

**Target by `data-tour-id`, never by CSS selector.** A selector encodes today's markup. The next refactor breaks it silently. When a recording produces a selector target, edit the component to add `data-tour-id` and repoint the step. Say out loud which files you edited.

**Copy says what the user gets, not what the element is.** "Offer a seat and pick who rides with you" beats "Post a ride button". Titles under 6 words, bodies under 20. Read the component before writing either.

**Six steps is a long tour.** Past that, people dismiss. If the flow needs more, it needs two tours with a `gate` between them, or it needs a better empty state instead of a tour.

**Never tour a screen the user has not chosen to be on.** Tours that fire on first paint of a marketing page get closed. Tie the start to an action or a route.

**One tour, one job.** A tour that teaches posting a ride and also billing and also settings teaches none of them.

## Formats

`.tour.json` is canonical and machine-written. It is `TourConfig` minus the four function-valued fields.

`.tour.ts` is generated from it by `emit.mjs`. Never hand-edit a `.tour.ts`; the next `emit` overwrites it.

`when`, `gate`, `onEnter` and `onAdvance` cannot live in JSON. They go in a hand-written module that the emitter never opens:

```ts
// src/tours/index.ts   hand-written, never regenerated
import { withBehavior } from "@tourkit/core";
import { driverOnboarding } from "./driver-onboarding.tour";

export const onboarding = withBehavior(driverOnboarding, {
  billing: { when: (context) => context.plan === "pro" },
  history: { gate: waitForFilter, gateTimeoutMs: 3000 },
});
```

## Players

| Project | Package | Mount |
|---|---|---|
| React, Next, Remix | `@tourkit/react` | `<TourProvider tours={[...]}>` |
| Vue, Angular, Svelte, Ember, Astro, Qwik, Solid, plain HTML, Electron, Tauri | `@tourkit/core/dom` | `mountTour(engine)` |
| React Native, Expo | `@tourkit/native` | `<TourProvider tours={[...]}>` |

`@tourkit/core/dom` needs `@floating-ui/dom` installed alongside it. It is an optional peer of `@tourkit/core`, so nothing installs it for you and a React Native bundle never pulls it in.
