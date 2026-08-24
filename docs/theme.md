# Theme reference

Every token, its type, its default, and what reads it. [Customization](./customization.md) is the
guide; this is the table you check when a value does not do what you expected.

The token names are identical on web and React Native. Four of them behave differently on the two
platforms, and those rows say so.

## Merging

```
defaultTheme  ←  provider theme  ←  tour theme  ←  step theme
```

Lowest to highest. Merging is key by key and one level deep into each group, so
`{ scrim: { opacity: 0.5 } }` keeps the default `scrim.color`.

```tsx
<TourProvider theme={{ accent: "#ff0066" }} tours={[
  { id: "onboarding", version: 1, theme: { scrim: { opacity: 0.7 } }, steps: [
    { id: "fab", target: "fab", theme: { ring: { show: true } } },
  ]},
]}>
```

`mergeTheme(...overrides)` is exported if you need the resolved object yourself. It applies
`text.contrast` last, so what it returns is what gets rendered.

## Top level

| Token | Type | Default | Effect |
| --- | --- | --- | --- |
| `accent` | `string` | `#1E9CFE` | The Next button, and the fallback for `progress.activeColor`, `progress.restColor` and `ring.color`. |
| `zIndex` | `number` | `10000` | Stacking order of the overlay root. High enough to clear modals, sticky headers and toasts. Lower it to put the tour under a fixed header. |

Without a z-index above your own layers, the scrim renders behind anything positioned above 0,
and that element stays clickable during the tour.

## scrim

The dimmed area outside the hole.

| Token | Type | Default | Effect |
| --- | --- | --- | --- |
| `scrim.color` | `string` | `#0B121E` | |
| `scrim.opacity` | `number` | `0.86` | 0 hides the dimming and keeps the cutout geometry. |

## spotlight

The hole itself.

| Token | Type | Default | Effect |
| --- | --- | --- | --- |
| `spotlight.padding` | `number` | `4` | Space between the target's box and the edge of the hole. A step's `padding` overrides it. |
| `spotlight.radius` | `number \| "auto"` | `"auto"` | Corner radius of the hole. |

`"auto"` is the one token that resolves differently per platform:

| Platform | What `"auto"` resolves to |
| --- | --- |
| React Native | The `radius` prop on the `TourTarget`, or `0` when it has none. |
| Web | `8`. There is no element radius to read, because a `data-tour-id` carries no geometry. |

So on web, set `spotlight.radius` to a number, or set `radius` per step. A circular hole around a
floating action button is `radius: 999`; a tight list row is `radius: 8, padding: 2`.

On web the padding is added to the radius, so the hole's corners stay concentric with the
target's as the padding grows.

## card

| Token | Type | Default | Effect |
| --- | --- | --- | --- |
| `card.background` | `string` | `#FBFCFE` | Also the arrow's fill, and the input to `text.contrast: "auto"`. |
| `card.radius` | `number` | `16` | |
| `card.padding` | `number` | `16` | |
| `card.maxWidth` | `number` | `320` | The card is `max-content` up to this width. |
| `card.shadow` | `"none" \| "lifted"` | `"lifted"` | Web draws `0 4px 10px rgba(17, 24, 39, 0.15)`. React Native draws the iOS shadow plus `elevation: 5`. |

## text

Three styles and a switch. Each style is `{ fontSize, fontWeight, color }`.

| Token | Type | Default |
| --- | --- | --- |
| `text.title.fontSize` | `number` | `15` |
| `text.title.fontWeight` | `FontWeight` | `"700"` |
| `text.title.color` | `string` | `#111827` |
| `text.body.fontSize` | `number` | `13` |
| `text.body.fontWeight` | `FontWeight` | `"500"` |
| `text.body.color` | `string` | `#6B7280` |
| `text.action.fontSize` | `number` | `13` |
| `text.action.fontWeight` | `FontWeight` | `"700"` |
| `text.action.color` | `string` | `#1E9CFE` |
| `text.contrast` | `"manual" \| "auto"` | `"manual"` |

`FontWeight` is `"normal"`, `"bold"`, or `"100"` through `"900"`. Strings, not numbers, because
React Native rejects numeric weights.

The default card renders the action colour as `accent`, not `text.action.color`. Set `accent`
to change the Next button. `text.action` is what a custom card should read.

### text.contrast

`"manual"` leaves the three colours exactly as set. `"auto"` derives title and body from
`card.background` by contrast ratio:

| What | How it is chosen |
| --- | --- |
| Title and body | Whichever of the light pair (`#F9FAFB` / `#CBD5E1`) or the dark pair (`#111827` / `#6B7280`) scores a higher ratio against `card.background`. |
| Action | `accent`, when it clears 3:1 against `card.background`. Otherwise the chosen title colour. |

Higher ratio, not darker. On `#1E9CFE`, dark text scores 7.4:1 against white text's 2.7:1, so dark
text wins.

```ts
theme={{ card: { background: "#101828" }, text: { contrast: "auto" } }}
```

This is the token to reach for when your card background is user-configurable or follows a dark
mode toggle. `contrastRatio`, `luminance` and `isDark` are exported from `@tourkit/core` if a
custom card needs the same answers.

## arrow

| Token | Type | Default | Effect |
| --- | --- | --- | --- |
| `arrow.size` | `number` | `14` | The square that gets rotated 45 degrees. |
| `arrow.show` | `boolean` | `true` | `false` removes it. A step with no target never has one. |

## motion

| Token | Type | Default | Effect |
| --- | --- | --- | --- |
| `motion.morph` | `number` | `280` | Milliseconds for the hole to travel and resize between steps. |
| `motion.travel` | `number` | `200` | Milliseconds for the card to move. |
| `motion.fade` | `number` | `180` | Milliseconds for the card's fade. |
| `motion.easing` | `string` | `"easeOutQuint"` | React Native only. `easeOutQuint`, `easeOut`, `linear`. An unknown value falls back to `easeOutQuint`. |

Set any duration to 0 to turn that animation off.

`motion.easing` has no effect on web. The web host animates on a fixed
`cubic-bezier(0.22, 1, 0.36, 1)`, which is the same curve as `easeOutQuint`. Changing the token
in a shared theme is harmless; expecting `linear` to land in the browser is not.

Reduced motion is read from the platform on both sides. Web watches
`prefers-reduced-motion: reduce` and re-reads it on change. React Native reads
`AccessibilityInfo`. Either one switches the hole from animating to jumping and disables the ring.

## progress

| Token | Type | Default | Effect |
| --- | --- | --- | --- |
| `progress.style` | `ProgressStyle` | `"dots"` | See below. |
| `progress.activeColor` | `string \| null` | `null` | Falls back to `accent`. |
| `progress.restColor` | `string \| null` | `null` | Falls back to `accent`. |

| `progress.style` | What it draws |
| --- | --- |
| `dots` | One dot per step. |
| `segmented` | One bar per step; the active one stretches into a rounded rectangle. |
| `numbers` | `3 / 7`, in tabular figures. |
| `continuous` | A single track that fills as the tour advances. |

All four render on both platforms.

## ring

A breathing outline around the hole. Off by default, because switching a looping animation on for
every existing tour is a change nobody asked for.

| Token | Type | Default | Effect |
| --- | --- | --- | --- |
| `ring.show` | `boolean` | `false` | |
| `ring.color` | `string \| null` | `null` | Falls back to `accent`. |
| `ring.width` | `number` | `2` | |
| `ring.period` | `number` | `1400` | Milliseconds for one breath. |

Reduced motion is handled differently on the two platforms. Web does not render the ring at all.
React Native still draws it, at a constant 30% opacity, and skips the breathing animation. Neither
one leaves a half-finished animation frozen on screen.

## blur

| Token | Type | Default | Effect |
| --- | --- | --- | --- |
| `blur.enabled` | `boolean` | `false` | |
| `blur.radius` | `number` | `7` | Pixels. |

Web applies `backdrop-filter: blur(Npx)` to the scrim, leaving the cutout unblurred. Nothing to
install.

React Native needs `@react-native-masked-view/masked-view` and `expo-blur`, plus a rebuild, and
you hand the modules to `createBlurBackdrop` yourself. Turning `blur.enabled` on without mounting
that backdrop keeps the dim scrim and logs one development warning naming what to install. The
reason the package does not probe for the modules itself is in
[Customization](./customization.md#blur).

## The full object

Every field is optional. This is the resolved default, which is what `defaultTheme` exports.

```ts
const defaultTheme = {
  accent: "#1E9CFE",
  zIndex: 10000,
  scrim: { color: "#0B121E", opacity: 0.86 },
  spotlight: { padding: 4, radius: "auto" },
  card: { background: "#FBFCFE", radius: 16, padding: 16, maxWidth: 320, shadow: "lifted" },
  text: {
    title: { fontSize: 15, fontWeight: "700", color: "#111827" },
    body: { fontSize: 13, fontWeight: "500", color: "#6B7280" },
    action: { fontSize: 13, fontWeight: "700", color: "#1E9CFE" },
    contrast: "manual",
  },
  arrow: { size: 14, show: true },
  motion: { morph: 280, travel: 200, fade: 180, easing: "easeOutQuint" },
  progress: { style: "dots", activeColor: null, restColor: null },
  ring: { show: false, color: null, width: 2, period: 1400 },
  blur: { enabled: false, radius: 7 },
};
```

## Following a dark mode toggle

The theme prop can change while a tour is running and the engine follows without restarting.

```tsx
const theme = useMemo(
  () =>
    dark
      ? { card: { background: "#101828" }, scrim: { opacity: 0.9 }, text: { contrast: "auto" } }
      : { text: { contrast: "auto" } },
  [dark],
);

<TourProvider tours={tours} theme={theme}>
```

Memoize it. A fresh object every render pushes new options into the engine on every render.

## When the theme is not enough

The theme covers colour, size and timing. It does not cover layout or markup. For those:

- Web: the stable classes, or your own through `classNames`. See
  [Customization](./customization.md#web-your-own-css).
- Either platform: replace the `Card`, `Backdrop` or `Progress` slot.
- Either platform: `useTourState()` and render the whole thing yourself.
