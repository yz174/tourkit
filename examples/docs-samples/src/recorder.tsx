import { TourRecorder } from "@tourkit/react";

export function DevTools() {
  return process.env.NODE_ENV === "development" ? (
    <TourRecorder
      name="Driver onboarding"
      onFinish={(recording) => console.log(recording.steps.length)}
    />
  ) : null;
}
