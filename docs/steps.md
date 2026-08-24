# Step reference

A tour is a `TourConfig` holding an array of `TourStep`. Both are plain data. Neither imports
anything from a renderer, which is what lets one file drive both platforms.

## TourConfig

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | What you pass to `start(id)`. Also part of the storage key. |
| `version` | `number` | Bump it when the steps change. A saved position from an older version is discarded rather than resumed onto the wrong step. |
| `steps` | `TourStep[]` | In order. Filtered by `when` at start time. |
| `entryRoute` | `string?` | Informational. The route the tour expects to begin on. |
| `theme` | `ThemeOverride?` | Applied to every step in this tour. Overrides the provider theme. |

## TourStep

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | required | Unique within the tour. Stored when the tour is paused, so renaming it invalidates a saved position. |
| `target` | `string \| null` | `undefined` | What to highlight. `null` means a centred card with no hole, which is the usual shape for a final step. |
| `title` | `string?` | | Shown by the default card and used as the dialog label on web. |
| `body` | `string?` | | One line reads better than three. |
| `data` | `Record<string, unknown>?` | | Anything you want. The library never reads it. A custom card can pull an image, a video or a link out of it. |
| `route` | `string?` | | If the app is not on this route, the nav adapter navigates before the step activates. See [Navigation](./navigation.md). |
| `when` | `(context) => boolean` | | Return false and the step disappears completely. Progress counts only visible steps. |
| `gate` | `(args) => boolean \| Promise<boolean>` | | Resolve true and the step activates. Anything else runs `onGateTimeout`. |
| `gateTimeoutMs` | `number?` | `5000` | How long to wait for the gate, or for the target to be measured when there is no gate. |
| `onGateTimeout` | `"skip" \| "advance" \| "abort"` | `"skip"` | What to do when the gate fails. |
| `onEnter` | `(context) => void \| Promise<void>` | | Awaited before the gate runs. |
| `onAdvance` | `(context) => void \| Promise<void>` | | Awaited before the step index changes, so the next screen is already mounting when it becomes active. |
| `align` | `"start" \| "center" \| "end"?` | Where the card sits along the target's edge. Defaults to `center`. |
| `dismissible` | `boolean?` | `false` stops Escape ending the tour and tells a custom card to hide its skip control. Defaults to `true`, and can also be set on the tour. |
| `placement` | `"auto" \| "top" \| "bottom" \| "left" \| "right"` | `"auto"` | Where the card sits. On React Native, `left` and `right` fall back to `auto`, because a 320px card does not fit beside anything on a phone. |
| `interaction` | `"block" \| "passthrough" \| "advance-on-press"` | `"block"` | See [Interaction](./interaction.md). |
| `scroll` | `boolean \| { block?, behavior? }` | `true` | Bring an off-screen target into view. `false` leaves the scroll position alone. |
| `padding` | `number?` | theme | Space between the target and the edge of the hole. |
| `radius` | `number \| "auto"` | theme | Corner radius of the hole. On React Native, `"auto"` reads the radius the `TourTarget` registered. On web there is no registered radius, so it resolves to 8. See the [Theme reference](./theme.md#spotlight). |
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
