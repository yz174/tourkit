---
"@tourkit/react": minor
"@tourkit/native": minor
"@tourkit/cli": minor
---

The recorder finds the CLI by itself, and React Native can record too.

`tourkit record` now answers `GET /status`, and `<TourRecorder />` polls it. Mount the recorder
once in development and the panel appears when you start the CLI and disappears when you stop it,
instead of sitting there whether or not anything is listening. Pass `autoShow={false}` for the old
behaviour, which is what you want for the clipboard flow with no server.

`tourkit init` now mounts the recorder in the provider it writes, and wraps your root layout in
`<Tours>` when it can do so unambiguously, printing the diff when it cannot. `--no-wire` opts out.

The scaffolded provider is `provider.tsx` rather than `Tours.tsx`: a case-insensitive filesystem
cannot tell `Tours.tsx` from the `tours.ts` beside it, and TypeScript then resolves an import of
one to the other. It also imports `React` explicitly, so it compiles under the classic JSX
transform as well as the automatic one.

`@tourkit/native` ships a `TourRecorder`. It hit-tests taps against mounted `TourTarget`s, so it
records registered ids only — there are no selectors to fall back to — and finds the machine
running the CLI through Metro's script URL. `tourkit record --host` binds every interface so a
physical device can reach it.

The web recorder also consults the provider registry, so an element registered with
`useTourTarget` records as that id rather than as a CSS selector.

Fixes found while integrating this into a real Expo app and a real Next site:

- `tourkit init` skipped wiring a layout whose only import sat on the first line, reporting it as
  having nowhere to put the import.
- The web recorder resolved a click inside nested registered targets by registration order. The
  innermost registered ancestor now wins.
- `tourkit record --host=` with nothing after the equals sign bound to an empty host, and binding
  to every interface now says out loud that anyone on the network can write a tour file.
