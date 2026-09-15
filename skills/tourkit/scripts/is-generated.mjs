/**
 * Decide whether a file is "generated" (rewritten by a build step, unsafe to edit)
 * or "source" (safe to edit, changes persist).
 *
 * Why it matters here: inject.mjs writes a script tag into an HTML entry point. If
 * that HTML is build output — `dist/index.html` produced from `src/index.html` — the
 * tag vanishes on the next build and the recorder never appears, or worse, the tag
 * ships to production because the agent edited the artifact instead of the source.
 *
 * Signals, most reliable first:
 *   1. git check-ignore — an ignored file is build output.
 *   2. Header markers in the first 300 bytes, for projects without git.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const HEADER_SCAN_BYTES = 300;
const HEADER_MARKERS = [
  /@generated\b/i,
  /\bGENERATED\s+FILE\b/i,
  /\bAUTO-?GENERATED\b/i,
  /\bDO\s+NOT\s+EDIT\b/i,
];

/**
 * @param {string} filePath absolute, or relative to `options.cwd`
 * @param {{cwd?: string}} [options]
 * @returns {{generated: boolean, reason: string|null}}
 */
export function isGeneratedFile(filePath, options = {}) {
  const cwd = options.cwd || process.cwd();
  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);

  if (isGitIgnored(absPath, cwd)) return { generated: true, reason: "gitignored" };
  const marker = headerMarker(absPath);
  if (marker) return { generated: true, reason: `header marker ${marker}` };
  return { generated: false, reason: null };
}

function isGitIgnored(absPath, cwd) {
  try {
    execFileSync("git", ["check-ignore", "--quiet", absPath], { cwd, stdio: "ignore" });
    return true; // exit 0 means ignored
  } catch {
    // Exit 1 is "not ignored". Exit 128 is "not a git repo". Neither proves generated.
    return false;
  }
}

function headerMarker(absPath) {
  let fd;
  try {
    fd = fs.openSync(absPath, "r");
    const buffer = Buffer.alloc(HEADER_SCAN_BYTES);
    const read = fs.readSync(fd, buffer, 0, HEADER_SCAN_BYTES, 0);
    const head = buffer.subarray(0, read).toString("utf-8");
    const hit = HEADER_MARKERS.find((pattern) => pattern.test(head));
    return hit ? hit.source : null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
  }
}

if (process.argv[1]?.endsWith("is-generated.mjs")) {
  const target = process.argv[2];
  if (!target) {
    console.log(JSON.stringify({ ok: false, error: "usage: node is-generated.mjs <file>" }));
    process.exit(1);
  }
  const result = isGeneratedFile(target);
  console.log(JSON.stringify({ ok: true, file: target, ...result }));
}
