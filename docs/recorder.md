# Recording a tour

Writing a tour by hand means typing selectors and copy for every step. The recorder does the
tedious half: you click through your app in the order a new user would, and it writes the file.

On the web nothing is prepared first. Install the two packages below, mount the recorder once,
and from then on any element you click is recorded and resolves again when the tour runs: no
attributes, no wrappers, no edits to your markup. On React Native it works the other way round,
and [that section](#react-native) says why.

The output is a normal tour file. You edit the wording and commit it.

## How it works

```
tourkit record                        # @tourkit/cli, in your terminal
   starts a local server on 127.0.0.1:5178
        ↓
<TourRecorder />                      # @tourkit/react, inside your app
   asks whether it is running, and shows itself
        ↓
press Record, click through your app, press Save
        ↓
src/tour/your-tour.tour.ts
```

Nothing is uploaded anywhere. The server runs on your machine and writes a file into your repo.

## Two packages, one flow

Recording needs both halves, and neither works alone.

| Package | Where it runs | What it does |
| --- | --- | --- |
| `@tourkit/react` or `@tourkit/native` | inside your app | `<TourRecorder />`, the panel that captures clicks and posts the recording |
| `@tourkit/cli` | your terminal | the local server that answers the handshake and writes the tour file |

```bash
npm i @tourkit/react      # or @tourkit/native
npm i -D @tourkit/cli     # build-time only, nothing imports it at runtime
```

The CLI ships a single binary and no runtime code. It never renders anything, never injects
anything into your app, and cannot record on its own: installing it alone gets you a server
with nothing on the other end.

## Set it up

`tourkit init` mounts the recorder for you, inside the `provider.tsx` it writes. If you are wiring
it by hand, render it once in development, anywhere inside `TourProvider`:

```tsx
import { TourRecorder } from "@tourkit/react";

{process.env.NODE_ENV === "development" ? <TourRecorder name="Driver onboarding" /> : null}
```

Leave it mounted. The panel polls `GET /status` and renders only while the CLI is answering, so
it appears when you run `tourkit record` and disappears when you stop it. Pass `autoShow={false}`
to render it unconditionally, which is what you want for the clipboard flow with no server.

Then, in a second terminal, next to your dev server:

```bash
tourkit record src/tour
```

The terminal says what it is waiting for, and names your app when it connects:

```
tourkit: listening on http://127.0.0.1:5178
tourkit: tours will be written to src/tour
tourkit: waiting for your app. Run it in development with <TourRecorder /> mounted.
tourkit: app connected (http://localhost:3000). Press Record in the panel.
```

The panel sits bottom-right. Press **Record**, click the elements you want the tour to visit,
then press **Save**. Clicks on the panel itself are ignored, and while recording your app's own
click handlers do not fire, so you can safely click a Delete button without deleting anything.

| Button | What it does |
| --- | --- |
| Record / Stop | Starts and stops capturing clicks |
| Undo | Drops the last captured step |
| Save | Posts the recording to `tourkit record` |
| Copy | Copies the recording JSON to the clipboard, for when the server is not running |

If you cannot run the CLI, use **Copy** with `autoShow={false}` and paste the JSON wherever you
like. `onFinish` also receives the recording, so you can handle it yourself.

## What it can reach on the web

Anything in the DOM, once the two packages are in place, with nothing prepared in advance. You do not add attributes before recording,
you do not wrap elements, and you do not touch your markup at all. Click a heading, a paragraph,
a table cell, an icon inside an SVG: each one is recorded as a target and resolves again when the
tour runs, in a production build with hashed class names and minified output.

The order a target is written in is the only thing that changes: an element carrying a
`data-tour-id` is recorded under that id, and everything else gets a generated CSS selector plus
a fingerprint to heal it. Both run. The id is the one that survives a refactor, which is why the
CLI names the selector steps when it writes the file.

Three things resolve to something other than what you clicked:

| You click | The recorder writes |
| --- | --- |
| inside a shadow root | the host element, because the DOM retargets the event at the boundary |
| something painted on a `<canvas>` | the `<canvas>` itself, since the drawing has no node |
| inside an SVG | that exact node, `circle`, `path` and all |

None of those are fixable from a click listener, and none of them prevent a step: a spotlight on
the web component or the canvas is usually the step you wanted anyway.

## Running it, whatever your package manager is

`npx tourkit` only works when npm wrote the shim it looks for. Bun on Windows writes `tourkit.exe`
and `tourkit.bunx` instead, and npx then tries to fetch a package called `tourkit` from the
registry and fails with a 404. Use the runner that matches your install:

```bash
bunx tourkit record src/tour        # bun
npx @tourkit/cli record src/tour    # npm, scoped name always resolves
pnpm exec tourkit record src/tour   # pnpm
```

A `"record": "tourkit record src/tour"` script in `package.json` sidesteps the question.

## React Native

Same CLI, same file format. The pairing is the same too — `@tourkit/native` for the panel,
`@tourkit/cli` for the server — with the import changing:

```tsx
import { TourRecorder } from "@tourkit/native";

{__DEV__ ? <TourRecorder name="Driver onboarding" /> : null}
```

Two things differ, both because there is no DOM.

**It records `TourTarget`s only, so it cannot discover anything for you.** A tap is hit-tested
against every mounted `TourTarget`, and the smallest box containing the point wins, so a target
nested inside another records as the inner one. A tap on anything else records nothing and the
panel says so.

That is a real limit, not a rough edge, and it is worth knowing before you reach for the recorder
on native. Web tours resolve a CSS selector against a live document, so a recording can point at
an element nobody prepared. React Native has no queryable view tree in a production build — the
whole Fabric surface available to JavaScript is `dispatchCommand`, `findNodeAtPoint`, `measure`,
`sendAccessibilityEvent` and `setIsJSResponder` — so a tour can only find a view that registered
itself through a ref. That registration is what `TourTarget` does, and nothing can replace it.

The consequence: you must wrap an element before you can record it, which means you already know
which elements the tour visits. On native the recorder saves you the ordering and the labels, not
the discovery. Writing the steps by hand is often the shorter path, since the ids are yours
already:

```ts
{ id: "post", target: "post-ride", title: "Post a ride" }
```

Reach for it when a flow crosses several screens and you want the order and routes captured
without switching back to the editor.

**It finds your machine through Metro.** The endpoint host is read from Metro's script URL, which
is by definition the machine running the CLI. A simulator therefore needs nothing, and a physical
device needs the server bound to more than loopback:

```bash
tourkit record src/tour --host
```

That binds `0.0.0.0` and prints the LAN address your phone can reach. Pass `endpoint` on the
component to override the whole thing.

## What gets written

```ts
import type { TourConfig } from "@tourkit/core";

export const driverOnboarding: TourConfig = {
  id: "driver-onboarding",
  version: 1,
  steps: [
    {
      id: "my-rides",
      target: "my-rides",
      title: "My rides",
    },
    {
      id: "done",
      target: null,
      title: "That is the tour",
    },
  ],
};
```

A closing step with no target is added for you. Step ids come from the element's label, then its
text, then its target, and are made unique. Routes are written only when the recording crossed
more than one, so a single-page tour stays uncluttered.

Running the command again for the same tour name overwrites that file. Rename the tour, or move
the file, once you are happy with it.

## Targets, and why the CLI nags you

Each click is recorded as a target in this order:

1. The element's `data-tour-id`, if it has one.
2. Otherwise a generated CSS selector.

A generated selector works, but it breaks the moment someone reorders a list or renames a class.
So the CLI tells you which steps fell back to one:

```
tourkit: wrote src/tour/driver-onboarding.tour.ts with 5 recorded steps
tourkit: 2 of them use a CSS selector rather than a data-tour-id:
  - #hero
  - #in-modal
tourkit: selectors break when the markup changes. Add data-tour-id to those elements.
```

Add the attribute to those elements and record again. Two minutes now saves a broken tour later.

The selector generator prefers, in order: a unique `data-testid`, a unique `id`, then a path built
from tag names, `nth-of-type` and semantic class names. It deliberately ignores hashed CSS-module
classes and numeric utility classes, since neither survives a refactor.

## From a recording to a shipped tour

The generated file is a draft. It resolves and it runs, but two things in it are wrong for
production: any target that fell back to a selector, and every title, which is scraped text rather
than copy. Five steps, once per tour:

**1. Move it out of the recorder's directory.** Recording the same tour name again overwrites that
path, so a file you have started editing does not belong there.

```bash
mv src/tour/site-tour.tour.ts lib/tours/site-tour.ts
```

**2. Give the selector steps a `data-tour-id`.** The CLI already named them for you.

```tsx
<div className="body" data-tour-id="why-one-file">
```

**3. Point the steps at those ids, and delete the fingerprint that came with them.** A fingerprint
insures a selector. An id you control cannot drift, so there is nothing left to insure.

```ts
{ id: "why", target: "why-one-file", title: "Web and native, one file" }
```

**4. Write the copy.** `title` is the line a user reads, and the recorder can only guess it from
the element's text. Add a `body` where a step earns a second line, and drop the ones that do not.

**5. Register it and start it.**

```tsx
import { siteTour } from "@/lib/tours/site-tour";

<TourProvider tours={[siteTour]} context={context}>
```

```tsx
const { start } = useTour();

<button type="button" onClick={() => start("site-tour")}>
  Show me around
</button>
```

Only on a first visit, if that is the shape you want:

```tsx
import { readRecord } from "@tourkit/core";

const record = await readRecord(storage, siteTour);
if (record?.outcome !== "completed") start("site-tour");
```

From then on it is an ordinary source file. Bump its `version` whenever you change the steps, so a
saved position from the old shape is discarded rather than resumed onto the wrong step.

## After it ships

**The recorder does not reach production, as long as you gate it.** The dev check is what does
the work: bundlers fold the branch away and then drop the component, because every package sets
`sideEffects: false`. Verified by building this site and grepping the client chunks — the string
`tourkit recorder` appears once when the component is mounted unconditionally, and not at all
behind the gate.

```tsx
{process.env.NODE_ENV === "development" ? <TourRecorder /> : null}   // web
{__DEV__ ? <TourRecorder /> : null}                                  // react native
```

Mounting it ungated ships a dev tool to your users. It stays invisible, since nothing answers its
handshake in production, but it is in the bundle.

**`@tourkit/cli` belongs in `devDependencies`.** It is a build-time tool that writes files into
your repo. Nothing imports it at runtime.

```bash
npm i -D @tourkit/cli
```

**Adding a step later.** Recording the same tour name overwrites the file, wording and all, so
record the new pass under a different name and copy the step across:

```bash
tourkit record lib/tours     # name it "site tour v2" in the panel
```

Then bump `version` on the tour you edited. A saved position from the old shape is discarded
rather than resumed onto a step that has moved.

**Keep the targets honest.** A step whose target disappears is skipped after `gateTimeoutMs` and
emits `target:timeout`, which is a silent hole in a tour nobody is watching. Fail your CI on it:

```tsx
<TourProvider
  tours={tours}
  onEvent={(name, event) => {
    if (name === "target:timeout") throw new Error(`tourkit: no target for step ${event.stepId}`);
  }}
>
```

A browser test that walks the tour end to end then breaks the build when someone deletes an
element the tour points at. Watch for the healing warning in the console too: a step matched by
fingerprint is a step whose target is already wrong.

**What to look at once real users see it.** Every event carries `{ tourId, stepId, stepIndex,
total }`. `step:skip` clustering on one step means that step is broken or unwanted, and the gap
between `tour:start` and `tour:complete` is the only completion rate worth quoting. See
[Provider reference](./provider.md) for the full list.

## Drafting the copy

```bash
npx tourkit record src/tour --draft
```

With `--draft`, the tour name and the recorded elements go to a model, which writes a title and
an optional body for each step. Titles are capped at six words and bodies at one sentence.

It needs `@tourkit/ai` and `@anthropic-ai/sdk` installed and a key in the environment. Without
`--draft` the titles come from each element's label or text, which is often good enough to edit
from.

Drafted copy is a starting point. Read it before you ship it; a model looking at `<button>Go</button>`
does not know what your product calls that action.

## Why there is no browser extension

The original plan was a Chrome extension that captured clicks on any page. An in-app component is
better here for one reason: tourkit consumers own the app they are touring. An extension adds a
store listing, a review cycle, a separate install, and a permissions prompt, and buys nothing that
a component rendered in development does not already do. It would also be the only part of the
project nobody could test.
