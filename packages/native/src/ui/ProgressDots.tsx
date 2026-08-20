import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import type { ProgressProps } from "../types";

export function ProgressDots({ index, total, theme }: ProgressProps) {
  const dots = useMemo(
    () => Array.from({ length: total }, (_, position) => ({ id: `dot-${position}`, position })),
    [total],
  );

  if (total <= 1) return null;

  return (
    <View style={styles.row}>
      {dots.map((dot) => (
        <View
          key={dot.id}
          style={[
            styles.dot,
            { backgroundColor: dot.position <= index ? theme.accent : theme.text.body.color },
            dot.position > index && styles.rest,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  rest: { opacity: 0.3 },
});
