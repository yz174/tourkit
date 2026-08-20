import { join } from "node:path";
import { file } from "bun";

const server = Bun.serve({
  port: 4173,
  hostname: "127.0.0.1",
  async fetch(request) {
    const path = new URL(request.url).pathname;
    const name = path === "/" ? "index.html" : path.slice(1);
    const asset = file(join(import.meta.dir, name));
    if (await asset.exists()) return new Response(asset);
    return new Response("not found", { status: 404 });
  },
});

console.log(`fixture server on ${server.url}`);
