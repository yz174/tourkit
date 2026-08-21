export type Fingerprint = {
  tag: string;
  text?: string;
  role?: string;
  label?: string;
  near?: string;
  index?: number;
};

export type RecordedStep = {
  target: string;
  registered: boolean;
  tag: string;
  label?: string;
  role?: string;
  text?: string;
  route?: string;
  fingerprint?: Fingerprint;
};

export type Recording = {
  name: string;
  createdAt: number;
  steps: RecordedStep[];
};

export type DraftedCopy = { title: string; body?: string | undefined };

export type CopyDraft = DraftedCopy;

export function tourIdFrom(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "recorded";
}

export function exportNameFrom(name: string): string {
  const parts = tourIdFrom(name).split("-");
  const [first = "recorded", ...rest] = parts;
  return first + rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
}

export function stepIdFrom(step: RecordedStep, index: number, taken: Set<string>): string {
  const base =
    tourIdFrom(step.label ?? step.text ?? step.target).slice(0, 32) || `step-${index + 1}`;
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  const unique = `${base}-${suffix}`;
  taken.add(unique);
  return unique;
}

export function fallbackTitle(step: RecordedStep): string {
  const source = step.label ?? step.text ?? step.target;
  const trimmed = source.trim().replace(/\s+/g, " ").slice(0, 60);
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function quote(value: string): string {
  return JSON.stringify(value);
}

export function generateTourFile(recording: Recording, drafts: DraftedCopy[] = []): string {
  const tourId = tourIdFrom(recording.name);
  const exportName = exportNameFrom(recording.name);
  const taken = new Set<string>();
  const routes = new Set(recording.steps.map((step) => step.route ?? ""));
  const multiRoute = routes.size > 1;

  const lines: string[] = [
    'import type { TourConfig } from "@tourkit/core";',
    "",
    `export const ${exportName}: TourConfig = {`,
    `  id: ${quote(tourId)},`,
    "  version: 1,",
    "  steps: [",
  ];

  recording.steps.forEach((step, index) => {
    const draft = drafts[index];
    const title = draft?.title ?? fallbackTitle(step);
    const body = draft?.body;

    lines.push("    {");
    lines.push(`      id: ${quote(stepIdFrom(step, index, taken))},`);
    lines.push(`      target: ${quote(step.target)},`);
    lines.push(`      title: ${quote(title)},`);
    if (body) lines.push(`      body: ${quote(body)},`);
    if (multiRoute && step.route) lines.push(`      route: ${quote(step.route)},`);
    if (!step.registered && step.fingerprint) {
      lines.push(...fingerprintLines(step.fingerprint));
    }
    lines.push("    },");
  });

  lines.push("    {");
  lines.push(
    `      id: ${quote(stepIdFrom({ target: "done", registered: false, tag: "" }, recording.steps.length, taken))},`,
  );
  lines.push("      target: null,");
  lines.push('      title: "That is the tour",');
  lines.push("    },");
  lines.push("  ],");
  lines.push("};");
  lines.push("");

  return lines.join("\n");
}

function fingerprintLines(fingerprint: Fingerprint): string[] {
  const entries: string[] = [`        tag: ${quote(fingerprint.tag)},`];
  if (fingerprint.role) entries.push(`        role: ${quote(fingerprint.role)},`);
  if (fingerprint.label) entries.push(`        label: ${quote(fingerprint.label)},`);
  if (fingerprint.text) entries.push(`        text: ${quote(fingerprint.text)},`);
  if (fingerprint.near) entries.push(`        near: ${quote(fingerprint.near)},`);
  if (fingerprint.index) entries.push(`        index: ${fingerprint.index},`);
  return ["      fingerprint: {", ...entries, "      },"];
}

export function unregisteredTargets(recording: Recording): RecordedStep[] {
  return recording.steps.filter((step) => !step.registered);
}
