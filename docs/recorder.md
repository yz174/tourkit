# Recording a tour

Click through your app. Get a tour file.

There is nothing to install into your app and nothing to mount. The recorder is a plain DOM script
injected into your HTML entry while you record, and removed afterwards.

## How it works

```
detect        read the project: framework, dev server, HTML entry
start         a local server on 127.0.0.1:5178
inject        write <script src=".../recorder.js"> into your HTML
              your dev server hot-reloads; a capture bar appears
record        click the things a new user should be shown, in order
save          the recording is posted back and written to disk
emit          .tour.json becomes .tour.ts
remove        the script tag comes out, byte for byte
```

The [tourkit skill](./skill.md) drives all of that. Run `/plugin install tourkit@tourkit`, then ask
it to record a tour. You can also run the scripts by hand; see
[recording without an agent](./skill.md#recording-without-an-agent).

## Any framework

Because the capture bar is plain DOM, the only requirement is that something serves HTML.

| Works | How the tag gets in |
| --- | --- |
| Vue, Svelte, Solid, Qwik, plain HTML | `index.html` |
| Angular | `src/index.html` |
| Ember | `app/index.html` |
| SvelteKit | `src/app.html` |
| Next | `app/layout.tsx` or `pages/_document.tsx` |
| Nuxt | `app.vue` |
| Remix | `app/root.tsx` after `<Scripts />` |
| Astro | the layout wrapping the pages you are recording |
| Electron, Tauri | the renderer's HTML, same as the web framework inside it |
| React, Vite | `index.html` |

In a JSX or TSX document an HTML comment is not a comment, so the markers are written as
`{/* tourkit-record-start */}` and the tag as a self-closing `<script ... />`.

Before 0.3.0 this was `<TourRecorder>`, a React component you mounted yourself. That component is
gone. See [migrating](./migrating.md#removed-from-tourkitreact).

## What the bar does

Three buttons: Record, Undo, Save.

The bar stays hidden until the server answers its handshake, so a tag left behind by accident shows
nothing once recording is over. It polls `GET /status` every two seconds, the same handshake the
React Native panel speaks.

**While recording, clicks do not do anything.** The listener runs on the capture phase and calls
both `preventDefault` and `stopPropagation`, so clicking a real Delete button records the button
rather than deleting the row. Clicks on the bar itself are ignored.

The route is read from `location.pathname` at click time. A single-page app that changes route
mid-recording records the right route per step with no history patching.

## What it can reach on the web

Every click resolves to a target three ways, best first:

1. **A `data-tour-id` attribute.** Stable across refactors. This is what you want.
2. **An id registered with `useTourTarget` or `registerTarget`.** The innermost registered ancestor
   wins, so a registered row inside a registered list records as the row.
3. **A CSS selector.** Generated from `data-testid`, a stable `id`, or a path of tag and class
   segments, and verified unique against the document before it is used.

A selector target also gets a **fingerprint**: tag, visible text, role, aria-label, the nearest
heading and its index among siblings. When the selector later fails, the player scores candidates
against the fingerprint and takes the single best match, warning once in the console. That is a
safety net, not a fix. See [when a target breaks](./self-healing.md).

## Targets, and why the tooling nags you

A recording that produced a selector is a tour with a short shelf life. The selector encodes
today's markup; the next refactor breaks it silently, the step times out, and the user sees a
shorter tour with no error.

`emit.mjs` reports every brittle target in its output:

```json
{"ok":true,"wrote":"src/tours/recorded.tour.ts","steps":6,"brittle":["#hero","#in-modal"]}
```

The fix is to open the component, add `data-tour-id` to the element, and repoint the step. The
skill does that for you and tells you which files it edited. It never edits a component silently.

## What gets written

Two files land in your tour directory on Save:

| File | What it is |
| --- | --- |
| `<name>.recording.json` | The raw capture: tag, label, role, text, route, fingerprint per step |
| `<name>.tour.json` | A runnable tour, with placeholder copy derived from each element's label |

`.tour.json` is canonical. `emit.mjs` turns it into a `.tour.ts`:

```ts
import type { TourConfig } from "@tourkit/core";

export const recorded: TourConfig = {
  id: "recorded",
  version: 1,
  steps: [
    {
      id: "post-a-ride",
      target: "post-ride",
      title: "Post a ride",
    },
    {
      id: "hero-button",
      target: "#hero",
      title: "Hero button",
      fingerprint: {
        tag: "button",
        text: "Hero button",
      },
    },
    {
      id: "done",
      target: null,
      title: "That is the tour",
    },
  ],
};
```

Never hand-edit a `.tour.ts`. The next `emit` overwrites it. Edit the `.tour.json` and re-emit.

The last step with no target is the sign-off: the card centres and the cutout collapses.

## From a recording to a shipped tour

The placeholder copy is the element's own label, which is the one thing the user can already see.
It is a starting point, not a deliverable.

| Recorded | Shipped |
| --- | --- |
| "Post button" | "Offer a seat" |
| "Filters" | "Narrow your history" |
| "Avatar" | "Billing lives here" |

Writing the second column needs the component, not the recording. That is the skill's `author`
command: it greps for each element, reads the component and the handler it calls, and writes the
copy from what the code does. See [the skill](./skill.md#commands).

Behaviour that cannot be recorded, because it is functions rather than data, goes in a hand-written
module merged with `withBehavior`:

```ts
import { withBehavior } from "@tourkit/core";
import { recorded } from "./recorded.tour";

export const onboarding = withBehavior(recorded, {
  billing: { when: (context) => context.plan === "pro" },
  history: { gate: waitForFilter, gateTimeoutMs: 3000 },
});
```

## React Native

There is no HTML to inject into, so native keeps its own panel. `@tourkit/native` ships it, and the
skill's server answers the same `GET /status` handshake it already polls.

```tsx
import { TourRecorder } from "@tourkit/native";

{__DEV__ ? <TourRecorder name="Driver onboarding" /> : null}
```

Two things differ from web, both because there is no DOM.

**It records `TourTarget`s only, so it cannot discover anything for you.** A tap is hit-tested
against every mounted `TourTarget`, and the smallest box containing the point wins, so a target
nested inside another records as the inner one. A tap on anything else records nothing and the
panel says so.

That is a real limit, not a rough edge. Web tours resolve a CSS selector against a live document,
so a recording can point at an element nobody prepared. React Native has no queryable view tree in
a production build; the whole Fabric surface available to JavaScript is `dispatchCommand`,
`findNodeAtPoint`, `measure`, `sendAccessibilityEvent` and `setIsJSResponder`, so a tour can only
find a view that registered itself through a ref. That registration is what `TourTarget` does, and
nothing can replace it.

The consequence: you must wrap an element before you can record it, which means you already know
which elements the tour visits. On native the recorder saves you the ordering and the labels, not
the discovery. Writing the steps by hand is often the shorter path, since the ids are yours
already:

```ts
{ id: "post", target: "post-ride", title: "Post a ride" }
```

Reach for it when a flow crosses several screens and you want the order and routes captured without
switching back to the editor.

**It finds your machine through Metro.** The endpoint host is read from Metro's script URL, which
is by definition the machine running the server. A simulator needs nothing. A physical device needs
the server bound to more than loopback:

```bash
node skills/tourkit/scripts/record-server.mjs start --port 5178 --out src/tours --host 0.0.0.0
```

That binds every interface and the start response says so. Anyone else on that network can reach it
too, and a recording writes a file, so stop the server when you are done. Pass `endpoint` on the
component to override the host entirely.

## After it ships

A tour breaks quietly: the target stops resolving, the step times out, the engine emits
`target:timeout`, and the step is skipped. Nobody sees an error.

The skill's `heal` command finds those before a user does: it reads every `.tour.json`, greps each
target, and reports the ones that resolve nowhere, resolve twice, or still use a selector. See
[when a target breaks](./self-healing.md).

## Why there is no browser extension

An extension would record against the rendered page with no access to your source, so every target
would be a CSS selector and every title would be the element's own text. The two things that make a
recording worth shipping, a stable `data-tour-id` and copy grounded in what the code does, both
need the repository. That is why recording lives next to your source rather than in the browser.
