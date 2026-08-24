# Testing a tour

A tour is the part of your product that breaks silently. A renamed button does not fail a build,
and nobody clicks through onboarding again after the first week. The failure shows up as a step
that quietly skips itself, months later.

Three levels, cheapest first. Most teams need the first two.

## Level 1: the config, with no renderer

`TourConfig` is plain data and the filtering logic is a pure function, so `when` predicates and
step ordering are testable with no DOM and no React.

```ts
import { visibleSteps } from "@tourkit/core";
import { expect, test } from "vitest";
import { type AppContext, onboarding } from "./tours";

test("free plans do not see the billing step", () => {
  const steps = visibleSteps<AppContext>(onboarding, { plan: "free" });
  expect(steps.map((step) => step.id)).not.toContain("billing");
});

test("every step id is unique", () => {
  const ids = onboarding.steps.map((step) => step.id);
  expect(new Set(ids).size).toBe(ids.length);
});
```

That second test is worth more than it looks. A duplicate id makes resuming pick the wrong step,
and nothing else catches it.

`stepAt`, `indexOfStep`, `mergeTheme` and `routeMatches` are pure and exported for the same
reason.

### Targets that still exist

The test that pays for itself: assert that every `target` in every tour is a string some part of
your codebase still mentions.

```ts
import type { TourConfig } from "@tourkit/core";

/** Target ids that no longer appear anywhere in the given source text. */
export function danglingTargets(tours: TourConfig<never>[], source: string): string[] {
  return tours
    .flatMap((tour) => tour.steps)
    .map((step) => step.target)
    .filter((target): target is string => typeof target === "string" && !target.startsWith("."))
    .filter((target) => !source.includes(target));
}
```

Pass the type argument to `visibleSteps<AppContext>` explicitly. Without it, TypeScript infers the
context from the object literal and widens `"free"` to `string`, and your `when` predicates stop
matching. It is the same widening the provider hits, for the same reason.

```ts
test("every target id appears in the source", async () => {
  const source = await readAll("src/**/*.tsx"); // whatever your test setup already uses
  expect(danglingTargets(tours, source)).toEqual([]);
});
```

Selectors are excluded by the `startsWith(".")` check, because a selector is meant to describe
markup rather than name it. Those are the ones a [fingerprint](./self-healing.md) covers.

It is a grep, not a proof. It will not catch a target that moved to a route the tour never
reaches. It does catch the rename that deleted the id, which is the common case.

## Level 2: the tour running, in a DOM

Render the provider, start the tour, assert on what the overlay does. `memoryStorage()` keeps one
test from leaking a completion record into the next.

```tsx
import { memoryStorage, TourProvider, useTour } from "@tourkit/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { onboarding } from "./tours";

function Launcher() {
  const { start } = useTour();
  return <button type="button" onClick={() => start("onboarding")}>start</button>;
}

function App() {
  return (
    <TourProvider
      tours={[onboarding]}
      context={{ plan: "pro" }}
      storage={memoryStorage()}
      theme={{ motion: { morph: 0, travel: 0, fade: 0 } }}
    >
      <button type="button" data-tour-id="post-ride">Post a ride</button>
      <Launcher />
    </TourProvider>
  );
}

test("the first step points at the post button", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByText("start"));

  const dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveAttribute("aria-label", "Post a ride");
});
```

Three things make this reliable:

**Zero motion durations.** `theme={{ motion: { morph: 0, travel: 0, fade: 0 } }}` removes the
transitions, so an assertion never races an animation.

**A fresh `memoryStorage()` per test.** A shared adapter means test two resumes the tour test one
abandoned.

**Query by role and name, not by class.** The card is a `role="dialog"` labelled by the step's
`title`. The advance control is a button named `Next`, or `Done` on the last step.

### Asserting the sequence

`onEvent` is the cleanest assertion surface, because it reports what the engine decided rather
than what got painted.

```tsx
const seen: string[] = [];

render(
  <TourProvider
    tours={[onboarding]}
    storage={memoryStorage()}
    onEvent={(name, event) => seen.push(`${name}:${event.stepId ?? "-"}`)}
  >
    {/* ... */}
  </TourProvider>,
);

// after clicking start and then Next
expect(seen).toEqual([
  "tour:start:post",
  "step:enter:post",
  "step:exit:post",
  "step:enter:inbox",
]);
```

This is also how you assert that a step was skipped. A target that never appears produces
`target:timeout` followed by `step:skip`, and nothing else says so.

### Making a missing target fail fast

The default gate waits 5000ms. In a test, that is a five-second hang before the skip you are
trying to assert.

```ts
const testable = {
  ...onboarding,
  steps: onboarding.steps.map((step) => ({ ...step, gateTimeoutMs: 30 })),
};
```

Override it on the config you pass to the provider rather than in the tour file itself.

### Gates and context

A `gate` reads your context, so drive it from the test:

```tsx
function App({ loaded }: { loaded: boolean }) {
  return (
    <TourProvider tours={[onboarding]} context={{ reportsLoaded: loaded }} storage={memoryStorage()}>
      {/* ... */}
    </TourProvider>
  );
}

const view = render(<App loaded={false} />);
// the step waits
view.rerender(<App loaded />);
// the step activates
```

Changing the context re-filters `when` predicates immediately, mid-tour included, so this also
tests a step appearing partway through.

## Level 3: the real browser

Layout is the thing a DOM shim cannot check. The hole's position, the card flipping to stay on
screen, and a target inside a scroll container all need a real engine.

The overlay carries stable data attributes for exactly this:

| Selector | Element |
| --- | --- |
| `[data-tourkit="root"]` | The portal root. Absent when no tour is running. |
| `[data-tourkit-state]` | `resolving` or `active` |
| `[data-tourkit-interaction]` | `block`, `passthrough` or `advance-on-press` |
| `[data-tourkit="backdrop"]` | The clipped scrim |
| `[data-tourkit="shield"]` | The click blocker. Absent in `passthrough`. |
| `[data-tourkit="hole-catcher"]` | The press catcher. Present only in `advance-on-press`. |
| `[data-tourkit="card"]`, `"title"`, `"body"`, `"next"` | The card and its parts |
| `[data-tourkit="card-wrap"]` | Carries `data-tourkit-placement` |
| `[data-tourkit="progress"]` | The progress indicator, whatever its style |
| `[data-tourkit="progress-dot"]` | One per step. Carries `data-tourkit-done` and `data-tourkit-active`. |
| `[data-tourkit="progress-track"]`, `"progress-fill"` | The `continuous` style only |

```ts
import { expect, test } from "@playwright/test";

test("the spotlight lands on the post button", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Show me around" }).click();

  const root = page.locator('[data-tourkit="root"]');
  await expect(root).toHaveAttribute("data-tourkit-state", "active");

  const card = page.getByRole("dialog", { name: "Post a ride" });
  const target = page.locator('[data-tour-id="post-ride"]');
  const cardBox = await card.boundingBox();
  const targetBox = await target.boundingBox();

  expect(cardBox && targetBox).toBeTruthy();
  expect(cardBox!.y).toBeGreaterThan(targetBox!.y);
});
```

`page.emulateMedia({ reducedMotion: "reduce" })` is the browser equivalent of zeroing the motion
tokens. The tour reads `prefers-reduced-motion` and switches from morphing to jumping, so
positions are settled by the time the state attribute flips to `active`.

### Keyboard

```ts
await page.keyboard.press("ArrowRight");   // advance
await page.keyboard.press("ArrowLeft");    // back
await page.keyboard.press("Escape");       // end, unless dismissible is false
```

Worth one test on its own. The keyboard path is the one nobody clicks through by hand.

### The interaction modes

Each mode is visible in the DOM, so you can assert the mode rather than trying to infer it:

```ts
await expect(page.locator('[data-tourkit="shield"]')).toHaveCount(0);        // passthrough
await expect(page.locator('[data-tourkit="hole-catcher"]')).toHaveCount(1);  // advance-on-press
```

Remember that `advance-on-press` does not press the underlying element. A test asserting that the
real handler fired will fail, correctly.

## React Native

The pure layers are the ones worth testing, and they are exported for it: `resolvePlacement`,
`cardWidthFor`, `shieldRegions`, `holeMaskPath`, `padRect`, `resolvePadding`, `resolveRadius` and
`scrollOffsetFor` are all plain functions over numbers.

The renderer itself needs a device or a simulator. `createMemoryStorage()` keeps a test run from
persisting anything, and `TouchShield` carries `testID="tourkit-shield"`.

Measurement runs on a Reanimated frame callback, which does not exist under Jest without the
Reanimated mock. Assert on geometry helpers rather than on the rendered hole.

## What to actually test

Ranked by how often it catches something real:

1. Every step id is unique.
2. Every target id still appears in the source.
3. `when` predicates produce the step lists you expect, per plan or role.
4. The event sequence for one full run of your main tour.
5. A step whose target is missing skips rather than hangs.
6. The keyboard path advances, goes back and exits.
7. Layout, for the two or three steps that sit near a screen edge.

The first two are a few lines and no renderer. Start there.
