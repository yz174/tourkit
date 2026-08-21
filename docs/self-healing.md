# When a target breaks

A CSS selector is a claim about your markup. Rename a class, reorder a list, or move a button into
a new wrapper, and the claim stops being true. The tour then points at nothing, waits out its
gate, and skips the step the user most needed.

A fingerprint is a second, weaker claim about the same element: what tag it is, what it says, what
it is called, and what heading it sits under. Those survive most refactors that break a selector.

```ts
{
  id: "cancel",
  target: ".danger-btn",
  title: "Cancel a ride",
  fingerprint: {
    tag: "button",
    text: "Cancel",
    label: "Cancel ride",
    near: "Your rides",
  },
}
```

If `.danger-btn` still matches, the fingerprint is never consulted. If it misses, the fingerprint
finds the element and the tour continues, with a warning naming the step and the stale selector:

```
tourkit: step "cancel" could not find ".danger-btn" and matched it by fingerprint instead.
Update the target before it stops matching.
```

Once per step, per tour run.

## You do not write these by hand

`tourkit record` captures a fingerprint for every step whose target fell back to a selector, and
writes it into the generated file. Steps using a `data-tour-id` get none, because there is nothing
to heal: an id you control does not drift.

To add one to an existing tour, build it in the browser console:

```ts
import { buildFingerprint } from "@tourkit/react";

buildFingerprint(document.querySelector(".danger-btn"));
```

## What matching actually does

Every element with the right tag is scored:

| Signal | Points |
| --- | --- |
| `label` matches (`data-tour-label` or `aria-label`) | 5 |
| `text` matches | 4 |
| `role` matches | 2 |
| `near` matches, the nearest heading or labelled landmark | 2 |
| `index` matches, position among same-tag siblings | 1 |

A different tag scores zero regardless of everything else.

The best candidate wins only if it scores at least 4 **and** strictly beats the runner-up. Two
buttons that both say "Save" produce a tie, and a tie resolves to nothing. Healing that guesses
between two plausible elements is worse than healing that admits defeat, because a tour pointing
confidently at the wrong button teaches the user the wrong thing.

Matching also bails when more than 500 elements share the tag. A fingerprint of
`{ tag: "div", text: "Save" }` is not worth a full-document scan on every step.

There is no model call. This is comparison logic running in your app, and it is why the feature
costs nothing at runtime.

## It is a safety net, not a fix

A healed step is a step whose target is already wrong. The warning exists so you notice, and the
right response is to open the file and give the element a `data-tour-id`:

```tsx
<button data-tour-id="cancel-ride" className="Button_destructive__9fa2b">Cancel</button>
```

```ts
{ id: "cancel", target: "cancel-ride", title: "Cancel a ride" }
```

Now nothing to heal, nothing to warn about, and the tour survives any styling change at all. That
is the outcome the warning is pushing you toward.
