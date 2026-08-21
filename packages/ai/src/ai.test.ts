import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { TargetManifest } from "@tourkit/core";
import { askTourkit, cacheKey } from "./client";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import { askRequestSchema } from "./schema";
import { anthropicGenerator, createTourkitHandler, type TourGenerator } from "./server";
import { validateGenerated } from "./validate";

const manifest: TargetManifest = [
  { id: "my-rides", label: "My rides", route: "/" },
  { id: "ride-menu", label: "Ride options" },
  { id: "cancel", label: "Cancel ride" },
];

const good = {
  steps: [
    { target: "my-rides", title: "Open your rides" },
    { target: "ride-menu", title: "Open the menu", body: "Tap the three dots." },
    { target: "cancel", title: "Cancel it" },
    { target: null, title: "Done" },
  ],
};

function post(body: unknown, method = "POST"): Request {
  return new Request("https://app.test/api/tourkit", {
    method,
    headers: { "content-type": "application/json" },
    body: method === "POST" ? JSON.stringify(body) : null,
  });
}

describe("validateGenerated", () => {
  test("turns a well-formed response into a tour config", () => {
    const result = validateGenerated(good, manifest);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tour.id).toBe("tourkit-generated");
    expect(result.tour.steps.map((step) => step.target)).toEqual([
      "my-rides",
      "ride-menu",
      "cancel",
      null,
    ]);
    expect(result.tour.steps[0]?.id).toBe("generated-1");
    expect(result.tour.steps[1]?.body).toBe("Tap the three dots.");
  });

  test("rejects a target that is not in the manifest", () => {
    const result = validateGenerated(
      { steps: [{ target: "delete-account", title: "Delete it" }] },
      manifest,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("unknown-target");
    expect(result.detail).toContain("delete-account");
  });

  test("rejects an unknown target even when other steps are valid", () => {
    const result = validateGenerated(
      {
        steps: [
          { target: "my-rides", title: "Fine" },
          { target: "invented", title: "Not fine" },
        ],
      },
      manifest,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("unknown-target");
  });

  test("rejects malformed shapes", () => {
    for (const bad of [null, {}, { steps: [] }, { steps: [{ title: "no target" }] }, "text"]) {
      expect(validateGenerated(bad, manifest).ok).toBe(false);
    }
  });

  test("rejects a step whose title is empty or far too long", () => {
    expect(validateGenerated({ steps: [{ target: null, title: "" }] }, manifest).ok).toBe(false);
    expect(
      validateGenerated({ steps: [{ target: null, title: "x".repeat(200) }] }, manifest).ok,
    ).toBe(false);
  });

  test("caps the number of steps", () => {
    const many = { steps: Array.from({ length: 20 }, () => ({ target: null, title: "step" })) };

    expect(validateGenerated(many, manifest).ok).toBe(false);
  });

  test("collapses a repeated target rather than highlighting it twice in a row", () => {
    const result = validateGenerated(
      {
        steps: [
          { target: "my-rides", title: "One" },
          { target: "my-rides", title: "Two" },
          { target: "cancel", title: "Three" },
        ],
      },
      manifest,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tour.steps.map((step) => step.target)).toEqual(["my-rides", "cancel"]);
  });

  test("an empty manifest rejects every non-null target", () => {
    expect(validateGenerated({ steps: [{ target: "my-rides", title: "x" }] }, []).ok).toBe(false);
    expect(validateGenerated({ steps: [{ target: null, title: "x" }] }, []).ok).toBe(true);
  });

  test("the generated tour id is overridable", () => {
    const result = validateGenerated(good, manifest, "help-answer");

    expect(result.ok && result.tour.id).toBe("help-answer");
  });
});

describe("buildUserPrompt", () => {
  test("lists every target id with its label and route", () => {
    const prompt = buildUserPrompt("how do I cancel?", manifest);

    expect(prompt).toContain("- my-rides — My rides (on /)");
    expect(prompt).toContain("- ride-menu — Ride options");
    expect(prompt).toContain("Question: how do I cancel?");
  });

  test("a target with no label or route still appears", () => {
    expect(buildUserPrompt("q", [{ id: "bare" }])).toContain("- bare");
  });

  test("a very large manifest is truncated", () => {
    const huge = Array.from({ length: 400 }, (_, index) => ({ id: `t-${index}` }));
    const prompt = buildUserPrompt("q", huge);

    expect(prompt).toContain("t-0");
    expect(prompt).not.toContain("t-399");
  });
});

describe("SYSTEM_PROMPT", () => {
  test("forbids inventing targets", () => {
    expect(SYSTEM_PROMPT).toContain("Never invent a target id");
  });
});

describe("createTourkitHandler", () => {
  const handler = (generate: TourGenerator) => createTourkitHandler({ generate });

  test("returns validated steps for a good request", async () => {
    const response = await handler(async () => good)(post({ question: "how?", manifest }));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { steps: { target: string | null }[] };
    expect(body.steps.map((step) => step.target)).toEqual([
      "my-rides",
      "ride-menu",
      "cancel",
      null,
    ]);
  });

  test("refuses anything but POST", async () => {
    expect((await handler(async () => good)(post(null, "GET"))).status).toBe(405);
  });

  test("rejects a body that is not valid json", async () => {
    const request = new Request("https://app.test/api", { method: "POST", body: "{oops" });

    expect((await handler(async () => good)(request)).status).toBe(400);
  });

  test("rejects a request with no question or no manifest", async () => {
    expect((await handler(async () => good)(post({ manifest }))).status).toBe(400);
    expect((await handler(async () => good)(post({ question: "hi" }))).status).toBe(400);
    expect((await handler(async () => good)(post({ question: "", manifest }))).status).toBe(400);
  });

  test("rejects an absurdly long question before calling the model", async () => {
    let called = 0;
    const response = await handler(async () => {
      called += 1;
      return good;
    })(post({ question: "x".repeat(600), manifest }));

    expect(response.status).toBe(400);
    expect(called).toBe(0);
  });

  test("returns 502 when the model call throws", async () => {
    const response = await handler(async () => {
      throw new Error("upstream down");
    })(post({ question: "how?", manifest }));

    expect(response.status).toBe(502);
    expect(((await response.json()) as { error: string }).error).toBe("upstream down");
  });

  test("returns 422 and never leaks an unknown target to the client", async () => {
    const response = await handler(async () => ({
      steps: [{ target: "wipe-database", title: "Do it" }],
    }))(post({ question: "how?", manifest }));

    expect(response.status).toBe(422);
    const body = (await response.json()) as { reason: string };
    expect(body.reason).toBe("unknown-target");
  });

  test("the manifest the client sent is what the generator is given", async () => {
    let seen: TargetManifest = [];
    await handler(async (input) => {
      seen = input.manifest;
      return good;
    })(post({ question: "how?", manifest }));

    expect(seen.map((entry) => entry.id)).toEqual(["my-rides", "ride-menu", "cancel"]);
  });
});

describe("askTourkit", () => {
  const ok = (body: unknown) =>
    (async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;

  test("validates the server response a second time on the client", async () => {
    const result = await askTourkit({
      endpoint: "/api/tourkit",
      question: "how?",
      manifest,
      fetchImpl: ok(good),
    });

    expect(result.ok).toBe(true);
  });

  test("a compromised or stale server cannot smuggle in an unknown target", async () => {
    const result = await askTourkit({
      endpoint: "/api/tourkit",
      question: "how?",
      manifest,
      fetchImpl: ok({ steps: [{ target: "wipe-database", title: "Do it" }] }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("unknown-target");
  });

  test("a non-200 response fails cleanly", async () => {
    const result = await askTourkit({
      endpoint: "/api/tourkit",
      question: "how?",
      manifest,
      fetchImpl: (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.detail).toContain("500");
  });

  test("a network failure fails cleanly rather than throwing", async () => {
    const result = await askTourkit({
      endpoint: "/api/tourkit",
      question: "how?",
      manifest,
      fetchImpl: (async () => {
        throw new Error("offline");
      }) as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.detail).toBe("offline");
  });

  test("invalid json from the endpoint fails cleanly", async () => {
    const result = await askTourkit({
      endpoint: "/api/tourkit",
      question: "how?",
      manifest,
      fetchImpl: (async () => new Response("{oops", { status: 200 })) as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
  });
});

describe("cacheKey", () => {
  test("ignores case, surrounding space and manifest order", () => {
    expect(cacheKey("  How? ", manifest)).toBe(cacheKey("how?", [...manifest].reverse()));
  });

  test("changes when the question or the available targets change", () => {
    expect(cacheKey("a", manifest)).not.toBe(cacheKey("b", manifest));
    expect(cacheKey("a", manifest)).not.toBe(cacheKey("a", manifest.slice(1)));
  });
});

describe("anthropicGenerator", () => {
  test("sends the system prompt and the manifest, and returns the parsed output", async () => {
    let body: Record<string, unknown> = {};
    const generate = anthropicGenerator({
      client: {
        messages: {
          parse: async (sent) => {
            body = sent;
            return { parsed_output: good };
          },
        },
      },
    });

    const result = await generate({ question: "how do I cancel?", manifest });

    expect(result).toEqual(good);
    expect(body.model).toBe("claude-opus-5");
    expect(body.system).toBe(SYSTEM_PROMPT);
    expect(JSON.stringify(body.messages)).toContain("ride-menu");
  });

  test("the model is overridable", async () => {
    let model = "";
    const generate = anthropicGenerator({
      model: "claude-haiku-4-5",
      client: {
        messages: {
          parse: async (sent) => {
            model = String(sent.model);
            return { parsed_output: good };
          },
        },
      },
    });

    await generate({ question: "q", manifest });

    expect(model).toBe("claude-haiku-4-5");
  });
});

describe("the client half never handles a key", () => {
  test("no client module mentions an api key", async () => {
    const clientModules = ["./client.ts", "./react.ts", "./index.ts", "./validate.ts"];

    for (const path of clientModules) {
      const source = await Bun.file(join(import.meta.dir, path)).text();
      expect(source.toLowerCase()).not.toContain("apikey");
      expect(source.toLowerCase()).not.toContain("anthropic");
      expect(source).not.toContain("authorization");
    }
  });

  test("the request the client sends carries only a question and a manifest", async () => {
    let sent: unknown;
    await askTourkit({
      endpoint: "/api/tourkit",
      question: "how?",
      manifest,
      fetchImpl: (async (_url: string, init: RequestInit) => {
        sent = JSON.parse(String(init.body));
        return new Response(JSON.stringify(good), { status: 200 });
      }) as unknown as typeof fetch,
    });

    expect(Object.keys(sent as object).sort()).toEqual(["manifest", "question"]);
  });
});

describe("askRequestSchema", () => {
  test("caps the manifest size", () => {
    const huge = Array.from({ length: 500 }, (_, index) => ({ id: `t-${index}` }));

    expect(askRequestSchema.safeParse({ question: "q", manifest: huge }).success).toBe(false);
  });
});
