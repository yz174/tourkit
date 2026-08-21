import type { ComponentType, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import type { BackdropProps } from "../types";
import { holeMaskPath } from "./geometry";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type MaskedViewComponent = ComponentType<{
  maskElement: ReactNode;
  style?: unknown;
  children?: ReactNode;
}>;

export type BlurViewComponent = ComponentType<{
  intensity?: number;
  tint?: string;
  style?: unknown;
}>;

export type BlurModules = {
  MaskedView: MaskedViewComponent;
  BlurView: BlurViewComponent;
};

export function createBlurBackdrop({
  MaskedView,
  BlurView,
}: BlurModules): ComponentType<BackdropProps> {
  return function BlurBackdrop({ geometry, theme, size }: BackdropProps) {
    const { width, height } = size;

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

    const intensity = Math.max(0, Math.min(100, Math.round(theme.blur.radius * 8)));

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <Svg style={StyleSheet.absoluteFill}>
              <AnimatedPath animatedProps={animatedProps} fill="#ffffff" fillRule="evenodd" />
            </Svg>
          }
        >
          <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.scrim.color, opacity: theme.scrim.opacity * 0.65 },
            ]}
          />
        </MaskedView>
      </View>
    );
  };
}
