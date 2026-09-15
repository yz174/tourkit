import { type TourConfig, TourEngine } from "@tourkit/core";
import { memoryStorage, mountTour, registerTarget } from "@tourkit/core/dom";

const scroller = document.getElementById("scroller") as HTMLElement;
for (let index = 0; index < 30; index += 1) {
  const row = document.createElement("div");
  row.className = "row";
  row.textContent = `row ${index}`;
  if (index === 20) row.id = "deep";
  scroller.appendChild(row);
}

// Registered by id rather than by selector, the plain-DOM stand-in for useTourTarget.
registerTarget("inbox", document.getElementById("inbox") as Element);

const walkthrough: TourConfig = {
  id: "vanilla",
  version: 1,
  steps: [
    { id: "hero", target: "#hero", title: "The hero", body: "Start here." },
    { id: "inbox", target: "inbox", title: "Your inbox", body: "Messages land here." },
    { id: "deep", target: "#deep", title: "Down the list", body: "Scrolled into view." },
    { id: "done", target: null, title: "All done", body: "That is the whole tour." },
  ],
};

const engine = new TourEngine({
  tours: [walkthrough],
  context: {},
  storage: memoryStorage(),
});

const state = document.getElementById("state") as HTMLElement;
engine.subscribe(() => {
  state.textContent = engine.getSnapshot().status;
});

mountTour(engine);

document.getElementById("launch")?.addEventListener("click", () => {
  void engine.start("vanilla");
});
