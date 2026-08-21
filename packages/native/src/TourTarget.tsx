import { type ReactNode, useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { useTourContext } from "./context";
import type { TargetNode } from "./types";
import { useTargetMeasure } from "./useTargetMeasure";

export type TourTargetProps = {
  id: string;
  children: ReactNode;
  radius?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
};

export function TourTarget({ id, children, radius, padding, style }: TourTargetProps) {
  const { geometry, nodes } = useTourContext();
  const { ref, measure } = useTargetMeasure(id);

  useEffect(() => {
    if (__DEV__ && geometry.has(id)) {
      console.warn(`tourkit: duplicate TourTarget id "${id}". The last one mounted wins.`);
    }
    geometry.set(id, {
      ...(radius === undefined ? {} : { radius }),
      ...(padding === undefined ? {} : { padding }),
    });
    return () => {
      geometry.delete(id);
    };
  }, [geometry, id, radius, padding]);

  useEffect(() => {
    const node = ref.current as TargetNode | null;
    if (node) nodes.set(id, node);
    return () => {
      if (nodes.get(id) === node) nodes.delete(id);
    };
  }, [nodes, id, ref]);

  return (
    <Animated.View ref={ref} collapsable={false} style={style} onLayout={measure}>
      {children}
    </Animated.View>
  );
}
