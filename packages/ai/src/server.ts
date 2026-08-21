import type { TargetManifest } from "@tourkit/core";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import { askRequestSchema, generatedTourSchema } from "./schema";
import { validateGenerated } from "./validate";

export type GenerateInput = { question: string; manifest: TargetManifest };

export type TourGenerator = (input: GenerateInput) => Promise<unknown>;

export type HandlerOptions = {
  generate: TourGenerator;
  tourId?: string;
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function createTourkitHandler({ generate, tourId }: HandlerOptions) {
  return async function handle(request: Request): Promise<Response> {
    if (request.method !== "POST") return json({ error: "method not allowed" }, 405);

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "invalid json" }, 400);
    }

    const parsed = askRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? "invalid request" }, 400);
    }

    let raw: unknown;
    try {
      raw = await generate(parsed.data);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "generation failed" }, 502);
    }

    const result = validateGenerated(raw, parsed.data.manifest, tourId);
    if (!result.ok) return json({ error: result.detail, reason: result.reason }, 422);

    return json({ steps: result.tour.steps.map(toWire) }, 200);
  };
}

function toWire(step: { target?: string | null; title?: string; body?: string }) {
  return {
    target: step.target ?? null,
    title: step.title ?? "",
    ...(step.body ? { body: step.body } : {}),
  };
}

export type ParsedResponse = { parsed_output: unknown };

export type AnthropicLike = {
  messages: {
    parse(body: Record<string, unknown>): Promise<ParsedResponse>;
  };
};

export type AnthropicGeneratorOptions = {
  apiKey?: string | undefined;
  model?: string | undefined;
  client?: AnthropicLike | undefined;
};

type Loaded = { client: AnthropicLike; outputFormat: unknown };

export function anthropicGenerator(options: AnthropicGeneratorOptions = {}): TourGenerator {
  const model = options.model ?? "claude-opus-5";
  let loading: Promise<Loaded> | null = null;

  const load = async (): Promise<Loaded> => {
    const [sdk, helpers] = await Promise.all([
      import("@anthropic-ai/sdk"),
      import("@anthropic-ai/sdk/helpers/zod"),
    ]);
    const client =
      options.client ??
      (new sdk.default(
        options.apiKey ? { apiKey: options.apiKey } : {},
      ) as unknown as AnthropicLike);
    return { client, outputFormat: helpers.zodOutputFormat(generatedTourSchema) };
  };

  return async ({ question, manifest }) => {
    if (options.client) {
      const response = await options.client.messages.parse(
        requestBody(model, question, manifest, undefined),
      );
      return response.parsed_output;
    }

    loading ??= load();
    const { client, outputFormat } = await loading;
    const response = await client.messages.parse(
      requestBody(model, question, manifest, outputFormat),
    );
    return response.parsed_output;
  };
}

function requestBody(
  model: string,
  question: string,
  manifest: TargetManifest,
  outputFormat: unknown,
): Record<string, unknown> {
  return {
    model,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(question, manifest) }],
    ...(outputFormat ? { output_config: { format: outputFormat } } : {}),
  };
}
