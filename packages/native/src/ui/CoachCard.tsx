import { resolveButtons } from "@tourkit/core";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTourContext } from "../context";
import type { CardProps } from "../types";

export function CoachCard({
  step,
  index,
  total,
  placement,
  theme,
  isFirst,
  isLast,
  dismissible,
  next,
  prev,
  stop,
}: CardProps) {
  const { components } = useTourContext();
  const Progress = components.Progress;
  const arrow = theme.arrow.show ? placement.arrow : null;
  const buttons = resolveButtons(step, dismissible);

  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${step.title ?? step.label ?? ""}. ${step.body ?? ""}. Step ${index + 1} of ${total}.`}
      style={[
        styles.card,
        {
          backgroundColor: theme.card.background,
          borderRadius: theme.card.radius,
          padding: theme.card.padding,
        },
        theme.card.shadow === "lifted" && styles.lifted,
      ]}
    >
      {arrow ? (
        <View
          style={[
            styles.arrow,
            {
              backgroundColor: theme.card.background,
              width: theme.arrow.size,
              height: theme.arrow.size,
              left: arrow.left,
            },
            arrow.onTop ? { top: -theme.arrow.size / 2 } : { bottom: -theme.arrow.size / 2 },
          ]}
        />
      ) : null}

      {buttons.close ? (
        <Pressable
          onPress={stop}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={buttons.closeLabel}
          style={({ pressed }) => [styles.close, pressed ? styles.pressed : null]}
        >
          <Text style={[theme.text.action, { color: theme.text.body.color }]}>×</Text>
        </Pressable>
      ) : null}

      {step.title ? <Text style={theme.text.title}>{step.title}</Text> : null}
      {step.body ? <Text style={[theme.text.body, styles.body]}>{step.body}</Text> : null}

      <View style={styles.footer}>
        <Progress index={index} total={total} theme={theme} />
        <View style={styles.actions}>
          {buttons.back && !isFirst ? (
            <Pressable
              onPress={prev}
              disabled={buttons.backDisabled}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Previous step"
              style={({ pressed }) => (pressed ? styles.pressed : null)}
            >
              <Text
                style={[
                  theme.text.action,
                  { color: theme.text.body.color, opacity: buttons.backDisabled ? 0.4 : 1 },
                ]}
              >
                {buttons.backLabel}
              </Text>
            </Pressable>
          ) : null}
          {buttons.next ? (
            <Pressable
              onPress={next}
              disabled={buttons.nextDisabled}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={isLast ? "Finish the tour" : "Next step"}
              style={({ pressed }) => (pressed ? styles.pressed : null)}
            >
              <Text
                style={[
                  theme.text.action,
                  { color: theme.accent, opacity: buttons.nextDisabled ? 0.4 : 1 },
                ]}
              >
                {buttons.advanceLabel(isLast)}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "visible" },
  lifted: {
    shadowColor: "#111827",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  arrow: { position: "absolute", borderRadius: 3, transform: [{ rotate: "45deg" }] },
  body: { marginTop: 4 },
  footer: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pressed: { opacity: 0.6 },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
  close: { position: "absolute", top: 8, right: 8, zIndex: 1 },
});
