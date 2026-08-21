# Recording a tour

Writing a tour by hand means typing selectors and copy for every step. The recorder does the
tedious half: you click through your app in the order a new user would, and it writes the file.

The output is a normal tour file. You edit the wording and commit it.

## How it works

```
npx tourkit record          # starts a local server on 127.0.0.1:5178
        ↓
<TourRecorder /> in your app, in development only
        ↓
press Record, click through your app, press Save
        ↓
src/tour/your-tour.tour.ts
```

Nothing is uploaded anywhere. The server runs on your machine and writes a file into your repo.

## Set it up

```bash
npx tourkit record src/tour
```

Then render the recorder somewhere in development:

```tsx
import { TourRecorder } from "@tourkit/react";

{process.env.NODE_ENV === "development" ? <TourRecorder name="Driver onboarding" /> : null}
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

If you cannot run the CLI, use **Copy** and paste the JSON wherever you like. `onFinish` also
receives the recording, so you can handle it yourself.

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

## React Native

The overlay is web-only for now. The CLI half is not: the record server accepts a recording from
anywhere, so a native recorder posting the same JSON shape writes the same file.

## Why there is no browser extension

The original plan was a Chrome extension that captured clicks on any page. An in-app component is
better here for one reason: tourkit consumers own the app they are touring. An extension adds a
store listing, a review cycle, a separate install, and a permissions prompt, and buys nothing that
a component rendered in development does not already do. It would also be the only part of the
project nobody could test.
