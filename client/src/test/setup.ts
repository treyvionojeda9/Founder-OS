import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetShelfPrefsForTests } from "../library/shelfPrefs";
import { resetBoardPrefsForTests } from "../team/boardPrefs";
import { resetDeskTilesForTests } from "../study/deskTiles";
import { resetWorkPauseForTests } from "../study/deskPause";

afterEach(() => {
  cleanup();
  resetWorkPauseForTests();
  resetBoardPrefsForTests();
  resetDeskTilesForTests();
  resetShelfPrefsForTests();
});

HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;

if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
