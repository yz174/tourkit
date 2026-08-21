import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Glob } from "bun";

// Packs every publishable package into one directory so another repository can install the
// tarballs. Each run goes in its own timestamped folder: npm keys a `file:` install by its path,
// and reusing a path with an unchanged version leaves the old, sometimes broken, copy in place.
const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
const outDir = resolve(process.argv[2] ?? "../tourkit-local", stamp);
await mkdir(outDir, { recursive: true });

const packed: string[] = [];
for await (const file of new Glob("{packages,tools}/*/package.json").scan(".")) {
  const manifest = await Bun.file(file).json();
  if (manifest.private) continue;
  const dir = resolve(file, "..");
  const result = Bun.spawnSync(["npm", "pack", "--pack-destination", outDir], { cwd: dir });
  if (result.exitCode !== 0) {
    console.error(`npm pack failed for ${manifest.name}`);
    console.error(new TextDecoder().decode(result.stderr));
    process.exit(1);
  }
  const name = new TextDecoder().decode(result.stdout).trim().split("\n").pop() ?? "";
  packed.push(`${manifest.name} -> ${name}`);
}

console.log(`packed into ${outDir}`);
for (const line of packed) console.log(`  ${line}`);
console.log("\nInstall into another repository with, for example:");
console.log(`  npm install ${outDir}/tourkit-core-0.0.0.tgz ${outDir}/tourkit-react-0.0.0.tgz`);
