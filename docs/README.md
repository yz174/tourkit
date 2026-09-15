# tourkit docs

**Start**

- [Getting started](./getting-started.md) — install, then a working tour
- [Adding tourkit to an existing app](./integration.md) — Next.js, Vite, Expo Router, and where the provider goes
- [Step reference](./steps.md) — every field on a step
- [Provider reference](./provider.md) — every prop, every event

**Guides**

- [Customization](./customization.md) — theme, slots, headless, unstyled
- [Navigation](./navigation.md) — Next.js, React Router, Expo Router
- [Interaction](./interaction.md) — blocking, passthrough, advance on press
- [React Native](./react-native.md)
- [Hints](./hints.md) — standalone pointers, web only
- [Accessibility](./accessibility.md) — keyboard, focus, screen readers, reduced motion
- [Recipes](./recipes.md)

**Power tools**

- [Recording a tour](./recorder.md) — click through your app, get a tour file
- [The tourkit skill](./skill.md) — install it, and what each command does
- [When a target breaks](./self-healing.md) — fingerprints and healing
- [Ask and be shown](./ai.md) — a question becomes a tour of the real interface

**Reference**

- [API reference](./api.md) — every export, by package
- [Theme reference](./theme.md) — every token, its type and its default
- [Testing](./testing.md) — the config, the DOM, the real browser
- [Troubleshooting](./troubleshooting.md) — symptoms and what causes them
- [Migrating](./migrating.md) — driver.js, react-joyride, react-native-copilot

Every non-router code sample on these pages is mirrored in `examples/docs-samples/` and
typechecked in CI, so the docs cannot drift away from the API.

These are the docs as content. The site that renders them is live at
<https://tourkit-chi.vercel.app/docs>. See `FINDINGS.md` for what each milestone verified.
