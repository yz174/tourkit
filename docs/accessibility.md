# Accessibility

What the overlay does on its own, what it hands to you, and the two places where a custom card
takes on work the default one was doing.

None of this is configurable, and none of it needs turning on.

## Keyboard, on web

The tour installs one `keydown` listener on the document, in the capture phase, while a step is
active.

| Key | What happens |
| --- | --- |
| `ArrowRight` | Advances. Runs `onAdvance` first, like the Next button. |
| `ArrowLeft` | Goes back one visible step. Ignored on the first. |
| `Escape` | Ends the tour and records it as skipped. Ignored when the step or tour sets `dismissible: false`. |
| `Tab` | Cycles forward through the focusable elements inside the card. |
| `Shift+Tab` | Cycles backwards through the same list. |

The listener is in the capture phase, so it wins over your app's own shortcuts while a step is
showing. It is removed the moment the tour ends.

## Focus

When a step becomes active, focus moves to the first element inside the card matching
`button, [href], input, [tabindex='0']`, or to the card itself when nothing matches.
`preventScroll: true`, so focusing does not fight the tour's own scrolling.

That opening query is narrower than the trap's. A card whose only control is a `<select>` or a
`<textarea>` receives focus on the wrapper rather than on the control, and Tab then reaches it on
the first press. Render a button and the question does not come up.

Tab is trapped inside the card from then on. The trap counts these as focusable:

```
a[href]
button:not([disabled])
input:not([disabled])
select:not([disabled])
textarea:not([disabled])
[tabindex]:not([tabindex="-1"])
```

Anything carrying `aria-hidden="true"` is excluded. `nextFocusTarget` is exported if you want the
same cycle in a custom overlay.

Focus is not restored to the element that started the tour when it ends. If that matters in your
app, capture `document.activeElement` before calling `start` and restore it on `tour:complete`
and `tour:abort`.

## Roles and names, on web

| Element | What it carries |
| --- | --- |
| The card wrapper | `role="dialog"`, `aria-modal="true"`, `aria-label` set to the step's `title`, then its `label`, then `"Tour step"` |
| The shield | `aria-hidden="true"`. It is a click blocker, not content. |
| The arrow anchor | `aria-hidden="true"` |
| The `advance-on-press` catcher | A real `<button>` labelled `Continue: {title}`, or `"Continue the tour"` |

That last row is the reason `advance-on-press` is usable without a mouse. The catcher is a button
with an accessible name, so a keyboard or screen-reader user advances the same way anyone else
does.

Give every step a `title`. It is the dialog's accessible name, and a step without one announces
as "Tour step".

For a step that deliberately shows no title, name it with `label` instead:

```ts
{ id: "filters", target: "filters", body: "Narrow the list.", label: "Filters panel" }
```

`title` wins when both are set, because the visible heading is the better name.

## React Native

| What | How |
| --- | --- |
| Modality | The overlay sets `accessibilityViewIsModal`, so the screen behind it is hidden from assistive technology. |
| Announcement | Each step announces `title. body` through `announceForAccessibility`. |
| Focus | Screen-reader focus moves to the card on every step change, through `setAccessibilityFocus`. |
| The card | `accessible`, with `accessibilityLiveRegion="polite"` and a label reading `title. body. Step 3 of 7.` |
| The Next control | `accessibilityRole="button"`, labelled `Next step` or `Finish the tour` on the last step. `hitSlop` of 12. |
| The shield | `accessible={false}` throughout, so the blocker never lands in the focus order. |

There is no keyboard map on React Native, because there is no keyboard to map.

## Reduced motion

Honoured on both platforms, with no prop to set.

| Platform | Source |
| --- | --- |
| Web | `prefers-reduced-motion: reduce`, re-read when the setting changes mid-session |
| React Native | `AccessibilityInfo.isReduceMotionEnabled()`, plus the `reduceMotionChanged` subscription |

When it is on:

- The hole jumps between steps instead of morphing.
- The card jumps instead of travelling.
- Scrolling to a target becomes instant rather than smooth.
- The ring stops breathing. Web drops it entirely; React Native keeps drawing it at a constant
  30% opacity. Neither leaves an animation frozen mid-cycle.

## Contrast

`text.contrast: "auto"` derives the title and body colours from `card.background` by contrast
ratio, and keeps `accent` for the action only when it clears 3:1 against the card. Reach for it
whenever the card background is themeable, because a hand-picked pair that reads well in light
mode usually fails in dark mode.

`contrastRatio`, `luminance` and `isDark` are exported from `@tourkit/core` so a custom card can
make the same call.

The defaults clear WCAG AA on the default card background. A theme you write yourself does not
check itself.

## What a custom card takes on

Replacing the `Card` slot means the wrapper's `role`, `aria-modal`, `aria-label`, the focus trap
and the keyboard handling all keep working, because they live on the host rather than the card.
Two things do not survive:

**A focusable element to receive focus.** The host focuses the first focusable child, falling back
to the card wrapper. A card with no button leaves focus on a `tabindex="-1"` container, which is
reachable but announces nothing useful. Render at least the advance control.

**An accessible name on every control.** The default card's Next button reads its label from
`isLast`. An icon-only button in a custom card needs its own.

```tsx
function Card({ step, isLast, next }: CardProps) {
  return (
    <div>
      <h3>{step.title}</h3>
      <p>{step.body}</p>
      <button type="button" onClick={next} aria-label={isLast ? "Finish the tour" : "Next step"}>
        {isLast ? "Done" : "Next"}
      </button>
    </div>
  );
}
```

## Going back

The default card shows one control: Next, or Done on the last step. `ArrowLeft` also goes back,
but a keyboard shortcut is not an affordance: someone on a switch device or a screen reader has
no way to discover it.

Turn the Back button on for any tour long enough that people will want to re-read a step:

```ts
{ id: "billing", target: "billing", buttons: { back: true } }
```

Once for the whole tour:

```ts
{ id: "onboarding", version: 1, defaultStepOptions: { buttons: { back: true } }, steps: [...] }
```

It renders disabled on the first step rather than disappearing, so the control does not move
between steps. `buttons.close` adds a dismiss control the same way, carrying `aria-label` from
`closeLabel`, and it is suppressed automatically when the step or tour sets `dismissible: false`.

A custom `Card` still receives `prev`, `skip`, `stop`, `isFirst` and `dismissible` in
`CardProps`, and can call `resolveButtons(step, dismissible)` from `@tourkit/core` to read the
same configuration the default card reads.

## Writing steps people can follow

Mechanics are not the whole story.

**Never ask someone to press something that produces no visible change.** This is the reason
action-driven steps get abandoned, and no amount of correct markup fixes it. The long version is
in [Interaction](./interaction.md#the-rule-that-matters).

**One line of body copy reads better than three.** The card is announced in full on React Native,
as a single live-region string.

**Do not rely on colour alone.** The spotlight is a hole in a scrim, which reads as position
rather than hue, so this mostly matters in copy that says "the green button".
