# Getting started

tourkit is a product tour and onboarding walkthrough library for React and React Native.
One steps file, two platforms. Write the tour once and run it in your web app and your React
Native app.

## Install

Web:

```bash
npm i @tourkit/react
```

React Native:

```bash
npm i @tourkit/native
```

`@tourkit/core` comes along with either one. You never install it directly unless you are
building your own renderer.

The CLI is a separate, dev-only install, and it works alongside a renderer rather than replacing
one: it writes tour files and runs the record server, while the `TourRecorder` component that
captures your clicks ships in `@tourkit/react` and `@tourkit/native`.

```bash
npm i -D @tourkit/cli
```

React Native also needs `react-native-svg` and `react-native-reanimated`, which most apps already
have. They are peer dependencies, so they use whatever version you already run.

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

### 2. Wrap your app once

```tsx
import { TourProvider } from "@tourkit/react";

<TourProvider tours={[onboarding]} context={{ plan: "pro" }}>
  <App />
</TourProvider>;
```

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

```tsx
import { useTour } from "@tourkit/react";

function Help() {
  const { start, running, stop } = useTour();
  return <button onClick={() => start("onboarding")}>{running ? "Touring" : "Show me around"}</button>;
}
```

That is the whole surface: a provider, a target, a steps array, and `useTour`.

## What a step can point at

On web, `target` is tried in this order:

1. An id registered with `useTourTarget("post-ride")`
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
- [Migrating](./migrating.md) — from driver.js, react-joyride, react-native-copilot
