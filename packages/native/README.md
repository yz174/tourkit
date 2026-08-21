# @tourkit/native

React Native renderer for [tourkit](https://github.com/yz174/tourkit) app tours. An SVG-masked
spotlight that morphs between targets on the UI thread, with an anchored coach card.

```bash
npm i @tourkit/native
```

Peer dependencies, at whatever version you already run: `react >=18`, `react-native >=0.74`,
`react-native-svg >=13`, `react-native-reanimated >=3.16`. Nothing else to link, no config plugin.

```tsx
import { TourProvider, TourTarget } from "@tourkit/native";

<TourProvider tours={[onboarding]} insets={useSafeAreaInsets()}>
  <TourTarget id="post-ride">
    <Pressable>
      <Text>Post a ride</Text>
    </Pressable>
  </TourTarget>
</TourProvider>;
```

`TourTarget` measures the child's own box, so margins on the wrapped element do not push the hole
off centre. Targets are tracked by a Reanimated frame callback while their step is on screen, which
keeps the hole locked to a scrolling target.

Docs: [React Native](https://github.com/yz174/tourkit/blob/main/docs/react-native.md) ·
[customization](https://github.com/yz174/tourkit/blob/main/docs/customization.md) ·
[navigation](https://github.com/yz174/tourkit/blob/main/docs/navigation.md)

MIT.
