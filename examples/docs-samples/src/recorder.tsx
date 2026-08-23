import { TourRecorder as NativeRecorder } from "@tourkit/native";
import { TourRecorder } from "@tourkit/react";

declare const __DEV__: boolean;

export function DevTools() {
  return process.env.NODE_ENV === "development" ? (
    <TourRecorder
      name="Driver onboarding"
      onFinish={(recording) => console.log(recording.steps.length)}
    />
  ) : null;
}

export function DevToolsWithoutServer() {
  return <TourRecorder autoShow={false} name="Driver onboarding" />;
}

export function NativeDevTools() {
  return __DEV__ ? <NativeRecorder name="Driver onboarding" /> : null;
}
