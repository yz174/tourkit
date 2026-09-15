Find steps whose target no longer resolves, and fix them at the source.

A tour breaks quietly. The step times out, the engine emits `target:timeout`, the step is skipped, and the user sees a shorter tour with no error. This command finds that before a user does.

## 1. Collect the targets

Read every `.tour.json` in `tourDir`. Build the list of `target` values, skipping the nulls. Note which came with a `fingerprint`, which means they were recorded as CSS selectors.

## 2. Resolve each one statically

For a bare id target, the element must carry the attribute or be registered:

```bash
grep -rn 'data-tour-id="post-ride"' src/
grep -rn 'registerTarget("post-ride"' src/
```

No hit means the step is broken. One hit means it is fine. More than one hit means two elements claim the id, and the player takes whichever the document hands it first, which is a bug worth reporting even though the step still "works".

For a CSS selector target, grep for the distinctive part of the selector. A selector that no longer appears anywhere in the source is broken.

## 3. Classify

| Finding | Severity | Fix |
|---|---|---|
| Target resolves nowhere | broken | Repoint or delete the step |
| Target resolves twice | ambiguous | Rename one of them |
| Selector target with a fingerprint | fragile | Add `data-tour-id` and repoint |
| Selector target with no fingerprint | brittle | Add `data-tour-id`, or the step dies silently on the next refactor |
| Target resolves, but behind a route | needs a route | Add `route` to the step |
| Target resolves, but behind a collapsed panel | needs a gate | Add `gate` in the behavior module |

## 4. Propose before you edit

Print the findings as a table first. Say which fix you propose per step. Then wait, unless the user already said to apply them.

For a broken target, propose the replacement you found and say how you found it. "The Post button moved from `PostRide.tsx` to `RideActions.tsx` and lost its attribute; I would add `data-tour-id="post-ride"` back at `RideActions.tsx:42`" is a proposal. "Fixed the target" is not.

If nothing in the codebase plausibly replaces the target, say the feature may have been removed and propose deleting the step. Do not point it at a lookalike.

## 5. Apply

Editing the component is usually the right fix, because an id in the source survives the next refactor and a selector does not.

Repointing the step in `.tour.json` is right when the element still exists under a different stable id.

After either, run `emit.mjs` on every tour you touched.

List every source file you edited. A heal that silently rewrote five components is worse than a heal that reported five problems.

## Fingerprints

A step recorded from a CSS selector carries one:

```json
"fingerprint": { "tag": "button", "text": "Post a ride", "near": "Your rides", "index": 2 }
```

At runtime, when the selector fails, the player scores every element with that tag against the fingerprint and takes the single best match above threshold, then warns once in the console. It is a safety net, not a fix: it is why the tour still ran after the refactor, and it stops working when the text or the surrounding heading changes too.

When you repoint a step to a `data-tour-id`, delete its fingerprint. It only exists to heal selectors.

## Checking at runtime

Static grep misses targets built from template strings or rendered only under a feature flag. To be sure, run the app and watch the console: the player warns on a fingerprint heal, and the engine emits `target:timeout` for a step it gave up on. Ask the user to run the tour once if the static pass found anything ambiguous.
