import { TourRecorder as NativeRecorder } from "@tourkit/native";

declare const __DEV__: boolean;

/**
 * Web recording no longer mounts a component. The tourkit skill injects a script tag into the
 * HTML entry, so there is nothing to render and nothing to strip from the production bundle.
 * See docs/recorder.md.
 */
export function NativeDevTools() {
  return __DEV__ ? <NativeRecorder name="Driver onboarding" /> : null;
}
