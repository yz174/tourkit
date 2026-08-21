import type { Rect } from "./rect";
import type { ThemeOverride } from "./theme";

export type Placement = "auto" | "top" | "bottom" | "left" | "right";
export type Interaction = "block" | "passthrough" | "advance-on-press";
export type TourStatus = "idle" | "resolving" | "active";
export type TourOutcome = "pending" | "completed" | "skipped";
export type GateTimeoutPolicy = "skip" | "advance" | "abort";

export type ScrollOptions = {
  block?: "start" | "center" | "end";
  behavior?: "auto" | "smooth";
};

export type GateArgs<Ctx> = { context: Ctx; step: TourStep<Ctx> };

export type TourStep<Ctx = unknown> = {
  id: string;
  target?: string | null;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  route?: string;
  when?: (context: Ctx) => boolean;
  gate?: (args: GateArgs<Ctx>) => boolean | Promise<boolean>;
  gateTimeoutMs?: number;
  onGateTimeout?: GateTimeoutPolicy;
  onEnter?: (context: Ctx) => void | Promise<void>;
  onAdvance?: (context: Ctx) => void | Promise<void>;
  placement?: Placement;
  interaction?: Interaction;
  scroll?: boolean | ScrollOptions;
  padding?: number;
  radius?: number | "auto";
  fingerprint?: Fingerprint;
  theme?: ThemeOverride;
};

export type TourConfig<Ctx = unknown> = {
  id: string;
  version: number;
  entryRoute?: string;
  steps: TourStep<Ctx>[];
  theme?: ThemeOverride;
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
