/**
 * Turn a `.tour.json` into its sibling `.tour.ts`.
 *
 * `.tour.json` is canonical: it is TourConfig minus the four function-valued fields
 * (when, gate, onEnter, onAdvance), which live in a hand-written module the emitter
 * never opens. The `.tour.ts` inlines the data rather than importing the JSON, because
 * importing it needs resolveJsonModule and behaves differently across bundlers.
 *
 * Usage:
 *   node emit.mjs src/tours/onboarding.tour.json
 *
 * Output: one JSON object.
 */

import fs from "node:fs";
import path from "node:path";

export function tourIdFrom(name) {
  const slug = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "recorded";
}

export function exportNameFrom(name) {
  const [first = "recorded", ...rest] = tourIdFrom(name).split("-");
  return first + rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
}

export function stepIdFrom(step, index, taken) {
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

export function fallbackTitle(step) {
  const source = step.label ?? step.text ?? step.target;
  const trimmed = String(source).trim().replace(/\s+/g, " ").slice(0, 60);
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Recording (what the browser bar posts) to `.tour.json`.
 *
 * Titles here are a placeholder derived from the element's own label. The agent is
 * expected to rewrite them from the component source; this exists so a Save still
 * produces a runnable tour if the agent never gets to it.
 */
export function recordingToTour(recording) {
  const taken = new Set();
  const routes = new Set((recording.steps || []).map((step) => step.route ?? ""));
  const multiRoute = routes.size > 1;

  const steps = (recording.steps || []).map((step, index) => {
    const entry = {
      id: stepIdFrom(step, index, taken),
      target: step.target,
      title: fallbackTitle(step),
    };
    if (multiRoute && step.route) entry.route = step.route;
    // A registered id survives a markup change on its own. A CSS selector does not,
    // so it carries the fingerprint that lets the player heal it.
    if (!step.registered && step.fingerprint) entry.fingerprint = step.fingerprint;
    return entry;
  });

  steps.push({
    id: stepIdFrom({ target: "done" }, steps.length, taken),
    target: null,
    title: "That is the tour",
  });

  // entryRoute is deliberately not synthesized here. codegen.ts never emitted it, and a
  // recording's first route is a guess; the author adds it when the tour needs one.
  return { id: tourIdFrom(recording.name), version: 1, steps };
}

function quote(value) {
  return JSON.stringify(value);
}

function fingerprintLines(fingerprint) {
  const entries = [`        tag: ${quote(fingerprint.tag)},`];
  if (fingerprint.role) entries.push(`        role: ${quote(fingerprint.role)},`);
  if (fingerprint.label) entries.push(`        label: ${quote(fingerprint.label)},`);
  if (fingerprint.text) entries.push(`        text: ${quote(fingerprint.text)},`);
  if (fingerprint.near) entries.push(`        near: ${quote(fingerprint.near)},`);
  if (fingerprint.index) entries.push(`        index: ${fingerprint.index},`);
  return ["      fingerprint: {", ...entries, "      },"];
}

/** Emits the same file shape tools/cli/src/codegen.ts emits today. */
export function generateTourFile(tour) {
  const exportName = exportNameFrom(tour.id);
  const lines = [
    'import type { TourConfig } from "@tourkit/core";',
    "",
    `export const ${exportName}: TourConfig = {`,
    `  id: ${quote(tour.id)},`,
    `  version: ${Number(tour.version) || 1},`,
  ];
  if (tour.entryRoute) lines.push(`  entryRoute: ${quote(tour.entryRoute)},`);
  lines.push("  steps: [");

  for (const step of tour.steps || []) {
    lines.push("    {");
    lines.push(`      id: ${quote(step.id)},`);
    lines.push(`      target: ${step.target === null ? "null" : quote(step.target)},`);
    if (step.title) lines.push(`      title: ${quote(step.title)},`);
    if (step.body) lines.push(`      body: ${quote(step.body)},`);
    if (step.route) lines.push(`      route: ${quote(step.route)},`);
    if (step.placement) lines.push(`      placement: ${quote(step.placement)},`);
    if (step.align) lines.push(`      align: ${quote(step.align)},`);
    if (step.interaction) lines.push(`      interaction: ${quote(step.interaction)},`);
    if (step.radius !== undefined) lines.push(`      radius: ${JSON.stringify(step.radius)},`);
    if (step.padding !== undefined) lines.push(`      padding: ${JSON.stringify(step.padding)},`);
    if (step.fingerprint) lines.push(...fingerprintLines(step.fingerprint));
    lines.push("    },");
  }

  lines.push("  ],");
  lines.push("};");
  lines.push("");
  return lines.join("\n");
}

/** Targets that will break the next time the markup moves. */
export function brittleTargets(tour) {
  return (tour.steps || [])
    .filter((step) => typeof step.target === "string" && !/^[\w-]+$/.test(step.target))
    .map((step) => step.target);
}

function main() {
  const args = process.argv.slice(2);
  const input = args.find((arg) => !arg.startsWith("--"));

  if (!input || args.includes("--help")) {
    console.log(JSON.stringify({ ok: false, error: "usage: node emit.mjs <file.tour.json>" }));
    process.exit(input ? 0 : 1);
  }

  const absolute = path.resolve(process.cwd(), input);
  let tour;
  try {
    tour = JSON.parse(fs.readFileSync(absolute, "utf-8"));
  } catch (error) {
    console.log(
      JSON.stringify({
        ok: false,
        error: "unreadable_json",
        message: String(error?.message),
      }),
    );
    process.exit(1);
  }

  if (!tour || typeof tour.id !== "string" || !Array.isArray(tour.steps)) {
    console.log(
      JSON.stringify({ ok: false, error: "not_a_tour", message: "need { id, version, steps[] }" }),
    );
    process.exit(1);
  }

  const output = absolute.replace(/\.tour\.json$/, ".tour.ts");
  if (output === absolute) {
    console.log(
      JSON.stringify({
        ok: false,
        error: "bad_extension",
        message: "input must end in .tour.json",
      }),
    );
    process.exit(1);
  }

  fs.writeFileSync(output, generateTourFile(tour), "utf-8");
  console.log(
    JSON.stringify({
      ok: true,
      wrote: path.relative(process.cwd(), output).split(path.sep).join("/"),
      steps: tour.steps.length,
      brittle: brittleTargets(tour),
    }),
  );
}

if (process.argv[1]?.endsWith("emit.mjs")) main();
