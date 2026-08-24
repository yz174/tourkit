import { readRecord, type ThemeOverride, type TourConfig } from "@tourkit/core";
import { TourProvider, useTour, useTourContext } from "@tourkit/react";
import { type ReactNode, useEffect, useMemo } from "react";

// docs/integration.md — the shape

export type AppContext = { plan: "free" | "pro" };

export const onboarding: TourConfig<AppContext> = {
  id: "onboarding",
  version: 1,
  steps: [
    { id: "post", target: "post-ride", title: "Post a ride", body: "Offer a seat here." },
    { id: "done", target: null, title: "That is the tour" },
  ],
};

export const tours = [onboarding];

// docs/integration.md — Next.js App Router, and every other stack

export function Tours({ children }: { children: ReactNode }) {
  return (
    <TourProvider<AppContext> tours={tours} context={{ plan: "free" }}>
      {children}
    </TourProvider>
  );
}

// docs/integration.md — starting the tour

export function HelpButton() {
  const { start, running } = useTour();
  return (
    <button type="button" onClick={() => start("onboarding")}>
      {running ? "Touring" : "Show me around"}
    </button>
  );
}

export function FirstRun() {
  const { storage } = useTourContext();
  const { start } = useTour();

  useEffect(() => {
    void readRecord(storage, onboarding).then((record) => {
      if (record?.outcome !== "completed") start("onboarding");
    });
  }, [storage, start]);

  return null;
}

// docs/theme.md — following a dark mode toggle

export function Themed({ children, dark }: { children: ReactNode; dark: boolean }) {
  const theme = useMemo<ThemeOverride>(
    () =>
      dark
        ? { card: { background: "#101828" }, scrim: { opacity: 0.9 }, text: { contrast: "auto" } }
        : { text: { contrast: "auto" } },
    [dark],
  );

  return (
    <TourProvider<AppContext> tours={tours} context={{ plan: "free" }} theme={theme}>
      {children}
    </TourProvider>
  );
}
