# Interaction

Every step decides what the user can touch while it is showing.

```ts
{ id: "post", target: "post-ride", interaction: "advance-on-press" }
```

| Mode | The target | The rest of the screen | Advances when |
| --- | --- | --- | --- |
| `block` (default) | not pressable | not pressable | the user presses Next |
| `passthrough` | fully interactive | not pressable | the user presses Next |
| `advance-on-press` | press is caught by the tour | not pressable | the user presses the highlighted area |

## block

The safe default. A full-screen shield absorbs everything, including presses inside the hole, so
the highlight is purely visual and nobody can wander off mid-tour.

Use it for anything explanatory.

## passthrough

The shield is removed and the real element works normally. The tour does not advance by itself,
so pair it with a step the user can leave through Next, or with a `gate` that resolves once they
have done the thing.

```ts
{
  id: "try-filter",
  target: "filter",
  title: "Try a filter",
  interaction: "passthrough",
  gate: ({ context }) => context.hasFiltered,
  gateTimeoutMs: 30000,
  onGateTimeout: "skip",
}
```

Note what that costs you: the user's real press runs your real handler. If that handler navigates
or mutates data, it happens mid-tour.

## advance-on-press

The rest of the screen stays blocked, and a catcher sits over the hole. Pressing it advances the
tour. The underlying element is **not** pressed.

That last part is deliberate and it is the same on both platforms. Letting the real press through
would mean a tour step could fire a navigation or a mutation as a side effect, and it cannot be
made to behave identically on React Native, where the library cannot attach a listener to your
element. One behaviour everywhere beats a slightly richer one on web only.

On web the catcher is a real `<button>` with an accessible name, so a keyboard or screen-reader
user can advance the same way.

## The rule that matters

**Never ask a user to press something that produces no visible change.**

This is the reason action-driven tour steps get abandoned, and it is not a limitation of any
mechanism. An early version of the tour this library grew out of said "Tap Find Pool" while Find
Pool was already the selected segment. Pressing it did nothing visible, so the user could not
tell whether the tour was broken or waiting on them. The step was correct, the copy was correct,
and the experience was still bad.

Before you write an `advance-on-press` step, check that pressing it changes something the user
can see. Advancing the tour itself counts, as long as the card visibly moves on.

## Choosing

Reach for `block` unless you have a reason not to. Use `advance-on-press` when the gesture is the
lesson, like "swipe here" or "tap the plus button". Use `passthrough` when the user genuinely
needs to operate the app, and accept that their real handler runs.
