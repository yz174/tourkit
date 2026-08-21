import { beforeEach, describe, expect, test } from "vitest";
import { buildFingerprint, healTarget, nearestHeading, scoreCandidate } from "./fingerprint";
import { resolveTarget, resolveWithFingerprint } from "./resolve";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("nearestHeading", () => {
  test("finds a preceding sibling heading", () => {
    document.body.innerHTML = "<section><h2>Billing</h2><button>Pay</button></section>";

    expect(nearestHeading(document.querySelector("button") as Element)).toBe("Billing");
  });

  test("climbs to an ancestor's earlier heading", () => {
    document.body.innerHTML =
      "<main><h1>Settings</h1><section><div><button>Pay</button></div></section></main>";

    expect(nearestHeading(document.querySelector("button") as Element)).toBe("Settings");
  });

  test("falls back to an ancestor aria-label", () => {
    document.body.innerHTML = '<nav aria-label="Primary"><button>Home</button></nav>';

    expect(nearestHeading(document.querySelector("button") as Element)).toBe("Primary");
  });

  test("returns undefined when there is nothing nearby", () => {
    document.body.innerHTML = "<button>Alone</button>";

    expect(nearestHeading(document.querySelector("button") as Element)).toBeUndefined();
  });
});

describe("buildFingerprint", () => {
  test("captures what a refactor is least likely to change", () => {
    document.body.innerHTML = `
      <section aria-label="Rides">
        <h2>Your rides</h2>
        <button role="button" data-tour-label="Cancel ride" class="btn">Cancel</button>
      </section>`;

    expect(buildFingerprint(document.querySelector("button") as Element)).toEqual({
      tag: "button",
      text: "Cancel",
      role: "button",
      label: "Cancel ride",
      near: "Your rides",
    });
  });

  test("records a sibling position only when it disambiguates", () => {
    document.body.innerHTML = "<div><button>a</button><button>b</button></div>";
    const [first, second] = [...document.querySelectorAll("button")];

    expect(buildFingerprint(first as Element).index).toBe(1);
    expect(buildFingerprint(second as Element).index).toBe(2);

    document.body.innerHTML = "<div><button>only</button></div>";
    expect(buildFingerprint(document.querySelector("button") as Element).index).toBeUndefined();
  });

  test("collapses whitespace in the captured text", () => {
    document.body.innerHTML = "<button>  Post   a\n ride </button>";

    expect(buildFingerprint(document.querySelector("button") as Element).text).toBe("Post a ride");
  });
});

describe("scoreCandidate", () => {
  test("a different tag scores nothing regardless of the rest", () => {
    document.body.innerHTML = '<a aria-label="Cancel ride">Cancel</a>';

    expect(
      scoreCandidate(document.querySelector("a") as Element, {
        tag: "button",
        label: "Cancel ride",
        text: "Cancel",
      }),
    ).toBe(0);
  });

  test("more matching signals score higher", () => {
    document.body.innerHTML = '<button aria-label="Cancel ride">Cancel</button>';
    const element = document.querySelector("button") as Element;

    const weak = scoreCandidate(element, { tag: "button", text: "Cancel" });
    const strong = scoreCandidate(element, {
      tag: "button",
      text: "Cancel",
      label: "Cancel ride",
    });

    expect(strong).toBeGreaterThan(weak);
  });
});

describe("healTarget", () => {
  test("recovers the element after its class was renamed", () => {
    document.body.innerHTML = `
      <section><h2>Your rides</h2>
        <button class="danger-btn" aria-label="Cancel ride">Cancel</button>
      </section>`;
    const fingerprint = buildFingerprint(document.querySelector("button") as Element);

    document.body.innerHTML = `
      <section><h2>Your rides</h2>
        <button class="Button_destructive__9fa2b" aria-label="Cancel ride">Cancel</button>
      </section>`;

    expect(healTarget(fingerprint)).toBe(document.querySelector("button"));
  });

  test("recovers the element after it moved in the tree", () => {
    document.body.innerHTML = `
      <main><h2>Your rides</h2><div><button aria-label="Cancel ride">Cancel</button></div></main>`;
    const fingerprint = buildFingerprint(document.querySelector("button") as Element);

    document.body.innerHTML = `
      <main><h2>Your rides</h2><aside><footer>
        <button aria-label="Cancel ride">Cancel</button>
      </footer></aside></main>`;

    expect(healTarget(fingerprint)).toBe(document.querySelector("button"));
  });

  test("refuses to guess between two equally plausible candidates", () => {
    document.body.innerHTML = "<div><button>Save</button></div>";
    const fingerprint = buildFingerprint(document.querySelector("button") as Element);

    document.body.innerHTML = `
      <div><button>Save</button></div>
      <div><button>Save</button></div>`;

    expect(healTarget(fingerprint)).toBe(null);
  });

  test("returns null when nothing scores well enough", () => {
    document.body.innerHTML = "<button>Completely different</button>";

    expect(healTarget({ tag: "button", label: "Cancel ride", text: "Cancel" })).toBe(null);
  });

  test("returns null when the tag no longer exists", () => {
    document.body.innerHTML = "<div>nothing here</div>";

    expect(healTarget({ tag: "button", label: "Cancel ride", text: "Cancel" })).toBe(null);
  });

  test("bails rather than scanning an enormous number of candidates", () => {
    document.body.innerHTML = Array.from({ length: 600 }, () => "<span>x</span>").join("");

    expect(healTarget({ tag: "span", text: "x", label: "x" })).toBe(null);
  });

  test("an invalid tag does not throw", () => {
    expect(healTarget({ tag: "!!!", text: "x" })).toBe(null);
  });
});

describe("resolveWithFingerprint", () => {
  test("uses the selector when it still matches and does not report healing", () => {
    document.body.innerHTML = '<button class="danger-btn" aria-label="Cancel ride">Cancel</button>';
    const fingerprint = buildFingerprint(document.querySelector("button") as Element);

    const result = resolveWithFingerprint(".danger-btn", new Map(), fingerprint);

    expect(result.element).toBe(document.querySelector("button"));
    expect(result.healed).toBe(false);
  });

  test("heals when the selector misses, and says so", () => {
    document.body.innerHTML = `
      <section><h2>Your rides</h2>
        <button class="danger-btn" aria-label="Cancel ride">Cancel</button>
      </section>`;
    const fingerprint = buildFingerprint(document.querySelector("button") as Element);

    document.body.innerHTML = `
      <section><h2>Your rides</h2>
        <button class="Button_destructive__9fa2b" aria-label="Cancel ride">Cancel</button>
      </section>`;

    expect(resolveTarget(".danger-btn", new Map())).toBe(null);

    const result = resolveWithFingerprint(".danger-btn", new Map(), fingerprint);
    expect(result.element).toBe(document.querySelector("button"));
    expect(result.healed).toBe(true);
  });

  test("without a fingerprint a missed selector stays missed", () => {
    document.body.innerHTML = '<button aria-label="Cancel ride">Cancel</button>';

    expect(resolveWithFingerprint(".danger-btn", new Map())).toEqual({
      element: null,
      healed: false,
    });
  });

  test("a registered id still wins over everything", () => {
    const registered = document.createElement("button");
    document.body.appendChild(registered);

    const result = resolveWithFingerprint("cta", new Map([["cta", registered]]), {
      tag: "button",
      text: "something else",
    });

    expect(result.element).toBe(registered);
    expect(result.healed).toBe(false);
  });
});
