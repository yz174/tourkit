# Step reference

A tour is a `TourConfig` holding an array of `TourStep`. Both are plain data. Neither imports
anything from a renderer, which is what lets one file drive both platforms.

## TourConfig

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | What you pass to `start(id)`. Also part of the storage key. |
| `version` | `number` | Bump it when the steps change. A saved position from an older version is discarded rather than resumed onto the wrong step. |
| `steps` | `TourStep[]` | In order. Filtered by `when` at start time. |
| `defaultStepOptions` | `Omit<TourStep, "id">?` | Applied to every step in this tour. The step's own value wins. See [Tour-wide defaults](#tour-wide-defaults). |
| `onBeforeExit` | `(context) => boolean \| Promise<boolean>` | Return false and the tour does not end. See [Blocking a transition](#blocking-a-transition). |
| `entryRoute` | `string?` | Informational. The route the tour expects to begin on. |
| `theme` | `ThemeOverride?` | Applied to every step in this tour. Overrides the provider theme. |

## TourStep

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | required | Unique within the tour. Stored when the tour is paused, so renaming it invalidates a saved position. |
| `extraTargets` | `string[]?` | | More elements cut out of the same overlay. The card still points at `target`. An extra target that is not on the page is skipped. |
| `target` | `string \| null` | `undefined` | What to highlight. `null` means a centred card with no hole, which is the usual shape for a final step. |
| `title` | `string?` | | Shown by the default card and used as the dialog's accessible name. |
| `label` | `string?` | | Accessible name for the dialog when the step shows no `title`. Ignored when `title` is set. |
| `body` | `string?` | | One line reads better than three. |
| `data` | `Record<string, unknown>?` | | Anything you want. The library never reads it. A custom card can pull an image, a video or a link out of it. |
| `route` | `string?` | | If the app is not on this route, the nav adapter navigates before the step activates. See [Navigation](./navigation.md). |
| `when` | `(context) => boolean` | | Return false and the step disappears completely. Progress counts only visible steps. |
| `gate` | `(args) => boolean \| Promise<boolean>` | | Resolve true and the step activates. Anything else runs `onGateTimeout`. |
| `gateTimeoutMs` | `number?` | `5000` | How long to wait for the gate, or for the target to be measured when there is no gate. |
| `onGateTimeout` | `"skip" \| "advance" \| "abort"` | `"skip"` | What to do when the gate fails. |
| `onEnter` | `(context) => void \| Promise<void>` | | Awaited before the gate runs. |
| `onAdvance` | `(context) => void \| Promise<void>` | | Awaited before the step index changes, so the next screen is already mounting when it becomes active. |
| `onBeforeAdvance` | `(context) => boolean \| Promise<boolean>` | | Return false and the step does not advance. Runs before `onAdvance`. |
| `onBeforeBack` | `(context) => boolean \| Promise<boolean>` | | Return false and the tour stays on this step. |
| `onBeforeExit` | `(context) => boolean \| Promise<boolean>` | | Return false and the tour does not end. Overrides the tour-level hook. |
| `buttons` | `StepButtons?` | one Next button | Which controls the card shows and what they say. See [Buttons](#buttons). |
| `align` | `"start" \| "center" \| "end"?` | `"center"` | Where the card sits along the target's edge. |
| `dismissible` | `boolean?` | `true` | `false` stops Escape ending the tour and tells a custom card to hide its skip control. Can also be set on the tour. |
| `placement` | `"auto" \| "top" \| "bottom" \| "left" \| "right"` | `"auto"` | Where the card sits. On React Native, `left` and `right` fall back to `auto`, because a 320px card does not fit beside anything on a phone. |
| `interaction` | `"block" \| "passthrough" \| "advance-on-press"` | `"block"` | See [Interaction](./interaction.md). |
| `scroll` | `boolean \| { block?, behavior? }` | `true` | Bring an off-screen target into view. `false` leaves the scroll position alone. |
| `padding` | `number?` | theme | Space between the target and the edge of the hole. |
| `radius` | `number \| Corners \| "auto"` | theme | Corner radius of the hole. On React Native, `"auto"` reads the radius the `TourTarget` registered. On web there is no registered radius, so it resolves to 8. See the [Theme reference](./theme.md#spotlight). |
| `theme` | `ThemeOverride?` | | Applied to this step only. Highest precedence. |

## Gates

A gate is how a step waits for something. With no `gate`, the step waits for its target to be
measured, which covers the common case of an element that has not rendered yet.

Declare a `gate` when the wait is about your data rather than the DOM:

```ts
{
  id: "chart",
  target: "revenue-chart",
  gate: async ({ context }) => context.reportsLoaded,
  gateTimeoutMs: 8000,
  onGateTimeout: "skip",
}
```

driver.js only offers a fixed millisecond `waitForElement`, which cannot express "after this
request finishes".

The three timeout policies:

- `skip` moves to the next step without running `onAdvance`. This is the default and it is the
  safe one: a step whose target never appeared should not fire the side effects of a step the
  user never saw.
- `advance` runs `onAdvance` and then moves on. Use it when the step's navigation has to happen
  whether or not the target rendered.
- `abort` ends the tour and records it as skipped.

## Conditional steps

```ts
{ id: "billing", target: "billing", when: (context) => context.plan === "pro" }
```

`context` is your own type, passed to the provider. The library never inspects it. A hidden step
is not counted in `total`, so progress dots stay honest.

Change the context and the visible list re-filters immediately, including mid-tour.

## Buttons

By default a step's card shows one control: Next, or Done on the last step. `buttons` opens that
up without replacing the card.

```ts
{
  id: "billing",
  target: "billing",
  buttons: { back: true, close: true, nextLabel: "Got it" },
}
```

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `next` | `boolean?` | `true` | Set false for a step the user leaves by acting on the app. |
| `back` | `boolean?` | `false` | Shown disabled on the first step, where there is nowhere to go. |
| `close` | `boolean?` | `false` | A dismiss control on the card. Suppressed when the step or tour sets `dismissible: false`. |
| `nextDisabled` | `boolean?` | `false` | Renders Next greyed out and unclickable instead of removing it. |
| `backDisabled` | `boolean?` | `false` | The same for Back. It is already disabled on the first step. |
| `nextLabel` | `string?` | `"Next"` | |
| `backLabel` | `string?` | `"Back"` | |
| `doneLabel` | `string?` | `"Done"` | Used instead of `nextLabel` on the last step. |
| `closeLabel` | `string?` | `"Close tour"` | The accessible name on the close control. |

An empty string falls back to the default rather than rendering a blank control.

Both renderers read this through `resolveButtons` from `@tourkit/core`, so web and React Native
show the same controls from the same field.

Before `buttons` existed, adding a Back button meant replacing the whole `Card` slot. That still
works and is still the way to change layout; `buttons` is for the common case.

## Tour-wide defaults

`defaultStepOptions` sets any step field once for the whole tour. The step's own value wins.

```ts
{
  id: "onboarding",
  version: 3,
  defaultStepOptions: { interaction: "passthrough", gateTimeoutMs: 10000, buttons: { back: true } },
  steps: [
    { id: "filters", target: "filters" },
    { id: "compose", target: "compose", interaction: "block" },
  ],
}
```

Every step here waits 10 seconds and shows a Back button. `compose` overrides the interaction
mode and keeps the rest.

The theme cascade is separate and unchanged: provider, then tour, then step.

## Blocking a transition

`onEnter` and `onAdvance` run alongside a transition and cannot stop it. The three `onBefore`
hooks can: return false and nothing moves.

```ts
{
  id: "invite",
  target: "invite",
  onBeforeAdvance: ({ }) => confirm("Send the invites before moving on?"),
}
```

```ts
{
  id: "onboarding",
  version: 1,
  onBeforeExit: async () => await confirmDialog("Leave the tour?"),
  steps: [...],
}
```

Every hook also receives a second argument describing where it fired:

```ts
type StepInfo = { index: number; total: number; stepId: string; tourId: string };
```

```ts
{
  id: "invite",
  onEnter: (context, { index, total }) => analytics.track("step", { index, total }),
}
```

`index` and `total` count visible steps only, so they match what the progress indicator shows.
`onEnter`, `onAdvance` and the three `onBefore` hooks all receive it.

| Hook | Guards | Where |
| --- | --- | --- |
| `onBeforeAdvance` | `next()`, `ArrowRight`, the Next button | step |
| `onBeforeBack` | `prev()`, `ArrowLeft`, the Back button | step |
| `onBeforeExit` | `stop()`, `Escape`, the close button | step, falling back to the tour |

Three things worth knowing:

- A hook that throws blocks the transition. A confirm dialog that fails should not advance past
  the thing it was guarding.
- `skip()` is never blocked. It exists to get out.
- Reaching the end of the last step is completion, not an exit, so `onBeforeExit` does not run.
  Use `onBeforeAdvance` on the last step for that.

## Finishing a tour

There is no separate "done" hook. Completing the last step and leaving early are already
distinct:

| What happened | Event |
| --- | --- |
| The user finished the last step | `tour:complete` |
| The user left early, through `stop()`, Escape or the close button | `tour:abort` |

To own the teardown rather than let the tour end by itself, veto the last step's advance:

```ts
{ id: "last", onBeforeAdvance: ({ saved }) => saved }
```

The tour stays on that step until the hook returns true, so you decide when it ends.

## Highlighting more than one element

`target` decides where the card points. `extraTargets` adds more holes to the same overlay.

```ts
{
  id: "totals",
  target: "summary-row",
  title: "Your totals",
  extraTargets: ["tax-row", "shipping-row"],
}
```

Each extra gets the step's own `padding` and `radius`, so all the holes match. One that is not
on the page is skipped rather than failing the step, which means a table row that has not
rendered yet costs you a hole, not the tour.

The card, the arrow and `advance-on-press` all still use `target`. Extras are decoration.

It works on both platforms. On web an extra is found the same way a `target` is: a registered
id, a `data-tour-id`, or a CSS selector. On React Native it must be a mounted `TourTarget`, like
any other target there.

One difference worth knowing: on React Native the main hole animates between steps and the extra
holes do not, they redraw. Each animated corner needs its own Reanimated shared value, and those
cannot be created per element at runtime.

## Watching one step

`onEvent` on the provider hears about every step. To watch a single one, subscribe to it:

```ts
const off = engine.onStep("billing", (name, info) => {
  if (name === "show") analytics.track("billing seen", info);
});
```

| Event | When |
| --- | --- |
| `before-show` | The step begins resolving, before its gate runs |
| `show` | The step is on screen |
| `before-hide` | The step is about to be left |
| `hide` | The step has been left |

A step that is skipped fires `before-show` and never `show`. A handler that throws does not
stop the tour. `onStep` returns its own unsubscribe function.

## Waiting for a step

```ts
const shown = await whenShown("billing");
```

Resolves `true` once the step is on screen and `false` if the run ends without it, so a skipped
step, a finished tour and an unknown id all resolve rather than hang.

`isOpen(stepId)` answers the same question now rather than later. A step still waiting on its
gate is not open yet.
