# Recipes

## A target that renders after a request

The default gate already waits for the target to appear, bounded by `gateTimeoutMs`.

```ts
{ id: "chart", target: "revenue-chart", gateTimeoutMs: 10000 }
```

If the wait is about your data rather than the element, say so:

```ts
{
  id: "chart",
  target: "revenue-chart",
  gate: async ({ context }) => context.reportsLoaded,
  gateTimeoutMs: 10000,
}
```

## A target inside a modal

On web this works as long as the modal is in the document when the step activates. Open it first:

```ts
{ id: "settings", target: "#modal-save", onEnter: () => openSettings() }
```

`onEnter` is awaited before the gate runs, so the modal is mounting while the tour waits for the
target.

The overlay sits at `theme.zIndex`, 10000 by default, so it renders above a modal rather than
behind it. Lower it if you want the reverse.

## Showing a tour only once

Completion is persisted for you under `tour:{id}:v{version}`.

```tsx
import { readRecord } from "@tourkit/core";

const record = await readRecord(storage, onboarding);
if (record?.outcome !== "completed") start("onboarding");
```

## Resuming where the user left off

Automatic. `start(id)` resumes if a saved position exists and the step still resolves, and emits
`tour:resume` instead of `tour:start`.

Bump `version` when you change the steps and the saved position is discarded rather than
resumed onto the wrong step.

## Re-running a finished tour

```tsx
import { clearRecord } from "@tourkit/core";

await clearRecord(storage, onboarding);
start("onboarding");
```

## Two tours, one after the other

```tsx
<TourProvider
  tours={[onboarding, advanced]}
  onEvent={(name, event) => {
    if (name === "tour:complete" && event.tourId === "onboarding") start("advanced");
  }}
>
```

## A step that only some users see

```ts
{ id: "billing", target: "billing", when: (context) => context.plan === "pro" }
```

Hidden steps are excluded from `total`, so progress stays honest.

## Pointing at a list row

Give the row a stable target id and let the tour scroll to it.

```tsx
{items.map((item, index) =>
  index === 3 ? (
    <TourTarget key={item.id} id="third-row">
      <Row item={item} />
    </TourTarget>
  ) : (
    <Row key={item.id} item={item} />
  ),
)}
```

```ts
{ id: "row", target: "third-row", scroll: { block: "start" } }
```

On web the same thing is a `data-tour-id` on the row.

## Stopping a tour when the user navigates away

```tsx
const { stop, running } = useTour();

useEffect(() => {
  if (running && pathname !== expected) stop();
}, [pathname, running, stop, expected]);
```

Usually unnecessary, since a step with a `route` navigates back on its own.

## Different copy per locale

`title` and `body` are plain strings, so translate them where you build the config.

```ts
const onboarding = (t: (key: string) => string): TourConfig<Ctx> => ({
  id: "onboarding",
  version: 1,
  steps: [{ id: "post", target: "post-ride", title: t("tour.post.title"), body: t("tour.post.body") }],
});
```

Pass the result to `tours`. Changing it mid-tour is safe.

## Finding a typo in a target id

A step whose target never appears is skipped after `gateTimeoutMs` and emits `target:timeout`.
Log it in development:

```tsx
<TourProvider
  tours={tours}
  onEvent={(name, event) => {
    if (name === "target:timeout") console.warn("tourkit: no target for step", event.stepId);
  }}
>
```
