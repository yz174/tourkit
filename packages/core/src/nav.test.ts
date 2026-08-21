import { describe, expect, test } from "bun:test";
import { createNavAdapter, routeMatches } from "./nav";

describe("routeMatches exact", () => {
  test("matches the same path", () => {
    expect(routeMatches("/inbox", "/inbox", "exact")).toBe(true);
  });

  test("rejects a different path", () => {
    expect(routeMatches("/inbox", "/settings", "exact")).toBe(false);
    expect(routeMatches("/inbox/archive", "/inbox", "exact")).toBe(false);
  });

  test("ignores case, a trailing slash, a query and a hash", () => {
    expect(routeMatches("/Inbox/", "/inbox", "exact")).toBe(true);
    expect(routeMatches("/inbox?page=2", "/inbox", "exact")).toBe(true);
    expect(routeMatches("/inbox#top", "/inbox", "exact")).toBe(true);
  });

  test("does not treat the root as a trailing slash", () => {
    expect(routeMatches("/", "/", "exact")).toBe(true);
    expect(routeMatches("/inbox", "/", "exact")).toBe(false);
  });
});

describe("routeMatches prefix", () => {
  test("matches the path itself and its children", () => {
    expect(routeMatches("/inbox", "/inbox", "prefix")).toBe(true);
    expect(routeMatches("/inbox/archive", "/inbox", "prefix")).toBe(true);
  });

  test("does not match a sibling that merely starts with the same letters", () => {
    expect(routeMatches("/inboxes", "/inbox", "prefix")).toBe(false);
  });
});

describe("routeMatches includes", () => {
  test("matches a fragment anywhere in the path", () => {
    expect(routeMatches("/(tabs)/carpooling", "carpooling", "includes")).toBe(true);
    expect(routeMatches("/carpooling", "carpooling", "includes")).toBe(true);
  });

  test("this is why expo-router needs it", () => {
    expect(routeMatches("/(tabs)/carpooling", "/carpooling", "exact")).toBe(false);
    expect(routeMatches("/(tabs)/carpooling", "carpooling", "includes")).toBe(true);
  });

  test("it is loose on purpose, and will match a substring of another segment", () => {
    expect(routeMatches("/profile-settings", "profile", "includes")).toBe(true);
  });
});

describe("an empty route", () => {
  test("matches anything, so a step without a route is never blocked", () => {
    expect(routeMatches("/anywhere", "", "exact")).toBe(true);
    expect(routeMatches("/anywhere", "", "includes")).toBe(true);
  });
});

describe("createNavAdapter", () => {
  test("reports the current route and defaults to exact matching", () => {
    const adapter = createNavAdapter({ pathname: "/inbox", navigate: () => {} });

    expect(adapter.getRoute()).toBe("/inbox");
    expect(adapter.matches("/inbox")).toBe(true);
    expect(adapter.matches("/inbox/archive")).toBe(false);
  });

  test("passes the navigate function straight through", async () => {
    const visited: string[] = [];
    const adapter = createNavAdapter({
      pathname: "/",
      navigate: (route) => {
        visited.push(route);
      },
    });

    await adapter.navigate("/inbox");

    expect(visited).toEqual(["/inbox"]);
  });

  test("the match strategy is selectable", () => {
    const adapter = createNavAdapter({
      pathname: "/(tabs)/carpooling",
      navigate: () => {},
      match: "includes",
    });

    expect(adapter.matches("carpooling")).toBe(true);
  });
});
