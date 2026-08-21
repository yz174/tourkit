import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ProgressProps } from "../types";

const TRACK_WIDTH = 96;

export function ProgressDots({ index, total, theme }: ProgressProps) {
  const steps = useMemo(
    () => Array.from({ length: total }, (_, position) => ({ id: `step-${position}`, position })),
    [total],
  );

  if (total <= 1) return null;

  const active = theme.progress.activeColor ?? theme.accent;
  const rest = theme.progress.restColor ?? theme.text.body.color;
  const style = theme.progress.style;

  if (style === "numbers") {
    return (
      <Text
        style={[
          styles.numbers,
          {
            color: active,
            fontSize: theme.text.body.fontSize,
            fontWeight: theme.text.body.fontWeight,
          },
        ]}
      >
        {index + 1} / {total}
      </Text>
    );
  }

  if (style === "continuous") {
    const filled = Math.round(TRACK_WIDTH * ((index + 1) / total));
    return (
      <View style={styles.track}>
        <View style={[StyleSheet.absoluteFill, styles.rest, { backgroundColor: rest }]} />
        <View style={[styles.fill, { width: filled, backgroundColor: active }]} />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {steps.map((step) => {
        const done = step.position <= index;
        const isActive = style === "segmented" && step.position === index;
        return (
          <View
            key={step.id}
            style={[
              styles.dot,
              isActive && styles.segmentActive,
              { backgroundColor: done ? active : rest },
              !done && styles.rest,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  segmentActive: { width: 22 },
  rest: { opacity: 0.3 },
  numbers: { letterSpacing: 0.2 },
  track: { width: TRACK_WIDTH, height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
});
