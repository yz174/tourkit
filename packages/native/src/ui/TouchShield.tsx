import { Pressable, StyleSheet } from "react-native";

export function TouchShield() {
  return <Pressable style={StyleSheet.absoluteFill} accessible={false} />;
}
