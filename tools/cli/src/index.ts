import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { dirname, join, relative as relativePath } from "node:path";
import type { CopyDraft, Recording } from "./codegen";
import { detectProject, type Manifest, type ProjectKind, packagesFor } from "./detect";
import {
  createRecordHandler,
  nodeListener,
  reachableUrls,
  reportRecording,
  startupLines,
} from "./record";
import { nextSteps, scaffoldFiles } from "./scaffold";
import { layoutCandidates, wireDiff, wireLayout } from "./wire";

async function readManifest(cwd: string): Promise<Manifest | null> {
  try {
    return JSON.parse(await readFile(join(cwd, "package.json"), "utf8")) as Manifest;
  } catch {
    return null;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await readFile(path, "utf8");
    return true;
  } catch {
    return false;
  }
}

function importPathFor(layout: string, dir: string): string {
  const from = dirname(layout);
  const path = relativePath(from, `${dir}/provider`).split("\\").join("/");
  return path.startsWith(".") ? path : `./${path}`;
}

/** Wraps the root layout when exactly one is found and its shape is unambiguous. */
async function wireRoot(cwd: string, kind: ProjectKind, dir: string): Promise<boolean> {
  for (const candidate of layoutCandidates(kind)) {
    const target = join(cwd, candidate);
    let source: string;
    try {
      source = await readFile(target, "utf8");
    } catch {
      continue;
    }

    const result = wireLayout(source, importPathFor(candidate, dir));
    if (result.status === "already") {
      console.log(`tourkit: ${candidate} already renders <Tours>`);
      return true;
    }
    if (result.status === "wrapped") {
      await writeFile(target, result.contents, "utf8");
      console.log(`tourkit: wrapped ${candidate} in <Tours>`);
      return true;
    }

    console.log(`tourkit: left ${candidate} alone (${result.reason}). Add this yourself:`);
    for (const line of wireDiff(importPathFor(candidate, dir))) console.log(`  ${line}`);
    return false;
  }
  return false;
}

async function init(cwd: string, dir: string, wire: boolean): Promise<number> {
  const manifest = await readManifest(cwd);
  if (!manifest) {
    console.error("tourkit: no package.json here. Run this from your project root.");
    return 1;
  }

  const kind: ProjectKind = detectProject(manifest);
  if (kind === "unknown") {
    console.error("tourkit: could not tell whether this is a web or React Native project.");
    console.error("tourkit: install @tourkit/react or @tourkit/native yourself, then re-run.");
    return 1;
  }

  console.log(`tourkit: detected a ${kind} project`);
  console.log(`tourkit: install with  npm i ${packagesFor(kind).join(" ")}`);

  for (const file of scaffoldFiles(kind, dir)) {
    const target = join(cwd, file.path);
    if (await exists(target)) {
      console.log(`tourkit: kept existing ${file.path}`);
      continue;
    }
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.contents, "utf8");
    console.log(`tourkit: wrote ${file.path}`);
  }

  const wired = wire ? await wireRoot(cwd, kind, dir) : false;

  console.log("");
  for (const step of nextSteps(kind, dir, wired)) console.log(`  - ${step}`);
  return 0;
}

async function loadDrafter(): Promise<((recording: Recording) => Promise<CopyDraft[]>) | null> {
  try {
    const ai = (await import("@tourkit/ai/server")) as {
      anthropicDrafter: (
        options: Record<string, unknown>,
      ) => (r: Recording) => Promise<CopyDraft[]>;
    };
    return ai.anthropicDrafter({});
  } catch {
    console.error("tourkit: --draft needs @tourkit/ai and @anthropic-ai/sdk installed.");
    return null;
  }
}

function localAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
}

async function record(
  cwd: string,
  outDir: string,
  port: number,
  host: string,
  draft: boolean,
): Promise<void> {
  const drafter = draft ? await loadDrafter() : null;

  const handle = createRecordHandler({
    cwd,
    outDir,
    ...(drafter ? { draft: drafter } : {}),
    onWritten: (path, recording) => {
      for (const line of reportRecording(path, recording)) console.log(line);
    },
    onConnected: (origin) => {
      console.log(`tourkit: app connected (${origin}). Press Record in the panel.`);
    },
  });

  createServer(nodeListener(handle)).listen(port, host);

  for (const line of startupLines(host, outDir, reachableUrls(host, port, localAddresses()))) {
    console.log(line);
  }
}

const [command = "", ...rest] = process.argv.slice(2);

if (command === "init") {
  const positional = rest.filter((argument) => !argument.startsWith("--"));
  process.exit(await init(process.cwd(), positional[0] ?? "src/tour", !rest.includes("--no-wire")));
}

if (command === "record") {
  const positional = rest.filter((argument) => !argument.startsWith("--"));
  const hostFlag = rest.find((argument) => argument.startsWith("--host"));
  await record(
    process.cwd(),
    positional[0] ?? "src/tour",
    Number(process.env.TOURKIT_PORT ?? 5178),
    hostFlag ? hostFlag.split("=")[1] || "0.0.0.0" : "127.0.0.1",
    rest.includes("--draft"),
  );
} else {
  console.error("usage: tourkit init [directory] [--no-wire]");
  console.error("       tourkit record [directory] [--draft] [--host[=0.0.0.0]]");
  process.exit(1);
}
