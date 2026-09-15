# The tourkit skill

Recording and authoring a tour is agent work, not library work. The skill replaces `@tourkit/cli`,
which is discontinued.

The difference that matters: the CLI detected four frameworks and wrote three hardcoded templates,
and its browser half was `<TourRecorder>`, a React component. The skill reads your actual project,
and its recorder is a plain DOM script injected into your HTML, so it records in Vue, Angular,
Svelte, Ember, Astro, Qwik, Solid, plain HTML, Electron and Tauri as well as React.

## Install

```
/plugin marketplace add yz174/tourkit
/plugin install tourkit@tourkit
```

That works in Claude Code. Cursor and Codex read `skills/tourkit/SKILL.md` from a plain checkout of
the repo; the scripts are dependency-free Node and run with `node <script>`.

The skill ships in the same repo as the packages, so its per-framework wiring instructions cannot
drift away from the renderer they wire up.

## Commands

| Command | What it does |
| --- | --- |
| `init` | Detect the framework, install the player, scaffold a tour module, mount it |
| `record` | Boot the recorder, inject it, and turn your clicks into a tour |
| `author` | Write or rewrite step copy from the component source |
| `wire` | Mount the player in a project that already has tour files |
| `heal` | Find steps whose target no longer resolves, propose or apply fixes |
| `review` | Critique a tour against known anti-patterns |

Ask for one by name ("record a tour of the driver flow") or just describe the job.

## The record loop

```
1. detect.mjs          framework, dev server, HTML entry, insertion point
2. record-server.mjs   start on a port, write .tourkit-record.json
3. inject.mjs          write the <script> tag; your dev server hot-reloads
4. poll.mjs            block until you press Save
5. you click           through your own app
6. the agent           greps for each element, reads the component, writes the copy
7. emit.mjs            .tour.json to .tour.ts
8. inject.mjs --remove and stop the server
```

Step 8 restores your HTML byte for byte. If `git diff` shows anything in that file afterwards,
something else edited it.

Nothing in that loop is framework-specific. Vue, Angular, Svelte, Ember and plain HTML all serve
HTML. Electron and Tauri serve HTML to a webview, and `detect.mjs` reads `tauri.conf.json` or the
electron-builder config to find the entry.

React Native is the exception: there is no HTML to inject. `@tourkit/native` keeps its own recorder
panel, and the skill's server answers the same `GET /status` handshake that panel already polls, so
recording on a device works with no native changes.

## While recording

Clicks do not do anything. The capture listener runs on the capture phase and calls both
`preventDefault` and `stopPropagation`, so clicking a real Delete button records the button instead
of deleting the row.

The route is read from `location.pathname` at click time, so a single-page app that changes route
mid-recording needs no history patching.

## Scripts

Every script prints exactly one JSON object to stdout and takes no dependencies.

| Script | Usage |
| --- | --- |
| `detect.mjs` | `node detect.mjs [--cwd <dir>]` |
| `record-server.mjs` | `node record-server.mjs start --port 5178 --out src/tours`, and `stop` |
| `inject.mjs` | `node inject.mjs --file index.html --port 5178`, and `--remove` |
| `poll.mjs` | `node poll.mjs [--timeout=270000]` |
| `emit.mjs` | `node emit.mjs src/tours/onboarding.tour.json` |
| `is-generated.mjs` | `node is-generated.mjs <file>` |

`recorder-browser.js` is the injected capture bar. It is generated from `@tourkit/core/dom` by
`skills/tourkit/build/build-recorder.mjs` and committed, so the skill works when installed on its
own. A unit test rebuilds it and fails if the committed copy has drifted from its source.

## Recording without an agent

Nothing above needs a model. The scripts are the whole mechanism:

```bash
S=skills/tourkit/scripts
node $S/record-server.mjs start --port 5178 --out src/tours
node $S/inject.mjs --file index.html --port 5178
node $S/poll.mjs                        # blocks until you press Save
node $S/emit.mjs src/tours/recorded.tour.json
node $S/inject.mjs --file index.html --remove
node $S/record-server.mjs stop
```

What you lose is step 6: the copy stays the placeholder derived from each element's own label,
rather than being written from what the component actually does.

## Safety

`inject.mjs` refuses to write into `node_modules` or `.git`, and no flag turns that off.

It also refuses a file that looks like build output, judged by `git check-ignore` first and then by
an `@generated` or `DO NOT EDIT` marker in the first 300 bytes. Injecting into build output would
put the tag back in the bin on the next build, or ship it to production. Pass `--allow-generated`
only if you are certain the file is hand-maintained.

Binding the server with `--host 0.0.0.0` so a phone can reach it exposes it to everyone on that
network, and a recording writes a file. The start response carries that warning; stop the server
when you are done.

## Where tours live

`.tour.json` is canonical and machine-written. `.tour.ts` is generated from it and should never be
hand-edited, because the next `emit` overwrites it.

`when`, `gate`, `onEnter` and `onAdvance` are functions, so they cannot live in JSON. They go in a
hand-written module the emitter never opens, merged back with
[`withBehavior`](./migrating.md#behaviour-that-cannot-live-in-json).
