import type { TourConfig } from "@tourkit/core";

export const withFingerprints: TourConfig = {
  id: "healing",
  version: 1,
  steps: [
    {
      id: "cancel",
      target: ".danger-btn",
      title: "Cancel a ride",
      fingerprint: {
        tag: "button",
        text: "Cancel",
        label: "Cancel ride",
        near: "Your rides",
      },
    },
    { id: "stable", target: "cancel-ride", title: "No fingerprint needed" },
  ],
};
