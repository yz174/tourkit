import type { NavAdapter } from "./types";

export type RouteMatch = "exact" | "prefix" | "includes";

export type NavAdapterOptions = {
  pathname: string;
  navigate: (route: string) => void | Promise<void>;
  match?: RouteMatch;
};

function normalize(value: string): string {
  const trimmed = value.split("?")[0]?.split("#")[0] ?? "";
  const lowered = trimmed.toLowerCase();
  if (lowered.length > 1 && lowered.endsWith("/")) return lowered.slice(0, -1);
  return lowered;
}

export function routeMatches(pathname: string, route: string, match: RouteMatch): boolean {
  const current = normalize(pathname);
  const wanted = normalize(route);
  if (wanted === "") return true;
  if (match === "includes") return current.includes(wanted);
  if (match === "prefix") return current === wanted || current.startsWith(`${wanted}/`);
  return current === wanted;
}

export function createNavAdapter({
  pathname,
  navigate,
  match = "exact",
}: NavAdapterOptions): NavAdapter {
  return {
    getRoute: () => pathname,
    matches: (route) => routeMatches(pathname, route, match),
    navigate,
  };
}
