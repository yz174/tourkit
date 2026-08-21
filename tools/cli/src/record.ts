import { mkdir, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { type DraftedCopy, generateTourFile, type Recording, unregisteredTargets } from "./codegen";

export type RecordServerOptions = {
  port: number;
  outDir: string;
  cwd: string;
  draft?: (recording: Recording) => Promise<DraftedCopy[]>;
  onWritten?: (path: string, recording: Recording) => void;
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
  "access-control-allow-methods": "POST, OPTIONS",
};

export function createRecordHandler(options: Omit<RecordServerOptions, "port">) {
  return async function handle(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
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

    const request = new Request(`http://127.0.0.1${incoming.url ?? "/"}`, {
      method: incoming.method ?? "GET",
      headers: { "content-type": "application/json" },
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
