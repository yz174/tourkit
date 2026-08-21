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

  return ["Targets available right now:", ...targets, "", `Question: ${question}`].join("\n");
}

export const DRAFT_SYSTEM_PROMPT = `You write the copy for a product tour that someone recorded by clicking through their own app.

You are given the elements they clicked, in order, with whatever the app knows about each one.

Rules:
- Return exactly one entry per recorded step, in the same order.
- Titles are at most 6 words, sentence case, no trailing period.
- Bodies are one short sentence explaining why the user would touch this, or omitted when the title says enough.
- Write for someone looking at the highlighted element. Do not describe how it looks and do not say "click here".
- Do not invent features the elements do not suggest.`;

export type DraftPromptStep = {
  target: string;
  tag: string;
  label?: string | undefined;
  role?: string | undefined;
  text?: string | undefined;
  route?: string | undefined;
};

export function buildDraftPrompt(recording: { name: string; steps: DraftPromptStep[] }): string {
  const steps = recording.steps.map((step, index) => {
    const parts = [`${index + 1}. <${step.tag}>`];
    if (step.role) parts.push(`role=${step.role}`);
    if (step.label) parts.push(`label=${JSON.stringify(step.label)}`);
    if (step.text) parts.push(`text=${JSON.stringify(step.text)}`);
    if (step.route) parts.push(`on ${step.route}`);
    return parts.join(" ");
  });

  return [`Tour name: ${recording.name}`, "", "Recorded steps:", ...steps].join("\n");
}
