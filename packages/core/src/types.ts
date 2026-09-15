import type { StepButtons } from "./buttons";
import type { Radius } from "./corners";
import type { Rect } from "./rect";
import type { ThemeOverride } from "./theme";

export type Placement = "auto" | "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";
export type Interaction = "block" | "passthrough" | "advance-on-press";
export type TourStatus = "idle" | "resolving" | "active";
export type TourOutcome = "pending" | "completed" | "skipped";
export type GateTimeoutPolicy = "skip" | "advance" | "abort";

export type ScrollOptions = {
  block?: "start" | "center" | "end";
  behavior?: "auto" | "smooth";
};

export type GateArgs<Ctx> = { context: Ctx; step: TourStep<Ctx> };

/** Where a hook is firing. Counts visible steps only, so it matches the progress indicator. */
export type StepInfo = {
  index: number;
  total: number;
  stepId: string;
  tourId: string;
};

export type TourStep<Ctx = unknown> = {
  id: string;
  target?: string | null;
  /**
   * Extra elements cut out of the same overlay. The card still points at `target`.
   * An extra target that is not on the page is skipped rather than failing the step.
   */
  extraTargets?: string[];
  title?: string;
  body?: string;
  /**
   * Accessible name for the step's dialog when it shows no `title`. Ignored when `title` is set,
   * since the visible title already names the dialog.
   */
  label?: string;
  data?: Record<string, unknown>;
  route?: string;
  when?: (context: Ctx) => boolean;
  gate?: (args: GateArgs<Ctx>) => boolean | Promise<boolean>;
  gateTimeoutMs?: number;
  onGateTimeout?: GateTimeoutPolicy;
  onEnter?: (context: Ctx, info: StepInfo) => void | Promise<void>;
  onAdvance?: (context: Ctx, info: StepInfo) => void | Promise<void>;
  onBeforeAdvance?: (context: Ctx, info: StepInfo) => boolean | Promise<boolean>;
  onBeforeBack?: (context: Ctx, info: StepInfo) => boolean | Promise<boolean>;
  onBeforeExit?: (context: Ctx, info: StepInfo) => boolean | Promise<boolean>;
  placement?: Placement;
  align?: Align;
  interaction?: Interaction;
  dismissible?: boolean;
  scroll?: boolean | ScrollOptions;
  padding?: number;
  radius?: Radius | "auto";
  buttons?: StepButtons;
  fingerprint?: Fingerprint;
  theme?: ThemeOverride;
};

export type TourConfig<Ctx = unknown> = {
  id: string;
  version: number;
  entryRoute?: string;
  steps: TourStep<Ctx>[];
  defaultStepOptions?: Omit<TourStep<Ctx>, "id">;
  theme?: ThemeOverride;
  dismissible?: boolean;
  onBeforeExit?: (context: Ctx, info: StepInfo) => boolean | Promise<boolean>;
};

export type TourEventName =
  | "tour:start"
  | "tour:resume"
  | "tour:complete"
  | "tour:abort"
  | "step:enter"
  | "step:exit"
  | "step:skip"
  | "target:timeout";

export type TourEvent = {
  tourId: string;
  stepId: string | null;
  stepIndex: number;
  total: number;
};

export type EventHandler = (name: TourEventName, event: TourEvent) => void;

export type StepEventName = "before-show" | "show" | "before-hide" | "hide";

export type StepEventHandler = (name: StepEventName, info: StepInfo) => void;

export type StorageAdapter = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

export type NavAdapter = {
  getRoute(): string;
  matches(route: string): boolean;
  navigate(route: string): void | Promise<void>;
};

export type Fingerprint = {
  tag: string;
  text?: string | undefined;
  role?: string | undefined;
  label?: string | undefined;
  near?: string | undefined;
  index?: number | undefined;
};

export type TargetDescriptor = {
  id: string;
  label?: string | undefined;
  route?: string | undefined;
};

export type TargetManifest = TargetDescriptor[];

export type PersistedTour = {
  outcome: TourOutcome;
  stepId: string;
  updatedAt: number;
};

export type { Rect };
