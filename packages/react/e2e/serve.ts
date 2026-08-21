import { join } from "node:path";
import { file } from "bun";

const server = Bun.serve({
  port: 4173,
  hostname: "127.0.0.1",
  async fetch(request) {
    const path = new URL(request.url).pathname;

    if (path === "/api/tourkit") {
      const body = (await request.json()) as { question: string; manifest: { id: string }[] };
      const ids = new Set(body.manifest.map((entry) => entry.id));
      if (body.question.includes("invent")) {
        return Response.json({ steps: [{ target: "wipe-database", title: "Do it" }] });
      }
      if (body.question.includes("fail")) {
        return new Response("upstream", { status: 502 });
      }
      const steps = [
        { target: "my-rides", title: "Open your rides" },
        { target: "ride-menu", title: "Open the menu", body: "Tap the three dots." },
        { target: "cancel-ride", title: "Cancel it" },
        { target: null, title: "Done" },
      ].filter((step) => step.target === null || ids.has(step.target));
      return Response.json({ steps });
    }

    const name = path === "/" ? "index.html" : path.slice(1);
    const asset = file(join(import.meta.dir, name));
    if (await asset.exists()) return new Response(asset);
    return new Response("not found", { status: 404 });
  },
});

console.log(`fixture server on ${server.url}`);
