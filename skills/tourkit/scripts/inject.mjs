/**
 * Insert or remove the recorder script tag in an HTML entry point.
 *
 * This is what replaces mounting <TourRecorder /> by hand. The dev server hot-reloads,
 * the capture bar appears, and `--remove` puts the file back byte for byte.
 *
 * Usage:
 *   node inject.mjs --file index.html --port 5178
 *   node inject.mjs --file index.html --remove
 *
 * Output: one JSON object.
 */

import fs from "node:fs";
import path from "node:path";
import { isGeneratedFile } from "./is-generated.mjs";

const START = "tourkit-record-start";
const END = "tourkit-record-end";

/**
 * Directories that are never a user-facing page. No flag turns these off: injecting a
 * script into a dependency's HTML or into git's internals is always a mistake.
 */
const HARD_EXCLUDES = ["node_modules", ".git"];

const BLOCK_PATTERN = new RegExp(
  `[ \\t]*<!--\\s*${START}\\s*-->[\\s\\S]*?<!--\\s*${END}\\s*-->[ \\t]*\\r?\\n?`,
  "g",
);

export function hasHardExclude(relativePath) {
  const segments = relativePath.split(/[\\/]+/);
  return HARD_EXCLUDES.some((bad) => segments.includes(bad));
}

/** Remove the block, restoring the file exactly as it was before insertTag. */
export function removeTag(content) {
  return content.replace(BLOCK_PATTERN, "");
}

/**
 * Insert the block on its own lines directly above the last `anchor`, carrying the
 * anchor's indentation. Inserting at the start of the anchor's line rather than at the
 * anchor itself is what makes removal byte-exact: the block occupies whole lines and
 * nothing else on the page moves.
 */
export function insertTag(content, port, anchor = "</body>") {
  const index = content.lastIndexOf(anchor);
  if (index === -1) return null;

  const lineStart = content.lastIndexOf("\n", index) + 1;
  const prefix = content.slice(lineStart, index);
  const indent = /^[ \t]*$/.test(prefix) ? prefix : "";
  const at = indent === prefix ? lineStart : index;
  const newline = content.includes("\r\n") ? "\r\n" : "\n";

  const block =
    `${indent}<!-- ${START} -->${newline}` +
    `${indent}<script src="http://127.0.0.1:${port}/recorder.js"></script>${newline}` +
    `${indent}<!-- ${END} -->${newline}`;

  return content.slice(0, at) + block + content.slice(at);
}

function fail(payload) {
  console.log(JSON.stringify({ ok: false, ...payload }));
  process.exit(1);
}

/**
 * Write through a sibling temp file and rename. A dev server can be serving this page at
 * the moment we edit it, and a truncated read would blank the app for one request.
 */
function writeAtomic(absolute, content) {
  const temp = `${absolute}.tourkit-${process.pid}.tmp`;
  fs.writeFileSync(temp, content, "utf-8");
  fs.renameSync(temp, absolute);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: node inject.mjs --file <html> [--port <n>] [--remove]

  --file <html>   HTML entry point to edit (required)
  --port <n>      Recorder server port (required unless --remove)
  --remove        Take the tag out again
  --allow-generated  Edit anyway when the file looks like build output

Output (JSON): { ok, file, injected[] } or { ok, file, removed }`);
    return;
  }

  const fileIndex = args.indexOf("--file");
  const file = fileIndex !== -1 ? args[fileIndex + 1] : null;
  if (!file) fail({ error: "missing_file", message: "pass --file <html>" });

  const relative = path.relative(process.cwd(), path.resolve(process.cwd(), file)) || file;
  if (hasHardExclude(relative) || hasHardExclude(file)) {
    fail({ error: "hard_excluded", file, message: "node_modules and .git are never injectable" });
  }

  const absolute = path.resolve(process.cwd(), file);
  if (!fs.existsSync(absolute)) fail({ error: "file_not_found", file });

  const removing = args.includes("--remove");

  if (!removing && !args.includes("--allow-generated")) {
    const verdict = isGeneratedFile(absolute);
    if (verdict.generated) {
      fail({
        error: "generated_file",
        file,
        reason: verdict.reason,
        message:
          "this looks like build output, so the tag would be wiped on the next build. Inject into the source HTML instead, or pass --allow-generated if you are sure.",
      });
    }
  }

  const before = fs.readFileSync(absolute, "utf-8");

  if (removing) {
    const after = removeTag(before);
    if (after === before) {
      console.log(JSON.stringify({ ok: true, file, removed: false, note: "no tag present" }));
      return;
    }
    writeAtomic(absolute, after);
    console.log(JSON.stringify({ ok: true, file, removed: true }));
    return;
  }

  const portIndex = args.indexOf("--port");
  const port = portIndex !== -1 ? Number.parseInt(args[portIndex + 1], 10) : Number.NaN;
  if (!Number.isFinite(port)) fail({ error: "missing_port", message: "pass --port <n>" });

  const anchorIndex = args.indexOf("--insert-before");
  const anchor = anchorIndex !== -1 ? args[anchorIndex + 1] : "</body>";

  // Strip any stale block first so a re-run on a different port replaces rather than stacks.
  const clean = removeTag(before);
  const injected = insertTag(clean, port, anchor);
  if (injected === null) {
    fail({ error: "anchor_not_found", file, anchor, message: `no ${anchor} in this file` });
  }

  writeAtomic(absolute, injected);
  console.log(JSON.stringify({ ok: true, file, injected: [file], port, anchor }));
}

if (process.argv[1]?.endsWith("inject.mjs")) main();
