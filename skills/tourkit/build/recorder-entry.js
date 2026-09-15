/**
 * Source for skills/tourkit/scripts/recorder-browser.js.
 *
 * The capture bar, as plain DOM. This is the port of packages/react/src/recorder/
 * TourRecorder.tsx that removes the framework lock: nothing here is React, and nothing
 * here asks the developer to mount a component. inject.mjs writes a script tag, the dev
 * server hot-reloads, and the bar appears.
 *
 * The element-description logic is imported from @tourkit/core/dom rather than copied,
 * so the recorder and the player can never disagree about what a target is. The build
 * script inlines it; see build-recorder.mjs.
 */

import { describeElement } from "../../../packages/core/src/dom/index.ts";

const PANEL_Z = 2147483000;
const MARKER = "data-tourkit-recorder";
const STATUS_INTERVAL_MS = 2000;

/** The server that served this script. Reading it back means no port ever gets configured twice. */
function serverOrigin() {
  const current = document.currentScript;
  if (current?.src) {
    try {
      return new URL(current.src).origin;
    } catch {}
  }
  const tag = document.querySelector('script[src*="/recorder.js"]');
  if (tag) {
    try {
      return new URL(tag.src, window.location.href).origin;
    } catch {}
  }
  return "http://127.0.0.1:5178";
}

const ORIGIN = serverOrigin();

function element(tag, style, attributes) {
  const node = document.createElement(tag);
  if (style) node.style.cssText = style;
  if (attributes)
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

function button(label, attribute) {
  const node = element(
    "button",
    "font:inherit;padding:4px 10px;border-radius:6px;border:1px solid #374151;background:#1F2937;color:inherit;cursor:pointer;",
  );
  node.type = "button";
  node.textContent = label;
  node.setAttribute(attribute, "");
  return node;
}

function start() {
  if (document.querySelector(`[${MARKER}]`)) return; // already injected on this page

  const name = window.__TOURKIT_RECORDING_NAME__ || "recorded";
  let recording = false;
  let captured = [];
  let sent = "idle";
  let outDir = null;

  const panel = element(
    "div",
    `position:fixed;right:16px;bottom:16px;z-index:${PANEL_Z};display:flex;flex-direction:column;gap:8px;` +
      "padding:12px;border-radius:12px;background:#111827;color:#F9FAFB;" +
      "font:13px system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,0.35);max-width:320px;",
    { [MARKER]: "", "data-tourkit-recording": "false" },
  );

  const heading = element("strong");
  heading.textContent = "tourkit recorder";

  const count = element("span", null, { "data-tourkit-recorder-count": "" });
  const status = element("span", null, { "data-tourkit-recorder-status": "" });
  const target = element("span", "opacity:0.7;", { "data-tourkit-recorder-outdir": "" });

  const row = element("div", "display:flex;gap:6px;");
  const toggle = button("Record", "data-tourkit-recorder-toggle");
  const undo = button("Undo", "data-tourkit-recorder-undo");
  const save = button("Save", "data-tourkit-recorder-finish");
  row.append(toggle, undo, save);

  const list = element("ol", "margin:0;padding-left:18px;max-width:280px;", {
    "data-tourkit-recorder-list": "",
  });

  panel.append(heading, count, status, target, row, list);

  function render() {
    panel.setAttribute("data-tourkit-recording", recording ? "true" : "false");
    count.textContent = `${captured.length} step${captured.length === 1 ? "" : "s"}`;
    status.textContent = sent;
    target.textContent = outDir ? `→ ${outDir}` : "";
    toggle.textContent = recording ? "Stop" : "Record";
    list.replaceChildren(
      ...captured.map((step) => {
        const item = element("li", "overflow-wrap:anywhere;");
        item.textContent = step.label || step.text || step.target;
        return item;
      }),
    );
  }

  // Capture phase, and both preventDefault and stopPropagation: clicking a real Delete
  // button while recording must record the button, not delete the row. location.pathname
  // is read here rather than tracked, so an SPA route change needs no history patching.
  function onClick(event) {
    if (!recording) return;
    const node = event.target;
    if (!(node instanceof Element)) return;
    if (node.closest(`[${MARKER}]`)) return;
    event.preventDefault();
    event.stopPropagation();
    captured.push(describeElement(node, window.location.pathname));
    render();
  }

  document.addEventListener("click", onClick, true);

  toggle.addEventListener("click", () => {
    sent = "idle";
    recording = !recording;
    render();
  });

  undo.addEventListener("click", () => {
    captured = captured.slice(0, -1);
    render();
  });

  save.addEventListener("click", async () => {
    recording = false;
    sent = "sending";
    render();
    try {
      const response = await fetch(`${ORIGIN}/record`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, createdAt: Date.now(), steps: captured }),
      });
      sent = response.ok ? "sent" : "failed";
    } catch {
      sent = "failed";
    }
    render();
  });

  // The handshake packages/native's panel already speaks. The bar stays hidden until the
  // server answers, so a tag left in the HTML costs nothing once recording is over.
  let online = false;
  async function ping() {
    try {
      const response = await fetch(`${ORIGIN}/status`, { method: "GET" });
      if (!response.ok) throw new Error("offline");
      const body = await response.json();
      online = Boolean(body?.ok);
      outDir = body?.outDir || null;
    } catch {
      online = false;
      outDir = null;
    }
    if (online && !panel.isConnected) document.body.appendChild(panel);
    if (!online && panel.isConnected) panel.remove();
    if (panel.isConnected) render();
  }

  void ping();
  setInterval(() => void ping(), STATUS_INTERVAL_MS);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
