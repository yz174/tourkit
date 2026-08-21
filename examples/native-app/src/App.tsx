import { createNavAdapter } from "@tourkit/core";
import { type AppContext, onboarding, ROUTE, TARGET } from "@tourkit/example-shared-tour";
import { TourProvider, TourTarget, useTour } from "@tourkit/native";
import { type ComponentRef, type RefObject, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const history = Array.from({ length: 30 }, (_, index) => ({ id: `history-${index}`, index }));

function Launcher() {
  const { start, running } = useTour();
  return (
    <Pressable style={styles.launcher} onPress={() => start("onboarding")}>
      <Text style={styles.launcherText}>{running ? "Tour running" : "Start the tour"}</Text>
    </Pressable>
  );
}

function Home({ onPost }: { onPost: () => void }) {
  return (
    <View style={styles.screen}>
      <TourTarget id={TARGET.postRide} radius={22}>
        <Pressable style={styles.primary} onPress={onPost}>
          <Text style={styles.primaryText}>Post a ride</Text>
        </Pressable>
      </TourTarget>
    </View>
  );
}

type Scroller = ComponentRef<typeof ScrollView>;

function Inbox({ scrollRef }: { scrollRef: RefObject<Scroller | null> }) {
  return (
    <View style={styles.screen}>
      <TourTarget id={TARGET.inbox} radius={12}>
        <Text style={styles.row}>Messages</Text>
      </TourTarget>
      <TourTarget id={TARGET.billing} radius={12}>
        <Text style={styles.row}>Payouts</Text>
      </TourTarget>
      <ScrollView ref={scrollRef} style={styles.scroller}>
        {history.map((entry) =>
          entry.index === 18 ? (
            <TourTarget key={entry.id} id={TARGET.history} radius={10}>
              <Text style={styles.row}>{entry.id}</Text>
            </TourTarget>
          ) : (
            <Text key={entry.id} style={styles.row}>
              {entry.id}
            </Text>
          ),
        )}
      </ScrollView>
    </View>
  );
}

export function App() {
  const [pathname, setPathname] = useState<string>(ROUTE.home);
  const [posted, setPosted] = useState(false);
  const scrollRef = useRef<Scroller | null>(null);

  const nav = useMemo(
    () => createNavAdapter({ pathname, navigate: (route) => setPathname(route) }),
    [pathname],
  );
  const context = useMemo<AppContext>(() => ({ plan: "pro", hasPostedRide: posted }), [posted]);

  return (
    <TourProvider<AppContext>
      tours={[onboarding]}
      context={context}
      nav={nav}
      scrollRef={scrollRef}
      insets={{ top: 47, bottom: 34, left: 0, right: 0 }}
    >
      <View style={styles.app}>
        <Launcher />
        {pathname === ROUTE.home ? (
          <Home onPost={() => setPosted(true)} />
        ) : (
          <Inbox scrollRef={scrollRef} />
        )}
      </View>
    </TourProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, paddingTop: 60, paddingHorizontal: 20, backgroundColor: "#fff" },
  screen: { flex: 1, gap: 12 },
  launcher: { alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 16 },
  launcherText: { fontSize: 15, fontWeight: "600", color: "#1E9CFE" },
  primary: {
    backgroundColor: "#1E9CFE",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 22,
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  row: { paddingVertical: 12, fontSize: 15 },
  scroller: { height: 220, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12 },
});
