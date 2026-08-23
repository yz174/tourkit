export const RECORD_PORT = 5178;

/**
 * The host Metro is served from, which is by definition the machine running `tourkit record`.
 * Accepts a full bundle URL or a bare dev-server origin with a trailing slash.
 */
export function hostFromScriptUrl(scriptUrl: string | null | undefined): string | null {
  if (!scriptUrl) return null;
  const match = /^[a-z]+:\/\/([^/:]+)/i.exec(scriptUrl);
  const host = match?.[1];
  if (!host) return null;
  // localhost inside a physical device means the device itself, which is never the CLI.
  return host;
}

export type EndpointInput = {
  scriptUrl?: string | null;
  platform?: string;
  port?: number;
};

/**
 * Android emulators cannot see the host's loopback: 10.0.2.2 is the alias that reaches it.
 * iOS simulators share the host's network stack, so 127.0.0.1 is right there. Neither fallback
 * helps a physical device, which is why the script URL is tried first.
 */
export function defaultRecordEndpoint({
  scriptUrl,
  platform,
  port = RECORD_PORT,
}: EndpointInput = {}): string {
  const host = hostFromScriptUrl(scriptUrl) ?? (platform === "android" ? "10.0.2.2" : "127.0.0.1");
  return `http://${host}:${port}/record`;
}

export function statusUrl(endpoint: string): string {
  return endpoint.replace(/\/record\/?$/, "/status");
}
