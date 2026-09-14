# API reference

Every public export, by package. The pages linked from each table explain when to reach for a
thing; this page exists so you can tell whether it exists at all.

Most apps use eight of these: `TourProvider`, `TourTarget` or `data-tour-id`, `useTour`,
`TourConfig`, `TourStep`, `createNavAdapter`, `readRecord` and `clearRecord`. The rest are there
for custom renderers, tooling and tests.

## Entry points

| Import path | Contains |
| --- | --- |
| `@tourkit/core` | The engine and the types. No React, no DOM, no dependencies. |
| `@tourkit/react` | The DOM renderer, the hooks, the recorder. |
| `@tourkit/react/unstyled` | The same, with `styled={false}` applied. See [Customization](./customization.md#web-unstyled-mode). |
| `@tourkit/native` | The React Native renderer. |
| `@tourkit/ai` | The client half of question-to-tour. Safe in a browser bundle. |
| `@tourkit/ai/server` | The server half. Holds your model key. |

`@tourkit/react` and `@tourkit/native` re-export the engine, the persistence helpers, the theme
and contrast helpers, the resolver helpers and every type, so an app that is not writing its own
renderer never needs to depend on `@tourkit/core` directly.

## @tourkit/core

### Engine

| Export | Signature | Notes |
| --- | --- | --- |
| `TourEngine` | `new TourEngine<Ctx>(options: EngineOptions<Ctx>)` | The whole state machine. `TourProvider` creates one for you. Build one directly only for a renderer of your own. |
| `EngineOptions<Ctx>` | `{ tours, context, theme?, storage?, nav?, onEvent? }` | |
| `EngineSnapshot<Ctx>` | `{ status, tourId, stepIndex, step, steps, total, activeTarget, rects, theme, dismissible, refreshToken, isFirst, isLast, hasNext, hasPrev }` | Immutable. A new object on every change, which is what `useSyncExternalStore` needs. The four flags count visible steps only. |
| `StartOptions` | `{ at?: number \| string }` | A step index or step id to open at. |

Methods on `TourEngine`:

| Method | Signature | Behaviour |
| --- | --- | --- |
| `subscribe` | `(listener: () => void) => () => void` | Returns the unsubscribe function. |
| `getSnapshot` | `() => EngineSnapshot<Ctx>` | Bound, so it can be passed by reference. |
| `setContext` | `(context: Ctx) => void` | Re-filters `when` predicates immediately, including mid-tour. |
| `setOptions` | `(patch: Partial<Omit<EngineOptions<Ctx>, "context">>) => void` | Everything except context can change while a tour runs. |
| `start` | `(tour: string \| TourConfig<Ctx>, options?: StartOptions) => Promise<void>` | An id starts a registered tour. A config object starts an ad-hoc one that is never registered. `{ at }` opens at a step and takes precedence over a saved resume position. |
| `stop` | `() => Promise<void>` | Records the outcome as `skipped`. |
| `advance` | `() => Promise<void>` | Runs `onAdvance`, then moves on. Ignored unless the status is `active`. |
| `back` | `() => Promise<void>` | Ignored on the first step. |
| `skip` | `() => Promise<void>` | Moves on without running `onAdvance`. Never blocked by a veto hook. |
| `moveTo` | `(index: number) => Promise<void>` | Jumps to a visible step by position. Emits `step:exit` and `step:enter`, and does not run `onAdvance`. |
| `show` | `(stepId: string) => Promise<void>` | The same, addressed by id. |
| `getById` | `(stepId: string) => TourStep<Ctx> \| null` | Visible steps only, so a step hidden by `when` reads as `null`. |
| `getNextStep` | `() => TourStep<Ctx> \| null` | |
| `getPreviousStep` | `() => TourStep<Ctx> \| null` | |
| `onStep` | `(stepId: string, handler: StepEventHandler) => () => void` | Subscribes to one step's `before-show`, `show`, `before-hide`, `hide`. Returns the unsubscribe function. A handler that throws is swallowed. |
| `isOpen` | `(stepId: string) => boolean` | True only while that step is active. |
| `whenShown` | `(stepId: string) => Promise<boolean>` | Resolves true when the step is on screen, false when the run ends without it. |
| `refresh` | `() => void` | Bumps `refreshToken` on the snapshot. The renderers watch it and remeasure. |
| `setRect` | `(target: string, rect: Rect) => void` | How a renderer reports a measurement. Ignored when the rect has not moved by half a pixel. |
| `clearRect` | `(target: string) => void` | |

### Persistence

| Export | Signature |
| --- | --- |
| `storageKey` | `<Ctx>(config: TourConfig<Ctx>) => string`, returning `tour:{id}:v{version}` |
| `readRecord` | `<Ctx>(storage, config) => Promise<PersistedTour \| null>` |
| `writeRecord` | `<Ctx>(storage, config, record: PersistedTour) => Promise<void>` |
| `clearRecord` | `<Ctx>(storage, config) => Promise<void>` |

All four accept `undefined` for `storage` and all four swallow storage errors, so a browser in
private mode or a full quota never throws into your app. A malformed record reads back as `null`.

### Navigation

| Export | Signature |
| --- | --- |
| `createNavAdapter` | `({ pathname, navigate, match? }: NavAdapterOptions) => NavAdapter` |
| `routeMatches` | `(pathname: string, route: string, match: RouteMatch) => boolean` |
| `RouteMatch` | `"exact" \| "prefix" \| "includes"`, defaulting to `"exact"` |

All three strategies ignore case, a trailing slash, a query string and a hash. See
[Navigation](./navigation.md#matching).

### Theme

| Export | Signature |
| --- | --- |
| `defaultTheme` | `Theme`. Every token, fully resolved. |
| `mergeTheme` | `(...overrides: (ThemeOverride \| undefined)[]) => Theme`. Key-by-key, left to right. |

Types: `Theme`, `ThemeOverride`, `TextStyle`, `FontWeight`, `ProgressStyle`, `TextContrast`. Every
token is listed in the [Theme reference](./theme.md).

### Geometry helpers

| Export | Signature |
| --- | --- |
| `resolveCorners` | `(radius: Radius, width: number, height: number) => [number, number, number, number]`, clamped, in path order: top-left, top-right, bottom-right, bottom-left |
| `resolveScrimPress` | `(press: ScrimPress \| undefined, dismissible: boolean) => ScrimPress`. Downgrades `"close"` to `"none"` when the step may not be dismissed. |
| `padRadius` | `(radius: Radius, padding: number) => Radius`. Grows a radius to match a hole padded outwards by the same amount. |
| `formatProgress` | `(template: string, index: number, total: number) => string`. Fills `{{current}}` (one-based) and `{{total}}`. |
| `Radius` | `number \| Corners` |
| `Corners` | `{ topLeft?, topRight?, bottomRight?, bottomLeft? }` |

### Buttons

| Export | Signature |
| --- | --- |
| `resolveButtons` | `<Ctx>(step: TourStep<Ctx> \| null \| undefined, dismissible?: boolean) => ResolvedButtons` |
| `StepButtons` | `{ next?, back?, close?, nextDisabled?, backDisabled?, nextLabel?, backLabel?, doneLabel?, closeLabel? }`, the shape of `TourStep.buttons` |
| `ResolvedButtons` | The same with every field filled in, plus `advanceLabel(isLast)` |

Both renderers call this, which is what keeps the web and React Native cards showing the same
controls. A custom `Card` slot can call it too rather than reading `step.buttons` by hand.
Passing `dismissible: false` suppresses the close button.

### Contrast

| Export | Signature | Notes |
| --- | --- | --- |
| `luminance` | `(color: string) => number \| null` | `null` for anything that is not a hex or `rgb()` string. |
| `contrastRatio` | `(a: string, b: string) => number \| null` | WCAG ratio, 1 to 21. |
| `isDark` | `(color: string) => boolean` | Luminance below 0.45. An unparseable colour is treated as light. |

These back `text.contrast: "auto"`. They are exported because a custom card needs the same
answers.

### Step resolution

| Export | Signature |
| --- | --- |
| `visibleSteps` | `<Ctx>(config: TourConfig<Ctx>, context: Ctx) => TourStep<Ctx>[]` |
| `stepAt` | `<Ctx>(steps: TourStep<Ctx>[], index: number) => TourStep<Ctx> \| null` |
| `indexOfStep` | `<Ctx>(steps: TourStep<Ctx>[], stepId: string) => number` |

### Geometry

| Export | Signature |
| --- | --- |
| `Rect` | `{ x: number; y: number; width: number; height: number }` |
| `rectsEqual` | `(a: Rect \| null, b: Rect \| null, epsilon = 0.5) => boolean` |

### Types

`Align`, `EventHandler`, `Fingerprint`, `GateArgs`, `GateTimeoutPolicy`, `Interaction`,
`NavAdapter`, `PersistedTour`, `Placement`, `ScrollOptions`, `StorageAdapter`,
`ScrimPress`, `StepEventHandler`, `StepEventName`, `StepInfo`, `TargetDescriptor`, `TargetManifest`, `TourConfig`, `TourEvent`, `TourEventName`,
`TourOutcome`, `TourStatus`, `TourStep`.

`TourConfig` and `TourStep` are documented field by field in the
[Step reference](./steps.md). The four small ones:

```ts
type StorageAdapter = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

type NavAdapter = {
  getRoute(): string;
  matches(route: string): boolean;
  navigate(route: string): void | Promise<void>;
};

type TourEvent = { tourId: string; stepId: string | null; stepIndex: number; total: number };

// The second argument to onEnter, onAdvance and the three onBefore hooks.
type StepInfo = { index: number; total: number; stepId: string; tourId: string };

type PersistedTour = { outcome: TourOutcome; stepId: string; updatedAt: number };
```

## @tourkit/react

### Components

| Export | Notes |
| --- | --- |
| `TourProvider` | Mount once at the root. Props in the [Provider reference](./provider.md). |
| `TourHost` | The overlay. `TourProvider` renders it after `children`; you never mount it yourself. |
| `TourHint` | A standalone dot with a popover, independent of any tour. See [Hints](./hints.md). |
| `TourRecorder` | The recorder panel. See [Recording a tour](./recorder.md). |
| `CoachCard`, `Overlay`, `ProgressDots` | The three default slots, exported so a custom slot can wrap one rather than replace it. |

```ts
type TourRecorderProps = {
  name?: string;              // "recorded". Becomes the generated file name.
  endpoint?: string;          // "http://127.0.0.1:5178/record"
  autoShow?: boolean;         // true. Hides the panel unless `tourkit record` answers.
  onFinish?: (recording: Recording) => void;
};
```

### Hooks

| Hook | Returns |
| --- | --- |
| `useTour()` | `{ running, start, stop, next, prev, skip, moveTo, show, refresh }`. The controls, with no re-render on step changes. `running` is a boolean, so it only re-renders when the tour starts or ends. |
| `useTourState()` | The whole snapshot plus `rect`, `next`, `prev`, `skip`, `stop`. The headless path. |
| `useTourSnapshot()` | `EngineSnapshot<Ctx>`. Re-renders on every engine change. |
| `useTourSelector(select)` | `T`. Re-renders only when the selected value changes. |
| `useTourTarget(id)` | A ref to attach to an element, registering it under `id`. The alternative to `data-tour-id`. |
| `useTargetManifest()` | `() => TargetManifest`. Every registered target plus every `data-tour-id` in the document, with labels. Feeds `@tourkit/ai`. |
| `useTourContext()` | `{ engine, components, registry, container, styled, classNames, storage, openHint, setOpenHint }`. Throws outside a provider. |
| `useEngine()` | The `TourEngine` itself. |

`useTourSelector` reads through a callback, so wrap the selector in `useCallback` or define it
outside the component. An inline arrow re-subscribes on every render.

### Storage

| Export | Notes |
| --- | --- |
| `browserStorage()` | `localStorage` behind try/catch and an optional-chained global. The provider's default on web. |
| `memoryStorage()` | A `Map`. Use it in tests so one case cannot leak into the next. |

### DOM utilities

| Export | Signature |
| --- | --- |
| `resolveTarget` | `(target: string, registry: Map<string, Element>) => Element \| null` |
| `resolveWithFingerprint` | `(target, registry, fingerprint?) => { element: Element \| null; healed: boolean }` |
| `scrollSettings` | `(scroll: boolean \| ScrollOptions \| undefined) => { enabled, block, behavior }` |
| `scrollIntoViewIfNeeded` | `(element, block, behavior) => void`. A no-op when the element is already fully in view. |
| `toFloatingPlacement` | `(placement: Placement, align?: Align) => Placement` in Floating UI's vocabulary |
| `holesPathData` | `(vw, vh, holes: Hole[]) => string`. One viewport rectangle then a subpath per hole, for `extraTargets`. Zero-sized holes are dropped. |
| `holesClipPath` | The same, wrapped as a CSS `clip-path`. |
| `Hole` | `{ x, y, width, height, radius: Radius }` |
| `holePathData` | `(vw, vh, x, y, width, height, radius: Radius) => string`. An SVG path: the viewport rectangle, then the rounded hole. `radius` takes a number or a `Corners` object. |
| `holeClipPath` | The same wrapped as `path(evenodd, "...")`, ready for a CSS `clip-path`. |
| `nextFocusTarget` | `(container: HTMLElement, active: Element \| null, backwards: boolean) => HTMLElement \| null`. The focus trap's cycle. |

`resolveTarget` tries three things in order: an id registered through `useTourTarget`, a
`data-tour-id` attribute, then the string as a CSS selector. An invalid selector returns `null`
rather than throwing.

### Fingerprints

| Export | Signature |
| --- | --- |
| `buildFingerprint` | `(element: Element) => Fingerprint` |
| `healTarget` | `(fingerprint: Fingerprint, root?: Document) => Element \| null` |
| `scoreCandidate` | `(element: Element, fingerprint: Fingerprint) => number` |
| `nearestHeading` | `(element: Element) => string \| undefined` |

The scoring rules and the tie-breaking are in [When a target breaks](./self-healing.md).

### Recorder internals

| Export | Signature |
| --- | --- |
| `describeElement` | `(element, route?, registry?) => RecordedStep` |
| `cssPath` | `(element: Element, root?: Document) => string`. Prefers `data-testid`, then a stable `id`, then the shortest unique ancestor chain, capped at six segments. |
| `textOf` | `(element: Element) => string \| undefined`. Trimmed, collapsed, capped at 120 characters. |
| `RecordedStep`, `Recording` | The wire format `tourkit record` consumes. |

### Slot types

`CardProps`, `BackdropProps`, `ProgressProps`, `Slots`, `CardPlacement`, `ClassNames`,
`ScrollHandler`. They are shown in use in
[Customization](./customization.md#level-2-component-slots).

## @tourkit/native

Everything in `@tourkit/react` that is not DOM-specific has a counterpart here, with the same
name and the same meaning. What is different:

| Export | Notes |
| --- | --- |
| `TourTarget` | `{ id, children, radius?, padding?, label?, style? }`. Wraps the element instead of tagging it. |
| `createStorageAdapter(store)` | Turns anything with `getItem` / `setItem` / `removeItem` into a `StorageAdapter`. AsyncStorage fits as-is. |
| `createMemoryStorage()` | The native `memoryStorage`. |
| `createBlurBackdrop({ MaskedView, BlurView })` | You pass the modules; the package never imports them. See [Customization](./customization.md#blur). |
| `Spotlight`, `CoachCard`, `ProgressDots`, `TouchShield` | The default slots. |
| `useTargetMeasure` | The Reanimated frame-callback measurement behind `TourTarget`. |

`SpotlightGeometry` now carries four animated corner values: `radius` (top-left, kept under that
name so an existing custom spotlight keeps working), `radiusTopRight`, `radiusBottomRight` and
`radiusBottomLeft`.

`holesMaskPath(screenWidth, screenHeight, holes: MaskHole[])` is the native counterpart of
`holesPathData`, for steps using `extraTargets`.

Geometry and layout helpers, all pure and all tested: `holeMaskPath`, `resolvePlacement`,
`cardWidthFor`, `shieldRegions`, `padRect`, `resolvePadding`, `resolveRadius`, `scrollOffsetFor`,
`scrollSettings`, `pickTarget`.

Recorder endpoint helpers: `RECORD_PORT` (5178), `defaultRecordEndpoint`, `hostFromScriptUrl`,
`statusUrl`.

Native-only types: `Insets`, `ScrollHost`, `TargetNode`, `TargetGeometry`, `SpotlightGeometry`.

There is no `TourHint` on React Native, and no `resolveTarget`: `target` is a `TourTarget` id and
nothing else, because there is no document to query.

## @tourkit/ai

Client half. Contains no key handling.

| Export | Signature |
| --- | --- |
| `useTourkitAsk` | `({ endpoint, getManifest, onTour?, fetchImpl? }) => { ask, reset, status, tour, error }` |
| `askTourkit` | `({ endpoint, question, manifest, signal?, fetchImpl?, tourId? }) => Promise<ValidationResult>`. The hook without React. |
| `cacheKey` | `(question: string, manifest: TargetManifest) => string`. The question, lowercased, plus the sorted target ids. |
| `validateGenerated` | `(raw: unknown, manifest, tourId?) => ValidationResult`. The second of the two checks. |
| `GENERATED_TOUR_ID` | `"tourkit-generated"`. The id a generated tour carries unless you pass `tourId`. |
| `AskStatus` | `"idle" \| "asking" \| "ready" \| "failed"` |

`ValidationResult` is a discriminated union, so a failure is not an exception:

```ts
type ValidationSuccess = { ok: true; tour: TourConfig<unknown> };
type ValidationFailure = {
  ok: false;
  reason: "malformed" | "unknown-target" | "empty";
  detail: string;
};
```

A network error, a non-2xx response and unparseable JSON all come back as `malformed`, so the
client never throws at a call site that is rendering a help box.

Schemas, exported so you can validate elsewhere: `askRequestSchema`, `generatedTourSchema`,
`generatedStepSchema`, `targetDescriptorSchema`. Prompts: `SYSTEM_PROMPT`, `DRAFT_SYSTEM_PROMPT`,
`buildUserPrompt`, `buildDraftPrompt`.

## @tourkit/ai/server

Server half. This is the only import that touches your model key.

| Export | Signature |
| --- | --- |
| `createTourkitHandler` | `({ generate, tourId? }) => (request: Request) => Promise<Response>` |
| `anthropicGenerator` | `({ apiKey?, model?, client? }) => TourGenerator`. Defaults to `claude-opus-5`, loads the SDK lazily. |
| `anthropicDrafter` | `({ apiKey?, model?, client? }) => Drafter`. Writes step copy from a recording, behind `tourkit record --draft`. |
| `TourGenerator` | `({ question, manifest }) => Promise<unknown>`. Any provider fits. |

The handler answers `405` to anything but POST, `400` on a malformed request, `502` when
`generate` throws, and `422` with a `reason` when the result names a target that is not in the
manifest. See [Ask and be shown](./ai.md).

## @tourkit/cli

A binary, not a library. Nothing imports it at runtime. See the [CLI reference](./cli.md).
