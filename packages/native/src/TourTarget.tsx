import {
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import Animated, { useSharedValue } from "react-native-reanimated";
import { useTourContext } from "./context";
import type { TargetNode } from "./types";
import { type ChildBox, useTargetMeasure } from "./useTargetMeasure";

export type TourTargetProps = {
  id: string;
  children: ReactNode;
  radius?: number;
  padding?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

type MeasurableChild = {
  onLayout?: (event: LayoutChangeEvent) => void;
  ref?: Ref<TargetNode>;
};

export function TourTarget({ id, children, radius, padding, label, style }: TourTargetProps) {
  const { geometry, nodes } = useTourContext();
  // A wrapper View's box includes its child's margins, so measuring the wrapper alone puts the
  // hole off-centre by exactly those margins. The child's own layout is the box the user sees.
  const childBox = useSharedValue<ChildBox | null>(null);
  const childRef = useRef<TargetNode | null>(null);
  const warned = useRef(false);
  const { ref, measure } = useTargetMeasure(id, childBox);

  useEffect(() => {
    if (__DEV__ && geometry.has(id)) {
      console.warn(`tourkit: duplicate TourTarget id "${id}". The last one mounted wins.`);
    }
    geometry.set(id, {
      ...(radius === undefined ? {} : { radius }),
      ...(padding === undefined ? {} : { padding }),
      ...(label === undefined ? {} : { label }),
    });
    return () => {
      geometry.delete(id);
    };
  }, [geometry, id, radius, padding, label]);

  useEffect(() => {
    const node = ref.current as TargetNode | null;
    if (node) nodes.set(id, node);
    return () => {
      if (nodes.get(id) === node) nodes.delete(id);
    };
  }, [nodes, id, ref]);

  const setChildBox = useCallback(
    (box: ChildBox) => {
      const current = childBox.value;
      if (
        current !== null &&
        current.x === box.x &&
        current.y === box.y &&
        current.width === box.width &&
        current.height === box.height
      ) {
        return;
      }
      childBox.value = box;
      measure();
    },
    [childBox, measure],
  );

  // A child that forwards a ref but drops onLayout still gets an exact box: measure both views
  // in window coordinates and keep the difference.
  const measureChildRef = useCallback(() => {
    const wrapper = ref.current as TargetNode | null;
    const child = childRef.current;
    if (!wrapper?.measureInWindow || !child?.measureInWindow || child === wrapper) return;
    wrapper.measureInWindow((wx: number, wy: number) => {
      child.measureInWindow((cx: number, cy: number, width: number, height: number) => {
        if (width === 0 && height === 0) return;
        setChildBox({ x: cx - wx, y: cy - wy, width, height });
      });
    });
  }, [ref, setChildBox]);

  const only = Children.count(children) === 1 ? Children.only(children) : null;
  const content =
    only && isValidElement<MeasurableChild>(only)
      ? cloneElement(only, {
          ref: (node: TargetNode | null) => {
            childRef.current = node;
            const given = (only.props as MeasurableChild).ref;
            if (typeof given === "function") given(node);
            else if (given && typeof given === "object") given.current = node;
            if (node) measureChildRef();
          },
          onLayout: (event: LayoutChangeEvent) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            setChildBox({ x, y, width, height });
            only.props.onLayout?.(event);
          },
        })
      : children;

  return (
    <Animated.View
      ref={ref}
      collapsable={false}
      style={style}
      onLayout={() => {
        measure();
        measureChildRef();
        if (__DEV__ && !warned.current && only !== null) {
          warned.current = true;
          setTimeout(() => {
            if (childBox.value !== null) return;
            console.warn(
              `tourkit: TourTarget "${id}" wraps a component that forwards neither onLayout nor ` +
                "a ref, so the spotlight is measured from the wrapper and includes the child's " +
                "margins. Forward onLayout to that component's root view, or wrap the view itself.",
            );
          }, 0);
        }
      }}
    >
      {content}
    </Animated.View>
  );
}
