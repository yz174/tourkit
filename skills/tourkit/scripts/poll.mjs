/**
 * Long-poll client for the recorder server. Blocks until the browser sends something,
 * then prints one JSON event.
 *
 * Node's fetch (undici) enforces a 300s headers timeout that cannot be lowered per
 * request, so each request is capped below that ceiling and the loop re-polls until a
 * real event arrives or the caller's total timeout runs out.
 *
 * Usage:
 *   node poll.mjs                       wait for an event (default 10 min)
 *   node poll.mjs --timeout=270000      cap the total wait
 *   node poll.mjs --reply <id> done     acknowledge an event
 */

import fs from "node:fs";
import path from "node:path";

const PER_REQUEST_TIMEOUT_MS = 270_000;
const DEFAULT_TOTAL_TIMEOUT_MS = 600_000;
const INFO_FILE = ".tourkit-record.json";

function readInfo() {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), INFO_FILE), "utf-8"));
  } catch {
    console.log(
      JSON.stringify({
        ok: false,
        error: "no_server",
        message:
          "no recorder server running. Start one: node record-server.mjs start --port 5178 --out src/tours",
      }),
    );
    process.exit(1);
  }
}

async function reply(info, args, index) {
  const id = args[index + 1];
  const status = args[index + 2] || "done";
  if (!id) {
    console.log(JSON.stringify({ ok: false, error: "usage: node poll.mjs --reply <id> <status>" }));
    process.exit(1);
  }
  try {
    const response = await fetch(`http://127.0.0.1:${info.port}/poll`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: info.token, id, type: status }),
    });
    if (!response.ok) {
      console.log(JSON.stringify({ ok: false, error: "reply_failed", status: response.status }));
      process.exit(1);
    }
    console.log(JSON.stringify({ ok: true, replied: id, status }));
  } catch (error) {
    console.log(
      JSON.stringify({ ok: false, error: "unreachable", message: String(error?.message) }),
    );
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: node poll.mjs [--timeout=MS] [--reply <id> <status>]

Blocks until the browser posts a recording, then prints the event as JSON.
Each HTTP request is capped at ${PER_REQUEST_TIMEOUT_MS}ms and retried internally.`);
    return;
  }

  const info = readInfo();

  const replyIndex = args.indexOf("--reply");
  if (replyIndex !== -1) return reply(info, args, replyIndex);

  const timeoutArg = args.find((arg) => arg.startsWith("--timeout="));
  const total = timeoutArg
    ? Number.parseInt(timeoutArg.split("=")[1], 10)
    : DEFAULT_TOTAL_TIMEOUT_MS;
  const deadline = Date.now() + (Number.isFinite(total) ? total : DEFAULT_TOTAL_TIMEOUT_MS);

  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      console.log(JSON.stringify({ ok: true, type: "timeout" }));
      return;
    }
    const slice = Math.min(remaining, PER_REQUEST_TIMEOUT_MS);

    let event;
    try {
      const response = await fetch(
        `http://127.0.0.1:${info.port}/poll?token=${encodeURIComponent(info.token)}&timeout=${slice}`,
      );
      if (!response.ok) {
        console.log(JSON.stringify({ ok: false, error: "poll_failed", status: response.status }));
        process.exit(1);
      }
      event = await response.json();
    } catch (error) {
      const code = error?.cause?.code;
      if (code === "ECONNREFUSED") {
        console.log(
          JSON.stringify({
            ok: false,
            error: "server_gone",
            message: "recorder server is not listening",
          }),
        );
        process.exit(1);
      }
      console.log(
        JSON.stringify({ ok: false, error: "poll_error", message: String(error?.message) }),
      );
      process.exit(1);
    }

    // A timeout slice is the server saying "nothing yet". Keep waiting until the
    // caller's own deadline, so one `poll.mjs` call spans the whole recording session.
    if (event && event.type === "timeout") continue;

    console.log(JSON.stringify({ ok: true, ...event }));
    return;
  }
}

if (process.argv[1]?.endsWith("poll.mjs")) {
  main().catch((error) => {
    console.log(JSON.stringify({ ok: false, error: String(error?.message) }));
    process.exit(1);
  });
}
