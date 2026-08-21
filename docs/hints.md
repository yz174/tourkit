# Hints

Web only. A hint is a dot sitting on an element, on its own, with no tour running. Click it and a
small popover explains the thing. Dismiss it and it stays gone.

```tsx
import { TourHint } from "@tourkit/react";

<TourHint
  id="filters"
  target="filters"
  title="Filter by route"
  body="Narrow rides to the ones passing your gate."
/>;
```

| Prop | Meaning |
| --- | --- |
| `id` | Identifies the hint, and is the storage key it remembers itself under. |
| `target` | Same resolution as a step target: a registered id, a `data-tour-id`, or a CSS selector. |
| `title`, `body` | The copy. Both optional. |
| `placement`, `align` | Where the popover opens. Defaults to `bottom` and `center`. |
| `dismissLabel` | The dismiss button's text. Defaults to `Got it`. |
| `theme` | A theme override for this hint alone. |
| `className` | Added to the dot, alongside `tourkit-hint-dot`. |

Hints must be rendered inside `<TourProvider>`, which is where they read the storage adapter and
coordinate with each other.

## Behaviour worth knowing

**One at a time.** Opening a hint closes any other. Clicking an open hint's dot closes it.

**Dismissal is remembered.** Pressing the dismiss button writes `dismissed` to
`tourkit:hint:{id}` through the provider's storage adapter, and the hint never renders again on
that device. Clear the key to bring it back.

```ts
await storage.remove("tourkit:hint:filters");
```

**A missing target renders nothing.** No dot, no error, no warning. A hint pointing at an element
that has not mounted yet appears as soon as it does.

**The dot tracks its element.** Scroll, resize or a layout change moves it, through the same
Floating UI `autoUpdate` the tour card uses.

## Styling

Every part carries a stable class: `tourkit-hint`, `tourkit-hint-dot`, `tourkit-hint-card`,
`tourkit-hint-title`, `tourkit-hint-body`, `tourkit-hint-dismiss`. The dot's pulse honours
`prefers-reduced-motion` through the browser.
