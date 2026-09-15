import { Glob } from "bun";

const problems: string[] = [];

for await (const file of new Glob("packages/*/package.json").scan(".")) {
  const manifest = await Bun.file(file).json();
  for (const [name, range] of Object.entries(manifest.peerDependencies ?? {})) {
    if (typeof range === "string" && !range.startsWith(">=")) {
      problems.push(`${manifest.name}: peer "${name}" is "${range}", expected a ">=" range`);
    }
  }
  for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
    if (typeof range === "string" && range.startsWith("workspace:")) {
      problems.push(`${manifest.name}: dependency "${name}" uses the workspace protocol`);
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("peer ranges and internal dependencies look publishable");
