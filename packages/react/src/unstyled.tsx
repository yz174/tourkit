import { TourProvider as StyledProvider, type TourProviderProps } from "./TourProvider";

export function TourProvider<Ctx = unknown>(props: TourProviderProps<Ctx>) {
  return <StyledProvider styled={false} {...props} />;
}

export * from "./index";
export type { TourProviderProps };
