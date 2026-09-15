# Adding tourkit to an existing app

[Getting started](./getting-started.md) shows the four pieces. This page puts them in a real
codebase: which file each piece belongs in, where the client boundary falls, and how the tour
gets started the first time someone signs in.

Four framework walkthroughs follow. They differ in about six lines. Everything else is the same
on every stack, because the engine has no opinion about your router or your bundler.

## The shape

```
src/tour/tours.ts       plain data. No React import, no renderer import.
src/tour/provider.tsx   the client boundary. Wraps your app in <TourProvider>.
```

`tourkit init` writes exactly these two files. Splitting them is not a style preference. The steps
file is the thing both platforms share and the thing you translate, review and diff, so it must
not depend on a renderer. The provider file is the only place that does.

```ts
// src/tour/tours.ts
import type { TourConfig } from "@tourkit/core";

export type AppContext = { plan: "free" | "pro" };

export const onboarding: TourConfig<AppContext> = {
  id: "onboarding",
  version: 1,
  steps: [
    { id: "post", target: "post-ride", title: "Post a ride", body: "Offer a seat here." },
    { id: "done", target: null, title: "That is the tour" },
  ],
};

export const tours = [onboarding];
```

Export `tours` as a module constant rather than building the array inside a component. The
provider pushes `tours` into the engine from an effect, so a fresh array on every parent render
re-runs that effect and re-renders the overlay for no reason.

## Next.js, App Router

`TourProvider` holds state and reads the DOM, so it is a client component. Your app is not.

```tsx
// src/tour/provider.tsx
"use client";

import { TourProvider } from "@tourkit/react";
import type { ReactNode } from "react";
import { type AppContext, tours } from "./tours";

export function Tours({ children }: { children: ReactNode }) {
  return (
    <TourProvider<AppContext> tours={tours} context={{ plan: "free" }}>
      {children}
    </TourProvider>
  );
}
```

```tsx
// app/layout.tsx  (stays a server component)
import { Tours } from "@/tour/provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Tours>{children}</Tours>
      </body>
    </html>
  );
}
```

`children` reaches `Tours` as a prop, already rendered on the server. Wrapping the tree in a
client component does not turn the tree into client components. Your pages stay server
components and your bundle does not grow beyond tourkit itself.

`data-tour-id` is a plain DOM attribute, so server components can carry it:

```tsx
// app/page.tsx  (still a server component)
export default function Page() {
  return <button data-tour-id="post-ride">Post a ride</button>;
}
```

Only the thing that starts the tour needs to be a client component, because it calls a hook.

For steps that declare a `route`, add the nav adapter. See
[Navigation](./navigation.md#nextjs) for the `usePathname` wiring.

## Next.js, Pages Router

Same provider file, without the `"use client"` directive, mounted in `_app.tsx`:

```tsx
// pages/_app.tsx
import type { AppProps } from "next/app";
import { Tours } from "../src/tour/provider";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Tours>
      <Component {...pageProps} />
    </Tours>
  );
}
```

## Vite, Create React App, React Router

No boundary to think about. Wrap the root once.

```tsx
// src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import { Tours } from "./tour/provider";

createRoot(document.getElementById("root") as HTMLElement).render(
  <Tours>
    <App />
  </Tours>,
);
```

If you use React Router and any step declares a `route`, the provider has to sit inside the
router so it can call `useLocation`. See [Navigation](./navigation.md#react-router).

## Vue, Angular, Svelte, Ember, Astro, plain HTML

No React, no provider. Install the player and mount it once:

```bash
npm i @tourkit/core @floating-ui/dom
```

```ts
// src/tours/index.ts
import { TourEngine } from "@tourkit/core";
import { mountTour } from "@tourkit/core/dom";
import { onboarding } from "./onboarding.tour";

export const engine = new TourEngine({ tours: [onboarding], context: {} });

export const player = mountTour(engine);
```

Import that module from whatever runs once at startup:

| Framework | Where |
| --- | --- |
| Vue | `src/main.ts`, after `app.mount()` |
| Angular | `src/main.ts`, after `bootstrapApplication(...).then(...)` |
| Svelte, SvelteKit | `src/routes/+layout.svelte` in `onMount` |
| Ember | an instance initializer |
| Astro | a `<script>` in the layout wrapping the toured pages |
| Qwik, Solid | the root component's mount effect |
| Electron, Tauri | the renderer entry, same as the web framework inside it |
| plain HTML | a `<script type="module">` before `</body>` |

Mark targets with the attribute, exactly as in React:

```html
<button data-tour-id="post-ride">Post a ride</button>
```

Or register an element you already hold a reference to:

```ts
import { registerTarget } from "@tourkit/core/dom";

const dispose = registerTarget("post-ride", element);
// call dispose() when the element goes away
```

Start the tour from the engine:

```ts
engine.start("onboarding");
```

`mountTour` returns `{ destroy() }`. Call it on teardown anywhere hot module replacement is on, or
a reload leaves two players on the page.

`@floating-ui/dom` is an optional peer of `@tourkit/core`, so no package manager installs it for
you. Without it, importing `@tourkit/core/dom` throws. React apps get it through `@tourkit/react`,
and React Native never pulls it in.

## Expo Router

```tsx
// src/tour/provider.tsx
import { TourProvider } from "@tourkit/native";
import type { ReactNode } from "react";
import { type AppContext, tours } from "./tours";

export function Tours({ children }: { children: ReactNode }) {
  return (
    <TourProvider<AppContext> tours={tours} context={{ plan: "free" }}>
      {children}
    </TourProvider>
  );
}
```

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { Tours } from "../src/tour/provider";

export default function Layout() {
  return (
    <Tours>
      <Stack />
    </Tours>
  );
}
```

Three things are specific to React Native and none of them are optional:

1. `react-native-svg` and `react-native-reanimated` are peer dependencies and are native modules,
   so installing them means a rebuild, not a reload.
2. Reanimated needs `"react-native-reanimated/plugin"` in your Babel plugins.
3. Nothing is persisted until you pass a `storage` adapter, so a tour restarts on every launch.
   See [React Native](./react-native.md#remembering-that-a-tour-finished).

Expo Router's `usePathname()` is inconsistent about group segments, so use `match: "includes"`
if any step declares a `route`. See [Navigation](./navigation.md#expo-router).

## Where the provider goes

Above everything a tour can point at, and below anything that would remount it.

A provider that remounts loses the engine, because the engine is created once with lazy
`useState`. Mounting it inside a component that a route change unmounts, or inside a component
whose key changes on login, restarts every tour in progress. The root layout is the right place
on every stack.

One provider is enough for any number of tours. `tours` is an array and `start(id)` picks one.
Two providers means two engines, two overlays and two independent notions of what is running.

## Starting the tour

Anywhere inside the provider, from a client component:

```tsx
"use client";

import { useTour } from "@tourkit/react";

export function HelpButton() {
  const { start, running } = useTour();
  return (
    <button type="button" onClick={() => start("onboarding")}>
      {running ? "Touring" : "Show me around"}
    </button>
  );
}
```

For a first-run tour, check the saved record before starting. `useTourContext()` hands you the
same storage adapter the provider resolved, so you do not have to reconstruct it:

```tsx
"use client";

import { readRecord } from "@tourkit/core";
import { useTour, useTourContext } from "@tourkit/react";
import { useEffect } from "react";
import { onboarding } from "./tours";

export function FirstRun() {
  const { storage } = useTourContext();
  const { start } = useTour();

  useEffect(() => {
    void readRecord(storage, onboarding).then((record) => {
      if (record?.outcome !== "completed") start("onboarding");
    });
  }, [storage, start]);

  return null;
}
```

`start` is stable across renders, so that effect runs once. A tour the user abandoned halfway
resumes at the step they left, and emits `tour:resume` rather than `tour:start`.

Do not start a tour on the first paint of a page whose targets are still loading. The step waits
for its target and gives up after `gateTimeoutMs`, which is worse than starting a second later.
Gate on your own readiness flag instead.

## Server rendering

Nothing to configure. `TourHost` renders `null` until it has mounted on the client, so the server
HTML and the first client render agree and there is no hydration warning. There is also no flash,
because the overlay only exists while a tour is running.

`browserStorage()` reads `globalThis.localStorage` behind a guard and returns `null` when it is
absent, so importing the provider in a server bundle is safe.

## TypeScript

Annotate the context type on the provider when any step uses `when`, `gate`, `onEnter` or
`onAdvance`:

```tsx
<TourProvider<AppContext> tours={tours} context={{ plan: "free" }}>
```

Without it, TypeScript infers the context from the object literal, widening `"free"` to `string`,
and your predicates stop typechecking against the inferred type. The reason is explained in the
[Provider reference](./provider.md#annotate-the-context-type).

Nothing else needs configuring. There is no stylesheet to import, no plugin, no transformer and
no ambient type declaration.

## Checklist

- [ ] `tours.ts` exports plain data and imports nothing from a renderer
- [ ] `tours` is a module constant, not built inside a component
- [ ] The provider sits at the root and never remounts, or `mountTour` is called once at startup
- [ ] `<TourProvider<AppContext>>` is annotated if any step uses `when` or `gate`
- [ ] Every `target` matches a `data-tour-id`, a registered id, or a live selector
- [ ] `version` gets bumped whenever the steps change
- [ ] React Native: peer deps installed, Babel plugin added, app rebuilt, `storage` passed
- [ ] `onEvent` logs `target:timeout` in development, so a typo shows up as a warning

## Next

- [Step reference](./steps.md) for every field on a step
- [Provider reference](./provider.md) for every prop and event
- [Troubleshooting](./troubleshooting.md) when a target does not resolve
- [Testing](./testing.md) to hold the tour in place once it works
