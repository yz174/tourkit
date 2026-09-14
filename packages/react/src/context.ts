import type { StorageAdapter, TourEngine } from "@tourkit/core";
import { createContext, useContext } from "react";
import type { ClassNames, ScrollHandler, Slots } from "./types";

export type TourContextValue = {
  engine: TourEngine<unknown>;
  components: Slots;
  registry: Map<string, Element>;
  container: Element | null;
  styled: boolean;
  classNames: ClassNames;
  scrollHandler?: ScrollHandler | undefined;
  storage: StorageAdapter;
  openHint: string | null;
  setOpenHint: (id: string | null) => void;
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
