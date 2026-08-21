import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { detectProject, type Manifest, type ProjectKind, packagesFor } from "./detect";
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

const [command = "", ...rest] = process.argv.slice(2);

if (command !== "init") {
  console.error("usage: tourkit init [directory]");
  process.exit(1);
}

process.exit(await init(process.cwd(), rest[0] ?? "src/tour"));
