import { describe, expect, test } from "bun:test";
import {
  exportNameFrom,
  fallbackTitle,
  generateTourFile,
  type Recording,
  stepIdFrom,
  tourIdFrom,
  unregisteredTargets,
} from "./codegen";
import { recordingPath } from "./record";

const recording: Recording = {
  name: "Driver onboarding",
  createdAt: 0,
  steps: [
    {
      target: "post-ride",
      registered: true,
      tag: "button",
      label: "Post a ride",
      route: "/",
    },
    {
      target: "#inbox > button:nth-of-type(2)",
      registered: false,
      tag: "button",
      text: "Messages",
      route: "/inbox",
    },
  ],
};

describe("tourIdFrom", () => {
  test("slugifies a human name", () => {
    expect(tourIdFrom("Driver onboarding")).toBe("driver-onboarding");
    expect(tourIdFrom("  Pro / Billing!  ")).toBe("pro-billing");
  });

  test("falls back when nothing usable survives", () => {
    expect(tourIdFrom("///")).toBe("recorded");
    expect(tourIdFrom("")).toBe("recorded");
  });
});

describe("exportNameFrom", () => {
  test("produces a camelCase identifier", () => {
    expect(exportNameFrom("Driver onboarding")).toBe("driverOnboarding");
    expect(exportNameFrom("billing")).toBe("billing");
    expect(exportNameFrom("a b c")).toBe("aBC");
  });
});

describe("stepIdFrom", () => {
  test("prefers the label, then the text, then the target", () => {
    const taken = new Set<string>();
    expect(
      stepIdFrom({ target: "t", registered: true, tag: "button", label: "Post a ride" }, 0, taken),
    ).toBe("post-a-ride");
    expect(
      stepIdFrom({ target: "t", registered: true, tag: "button", text: "Messages" }, 1, taken),
    ).toBe("messages");
    expect(stepIdFrom({ target: "inbox", registered: true, tag: "button" }, 2, taken)).toBe(
      "inbox",
    );
  });

  test("never repeats an id", () => {
    const taken = new Set<string>();
    const step = { target: "t", registered: true, tag: "button", label: "Save" };

    expect(stepIdFrom(step, 0, taken)).toBe("save");
    expect(stepIdFrom(step, 1, taken)).toBe("save-2");
    expect(stepIdFrom(step, 2, taken)).toBe("save-3");
  });
});

describe("fallbackTitle", () => {
  test("capitalises and trims", () => {
    expect(
      fallbackTitle({ target: "t", registered: true, tag: "button", label: "post a ride" }),
    ).toBe("Post a ride");
  });

  test("collapses whitespace and caps the length", () => {
    const long = { target: "t", registered: true, tag: "button", text: `a${" b".repeat(80)}` };

    expect(fallbackTitle(long).length).toBeLessThanOrEqual(60);
    expect(fallbackTitle(long)).not.toContain("  ");
  });
});

describe("generateTourFile", () => {
  test("emits a compilable module with an import and a typed export", () => {
    const file = generateTourFile(recording);

    expect(file).toContain('import type { TourConfig } from "@tourkit/core";');
    expect(file).toContain("export const driverOnboarding: TourConfig = {");
    expect(file).toContain('id: "driver-onboarding",');
    expect(file).toContain("version: 1,");
    expect(file.endsWith("};\n")).toBe(true);
  });

  test("keeps the recorded targets verbatim", () => {
    const file = generateTourFile(recording);

    expect(file).toContain('target: "post-ride",');
    expect(file).toContain('target: "#inbox > button:nth-of-type(2)",');
  });

  test("adds a closing step with no target", () => {
    const file = generateTourFile(recording);

    expect(file).toContain("target: null,");
    expect(file).toContain('title: "That is the tour",');
  });

  test("writes routes only when the recording crossed more than one", () => {
    const single: Recording = {
      ...recording,
      steps: recording.steps.map((step) => ({ ...step, route: "/" })),
    };

    expect(generateTourFile(recording)).toContain('route: "/inbox",');
    expect(generateTourFile(single)).not.toContain("route:");
  });

  test("uses drafted copy when it is supplied", () => {
    const file = generateTourFile(recording, [
      { title: "Offer a seat", body: "Pick who rides with you." },
      { title: "Read messages" },
    ]);

    expect(file).toContain('title: "Offer a seat",');
    expect(file).toContain('body: "Pick who rides with you.",');
    expect(file).toContain('title: "Read messages",');
  });

  test("falls back to the label when no draft is supplied", () => {
    expect(generateTourFile(recording)).toContain('title: "Post a ride",');
  });

  test("escapes quotes rather than producing a broken file", () => {
    const awkward: Recording = {
      name: "x",
      createdAt: 0,
      steps: [{ target: 'a[title="hi"]', registered: false, tag: "a", label: 'He said "go"' }],
    };
    const file = generateTourFile(awkward);

    expect(file).toContain('target: "a[title=\\"hi\\"]",');
    expect(file).toContain('title: "He said \\"go\\"",');
  });

  test("step ids are unique even when two steps share a label", () => {
    const repeated: Recording = {
      name: "x",
      createdAt: 0,
      steps: [
        { target: "a", registered: true, tag: "button", label: "Next" },
        { target: "b", registered: true, tag: "button", label: "Next" },
      ],
    };
    const ids = [...generateTourFile(repeated).matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("unregisteredTargets", () => {
  test("finds the steps that fell back to a selector", () => {
    expect(unregisteredTargets(recording).map((step) => step.target)).toEqual([
      "#inbox > button:nth-of-type(2)",
    ]);
  });
});

describe("recordingPath", () => {
  test("names the file after the tour", () => {
    expect(recordingPath("src/tour", recording).split("\\").join("/")).toBe(
      "src/tour/driver-onboarding.tour.ts",
    );
  });
});
