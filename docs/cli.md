# CLI reference

`@tourkit/cli` is a dev-only binary. Nothing imports it at runtime, it renders nothing, and it
injects nothing into your app.

```bash
npm i -D @tourkit/cli
```

```
usage: tourkit init [directory] [--no-wire]
       tourkit record [directory] [--draft] [--host[=0.0.0.0]]
```

Node 20 or newer.

It works alongside a renderer rather than replacing one. The CLI writes files and runs the record
server; the `TourRecorder` component that captures your clicks ships in `@tourkit/react` and
`@tourkit/native`. Installing the CLI alone gets you a server with nothing on the other end.

### Running it, whatever your package manager is

`npx tourkit` only works when npm wrote the shim it looks for. Bun on Windows writes
`tourkit.exe` and `tourkit.bunx` instead, and npx then tries to fetch a package called `tourkit`
from the registry and fails with a 404.

```bash
npx tourkit init          # npm
pnpm tourkit init         # pnpm
yarn tourkit init         # yarn
bunx tourkit init         # bun
```

## tourkit init

Scaffolds the two files from [Adding tourkit to an existing app](./integration.md#the-shape) and
wraps your root layout in them.

```bash
tourkit init                 # writes into src/tour
tourkit init app/tour        # writes somewhere else
tourkit init --no-wire       # scaffolds only, leaves your layout alone
```

### What it detects

It reads `package.json` in the current directory and picks the first match:

| Dependency present | Kind | Tells you to install |
| --- | --- | --- |
| `expo` | expo | `@tourkit/native react-native-svg react-native-reanimated` |
| `react-native` | react-native | the same three |
| `next` | next | `@tourkit/react` |
| `react` | react | `@tourkit/react` |

It prints the install line rather than running it, so your lockfile stays yours.

Two ways it stops:

```
tourkit: no package.json here. Run this from your project root.
tourkit: could not tell whether this is a web or React Native project.
```

The second one means none of the four dependencies were found. Install `@tourkit/react` or
`@tourkit/native` yourself and run it again.

### What it writes

```
src/tour/tours.ts       a two-step TourConfig and an exported `tours` array
src/tour/provider.tsx   a <Tours> wrapper around <TourProvider>, with <TourRecorder /> in dev
```

An existing file is kept, never overwritten:

```
tourkit: kept existing src/tour/tours.ts
```

So re-running `init` after you have edited the scaffold is safe.

The provider it writes is a client component on web, mounts `TourRecorder` behind a development
check, and annotates the context type. The file name is `provider.tsx` rather than `Tours.tsx`
because a case-insensitive filesystem cannot tell `Tours.tsx` from `tours.ts`, and TypeScript then
resolves an import of one to the other.

### What it wires

Unless you pass `--no-wire`, it looks for your root layout in order:

| Kind | Candidates |
| --- | --- |
| Web | `app/layout.tsx`, `src/app/layout.tsx`, `src/App.tsx`, `App.tsx` |
| React Native | `app/_layout.tsx`, `src/app/_layout.tsx`, `App.tsx`, `src/App.tsx` |

It edits the first one it finds, and only when the shape is unambiguous: exactly one `{children}`,
and at least one import to anchor the new one after. Then it wraps:

```tsx
<Tours>{children}</Tours>
```

Four outcomes, all printed:

| Message | Meaning |
| --- | --- |
| `wrapped app/layout.tsx in <Tours>` | Done. |
| `app/layout.tsx already renders <Tours>` | Nothing to do. |
| `left app/layout.tsx alone (no {children} to wrap)` | Your layout does not use the name. |
| `left app/layout.tsx alone (more than one {children})` | Ambiguous, so it refuses to guess. |

The last two print the diff for you to apply by hand:

```
+ import { Tours } from "./tour/provider";

  <Tours>
    {children}
  </Tours>
```

It never reformats the file and never touches anything outside those two edits.

### Next steps it prints

Different per platform, because React Native has three extra requirements:

```
- Add data-tour-id="tourkit-first-target" to one element.
- Call start("onboarding") from useTour() somewhere.
- Run  tourkit record src/tour  and the recorder panel appears in your app.
```

```
- Wrap one element in <TourTarget id="tourkit-first-target">.
- Add "react-native-reanimated/plugin" to your babel plugins if it is not there.
- Rebuild the native app, since react-native-svg and reanimated are native modules.
- Call start("onboarding") from useTour() somewhere.
- Run  tourkit record src/tour --host  and the recorder panel appears in your app.
```

## tourkit record

Starts a local server, waits for your app's `TourRecorder` to connect, and writes a tour file
when you press Save. The flow, the panel and what it can reach are covered in
[Recording a tour](./recorder.md). This is the flag reference.

```bash
tourkit record                    # writes into src/tour, bound to 127.0.0.1
tourkit record app/tour           # somewhere else
tourkit record src/tour --host    # bind every interface, for a physical device
tourkit record src/tour --draft   # have a model write the step copy
```

| Flag | Default | Effect |
| --- | --- | --- |
| `[directory]` | `src/tour` | Where the generated `.tour.ts` file lands. |
| `--host` | off | Binds `0.0.0.0` instead of `127.0.0.1`. Required for a phone on your network. |
| `--host=<address>` | | Binds that address. |
| `--draft` | off | Sends the recording to a model to draft `title` and `body` per step. |

| Environment variable | Default |
| --- | --- |
| `TOURKIT_PORT` | `5178` |

### The two endpoints

| Request | Purpose |
| --- | --- |
| `GET /status` | The handshake. The panel polls this and shows itself only while the CLI answers. |
| `POST /` | The recording. Writes the file and reports what it wrote. |

Both send permissive CORS headers, because your app runs on a different origin from the server.

### --host is a real exposure

```
tourkit: bound to every interface, so a phone on your network can reach it.
tourkit: anyone else on that network can too, and a recording writes a file. Stop it when done.
```

There is no authentication on the record endpoint. Anyone who can reach the port can write a file
into your repo. That is acceptable on your own machine on a trusted network and for as long as
you are recording. Stop the server when you are done.

### --draft needs two more packages

```
tourkit: --draft needs @tourkit/ai and @anthropic-ai/sdk installed.
```

`@tourkit/ai` is an optional peer dependency of the CLI, loaded lazily and only when you pass the
flag. Without it, recording still works and the steps come out with empty copy for you to fill
in. A drafting call that fails is swallowed and you get the same empty copy, so a model outage
never costs you the recording.

### What it writes

One file per recording, named from the panel's `name` field, slugified:

```
tourkit: wrote src/tour/driver-onboarding.tour.ts with 6 recorded steps
```

Steps whose target fell back to a CSS selector are named afterwards, because those are the ones
that will break:

```
tourkit: 2 of them use a CSS selector rather than a data-tour-id:
```

That list is the to-do. Give each of those elements a `data-tour-id` and point the step at it.
See [When a target breaks](./self-healing.md#it-is-a-safety-net-not-a-fix).
