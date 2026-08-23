import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { cssPath, describeElement, textOf } from "./selector";
import { TourRecorder } from "./TourRecorder";

beforeEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("cssPath", () => {
  test("prefers a unique data-testid", () => {
    document.body.innerHTML = '<div><button data-testid="save" id="s">go</button></div>';

    expect(cssPath(document.querySelector("button") as Element)).toBe('[data-testid="save"]');
  });

  test("falls back to a unique id", () => {
    document.body.innerHTML = '<div><button id="save">go</button></div>';

    expect(cssPath(document.querySelector("button") as Element)).toBe("#save");
  });

  test("ignores an id that is not a usable selector", () => {
    document.body.innerHTML = '<div><button id=":r1:">go</button></div>';

    expect(cssPath(document.querySelector("button") as Element)).not.toContain(":r1:");
  });

  test("builds a path when nothing is uniquely identifying", () => {
    document.body.innerHTML =
      "<main><section><button>a</button><button>b</button></section></main>";
    const second = document.querySelectorAll("button")[1] as Element;
    const path = cssPath(second);

    expect(path).toContain("nth-of-type(2)");
    expect(document.querySelectorAll(path)).toHaveLength(1);
    expect(document.querySelector(path)).toBe(second);
  });

  test("the produced path always resolves back to the element", () => {
    document.body.innerHTML = `
      <div class="panel"><ul><li><a href="#a">one</a></li><li><a href="#b">two</a></li></ul></div>
      <div class="panel"><ul><li><a href="#c">three</a></li></ul></div>`;

    for (const anchor of document.querySelectorAll("a")) {
      const path = cssPath(anchor);
      expect(document.querySelector(path)).toBe(anchor);
    }
  });

  test("skips generated and utility classes, keeping semantic ones", () => {
    document.body.innerHTML = `
      <div><button class="Button_root__x7f2a">a</button></div>
      <div><button class="px-4 py-2">b</button></div>
      <div><span class="nav-item">c</span><span class="nav-item">d</span></div>`;
    const [hashed, utility] = [...document.querySelectorAll("button")];

    expect(cssPath(hashed as Element)).not.toContain("Button_root");
    expect(cssPath(utility as Element)).not.toContain("px-4");
    expect(cssPath(document.querySelector("span") as Element)).toContain(".nav-item");
  });
});

describe("textOf", () => {
  test("collapses whitespace and caps the length", () => {
    document.body.innerHTML = "<button>  Post   a\n ride </button>";

    expect(textOf(document.querySelector("button") as Element)).toBe("Post a ride");
  });

  test("returns undefined for an empty element", () => {
    document.body.innerHTML = "<button></button>";

    expect(textOf(document.querySelector("button") as Element)).toBeUndefined();
  });
});

describe("describeElement", () => {
  test("uses a registered tour id when the element has one", () => {
    document.body.innerHTML =
      '<button data-tour-id="post-ride" data-tour-label="Post a ride">Go</button>';
    const step = describeElement(document.querySelector("button") as Element, "/");

    expect(step).toEqual({
      target: "post-ride",
      registered: true,
      tag: "button",
      label: "Post a ride",
      text: "Go",
      route: "/",
      fingerprint: { tag: "button", text: "Go", label: "Post a ride" },
    });
  });

  test("captures a fingerprint for every step", () => {
    document.body.innerHTML =
      '<section><h2>Rides</h2><button aria-label="Cancel">×</button></section>';
    const step = describeElement(document.querySelector("button") as Element);

    expect(step.fingerprint).toEqual({
      tag: "button",
      text: "×",
      label: "Cancel",
      near: "Rides",
    });
  });

  test("falls back to a selector and says so", () => {
    document.body.innerHTML = '<div><button id="save">Save</button></div>';
    const step = describeElement(document.querySelector("button") as Element);

    expect(step.registered).toBe(false);
    expect(step.target).toBe("#save");
  });

  test("reads aria-label when there is no tour label", () => {
    document.body.innerHTML = '<button aria-label="Close dialog" role="button">×</button>';
    const step = describeElement(document.querySelector("button") as Element);

    expect(step.label).toBe("Close dialog");
    expect(step.role).toBe("button");
  });
});

describe("TourRecorder", () => {
  function App() {
    return (
      <div>
        <button type="button" data-tour-id="post-ride" data-tour-label="Post a ride">
          Post
        </button>
        <button type="button" id="inbox">
          Inbox
        </button>
        <TourRecorder name="Driver onboarding" autoShow={false} />
      </div>
    );
  }

  test("captures nothing until recording starts", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Post"));

    expect(document.querySelector("[data-tourkit-recorder-count]")?.textContent).toBe("0 steps");
  });

  test("captures clicks in order once recording", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(document.querySelector("[data-tourkit-recorder-toggle]") as HTMLElement);
    await user.click(screen.getByText("Post"));
    await user.click(screen.getByText("Inbox"));

    const items = [...document.querySelectorAll("[data-tourkit-recorder-list] li")];
    expect(items.map((item) => item.textContent)).toEqual(["Post a ride", "Inbox"]);
  });

  test("clicks on the recorder panel itself are not captured", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(document.querySelector("[data-tourkit-recorder-toggle]") as HTMLElement);
    await user.click(document.querySelector("[data-tourkit-recorder-undo]") as HTMLElement);

    expect(document.querySelector("[data-tourkit-recorder-count]")?.textContent).toBe("0 steps");
  });

  test("undo removes the last step", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(document.querySelector("[data-tourkit-recorder-toggle]") as HTMLElement);
    await user.click(screen.getByText("Post"));
    await user.click(screen.getByText("Inbox"));
    await user.click(document.querySelector("[data-tourkit-recorder-undo]") as HTMLElement);

    expect(document.querySelector("[data-tourkit-recorder-count]")?.textContent).toBe("1 step");
  });

  test("recording suppresses the app's own click handler", async () => {
    let pressed = 0;
    const user = userEvent.setup();
    render(
      <div>
        <button type="button" onClick={() => (pressed += 1)}>
          Danger
        </button>
        <TourRecorder autoShow={false} />
      </div>,
    );

    await user.click(document.querySelector("[data-tourkit-recorder-toggle]") as HTMLElement);
    await user.click(screen.getByText("Danger"));

    expect(pressed).toBe(0);
  });

  test("save posts the recording to the endpoint", async () => {
    let body: unknown;
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return new Response("{}", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<App />);

    await user.click(document.querySelector("[data-tourkit-recorder-toggle]") as HTMLElement);
    await user.click(screen.getByText("Post"));
    await user.click(document.querySelector("[data-tourkit-recorder-finish]") as HTMLElement);

    await waitFor(() => {
      expect(document.querySelector("[data-tourkit-recorder-status]")?.textContent).toBe("sent");
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const sent = body as { name: string; steps: { target: string }[] };
    expect(sent.name).toBe("Driver onboarding");
    expect(sent.steps.map((step) => step.target)).toEqual(["post-ride"]);
  });

  test("a failed post is reported rather than swallowed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("no server");
      }),
    );
    const user = userEvent.setup();
    render(<App />);

    await user.click(document.querySelector("[data-tourkit-recorder-toggle]") as HTMLElement);
    await user.click(screen.getByText("Post"));
    await user.click(document.querySelector("[data-tourkit-recorder-finish]") as HTMLElement);

    await waitFor(() => {
      expect(document.querySelector("[data-tourkit-recorder-status]")?.textContent).toBe("failed");
    });
  });

  test("onFinish receives the recording even without a server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("no server");
      }),
    );
    const seen: { steps: { target: string }[] }[] = [];
    const user = userEvent.setup();
    render(
      <div>
        <button type="button" data-tour-id="post-ride">
          Post
        </button>
        <TourRecorder autoShow={false} onFinish={(recording) => seen.push(recording)} />
      </div>,
    );

    await user.click(document.querySelector("[data-tourkit-recorder-toggle]") as HTMLElement);
    await user.click(screen.getByText("Post"));
    await user.click(document.querySelector("[data-tourkit-recorder-finish]") as HTMLElement);

    expect(seen).toHaveLength(1);
    expect(seen[0]?.steps.map((step) => step.target)).toEqual(["post-ride"]);
  });
});

describe("the handshake", () => {
  function stubStatus(answer: () => Response) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).endsWith("/status")) return answer();
        return new Response("{}", { status: 200 });
      }),
    );
  }

  test("stays hidden while nothing is listening", async () => {
    stubStatus(() => {
      throw new Error("connection refused");
    });
    render(<TourRecorder />);

    await waitFor(() => {
      expect(document.querySelector("[data-tourkit-recorder]")).toBeNull();
    });
  });

  test("appears once the CLI answers, and says where it writes", async () => {
    stubStatus(() => Response.json({ ok: true, outDir: "lib/tours" }));
    render(<TourRecorder />);

    await waitFor(() => {
      expect(document.querySelector("[data-tourkit-recorder]")).not.toBeNull();
    });
    expect(document.querySelector("[data-tourkit-recorder-outdir]")?.textContent).toBe(
      "→ lib/tours",
    );
  });

  test("a server that answers without ok is not a server", async () => {
    stubStatus(() => Response.json({ ok: false }));
    render(<TourRecorder />);

    await waitFor(() => {
      expect(document.querySelector("[data-tourkit-recorder]")).toBeNull();
    });
  });

  test("autoShow false renders the panel with no server at all", () => {
    stubStatus(() => {
      throw new Error("connection refused");
    });
    render(<TourRecorder autoShow={false} />);

    expect(document.querySelector("[data-tourkit-recorder]")).not.toBeNull();
  });
});

describe("describeElement against the provider registry", () => {
  test("an element registered with useTourTarget records as that id, not a selector", () => {
    document.body.innerHTML = "<main><section><button>Save</button></section></main>";
    const button = document.querySelector("button") as Element;
    const registry = new Map<string, Element>([["save-ride", button]]);

    const step = describeElement(button, "/", registry);

    expect(step.target).toBe("save-ride");
    expect(step.registered).toBe(true);
  });

  test("a child of a registered element records as its ancestor's id", () => {
    document.body.innerHTML = "<div><span>Save</span></div>";
    const wrapper = document.querySelector("div") as Element;
    const registry = new Map<string, Element>([["save-ride", wrapper]]);

    expect(describeElement(document.querySelector("span") as Element, "", registry).target).toBe(
      "save-ride",
    );
  });

  test("data-tour-id still wins over the registry", () => {
    document.body.innerHTML = '<button data-tour-id="attribute-wins">Save</button>';
    const button = document.querySelector("button") as Element;
    const registry = new Map<string, Element>([["registry-loses", button]]);

    expect(describeElement(button, "", registry).target).toBe("attribute-wins");
  });

  test("without a registry nothing changes", () => {
    document.body.innerHTML = "<main><section><button>Save</button></section></main>";
    const step = describeElement(document.querySelector("button") as Element);

    expect(step.registered).toBe(false);
    expect(step.target).toContain("button");
  });
});

describe("nested registered targets", () => {
  test("the innermost registered ancestor wins, whatever order they registered in", () => {
    document.body.innerHTML = '<ul id="list"><li id="row"><span>Save</span></li></ul>';
    const list = document.querySelector("#list") as Element;
    const row = document.querySelector("#row") as Element;
    const target = document.querySelector("span") as Element;

    const outerFirst = new Map<string, Element>([
      ["ride-list", list],
      ["ride-row", row],
    ]);
    const innerFirst = new Map<string, Element>([
      ["ride-row", row],
      ["ride-list", list],
    ]);

    expect(describeElement(target, "", outerFirst).target).toBe("ride-row");
    expect(describeElement(target, "", innerFirst).target).toBe("ride-row");
  });
});
