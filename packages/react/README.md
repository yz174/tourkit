# @tourkit/react

DOM renderer for [tourkit](https://github.com/yz174/tourkit) app tours. One steps file runs in your
web app and, through `@tourkit/native`, in your React Native app.

```bash
npm i @tourkit/react
```

```tsx
import { TourProvider, useTour } from "@tourkit/react";

<TourProvider tours={[onboarding]}>
  <App />
</TourProvider>;
```

Mark what to point at with an attribute:

```tsx
<button data-tour-id="post-ride">Post a ride</button>
```

A portalled overlay cuts an animated `clip-path` hole over the target, Floating UI places the card
with flip and shift, and the target is tracked through `autoUpdate` and a `MutationObserver`. A step
whose selector has rotted is recovered by fingerprint rather than skipped. `@tourkit/react/unstyled`
ships structural styles only.

`<TourHint />` gives you standalone pulsing markers, independent of any tour.

Docs: [getting started](https://github.com/yz174/tourkit/blob/main/docs/getting-started.md) ·
[customization](https://github.com/yz174/tourkit/blob/main/docs/customization.md) ·
[hints](https://github.com/yz174/tourkit/blob/main/docs/hints.md) ·
[recipes](https://github.com/yz174/tourkit/blob/main/docs/recipes.md)

MIT.
