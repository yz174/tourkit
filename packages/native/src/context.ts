import type { NavAdapter, TourEngine } from "@tourkit/core";
import { createContext, useContext } from "react";
import type { Insets, ScrollHost, Slots, TargetGeometry, TargetNode } from "./types";

export type TourContextValue = {
  engine: TourEngine<unknown>;
  insets: Insets;
  components: Slots;
  geometry: Map<string, TargetGeometry>;
  nodes: Map<string, TargetNode>;
  scrollRef: ScrollHost | null;
  nav: NavAdapter | null;
  debug: boolean;
};

export const TourContext = createContext<TourContextValue | null>(null);

export function useTourContext(): TourContextValue {
  const value = useContext(TourContext);
  if (!value) {
    throw new Error("tourkit: this hook must be used inside <TourProvider>.");
  }
  return value;
}

export function useEngine<Ctx = unknown>(): TourEngine<Ctx> {
  return useTourContext().engine as unknown as TourEngine<Ctx>;
}
