import { mkdir, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { type DraftedCopy, generateTourFile, type Recording, unregisteredTargets } from "./codegen";

export type RecordServerOptions = {
  port: number;
  host: string;
  outDir: string;
  cwd: string;
  draft?: (recording: Recording) => Promise<DraftedCopy[]>;
  onWritten?: (path: string, recording: Recording) => void;
  /** Called the first time an app asks for /status, so the terminal can say it is connected. */
  onConnected?: (origin: string) => void;
};

export function recordingPath(outDir: string, recording: Recording): string {
  const slug = recording.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return join(outDir, `${slug || "recorded"}.tour.ts`);
}

export async function writeRecording(
  options: Pick<RecordServerOptions, "cwd" | "outDir" | "draft">,
  recording: Recording,
): Promise<{ path: string; contents: string }> {
  let drafts: DraftedCopy[] = [];
  if (options.draft) {
    try {
      drafts = await options.draft(recording);
    } catch {
      drafts = [];
    }
  }

  const relative = recordingPath(options.outDir, recording);
  const absolute = join(options.cwd, relative);
  const contents = generateTourFile(recording, drafts);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, contents, "utf8");
  return { path: relative, contents };
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

export function createRecordHandler(options: Omit<RecordServerOptions, "port" | "host">) {
  let announced = false;

  return async function handle(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    // The handshake. An app polls this to decide whether to show its recorder panel at all,
    // which is what makes the panel appear when the CLI starts and disappear when it stops.
    if (request.method === "GET" && new URL(request.url).pathname === "/status") {
      if (!announced) {
        announced = true;
        options.onConnected?.(request.headers.get("origin") ?? "your app");
      }
      return Response.json({ ok: true, outDir: options.outDir }, { status: 200, headers: CORS });
    }

    if (request.method !== "POST") {
      return Response.json({ error: "method not allowed" }, { status: 405, headers: CORS });
    }

    let recording: Recording;
    try {
      recording = (await request.json()) as Recording;
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400, headers: CORS });
    }

    if (!Array.isArray(recording?.steps) || recording.steps.length === 0) {
      return Response.json({ error: "no steps recorded" }, { status: 400, headers: CORS });
    }

    const written = await writeRecording(options, recording);
    options.onWritten?.(written.path, recording);
    return Response.json(
      { path: written.path, steps: recording.steps.length },
      { status: 200, headers: CORS },
    );
  };
}

/** Every URL an app might reach this server on, for the terminal banner. */
export function reachableUrls(host: string, port: number, interfaces: string[] = []): string[] {
  if (host !== "0.0.0.0") return [`http://${host}:${port}`];
  return [`http://127.0.0.1:${port}`, ...interfaces.map((address) => `http://${address}:${port}`)];
}

export function startupLines(host: string, outDir: string, urls: string[]): string[] {
  const lines = [`tourkit: listening on ${urls[0]}`];
  for (const url of urls.slice(1)) lines.push(`tourkit: reachable on ${url}`);
  lines.push(
    `tourkit: tours will be written to ${outDir}`,
    "tourkit: waiting for your app. Run it in development with <TourRecorder /> mounted.",
  );
  if (host === "0.0.0.0") {
    lines.push(
      "tourkit: bound to every interface, so a phone on your network can reach it.",
      "tourkit: anyone else on that network can too, and a recording writes a file. Stop it when done.",
    );
  }
  return lines;
}

export function reportRecording(path: string, recording: Recording): string[] {
  const lines = [`tourkit: wrote ${path} with ${recording.steps.length} recorded steps`];
  const loose = unregisteredTargets(recording);
  if (loose.length > 0) {
    lines.push(
      `tourkit: ${loose.length} of them use a CSS selector rather than a data-tour-id:`,
      ...loose.map((step) => `  - ${step.target}`),
      `tourkit: selectors break when the markup changes. Add data-tour-id to those elements.`,
    );
  }
  return lines;
}

export function nodeListener(handle: (request: Request) => Promise<Response>) {
  return async function listener(
    incoming: IncomingMessage,
    outgoing: ServerResponse,
  ): Promise<void> {
    incoming.setEncoding("utf8");
    let body = "";
    for await (const chunk of incoming) body += String(chunk);

    const origin = incoming.headers.origin;
    const request = new Request(`http://127.0.0.1${incoming.url ?? "/"}`, {
      method: incoming.method ?? "GET",
      headers: {
        "content-type": "application/json",
        ...(typeof origin === "string" ? { origin } : {}),
      },
      ...(body && incoming.method !== "GET" ? { body } : {}),
    });

    const response = await handle(request);
    const text = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    outgoing.writeHead(response.status, headers);
    outgoing.end(text);
  };
}
