import { afterEach, describe, expect, it, vi } from "vitest";
import source from "./spaceSound.ts?raw";
import {
  SPACE_SOUND_KEY,
  SPACE_SOUND_SAMPLES,
  audibleSpaceSound,
  readSpaceSound,
  reloadSpaceSound,
  resetSpaceSoundForTests,
  spaceSoundPlays,
  writeSpaceSound,
} from "./spaceSound";

afterEach(() => {
  resetSpaceSoundForTests();
  vi.unstubAllGlobals();
});

describe("space sound pref", () => {
  it("stores Quiet / Sound locally and stays silent without samples", () => {
    const open = vi.spyOn(indexedDB, "open");
    const AudioSpy = vi.fn();
    vi.stubGlobal("Audio", AudioSpy);

    expect(readSpaceSound()).toBe("quiet");
    expect(SPACE_SOUND_SAMPLES).toEqual([]);
    expect(source).not.toMatch(/noteRepo|humanNotes|saveHuman/);
    expect(writeSpaceSound("sound")).toBe("sound");
    expect(localStorage.getItem(SPACE_SOUND_KEY)).toBe("sound");
    expect(audibleSpaceSound("sound")).toBe(false);
    expect(spaceSoundPlays("sound")).toBe(false);
    expect(AudioSpy).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();

    reloadSpaceSound();
    expect(readSpaceSound()).toBe("sound");
    writeSpaceSound("quiet");
    expect(localStorage.getItem(SPACE_SOUND_KEY)).toBe("quiet");
    expect(audibleSpaceSound("quiet")).toBe(false);
  });

  it("ignores a broken pref and any sample list that is empty", () => {
    localStorage.setItem(SPACE_SOUND_KEY, "loud");
    reloadSpaceSound();
    expect(readSpaceSound()).toBe("quiet");
    expect(spaceSoundPlays("sound", [])).toBe(false);
    expect(spaceSoundPlays("sound", ["room.wav"])).toBe(true);
    expect(spaceSoundPlays("quiet", ["room.wav"])).toBe(false);
  });
});
