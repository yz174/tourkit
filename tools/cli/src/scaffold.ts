import { isNative, type ProjectKind } from "./detect";

export type ScaffoldFile = { path: string; contents: string };

const TOUR = `import type { TourConfig } from "@tourkit/core";

export type AppContext = { plan: "free" | "pro" };

export const onboarding: TourConfig<AppContext> = {
  id: "onboarding",
  version: 1,
  steps: [
    {
      id: "welcome",
      target: "tourkit-first-target",
      title: "Start here",
      body: "Replace this step with your own.",
    },
    { id: "done", target: null, title: "That is the tour" },
  ],
};

export const tours = [onboarding];
`;

const WEB_PROVIDER = `"use client";

import { TourProvider, TourRecorder } from "@tourkit/react";
import React, { type ReactNode } from "react";
import { type AppContext, tours } from "./tours";

const dev = process.env.NODE_ENV === "development";

export function Tours({ children }: { children: ReactNode }) {
  return (
    <TourProvider<AppContext> tours={tours} context={{ plan: "free" }}>
      {children}
      {/* Shows itself only while \`tourkit record\` is running. */}
      {dev ? <TourRecorder /> : null}
    </TourProvider>
  );
}
`;

const NATIVE_PROVIDER = `import { TourProvider, TourRecorder } from "@tourkit/native";
import React, { type ReactNode } from "react";
import { type AppContext, tours } from "./tours";

export function Tours({ children }: { children: ReactNode }) {
  return (
    <TourProvider<AppContext> tours={tours} context={{ plan: "free" }}>
      {children}
      {/* Shows itself only while \`tourkit record\` is running. */}
      {__DEV__ ? <TourRecorder /> : null}
    </TourProvider>
  );
}
`;

export function scaffoldFiles(kind: ProjectKind, dir: string): ScaffoldFile[] {
  return [
    { path: `${dir}/tours.ts`, contents: TOUR },
    {
      // Not Tours.tsx: a case-insensitive filesystem cannot tell it apart from tours.ts, and
      // TypeScript then resolves an import of one to the other.
      path: `${dir}/provider.tsx`,
      contents: isNative(kind) ? NATIVE_PROVIDER : WEB_PROVIDER,
    },
  ];
}

export function nextSteps(kind: ProjectKind, dir: string, wired = false): string[] {
  const steps = wired ? [] : [`Wrap your app in <Tours> from ${dir}/provider.tsx.`];
  if (isNative(kind)) {
    steps.push(
      `Wrap one element in <TourTarget id="tourkit-first-target">.`,
      `Add "react-native-reanimated/plugin" to your babel plugins if it is not there.`,
      `Rebuild the native app, since react-native-svg and reanimated are native modules.`,
    );
  } else {
    steps.push(`Add data-tour-id="tourkit-first-target" to one element.`);
  }
  steps.push(
    `Call start("onboarding") from useTour() somewhere.`,
    isNative(kind)
      ? `Run  tourkit record ${dir} --host  and the recorder panel appears in your app.`
      : `Run  tourkit record ${dir}  and the recorder panel appears in your app.`,
  );
  return steps;
}
