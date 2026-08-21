import { createNavAdapter, defaultTheme } from "@tourkit/core";
import { TourProvider, TourTarget, useTour } from "@tourkit/native";
import { type ComponentRef, type ReactNode, useMemo, useRef } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { type AppContext, onboarding } from "./web";

type Scroller = ComponentRef<typeof ScrollView>;

export function Target() {
  return (
    <TourTarget id="post-ride" radius={22} padding={6}>
      <Pressable>
        <Text>Post a ride</Text>
      </Pressable>
    </TourTarget>
  );
}

export function Launcher() {
  const { start, running, stop, next, prev, skip } = useTour();
  return (
    <Pressable onPress={() => (running ? stop() : start("onboarding"))}>
      <Text onPress={next}>next</Text>
      <Text onPress={prev}>prev</Text>
      <Text onPress={skip}>skip</Text>
    </Pressable>
  );
}

export function Screen({ children, pathname }: { children: ReactNode; pathname: string }) {
  const scrollRef = useRef<Scroller | null>(null);
  const nav = useMemo(
    () =>
      createNavAdapter({
        pathname,
        navigate: (route) => console.log(route),
        match: "includes",
      }),
    [pathname],
  );

  return (
    <TourProvider<AppContext>
      tours={[onboarding]}
      context={{ plan: "pro", reportsLoaded: true, hasFiltered: false }}
      nav={nav}
      scrollRef={scrollRef}
      insets={{ top: 47, bottom: 34, left: 0, right: 0 }}
      theme={{ accent: defaultTheme.accent, spotlight: { padding: 4, radius: "auto" } }}
    >
      <ScrollView ref={scrollRef}>{children}</ScrollView>
    </TourProvider>
  );
}
