import type { TourConfig } from "@tourkit/core";

export const recordedWalkthrough: TourConfig = {
  id: "recorded-walkthrough",
  version: 1,
  steps: [
    {
      id: "my-rides",
      target: "my-rides",
      title: "My rides",
    },
    {
      id: "ride-options",
      target: "ride-menu",
      title: "Ride options",
    },
    {
      id: "cancel-ride",
      target: "cancel-ride",
      title: "Cancel ride",
    },
    {
      id: "hero-button",
      target: "#hero",
      title: "Hero button",
      fingerprint: {
        tag: "button",
        text: "Hero button",
      },
    },
    {
      id: "inside-modal",
      target: "#in-modal",
      title: "Inside modal",
      fingerprint: {
        tag: "button",
        text: "Inside modal",
      },
    },
    {
      id: "done",
      target: null,
      title: "That is the tour",
    },
  ],
};
