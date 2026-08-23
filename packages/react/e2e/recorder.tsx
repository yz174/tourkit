import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TourRecorder } from "../src/index";

const rows = Array.from({ length: 8 }, (_, index) => ({ id: `row-${index}`, index }));

function Playground() {
  return (
    <main>
      <h1>Rides</h1>
      <section aria-label="Actions">
        <h2>Your rides</h2>
        <button type="button" data-tour-id="post-ride" data-tour-label="Post a ride">
          Post a ride
        </button>
        <button type="button" data-tour-id="inbox" data-tour-label="Messages">
          Messages
        </button>
        <button type="button" className="danger-btn" aria-label="Cancel ride">
          Cancel
        </button>
      </section>
      <section>
        <h2>History</h2>
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              <a href={`#${row.id}`}>{`Trip ${row.index + 1}`}</a>
            </li>
          ))}
        </ul>
      </section>
      {/*
        The panel renders unconditionally by default here, because most of these tests run with
        no record server. ?autoshow=1 exercises the real handshake against the real CLI.
      */}
      <TourRecorder
        name="Playground walkthrough"
        autoShow={new URLSearchParams(window.location.search).has("autoshow")}
      />
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
);
