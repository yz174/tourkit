#!/usr/bin/env node
/**
 * The recorder server. Zero dependencies, plain node:http.
 *
 * It serves the injected capture bar, takes the recording the bar posts back, writes it
 * to disk, and hands the agent an event over a long poll.
 *
 * Endpoints:
 *   GET  /status      handshake. Byte-compatible with what packages/native's panel polls.
 *   GET  /recorder.js the injected capture bar.
 *   POST /record      a recording. POST / is accepted too, which is what the native panel uses.
 *   GET  /poll        agent long-poll: returns one event.
 *   POST /poll        agent reply to an event.
 *
 * Usage:
 *   node record-server.mjs start --port 5178 --out src/tours
 *   node record-server.mjs stop
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brittleTargets, recordingToTour } from "./emit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INFO_FILE = ".tourkit-record.json";
const DEFAULT_PORT = 5178;
const DEFAULT_POLL_TIMEOUT = 600_000;

/** Permissive on purpose: the app is on its own origin, and a phone on the LAN is a real case. */
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

const state = {
  announced: false,
  pendingEvents: [],
  pendingPolls: [],
  outDir: "",
  cwd: process.cwd(),
  token: "",
};

function json(res, status, body, extra = {}) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(text),
    ...CORS,
    ...extra,
  });
  res.end(text);
}

function enqueue(event) {
  const waiting = state.pendingPolls.shift();
  if (waiting) waiting(event);
  else state.pendingEvents.push(event);
}

function slugify(name) {
  const slug = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "recorded";
}

async function readBody(req, limitBytes = 5 * 1024 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) throw new Error("body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function writeRecording(recording) {
  const slug = slugify(recording.name);
  const dir = path.resolve(state.cwd, state.outDir);
  fs.mkdirSync(dir, { recursive: true });

  const recordingFile = path.join(dir, `${slug}.recording.json`);
  const tourFile = path.join(dir, `${slug}.tour.json`);
  const tour = recordingToTour(recording);

  fs.writeFileSync(recordingFile, `${JSON.stringify(recording, null, 2)}\n`, "utf-8");
  fs.writeFileSync(tourFile, `${JSON.stringify(tour, null, 2)}\n`, "utf-8");

  const relative = (file) => path.relative(state.cwd, file).split(path.sep).join("/");
  return {
    tour,
    recordingPath: relative(recordingFile),
    tourPath: relative(tourFile),
  };
}

function serveRecorderScript(res) {
  const file = path.join(__dirname, "recorder-browser.js");
  let body;
  try {
    body = fs.readFileSync(file);
  } catch {
    res.writeHead(500, { "content-type": "text/plain", ...CORS });
    res.end("recorder-browser.js is missing. Run: node skills/tourkit/build/build-recorder.mjs");
    return;
  }
  res.writeHead(200, {
    "content-type": "application/javascript; charset=utf-8",
    "content-length": body.length,
    "cache-control": "no-store",
    ...CORS,
  });
  res.end(body);
}

function handlePoll(req, res, url) {
  if (url.searchParams.get("token") !== state.token) {
    json(res, 403, { error: "bad token" });
    return;
  }
  const ready = state.pendingEvents.shift();
  if (ready) {
    json(res, 200, ready);
    return;
  }

  const requested = Number.parseInt(url.searchParams.get("timeout") ?? "", 10);
  const timeout = Number.isFinite(requested) ? requested : DEFAULT_POLL_TIMEOUT;

  let settled = false;
  const deliver = (event) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    json(res, 200, event);
  };
  const timer = setTimeout(() => {
    const index = state.pendingPolls.indexOf(deliver);
    if (index !== -1) state.pendingPolls.splice(index, 1);
    deliver({ type: "timeout" });
  }, timeout);

  state.pendingPolls.push(deliver);
  req.on("close", () => {
    const index = state.pendingPolls.indexOf(deliver);
    if (index !== -1) state.pendingPolls.splice(index, 1);
    clearTimeout(timer);
    settled = true;
  });
}

function createServer(onConnected) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const route = url.pathname.replace(/\/+$/, "") || "/";

    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS);
      res.end();
      return;
    }

    if (req.method === "GET" && route === "/status") {
      // The handshake. An app polls this to decide whether to show its panel at all, which
      // is what makes the panel appear when the server starts and vanish when it stops.
      // `?probe=1` is the launcher checking the port; it must not consume the announcement.
      if (!state.announced && url.searchParams.get("probe") !== "1") {
        state.announced = true;
        onConnected?.(req.headers.origin ?? "your app");
      }
      json(res, 200, { ok: true, outDir: state.outDir });
      return;
    }

    if (req.method === "GET" && route === "/recorder.js") {
      serveRecorderScript(res);
      return;
    }

    if (req.method === "GET" && route === "/poll") {
      handlePoll(req, res, url);
      return;
    }

    if (req.method === "POST" && route === "/poll") {
      try {
        const reply = JSON.parse(await readBody(req));
        if (reply.token !== state.token) {
          json(res, 403, { error: "bad token" });
          return;
        }
        json(res, 200, { ok: true });
      } catch {
        json(res, 400, { error: "invalid json" });
      }
      return;
    }

    if (req.method !== "POST") {
      json(res, 405, { error: "method not allowed" });
      return;
    }

    if (route !== "/record" && route !== "/") {
      json(res, 404, { error: "not found" });
      return;
    }

    let recording;
    try {
      recording = JSON.parse(await readBody(req));
    } catch {
      json(res, 400, { error: "invalid json" });
      return;
    }

    if (!Array.isArray(recording?.steps) || recording.steps.length === 0) {
      json(res, 400, { error: "no steps recorded" });
      return;
    }

    let written;
    try {
      written = writeRecording(recording);
    } catch (error) {
      json(res, 500, { error: "write failed", message: String(error?.message) });
      return;
    }

    enqueue({
      id: randomUUID(),
      type: "recording",
      name: recording.name ?? "recorded",
      steps: recording.steps.length,
      tourPath: written.tourPath,
      recordingPath: written.recordingPath,
      targets: written.tour.steps.map((step) => step.target),
      brittle: brittleTargets(written.tour),
      unregistered: recording.steps.filter((step) => !step.registered).map((step) => step.target),
    });

    json(res, 200, { ok: true, path: written.tourPath, steps: recording.steps.length });
  });
}

function infoPath(cwd = process.cwd()) {
  return path.join(cwd, INFO_FILE);
}

function readInfo(cwd = process.cwd()) {
  try {
    return JSON.parse(fs.readFileSync(infoPath(cwd), "utf-8"));
  } catch {
    return null;
  }
}

function portIsFree(port, host) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, host, () => probe.close(() => resolve(true)));
  });
}

async function runDaemon(options) {
  state.outDir = options.out;
  state.cwd = options.cwd;
  state.token = options.token;

  const server = createServer((origin) => {
    process.stdout.write(`tourkit: ${origin} connected\n`);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, resolve);
  });

  const shutdown = () => {
    try {
      const info = readInfo(options.cwd);
      if (info && info.pid === process.pid) fs.unlinkSync(infoPath(options.cwd));
    } catch {}
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

async function start(args) {
  const cwd = process.cwd();
  const portIndex = args.indexOf("--port");
  const outIndex = args.indexOf("--out");
  const hostIndex = args.indexOf("--host");

  const port = portIndex !== -1 ? Number.parseInt(args[portIndex + 1], 10) : DEFAULT_PORT;
  const out = outIndex !== -1 ? args[outIndex + 1] : "src/tours";
  const host = hostIndex !== -1 ? args[hostIndex + 1] : "127.0.0.1";

  if (!Number.isFinite(port)) {
    console.log(JSON.stringify({ ok: false, error: "bad_port" }));
    process.exit(1);
  }

  const existing = readInfo(cwd);
  if (existing) {
    console.log(
      JSON.stringify({
        ok: false,
        error: "already_running",
        ...existing,
        message: "run stop first",
      }),
    );
    process.exit(1);
  }

  if (!(await portIsFree(port, host))) {
    console.log(JSON.stringify({ ok: false, error: "port_in_use", port }));
    process.exit(1);
  }

  const token = randomUUID();
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(import.meta.url),
      "daemon",
      "--port",
      String(port),
      "--out",
      out,
      "--host",
      host,
      "--token",
      token,
    ],
    { cwd, detached: true, stdio: "ignore" },
  );
  child.unref();

  const reachable = host === "0.0.0.0" ? "127.0.0.1" : host;
  const deadline = Date.now() + 10_000;
  let up = false;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${reachable}:${port}/status?probe=1`);
      if (response.ok) {
        up = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!up) {
    try {
      process.kill(child.pid);
    } catch {}
    console.log(JSON.stringify({ ok: false, error: "did_not_start", port }));
    process.exit(1);
  }

  const info = {
    ok: true,
    port,
    host,
    outDir: out,
    pid: child.pid,
    token,
    recorderUrl: `http://127.0.0.1:${port}/recorder.js`,
    statusUrl: `http://127.0.0.1:${port}/status`,
  };
  fs.writeFileSync(infoPath(cwd), `${JSON.stringify(info, null, 2)}\n`, "utf-8");

  if (host === "0.0.0.0") {
    info.warning =
      "bound to every interface so a phone on your network can reach it. Anyone else on that network can too, and a recording writes a file. Stop it when you are done.";
  }
  console.log(JSON.stringify(info));
}

function stop() {
  const cwd = process.cwd();
  const info = readInfo(cwd);
  if (!info) {
    console.log(JSON.stringify({ ok: true, stopped: false, note: "no server running" }));
    return;
  }
  let killed = false;
  try {
    process.kill(info.pid);
    killed = true;
  } catch {}
  try {
    fs.unlinkSync(infoPath(cwd));
  } catch {}
  console.log(JSON.stringify({ ok: true, stopped: killed, pid: info.pid, port: info.port }));
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || args.includes("--help")) {
    console.log(`Usage: node record-server.mjs <start|stop> [options]

  start --port 5178 --out src/tours [--host 127.0.0.1]
  stop

Output (JSON): { ok, port, outDir, pid, token, recorderUrl }`);
    return;
  }

  if (command === "daemon") {
    const read = (flag, fallback) => {
      const index = args.indexOf(flag);
      return index !== -1 ? args[index + 1] : fallback;
    };
    await runDaemon({
      port: Number.parseInt(read("--port", String(DEFAULT_PORT)), 10),
      out: read("--out", "src/tours"),
      host: read("--host", "127.0.0.1"),
      token: read("--token", ""),
      cwd: process.cwd(),
    });
    return;
  }

  if (command === "start") return start(args);
  if (command === "stop") return stop();

  console.log(JSON.stringify({ ok: false, error: "unknown_command", command }));
  process.exit(1);
}

if (process.argv[1]?.endsWith("record-server.mjs")) {
  main().catch((error) => {
    console.log(JSON.stringify({ ok: false, error: String(error?.message) }));
    process.exit(1);
  });
}

export { createServer, slugify };
