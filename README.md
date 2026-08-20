# tourkit

One app tour, running on web and React Native from the same steps file.

Status: pre-alpha. M0 (repository and release plumbing) is done. Nothing is published yet
and no API is stable. See `FINDINGS.md` for where the work actually stands.

## Packages

| Package | What it is |
| --- | --- |
| `@tourkit/core` | The engine. No React, no DOM, no React Native, no dependencies. |
| `@tourkit/react` | DOM renderer. Not started. |
| `@tourkit/native` | React Native renderer. Not started. |
| `@tourkit/ai` | Optional. Generates tours from a user's question, records tours, heals broken targets. Not started. |

## Development

```bash
bun install
bun run lint
bun run typecheck
bun test
bun run build
```

MIT.
