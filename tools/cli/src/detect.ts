export type ProjectKind = "next" | "expo" | "react-native" | "react" | "unknown";

export type Manifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export function detectProject(manifest: Manifest): ProjectKind {
  const deps = { ...manifest.devDependencies, ...manifest.dependencies };
  if (deps.expo) return "expo";
  if (deps["react-native"]) return "react-native";
  if (deps.next) return "next";
  if (deps.react) return "react";
  return "unknown";
}

export function isNative(kind: ProjectKind): boolean {
  return kind === "expo" || kind === "react-native";
}

export function packagesFor(kind: ProjectKind): string[] {
  if (isNative(kind)) {
    return ["@tourkit/native", "react-native-svg", "react-native-reanimated"];
  }
  return ["@tourkit/react"];
}
