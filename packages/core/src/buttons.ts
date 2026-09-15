import type { TourStep } from "./types";

export type StepButtons = {
  next?: boolean;
  back?: boolean;
  close?: boolean;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  nextLabel?: string;
  backLabel?: string;
  doneLabel?: string;
  closeLabel?: string;
};

export type ResolvedButtons = {
  next: boolean;
  back: boolean;
  close: boolean;
  nextDisabled: boolean;
  backDisabled: boolean;
  nextLabel: string;
  backLabel: string;
  doneLabel: string;
  closeLabel: string;
  advanceLabel: (isLast: boolean) => string;
};

function label(value: string | undefined, fallback: string): string {
  return value?.trim() ? value : fallback;
}

export function resolveButtons<Ctx>(
  step: TourStep<Ctx> | null | undefined,
  dismissible = true,
): ResolvedButtons {
  const buttons = step?.buttons ?? {};
  const nextLabel = label(buttons.nextLabel, "Next");
  const doneLabel = label(buttons.doneLabel, "Done");

  return {
    next: buttons.next ?? true,
    back: buttons.back ?? false,
    nextDisabled: buttons.nextDisabled ?? false,
    backDisabled: buttons.backDisabled ?? false,
    close: (buttons.close ?? false) && dismissible,
    nextLabel,
    doneLabel,
    backLabel: label(buttons.backLabel, "Back"),
    closeLabel: label(buttons.closeLabel, "Close tour"),
    advanceLabel: (isLast: boolean) => (isLast ? doneLabel : nextLabel),
  };
}
