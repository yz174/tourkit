import { describe, expect, test } from "bun:test";
import { detectProject, isNative, packagesFor } from "./detect";
import { nextSteps, scaffoldFiles } from "./scaffold";

describe("detectProject", () => {
  test("expo wins over react-native and react", () => {
    expect(
      detectProject({ dependencies: { expo: "54", "react-native": "0.81", react: "19" } }),
    ).toBe("expo");
  });

  test("react-native without expo is a bare native project", () => {
    expect(detectProject({ dependencies: { "react-native": "0.81", react: "19" } })).toBe(
      "react-native",
    );
  });

  test("next wins over plain react", () => {
    expect(detectProject({ dependencies: { next: "15", react: "19" } })).toBe("next");
  });

  test("react alone is a plain web project", () => {
    expect(detectProject({ dependencies: { react: "19" } })).toBe("react");
  });

  test("dev dependencies count too", () => {
    expect(detectProject({ devDependencies: { next: "15" } })).toBe("next");
  });

  test("an empty manifest is unknown", () => {
    expect(detectProject({})).toBe("unknown");
    expect(detectProject({ dependencies: { lodash: "4" } })).toBe("unknown");
  });
});

describe("packagesFor", () => {
  test("native projects also need the two native peers", () => {
    expect(packagesFor("expo")).toEqual([
      "@tourkit/native",
      "react-native-svg",
      "react-native-reanimated",
    ]);
    expect(packagesFor("react-native")).toEqual(packagesFor("expo"));
  });

  test("web projects need one package", () => {
    expect(packagesFor("next")).toEqual(["@tourkit/react"]);
    expect(packagesFor("react")).toEqual(["@tourkit/react"]);
  });
});

describe("isNative", () => {
  test("covers both native kinds and nothing else", () => {
    expect(isNative("expo")).toBe(true);
    expect(isNative("react-native")).toBe(true);
    expect(isNative("next")).toBe(false);
    expect(isNative("react")).toBe(false);
    expect(isNative("unknown")).toBe(false);
  });
});

describe("scaffoldFiles", () => {
  test("writes a tours file and a provider into the chosen directory", () => {
    const files = scaffoldFiles("next", "src/tour");

    expect(files.map((file) => file.path)).toEqual(["src/tour/tours.ts", "src/tour/provider.tsx"]);
  });

  test("the web provider imports the web package and marks itself a client component", () => {
    const provider = scaffoldFiles("next", "src/tour")[1];

    expect(provider?.contents).toContain('from "@tourkit/react"');
    expect(provider?.contents).toContain('"use client"');
  });

  test("the native provider imports the native package and is not a client component", () => {
    const provider = scaffoldFiles("expo", "src/tour")[1];

    expect(provider?.contents).toContain('from "@tourkit/native"');
    expect(provider?.contents).not.toContain('"use client"');
  });

  test("the generated tour annotates the provider generic", () => {
    const provider = scaffoldFiles("react", "app/tour")[1];

    expect(provider?.contents).toContain("TourProvider<AppContext>");
    expect(provider?.contents).toContain('from "./tours"');
  });
});

describe("nextSteps", () => {
  test("web is told about the data attribute", () => {
    const steps = nextSteps("next", "src/tour").join(" ");

    expect(steps).toContain("data-tour-id");
    expect(steps).not.toContain("Rebuild");
  });

  test("native is told about TourTarget, the babel plugin and the rebuild", () => {
    const steps = nextSteps("expo", "src/tour").join(" ");

    expect(steps).toContain("TourTarget");
    expect(steps).toContain("react-native-reanimated/plugin");
    expect(steps).toContain("Rebuild");
  });

  test("every kind is told how to start the tour", () => {
    for (const kind of ["next", "react", "expo", "react-native"] as const) {
      expect(nextSteps(kind, "src/tour").join(" ")).toContain('start("onboarding")');
    }
  });
});

describe("the scaffolded files", () => {
  test("no two of them differ only in casing", () => {
    const names = scaffoldFiles("next", "src/tour").map((file) => file.path.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  test("the provider compiles under the classic JSX transform too", () => {
    for (const kind of ["next", "expo"] as const) {
      const provider = scaffoldFiles(kind, "src/tour").find((f) => f.path.endsWith("provider.tsx"));
      expect(provider?.contents).toContain('import React, { type ReactNode } from "react"');
    }
  });

  test("the recorder is mounted, and gated so it cannot reach production", () => {
    const web = scaffoldFiles("next", "src/tour").find((f) => f.path.endsWith("provider.tsx"));
    expect(web?.contents).toContain("<TourRecorder />");
    expect(web?.contents).toContain('process.env.NODE_ENV === "development"');

    const native = scaffoldFiles("expo", "src/tour").find((f) => f.path.endsWith("provider.tsx"));
    expect(native?.contents).toContain("__DEV__ ? <TourRecorder /> : null");
  });
});
