import { useId } from "react";
import { StyleSheet } from "react-native";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import Svg, { Defs, Mask, Path, Rect as SvgRect } from "react-native-svg";
import type { BackdropProps } from "../types";
import { holeMaskPath } from "./geometry";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function Spotlight({ geometry, theme, size }: BackdropProps) {
  const { width, height } = size;
  const maskId = `tourkitHole${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const animatedProps = useAnimatedProps(() => ({
    d: holeMaskPath(
      width,
      height,
      geometry.x.value,
      geometry.y.value,
      geometry.width.value,
      geometry.height.value,
      geometry.radius.value,
    ),
  }));

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Mask id={maskId}>
          <AnimatedPath animatedProps={animatedProps} fill="#ffffff" fillRule="evenodd" />
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
    </Svg>
  );
}
