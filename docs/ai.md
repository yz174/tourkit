# Ask and be shown

`@tourkit/ai` turns a user's question into a live walkthrough of your real interface
instead of a support article. It sends the question plus the ids of the on-screen targets
to a model in one call, gets back an ordered list of ids, and hands that to the normal
tourkit engine as a `TourConfig`.

A user types a question into your help box. Instead of a support article, your actual interface
walks them through the answer.

```
"how do I cancel a ride I already posted?"
        ↓
one model call: the question plus the ids of every target on screen right now
        ↓
["my-rides", "ride-menu", "cancel-ride", null]
        ↓
the normal tourkit engine drives those steps
```

It works because every target you register is already a map of your app. Nothing new renders and
no new engine runs. A generated tour is an ordinary `TourConfig`.

## There is no tourkit service

Nothing runs on our infrastructure. The model call happens on **your** server, with **your** key.

| Piece | Runs where | Sees your key |
| --- | --- | --- |
| `@tourkit/ai` | the browser or the app | no |
| `@tourkit/ai/server` | your backend | yes |

The client half contains no key handling at all. A build of it has zero occurrences of
`anthropic` or `apiKey`, and there is a test asserting that so it stays true.

## Install

```bash
npm i @tourkit/ai
npm i @anthropic-ai/sdk   # server only
```

## Your server

One endpoint. This is a Next.js route handler; Hono and Bun take the same `Request` object.

```ts
// app/api/tourkit/route.ts
import { anthropicGenerator, createTourkitHandler } from "@tourkit/ai/server";

export const POST = createTourkitHandler({
  generate: anthropicGenerator({ apiKey: process.env.ANTHROPIC_API_KEY }),
});
```

Express takes `(req, res)` rather than a `Request`, so convert:

```ts
const handle = createTourkitHandler({ generate: anthropicGenerator() });

app.post("/api/tourkit", async (req, res) => {
  const response = await handle(
    new Request("http://local/api/tourkit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req.body),
    }),
  );
  res.status(response.status).json(await response.json());
});
```

`anthropicGenerator` defaults to `claude-opus-5` and loads the SDK lazily, so importing
`@tourkit/ai/server` in a file that never handles a request costs nothing.

Any provider works. `generate` is just a function:

```ts
createTourkitHandler({
  generate: async ({ question, manifest }) => callWhateverYouLike(question, manifest),
});
```

Whatever it returns is validated before it reaches the client.

## Your client

```tsx
import { useTourkitAsk } from "@tourkit/ai";
import { useTargetManifest, useTour } from "@tourkit/react";

function HelpBox() {
  const getManifest = useTargetManifest();
  const { start } = useTour();
  const { ask, status, error } = useTourkitAsk({
    endpoint: "/api/tourkit",
    getManifest,
    onTour: start,
  });

  return (
    <form onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
      <input value={question} onChange={(event) => setQuestion(event.target.value)} />
      <button disabled={status === "asking"}>Show me</button>
      {status === "failed" ? <SupportArticles reason={error?.reason} /> : null}
    </form>
  );
}

// React Native is identical, importing useTargetManifest and useTour from @tourkit/native.
```

`status` is `idle`, `asking`, `ready` or `failed`. On `failed`, fall back to whatever help you
already have.

## The model can only point at things that exist

The model is given the ids of the targets currently registered and told to copy them exactly.
Then the response is checked against that same list, **twice**: once on your server before it is
returned, and again in the browser before anything renders.

A step naming an id that is not in the manifest is rejected outright. The tour does not render
partially and does not silently skip the bad step. `status` becomes `failed` with
`reason: "unknown-target"`.

This is the property that makes the feature shippable. The model cannot invent a Delete Account
button and point a confident arrow at empty space.

Other limits, all enforced by schema rather than by prompting:

| Limit | Value |
| --- | --- |
| Question length | 500 characters |
| Manifest size | 200 targets, and only the first 120 reach the prompt |
| Steps per answer | 8 |
| Title length | 80 characters |
| Body length | 240 characters |

A repeated target on consecutive steps is collapsed, so the highlight never sits still while the
card changes underneath it.

## Labels are what the model reasons with

On web, a target's label comes from `data-tour-label`, then `aria-label`, then its text content.
On React Native, pass `label` to `TourTarget`.

```tsx
<button data-tour-id="cancel-ride" data-tour-label="Cancel a posted ride">×</button>
```

```tsx
<TourTarget id="cancel-ride" label="Cancel a posted ride">
```

An id of `btn-4` with no label tells the model nothing. This is the single highest-leverage thing
you can do for answer quality.

## Cost

One call per question. Repeats of the same question against the same set of targets are served
from an in-memory cache without a request.

To make a good answer permanent, copy the returned steps into a normal tour file. A pinned tour
costs nothing forever and can be edited, translated and reviewed like any other code.

## What this deliberately is not

It is not a wizard that generates tours you cannot inspect. Every generated tour is a plain
`TourConfig` you can log, test and pin. A tour nobody can audit is a demo, not something a team
ships.

## Drafting recorded step copy

`@tourkit/ai` also exports `anthropicDrafter`, which writes step copy from a recording. It was
built for `tourkit record --draft`, and that CLI no longer exists.

Drafting is the skill's job now, and it does the job better for a structural reason: the drafter
received a JSON blob and had to guess a title from `textContent`, having never seen the codebase.
The skill greps the repository for each recorded element, reads the component and the handler it
calls, and writes copy from what the code does. See [the skill](./skill.md#commands).

`anthropicDrafter` stays exported and stays supported. It has no first-party consumer, so if you
call it, you are the only one: the signature will not change under you, but nothing in this repo
exercises it end to end either.
