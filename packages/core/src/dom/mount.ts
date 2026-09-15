import type { TourEngine } from "../engine";
import { type ChromeOptions, mountChrome } from "./chrome";
import { createPresenter, type PresenterOptions } from "./presenter";
import { targetRegistry } from "./registry";

export type MountOptions = PresenterOptions & ChromeOptions;

export type TourMount = { destroy(): void };

/**
 * Runs a tour on a page with no framework: the presenter resolves and measures, the default chrome
 * paints. Anything a Vue, Angular, Svelte or plain-HTML app needs is behind this one call.
 */
export function mountTour(engine: TourEngine<unknown>, options: MountOptions = {}): TourMount {
  const presenter = createPresenter(engine, {
    registry: options.registry ?? targetRegistry(),
    scrollHandler: options.scrollHandler,
  });
  const chrome = mountChrome(presenter, {
    container: options.container,
    styled: options.styled,
    classNames: options.classNames,
  });

  return {
    destroy() {
      chrome.destroy();
      presenter.destroy();
    },
  };
}
