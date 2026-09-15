Write or rewrite the copy for an existing tour, grounded in what the code actually does.

This is the command that separates a useful tour from a labelled screenshot. A model that has never seen the codebase can only paraphrase the element's own text. You can read the component.

## 1. Load the tour

Read the `.tour.json`. If only a `.tour.ts` exists, read that instead and write the `.tour.json` back out afterwards so the format stays canonical.

If a `.recording.json` sits beside it, read that too. It carries the tag, role, label, visible text and route captured per step, which is what you grep for.

## 2. Find the source of every step

For each step, in order, locate the element:

1. `grep -rn 'data-tour-id="<target>"' src/` for a registered target.
2. `grep -rn 'registerTarget("<target>"' src/` for a programmatic one.
3. For a CSS selector target, grep the recording's `label` or `text` instead.

Then read the component and follow the handler. What does pressing this actually do? What changes on screen? What does the user have after doing it that they did not have before?

If you cannot find the element, say so for that step. Write the fallback title from the recording and mark it in your summary as ungrounded. Do not invent a capability.

## 3. Write

Per step: a title and a body.

**Title.** What the user gets. Under 6 words. No trailing punctuation. Not the element's label repeated.

| Element | Bad | Good |
|---|---|---|
| `<button>Post</button>` opening a seat-offer form | "Post button" | "Offer a seat" |
| A filter dropdown over ride history | "Filters" | "Narrow your history" |
| An avatar menu with billing inside | "Click your avatar" | "Billing lives here" |

**Body.** One sentence, under 20 words, only if the title leaves a real question. An empty body is better than a restated title.

Never write "Click here to...". The spotlight already says where. Say why.

Never write "This is the X". Name what it does.

Never number the steps in the copy. The progress indicator does that.

## 4. Check the shape of the tour

Copy is not the only thing `author` fixes.

- More than six steps: propose cutting. Ask which are load-bearing.
- Two steps on the same target: merge them.
- A step whose only content is "Welcome": delete it. Nobody needed a tour to learn the product has a name.
- The last step with no target is the sign-off. One short line. "That is the tour" is fine, and is the default.

## 5. Write it back

Write the `.tour.json`, then:

```bash
node <skill>/scripts/emit.mjs <path>.tour.json
```

Report what changed per step, old title to new, and list any step you could not ground in source.

## Copy that fails review

These come back from `review` every time:

- Every title is a noun phrase naming the widget.
- Bodies that restate the title in longer words.
- "Easily", "simply", "just". If it were simple the tour would not exist.
- Exclamation marks.
- Second sentences that explain the first.
- A step that teaches the UI pattern ("use the dropdown to choose") rather than the user's job.
