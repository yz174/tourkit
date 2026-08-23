import type { Rect } from "@tourkit/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TurboModuleRegistry,
  View,
} from "react-native";
import { useTourContext } from "../context";
import type { TargetNode } from "../types";
import { defaultRecordEndpoint, statusUrl } from "./endpoint";
import { type Candidate, pickTarget } from "./hitTest";

export type RecordedStep = {
  target: string;
  registered: boolean;
  tag: string;
  label?: string;
  route?: string;
};

export type Recording = { name: string; createdAt: number; steps: RecordedStep[] };

export type TourRecorderProps = {
  name?: string;
  endpoint?: string;
  autoShow?: boolean;
  onFinish?: (recording: Recording) => void;
};

type Status = "idle" | "sending" | "sent" | "failed";

type SourceCodeModule = { scriptURL?: string; getConstants?: () => { scriptURL?: string } };

/**
 * Where Metro is serving from, which is the machine running the CLI. Falling back to loopback is
 * wrong on a physical device — that is the phone, not your machine — so both readers are tried.
 *
 * The New Architecture has no bridge, so NativeModules.SourceCode is gone. TurboModuleRegistry is
 * the public way to reach it, and it comes off the react-native entry itself: a deep import of
 * Libraries/Core/Devtools/getDevServer does not survive Metro's resolution.
 */
function scriptUrl(): string | null {
  const registry = TurboModuleRegistry as unknown as {
    get?: (name: string) => SourceCodeModule | null;
  };
  const turbo = registry.get?.("SourceCode");
  const fromTurbo = turbo?.getConstants?.().scriptURL ?? turbo?.scriptURL;
  if (fromTurbo) return fromTurbo;

  const legacy = (NativeModules as { SourceCode?: SourceCodeModule }).SourceCode;
  return legacy?.scriptURL ?? legacy?.getConstants?.().scriptURL ?? null;
}

function measure(node: TargetNode): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!node?.measureInWindow) {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      resolve(width === 0 && height === 0 ? null : { x, y, width, height });
    });
  });
}

async function candidates(nodes: Map<string, TargetNode>): Promise<Candidate[]> {
  const entries = await Promise.all(
    [...nodes.entries()].map(async ([id, node]) => {
      const rect = await measure(node);
      return rect ? { id, rect } : null;
    }),
  );
  return entries.filter((entry): entry is Candidate => entry !== null);
}

/**
 * The React Native half of `tourkit record`. It captures taps on registered TourTargets and
 * posts the same recording shape the web recorder does, so one CLI writes both.
 */
export function TourRecorder({
  name = "recorded",
  endpoint,
  autoShow = true,
  onFinish,
}: TourRecorderProps) {
  const { nodes, geometry, nav, insets } = useTourContext();

  const url = useMemo(
    () => endpoint ?? defaultRecordEndpoint({ scriptUrl: scriptUrl(), platform: Platform.OS }),
    [endpoint],
  );

  const [online, setOnline] = useState(false);
  const [outDir, setOutDir] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [steps, setSteps] = useState<RecordedStep[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [missed, setMissed] = useState(false);

  useEffect(() => {
    if (!autoShow) return;
    let cancelled = false;
    let announced = false;

    // A hidden panel and a broken address look identical on a phone, so say which one it is.
    if (__DEV__) console.log(`tourkit: recorder polling ${statusUrl(url)}`);

    const ping = async () => {
      try {
        const response = await fetch(statusUrl(url), { method: "GET" });
        const body = (await response.json()) as { ok?: boolean; outDir?: string };
        if (cancelled) return;
        if (__DEV__ && body?.ok && !announced) {
          announced = true;
          console.log("tourkit: record server found. The panel is showing.");
        }
        setOnline(Boolean(body?.ok));
        setOutDir(body?.outDir ?? null);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };
    void ping();
    const timer = setInterval(() => void ping(), 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [url, autoShow]);

  const capture = useCallback(
    async (x: number, y: number) => {
      const id = pickTarget(await candidates(nodes), x, y);
      if (!id) {
        setMissed(true);
        return;
      }
      setMissed(false);
      const label = geometry.get(id)?.label;
      const route = nav?.getRoute() ?? "";
      setSteps((current) => [
        ...current,
        {
          target: id,
          registered: true,
          tag: "view",
          ...(label ? { label } : {}),
          ...(route ? { route } : {}),
        },
      ]);
    },
    [nodes, geometry, nav],
  );

  const finish = useCallback(async () => {
    const result: Recording = { name, createdAt: Date.now(), steps };
    onFinish?.(result);
    setRecording(false);
    setStatus("sending");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result),
      });
      setStatus(response.ok ? "sent" : "failed");
    } catch {
      setStatus("failed");
    }
  }, [name, steps, url, onFinish]);

  if (autoShow && !online) return null;

  return (
    <>
      {recording ? (
        // Swallows the press before the app sees it, the same trade the web recorder makes:
        // clicking Delete while recording must record the step, not delete anything.
        <View
          testID="tourkit-recorder-capture"
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onResponderRelease={(event) => {
            const { pageX, pageY } = event.nativeEvent;
            void capture(pageX, pageY);
          }}
        />
      ) : null}

      <View
        testID="tourkit-recorder"
        style={[styles.panel, { bottom: 16 + insets.bottom, right: 16 + insets.right }]}
      >
        <Text style={styles.title}>tourkit recorder</Text>
        <Text style={styles.meta}>
          {steps.length} step{steps.length === 1 ? "" : "s"} · {status}
        </Text>
        {outDir ? <Text style={styles.meta}>{`→ ${outDir}`}</Text> : null}
        {missed ? <Text style={styles.warn}>Not a TourTarget. Wrap it to record it.</Text> : null}

        <View style={styles.row}>
          <Button
            label={recording ? "Stop" : "Record"}
            onPress={() => {
              setStatus("idle");
              setMissed(false);
              setRecording((value) => !value);
            }}
          />
          <Button label="Undo" onPress={() => setSteps((current) => current.slice(0, -1))} />
          <Button label="Save" onPress={() => void finish()} />
        </View>
      </View>
    </>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#111827",
    gap: 6,
    maxWidth: 260,
  },
  title: { color: "#F9FAFB", fontSize: 13, fontWeight: "700" },
  meta: { color: "#F9FAFB", fontSize: 12, opacity: 0.75 },
  warn: { color: "#FBBF24", fontSize: 12 },
  row: { flexDirection: "row", gap: 6 },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#374151",
  },
  buttonLabel: { color: "#F9FAFB", fontSize: 12, fontWeight: "600" },
});
