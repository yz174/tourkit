import type { Interaction, Rect } from "@tourkit/core";
import { Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { shieldRegions } from "./regions";

export type TouchShieldProps = {
  interaction: Interaction;
  hole: Rect | null;
  onHolePress: () => void;
};

export function TouchShield({ interaction, hole, onHolePress }: TouchShieldProps) {
  const { width, height } = useWindowDimensions();

  if (interaction === "block") {
    return <Pressable style={StyleSheet.absoluteFill} accessible={false} testID="tourkit-shield" />;
  }

  const regions = shieldRegions(hole, width, height);

  return (
    <>
      {regions.map((region) => (
        <Pressable
          key={`shield-${region.x}-${region.y}-${region.width}-${region.height}`}
          accessible={false}
          testID="tourkit-shield-region"
          style={{
            position: "absolute",
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
          }}
        />
      ))}
      {interaction === "advance-on-press" && hole ? (
        <Pressable
          onPress={onHolePress}
          accessible={false}
          testID="tourkit-hole-catcher"
          style={{
            position: "absolute",
            left: hole.x,
            top: hole.y,
            width: hole.width,
            height: hole.height,
          }}
        />
      ) : null}
    </>
  );
}
