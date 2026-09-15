import { useEffect, useId } from "react";
import { AccessibilityInfo, StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, Mask, Path, Rect as SvgRect } from "react-native-svg";
import type { BackdropProps } from "../types";
import { holeMaskPath, roundedRectPath } from "./geometry";

const AnimatedPath = Animated.createAnimatedComponent(Path);

let warnedAboutBlur = false;

function warnMissingBlur(): void {
  if (warnedAboutBlur) return;
  warnedAboutBlur = true;
  console.warn(
    "tourkit: theme.blur is enabled but no blur backdrop is mounted, so the dim scrim is being " +
      "used instead. Install @react-native-masked-view/masked-view and expo-blur, then pass " +
      "components={{ Backdrop: createBlurBackdrop({ MaskedView, BlurView }) }}.",
  );
}

export function Spotlight({ geometry, extraHoles, theme, size }: BackdropProps) {
  const { width, height } = size;
  if (theme.blur.enabled && __DEV__) warnMissingBlur();
  const maskId = `tourkitHole${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const breathe = useSharedValue(0);
  const ringWidth = theme.ring.width;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled || reduced || !theme.ring.show) return;
      breathe.value = withRepeat(
        withTiming(1, { duration: theme.ring.period / 2, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    });
    return () => {
      cancelled = true;
      breathe.value = 0;
    };
  }, [breathe, theme.ring.show, theme.ring.period]);

  const ringProps = useAnimatedProps(() => ({
    d: roundedRectPath(
      geometry.x.value - ringWidth,
      geometry.y.value - ringWidth,
      geometry.width.value + ringWidth * 2,
      geometry.height.value + ringWidth * 2,
      {
        topLeft: geometry.radius.value + ringWidth,
        topRight: geometry.radiusTopRight.value + ringWidth,
        bottomRight: geometry.radiusBottomRight.value + ringWidth,
        bottomLeft: geometry.radiusBottomLeft.value + ringWidth,
      },
    ),
    opacity: 0.3 + breathe.value * 0.55,
  }));

  const extras = extraHoles ?? [];
  const animatedProps = useAnimatedProps(() => ({
    d: holeMaskPath(
      width,
      height,
      geometry.x.value,
      geometry.y.value,
      geometry.width.value,
      geometry.height.value,
      {
        topLeft: geometry.radius.value,
        topRight: geometry.radiusTopRight.value,
        bottomRight: geometry.radiusBottomRight.value,
        bottomLeft: geometry.radiusBottomLeft.value,
      },
    ),
  }));

  // Extra holes are drawn as their own path rather than folded into the animated one: the
  // worklet cannot iterate a JS array captured from render without copying it every frame.
  const extraPath = extras.reduce(
    (path, hole) => path + roundedRectPath(hole.x, hole.y, hole.width, hole.height, hole.radius),
    "",
  );

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Mask id={maskId}>
          <AnimatedPath animatedProps={animatedProps} fill="#ffffff" fillRule="evenodd" />
          {extraPath ? <Path d={extraPath} fill="#000000" fillRule="evenodd" /> : null}
        </Mask>
      </Defs>
      <SvgRect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={theme.scrim.color}
        fillOpacity={theme.scrim.opacity}
        mask={`url(#${maskId})`}
      />
      {theme.ring.show ? (
        <AnimatedPath
          animatedProps={ringProps}
          fill="none"
          stroke={theme.ring.color ?? theme.accent}
          strokeWidth={ringWidth}
        />
      ) : null}
    </Svg>
  );
}
