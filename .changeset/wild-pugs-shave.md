---
"@tourkit/react": major
"@tourkit/core": minor
---

Record tours from an agent skill instead of a mounted React component, and run the player without React.

**Breaking: `@tourkit/react` no longer ships the browser recorder.** These exports are gone:

| Removed | Replacement |
|---|---|
| `TourRecorder` | The tourkit skill injects a recorder script tag. Nothing to mount. |
| `TourRecorderProps` | No longer needed. |
| `RecordedStep` | `import type { RecordedStep } from "@tourkit/core/dom"` |
| `Recording` | `import type { Recording } from "@tourkit/core/dom"` |

`packages/react/src/recorder/TourRecorder.tsx` and `recorder/server.ts` are deleted with them. `cssPath`, `describeElement` and `textOf` are unchanged and still re-exported from `@tourkit/react`.

If you mounted `<TourRecorder />` in development, delete it and record with the skill instead:

```
/plugin marketplace add yz174/tourkit
/plugin install tourkit@tourkit
```

The skill starts a local server, writes a script tag into your HTML entry, and takes it out again when you are done. It works in any framework, not just React, because the capture bar is plain DOM. React Native is unchanged: `@tourkit/native` keeps its own recorder panel, because there is no HTML to inject into.

**`@tourkit/core` gains `withBehavior`.** A `.tour.json` cannot carry `when`, `gate`, `onEnter` or `onAdvance`, because they are functions. `withBehavior` merges them back in from a hand-written module, keyed by step id:

```ts
import { withBehavior } from "@tourkit/core";
import { driverOnboarding } from "./driver-onboarding.tour";

export const onboarding = withBehavior(driverOnboarding, {
  billing: { when: (context) => context.plan === "pro" },
  history: { gate: waitForFilter, gateTimeoutMs: 3000 },
});
```

`withBehaviorReport` returns the same config plus the override keys that matched no step, so a renamed step id fails loudly instead of silently doing nothing.

**`@tourkit/cli` is discontinued.** The scaffold, record server and codegen moved into the skill. The package will be deprecated on npm.
