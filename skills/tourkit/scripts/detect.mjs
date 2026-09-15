/**
 * Read a project and report what the tourkit skill needs to know to record in it:
 * which framework, where the dev server listens, which HTML file to inject into,
 * which player package to install, and where tours belong.
 *
 * Prints one JSON object. Never throws: an undetectable project still gets a usable
 * shape with `framework: "unknown"` so the agent can ask one question instead of ten.
 *
 * Usage: node detect.mjs [--cwd <dir>]
 */

import fs from "node:fs";
import path from "node:path";

const HARD_EXCLUDES = [
  "node_modules",
  ".git",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".output",
  "dist",
  "build",
  "out",
  "coverage",
  ".turbo",
  ".cache",
];

/** Ordered: the first match wins, so a Next app on React reports "next". */
const SIGNATURES = [
  { framework: "expo", deps: ["expo"], player: "@tourkit/native", port: 8081 },
  { framework: "react-native", deps: ["react-native"], player: "@tourkit/native", port: 8081 },
  {
    framework: "tauri",
    deps: ["@tauri-apps/api", "@tauri-apps/cli"],
    player: "@tourkit/core/dom",
    port: 1420,
  },
  { framework: "electron", deps: ["electron"], player: "@tourkit/core/dom", port: 3000 },
  { framework: "next", deps: ["next"], player: "@tourkit/react", port: 3000 },
  {
    framework: "remix",
    deps: ["@remix-run/react", "@remix-run/dev"],
    player: "@tourkit/react",
    port: 3000,
  },
  { framework: "nuxt", deps: ["nuxt"], player: "@tourkit/core/dom", port: 3000 },
  { framework: "sveltekit", deps: ["@sveltejs/kit"], player: "@tourkit/core/dom", port: 5173 },
  { framework: "astro", deps: ["astro"], player: "@tourkit/core/dom", port: 4321 },
  { framework: "angular", deps: ["@angular/core"], player: "@tourkit/core/dom", port: 4200 },
  {
    framework: "ember",
    deps: ["ember-source", "ember-cli"],
    player: "@tourkit/core/dom",
    port: 4200,
  },
  { framework: "qwik", deps: ["@builder.io/qwik"], player: "@tourkit/core/dom", port: 5173 },
  { framework: "solid", deps: ["solid-js"], player: "@tourkit/core/dom", port: 3000 },
  { framework: "svelte", deps: ["svelte"], player: "@tourkit/core/dom", port: 5173 },
  { framework: "vue", deps: ["vue"], player: "@tourkit/core/dom", port: 5173 },
  { framework: "preact", deps: ["preact"], player: "@tourkit/core/dom", port: 5173 },
  { framework: "react", deps: ["react"], player: "@tourkit/react", port: 5173 },
];

/** Where each framework keeps the document the agent edits when there is no plain HTML file. */
const DOCUMENT_HINTS = {
  next: ["app/layout.tsx", "app/layout.jsx", "pages/_document.tsx", "pages/_document.jsx"],
  remix: ["app/root.tsx", "app/root.jsx"],
  nuxt: ["app.vue", "app/app.vue"],
  sveltekit: ["src/app.html"],
  astro: ["src/layouts/Layout.astro"],
  ember: ["app/index.html"],
  qwik: ["src/root.tsx"],
};

const TOURKIT_PACKAGES = ["@tourkit/core", "@tourkit/react", "@tourkit/native", "@tourkit/ai"];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

function exists(root, relative) {
  try {
    return fs.existsSync(path.join(root, relative));
  } catch {
    return false;
  }
}

/** Pull an explicit port out of a dev script, e.g. `vite --port 4000` or `next dev -p 3001`. */
function portFromScripts(scripts) {
  const candidates = [scripts.dev, scripts.start, scripts.serve].filter(
    (value) => typeof value === "string",
  );
  for (const script of candidates) {
    const match = script.match(/(?:--port[= ]|(?:^|\s)-p[= ])(\d{2,5})/);
    if (match) return Number(match[1]);
  }
  return null;
}

/**
 * Walk the tree shallowly for HTML entry points. Depth is capped because a real entry
 * is never buried, and a deep walk on a large repo costs more than it returns.
 */
function findHtmlEntries(root, maxDepth = 3) {
  const found = [];
  const walk = (dir, depth) => {
    if (depth > maxDepth || found.length >= 12) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (HARD_EXCLUDES.includes(entry.name)) continue;
        walk(full, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        const relative = path.relative(root, full).split(path.sep).join("/");
        if (!HARD_EXCLUDES.some((bad) => relative.split("/").includes(bad))) found.push(relative);
      }
    }
  };
  walk(root, 0);
  // An entry point sits shallow and is usually called index.html. Sort so the agent's
  // first choice is the likeliest one rather than whatever readdir happened to yield.
  return found.sort((a, b) => {
    const depth = a.split("/").length - b.split("/").length;
    if (depth !== 0) return depth;
    const index = Number(b.endsWith("index.html")) - Number(a.endsWith("index.html"));
    if (index !== 0) return index;
    return a.localeCompare(b);
  });
}

function detectFramework(deps, htmlEntries, workspaces) {
  for (const signature of SIGNATURES) {
    if (signature.deps.some((name) => deps[name])) return signature;
  }
  // A workspace root has no app of its own. Say so rather than guessing, so the agent
  // re-runs detect inside the package that actually serves the UI.
  if (workspaces.length > 0) {
    return { framework: "monorepo", deps: [], player: null, port: null };
  }
  // No package.json match. A directory of plain HTML is still a project we can record.
  if (htmlEntries.length > 0) {
    return { framework: "static", deps: [], player: "@tourkit/core/dom", port: null };
  }
  return { framework: "unknown", deps: [], player: "@tourkit/core/dom", port: null };
}

/** Workspace globs from package.json, or pnpm-workspace.yaml when pnpm owns them. */
function readWorkspaces(root, manifest) {
  const fromManifest = Array.isArray(manifest.workspaces)
    ? manifest.workspaces
    : Array.isArray(manifest.workspaces?.packages)
      ? manifest.workspaces.packages
      : [];
  if (fromManifest.length > 0) return fromManifest;
  try {
    const yaml = fs.readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf-8");
    return [...yaml.matchAll(/^\s*-\s*["']?([^"'\n]+)["']?\s*$/gm)].map((match) => match[1].trim());
  } catch {
    return [];
  }
}

function tourDirFor(root) {
  if (exists(root, "src")) return "src/tours";
  if (exists(root, "app")) return "app/tours";
  return "tours";
}

export function detect(root = process.cwd()) {
  const manifest = readJson(path.join(root, "package.json")) || {};
  const deps = { ...manifest.devDependencies, ...manifest.dependencies };
  const scripts = manifest.scripts || {};

  const htmlEntries = findHtmlEntries(root);
  const workspaces = readWorkspaces(root, manifest);

  const signature = detectFramework(deps, htmlEntries, workspaces);
  let framework = signature.framework;

  // Tauri and Electron wrap a web app. Report the shell, but keep the inner framework
  // so the agent knows which dev server actually serves the HTML.
  let shell = null;
  if (framework === "tauri" || framework === "electron") {
    shell = framework;
    const inner = SIGNATURES.filter(
      (s) => s.framework !== "tauri" && s.framework !== "electron",
    ).find((s) => s.deps.some((name) => deps[name]));
    if (inner) framework = inner.framework;
  }

  const tauri =
    readJson(path.join(root, "src-tauri", "tauri.conf.json")) ||
    readJson(path.join(root, "tauri.conf.json"));
  const tauriDevUrl = tauri?.build?.devUrl || tauri?.build?.devPath || null;

  const explicitPort = portFromScripts(scripts);
  const fallbackPort =
    signature.port ?? SIGNATURES.find((s) => s.framework === framework)?.port ?? null;
  const port = explicitPort ?? fallbackPort;

  let devServer = null;
  if (typeof tauriDevUrl === "string" && tauriDevUrl.startsWith("http")) devServer = tauriDevUrl;
  else if (port) devServer = `http://localhost:${port}`;

  const documentHints = (DOCUMENT_HINTS[framework] || []).filter((file) => exists(root, file));

  const installed = {};
  for (const name of [...TOURKIT_PACKAGES, "@floating-ui/dom"])
    installed[name] = Boolean(deps[name]);

  return {
    ok: true,
    framework,
    shell,
    devServer,
    htmlEntries,
    /** Framework document files to inject into when there is no plain .html entry. */
    documentHints,
    insertBefore: "</body>",
    player: signature.player,
    tourDir: tourDirFor(root),
    monorepo: workspaces.length > 0,
    workspaces,
    installed,
    packageManager:
      exists(root, "bun.lock") || exists(root, "bun.lockb")
        ? "bun"
        : exists(root, "pnpm-lock.yaml")
          ? "pnpm"
          : exists(root, "yarn.lock")
            ? "yarn"
            : "npm",
    devScript:
      typeof scripts.dev === "string" ? "dev" : typeof scripts.start === "string" ? "start" : null,
    name: typeof manifest.name === "string" ? manifest.name : null,
  };
}

if (process.argv[1]?.endsWith("detect.mjs")) {
  const cwdIndex = process.argv.indexOf("--cwd");
  const root = cwdIndex !== -1 ? process.argv[cwdIndex + 1] : process.cwd();
  try {
    console.log(JSON.stringify(detect(root), null, 2));
  } catch (error) {
    console.log(JSON.stringify({ ok: false, error: String(error?.message) }));
    process.exit(1);
  }
}
