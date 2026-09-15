Mount the player in a project that already has tour files.

Run `detect.mjs` first. Its `player` field decides which section below applies.

## Plain DOM: Vue, Angular, Svelte, Ember, Astro, Qwik, Solid, plain HTML, Electron, Tauri

Needs `@tourkit/core` and `@floating-ui/dom`.

```ts
import { TourEngine } from "@tourkit/core";
import { mountTour, registerTarget } from "@tourkit/core/dom";
import { onboarding } from "./tours/onboarding.tour";

const engine = new TourEngine({ tours: [onboarding], context: {} });
mountTour(engine);

export { engine };
```

Put it in the module that runs once at startup, next to where the app is created:

| Framework | File |
|---|---|
| Vue | `src/main.ts`, after `app.mount()` |
| Angular | `src/main.ts`, after `bootstrapApplication(...).then(...)` |
| Svelte, SvelteKit | `src/routes/+layout.svelte` in `onMount`, or `src/main.ts` |
| Ember | an instance initializer |
| Astro | a `<script>` in the layout wrapping the toured pages |
| Qwik, Solid | the root component's mount effect |
| Electron, Tauri | the renderer entry, same as the web framework inside it |
| plain HTML | a `<script type="module">` before `</body>` |

Targets resolve three ways, in order: an id registered with `registerTarget`, a `data-tour-id` attribute, then a CSS selector. The attribute is the least code:

```html
<button data-tour-id="post-ride">Post a ride</button>
```

Use `registerTarget` when the element is created by a component that already has a reference to it:

```ts
const dispose = registerTarget("post-ride", element);
// call dispose() when the element goes away
```

`mountTour` returns `{ destroy() }`. Call it on teardown in anything with hot module replacement, or you get two players after a reload.

## React, Next, Remix

Needs `@tourkit/react`, which brings `@floating-ui/dom` itself.

```tsx
import { TourProvider } from "@tourkit/react";
import { onboarding } from "./tours/onboarding.tour";

export function App({ children }) {
  return <TourProvider tours={[onboarding]}>{children}</TourProvider>;
}
```

Put it at the root, inside the router so route-aware steps work, and outside any layout that unmounts. In Next's app router that is `app/layout.tsx` in a client component; `TourProvider` uses state and effects, so it needs `"use client"`.

Mark targets with the hook or the attribute:

```tsx
const ref = useTourTarget<HTMLButtonElement>("post-ride");
return <button ref={ref}>Post a ride</button>;
```

## React Native, Expo

Needs `@tourkit/native`, `react-native-svg` and `react-native-reanimated`. Follow reanimated's babel plugin setup or the spotlight will not animate.

```tsx
import { TourProvider } from "@tourkit/native";
```

Same root placement rule: inside the navigator, outside anything that unmounts.

## Starting a tour

```ts
engine.start("onboarding");          // plain DOM
const { start } = useTour();          // React and React Native
```

Tie it to a help menu item or a deliberate checkpoint. Not to first paint.

## When nothing appears

Work down this list in order. Each item rules out the one above it.

1. **Is the tour actually running?** `engine.getSnapshot().status` should be `active`, not `idle`. If it is `idle`, `start` was never called or the tour id is wrong.
2. **Status stuck at `resolving`?** The first step's target does not resolve. Check the `data-tour-id` spelling against the step's `target`, and that the element is in the document when the tour starts. A step whose target never appears times out and skips, and the engine emits `target:timeout`.
3. **Nothing painted at all with status `active`?** For plain DOM, `mountTour` was never called or was called before the DOM existed. For React, `TourProvider` is not an ancestor of anything rendering.
4. **Card in the top-left corner with no spotlight?** `@floating-ui/dom` is missing. It is an optional peer; install it explicitly.
5. **Player renders twice?** Hot reload mounted a second one. Call `destroy()` on teardown.
6. **Card behind your own UI?** Raise `theme.zIndex`. The default sits above most app chrome but below some modal libraries.
