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
];

function Launcher() {
  const { start, running } = useTour();
  return (
    <button type="button" id="launch" onClick={() => start("demo")}>
      {running ? "running" : "start"}
    </button>
  );
}

const rows = Array.from({ length: 40 }, (_, index) => ({ id: `row ${index}`, index }));

function Demo() {
  return (
    <TourProvider tours={tours} storage={undefined}>
      <Launcher />
      <button type="button" id="hero">
        Hero button
      </button>
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
