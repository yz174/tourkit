Set a project up for tourkit from nothing: install the player, scaffold a tour, mount it.

Run `detect.mjs` first. Everything here reads from its output.

## 1. Install

`installed` in the detect output says what is already there. Install only what is missing, with `packageManager`.

| `player` | Install |
|---|---|
| `@tourkit/react` | `@tourkit/react` |
| `@tourkit/core/dom` | `@tourkit/core @floating-ui/dom` |
| `@tourkit/native` | `@tourkit/native react-native-svg react-native-reanimated` |

`@floating-ui/dom` is an optional peer of `@tourkit/core`, so no package manager installs it for you. Without it, `mountTour` throws on import. React installs get it through `@tourkit/react`, which depends on it directly.

Print the exact command and let the user run it, or run it yourself if they asked you to.

## 2. Scaffold a tour

Write `<tourDir>/onboarding.tour.json`:

```json
{
  "id": "onboarding",
  "version": 1,
  "steps": [
    { "id": "first", "target": "first-thing", "title": "Start here", "body": "Replace this once you have recorded a real tour." }
  ]
}
```

Then `node <skill>/scripts/emit.mjs <tourDir>/onboarding.tour.json`.

A scaffolded tour is a placeholder, not a deliverable. Say so, and offer `record` as the next step.

## 3. Mount the player

Follow [wire.md](wire.md). It has the per-framework mount code and where to put it.

## 4. Add one target

A tour needs at least one resolvable target or the first step times out and skips. Pick the most obvious control on the landing screen and add `data-tour-id="first-thing"` to it. Name the file you edited.

## 5. Add a way to start it

A tour nobody triggers is dead code. Wire one of:

- a "Take the tour" item in a help menu, which is the honest default
- a first-run check on a stored flag, if the user asks for it
- `engine.start("onboarding")` from an existing onboarding checkpoint

Do not auto-start on first paint. See the laws in SKILL.md.

## 6. Prove it runs

Tell the user how to see it: start the dev server, trigger the start, confirm the card appears over the target. If they report nothing appears, the checklist is in [wire.md](wire.md).
