# Troubleshooting

Symptoms, what causes them, and what to change. Grouped by where the problem actually lives, not
by what it looks like from the outside.

## Start by watching the events

Almost every silent failure announces itself through `onEvent`. Wire this up before guessing:

```tsx
<TourProvider
  tours={tours}
  onEvent={(name, event) => {
    if (process.env.NODE_ENV === "development") console.log("tourkit", name, event);
  }}
>
```

`target:timeout` is the one that matters most. It fires whenever a gate did not resolve in time,
and it is always followed by whatever `onGateTimeout` did next.

On web, the overlay also states what it is doing in the DOM:

```
[data-tourkit="root"][data-tourkit-state="resolving"]     waiting on a gate
[data-tourkit="root"][data-tourkit-state="active"]        the step is showing
[data-tourkit="root"][data-tourkit-interaction="block"]   which interaction mode is in force
```

If `root` is absent entirely, no tour is running.

## Nothing happens when I call start()

**The id does not match a registered tour.** `start(id)` looks the id up in `tours` and returns
silently when it finds nothing. Check the string against `config.id`, not the file name.

**The provider is not an ancestor.** A hook outside the provider throws
`tourkit: this hook must be used inside <TourProvider>.` rather than failing quietly, so if you
are not seeing that error, the provider is there.

**The tour started and every step was skipped.** A tour whose steps all fail their gates
completes in milliseconds. The event log shows `tour:start`, then `target:timeout` and
`step:skip` per step, then `tour:complete`.

## A step is skipped and I see target:timeout

The target never resolved within `gateTimeoutMs`, which defaults to 5000.

On web, `target` is tried in three ways, in this order:

1. An id registered through `useTourTarget("post-ride")`
2. A `data-tour-id="post-ride"` attribute
3. The string as a CSS selector

Work through the causes in order of how often they are the answer:

| Cause | How to confirm | Fix |
| --- | --- | --- |
| Typo in the id | `document.querySelector('[data-tour-id="post-ride"]')` returns `null` | Fix the string. |
| The element mounts after the gate expires | It appears in the DOM a second later | Raise `gateTimeoutMs`, or write a `gate` that waits on your data. |
| The element is on another route | The step has no `route` | Add `route` and a nav adapter. See [Navigation](./navigation.md). |
| It is inside a modal that is closed | The modal opens on click | Open it from `onEnter`, which is awaited before the gate runs. |
| A refactor broke the selector | The class name is hashed or renamed | Give the element a `data-tour-id`, or add a [fingerprint](./self-healing.md). |
| `when` removed the step | The step never appears in `snapshot.steps` | Check the predicate against the context you actually pass. |

A gate that is about your data rather than the DOM should say so:

```ts
{
  id: "chart",
  target: "revenue-chart",
  gate: async ({ context }) => context.reportsLoaded,
  gateTimeoutMs: 10000,
}
```

An invalid CSS selector resolves to `null` rather than throwing, so a malformed `target` looks
exactly like a missing element.

## I see a warning about a fingerprint

```
tourkit: step "cancel" could not find ".danger-btn" and matched it by fingerprint instead.
Update the target before it stops matching.
```

The tour is working. The selector is not. Healing is a safety net, and a healed step is a step
whose target is already wrong. Give the element a `data-tour-id` and point the step at that.
Details in [When a target breaks](./self-healing.md).

If a step has a fingerprint and is still skipped, the fingerprint refused to guess. It only
matches when the best candidate scores at least 4 **and** strictly beats the runner-up, so two
buttons that both say "Save" resolve to nothing on purpose.

## The tour only ever shows once

Completion is persisted under `tour:{id}:v{version}`. A completed tour starts again from step one,
but a first-run trigger that checks the record will not fire.

```tsx
import { clearRecord } from "@tourkit/core";

await clearRecord(storage, onboarding);
start("onboarding");
```

Use the provider's own adapter, not a fresh one, or you will clear a key nobody reads:

```tsx
const { storage } = useTourContext();
```

## The tour resumes onto the wrong step

You changed the steps without bumping `version`. The saved position is a step id, and an id that
still exists in a reordered tour resumes at the new position of that id.

Bump `version` whenever the steps change. A saved position from an older version is discarded
rather than resumed.

## The tour restarts from the beginning every time

**On React Native**, nothing is persisted until you pass a `storage` adapter. There is no
`localStorage` to fall back to.

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStorageAdapter } from "@tourkit/native";

const storage = createStorageAdapter(AsyncStorage);
```

**On web**, check that the provider is not remounting. The engine is created once with lazy
`useState`, so a provider that unmounts loses everything in flight. A provider inside a
route-level component, or one whose `key` changes on login, remounts. Put it in the root layout.

## The overlay renders behind a modal

Raise `theme.zIndex`. It defaults to 10000, which clears most stacking contexts, but a modal
library that sets a higher value wins.

The reverse is also a setting: lower it to put the tour under a fixed header.

A z-index cannot escape a parent stacking context. If your modal creates one and the tour is
portalled inside it, pass `container` to portal the overlay somewhere else:

```tsx
<TourProvider tours={tours} container={document.body}>
```

## The card sits in the wrong place

`placement` is a preference, not a guarantee. Floating UI flips and shifts the card to keep it on
screen, and `placement.side` in the card props reports where it actually landed.

On React Native, `placement: "left"` and `"right"` fall back to `auto`, because a 320px card does
not fit beside anything on a 390px screen.

A step with `target: null` centres the card and cuts no hole. That is the intended shape for a
final step, not a bug.

## Escape does not close the tour

`dismissible: false` on the step or the tour. Escape is ignored, and a custom card is told to
hide its skip control. It defaults to `true`.

## Clicking the highlighted element does nothing

That is `interaction: "block"`, the default. A full-screen shield absorbs every press, including
inside the hole, so the highlight is purely visual.

| You want | Set |
| --- | --- |
| The real element to work | `interaction: "passthrough"` |
| Pressing the hole to advance the tour | `interaction: "advance-on-press"` |

`advance-on-press` does **not** press the underlying element. That is deliberate and identical on
both platforms. See [Interaction](./interaction.md#advance-on-press).

## The scroll does not happen

`scrollIntoViewIfNeeded` is a no-op when the element is already fully inside the viewport, so a
target that is only slightly clipped by a sticky header will not scroll. Give it an explicit
block:

```ts
{ id: "row", target: "third-row", scroll: { block: "start" } }
```

On React Native, scrolling needs the container's ref:

```tsx
<TourProvider tours={tours} scrollRef={scrollRef}>
```

Use `useRef<ComponentRef<typeof ScrollView> | null>(null)`. `useRef<ScrollView>` does not
typecheck in current React Native types, because the imported name is the component rather than
the instance.

## React Native: the hole is offset from the element

`TourTarget` wraps a component that forwards neither `onLayout` nor a ref, so the spotlight falls
back to the wrapper, whose box includes the child's margins. Development logs this by name.

Forward `onLayout` to that component's root view:

```tsx
function PlannerCard({ onLayout }: { onLayout?: (event: LayoutChangeEvent) => void }) {
  return <View onLayout={onLayout} style={styles.card}>{/* ... */}</View>;
}
```

## React Native: the padding is doubled

`TourTarget` renders a wrapping `View`, and its `style` prop goes on that wrapper. Give it layout
only: `flex`, `alignSelf`, `margin`. Padding on the wrapper is added to the padding the child
already applies.

## React Native: a strip along the bottom stays lit

A custom `Backdrop` that sizes itself from `useWindowDimensions()`. Under Android edge-to-edge the
window it reports is shorter than the screen by the system bars.

The `Backdrop` slot receives `size`, the measured box the overlay actually covers. Use that.

## React Native: two elements fight over one id

```
tourkit: duplicate TourTarget id "post-ride". The last one mounted wins.
```

Two `TourTarget`s with the same `id` are mounted at once. Usually a target inside a list that was
not given a per-row id.

## The blur does nothing on React Native

`blur.enabled` alone is not enough. Install `@react-native-masked-view/masked-view` and
`expo-blur`, rebuild, then hand the modules to `createBlurBackdrop` and pass it as the `Backdrop`
slot. Without that, the dim scrim stays and development logs one warning naming what to install.

The package does not import those modules itself on purpose. The reasoning is in
[Customization](./customization.md#blur).

## A theme token does nothing

Four tokens are not what they look like:

| Token | The surprise |
| --- | --- |
| `motion.easing` | React Native only. The web host uses a fixed curve. |
| `spotlight.radius: "auto"` | Resolves to 8 on web. There is no element radius to read. |
| `blur.enabled` | Needs a mounted blur backdrop on React Native. |
| `text.action.color` | The default card renders `accent` instead. Set `accent`, or read `text.action` in a custom card. |

All of them are in the [Theme reference](./theme.md).

## A hint ignores my provider theme

`TourHint` merges the defaults with its own `theme` prop and nothing else. The provider theme and
the tour theme do not reach it.

```tsx
<TourHint id="filters" target="filters" theme={{ accent: "#ff0066" }} />
```

## A dismissed hint will not come back

Dismissal writes `dismissed` to `tourkit:hint:{id}` and the hint never renders again on that
device.

```ts
await storage.remove("tourkit:hint:filters");
```

A hint whose target does not resolve renders nothing at all: no dot, no error, no warning. It
appears as soon as the element mounts.

## The recorder panel never appears

The panel polls `GET /status` and renders only while `tourkit record` is answering. Check, in
order:

1. `tourkit record` is running in a second terminal.
2. `<TourRecorder />` is mounted, inside the provider, in a development build.
3. Nothing is blocking `http://127.0.0.1:5178`.

Pass `autoShow={false}` to render it unconditionally, which is the clipboard flow with no server.

`npx tourkit` only works when npm wrote the shim it looks for. Bun on Windows writes
`tourkit.exe` and `tourkit.bunx` instead, and npx then tries to fetch a package called `tourkit`
from the registry and fails with a 404. Use the runner that matches your install.

## The native recorder captures nothing

It can only capture taps on mounted `TourTarget`s. A production build has no queryable view tree
to resolve anything else against, so you wrap first and record second. The web recorder has no
such limit and needs nothing prepared.

## Asking a question returns 422

The model named a target that is not in the manifest. `status` becomes `failed` with
`reason: "unknown-target"`, and nothing renders. This is the check working: a partial tour
pointing confidently at empty space is worse than no tour.

The usual cause is a thin manifest. A target id of `btn-4` with no label tells the model nothing.

```tsx
<button data-tour-id="cancel-ride" data-tour-label="Cancel a posted ride">×</button>
```

Other reasons: `malformed` covers a network error, a non-2xx response and unparseable JSON.
`empty` means the model returned no usable steps.

## Everything re-renders more than it should

**`tours` built inline.** The provider pushes `tours` into the engine from an effect keyed on its
identity. A fresh array on every parent render re-runs that effect and re-renders the overlay.
Hoist it to module scope, or memoize it.

The same applies to `theme`, `storage`, `nav` and `onEvent`. All five can change mid-tour without
restarting anything, which is what makes a dark mode toggle safe, and which is also why a new
object every render is not free.

**`useTourSnapshot` where `useTour` would do.** The snapshot is a new object on every engine
change. `useTour()` selects a boolean, so it re-renders only when the tour starts or ends.

**An inline selector.** `useTourSelector` reads through the callback you pass, so an inline arrow
re-subscribes on every render. Define it outside the component or wrap it in `useCallback`.

## TypeScript rejects my when or gate

```tsx
<TourProvider<AppContext> tours={tours} context={{ plan: "free" }}>
```

Without the annotation, TypeScript infers the context from the object literal and widens `"free"`
to `string`, so a predicate typed against `AppContext` no longer matches. The full explanation is
in the [Provider reference](./provider.md#annotate-the-context-type).

## Still stuck

Steps that never resolve, tours that never start, and cards in the wrong place are all visible in
the snapshot. Log the whole thing:

```tsx
const snapshot = useTourSnapshot();
console.log(snapshot.status, snapshot.step?.id, snapshot.activeTarget, snapshot.rects);
```

`status` is `idle`, `resolving` or `active`. A step stuck on `resolving` is waiting for a gate.
`rects` is empty for a target that was never measured.
