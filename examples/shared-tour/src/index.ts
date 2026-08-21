import type { TourConfig } from "@tourkit/core";

export type AppContext = {
  plan: "free" | "pro";
  hasPostedRide: boolean;
};

export const TARGET = {
  postRide: "post-ride",
  inbox: "inbox",
  billing: "billing",
  history: "history",
} as const;

export const ROUTE = {
  home: "/",
  inbox: "/inbox",
} as const;

export const onboarding: TourConfig<AppContext> = {
  id: "onboarding",
  version: 1,
  entryRoute: ROUTE.home,
  steps: [
    {
      id: "post-ride",
      target: TARGET.postRide,
      title: "Post a ride",
      body: "Offer a seat and pick who rides with you.",
      radius: "auto",
      interaction: "advance-on-press",
    },
    {
      id: "inbox",
      target: TARGET.inbox,
      route: ROUTE.inbox,
      title: "Your messages",
      body: "Riders reach you here once they request a seat.",
    },
    {
      id: "billing",
      target: TARGET.billing,
      title: "Payouts",
      body: "Pro accounts get same-day payouts.",
      when: (context) => context.plan === "pro",
    },
    {
      id: "history",
      target: TARGET.history,
      title: "Past rides",
      body: "Everything you have driven or ridden.",
      scroll: { block: "start" },
      gateTimeoutMs: 3000,
    },
    {
      id: "done",
      target: null,
      title: "That is the tour",
      body: "Start it again any time from the help menu.",
    },
  ],
};

export const tours = [onboarding];
