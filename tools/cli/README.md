# @tourkit/cli

Scaffolds [tourkit](https://github.com/yz174/tourkit) into an existing app, and records a tour from
your clicks.

```bash
npx tourkit init
npx tourkit record
```

`init` detects a Next, React, Expo or bare React Native project, names the packages to install, and
writes a tour config and a provider. It never overwrites a file; it reports what it kept.

`record` starts a local server. Render `<TourRecorder />` in development, click through your app, and
it writes a normal tour file into your repo. It reports which steps fell back to a CSS selector
rather than a `data-tour-id`, because those are the ones that break on a refactor, and attaches a
fingerprint to each so they can heal. `--draft` sends the recorded elements to a model to write the
titles and bodies, through the optional `@tourkit/ai` peer.

Docs: [recorder](https://github.com/yz174/tourkit/blob/main/docs/recorder.md) ·
[self-healing](https://github.com/yz174/tourkit/blob/main/docs/self-healing.md)

MIT.
