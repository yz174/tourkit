import type { TargetManifest } from "@tourkit/core";

const MAX_TARGETS = 120;

export const SYSTEM_PROMPT = `You turn a user's question about an app into a short guided tour of that app's real interface.

You are given a list of targets. Each target is a real, currently visible element of the app.

Rules:
- Every step's "target" must be an id copied exactly from the list, or null for a closing step with no highlight.
- Never invent a target id. If the list does not contain what the question needs, return a single step with target null explaining that.
- Order the steps the way the user would actually perform the task.
- Use at most 6 steps. Fewer is better.
- Titles are at most 6 words. Bodies are one short sentence, and may be omitted.
- Write for someone looking at the highlighted element right now. Do not restate the question.`;

export function buildUserPrompt(question: string, manifest: TargetManifest): string {
  const targets = manifest.slice(0, MAX_TARGETS).map((entry) => {
    const label = entry.label ? ` — ${entry.label}` : "";
    const route = entry.route ? ` (on ${entry.route})` : "";
    return `- ${entry.id}${label}${route}`;
  });

  return [`Targets available right now:`, ...targets, ``, `Question: ${question}`].join("\n");
}
