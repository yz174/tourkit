# Migrating

## From driver.js

driver.js is imperative and vanilla. tourkit is declarative, so the shape changes, but the concepts
line up. React is not required: `@tourkit/core/dom` runs the same tour in Vue, Angular, Svelte,
Ember, Astro, plain HTML, Electron and Tauri. See [integration](./integration.md).

| driver.js | tourkit |
| --- | --- |
| `driver({ steps })` then `.drive()` | `<TourProvider tours={[tour]}>` then `start(id)` |
| `element` | `target` |
| `popover.title` / `popover.description` | `title` / `body` |
| `popover.side` | `placement` |
| `stagePadding` | `theme.spotlight.padding` or per-step `padding` |
| `stageRadius` | `theme.spotlight.radius` or per-step `radius` |
| `overlayColor` / `overlayOpacity` | `theme.scrim.color` / `theme.scrim.opacity` |
| `disableActiveInteraction: true` | `interaction: "block"` (the default) |
| `advanceOnClick` | `interaction: "advance-on-press"` |
| `waitForElement: 500` | `gateTimeoutMs: 500`, or a `gate` for anything conditional |
| `skipMissingElement` | `onGateTimeout: "skip"` (the default) |
| `smoothScroll` | `scroll: { behavior: "smooth" }` (the default) |
| `onHighlighted` | `onEvent` with `step:enter` |
| `onDestroyed` | `onEvent` with `tour:complete` or `tour:abort` |
| `popoverClass` | the `Card` slot, or `@tourkit/react/unstyled` |

What you gain: the same steps file runs on React Native, steps can be conditional, a tour resumes
where the user left it, and gates can wait on your data rather than a fixed timeout.

What you give up: it is bigger than 5KB.

## From react-joyride

| react-joyride | tourkit |
| --- | --- |
| `<Joyride steps run />` | `<TourProvider tours>` plus `start(id)` |
| `step.target` (selector) | `target`, which also accepts a `data-tour-id` or a registered id |
| `step.content` | `body` |
| `step.placement` | `placement` |
| `step.disableBeacon` | not applicable, there are no beacons |
| `spotlightClicks` | `interaction: "passthrough"` |
| `disableOverlayClose` | the default; the scrim is never a close button |
| `styles` | `theme`, or the `Card` slot |
| `tooltipComponent` | `components.Card` |
| `callback` with `EVENTS` / `STATUS` | `onEvent` |
| `stepIndex` + `run` for control | `useTour()` controls, or `useTourState()` headless |
| `portalElement` | `container` |

Two joyride problems that do not exist here: targets inside scroll containers are tracked through
Floating UI's `autoUpdate`, and the overlay carries a z-index so a modal cannot render on top of
it.

## From react-native-copilot or rn-tourguide

| copilot / tourguide | tourkit |
| --- | --- |
| `<CopilotProvider>` / `<TourGuideProvider>` | `<TourProvider>` |
| `<CopilotStep>` / `<TourGuideZone>` | `<TourTarget>` plus a step in the config |
| step order declared on the wrapper | order declared in the steps array |
| `text` on the wrapper | `title` and `body` on the step |
| `shape="circle"` | `radius: 999`, or `radius: "auto"` to read it from the element |
| `tooltipComponent` | `components.Card` |
| `copilotEvents` / `eventEmitter` | `onEvent` |
| `useCopilot()` / `useTourGuideController()` | `useTour()` |
| `tourKey` for multiple tours | multiple entries in `tours` |

The structural difference: those libraries put the content on the wrapper, so the tour is
scattered across your screens. Here the wrapper only says "this is target `post-ride`" and all
the copy and ordering lives in one file. That file is also what runs on web.

Both of those packages were last published in 2024 and neither is verified against a current Expo
and New Architecture stack.

## From tourkit 0.2.x

Two things changed at 0.3.0: the browser recorder stopped being a React component, and the player
stopped requiring React.

### Removed from `@tourkit/react`

| Removed | Replacement |
| --- | --- |
| `TourRecorder` | The [tourkit skill](./skill.md) injects a recorder script. There is nothing to mount. |
| `TourRecorderProps` | No longer needed. |
| `RecordedStep` | `import type { RecordedStep } from "@tourkit/core/dom"` |
| `Recording` | `import type { Recording } from "@tourkit/core/dom"` |

`cssPath`, `describeElement`, `textOf`, `buildFingerprint` and `buildManifest` are unchanged. They
moved into `@tourkit/core/dom` and `@tourkit/react` still re-exports every one of them, so those
imports keep working.

If you mounted the recorder in development, delete it:

```diff
- import { TourRecorder } from "@tourkit/react";
-
- {process.env.NODE_ENV === "development" ? <TourRecorder name="Driver onboarding" /> : null}
```

Then record with the skill instead. See [recording a tour](./recorder.md).

### `@tourkit/cli` is discontinued

`tourkit init`, `tourkit record` and the codegen moved into the skill. Uninstall the package; the
skill needs no install beyond itself and runs on plain Node.

### React is optional now

`@tourkit/core/dom` runs the same tour with no framework at all:

```ts
import { TourEngine } from "@tourkit/core";
import { mountTour } from "@tourkit/core/dom";

const engine = new TourEngine({ tours: [onboarding], context: {} });
mountTour(engine);
```

Nothing changes for existing React apps. `@tourkit/react` is now a thin wrapper over that same
player, and its public API is unchanged apart from the four names above.

### Behaviour that cannot live in JSON

A recorded tour is written as `.tour.json`, which cannot carry `when`, `gate`, `onEnter` or
`onAdvance` because they are functions. Keep them in a hand-written file and merge them with
`withBehavior`:

```ts
import { withBehavior } from "@tourkit/core";
import { driverOnboarding } from "./driver-onboarding.tour";

export const onboarding = withBehavior(driverOnboarding, {
  billing: { when: (context) => context.plan === "pro" },
  history: { gate: waitForFilter, gateTimeoutMs: 3000 },
});
```

`withBehaviorReport` returns the same config plus `unmatched`, the override keys that matched no
step, so renaming a step id fails loudly instead of quietly dropping its behaviour.
