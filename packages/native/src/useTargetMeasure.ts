import type { Rect } from "@tourkit/core";
import { useCallback, useEffect } from "react";
import type { View } from "react-native";
import {
  measure,
  runOnJS,
  type SharedValue,
  useAnimatedRef,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import { useEngine } from "./context";
import { useTourSelector } from "./hooks";

const EPSILON = 0.5;

export type ChildBox = { x: number; y: number; width: number; height: number };

export function useTargetMeasure(id: string, childBox: SharedValue<ChildBox | null>) {
  const engine = useEngine();
  const ref = useAnimatedRef<View>();
  const last = useSharedValue<Rect | null>(null);

  const isActive = useTourSelector((snapshot) => snapshot.activeTarget === id);
  const isRunning = useTourSelector((snapshot) => snapshot.status !== "idle");

  const push = useCallback(
    (rect: Rect) => {
      engine.setRect(id, rect);
    },
    [engine, id],
  );

  const measureOnJs = useCallback(() => {
    const node = ref.current;
    if (!node?.measureInWindow) return;
    node.measureInWindow((x, y, width, height) => {
      if (width === 0 && height === 0) return;
      const child = childBox.value;
      const rect = child
        ? { x: x + child.x, y: y + child.y, width: child.width, height: child.height }
        : { x, y, width, height };
      last.value = rect;
      push(rect);
    });
  }, [ref, last, push, childBox]);

  const frame = useFrameCallback(() => {
    const measured = measure(ref);
    if (measured === null) return;
    const child = childBox.value;
    const next = child
      ? {
          x: measured.pageX + child.x,
          y: measured.pageY + child.y,
          width: child.width,
          height: child.height,
        }
      : {
          x: measured.pageX,
          y: measured.pageY,
          width: measured.width,
          height: measured.height,
        };
    const previous = last.value;
    if (
      previous !== null &&
      Math.abs(previous.x - next.x) < EPSILON &&
      Math.abs(previous.y - next.y) < EPSILON &&
      Math.abs(previous.width - next.width) < EPSILON &&
      Math.abs(previous.height - next.height) < EPSILON
    ) {
      return;
    }
    last.value = next;
    runOnJS(push)(next);
  }, false);

  useEffect(() => {
    frame.setActive(isActive);
    return () => {
      frame.setActive(false);
    };
  }, [frame, isActive]);

  useEffect(() => {
    if (isRunning) measureOnJs();
  }, [isRunning, measureOnJs]);

  useEffect(() => {
    return () => {
      engine.clearRect(id);
    };
  }, [engine, id]);

  return { ref, measure: measureOnJs };
}
