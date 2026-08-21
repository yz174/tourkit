import { type AppContext, onboarding, ROUTE, TARGET } from "@tourkit/example-shared-tour";
import { useMemo, useState } from "react";
import { createNavAdapter, TourProvider, useTour } from "../src/index";

const rows = Array.from({ length: 30 }, (_, index) => ({ id: `history ${index}`, index }));

function Launcher() {
  const { start, running } = useTour();
  return (
    <div>
      <button type="button" id="launch-shared" onClick={() => start("onboarding")}>
        start shared tour
      </button>
      <span id="shared-state">{running ? "running" : "idle"}</span>
    </div>
  );
}

function Home({ onPost }: { onPost: () => void }) {
  return (
    <button type="button" id="post-ride" data-tour-id={TARGET.postRide} onClick={onPost}>
      Post a ride
    </button>
  );
}

function Inbox() {
  return (
    <div id="inbox-screen">
      <button type="button" data-tour-id={TARGET.inbox}>
        Messages
      </button>
      <button type="button" data-tour-id={TARGET.billing}>
        Payouts
      </button>
      <div id="history-scroller">
        {rows.map((row) => (
          <div
            className="history-row"
            key={row.id}
            data-tour-id={row.index === 18 ? TARGET.history : undefined}
          >
            {row.id}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SharedDemo({ plan }: { plan: AppContext["plan"] }) {
  const [pathname, setPathname] = useState<string>(ROUTE.home);
  const [posted, setPosted] = useState(false);

  const nav = useMemo(
    () => createNavAdapter({ pathname, navigate: (route) => setPathname(route) }),
    [pathname],
  );
  const context = useMemo<AppContext>(() => ({ plan, hasPostedRide: posted }), [plan, posted]);

  return (
    <TourProvider<AppContext> tours={[onboarding]} context={context} nav={nav}>
      <Launcher />
      <span id="route">{pathname}</span>
      {pathname === ROUTE.home ? <Home onPost={() => setPosted(true)} /> : <Inbox />}
    </TourProvider>
  );
}
