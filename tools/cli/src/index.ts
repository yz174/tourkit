import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import type { CopyDraft, Recording } from "./codegen";
import { detectProject, type Manifest, type ProjectKind, packagesFor } from "./detect";
import { createRecordHandler, nodeListener, reportRecording } from "./record";
import { nextSteps, scaffoldFiles } from "./scaffold";

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

async function init(cwd: string, dir: string): Promise<number> {
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

  console.log("");
  for (const step of nextSteps(kind, dir)) console.log(`  - ${step}`);
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

async function record(cwd: string, outDir: string, port: number, draft: boolean): Promise<void> {
  const drafter = draft ? await loadDrafter() : null;

  const handle = createRecordHandler({
    cwd,
    outDir,
    ...(drafter ? { draft: drafter } : {}),
    onWritten: (path, recording) => {
      for (const line of reportRecording(path, recording)) console.log(line);
    },
  });

  createServer(nodeListener(handle)).listen(port, "127.0.0.1");

  console.log(`tourkit: listening on http://127.0.0.1:${port}`);
  console.log(`tourkit: render <TourRecorder /> in your app, click through the tour, press Save.`);
  console.log(`tourkit: tours will be written to ${outDir}`);
}

const [command = "", ...rest] = process.argv.slice(2);

if (command === "init") {
  process.exit(await init(process.cwd(), rest[0] ?? "src/tour"));
}

if (command === "record") {
  const positional = rest.filter((argument) => !argument.startsWith("--"));
  await record(
    process.cwd(),
    positional[0] ?? "src/tour",
    Number(process.env.TOURKIT_PORT ?? 5178),
    rest.includes("--draft"),
  );
} else {
  console.error("usage: tourkit init [directory]");
  console.error("       tourkit record [directory] [--draft]");
  process.exit(1);
}
