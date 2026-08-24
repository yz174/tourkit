# Customization

A tourkit overlay can be customized at three levels: theme tokens, component slots, and
fully headless rendering. Most apps stop at the first. The third exists so nobody has to
fork the package.

## Level 1: theme tokens

One object. Set it on the provider, override it per tour, override it again per step. The token
names are identical on web and React Native.

```ts
const theme = {
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

`activeColor`, `restColor` and `ring.color` fall back to `accent` when left null.

Everything is optional and merges key by key, so `{ scrim: { opacity: 0.5 } }` keeps the default
scrim colour.

Precedence, lowest to highest: defaults, provider, tour, step.

```tsx
<TourProvider theme={{ accent: "#ff0066" }} tours={[
  { id: "onboarding", version: 1, theme: { scrim: { opacity: 0.7 } }, steps: [
    { id: "fab", target: "fab", radius: 999, padding: 12 },
    { id: "row", target: "row", radius: 8, padding: 2 },
  ]},
]}>
```

Per-step `radius` and `padding` matter more than they look. A floating action button wants a
circular hole with generous padding; the list row after it wants a tight rectangle.

### Progress

| `progress.style` | What it draws |
| --- | --- |
| `dots` | One dot per step. The default. |
| `segmented` | One bar per step; the active one stretches into a rounded rectangle. |
| `numbers` | `3 / 7`, tabular figures. |
| `continuous` | A single track that fills as the tour advances. |

```ts
theme={{ progress: { style: "segmented", activeColor: "#1E9CFE", restColor: "#94A3B8" } }}
```

### Text that follows the card colour

`text.contrast` defaults to `manual`, which leaves the three text colours exactly as set. Switch it
to `auto` and the title and body are derived from `card.background` by contrast ratio, picking
whichever of light or dark text scores higher. The action keeps `accent` when that clears 3:1
against the card, and falls back to the title colour when it does not.

```ts
theme={{ card: { background: "#101828" }, text: { contrast: "auto" } }}
```

A mid-tone card gets whichever text reads better, not whichever is darker: on `#1E9CFE`, dark text
scores 7.4:1 against white text's 2.7:1, so dark text wins.

### Ring

A breathing outline around the hole, off by default because switching a looping animation on for
every existing tour is a change nobody asked for.

```ts
theme={{ ring: { show: true, color: "#1E9CFE", width: 2, period: 1400 } }}
```

Reduced motion disables it on both platforms.

### Blur

```ts
theme={{ blur: { enabled: true, radius: 7 } }}
```

Web uses `backdrop-filter` on the scrim and needs nothing installed.

React Native needs `@react-native-masked-view/masked-view` and `expo-blur`, plus a rebuild. Install
both, then hand them to the backdrop yourself:

```tsx
import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { createBlurBackdrop, TourProvider } from "@tourkit/native";

const Backdrop = createBlurBackdrop({ MaskedView, BlurView });

<TourProvider tours={tours} theme={{ blur: { enabled: true } }} components={{ Backdrop }}>
```

You pass the modules rather than the library importing them, because a library that probes for an
optional module with `require` reports a missing-module error to React Native's global error
handler, and an app with its own handler treats that as fatal and blanks the screen. Turning
`blur.enabled` on without mounting the blur backdrop keeps the dim scrim and logs one warning in
development naming what to install, never a blank overlay.

### zIndex

Defaults to 10000, which puts the tour above modals, sticky headers and toasts. Lower it if you
want the tour to sit *under* a fixed header. Without a z-index the scrim renders behind anything
positioned above 0, and that element stays clickable during the tour.

Set any `motion` duration to 0 to turn that animation off. Reduced motion is honoured
automatically on both platforms.

`easing` accepts `easeOutQuint`, `easeOut` or `linear`, and applies on React Native only. The web
host animates on a fixed curve identical to `easeOutQuint`. Every token, with its type, its
default and the four that differ per platform, is in the [Theme reference](./theme.md).

## Level 2: component slots

Replace a piece, keep the engine. Every slot gets typed props.

```tsx
<TourProvider components={{ Card, Backdrop, Progress }} tours={tours}>
```

```ts
type CardProps<Ctx = unknown> = {
  step: TourStep<Ctx>;
  index: number;
  total: number;
  rect: Rect | null;
  placement: CardPlacement;
  theme: Theme;
  isFirst: boolean;
  isLast: boolean;
  next(): void;
  prev(): void;
  skip(): void;
  stop(): void;
};
```

Web cards also receive `styled: boolean`.

The host positions the card for you. Your component renders the contents and, if it wants one,
an arrow using `placement.arrow`.

```tsx
function Card({ step, index, total, next, isLast }: CardProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-lg">
      <h3 className="font-semibold">{step.title}</h3>
      <p className="text-sm text-gray-500">{step.body}</p>
      <div className="mt-3 flex justify-between">
        <span className="text-xs">{index + 1} of {total}</span>
        <button onClick={next}>{isLast ? "Done" : "Next"}</button>
      </div>
    </div>
  );
}
```

On React Native, `Backdrop` also receives `size`, the measured box the overlay actually covers.
Use it rather than `useWindowDimensions()`: under Android edge-to-edge the window it reports is
shorter than the screen by the system bars, and a scrim drawn to that height leaves a live strip
along the bottom.

`step.data` is an arbitrary object the library never reads. Put an image URL, a video, a CTA or a
translation key in it and pull it out in your card.

## Web: your own CSS

Every element carries a stable class as well as its data attribute, so an external stylesheet or a
Tailwind layer can target the overlay without going through the theme object.

| Class | Element |
| --- | --- |
| `tourkit-root` | The portalled wrapper |
| `tourkit-overlay` | The scrim with the cutout |
| `tourkit-shield` | The click blocker |
| `tourkit-card`, `tourkit-arrow` | The coach card and its beak |
| `tourkit-title`, `tourkit-body`, `tourkit-next` | Inside the card |
| `tourkit-progress`, `tourkit-progress-step` | The progress indicator |
| `tourkit-ring` | The attention ring, when enabled |

Add your own on top through the provider:

```tsx
<TourProvider classNames={{ root: "my-tour", overlay: "my-scrim", card: "my-card" }} tours={tours}>
```

Yours are appended, never substituted, so `tourkit-card my-card` is what lands in the DOM.

## Level 3: headless

`useTourState()` hands you everything and renders nothing.

```tsx
const { status, step, stepIndex, total, rect, theme, next, prev, skip, stop } = useTourState();
```

You draw the overlay, the card and the highlight yourself. `@tourkit/core` ships no UI at all, so
this is also the path if you are building a renderer for another framework.

## Web: unstyled mode

driver.js makes you override CSS classes. react-joyride makes you fill in a `styles` object. Both
fight a design system.

```tsx
import { TourProvider } from "@tourkit/react/unstyled";
```

Nothing changes structurally. `position`, `inset`, `clip-path`, `left` and `top` still apply,
because without them the overlay does not work. Every colour, font, radius, padding and shadow is
dropped.

Style it with your own CSS through the data attributes:

| Attribute | On |
| --- | --- |
| `data-tourkit="root"` | The portal root. Also carries `data-tourkit-state` and `data-tourkit-interaction`. |
| `data-tourkit="shield"` | The full-screen blocker. Absent in `passthrough`. |
| `data-tourkit="backdrop"` | The clipped scrim. |
| `data-tourkit="card-wrap"` | The positioned wrapper. Carries `data-tourkit-placement`. |
| `data-tourkit="card"` | The card itself. |
| `data-tourkit="arrow"` | The arrow. |
| `data-tourkit="title"`, `"body"`, `"footer"`, `"next"` | Card parts. |
| `data-tourkit="progress"`, `"progress-dot"` | Progress. Dots carry `data-tourkit-done`. |
| `data-tourkit="hole-catcher"` | The press catcher in `advance-on-press`. |

```css
[data-tourkit="card"] { @apply rounded-2xl bg-white p-5 shadow-xl; }
[data-tourkit="backdrop"] { background: rgb(0 0 0 / 0.6); }
[data-tourkit-placement="top"] [data-tourkit="arrow"] { background: white; }
```

There is no stylesheet to import in either mode. A package that ships CSS breaks in several
bundlers and in server rendering, so the default entry uses inline styles instead.
