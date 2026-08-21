# @tourkit/ai

Optional. Turns a user's question into a [tourkit](https://github.com/yz174/tourkit) tour of the
real interface, and drafts copy for recorded tours.

```bash
npm i @tourkit/ai
```

The client sends only the question and the ids of the targets currently on screen. Your own server
calls the model with your own key, through `@tourkit/ai/server`. A step naming a target that is not
in that manifest is rejected on the server and again in the browser, so the model cannot point at
something that does not exist.

```ts
import { anthropicGenerator } from "@tourkit/ai/server";
```

`@anthropic-ai/sdk` and `react` are optional peer dependencies: install whichever half you use.

Docs: [AI](https://github.com/yz174/tourkit/blob/main/docs/ai.md)

MIT.
