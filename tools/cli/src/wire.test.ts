import { describe, expect, test } from "bun:test";
import { layoutCandidates, wireDiff, wireLayout } from "./wire";

const NEXT_LAYOUT = `import type { Metadata } from "next";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;

describe("wireLayout", () => {
  test("wraps the one children it finds and imports Tours", () => {
    const result = wireLayout(NEXT_LAYOUT, "../src/tour/Tours");
    expect(result.status).toBe("wrapped");
    if (result.status !== "wrapped") return;
    expect(result.contents).toContain("<Tours>{children}</Tours>");
    expect(result.contents).toContain('import { Tours } from "../src/tour/Tours";');
    // the import lands after the existing ones, not above the "use client" or a directive
    expect(result.contents.indexOf('from "../src/tour/Tours"')).toBeGreaterThan(
      result.contents.indexOf('import "./globals.css"'),
    );
  });

  test("a layout already wrapped is left alone", () => {
    const wrapped = wireLayout(NEXT_LAYOUT, "../src/tour/Tours");
    if (wrapped.status !== "wrapped") throw new Error("expected a wrap");
    expect(wireLayout(wrapped.contents, "../src/tour/Tours").status).toBe("already");
  });

  test("two children are ambiguous, so nothing is touched", () => {
    const two = NEXT_LAYOUT.replace("<body>{children}</body>", "<body>{children}{children}</body>");
    const result = wireLayout(two, "./Tours");
    expect(result.status).toBe("unclear");
    if (result.status === "unclear") expect(result.reason).toContain("more than one");
  });

  test("no children means there is nothing to wrap", () => {
    const result = wireLayout("export default function App() { return null; }", "./Tours");
    expect(result.status).toBe("unclear");
  });

  test("a file with no imports gives the import nowhere to go", () => {
    const result = wireLayout(
      "export default function App({ children }) { return {children}; }",
      "./Tours",
    );
    expect(result.status).toBe("unclear");
  });
});

describe("layoutCandidates", () => {
  test("native looks for expo router's layout first", () => {
    expect(layoutCandidates("expo")[0]).toBe("app/_layout.tsx");
  });

  test("web looks for the next app router layout first", () => {
    expect(layoutCandidates("next")[0]).toBe("app/layout.tsx");
  });
});

describe("wireDiff", () => {
  test("prints something a human can paste", () => {
    const lines = wireDiff("./tour/Tours").join("\n");
    expect(lines).toContain('import { Tours } from "./tour/Tours";');
    expect(lines).toContain("<Tours>");
  });
});

describe("regressions", () => {
  test("a single import at the very top is an anchor, not an absence", () => {
    const source = `import React from "react";
export default function App({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
`;
    const result = wireLayout(source, "./tour/provider");
    expect(result.status).toBe("wrapped");
    if (result.status !== "wrapped") return;
    expect(result.contents).toContain('import { Tours } from "./tour/provider";');
    expect(result.contents).toContain("<Tours>{children}</Tours>");
  });
});
