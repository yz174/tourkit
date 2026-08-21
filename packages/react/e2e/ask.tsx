import { useTourkitAsk } from "@tourkit/ai";
import { useState } from "react";
import { TourProvider, useTargetManifest, useTour } from "../src/index";

const tours = [{ id: "noop", version: 1, steps: [{ id: "a", target: null, title: "unused" }] }];

function AskBox() {
  const getManifest = useTargetManifest();
  const { start } = useTour();
  const [question, setQuestion] = useState("");
  const { ask, status, error, tour } = useTourkitAsk({
    endpoint: "/api/tourkit",
    getManifest,
    onTour: (generated) => start(generated),
  });

  return (
    <div>
      <input
        id="ask-input"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
      />
      <button type="button" id="ask-submit" onClick={() => void ask(question)}>
        ask
      </button>
      <span id="ask-status">{status}</span>
      <span id="ask-error">{error?.reason ?? ""}</span>
      <span id="ask-steps">{tour ? tour.steps.length : 0}</span>
    </div>
  );
}

export function AskDemo() {
  return (
    <TourProvider tours={tours}>
      <AskBox />
      <div id="ask-app">
        <button type="button" data-tour-id="my-rides" data-tour-label="My rides">
          Rides
        </button>
        <button type="button" data-tour-id="ride-menu" data-tour-label="Ride options">
          Options
        </button>
        <button type="button" data-tour-id="cancel-ride" data-tour-label="Cancel ride">
          Cancel
        </button>
      </div>
    </TourProvider>
  );
}
