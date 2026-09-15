Critique a tour before users see it. Report findings; do not silently rewrite.

Read the `.tour.json`, the components each step targets, and the code that starts the tour. Then work the checks below in order and report what fails.

## Structural

| Check | Fails when | Why it matters |
|---|---|---|
| Length | More than 6 content steps | Past six, dismissal beats completion |
| Focus | Steps span unrelated features | A tour that teaches three jobs teaches none |
| Order | Step N's target only exists after step N+1's action | The step times out and is skipped |
| Duplicates | Two steps on the same target | The spotlight does not move and it reads as a bug |
| Sign-off | No trailing `target: null` step | The tour ends mid-spotlight |
| Welcome step | First step says hello and points at nothing useful | Costs a step, teaches nothing |

## Targeting

| Check | Fails when | Why it matters |
|---|---|---|
| Stability | `target` is a CSS selector | Breaks on the next refactor, silently |
| Resolvability | No `data-tour-id` or `registerTarget` in source | Step times out and is skipped |
| Uniqueness | Two elements share the id | The player takes whichever comes first |
| Visibility | Target is behind a route with no `route` on the step | Nothing to spotlight |
| Reachability | Target is inside a collapsed panel with no `gate` | Same |

## Copy

| Check | Fails when |
|---|---|
| Title length | Over 6 words |
| Title content | Names the widget instead of the outcome |
| Body length | Over 20 words |
| Body value | Restates the title |
| Filler | "easily", "simply", "just", "click here", "this is the" |
| Tone | Exclamation marks, second person imperatives stacked back to back |
| Numbering | Copy says "Step 2 of 5" while the progress indicator already does |

## Trigger

| Check | Fails when | Why it matters |
|---|---|---|
| Consent | Starts on first paint of a page the user did not choose | Gets dismissed, and teaches the user to dismiss the next one |
| Repeat | No persistence, so it runs on every visit | The fastest way to make a tour hated |
| Re-entry | No way to run it again on purpose | People want it after they need it, not before |

## Accessibility

| Check | Fails when |
|---|---|
| Dismissal | `dismissible: false` with no completion path a keyboard user can reach |
| Naming | A step with neither `title` nor `label`, so the dialog has no accessible name |
| Interaction | `interaction: "advance-on-press"` on a target that is not a control |

## Report

Group by severity, worst first. Per finding: the step id, what is wrong, and the concrete fix.

```
BROKEN   step "billing"      target "#nav > div:nth-child(3)" resolves nowhere in src/
                             Add data-tour-id="billing" to NavMenu.tsx:31 and repoint.
WEAK     step "post-ride"    title "Post button" names the widget, not the outcome
                             "Offer a seat" says what the user gets.
NOTE     tour "onboarding"   9 steps. Steps 6 to 9 cover billing, which is a separate job.
```

End with the single change that would most improve the tour. One, not a list. If the honest answer is that the tour should not exist and the screen needs a better empty state, say that.

## Fixing

Only after reporting, and only if asked. Then follow [author.md](author.md) for copy and [heal.md](heal.md) for targets, and list every file you touched.
