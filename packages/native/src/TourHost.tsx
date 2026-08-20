import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  type EasingFunction,
  type EasingFunctionFactory,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTourContext } from "./context";
import { useTour, useTourSnapshot } from "./hooks";
import type { SpotlightGeometry } from "./types";
import { cardWidthFor, resolvePlacement } from "./ui/placement";
import { padRect, resolvePadding, resolveRadius } from "./ui/resolve";
import { TouchShield } from "./ui/TouchShield";

type AnyEasing = EasingFunction | EasingFunctionFactory;

const EASE_OUT_QUINT: AnyEasing = Easing.bezier(0.22, 1, 0.36, 1);

const EASINGS: Record<string, AnyEasing | undefined> = {
  easeOutQuint: EASE_OUT_QUINT,
  easeOut: Easing.out(Easing.quad),
  linear: Easing.linear,
};

export function TourHost() {
  const { components, insets, geometry: registry } = useTourContext();
  const snapshot = useTourSnapshot();
  const { next, prev, skip, stop } = useTour();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [reduceMotion, setReduceMotion] = useState(false);
  const [cardHeight, setCardHeight] = useState(0);

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const radius = useSharedValue(0);
  const cardLeft = useSharedValue(0);
  const cardTop = useSharedValue(0);
  const cardOpacity = useSharedValue(0);

  const placed = useRef(false);
  const lastTarget = useRef<string | null>(null);

  const { status, step, stepIndex, total, activeTarget, theme } = snapshot;
  const running = status !== "idle";
  const hole = activeTarget ? (snapshot.rects[activeTarget] ?? null) : null;

  const easing = EASINGS[theme.motion.easing] ?? EASE_OUT_QUINT;
  const padding = resolvePadding(
    step,
    activeTarget ? registry.get(activeTarget) : undefined,
    theme,
  );
  const targetRadius = resolveRadius(
    step,
    activeTarget ? registry.get(activeTarget) : undefined,
    theme,
  );

  const cardWidth = cardWidthFor(theme.card.maxWidth, screenWidth, 16);
  const placement = useMemo(
    () =>
      resolvePlacement({
        hole: hole ? padRect(hole, padding) : null,
        cardWidth,
        cardHeight,
        screenWidth,
        screenHeight,
        insets,
        gap: 14,
        margin: 16,
        arrowSize: theme.arrow.size,
        cardRadius: theme.card.radius,
        preferred: step?.placement ?? "auto",
      }),
    [
      hole,
      padding,
      cardWidth,
      cardHeight,
      screenWidth,
      screenHeight,
      insets,
      theme.arrow.size,
      theme.card.radius,
      step,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!running) {
      placed.current = false;
      lastTarget.current = null;
      setCardHeight(0);
      cardOpacity.value = 0;
      return;
    }

    const isNewTarget = lastTarget.current !== activeTarget;
    lastTarget.current = activeTarget;

    const config = {
      duration: reduceMotion ? theme.motion.fade : theme.motion.morph,
      easing,
    };
    const animate = placed.current && isNewTarget && !reduceMotion;

    if (!hole) {
      width.value = animate ? withTiming(0, config) : 0;
      height.value = animate ? withTiming(0, config) : 0;
      return;
    }

    const padded = padRect(hole, padding);
    const next = {
      x: padded.x,
      y: padded.y,
      width: padded.width,
      height: padded.height,
      radius: targetRadius + padding,
    };

    if (animate) {
      x.value = withTiming(next.x, config);
      y.value = withTiming(next.y, config);
      width.value = withTiming(next.width, config);
      height.value = withTiming(next.height, config);
      radius.value = withTiming(next.radius, config);
    } else {
      x.value = next.x;
      y.value = next.y;
      width.value = next.width;
      height.value = next.height;
      radius.value = next.radius;
      placed.current = true;
    }
  }, [
    running,
    hole,
    activeTarget,
    padding,
    targetRadius,
    reduceMotion,
    easing,
    theme.motion.morph,
    theme.motion.fade,
    x,
    y,
    width,
    height,
    radius,
    cardOpacity,
  ]);

  useEffect(() => {
    if (!running || cardHeight === 0) return;
    const config = { duration: theme.motion.travel, easing };
    if (cardOpacity.value === 0) {
      cardLeft.value = placement.left;
      cardTop.value = placement.top;
      cardOpacity.value = withTiming(1, { duration: theme.motion.fade, easing });
      return;
    }
    if (reduceMotion) {
      cardLeft.value = placement.left;
      cardTop.value = placement.top;
      return;
    }
    cardLeft.value = withTiming(placement.left, config);
    cardTop.value = withTiming(placement.top, config);
  }, [
    running,
    cardHeight,
    placement,
    reduceMotion,
    easing,
    theme.motion.travel,
    theme.motion.fade,
    cardLeft,
    cardTop,
    cardOpacity,
  ]);

  useEffect(() => {
    if (!step) return;
    const spoken = [step.title, step.body].filter(Boolean).join(". ");
    if (spoken) AccessibilityInfo.announceForAccessibility(spoken);
  }, [step]);

  const spotlight: SpotlightGeometry = useMemo(
    () => ({ x, y, width, height, radius }),
    [x, y, width, height, radius],
  );

  const cardStyle = useAnimatedStyle(() => ({
    left: cardLeft.value,
    top: cardTop.value,
    opacity: cardOpacity.value,
  }));

  if (!running || !step) return null;

  const { Card, Backdrop } = components;

  return (
    <View
      accessibilityViewIsModal
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      testID="tourkit-host"
    >
      <TouchShield />
      <Backdrop geometry={spotlight} theme={theme} />
      <Animated.View
        pointerEvents="box-none"
        onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
        style={[styles.cardWrap, { width: cardWidth }, cardStyle]}
      >
        <Card
          step={step}
          index={stepIndex}
          total={total}
          rect={hole}
          placement={placement}
          theme={theme}
          isFirst={stepIndex === 0}
          isLast={stepIndex === total - 1}
          next={next}
          prev={prev}
          skip={skip}
          stop={stop}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: { position: "absolute" },
});
