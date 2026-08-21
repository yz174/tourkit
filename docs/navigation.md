# Navigation

A step can declare the route it belongs on. If the app is somewhere else, the tour navigates
there and waits for the target before showing anything.

```ts
{ id: "inbox", target: "inbox", route: "/inbox", title: "Your messages" }
```

The library does not import your router. You hand it two things: where you are, and how to move.

```ts
import { createNavAdapter } from "@tourkit/core";

const nav = createNavAdapter({
  pathname: currentPath,
  navigate: (route) => goTo(route),
});
```

Then pass it to the provider:

```tsx
<TourProvider tours={tours} nav={nav}>
```

Omit `nav` entirely if no step declares a `route`.

## Matching

`createNavAdapter` takes an optional `match` deciding whether the app is already on the step's
route. All three ignore case, a trailing slash, a query string and a hash.

| Strategy | `/inbox` matches | Use for |
| --- | --- | --- |
| `exact` (default) | `/inbox`, `/Inbox/`, `/inbox?page=2` | Next.js, React Router |
| `prefix` | the above plus `/inbox/archive` | Nested routes where children count as the same screen |
| `includes` | anything containing `inbox` | Expo Router |

## Next.js

```tsx
"use client";

import { createNavAdapter } from "@tourkit/core";
import { TourProvider } from "@tourkit/react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

export function Tours({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = useMemo(
    () => createNavAdapter({ pathname, navigate: (route) => router.push(route) }),
    [pathname, router],
  );

  return (
    <TourProvider tours={tours} nav={nav}>
      {children}
    </TourProvider>
  );
}
```

## React Router

```tsx
import { createNavAdapter } from "@tourkit/core";
import { TourProvider } from "@tourkit/react";
import { useLocation, useNavigate } from "react-router";
import { useMemo } from "react";

export function Tours({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const nav = useMemo(
    () => createNavAdapter({ pathname: location.pathname, navigate }),
    [location.pathname, navigate],
  );

  return (
    <TourProvider tours={tours} nav={nav}>
      {children}
    </TourProvider>
  );
}
```

## Expo Router

Use `includes`. Expo Router's `usePathname()` is inconsistent about whether group segments like
`(tabs)` appear, so `/carpooling` and `/(tabs)/carpooling` can both show up for the same screen.
Exact matching makes tours fail intermittently in a way that is painful to reproduce.

```tsx
import { createNavAdapter } from "@tourkit/core";
import { TourProvider } from "@tourkit/native";
import { router, usePathname } from "expo-router";
import { useMemo } from "react";

export function Tours({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const nav = useMemo(
    () =>
      createNavAdapter({
        pathname,
        navigate: (route) => router.push(route),
        match: "includes",
      }),
    [pathname],
  );

  return (
    <TourProvider tours={tours} nav={nav}>
      {children}
    </TourProvider>
  );
}
```

With `includes`, write route fragments rather than full paths:

```ts
{ id: "inbox", target: "inbox", route: "carpooling" }
```

Be aware that `includes` is deliberately loose. A fragment of `profile` also matches
`/profile-settings`. Pick fragments that are unique in your app.

## Why there is no adapter package

An earlier plan had `@tourkit/adapter-next`, `@tourkit/adapter-react-router` and
`@tourkit/adapter-expo-router`. Each would have been about fifteen lines wrapping one hook, and
each would have added a published package, a peer dependency and a version range to keep
compatible with a router we do not control. The only real difference between them is the match
strategy, so they collapsed into one function and the three snippets above.

## Ordering

`onAdvance` is awaited before the step index changes, so a navigation you trigger there has
already started when the next step becomes active. The next step's own `route` is handled before
its gate runs. Either way the target is measured on the screen it actually lives on.
