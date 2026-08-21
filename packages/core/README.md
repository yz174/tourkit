# @tourkit/core

The engine behind [tourkit](https://github.com/yz174/tourkit) app tours. No React, no DOM, no
React Native, no dependencies.

You install this directly only if you are building your own renderer. `@tourkit/react` and
`@tourkit/native` both pull it in.

```ts
import { TourEngine, mergeTheme } from "@tourkit/core";
```

It owns step resolution and `when` predicates, promise-based gates with per-step timeout policies,
route handling through a nav adapter, theme merging across provider, tour and step, resume from
persisted progress, and a `useSyncExternalStore`-shaped subscription.

Docs: [getting started](https://github.com/yz174/tourkit/blob/main/docs/getting-started.md) ·
[steps](https://github.com/yz174/tourkit/blob/main/docs/steps.md) ·
[customization](https://github.com/yz174/tourkit/blob/main/docs/customization.md)

MIT.
