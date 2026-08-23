import { isNative, type ProjectKind } from "./detect";

export type WireResult =
  | { status: "wrapped"; contents: string }
  | { status: "already" }
  | { status: "unclear"; reason: string };

export function layoutCandidates(kind: ProjectKind): string[] {
  if (isNative(kind)) return ["app/_layout.tsx", "src/app/_layout.tsx", "App.tsx", "src/App.tsx"];
  return ["app/layout.tsx", "src/app/layout.tsx", "src/App.tsx", "App.tsx"];
}

function importLine(importPath: string): string {
  return `import { Tours } from "${importPath}";`;
}

export function wireLayout(source: string, importPath: string): WireResult {
  if (source.includes("<Tours")) return { status: "already" };

  const occurrences = source.split("{children}").length - 1;
  if (occurrences === 0) {
    return { status: "unclear", reason: "no {children} to wrap" };
  }
  if (occurrences > 1) {
    return { status: "unclear", reason: "more than one {children}" };
  }

  const withChildren = source.replace("{children}", "<Tours>{children}</Tours>");

  const imports = [...withChildren.matchAll(/^import .*?;$/gm)];
  const last = imports.at(-1);
  // A single import at the very top of the file has index 0, which is a position, not an absence.
  if (last?.index === undefined) return { status: "unclear", reason: "no imports to anchor onto" };

  const at = last.index + last[0].length;
  const contents = `${withChildren.slice(0, at)}\n${importLine(importPath)}${withChildren.slice(at)}`;
  return { status: "wrapped", contents };
}

export function wireDiff(importPath: string): string[] {
  return [`+ ${importLine(importPath)}`, "", "  <Tours>", "    {children}", "  </Tours>"];
}
