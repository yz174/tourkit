Record a tour by clicking through the running app. No component to mount, no framework to match.

## Prerequisites

The user's dev server is running and they can see their app in a browser. If it is not running, ask them to start it and wait. Do not start it yourself: dev servers own ports, watchers, and sometimes databases.

## The contract (read once)

Execute in order. No step skipped, no step reordered.

1. `detect.mjs` for framework, dev server, HTML entry.
2. `record-server.mjs start`.
3. `inject.mjs` into the HTML entry.
4. `poll.mjs`, and wait.
5. The user clicks. You do nothing until the poll returns.
6. Ground the copy in the source, fix brittle targets, write `.tour.json`.
7. `emit.mjs`, then `inject.mjs --remove`, then `record-server.mjs stop`.

Step 7 is not optional. A script tag left in the user's HTML is a bug you shipped.

Harness policy for step 4:

- **Claude Code**: run `poll.mjs` as a background task. The harness wakes you when it returns.
- **Cursor, Codex**: run `poll.mjs` in the foreground, blocking. Their background terminals do not reliably return stdout to the conversation.

## 1. Start the server

```bash
node <skill>/scripts/record-server.mjs start --port 5178 --out src/tours
```

Use `tourDir` from `detect.mjs` as `--out`. The response carries `port`, `pid`, `token` and `recorderUrl`, and writes `.tourkit-record.json` in the cwd so `poll.mjs` and `stop` can find the server.

`port_in_use` means something already holds 5178. Pick another port and pass it to `inject.mjs` too.

`already_running` means a previous session left a server up. Run `stop` first.

Add `--host 0.0.0.0` only when a phone or another device on the network has to reach it. The response then carries a `warning`; relay it to the user verbatim. It binds every interface, and anyone on that network can post a recording that writes a file.

## 2. Inject

```bash
node <skill>/scripts/inject.mjs --file index.html --port 5178
```

Pick the file from `htmlEntries`. The first entry is the likeliest; if there are several and none is obviously the app shell, ask.

When `htmlEntries` is empty, the framework has no plain HTML file. Use `documentHints` and add the tag by hand to that file, inside the same `<!-- tourkit-record-start -->` and `<!-- tourkit-record-end -->` markers so `--remove` still finds it:

| Framework | File | Where |
|---|---|---|
| Next (app router) | `app/layout.tsx` | last child of `<body>` |
| Next (pages router) | `pages/_document.tsx` | after `<Main />` and `<NextScript />` |
| Nuxt | `app.vue` | inside the root template |
| SvelteKit | `src/app.html` | before `</body>` |
| Remix | `app/root.tsx` | after `<Scripts />` |
| Astro | the layout wrapping the pages being recorded | before `</body>` |

In JSX, an HTML comment is not a comment. Use `{/* tourkit-record-start */}` and the matching close, and write the tag as `<script src="http://127.0.0.1:5178/recorder.js" />`.

`generated_file` means the file is gitignored or carries a `@generated` header, so the tag would be wiped on the next build and the recorder would never appear. Find the source HTML it is built from. Only pass `--allow-generated` if the user confirms the file is really hand-maintained.

`hard_excluded` means the path runs through `node_modules` or `.git`. There is no flag for that, and there should not be.

## 3. Tell the user what to do

Say it in two sentences, not ten:

> Your app now has a recorder bar in the bottom right. Press Record, click the things a new user should be shown in order, then press Save.

Add the one non-obvious part:

> While recording, clicks do not do anything. Clicking Delete records the Delete button instead of deleting.

If the bar never appears: the dev server may not have hot-reloaded the HTML (ask them to reload the page), the page may be served from a different HTML file than the one you injected into, or a Content-Security-Policy may be blocking a cross-origin script. `curl http://127.0.0.1:5178/status` proves the server side.

## 4. Poll

```bash
node <skill>/scripts/poll.mjs
```

It blocks until Save. Each HTTP request is capped at 270000 ms and looped internally, because undici enforces a 300 s headers timeout that cannot be lowered per request. Do not pass a short `--timeout`: it ends the wait, not the recording.

The returned event:

```json
{"ok":true,"id":"...","type":"recording","name":"recorded","steps":3,
 "tourPath":"src/tours/recorded.tour.json","recordingPath":"src/tours/recorded.recording.json",
 "targets":["#launch","post-ride",null],"brittle":["#launch"],"unregistered":["#launch"]}
```

The server has already written both files. `tourPath` is a runnable tour with placeholder copy. Your job is the next two sections.

## 5. Ground the copy

Read `recordingPath` for the raw capture: tag, label, role, text, route, fingerprint per step.

For each step, find the component that renders that element. Grep for the `data-tour-id`, the label, or the visible text. Read the component and the handler it calls. Then write the title and body from what the code does, not from what the element says.

A button labelled "Post" that opens a seat-offer form is "Offer a seat", not "Post button".

Apply the copy laws in SKILL.md. If you cannot find the component, say so and write the honest fallback rather than inventing a claim about the feature.

## 6. Fix brittle targets

Every entry in `brittle` is a CSS selector. It encodes today's markup and breaks silently on the next refactor.

For each one: open the component, add `data-tour-id="something-stable"` to the element, and change the step's `target` to that id. Then drop the step's `fingerprint`, which only exists to heal selector targets.

Report every source file you edited, in a list, before you finish. Never edit a component silently.

If the user declines the edit, keep the selector and keep the fingerprint. The player heals a broken selector by fingerprint and warns once in the console.

## 7. Write and clean up

Write the final `.tour.json`, then:

```bash
node <skill>/scripts/emit.mjs src/tours/recorded.tour.json
node <skill>/scripts/inject.mjs --file index.html --remove
node <skill>/scripts/record-server.mjs stop
```

`emit.mjs` reports `brittle` again. If that list is not empty, say so: those are the steps that will break first.

Confirm the removal left the HTML untouched. `--remove` restores the file byte for byte; if `git diff` shows anything in that file afterward, something else edited it and you should say so.

Then tell the user how to run the tour, and hand off to `wire` if the player is not mounted yet.

## React Native

There is no HTML to inject. `packages/native` ships its own recorder panel, and it speaks the same `GET /status` handshake and posts to the same endpoint. Skip steps 2 and 7's removal. Start the server with `--host 0.0.0.0` so the device can reach it, relay the exposure warning, and tell the user to open the panel in their app.
