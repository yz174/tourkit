# React Native

tourkit's React Native renderer, `@tourkit/native`, takes the same `TourConfig` and
`TourStep` shape as the web renderer. Everything on the other pages applies. This page
covers what differs on React Native: peer dependencies, `TourTarget` in place of CSS
selectors, safe areas, and how measurement works without a DOM.

## Install

```bash
npm i @tourkit/native
```

Peer dependencies, using whatever version you already have:

| Package | Range | Why |
| --- | --- | --- |
| `react` | `>=18` | |
| `react-native` | `>=0.74` | |
| `react-native-svg` | `>=13` | Draws the scrim and cuts the hole. |
| `react-native-reanimated` | `>=3.16` | Animates the hole on the UI thread. |

No other native module is required. There is nothing to link and no config plugin.

Reanimated needs its Babel plugin, which you almost certainly already have:

```js
module.exports = { plugins: ["react-native-reanimated/plugin"] };
```

## Targets are components, not selectors

```tsx
import { TourTarget } from "@tourkit/native";

<TourTarget id="post-ride" radius={22} padding={6}>
  <Pressable style={styles.primary}>
    <Text>Post a ride</Text>
  </Pressable>
</TourTarget>;
```

| Prop | Meaning |
| --- | --- |
| `id` | Matches `step.target`. |
| `radius` | The corner radius of this element, used when a step says `radius: "auto"`. |
| `padding` | Default space around this element, overridable per step. |
| `style` | Passed to the wrapper. |

**The wrapper style must carry layout only.** `TourTarget` renders a wrapping `View`. Give it
`flex`, `alignSelf` or `margin`, never `padding`, or you will double the padding your child
already applies.

**Margins on the child are handled for you.** A wrapper's box includes its child's margins, so a
button with `marginTop: 6` would otherwise get a hole sitting 6dp above it. `TourTarget` measures
the child's own box instead, through the `onLayout` it passes down, falling back to a ref.

That works for any host element and for any component that forwards one of the two. Wrap your own
component that forwards neither and the hole falls back to the wrapper, margins included, with a
warning in development. One line fixes it:

```tsx
function PlannerCard({ onLayout }: { onLayout?: (event: LayoutChangeEvent) => void }) {
  return <View onLayout={onLayout} style={styles.card}>{/* ... */}</View>;
}
```

`collapsable={false}` is set for you. Without it Android flattens the wrapper out of the native
hierarchy and there is nothing left to measure.

## Safe area insets

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";

<TourProvider tours={tours} insets={useSafeAreaInsets()}>
```

Defaults to zeros. This is a prop rather than a dependency so the package does not force
`react-native-safe-area-context` on apps that do not already use it.

## Remembering that a tour finished

Web falls back to `localStorage`. React Native has no equivalent, so nothing is persisted until
you pass a storage adapter, and without one a tour restarts every time.

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StorageAdapter } from "@tourkit/core";

export const tourStorage: StorageAdapter = {
  get: (key) => AsyncStorage.getItem(key),
  set: (key, value) => AsyncStorage.setItem(key, value),
  remove: (key) => AsyncStorage.removeItem(key),
};
```

```tsx
<TourProvider tours={tours} storage={tourStorage}>
```

Any key-value store with those three methods works. See
[showing a tour only once](./recipes.md#showing-a-tour-only-once).

## Scrolling to a target

Pass the scroll container's ref and the tour brings off-screen targets into view.

```tsx
import { type ComponentRef, useRef } from "react";
import { ScrollView } from "react-native";

type Scroller = ComponentRef<typeof ScrollView>;

function Screen() {
  const scrollRef = useRef<Scroller | null>(null);
  return (
    <TourProvider tours={tours} scrollRef={scrollRef}>
      <ScrollView ref={scrollRef}>{/* ... */}</ScrollView>
    </TourProvider>
  );
}
```

Note `ComponentRef<typeof ScrollView>`, not `ScrollView`. In current React Native types the
imported name is the component, not the instance, and `useRef<ScrollView>` will not typecheck.

Per-step control:

```ts
{ id: "row", target: "row-18", scroll: { block: "start" } }
{ id: "fixed", target: "header", scroll: false }
```

## How measurement works

React Native emits no event for "this view moved". `onLayout` fires when a view's own layout
changes, but scrolling does not change layout, it changes a scroll offset, so the target moves on
screen and nothing tells you.

So two things happen. `onLayout` handles mount, rotation, `LayoutAnimation` and font scaling,
which is a real event and costs nothing. While a step is active, a Reanimated frame callback
measures that one target on the UI thread, with no bridge hop and no React render.

That second part is sampling, and it is deliberate. Sampling on the UI thread at frame rate keeps
the hole locked to a scrolling target. Sampling on the JS thread a few times a second is cheaper
overall but trails by up to a fifth of a second, which reads as broken. Only one target is
measured, and only while its step is on screen.

You wire up nothing for this.

## Accessibility

The overlay sets `accessibilityViewIsModal`, announces each step, and moves screen-reader focus
to the card when the step changes. Reduced motion is read from `AccessibilityInfo` and switches
the hole from animating to jumping.

## What is not here yet

- The blur backdrop. It needs two more native modules and forces every consumer through a
  rebuild for a cosmetic gain. The dim backdrop needs nothing beyond `react-native-svg`.
- `placement: "left"` and `"right"`. They fall back to `auto`, because a 320px card does not fit
  beside anything on a 390px screen.
- Multiple holes in one step.

## Recording

`tourkit record` works here, with one limit that shapes how you use it: the native recorder can
only capture taps on mounted `TourTarget`s, because a production build has no queryable view tree
to resolve anything else against. You wrap first, then record. See
[Recording a tour](./recorder.md#react-native).
