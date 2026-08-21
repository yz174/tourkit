import { useTourkitAsk } from "@tourkit/ai";
import { anthropicGenerator, createTourkitHandler } from "@tourkit/ai/server";
import { useTargetManifest, useTour } from "@tourkit/react";
import { useState } from "react";

export const POST = createTourkitHandler({
  generate: anthropicGenerator({ apiKey: process.env.ANTHROPIC_API_KEY }),
});

export const customPOST = createTourkitHandler({
  generate: async ({ question, manifest }) => ({
    steps: [{ target: manifest[0]?.id ?? null, title: question.slice(0, 40) }],
  }),
});

export function HelpBox() {
  const getManifest = useTargetManifest();
  const { start } = useTour();
  const [question, setQuestion] = useState("");
  const { ask, status, error } = useTourkitAsk({
    endpoint: "/api/tourkit",
    getManifest,
    onTour: start,
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void ask(question);
      }}
    >
      <input value={question} onChange={(event) => setQuestion(event.target.value)} />
      <button type="submit" disabled={status === "asking"}>
        Show me
      </button>
      {status === "failed" ? <span>{error?.reason}</span> : null}
      <button type="button" data-tour-id="cancel-ride" data-tour-label="Cancel a posted ride">
        Cancel
      </button>
    </form>
  );
}
