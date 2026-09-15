# Provider reference

`TourProvider` owns the engine and renders the overlay. Mount it once, above everything the tour
can point at.

```tsx
<TourProvider tours={[onboarding]} context={{ plan: "pro" }}>
  <App />
</TourProvider>
```

You do not mount the overlay separately. The provider renders it after `children`, which puts it
on top.

## Annotate the context type

Write `<TourProvider<AppContext> ...>` when your steps use `when`, `gate`, `onEnter` or
`onAdvance`. Without the annotation TypeScript infers the context type from the object literal
you pass, which widens `"pro"` to `string`, and your predicates then fail to typecheck against
the inferred type.

```tsx
<TourProvider<AppContext> tours={[onboarding]} context={{ plan: "pro" }}>
```

## Props on both platforms

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `tours` | `TourConfig<Ctx>[]` | required | Every tour the app can start. |
| `context` | `Ctx` | `undefined` | Passed to `when`, `gate`, `onEnter` and `onAdvance`. Your type, never inspected. |
| `theme` | `ThemeOverride` | | Lowest precedence. Tour and step themes override it. |
| `storage` | `StorageAdapter` | `localStorage` on web, none on native | Where completion and resume position are saved. |
| `nav` | `NavAdapter` | | Needed only for steps that declare a `route`. |
| `onEvent` | `(name, event) => void` | | The whole analytics story. See below. |
| `components` | `Partial<Slots>` | | Replace the card, backdrop or progress indicator. |
| `children` | `ReactNode` | required | Your app. |

## Web only

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `container` | `Element \| null` | `document.body` | Where the overlay is portalled. |
| `styled` | `boolean` | `true` | `false` drops every cosmetic style and keeps only the structural ones. Importing from `@tourkit/react/unstyled` sets it for you. |
| `scrollHandler` | `ScrollHandler` | | Replaces the built-in scrolling. See below. |

### Scrolling it yourself

`scroll` on a step covers `scrollIntoView`. A virtual list, a custom scroll container or a
library that owns scrolling needs more than that, so the provider takes a handler:

```tsx
<TourProvider
  tours={tours}
  scrollHandler={(element, { block, behavior }, step) => {
    listRef.current?.scrollToIndex({ index: rowFor(step), align: block, behavior });
  }}
>
```

It is called instead of the built-in scrolling for any step whose `scroll` is not `false`.
`behavior` already accounts for reduced motion, so passing it straight through is correct.

## React Native only

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `insets` | `{ top, bottom, left, right }` | all zero | Safe-area insets. Pass `useSafeAreaInsets()` if you use `react-native-safe-area-context`. |
| `scrollRef` | `RefObject<ScrollView \| null>` | | Lets the tour scroll an off-screen target into view. |
| `debug` | `boolean` | `false` | Reserved for the debug overlay. |

`insets` is a prop rather than a dependency on purpose. One line of wiring beats forcing a native
package on everyone.

## Events

```tsx
<TourProvider onEvent={(name, event) => analytics.track(name, event)} tours={tours}>
```

Every event carries `{ tourId, stepId, stepIndex, total }`. `stepId` is `null` on the two
tour-level completion events.

| Event | When |
| --- | --- |
| `tour:start` | A tour begins from the first step. |
| `tour:resume` | A tour begins from a saved position. |
| `step:enter` | A step became active, meaning its gate passed. |
| `step:exit` | A step is being left through `next`, `back` or `skip`. |
| `step:skip` | A step was skipped, either by the user or by a failed gate. |
| `target:timeout` | A gate did not resolve in time. Always paired with whatever the policy did next. |
| `tour:complete` | The last step finished. |
| `tour:abort` | The tour was stopped early. |

There is no analytics dependency and nothing is sent anywhere. Wire this to whatever you already
use.

## Controls

```tsx
const { start, stop, next, prev, skip, moveTo, show, refresh, isOpen, whenShown } =
  useTour();
```

| Function | Behaviour |
| --- | --- |
| `start(tourId)` | Begins a tour, resuming from a saved position when one matches. |
| `start(tourId, { at })` | Begins at a step index or step id, ignoring any saved position. An index or id that does not exist falls back to the first step. |
| `stop()` | Ends it and records the outcome as skipped. Blocked by `onBeforeExit`. |
| `next()` | Runs `onAdvance`, then moves on. Ignored while a step is still resolving. Blocked by `onBeforeAdvance`. |
| `prev()` | Goes back one visible step. Ignored on the first. Blocked by `onBeforeBack`. |
| `skip()` | Moves on without running `onAdvance`. Never blocked. |
| `moveTo(index)` | Jumps to a visible step by position. Ignored when the index does not exist. |
| `show(stepId)` | Jumps to a visible step by id. Ignored when the id does not exist. |
| `isOpen(stepId)` | Whether that step is on screen now. A step waiting on its gate is not open yet. |
| `whenShown(stepId)` | Resolves `true` when the step appears, `false` if the tour ends without it. Never hangs. |
| `refresh()` | Remeasures the target and repositions the card now, rather than waiting for the next scroll or resize. Use it after your own layout animation finishes. |
| `running` | True from `start` until the tour ends, including while a gate is pending. |

`moveTo` and `show` emit `step:exit` for the step they leave and `step:enter` for the one they
open, and they do not run `onAdvance`. A jump is not an advance.

## Reading where the tour is

`useTourState()` returns the whole snapshot, which carries four position flags alongside
`stepIndex` and `total`:

```tsx
const { isFirst, isLast, hasNext, hasPrev } = useTourState();
```

They count visible steps only, so a step hidden by `when` never makes `isLast` lie.

## Changing props mid-tour

`theme`, `tours`, `storage`, `nav` and `onEvent` can all change while a tour is running and the
engine follows without restarting. A dark-mode toggle does not interrupt a tour.
