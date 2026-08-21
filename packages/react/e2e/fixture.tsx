import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { type TourConfig, TourProvider, useTour } from "../src/index";

const tours: TourConfig<unknown>[] = [
  {
    id: "demo",
    version: 1,
    steps: [
      { id: "hero", target: "#hero", title: "The hero", body: "Top of the page." },
      { id: "deep", target: "#deep", title: "Inside a scroller", body: "Halfway down a list." },
      { id: "modal", target: "#in-modal", title: "Inside a modal", body: "Above the dialog." },
      { id: "done", target: null, title: "Finished" },
    ],
  },
  {
    id: "passthrough",
    version: 1,
    steps: [
      { id: "hero", target: "#hero", title: "Press it yourself", interaction: "passthrough" },
    ],
  },
  {
    id: "press",
    version: 1,
    steps: [
      { id: "hero", target: "#hero", title: "Press to continue", interaction: "advance-on-press" },
      { id: "after", target: "#in-modal", title: "You pressed it" },
    ],
  },
  {
    id: "scroll-start",
    version: 1,
    steps: [{ id: "deep", target: "#deep", title: "Aligned to start", scroll: { block: "start" } }],
  },
  {
    id: "no-scroll",
    version: 1,
    steps: [{ id: "deep", target: "#deep", title: "Left where it was", scroll: false }],
  },
];

function Launcher() {
  const { start, running } = useTour();
  return (
    <div>
      {["demo", "passthrough", "press", "scroll-start", "no-scroll"].map((id) => (
        <button type="button" key={id} id={`launch-${id}`} onClick={() => start(id)}>
          {id}
        </button>
      ))}
      <span id="state">{running ? "running" : "idle"}</span>
    </div>
  );
}

const rows = Array.from({ length: 40 }, (_, index) => ({ id: `row ${index}`, index }));

function countHeroPress() {
  const log = document.getElementById("hero-log");
  if (log) log.textContent = String(Number(log.textContent ?? "0") + 1);
}

function Demo() {
  return (
    <TourProvider tours={tours} storage={undefined}>
      <Launcher />
      <button type="button" id="hero" onClick={countHeroPress}>
        Hero button
      </button>
      <span id="hero-log">0</span>
      <div id="scroller">
        {rows.map((row) => (
          <div className="row" key={row.id} id={row.index === 20 ? "deep" : undefined}>
            {row.id}
          </div>
        ))}
      </div>
      <div id="modal">
        <button type="button" id="in-modal">
          Inside modal
        </button>
      </div>
    </TourProvider>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
