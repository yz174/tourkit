# Getting started

tourkit is a product tour and onboarding walkthrough library. One steps file runs in any web
framework and in React Native. Write the tour once, run it everywhere.

## Install

React:

```bash
npm i @tourkit/react
```

Any other web framework, including Vue, Angular, Svelte, Ember, Astro, plain HTML, Electron and
Tauri:

```bash
npm i @tourkit/core @floating-ui/dom
```

React Native:

```bash
npm i @tourkit/native
```

`@tourkit/core` comes along with `@tourkit/react` and `@tourkit/native`. Install it directly only
for the framework-free player at `@tourkit/core/dom`, which needs `@floating-ui/dom` alongside it:
that is an optional peer, so no package manager adds it for you.

React Native also needs `react-native-svg` and `react-native-reanimated`, which most apps already
have. They are peer dependencies, so they use whatever version you already run.

Recording a tour is an agent skill rather than a package. See [the tourkit skill](./skill.md).

## A working tour in four steps

### 1. Describe the tour as data

Nothing here is web-specific or native-specific. This file is the thing both platforms share.

```ts
import type { TourConfig } from "@tourkit/core";

type AppContext = { plan: "free" | "pro" };

export const onboarding: TourConfig<AppContext> = {
  id: "onboarding",
  version: 1,
  steps: [
    { id: "post", target: "post-ride", title: "Post a ride", body: "Offer a seat here." },
    { id: "inbox", target: "inbox", title: "Messages", body: "Riders reach you here." },
    { id: "done", target: null, title: "That is the tour" },
  ],
};
```

### 2. Mount the player once

In React, wrap your app:

```tsx
import { TourProvider } from "@tourkit/react";

<TourProvider tours={[onboarding]} context={{ plan: "pro" }}>
  <App />
</TourProvider>;
```

In any other web framework, call `mountTour` from the module that runs at startup:

```ts
import { TourEngine } from "@tourkit/core";
import { mountTour } from "@tourkit/core/dom";

const engine = new TourEngine({ tours: [onboarding], context: { plan: "pro" } });
mountTour(engine);

export { engine };
```

`mountTour` returns `{ destroy() }`. Call it on teardown wherever hot module replacement is on, or
a reload leaves you with two players.

### 3. Mark what to point at

On web, add an attribute. Nothing else changes.

```tsx
<button data-tour-id="post-ride">Post a ride</button>
```

On React Native, wrap the element.

```tsx
import { TourTarget } from "@tourkit/native";

<TourTarget id="post-ride">
  <Button title="Post a ride" />
</TourTarget>;
```

### 4. Start it

In React:

```tsx
import { useTour } from "@tourkit/react";

function Help() {
  const { start, running, stop } = useTour();
  return <button onClick={() => start("onboarding")}>{running ? "Touring" : "Show me around"}</button>;
}
```

Anywhere else, call the engine:

```ts
engine.start("onboarding");
```

That is the whole surface: a player, a target, a steps array, and a way to start.

## What a step can point at

On web, `target` is tried in this order:

1. An id registered with `useTourTarget("post-ride")` in React, or `registerTarget("post-ride", el)`
   without it
2. A `data-tour-id="post-ride"` attribute
3. A CSS selector, so `#post-ride` and `.cta > button` both work

On React Native, `target` is the `id` you gave a `TourTarget`. There are no selectors, because
there is no DOM to query.

Using a plain id like `post-ride` keeps the same steps file working on both.

## Where to go next

- [Step reference](./steps.md) — every field on a step
- [Provider reference](./provider.md) — every prop
- [Customization](./customization.md) — theme tokens, component slots, headless, unstyled
- [Navigation](./navigation.md) — tours that cross routes
- [Interaction](./interaction.md) — blocking, letting clicks through, advancing on press
- [React Native](./react-native.md) — the things that differ on mobile
- [Recipes](./recipes.md) — targets that load late, targets in modals, showing a tour once
- [Recording a tour](./recorder.md) — click through your app instead of writing steps by hand
- [Migrating](./migrating.md) — from driver.js, react-joyride, react-native-copilot, or tourkit 0.2
