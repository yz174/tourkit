import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { describeElement, type RecordedStep, type Recording } from "./selector";

export type TourRecorderProps = {
  name?: string;
  endpoint?: string;
  onFinish?: (recording: Recording) => void;
};

const PANEL_Z = 2147483000;

function currentRoute(): string {
  return typeof window === "undefined" ? "" : window.location.pathname;
}

export function TourRecorder({
  name = "recorded",
  endpoint = "http://127.0.0.1:5178/record",
  onFinish,
}: TourRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [captured, setCaptured] = useState<{ key: string; step: RecordedStep }[]>([]);
  const [sent, setSent] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!recording) return;
    const onClick = (event: MouseEvent) => {
      const element = event.target;
      if (!(element instanceof Element)) return;
      if (element.closest("[data-tourkit-recorder]")) return;
      event.preventDefault();
      event.stopPropagation();
      setCaptured((current) => [
        ...current,
        { key: `${Date.now()}-${current.length}`, step: describeElement(element, currentRoute()) },
      ]);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [recording]);

  const steps = captured.map((entry) => entry.step);

  const build = useCallback(
    (): Recording => ({
      name,
      createdAt: Date.now(),
      steps: captured.map((entry) => entry.step),
    }),
    [name, captured],
  );

  const finish = useCallback(async () => {
    const result = build();
    onFinish?.(result);
    setRecording(false);
    setSent("sending");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result),
      });
      setSent(response.ok ? "sent" : "failed");
    } catch {
      setSent("failed");
    }
  }, [build, endpoint, onFinish]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(build(), null, 2));
      setSent("sent");
    } catch {
      setSent("failed");
    }
  }, [build]);

  if (!mounted) return null;

  const panel = (
    <div
      data-tourkit-recorder=""
      data-tourkit-recording={recording ? "true" : "false"}
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: PANEL_Z,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
        borderRadius: 12,
        background: "#111827",
        color: "#F9FAFB",
        font: "13px system-ui, sans-serif",
        boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
      }}
    >
      <strong>tourkit recorder</strong>
      <span
        data-tourkit-recorder-count
      >{`${steps.length} step${steps.length === 1 ? "" : "s"}`}</span>
      <span data-tourkit-recorder-status>{sent}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          data-tourkit-recorder-toggle
          onClick={() => {
            setSent("idle");
            setRecording((value) => !value);
          }}
        >
          {recording ? "Stop" : "Record"}
        </button>
        <button
          type="button"
          data-tourkit-recorder-undo
          onClick={() => setCaptured((current) => current.slice(0, -1))}
        >
          Undo
        </button>
        <button type="button" data-tourkit-recorder-finish onClick={() => void finish()}>
          Save
        </button>
        <button type="button" data-tourkit-recorder-copy onClick={() => void copy()}>
          Copy
        </button>
      </div>
      <ol data-tourkit-recorder-list style={{ margin: 0, paddingLeft: 18, maxWidth: 280 }}>
        {captured.map((entry) => (
          <li key={entry.key} style={{ overflowWrap: "anywhere" }}>
            {entry.step.label ?? entry.step.text ?? entry.step.target}
          </li>
        ))}
      </ol>
    </div>
  );

  return createPortal(panel, document.body);
}
