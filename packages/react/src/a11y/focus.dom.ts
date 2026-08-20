import { beforeEach, describe, expect, test } from "vitest";
import { focusableWithin, nextFocusTarget } from "./focus";

let card: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = `
    <div id="card">
      <button id="a">a</button>
      <a id="b" href="#x">b</a>
      <button id="disabled" disabled>nope</button>
      <span id="hidden" tabindex="0" aria-hidden="true">hidden</span>
      <input id="c" />
    </div>`;
  card = document.getElementById("card") as HTMLElement;
});

describe("focusableWithin", () => {
  test("skips disabled and aria-hidden nodes", () => {
    expect(focusableWithin(card).map((node) => node.id)).toEqual(["a", "b", "c"]);
  });

  test("returns nothing for a container with no focusable children", () => {
    document.body.innerHTML = '<div id="empty"><span>text</span></div>';

    expect(focusableWithin(document.getElementById("empty") as HTMLElement)).toEqual([]);
  });
});

describe("nextFocusTarget", () => {
  test("moves forward through the list", () => {
    expect(nextFocusTarget(card, document.getElementById("a"), false)?.id).toBe("b");
  });

  test("wraps from the last item to the first", () => {
    expect(nextFocusTarget(card, document.getElementById("c"), false)?.id).toBe("a");
  });

  test("wraps backwards from the first item to the last", () => {
    expect(nextFocusTarget(card, document.getElementById("a"), true)?.id).toBe("c");
  });

  test("enters at the first item when focus is outside the card", () => {
    expect(nextFocusTarget(card, document.body, false)?.id).toBe("a");
    expect(nextFocusTarget(card, null, false)?.id).toBe("a");
  });

  test("enters at the last item when shift-tabbing from outside", () => {
    expect(nextFocusTarget(card, document.body, true)?.id).toBe("c");
  });

  test("returns null when there is nothing to focus", () => {
    document.body.innerHTML = '<div id="empty"></div>';

    expect(nextFocusTarget(document.getElementById("empty") as HTMLElement, null, false)).toBe(
      null,
    );
  });
});
